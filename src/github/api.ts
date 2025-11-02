import { execSync } from 'child_process';

export interface PR {
  headRefOid: string;
  headRefName: string;
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
      { encoding: 'utf-8' }
    );
    return JSON.parse(output) as PR;
  } catch (error) {
    throw new Error(
      `Failed to fetch PR info: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function getPRHeadSha(repo: string, prNumber: number): string {
  return getPRInfo(repo, prNumber).headRefOid;
}

export function getWorkflowRunsForBranch(repo: string, branch: string, sha: string): WorkflowRun[] {
  try {
    // Query by branch and PR event first (much faster than paginating all runs)
    // Then filter by SHA for exact match
    const runsOutput = execSync(
      `gh api --paginate 'repos/${repo}/actions/runs?event=pull_request&branch=${branch}' --jq '.workflow_runs[] | select(.head_sha == "${sha}") | {id, name, path, conclusion, status}'`,
      { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
    );

    // Parse NDJSON (newline-delimited JSON)
    const runs = runsOutput
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line) as WorkflowRun);

    return runs;
  } catch (error) {
    throw new Error(
      `Failed to fetch workflow runs: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function getWorkflowRunsForCommit(repo: string, sha: string): WorkflowRun[] {
  // Fallback for direct SHA queries (slower, but works without branch name)
  try {
    const runsOutput = execSync(
      `gh api --paginate repos/${repo}/actions/runs --jq '.workflow_runs[] | select(.head_sha == "${sha}") | {id, name, path, conclusion, status}'`,
      { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
    );

    const runs = runsOutput
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line) as WorkflowRun);

    return runs;
  } catch (error) {
    throw new Error(
      `Failed to fetch workflow runs: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function getArtifactsForRun(repo: string, runId: string): Artifact[] {
  try {
    const output = execSync(
      `gh api repos/${repo}/actions/runs/${runId}/artifacts --jq '.artifacts'`,
      { encoding: 'utf-8' }
    );
    return JSON.parse(output) as Artifact[];
  } catch (error) {
    throw new Error(
      `Failed to fetch artifacts for run ${runId}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function getJobsForRun(repo: string, runId: string): Job[] {
  try {
    const output = execSync(
      `gh api repos/${repo}/actions/runs/${runId}/jobs --jq '.jobs'`,
      { encoding: 'utf-8' }
    );
    return JSON.parse(output) as Job[];
  } catch (error) {
    throw new Error(
      `Failed to fetch jobs for run ${runId}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function downloadArtifact(runId: string, outputDir: string): void {
  try {
    execSync(`gh run download ${runId} --dir "${outputDir}"`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
  } catch (error) {
    throw new Error(
      `Failed to download artifacts: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function getJobLogs(repo: string, jobId: string): string {
  try {
    const output = execSync(
      `gh api repos/${repo}/actions/jobs/${jobId}/logs`,
      { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
    );
    return output;
  } catch (error) {
    throw new Error(
      `Failed to fetch logs for job ${jobId}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
