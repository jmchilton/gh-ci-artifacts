# Resume Mode

Resume mode allows you to continue an interrupted download session, skipping artifacts that were already successfully downloaded and only re-downloading failed or missing artifacts. This is useful when downloads are interrupted by network issues, rate limits, or other errors.

## Overview

By default, when you run `gh-ci-artifacts` on a PR or branch that already has downloaded artifacts, the tool will **back up** the existing directory and start fresh. Resume mode changes this behavior to **reuse** existing successful downloads and only retry failures.

## How It Works

### Default Behavior (Without `--resume`)

When you run the tool on an existing PR/branch:

1. **Detects existing directory** - Finds `.gh-ci-artifacts/pr-123/` (or branch equivalent)
2. **Creates backup** - Renames directory to `.gh-ci-artifacts/pr-123-2024-01-15_10-30-00/`
3. **Starts fresh** - Begins new download from scratch
4. **All artifacts re-downloaded** - Even if they were successfully downloaded before

Example:
```bash
gh-ci-artifacts 123
# Found existing artifacts for PR #123
# Backing up to: .gh-ci-artifacts/pr-123-2024-01-15_10-30-00
# Starting fresh download...
```

### Resume Mode (With `--resume`)

When you use `--resume` flag:

1. **Loads existing inventory** - Reads `artifacts.json` from previous run
2. **Skips successful downloads** - Artifacts with `status: "success"` are reused
3. **Retries failures** - Artifacts with `status: "failed"` or `status: "expired"` are re-downloaded
4. **Downloads new artifacts** - Any artifacts not in the inventory are downloaded
5. **No backup created** - Existing directory is reused

Example:
```bash
gh-ci-artifacts 123 --resume
# Resume mode enabled
# Resume mode: loading existing inventory...
# Found 15 existing entries
# Skipping (already downloaded)  # For successful artifacts
# Downloading artifact...         # For failed/new artifacts
```

## When to Use Resume Mode

### Use `--resume` when:

- **Downloads were interrupted** - Network issues, Ctrl+C, etc.
- **Some artifacts failed** - Rate limits, expired artifacts, etc.
- **Adding new artifacts** - New workflow runs appeared since last download
- **Retrying failures** - Want to retry failed downloads without re-downloading everything
- **Large PRs** - Many artifacts and you want to avoid re-downloading successful ones

### Don't use `--resume` when:

- **Want fresh start** - Need to ensure all artifacts are re-downloaded
- **Artifacts may have changed** - Workflows were re-run and artifacts updated
- **First time downloading** - No existing artifacts to resume from
- **Debugging issues** - Want clean state for troubleshooting

## Resume Mode Process

### Step 1: Load Existing Inventory

The tool loads `artifacts.json` from the previous run:

```json
[
  {
    "runId": "1234567",
    "artifactName": "test-results",
    "artifactId": 12345,
    "sizeBytes": 1024000,
    "status": "success"  // This will be skipped
  },
  {
    "runId": "1234567",
    "artifactName": "coverage",
    "artifactId": 12346,
    "sizeBytes": 2048000,
    "status": "failed",   // This will be retried
    "errorMessage": "Rate limit exceeded"
  }
]
```

### Step 2: Check Each Artifact

For each artifact found in the current run:

1. **Look up in inventory** - Find matching `runId` and `artifactId`
2. **Check status**:
   - If `status === "success"` → Skip download, reuse existing
   - If `status === "failed"` → Retry download
   - If `status === "expired"` → Retry download
   - If not found → Download (new artifact)

### Step 3: Update Inventory

The inventory is updated with:
- **Successful downloads** - New and retried artifacts
- **Failed downloads** - New failures or retries that failed again
- **Skipped artifacts** - Entries from previous run that were reused

## Example Scenarios

### Scenario 1: Network Interruption

