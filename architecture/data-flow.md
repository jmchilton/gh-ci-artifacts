# Data Flow

This document describes how data flows through the gh-ci-artifacts system, from GitHub Actions to the final output files.

## High-Level Flow

```
GitHub Actions → Download → Extract Logs → Collect Artifacts → Catalog → Normalize → Generate Summary
```

## Detailed Flow

### 1. Initialization & Configuration

**Input:**
- CLI arguments (PR number, branch name, options)
- Configuration file (`.gh-ci-artifacts.json` or `.gh-ci-artifacts.yaml`)

**Process:**
1. Parse CLI arguments
2. Load configuration file (if exists)
3. Merge CLI options with file config
4. Validate GitHub CLI setup
5. Determine output directory

**Output:**
- Merged `Config` object
- Output directory path
- Logger instance

**Components:**
- `src/cli.ts` - CLI argument parsing
- `src/config.ts` - Configuration loading and merging

### 2. Reference Resolution

**Input:**
- PR number OR branch name
- Repository name
- Remote name (for branches)

**Process:**
1. **PR Mode:**
   - Query GitHub API for PR info
   - Extract head SHA and branch name
   - Store PR source branch

2. **Branch Mode:**
   - Query GitHub API for branch head SHA
   - Use provided branch name

**Output:**
- Head SHA (commit hash)
- Branch name
- PR branch (if PR mode)

**Components:**
- `src/github/api.ts` - `getPRInfo()`, `getBranchHeadSha()`

**Data Flow:**
```
CLI Args → GitHub API → PR/Branch Info → Head SHA + Branch Name
```

### 3. Workflow Run Discovery

**Input:**
- Repository name
- Branch name
- Head SHA
- PR number (if PR mode)

**Process:**
1. Query GitHub API for workflow runs
   - PR mode: `getWorkflowRunsForBranch()` (PR events)
   - Branch mode: `getWorkflowRunsForBranchPush()` (push events)
2. Filter runs:
   - By commit SHA (head SHA)
   - By conclusion (failed/cancelled, or all if `--include-successes`)
   - Latest attempt only (skip earlier retries)
3. Extract workflow metadata:
   - Workflow name
   - Run ID
   - Run attempt number
   - Run number
   - Conclusion status

**Output:**
- Array of workflow runs
- Map of run states (conclusion per run)
- Map of workflow runs (metadata per run ID)

**Components:**
- `src/github/api.ts` - `getWorkflowRunsForBranch()`, `getWorkflowRunsForBranchPush()`
- `src/downloader.ts` - Run filtering and processing

**Data Flow:**
```
Head SHA → GitHub API → Workflow Runs → Filtered Runs → Run Metadata
```

### 4. Artifact Download

**Input:**
- Workflow runs
- Output directory
- Configuration (retry settings, skip patterns)
- Resume flag

**Process:**
For each workflow run:

1. **Get artifacts:**
   - Query GitHub API for artifacts in run
   - Filter by skip patterns (global + workflow-specific)
   - Check resume mode (skip if already downloaded)

2. **Download artifacts:**
   - Create directory: `outputDir/raw/{runId}/artifact-{artifactId}/`
   - Download using `gh run download` command
   - Retry on failure (configurable retries)
   - Track download status (success/failed/expired)

3. **Build inventory:**
   - Record artifact metadata:
     - Run ID
     - Artifact name
     - Artifact ID
     - Size in bytes
     - Status (success/failed/expired)
     - Error message (if failed)

4. **Validate expectations:**
   - Check if required/optional artifacts are present
   - Generate validation results

**Output:**
- `ArtifactInventoryItem[]` - List of all artifacts
- `Map<string, RunConclusion>` - Conclusion status per run
- `ValidationResult[]` - Validation results per workflow
- `runsWithoutArtifacts: string[]` - Run IDs with no artifacts

**Components:**
- `src/downloader.ts` - `downloadArtifacts()`
- `src/github/api.ts` - `getArtifactsForRun()`, `downloadArtifact()`
- `src/workflow-matcher.ts` - `shouldSkipArtifact()`, `validateExpectations()`

**Data Flow:**
```
Workflow Runs → GitHub API → Artifact List → Filter → Download → Local Files → Inventory
```

