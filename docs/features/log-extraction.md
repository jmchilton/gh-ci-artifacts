# Log Extraction

gh-ci-artifacts can extract raw job logs from GitHub Actions workflows when downloadable artifacts are not available. This is useful for analyzing failed runs that didn't produce artifacts, or for workflows that output information directly to logs.

## Overview

Log extraction downloads the raw console output from GitHub Actions jobs and saves them as `.log` files. These logs can then be processed to extract structured artifacts (see [Artifact Extraction from Logs](artifact-extraction-from-logs.md)).

## When Logs Are Extracted

Logs are automatically extracted for workflow runs that:

- **Don't have downloadable artifacts** - Runs that failed before producing artifacts
- **Have jobs that ran** - Only jobs that actually executed are processed (jobs with `started_at !== null`)
- **Have failed or completed jobs** - Jobs with `conclusion: "failure"` or `status: "completed"` are processed
- **Are part of the analysis** - Only runs matching the PR or branch being analyzed

The tool extracts logs **only when needed** - if a run has downloadable artifacts, logs are not extracted (since artifacts contain the structured data).

**Skipped jobs** (those that never ran due to failed dependencies) are detected and reported separately - no log fetch is attempted for them.

## Extraction Process

### Step 1: Identify Runs Without Artifacts

After downloading artifacts, the tool identifies runs that have no downloadable artifacts:

```typescript
runsWithoutArtifacts: string[] // Array of run IDs
```

### Step 2: Fetch Job Information

For each run, the tool:
1. Fetches all jobs for the run using GitHub API
2. Separates jobs into three categories:
   - **Skipped**: `conclusion: "skipped"` OR `started_at: null` (never ran, no logs)
   - **Runnable**: Jobs that actually executed
   - **Failed/Completed**: From runnable jobs with failure or completed status
3. Retrieves job metadata (name, ID, status, started_at)

### Step 3: Download Logs

For each job that ran (not skipped):
1. Downloads raw log content via GitHub API (`GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs`)
2. Sanitizes job name for filesystem safety
3. Saves log to `raw/{runId}/{jobName}.log`

For skipped jobs:
- No log fetch is attempted (jobs never ran, so no logs exist)
- Job is recorded with `extractionStatus: "skipped"` and `skipReason: "Job was skipped (never ran)"`

### Step 4: Store Results

Log extraction results are stored in:
- **Files**: `raw/{runId}/{jobName}.log` - Raw log content (only for successfully extracted logs)
- **Memory**: `JobLog[]` objects with metadata:
  - `jobName`: Original job name
  - `jobId`: GitHub job ID
  - `extractionStatus`: `"success"`, `"failed"`, or `"skipped"`
  - `logFile`: Path to saved log file (if successful)
  - `skipReason`: Reason job was skipped (if skipped)

## Output Structure

```
.gh-ci-artifacts/
└── pr-123/
    └── raw/
        └── 19186134146/
            ├── test-backend.log
            ├── test-docker-compose.log
            └── lint-backend.log
```

## Log File Format

Logs are saved as plain text files containing:
- **Console output** - All stdout/stderr from the job
- **Step output** - Output from each workflow step
- **Error messages** - Any errors that occurred during execution
- **Tool output** - Output from test runners, linters, build tools, etc.

## Error Handling

If log extraction fails for a job:
- Error is logged with details
- Job is marked with `extractionStatus: "failed"`
- Processing continues for other jobs
- Failed extractions don't block artifact collection

Common failure reasons:
- Job logs expired (GitHub retains logs for 90 days)
- API rate limiting
- Network errors
- Job doesn't exist

## Integration with Artifact Collection

After logs are extracted, they can be processed to extract structured artifacts:

1. **Logs are passed** to `collectArtifactsFromLogs()`
2. **Pattern matching** searches logs for artifact content
3. **Structured artifacts** are extracted and saved separately

See [Artifact Extraction from Logs](artifact-extraction-from-logs.md) for details on parsing logs.

## Configuration

Log extraction happens automatically when:
- Runs don't have downloadable artifacts
- Configuration includes `extractArtifactTypesFromLogs` (optional)

No explicit configuration is needed for log extraction itself - it's triggered automatically when artifacts are missing.

## Limitations

- **Log retention**: GitHub retains logs for 90 days
- **Size limits**: Very large logs may be truncated
- **Rate limiting**: Subject to GitHub API rate limits
- **Executed jobs only**: Only jobs that actually ran are processed (skipped jobs, which never ran due to failed dependencies, are detected and reported separately)

## Use Cases

**Debugging failed runs:**
- Analyze why tests failed
- Check build errors
- Review linter output

**Extracting artifacts from logs:**
- Parse test results embedded in logs
- Extract linter output from console
- Capture tool output not saved as artifacts

**Historical analysis:**
- Analyze past failures
- Compare log outputs across PRs
- Track error patterns