```bash
# First run - interrupted after 5 artifacts
gh-ci-artifacts 123
# Downloading artifact 5/20...
# ^C (interrupted)

# Resume - continues from artifact 6
gh-ci-artifacts 123 --resume
# Resume mode: loading existing inventory...
# Found 5 existing entries
# Skipping (already downloaded)  # Artifacts 1-5
# Downloading artifact 6/20...    # Continues from 6
```

### Scenario 2: Rate Limit Recovery

```bash
# First run - hit rate limit
gh-ci-artifacts 123
# Error: API rate limit exceeded
# 10 artifacts downloaded, 15 failed

# Wait for rate limit to reset, then resume
gh-ci-artifacts 123 --resume
# Resume mode: loading existing inventory...
# Found 10 existing entries
# Skipping (already downloaded)  # 10 successful
# Downloading artifact...         # Retries 15 failed
```

### Scenario 3: New Workflow Runs

```bash
# First run - downloaded artifacts from 3 workflow runs
gh-ci-artifacts 123

# Later - 2 more workflow runs completed
gh-ci-artifacts 123 --resume
# Resume mode: loading existing inventory...
# Found 12 existing entries
# Skipping (already downloaded)  # Original 12 artifacts
# Downloading artifact...         # New artifacts from 2 new runs
```

### Scenario 4: Waiting for In-Progress Workflows

```bash
# First run - some workflows still running
gh-ci-artifacts 123
# Run 1/5: Tests (failure) - 3 artifacts downloaded
# Run 2/5: Lint (in_progress) - No artifacts found yet
# Run 3/5: Build (in_progress) - No artifacts found yet

# Resume and wait for completion
gh-ci-artifacts 123 --resume --wait
# Resume mode: loading existing inventory...
# Found 3 existing entries
# Skipping (already downloaded)  # From Run 1
# === Waiting for 2 in-progress workflow(s) ===
# Polling again in 30 minutes...
# 
# === Polling attempt 2 ===
# Run 2/5: Lint (failure) - Now has artifacts!
#   Downloading artifact...  # New artifacts downloaded
# Run 3/5: Build (success) - Now has artifacts!
#   Downloading artifact...  # New artifacts downloaded
```

## Inventory File

The `artifacts.json` file tracks download status:

```json
[
  {
    "runId": "1234567",
    "artifactName": "test-results",
    "artifactId": 12345,
    "sizeBytes": 1024000,
    "status": "success"  // Successfully downloaded
  },
  {
    "runId": "1234567",
    "artifactName": "coverage",
    "artifactId": 12346,
    "sizeBytes": 2048000,
    "status": "failed",  // Download failed
    "errorMessage": "Rate limit exceeded"
  },
  {
    "runId": "1234567",
    "artifactName": "screenshots",
    "artifactId": 12347,
    "sizeBytes": 5120000,
    "status": "expired"  // Artifact expired
  },
  {
    "runId": "1234567",
    "artifactName": "logs",
    "artifactId": 12348,
    "sizeBytes": 0,
    "status": "skipped",  // Skipped by configuration
    "skipReason": ".*-screenshots$"
  }
]
```

### Status Values

- **`"success"`** - Artifact downloaded successfully (skipped in resume mode)
- **`"failed"`** - Download failed (retried in resume mode)
- **`"expired"`** - Artifact expired on GitHub (retried in resume mode)
- **`"skipped"`** - Artifact skipped by configuration (not re-evaluated)

## Handling In-Progress Workflows

Resume mode **does** handle artifacts from workflows that weren't ready yet, but indirectly:

### How It Works

