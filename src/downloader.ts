import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Logger } from './utils/logger.js';
import type { Config, ArtifactInventoryItem, RunConclusion } from './types.js';
import {
  getPRHeadSha,
  getWorkflowRunsForCommit,
  getArtifactsForRun,
  downloadArtifact,
} from './github/api.js';
import { withRetry, isExpiredError } from './utils/retry.js';

export interface DownloadResult {
  headSha: string;
  inventory: ArtifactInventoryItem[];
  runStates: Map<string, RunConclusion>;
  runsWithoutArtifacts: string[];
}

export async function downloadArtifacts(
  repo: string,
  prNumber: number,
  outputDir: string,
  config: Config,
  logger: Logger,
  resume: boolean = false,
  dryRun: boolean = false
): Promise<DownloadResult> {
  logger.info('Fetching PR information...');
  const headSha = getPRHeadSha(repo, prNumber);
  logger.info(`Head SHA: ${headSha}`);

  logger.info('Finding workflow runs for commit...');
  const runs = getWorkflowRunsForCommit(repo, headSha);
  logger.info(`Found ${runs.length} workflow runs`);

  const inventory: ArtifactInventoryItem[] = [];
  const runStates = new Map<string, RunConclusion>();
  const runsWithoutArtifacts: string[] = [];

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

    logger.info(`\nRun ${runNum}/${runs.length}: ${run.name} (${run.id})`);

    // Map run conclusion to our type
    const conclusion = mapRunConclusion(run.conclusion, run.status);
    runStates.set(run.id, conclusion);
    logger.info(`  Status: ${conclusion}`);

    // Get artifacts for this run
    logger.info('  Fetching artifacts...');
    const artifacts = getArtifactsForRun(repo, run.id);
    logger.info(`  Found ${artifacts.length} artifacts`);

    if (artifacts.length === 0) {
      logger.info('  No artifacts found, will extract logs instead');
      runsWithoutArtifacts.push(run.id);
      continue;
    }

    // Download each artifact serially
    for (let j = 0; j < artifacts.length; j++) {
      const artifact = artifacts[j];
      const artifactNum = j + 1;

      logger.progress(
        `  Downloading artifact ${artifactNum}/${artifacts.length}: ${artifact.name} (${formatBytes(artifact.size_in_bytes)})...`
      );

      // Check if already downloaded in resume mode
      const existingEntry = existingInventory.find(
        item => item.runId === run.id && item.artifactName === artifact.name
      );

      if (resume && existingEntry && existingEntry.status === 'success') {
        logger.debug(`    Skipping (already downloaded)`);
        inventory.push(existingEntry);
        continue;
      }

      if (dryRun) {
        logger.info(`    [DRY RUN] Would download to ${outputDir}/raw/${run.id}/`);
        inventory.push({
          runId: run.id,
          artifactName: artifact.name,
          sizeBytes: artifact.size_in_bytes,
          status: 'success',
        });
        continue;
      }

      // Attempt download with retry
      const artifactOutputDir = join(outputDir, 'raw', run.id);
      mkdirSync(artifactOutputDir, { recursive: true });

      const result = await withRetry(
        () => {
          downloadArtifact(run.id, artifactOutputDir);
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
          runId: run.id,
          artifactName: artifact.name,
          sizeBytes: artifact.size_in_bytes,
          status: 'success',
        });
      } else {
        const error = result.error!;
        const status = isExpiredError(error) ? 'expired' : 'failed';
        logger.error(`    Failed: ${error.message}`);

        inventory.push({
          runId: run.id,
          artifactName: artifact.name,
          sizeBytes: artifact.size_in_bytes,
          status,
          errorMessage: error.message,
        });
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
