/**
 * Programmatic API for gh-ci-artifacts action workflow
 * Orchestrates the complete process: download, extract, collect, catalog, and summarize
 */

import { downloadArtifacts } from "./downloader.js";
import { extractLogs } from "./log-extractor.js";
import { catalogArtifacts } from "./cataloger.js";
import { collectArtifactsFromLogs } from "./linter-collector.js";
import { generateSummary, determineExitCode } from "./summary-generator.js";
import { Logger } from "./utils/logger.js";
import type { Config, JobLog, ArtifactExtractionConfig, ArtifactTypeMapping } from "./types.js";

export interface ActionOptions {
  resume?: boolean;
  dryRun?: boolean;
  includeSuccesses?: boolean;
  wait?: boolean;
  repoExplicitlyProvided?: boolean;
}

export interface ActionResult {
  summary: Awaited<ReturnType<typeof generateSummary>>;
  exitCode: number;
}

/**
 * Get custom artifact type mappings, merging global and workflow-specific configs.
 */
function getCustomArtifactTypes(
  config: Config,
  workflowRuns: Map<
    string,
    { name: string; path: string; run_attempt: number; run_number: number }
  >,
): ArtifactTypeMapping[] {
  const allMappings: ArtifactTypeMapping[] = [];

  // Add global defaults first
  if (config.customArtifactTypes) {
    allMappings.push(...config.customArtifactTypes);
  }

  // Add workflow-specific mappings
  if (config.workflows) {
    for (const workflow of config.workflows) {
      if (workflow.customArtifactTypes) {
        allMappings.push(...workflow.customArtifactTypes);
      }
    }
  }

  return allMappings;
}

/**
 * Get artifact extraction configuration, merging global and workflow-specific configs.
 */
function getExtractionConfig(
  config: Config,
  workflowRuns: Map<
    string,
    { name: string; path: string; run_attempt: number; run_number: number }
  >,
  logsByRun: Map<string, JobLog[]>,
): ArtifactExtractionConfig[] | undefined {
  // If there are no workflow-specific configs, use global config
  if (!config.workflows || config.workflows.length === 0) {
    return config.extractArtifactTypesFromLogs;
  }

  // Map from runId to workflow name
  const runToWorkflow = new Map<string, string>();
  for (const [runId, workflowInfo] of workflowRuns) {
    runToWorkflow.set(runId, workflowInfo.name);
  }

  // Collect all extraction configs from runs being processed
  const extractionConfigs = new Map<string, ArtifactExtractionConfig>();

  // Add global defaults first
  if (config.extractArtifactTypesFromLogs) {
    for (const extractConfig of config.extractArtifactTypesFromLogs) {
      extractionConfigs.set(extractConfig.type, extractConfig);
    }
  }

  // Override with workflow-specific configs for runs that match
  for (const runId of logsByRun.keys()) {
    const workflowName = runToWorkflow.get(runId);
    if (!workflowName) continue;

    const matchingWorkflow = config.workflows.find(
      (w) => w.workflow === workflowName,
    );
    if (
      matchingWorkflow &&
      matchingWorkflow.extractArtifactTypesFromLogs
    ) {
      for (const extractConfig of matchingWorkflow.extractArtifactTypesFromLogs) {
        extractionConfigs.set(extractConfig.type, extractConfig);
      }
    }
  }

  return extractionConfigs.size > 0 ? Array.from(extractionConfigs.values()) : undefined;
}

/**
 * Run the complete gh-ci-artifacts action workflow
 */
