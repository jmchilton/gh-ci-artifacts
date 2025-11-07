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
  } = input;

  // Determine overall status
  const inProgressCount = Array.from(runStates.values()).filter(
    (state) => state === "in_progress",
  ).length;

  const failedArtifacts = inventory.filter((a) => a.status === "failed").length;
  const status: SummaryStatus =
    inProgressCount > 0
      ? "incomplete"
      : failedArtifacts > 0
        ? "partial"
        : "complete";

  // Build run summaries
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

    // Find validation result for this run
    const validationResult = validationResults?.find((v) => v.runId === runId);

    // Get workflow info for this run
    const workflowInfo = workflowRuns.get(runId);

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
            validationResults && validationResults.length > 0
              ? validationResults
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
            validationResults && validationResults.length > 0
              ? validationResults
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