**File Structure:**
```
outputDir/
  raw/
    {runId}/
      artifact-{artifactId}/
        {artifact files}
```

### 5. Log Extraction (Conditional)

**Input:**
- Runs without artifacts
- Output directory
- Repository name

**Process:**
For each run without artifacts:

1. **Get jobs:**
   - Query GitHub API for jobs in run
   - Filter to failed/cancelled jobs (or all if `--include-successes`)

2. **Download logs:**
   - Use `gh run view --log` command
   - Save to: `outputDir/logs/{runId}/{jobId}.log`
   - Track extraction status (success/failed)

**Output:**
- `Map<string, JobLog[]>` - Logs per run ID
- Each log entry contains:
  - Job ID
  - Job name
  - Log file path
  - Extraction status

**Components:**
- `src/log-extractor.ts` - `extractLogs()`
- `src/github/api.ts` - `getJobsForRun()`, `getJobLogs()`

**Data Flow:**
```
Runs Without Artifacts → GitHub API → Job List → Download Logs → Local Files
```

**File Structure:**
```
outputDir/
  logs/
    {runId}/
      {jobId}.log
```

### 6. Artifact Collection from Logs (Conditional)

**Input:**
- Extracted log files
- Extraction configuration (global + workflow-specific)
- Output directory

**Process:**
For each log file:

1. **Parse log:**
   - Read log file content
   - Use `artifact-detective` to extract artifacts
   - Match against configured artifact types

2. **Extract artifacts:**
   - For each detected artifact:
     - Extract content from log
     - Save to: `outputDir/logs/{runId}/artifacts/{artifactType}/{filename}`
     - Track extraction status

**Output:**
- `Map<string, ArtifactOutput[]>` - Extracted artifacts per run ID
- Each artifact output contains:
  - Artifact type
  - File path
  - Extraction status

**Components:**
- `src/linter-collector.ts` - `collectArtifactsFromLogs()`
- `artifact-detective` - `extract()` function

**Data Flow:**
```
Log Files → artifact-detective → Extract Artifacts → Local Files
```

**File Structure:**
```
outputDir/
  logs/
    {runId}/
      artifacts/
        {artifactType}/
          {filename}
```

### 7. Cataloging & Detection

**Input:**
- All downloaded artifacts (from `raw/` directory)
- Artifact inventory
- Custom artifact type mappings
- Output directory

**Process:**
For each artifact directory:

1. **Scan files:**
   - Recursively find all files in artifact directory
   - Skip directories

2. **Detect artifact type:**
   - Use `artifact-detective.detectArtifactType()`
   - Analyze file content (not just filename)
   - Apply custom type mappings if detected as "unknown"
   - Validate content (if enabled)

3. **Build catalog entry:**
   - Store detection results:
     - Detected type
     - Original format (json/html/xml/txt)
     - File path
     - Artifact metadata (name, ID, run ID)
     - Validation results (if enabled)
     - Artifact descriptor (if detected)

**Output:**
- `CatalogEntry[]` - Catalog of all artifacts
- Each entry contains:
  - Artifact metadata (name, ID, run ID)
  - Detected type
  - Original format
  - File path
  - Skipped flag (for binary files)
  - Converted flag (for normalized artifacts)
  - Validation results

**Components:**
- `src/cataloger.ts` - `catalogArtifacts()`
- `artifact-detective` - `detectArtifactType()`

**Data Flow:**
```
Artifact Files → Content Analysis → Type Detection → Custom Mapping → Catalog Entry
```

### 8. Normalization

**Input:**
- Catalog entries
- Artifact files
- Output directory

**Process:**
For each catalog entry (non-binary, non-skipped):

1. **Check if normalization needed:**
   - If already JSON format → skip
   - If HTML/NDJSON/TXT → normalize

2. **Normalize to JSON:**
   - Use `artifact-detective` normalization functions
   - Convert HTML/NDJSON/TXT to JSON format
   - Save to: `outputDir/converted/{runId}/artifact-{artifactId}/{filename}.json`

3. **Update catalog:**
   - Set `converted: true`
   - Store normalized file path

