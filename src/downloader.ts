import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Logger } from './utils/logger.js';
import type { Config, ArtifactInventoryItem, RunConclusion, ValidationResult } from './types.js';
import {
  getPRInfo,
  getWorkflowRunsForBranch,
  getArtifactsForRun,
  downloadArtifact,
} from './github/api.js';
import { withRetry, isExpiredError } from './utils/retry.js';
import {
  getWorkflowName,
  findWorkflowConfig,
  shouldSkipArtifact,
  getCombinedSkipPatterns,
  validateExpectations,
} from './workflow-matcher.js';

export interface DownloadResult {
  headSha: string;
  inventory: ArtifactInventoryItem[];
  runStates: Map<string, RunConclusion>;
  runsWithoutArtifacts: string[];
  validationResults: ValidationResult[];
}

export async function downloadArtifacts(
  repo: string,
  prNumber: number,
  outputDir: string,
  config: Config,
  logger: Logger,
  resume: boolean = false,
  dryRun: boolean = false,
  includeSuccesses: boolean = false
): Promise<DownloadResult> {
  logger.info('Fetching PR information...');
  const prInfo = getPRInfo(repo, prNumber);
  const headSha = prInfo.headRefOid;
  const branch = prInfo.headRefName;
  logger.info(`Head SHA: ${headSha}`);
  logger.info(`Branch: ${branch}`);

  logger.info('Finding workflow runs for commit...');
  const runs = getWorkflowRunsForBranch(repo, branch, headSha);
  logger.info(`Found ${runs.length} workflow runs`);

  const inventory: ArtifactInventoryItem[] = [];
  const runStates = new Map<string, RunConclusion>();
  const runsWithoutArtifacts: string[] = [];
  const validationResults: ValidationResult[] = [];

  // Load existing inventory if resuming
  const inventoryPath = join(outputDir, 'artifacts.json');
  let existingInventory: ArtifactInventoryItem[] = [];
  if (resume && existsSync(inventoryPath)) {
    logger.info('Resume mode: loading existing inventory...');
    existingInventory = JSON.parse(readFileSync(inventoryPath, 'utf-8'));
    logger.info(`Found ${existingInventory.length} existing entries`);
  }

  // Process each run
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    const runNum = i + 1;
    const runId = String(run.id);
    const workflowName = getWorkflowName(run);

    logger.info(`\nRun ${runNum}/${runs.length}: ${run.name} (${runId})`);
    logger.debug(`  Workflow: ${workflowName}`);

    // Map run conclusion to our type
    const conclusion = mapRunConclusion(run.conclusion, run.status);
    runStates.set(runId, conclusion);
    logger.info(`  Status: ${conclusion}`);

    // Check if entire workflow should be skipped
    const workflowConfig = findWorkflowConfig(run, config.workflows || []);
    if (workflowConfig?.skip) {
      logger.info(`  Skipping entire workflow (configured in .gh-ci-artifacts.json)`);
      continue;
    }

    // Skip successful runs unless explicitly requested
    if (conclusion === 'success' && !includeSuccesses) {
      logger.debug(`  Skipping successful run`);
      continue;
    }

    // Get artifacts for this run
    logger.info('  Fetching artifacts...');
    const artifacts = getArtifactsForRun(repo, runId);
    logger.info(`  Found ${artifacts.length} artifacts`);

    if (artifacts.length === 0) {
      logger.info('  No artifacts found, will extract logs instead');
      runsWithoutArtifacts.push(runId);
      continue;
    }

    // Build combined skip patterns (global + workflow-specific)
    const skipPatterns = getCombinedSkipPatterns(
      config.skipArtifacts,
      workflowConfig?.skipArtifacts
    );

    // Download each artifact serially
    for (let j = 0; j < artifacts.length; j++) {
      const artifact = artifacts[j];
      const artifactNum = j + 1;

      logger.progress(
        `  Downloading artifact ${artifactNum}/${artifacts.length}: ${artifact.name} (${formatBytes(artifact.size_in_bytes)})...`
      );

      // Check if artifact should be skipped
      const skipMatch = shouldSkipArtifact(artifact.name, skipPatterns);
      if (skipMatch) {
        const reason = skipMatch.reason || skipMatch.pattern;
        logger.info(`    Skipped: ${reason}`);
        inventory.push({
          runId: runId,
          artifactName: artifact.name,
          sizeBytes: artifact.size_in_bytes,
          status: 'skipped',
          skipReason: reason,
        });
        continue;
      }

      // Check if already downloaded in resume mode
      const existingEntry = existingInventory.find(
        item => item.runId === runId && item.artifactName === artifact.name
      );

      if (resume && existingEntry && existingEntry.status === 'success') {
        logger.debug(`    Skipping (already downloaded)`);
        inventory.push(existingEntry);
        continue;
      }

      if (dryRun) {
        logger.info(`    [DRY RUN] Would download to ${outputDir}/raw/${runId}/`);
        inventory.push({
          runId: runId,
          artifactName: artifact.name,
          sizeBytes: artifact.size_in_bytes,
          status: 'success',
        });
        continue;
      }

      // Attempt download with retry
      const artifactOutputDir = join(outputDir, 'raw', runId);
      mkdirSync(artifactOutputDir, { recursive: true });

      const result = await withRetry(
        () => {
          downloadArtifact(runId, artifactOutputDir);
          return Promise.resolve();
        },
        {
          maxRetries: config.maxRetries ?? 3,
          retryDelay: config.retryDelay ?? 5,
        }
      );

      if (result.success) {
        logger.debug(`    Downloaded successfully`);
        inventory.push({
          runId: runId,
          artifactName: artifact.name,
          sizeBytes: artifact.size_in_bytes,
          status: 'success',
        });
      } else {
        const error = result.error!;
        const status = isExpiredError(error) ? 'expired' : 'failed';
        logger.error(`    Failed: ${error.message}`);

        inventory.push({
          runId: runId,
          artifactName: artifact.name,
          sizeBytes: artifact.size_in_bytes,
          status,
          errorMessage: error.message,
        });
      }
    }

    // Validate expectations after processing all artifacts for this run
    const allArtifactNames = artifacts.map(a => a.name);
    const validationResult = validateExpectations(run, workflowConfig, allArtifactNames);
    
    if (validationResult) {
      validationResults.push(validationResult);
      
      // Log validation failures
      if (validationResult.missingRequired.length > 0) {
        logger.error(`  Validation failed: ${validationResult.missingRequired.length} required artifact(s) missing`);
        for (const violation of validationResult.missingRequired) {
          const reason = violation.reason ? ` (${violation.reason})` : '';
          logger.error(`    Missing required: ${violation.pattern}${reason}`);
        }
      }
      
      if (validationResult.missingOptional.length > 0) {
        logger.warn(`  Warning: ${validationResult.missingOptional.length} optional artifact(s) missing`);
        for (const violation of validationResult.missingOptional) {
          const reason = violation.reason ? ` (${violation.reason})` : '';
          logger.debug(`    Missing optional: ${violation.pattern}${reason}`);
        }
      }
    }
  }

  // Save inventory
  if (!dryRun) {
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
    logger.info(`\nSaved inventory to ${inventoryPath}`);
  }

  return {
    headSha,
    inventory,
    runStates,
    runsWithoutArtifacts,
    validationResults,
  };
}

function mapRunConclusion(
  conclusion: string | null,
  status: string
): RunConclusion {
  if (status === 'in_progress' || status === 'queued' || status === 'pending') {
    return 'in_progress';
  }

  switch (conclusion) {
    case 'success':
      return 'success';
    case 'failure':
      return 'failure';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'failure';
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
