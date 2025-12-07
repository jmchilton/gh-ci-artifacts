import { writeFileSync } from "fs";
import { join } from "path";
import { generateHtmlViewer } from "./html-viewer/index.js";
import type {
  Summary,
  SummaryStatus,
  RunSummary,
  RunConclusion,
  ArtifactInventoryItem,
  CatalogEntry,
  JobLog,
  ValidationResult,
  LogArtifactViolation,
  ArtifactExtractionConfig,
  WorkflowConfig,
} from "./types.js";

export interface SummaryInput {
  repo: string;
  pr?: number; // Present in PR mode
  prBranch?: string; // Source branch for PR mode
  branch?: string; // Present in branch mode
  headSha: string;
  inventory: ArtifactInventoryItem[];
  runStates: Map<string, RunConclusion>;
  logs: Map<string, JobLog[]>;
  catalog: CatalogEntry[];
  validationResults?: ValidationResult[];
  workflowRuns: Map<
    string,
    { name: string; path: string; run_attempt: number; run_number: number }
  >;
  // Log artifact validation inputs
  foundArtifactTypes?: Map<string, Set<string>>; // runId -> Set of found artifact types
  extractionConfigs?: ArtifactExtractionConfig[]; // Global extraction config with expectations
  workflowConfigs?: WorkflowConfig[]; // Workflow-specific configs
}

/**
 * Validate log artifact expectations for a specific run.
 * Compares expected artifact types from config against actually found types.
 */
function validateLogArtifacts(
  runId: string,
  workflowName: string,
  workflowPath: string,
  logs: JobLog[],
  foundTypes: Set<string> | undefined,
  globalConfigs: ArtifactExtractionConfig[] | undefined,
  workflowConfigs: WorkflowConfig[] | undefined,
): { missingRequired: LogArtifactViolation[]; missingOptional: LogArtifactViolation[] } {
  const missingRequired: LogArtifactViolation[] = [];
  const missingOptional: LogArtifactViolation[] = [];

  // Get extraction configs for this workflow
  const extractionConfigs: ArtifactExtractionConfig[] = [];

  // Start with global configs
  if (globalConfigs) {
    extractionConfigs.push(...globalConfigs);
  }

  // Override with workflow-specific configs
  if (workflowConfigs) {
    const matchingWorkflow = workflowConfigs.find(
      (w) => w.workflow === workflowName || workflowPath.includes(w.workflow),
    );
    if (matchingWorkflow?.extractArtifactTypesFromLogs) {
      // Workflow-specific configs override global ones for the same type
      const workflowTypes = new Set(
        matchingWorkflow.extractArtifactTypesFromLogs.map((c) => c.type),
      );
      // Remove global configs that are overridden
      const filteredGlobal = extractionConfigs.filter(
        (c) => !workflowTypes.has(c.type),
      );
      extractionConfigs.length = 0;
      extractionConfigs.push(...filteredGlobal);
      extractionConfigs.push(...matchingWorkflow.extractArtifactTypesFromLogs);
    }
  }

  // No expectations defined
  if (extractionConfigs.length === 0) {
    return { missingRequired, missingOptional };
  }

  const actualTypes = foundTypes || new Set<string>();

  for (const config of extractionConfigs) {
    // Check if matchJobName filter applies
    if (config.matchJobName) {
      const jobNameRegex = new RegExp(config.matchJobName, "i");
      const matchingJobs = logs.filter(
        (log) => log.extractionStatus === "success" && jobNameRegex.test(log.jobName),
      );
      // If no jobs match the filter, skip this expectation
      if (matchingJobs.length === 0) {
        continue;
      }
    }

    // Check if expected type was found
    if (!actualTypes.has(config.type)) {
      const violation: LogArtifactViolation = {
        type: config.type,
        required: config.required ?? false,
        reason: config.reason,
        matchJobName: config.matchJobName,
      };

      if (config.required) {
        missingRequired.push(violation);
      } else {
        missingOptional.push(violation);
      }
    }
  }

  return { missingRequired, missingOptional };
}