export async function runAction(
  repo: string,
  prNumber: number | undefined,
  branchName: string | undefined,
  remoteName: string,
  outputDir: string,
  config: Config,
  logger: Logger,
  options: ActionOptions = {},
): Promise<ActionResult> {
  logger.info("\n=== Downloading artifacts ===");
  if (!options.includeSuccesses) {
    logger.info(
      "Skipping successful runs (use includeSuccesses to download all)",
    );
  }

  const result = await downloadArtifacts(
    repo,
    prNumber,
    branchName,
    remoteName,
    outputDir,
    config,
    logger,
    options.resume ?? false,
    options.dryRun ?? false,
    options.includeSuccesses ?? false,
    options.wait ?? false,
    options.repoExplicitlyProvided ?? false,
  );

  logger.info("\n=== Download complete ===");
  logger.info(`Head SHA: ${result.headSha}`);
  logger.info(`Total artifacts processed: ${result.inventory.length}`);

  const successCount = result.inventory.filter(
    (a) => a.status === "success",
  ).length;
  const expiredCount = result.inventory.filter(
    (a) => a.status === "expired",
  ).length;
  const failedCount = result.inventory.filter(
    (a) => a.status === "failed",
  ).length;

  logger.info(`  Success: ${successCount}`);
  logger.info(`  Expired: ${expiredCount}`);
  logger.info(`  Failed: ${failedCount}`);

  // Extract logs for runs without artifacts
  let logResult;
  if (result.runsWithoutArtifacts.length > 0 && !options.dryRun) {
    logger.info(
      `\n=== Extracting logs for ${result.runsWithoutArtifacts.length} runs without artifacts ===`,
    );
    logResult = await extractLogs(
      repo,
      result.runsWithoutArtifacts,
      outputDir,
      logger,
    );

    let totalLogsExtracted = 0;
    logResult.logs.forEach((runLogs) => {
      totalLogsExtracted += runLogs.filter(
        (log) => log.extractionStatus === "success",
      ).length;
    });

    logger.info(`\n=== Log extraction complete ===`);
    logger.info(`Total logs extracted: ${totalLogsExtracted}`);

    // Collect artifacts from logs
    logger.info("\n=== Collecting artifacts from logs ===");

    // Merge global and workflow-specific extraction configs
    const extractionConfig = getExtractionConfig(
      config,
      result.workflowRuns,
      logResult.logs,
    );

    const artifactResult = await collectArtifactsFromLogs(
      outputDir,
      logResult.logs,
      extractionConfig,
      logger,
    );

    let totalArtifactOutputs = 0;
    artifactResult.artifactOutputs.forEach((outputs) => {
      totalArtifactOutputs += outputs.length;
    });

    logger.info(`\n=== Artifact collection complete ===`);
    logger.info(`Total artifacts extracted: ${totalArtifactOutputs}`);

    // Store found artifact types for later validation
    (logResult as any).foundArtifactTypes = artifactResult.foundArtifactTypes;
    (logResult as any).extractionConfig = extractionConfig;
  }

  // Catalog artifacts and normalize to JSON
  let catalogResult;
  if (!options.dryRun) {
    logger.info("\n=== Cataloging artifacts and normalizing to JSON ===");
    const allRunIds = Array.from(result.runStates.keys());
    const customTypes = getCustomArtifactTypes(config, result.workflowRuns);
    catalogResult = await catalogArtifacts(
      outputDir,
      allRunIds,
      result.inventory,
      logger,
      customTypes.length > 0 ? customTypes : undefined,
    );

    const convertedCount = catalogResult.catalog.filter(
      (c) => c.converted,
    ).length;
    const skippedCount = catalogResult.catalog.filter(
      (c) => c.skipped,
    ).length;

    logger.info(`\n=== Cataloging complete ===`);
    logger.info(
      `Total artifacts cataloged: ${catalogResult.catalog.length}`,
    );
    logger.info(`  Artifacts normalized to JSON: ${convertedCount}`);
    logger.info(`  Binary files skipped: ${skippedCount}`);

    // Generate master summary
    logger.info("\n=== Generating summary ===");
    const summary = generateSummary(
      {
        repo,
        pr: prNumber,
        prBranch: result.prBranch,
        branch: branchName,
        headSha: result.headSha,
        inventory: result.inventory,
        runStates: result.runStates,
        logs: logResult?.logs || new Map(),
        catalog: catalogResult.catalog,
        validationResults: result.validationResults,
        workflowRuns: result.workflowRuns,
        // Log artifact validation inputs
        foundArtifactTypes: (logResult as any)?.foundArtifactTypes,
        extractionConfigs: (logResult as any)?.extractionConfig,
        workflowConfigs: config.workflows,
      },
      outputDir,
    );

    logger.info(`\n=== Complete ===`);
    logger.info(`Status: ${summary.status}`);

    // Report validation results if any
    if (summary.validationResults && summary.validationResults.length > 0) {
      const totalRequiredViolations = summary.validationResults.reduce(
        (sum, v) => sum + v.missingRequired.length,
        0,
      );
      const totalOptionalViolations = summary.validationResults.reduce(
        (sum, v) => sum + v.missingOptional.length,
        0,
      );
      const totalRequiredLogArtifactViolations = summary.validationResults.reduce(
        (sum, v) => sum + (v.missingRequiredLogArtifacts?.length || 0),
        0,
      );
      const totalOptionalLogArtifactViolations = summary.validationResults.reduce(
        (sum, v) => sum + (v.missingOptionalLogArtifacts?.length || 0),
        0,
      );

      logger.info("\nValidation results:");
      if (totalRequiredViolations > 0 || totalOptionalViolations > 0) {
        logger.info(`  Artifact expectations:`);
        logger.info(`    Required violations: ${totalRequiredViolations}`);
        logger.info(`    Optional violations: ${totalOptionalViolations}`);
      }
      if (totalRequiredLogArtifactViolations > 0 || totalOptionalLogArtifactViolations > 0) {
        logger.info(`  Log artifact expectations:`);
        logger.info(`    Required violations: ${totalRequiredLogArtifactViolations}`);
        logger.info(`    Optional violations: ${totalOptionalLogArtifactViolations}`);
      }
    }

    const exitCode = determineExitCode(summary.status);
    return { summary, exitCode };
  }

  return {
    summary: null as any,
    exitCode: 0,
  };
}
