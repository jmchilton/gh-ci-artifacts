import { execSync } from 'child_process';

export interface PR {
  headRefOid: string;
}

export interface CheckRun {
  id: string;
  name: string;
  conclusion: string | null;
  status: string;
}

export interface WorkflowRun {
  id: string;
  name: string;
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

export function getPRHeadSha(repo: string, prNumber: number): string {
  try {
    const output = execSync(
      `gh pr view ${prNumber} --repo ${repo} --json headRefOid`,
      { encoding: 'utf-8' }
    );
    const pr = JSON.parse(output) as PR;
    return pr.headRefOid;
  } catch (error) {
    throw new Error(
      `Failed to fetch PR head SHA: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function getWorkflowRunsForCommit(repo: string, sha: string): WorkflowRun[] {
  try {
    // Get check runs for commit
    const output = execSync(
      `gh api repos/${repo}/commits/${sha}/check-runs --jq '.check_runs'`,
      { encoding: 'utf-8' }
    );
    const checkRuns = JSON.parse(output) as CheckRun[];

    // Extract unique workflow run IDs from check runs
    const runIds = new Set<string>();
    checkRuns.forEach(checkRun => {
      // Extract run ID from check_run URL or use the check run ID
      // For simplicity, we'll query workflow runs differently
      runIds.add(checkRun.id);
    });

    // Alternative: Query workflow runs directly by head SHA
    const runsOutput = execSync(
      `gh api repos/${repo}/actions/runs --jq '.workflow_runs[] | select(.head_sha == "${sha}")'`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
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