**Output:**
- Updated catalog entries (with `converted: true` and normalized paths)
- Normalized JSON files

**Components:**
- `src/cataloger.ts` - Normalization logic
- `artifact-detective` - Normalization functions

**Data Flow:**
```
Catalog Entries → Check Format → Normalize (if needed) → JSON Files → Update Catalog
```

**File Structure:**
```
outputDir/
  converted/
    {runId}/
      artifact-{artifactId}/
        {filename}.json
```

### 9. Summary Generation

**Input:**
- Artifact inventory
- Run states
- Logs (if extracted)
- Catalog
- Validation results
- Workflow runs metadata
- Repository info

**Process:**
1. **Calculate statistics:**
   - Total artifacts
   - Success/failed/expired counts
   - Normalized artifacts count
   - Binary files skipped
   - Logs extracted
   - Artifacts extracted from logs

2. **Determine overall status:**
   - Check validation results
   - Check for required missing artifacts
   - Set status: `success` | `failure` | `partial`

3. **Generate files:**
   - `summary.json` - Overall summary and statistics
   - `catalog.json` - Full artifact catalog
   - `artifacts.json` - Artifact inventory
   - `index.html` - Interactive HTML viewer

**Output:**
- Summary JSON file
- Catalog JSON file
- Inventory JSON file
- HTML viewer file

**Components:**
- `src/summary.ts` - `generateSummary()`
- `src/html-viewer.ts` - HTML generation

**Data Flow:**
```
All Data → Statistics → Status Determination → JSON Files + HTML Viewer
```

**File Structure:**
```
outputDir/
  summary.json
  catalog.json
  artifacts.json
  index.html
```

## Data Structures

### ArtifactInventoryItem
```typescript
{
  runId: string;
  artifactName: string;
  artifactId: number;
  sizeBytes: number;
  status: "success" | "failed" | "expired";
  errorMessage?: string;
}
```

### CatalogEntry
```typescript
{
  artifactName: string;
  artifactId: number;
  runId: string;
  detectedType: ArtifactType;
  originalFormat: "json" | "html" | "xml" | "txt";
  filePath: string;
  skipped?: boolean;
  converted?: boolean;
  normalizedPath?: string;
  validationResult?: ValidationResult;
  artifact?: ArtifactDescriptor;
}
```

### DownloadResult
```typescript
{
  headSha: string;
  prBranch?: string;
  inventory: ArtifactInventoryItem[];
  runStates: Map<string, RunConclusion>;
  runsWithoutArtifacts: string[];
  validationResults: ValidationResult[];
  workflowRuns: Map<string, WorkflowRunMetadata>;
}
```

## Error Handling & Retry Logic

### Download Retries
- **Configurable retries:** `maxRetries` (default: 3)
- **Retry delay:** `retryDelay` seconds (default: 5)
- **Retry on:** Network errors, API failures
- **No retry on:** Expired artifacts (detected and marked as "expired")

### Resume Mode
- **Load existing inventory:** Read `artifacts.json` if exists
- **Skip successful downloads:** Only download failed/expired artifacts
- **Preserve existing files:** Don't re-download successful artifacts

### Validation Errors
- **Non-blocking:** Validation failures don't stop processing
- **Logged:** Validation errors logged but processing continues
- **Stored:** Validation results stored in catalog and summary

## Parallelization Opportunities

Current implementation is **sequential** for:
- Artifact downloads (one at a time)
- Log extractions (one at a time)
- Cataloging (one file at a time)

**Future optimizations:**
- Parallel artifact downloads
- Parallel log extractions
- Parallel cataloging/detection
- Parallel normalization

## Polling Flow (--wait mode)

When `--wait` is enabled:

1. **Initial query:** Get workflow runs
2. **Check for in-progress:** If any runs are "in_progress" or "queued"
3. **Wait:** Sleep for `pollInterval` seconds (default: 1800 = 30 min)
4. **Re-query:** Get workflow runs again
5. **Repeat:** Until all complete or `maxWaitTime` exceeded (default: 21600 = 6 hours)
6. **Download:** Once all complete, proceed with download

**Data Flow:**
```
Query Runs → Check Status → Wait → Re-query → (Repeat) → Download
```
