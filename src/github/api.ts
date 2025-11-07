import { execSync } from "child_process";

/**
 * Filter workflow runs to only the latest attempt for each workflow.
 * When a workflow is retried, GitHub creates a new run with a higher run_attempt.
 * We only want the latest attempt to avoid duplicate artifacts/logs.
 */
function filterToLatestAttempts(runs: WorkflowRun[]): WorkflowRun[] {
  // Group runs by workflow path (unique identifier for a workflow)
  const runsByWorkflow = new Map<string, WorkflowRun[]>();

  for (const run of runs) {
    const existing = runsByWorkflow.get(run.path) || [];
    existing.push(run);
    runsByWorkflow.set(run.path, existing);
  }

  // For each workflow, keep only the run with highest run_attempt
  const latestRuns: WorkflowRun[] = [];

  for (const workflowRuns of runsByWorkflow.values()) {
    // Sort by run_attempt descending, then by created_at descending
    workflowRuns.sort((a, b) => {
      if (a.run_attempt !== b.run_attempt) {
        return b.run_attempt - a.run_attempt;
      }
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    // Take the first one (highest run_attempt, most recent if tied)
    latestRuns.push(workflowRuns[0]);
  }

  return latestRuns;
}

export interface PR {
  headRefOid: string;
  headRefName: string;
}

export interface BranchInfo {
  commit: {
    sha: string;
  };
}

export interface CheckRun {
  id: string;
  name: string;
  conclusion: string | null;
  status: string;
}

export interface WorkflowRun {
  id: number;
  name: string;
  path: string;
  conclusion: string | null;
  status: string;
  run_attempt: number;
  run_number: number;
  created_at: string;
}

export interface Artifact {
  id: number;
  name: string;
  size_in_bytes: number;
}

export interface Job {
  id: string;
  name: string;
  conclusion: string | null;
  status: string;
}

export function getPRInfo(repo: string, prNumber: number): PR {
  try {
    const output = execSync(
      `gh pr view ${prNumber} --repo ${repo} --json headRefOid,headRefName`,
      { encoding: "utf-8" },
    );
    return JSON.parse(output) as PR;
  } catch (error) {
    throw new Error(
      `Failed to fetch PR info: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function getPRHeadSha(repo: string, prNumber: number): string {
  return getPRInfo(repo, prNumber).headRefOid;
}

export function getBranchHeadSha(repo: string, branch: string): string {
  try {
    const output = execSync(
      `gh api repos/${repo}/branches/${branch} --jq '.commit.sha'`,
      { encoding: "utf-8" },
    );
    return output.trim();
  } catch (error) {
    throw new Error(
      `Failed to fetch branch info for '${branch}': ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function getWorkflowRunsForBranchPush(
  repo: string,
  branch: string,
  sha: string,
): WorkflowRun[] {
  try {
    // Query by branch and push event (filters to push events only)
    // Then filter by SHA for exact match
    const runsOutput = execSync(
      `gh api --paginate 'repos/${repo}/actions/runs?event=push&branch=${branch}' --jq '.workflow_runs[] | select(.head_sha == "${sha}") | {id, name, path, conclusion, status, run_attempt, run_number, created_at}'`,
      { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 },
    );

    // Parse NDJSON (newline-delimited JSON)
    const runs = runsOutput
      .trim()
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as WorkflowRun);

    // Filter to only the latest attempt for each workflow
    return filterToLatestAttempts(runs);
  } catch (error) {
    throw new Error(
      `Failed to fetch workflow runs: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function getWorkflowRunsForBranch(
  repo: string,
  branch: string,
  sha: string,
): WorkflowRun[] {
  try {
    // Query by branch and PR event first (much faster than paginating all runs)
    // Then filter by SHA for exact match
    const runsOutput = execSync(
      `gh api --paginate 'repos/${repo}/actions/runs?event=pull_request&branch=${branch}' --jq '.workflow_runs[] | select(.head_sha == "${sha}") | {id, name, path, conclusion, status, run_attempt, run_number, created_at}'`,
      { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 },
    );

    // Parse NDJSON (newline-delimited JSON)
    const runs = runsOutput
      .trim()
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as WorkflowRun);

    // Filter to only the latest attempt for each workflow
    return filterToLatestAttempts(runs);
  } catch (error) {
    throw new Error(
      `Failed to fetch workflow runs: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function getWorkflowRunsForCommit(
  repo: string,
  sha: string,
): WorkflowRun[] {
  // Fallback for direct SHA queries (slower, but works without branch name)
  try {
    const runsOutput = execSync(
      `gh api --paginate repos/${repo}/actions/runs --jq '.workflow_runs[] | select(.head_sha == "${sha}") | {id, name, path, conclusion, status, run_attempt, run_number, created_at}'`,
      { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 },
    );

    const runs = runsOutput
      .trim()
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as WorkflowRun);

    // Filter to only the latest attempt for each workflow
    return filterToLatestAttempts(runs);
  } catch (error) {
    throw new Error(
      `Failed to fetch workflow runs: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function getArtifactsForRun(repo: string, runId: string): Artifact[] {
  try {
    const output = execSync(
      `gh api repos/${repo}/actions/runs/${runId}/artifacts --jq '.artifacts'`,
      { encoding: "utf-8" },
    );
    return JSON.parse(output) as Artifact[];
  } catch (error) {
    throw new Error(
      `Failed to fetch artifacts for run ${runId}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function getJobsForRun(repo: string, runId: string): Job[] {
  try {
    const output = execSync(
      `gh api repos/${repo}/actions/runs/${runId}/jobs --jq '.jobs'`,
      { encoding: "utf-8" },
    );
    return JSON.parse(output) as Job[];
  } catch (error) {
    throw new Error(
      `Failed to fetch jobs for run ${runId}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function downloadArtifact(
  runId: string,
  artifactName: string,
  artifactId: number,
  outputDir: string,
): void {
  try {
    execSync(
      `gh run download ${runId} --name "${artifactName}" --dir "${outputDir}"`,
      {
        encoding: "utf-8",
        stdio: "pipe",
      },
    );
  } catch (error) {
    throw new Error(
      `Failed to download artifact "${artifactName}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function getJobLogs(repo: string, jobId: string): string {
  try {
    const output = execSync(`gh api repos/${repo}/actions/jobs/${jobId}/logs`, {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
    });
    return output;
  } catch (error) {
    throw new Error(
      `Failed to fetch logs for job ${jobId}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