1. **First run with in-progress workflows:**
   - Workflows with `status: "in_progress"` are processed
   - If no artifacts exist yet → workflow added to `runsWithoutArtifacts`
   - No artifacts are downloaded (they don't exist yet)
   - Inventory doesn't include these workflows

2. **Resume with `--wait` flag:**
   - Tool polls for in-progress workflows to complete
   - When workflows complete, artifacts become available
   - New artifacts are downloaded (treated as "new" since not in inventory)
   - Inventory updated with newly available artifacts

3. **Resume without `--wait` flag:**
   - If workflows completed between runs → artifacts are downloaded as new
   - If workflows still in-progress → skipped again (no artifacts available)

### Example

```bash
# First run - workflow still running
gh-ci-artifacts 123
# Run 1/3: CI Tests (in_progress)
#   No artifacts found, will extract logs instead

# Resume and wait for completion
gh-ci-artifacts 123 --resume --wait
# Resume mode: loading existing inventory...
# Found 5 existing entries
# === Waiting for 1 in-progress workflow(s) ===
# Polling again in 30 minutes...
# 
# === Polling attempt 2 ===
# Run 1/3: CI Tests (failure)  # Now completed!
#   Found 3 artifacts
#   Downloading artifact...     # New artifacts downloaded
```

**Note:** There's no `"pending"` or `"in_progress"` status for individual artifacts. Artifacts are either:
- **Downloaded** (`status: "success"`)
- **Failed** (`status: "failed"`)
- **Expired** (`status: "expired"`)
- **Skipped** (`status: "skipped"`)
- **Not yet available** (workflow still running, not in inventory)

## Limitations

### What Resume Mode Doesn't Do

1. **Doesn't verify file integrity** - Assumes existing files are valid if status is "success"
2. **Doesn't update successful artifacts** - Won't re-download even if artifact changed on GitHub
3. **Doesn't handle deleted files** - If files were manually deleted, resume mode won't detect it
4. **Doesn't resume log extraction** - Log extraction always runs fresh (doesn't check existing logs)
5. **No "pending" artifact status** - Artifacts from in-progress workflows aren't tracked until they're available

### What Gets Re-downloaded

- **Failed artifacts** - Any artifact with `status: "failed"`
- **Expired artifacts** - Any artifact with `status: "expired"`
- **New artifacts** - Artifacts not in existing inventory (including artifacts from workflows that completed since last run)
- **Artifacts from completed workflows** - If workflows were in-progress before, their artifacts are downloaded when they complete
- **Logs** - Always extracted fresh (not resumed)

### What Gets Skipped

- **Successful artifacts** - Only artifacts with `status: "success"` are skipped
- **Skipped artifacts** - Artifacts with `status: "skipped"` remain skipped

## Best Practices

1. **Use for large PRs** - Saves time on big downloads
2. **Retry after failures** - Useful after rate limits or network issues
3. **Don't use for debugging** - Use fresh downloads when troubleshooting
4. **Check inventory first** - Review `artifacts.json` to see what will be skipped
5. **Combine with `--wait`** - Resume after waiting for workflows to complete

## Command Examples

```bash
# Resume interrupted download
gh-ci-artifacts 123 --resume

# Resume and wait for in-progress workflows
gh-ci-artifacts 123 --resume --wait

# Resume with debug logging to see what's skipped
gh-ci-artifacts 123 --resume --debug

# Resume and include successful runs
gh-ci-artifacts 123 --resume --include-successes
```

## Technical Details

### Inventory Matching

Artifacts are matched by:
- **`runId`** - Workflow run ID (must match exactly)
- **`artifactId`** - GitHub artifact ID (must match exactly)

If either doesn't match, the artifact is treated as new and downloaded.

### File Preservation

When resuming:
- **Existing files preserved** - Files in `raw/` directory are kept
- **Catalog updated** - `catalog.json` is regenerated (may include new artifacts)
- **Summary updated** - `summary.json` reflects current state
- **HTML viewer updated** - `index.html` shows all artifacts (old + new)

### Error Recovery

If resume mode encounters errors:
- **Invalid inventory** - If `artifacts.json` is corrupted, resume mode fails gracefully
- **Missing files** - If files are missing but inventory says "success", they're treated as new
- **API errors** - Same retry logic applies as normal downloads