export function generateSummary(
  input: SummaryInput,
  outputDir: string,
): Summary {
  const {
    repo,
    pr,
    prBranch,
    branch,
    headSha,
    inventory,
    runStates,
    logs,
    catalog,
    validationResults,
    workflowRuns,
    foundArtifactTypes,
    extractionConfigs,
    workflowConfigs,
  } = input;

  // Count in-progress runs and failed artifacts for status determination
  const inProgressCount = Array.from(runStates.values()).filter(
    (state) => state === "in_progress",
  ).length;
  const failedArtifacts = inventory.filter((a) => a.status === "failed").length;

  // Build run summaries (status will be determined after, once we have all validation results)
  const runs: RunSummary[] = [];

  for (const [runId, conclusion] of runStates.entries()) {
    const runArtifacts = inventory
      .filter((item) => item.runId === runId)
      .map((item) => {
        // Find catalog entry for this artifact (match by runId and artifactId)
        const catalogEntry = catalog.find(
          (c) => c.runId === runId && c.artifactId === item.artifactId,
        );

        return {
          name: item.artifactName,
          sizeBytes: item.sizeBytes,
          downloadStatus: item.status,
          errorMessage: item.errorMessage,
          detectedType: catalogEntry?.detectedType,
          filePath: catalogEntry?.filePath,
          converted: catalogEntry?.converted,
          artifact: catalogEntry?.artifact,
          validation: catalogEntry?.validation,
        };
      });

    const runLogs = logs.get(runId) || [];

    // Find validation result for this run (from artifact expectations)
    let validationResult = validationResults?.find((v) => v.runId === runId);

    // Get workflow info for this run
    const workflowInfo = workflowRuns.get(runId);

    // Validate log artifact expectations
    const logArtifactValidation = validateLogArtifacts(
      runId,
      workflowInfo?.name || "Unknown",
      workflowInfo?.path || "",
      runLogs,
      foundArtifactTypes?.get(runId),
      extractionConfigs,
      workflowConfigs,
    );

    // Merge log artifact violations into validation result
    if (
      logArtifactValidation.missingRequired.length > 0 ||
      logArtifactValidation.missingOptional.length > 0
    ) {
      if (validationResult) {
        // Extend existing validation result
        validationResult = {
          ...validationResult,
          missingRequiredLogArtifacts: logArtifactValidation.missingRequired,
          missingOptionalLogArtifacts: logArtifactValidation.missingOptional,
        };
      } else {
        // Create new validation result for log artifacts only
        validationResult = {
          workflowName: workflowInfo?.name || "Unknown",
          workflowPath: workflowInfo?.path || "",
          runId,
          runName: workflowInfo?.name || "Unknown",
          missingRequired: [],
          missingOptional: [],
          missingRequiredLogArtifacts: logArtifactValidation.missingRequired,
          missingOptionalLogArtifacts: logArtifactValidation.missingOptional,
        };
      }
    }

    runs.push({
      runId,
      workflowName: workflowInfo?.name || "Unknown",
      workflowPath: workflowInfo?.path || "",
      runAttempt: workflowInfo?.run_attempt || 1,
      runNumber: workflowInfo?.run_number || 0,
      conclusion,
      artifacts: runArtifacts,
      logs: runLogs,
      validationResult,
    });
  }

  // Collect all validation results from runs (includes log artifact validations)
  const allValidationResults: ValidationResult[] = runs
    .filter((run) => run.validationResult)
    .map((run) => run.validationResult!);

  // Count log artifact violations for status determination
  const requiredLogArtifactViolations = allValidationResults.reduce(
    (sum, v) => sum + (v.missingRequiredLogArtifacts?.length || 0),
    0,
  );

  // Determine overall status (after building runs so we have log artifact violations)
  const status: SummaryStatus =
    inProgressCount > 0
      ? "incomplete"
      : failedArtifacts > 0 || requiredLogArtifactViolations > 0
        ? "partial"
        : "complete";

  // Calculate stats
  const stats = {
    totalRuns: runStates.size,
    artifactsDownloaded: inventory.filter((a) => a.status === "success").length,
    artifactsFailed: inventory.filter((a) => a.status === "failed").length,
    logsExtracted: Array.from(logs.values()).reduce(
      (total, runLogs) =>
        total +
        runLogs.filter((log) => log.extractionStatus === "success").length,
      0,
    ),
    htmlConverted: catalog.filter((c) => c.converted).length,
    artifactsValidated: catalog.filter((c) => c.validation !== undefined).length,
    artifactsInvalid: catalog.filter((c) => c.validation && !c.validation.valid)
      .length,
    linterOutputsExtracted: Array.from(logs.values()).reduce(
      (total, runLogs) =>
        total +
        runLogs.reduce(
          (sum, log) => sum + (log.linterOutputs?.length || 0),
          0,
        ),
      0,
    ),
  };

  // Build summary with discriminated union based on mode
  const summary: Summary =
    pr !== undefined
      ? {
          mode: "pr",
          pr,
          prBranch: prBranch || "", // Should always be present in PR mode
          repo,
          headSha,
          analyzedAt: new Date().toISOString(),
          status,
          inProgressRuns: inProgressCount,
          runs,
          catalogFile: "./catalog.json",
          validationResults:
            allValidationResults.length > 0
              ? allValidationResults
              : undefined,
          stats,
        }
      : {
          mode: "branch",
          branch: branch || "", // Should always be present in branch mode
          repo,
          headSha,
          analyzedAt: new Date().toISOString(),
          status,
          inProgressRuns: inProgressCount,
          runs,
          catalogFile: "./catalog.json",
          validationResults:
            allValidationResults.length > 0
              ? allValidationResults
              : undefined,
          stats,
        };

  // Save summary
  const summaryPath = join(outputDir, "summary.json");
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  // Generate HTML viewer
  generateHtmlViewer(outputDir, summary, catalog);

  return summary;
}

export function determineExitCode(status: SummaryStatus): number {
  switch (status) {
    case "complete":
      return 0;
    case "partial":
      return 1;
    case "incomplete":
      return 2;
    default:
      return 1;
  }
}
