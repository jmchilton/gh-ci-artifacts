# Output Format

The `gh-ci-artifacts` tool generates a structured directory with JSON files, HTML viewer, and raw artifacts.

## Directory Structure

```
.gh-ci-artifacts/
├── pr-123/
│   ├── index.html              # Interactive HTML viewer
│   ├── summary.json            # Analysis results
│   ├── catalog.json            # Artifact type detection
│   ├── artifacts.json          # Download inventory
│   ├── raw/                    # Downloaded artifacts and logs
│   │   ├── 1234567/            # Run ID directory
│   │   │   ├── artifact-name.zip
│   │   │   └── job-name.log
│   │   └── 1234568/
│   └── converted/              # Converted artifacts (HTML → JSON)
│       ├── pytest-report.json
│       └── playwright-report.json
```

## JSON Files

### summary.json

Complete analysis summary with status and statistics:

```typescript
{
  "mode": "pr",                    // "pr" or "branch"
  "pr": 123,                       // PR number (PR mode only)
  "prBranch": "feature/new",       // Source branch of PR
  "branch": "main",                // Branch name (branch mode only)
  "repo": "owner/repo",
  "headSha": "abc123def456",
  "analyzedAt": "2024-01-15T10:30:00Z",
  "status": "partial",             // "complete" | "partial" | "incomplete"
  "inProgressRuns": 0,
  "runs": [
    {
      "runId": "1234567",
      "workflowName": "Test",
      "conclusion": "failure",     // "success" | "failure" | "cancelled"
      "artifacts": [
        {
          "name": "test-results",
          "downloadStatus": "success"
        }
      ],
      "logs": [
        {
          "jobName": "test",
          "extractionStatus": "success",
          "logFile": "raw/1234567/test.log"
        }
      ]
    }
  ],
  "stats": {
    "totalRuns": 4,
    "artifactsDownloaded": 3,
    "artifactsFailed": 1,
    "logsExtracted": 2,
    "htmlConverted": 1,
    "artifactsValidated": 2,
    "artifactsInvalid": 0,
    "linterOutputsExtracted": 1
  }
}
```

### catalog.json

Artifact type detection results:

```json
[
  {
    "name": "pytest-report",
    "runId": "1234567",
    "type": "pytest-html",
    "format": "html",
    "status": "valid",
    "converted": true,
    "path": "raw/1234567/pytest-report.html"
  },
  {
    "name": "coverage",
    "runId": "1234567",
    "type": "coverage-html",
    "format": "html",
    "status": "valid",
    "converted": true,
    "path": "raw/1234567/coverage/index.html"
  }
]
```

### artifacts.json

Download inventory with status:

```json
[
  {
    "runId": "1234567",
    "workflowName": "Test Backend",
    "artifactName": "pytest-results",
    "sizeBytes": 2048576,
    "createdAt": "2024-01-15T10:20:00Z",
    "expiresAt": "2024-04-15T10:20:00Z",
    "downloadStatus": "success",
    "localPath": "raw/1234567/pytest-results.zip"
  }
]
```

## HTML Viewer (index.html)

Interactive interface for exploring results:

**Tabs:**
1. **Catalog** - Detected artifact types with details
2. **Summary** - Overall statistics and run status
3. **Files** - Raw artifacts and logs in file tree

**Features:**
- GitHub navigation links (PR/Commits/Checks/Review)
- Status indicator (complete/partial/incomplete)
- Search across files
- Expandable file tree
- Direct artifact viewing

## Converted Artifacts

HTML reports automatically converted to JSON:

```json
{
  "tests": [
    {
      "name": "test_example",
      "status": "failed",
      "duration": 1.23,
      "error": "AssertionError: expected 5 to equal 6"
    }
  ],
  "summary": {
    "total": 10,
    "passed": 8,
    "failed": 2,
    "duration": 12.45
  }
}
```

## Status Values

### Download Status
- `success` - Artifact downloaded
- `failed` - Download failed (see error message)
- `expired` - Artifact expired (>90 days)
- `pending` - Workflow still running

### Artifact Status
- `valid` - Recognized artifact type
- `skipped` - Artifact matched skip pattern
- `invalid` - Artifact could not be parsed
- `unknown` - Type not detected

### Overall Status
- `complete` - All artifacts downloaded and analyzed
- `partial` - Some artifacts missing but analysis complete
- `incomplete` - Major failures, analysis may be unreliable

## Error Messages

When downloads fail, `summary.json` includes error details:

```json
{
  "downloadStatus": "failed",
  "errorMessage": "Failed to download artifact 'report': HTTP 404: Not Found"
}
```

Common errors:
- **404 Not Found** - Artifact doesn't exist or was deleted
- **403 Forbidden** - No permission to access artifact
- **Expired** - Artifact deleted after 90 days
- **Network error** - Connection issue (retryable)

## File Paths

All paths in JSON are relative to the artifact directory:

```
Raw artifacts:     raw/1234567/file.zip
Converted JSON:    converted/file.json
Log files:         raw/1234567/job-name.log
```

## Usage

**View in browser:**
```bash
open .gh-ci-artifacts/pr-123/index.html
```

**Parse JSON programmatically:**
```bash
cat .gh-ci-artifacts/pr-123/summary.json | jq '.stats'
```

**Analyze artifacts:**
```bash
cat .gh-ci-artifacts/pr-123/catalog.json | jq '.[] | select(.type=="pytest-html")'
```

See [Guide](./index.md) for more examples.
