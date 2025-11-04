# gh-ci-artifacts

[![npm version](https://img.shields.io/npm/v/gh-ci-artifacts.svg?style=flat-square)](https://www.npmjs.com/package/gh-ci-artifacts)
[![CI Status](https://img.shields.io/github/actions/workflow/status/jmchilton/gh-ci-artifacts/ci.yml?branch=main&style=flat-square)](https://github.com/jmchilton/gh-ci-artifacts/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node 20+](https://img.shields.io/badge/Node-20%2B-brightgreen.svg?style=flat-square)](https://nodejs.org/)

Download and parse GitHub Actions CI artifacts and logs for LLM analysis.

## Overview

`gh-ci-artifacts` automates the collection and normalization of GitHub Actions CI failures into structured JSON optimized for LLM analysis (particularly Claude). It handles artifact downloads, log extraction, and parsing of common test/linter formats.

**Key Features:**

- Focuses on failures by default (skips successful runs)
- Zero-config operation with optional configuration file
- Automatic type detection for Playwright, Jest, pytest, JUnit, ESLint, and more
- HTML to JSON conversion for test reports
- Linter output extraction from logs
- Robust error handling with retry logic
- Resume functionality for incomplete downloads
- Graceful handling of expired artifacts

## Installation

**Option 1: Use with npx (no installation required)**

```bash
npx gh-ci-artifacts 123
```

**Option 2: Install globally**

```bash
npm install -g gh-ci-artifacts
gh-ci-artifacts 123
```

**Requirements:**

- Node.js 20+
- [GitHub CLI (`gh`)](https://cli.github.com/) installed and authenticated

## Quick Start

```bash
# Download artifacts for a PR (from current repo)
npx gh-ci-artifacts 123

# Specify a different repository
npx gh-ci-artifacts 123 --repo owner/repo

# With custom output directory
npx gh-ci-artifacts 123 --output-dir ./ci-data

# Dry run to see what would be downloaded
npx gh-ci-artifacts 123 --dry-run

# Resume interrupted download (retry failures/incomplete)
npx gh-ci-artifacts 123 --resume

# Include successful runs (by default, only failures/cancelled are downloaded)
npx gh-ci-artifacts 123 --include-successes

# Wait for in-progress workflows to complete (polls every 30 min, max 6 hours)
npx gh-ci-artifacts 123 --wait

# Wait with custom polling interval and timeout
npx gh-ci-artifacts 123 --wait --poll-interval 600 --max-wait-time 7200

# Open HTML viewer in browser automatically when complete
npx gh-ci-artifacts 123 --open

# Enable debug logging
npx gh-ci-artifacts 123 --debug
```

**Note:** If installed globally, you can omit `npx` and use `gh-ci-artifacts` directly.

**Default Behavior:**

- Only failed and cancelled runs are downloaded. Use `--include-successes` to download all runs.
- **Only the latest retry attempt** for each workflow is processed. If a workflow was retried, earlier failed attempts are automatically skipped to avoid duplicate artifacts/logs.

After downloading, open `.gh-ci-artifacts/<pr-number>/index.html` in your browser for an interactive file tree viewer.

### Re-downloading PR Artifacts

When re-running for an existing PR:

- **Without --resume**: Existing artifacts backed up to `.gh-ci-artifacts/<pr>-<timestamp>`, fresh download starts
- **With --resume**: Uses existing artifacts, retries only failures and incomplete downloads

This allows tracking PR evolution over time while preserving historical snapshots.

## Configuration

Create `.gh-ci-artifacts.json` in your project directory:

```json
{
  "outputDir": "./custom-output",
  "defaultRepo": "owner/repo",
  "maxRetries": 5,
  "retryDelay": 10,
  "pollInterval": 1800,
  "maxWaitTime": 21600,
  "skipArtifacts": [
    {
      "pattern": ".*-screenshots$",
      "reason": "Screenshots not needed for analysis"
    }
  ],
  "workflows": [
    {
      "workflow": "ci",
      "expectArtifacts": [
        {
          "pattern": "test-results",
          "required": true
        }
      ]
    },
    {
      "workflow": "e2e",
      "skipArtifacts": [
        {
          "pattern": ".*-videos$",
          "reason": "E2E videos too large"
        }
      ]
    },
    {
      "workflow": "deploy-preview",
      "skip": true
    }
  ]
}
```

**Configuration options:**

- `outputDir` (string): Base output directory (default: `./.gh-ci-artifacts`)
- `defaultRepo` (string): Default repository to use
- `maxRetries` (number): Maximum retry attempts for failed downloads (default: 3)
- `retryDelay` (number): Initial retry delay in seconds (default: 5)
- `pollInterval` (number): Seconds between polls when using `--wait` (default: 1800 = 30 minutes)
- `maxWaitTime` (number): Maximum seconds to wait for workflows to complete (default: 21600 = 6 hours)
- `skipArtifacts` (array): Global skip patterns applied to all workflows
  - `pattern` (string): Regex pattern to match artifact names
  - `reason` (string, optional): Documentation for why this is skipped
- `workflows` (array): Per-workflow configuration
  - `workflow` (string): Workflow filename without extension (e.g., "ci" for `.github/workflows/ci.yml`)
  - `skip` (boolean, optional): Skip this entire workflow
  - `skipArtifacts` (array, optional): Skip patterns specific to this workflow
  - `expectArtifacts` (array, optional): Expected artifacts for validation
    - `pattern` (string): Regex pattern that at least one artifact should match
    - `required` (boolean, optional): If true (default), error if not found; if false, just warn
    - `reason` (string, optional): Documentation for why this is expected
  - `description` (string, optional): Documentation for this workflow config

**Skip Pattern Matching:**

- Patterns are matched against artifact names using regex
- Global skip patterns are applied first, then workflow-specific patterns
- First matching pattern determines the skip reason
- Invalid regex patterns are caught at config load time

**Artifact Expectations:**

- Validate that expected artifacts are present after download
- Required expectations (default) will log errors if artifacts are missing
- Optional expectations will log warnings if artifacts are missing
- Validation results are included in `summary.json` for analysis
- Useful for ensuring CI workflows produce expected outputs

**Workflow Matching:**

- Workflows are matched by their filename without the `.yml` or `.yaml` extension
- Example: `.github/workflows/ci.yml` → `"workflow": "ci"`
- Example: `.github/workflows/e2e-tests.yaml` → `"workflow": "e2e-tests"`

CLI arguments override config file values.

## Output Structure

```
.gh-ci-artifacts/
└── <pr-number>/
    ├── index.html            # Interactive HTML viewer
    ├── summary.json          # Master summary with all metadata
    ├── catalog.json          # Type detection results
    ├── artifacts.json        # Download inventory
    ├── raw/                  # Downloaded artifacts (original format)
    │   └── <run-id>/
    │       └── artifact-<artifact-id>/  # Each artifact in its own directory
    ├── converted/            # HTML→JSON conversions
    │   └── <run-id>/
    │       └── <filename>.json
    └── linting/              # Extracted linter outputs
        └── <run-id>/
            └── <job-name>-<linter>.txt
```

**Note:** Artifacts are downloaded to `artifact-<id>` directories to handle cases where multiple artifacts have the same name (common in matrix builds). The artifact ID uniquely identifies each artifact.

## Output Schema

### summary.json

```typescript
{
  repo: string;
  pr: number;
  headSha: string;
  analyzedAt: string;  // ISO 8601 timestamp
  status: "complete" | "partial" | "incomplete";
  inProgressRuns: number;
  runs: Array<{
    runId: string;
    workflowName: string;
    workflowPath: string;
    runAttempt: number;  // Which retry attempt this is (1 = first attempt, 2+ = retries)
    runNumber: number;   // Sequential number for this workflow
    conclusion: "failure" | "success" | "cancelled" | "in_progress";
    artifacts: Array<{
      name: string;
      sizeBytes: number;
      downloadStatus: "success" | "expired" | "failed" | "skipped";
      errorMessage?: string;
      skipReason?: string;  // Present when downloadStatus is "skipped"
      detectedType?: string;
      filePath?: string;
      converted?: boolean;
    }>;
    logs: Array<{
      jobName: string;
      extractionStatus: "success" | "failed";
      logFile?: string;
      linterOutputs?: Array<{
        detectedType: string;
        filePath: string;
      }>;
    }>;
    validationResult?: {  // Present if expectations configured and violations found
      workflowName: string;
      workflowPath: string;
      runId: string;
      runName: string;
      missingRequired: Array<{
        pattern: string;
        required: boolean;
        reason?: string;
      }>;
      missingOptional: Array<{
        pattern: string;
        required: boolean;
        reason?: string;
      }>;
    };
  }>;
  catalogFile: string;
  validationResults?: Array<{  // Summary of all validation failures
    workflowName: string;
    workflowPath: string;
    runId: string;
    runName: string;
    missingRequired: Array<{ pattern: string; required: boolean; reason?: string }>;
    missingOptional: Array<{ pattern: string; required: boolean; reason?: string }>;
  }>;
  stats: {
    totalRuns: number;
    artifactsDownloaded: number;
    artifactsFailed: number;
    logsExtracted: number;
    htmlConverted: number;
  };
}
```

### catalog.json

```typescript
Array<{
  artifactName: string;
  artifactId: number; // Unique GitHub artifact ID (used in directory names)
  runId: string;
  detectedType:
    | "playwright-json"
    | "jest-json"
    | "pytest-json"
    | "junit-xml"
    | "playwright-html"
    | "eslint-txt"
    | "binary"
    | "unknown";
  originalFormat: "json" | "xml" | "html" | "txt" | "binary";
  filePath: string;
  converted?: boolean; // True if HTML was converted to JSON
  skipped?: boolean; // True for binary files
}>;
```

## Common Skip Patterns

Here are some useful skip patterns for common scenarios:

**Skip all screenshots:**

```json
{ "pattern": ".*-screenshots$" }
```

**Skip videos and traces:**

```json
{ "pattern": ".*(videos|traces).*" }
```

**Skip binary artifacts (screenshots, videos, recordings):**

```json
{ "pattern": "^(screenshots|videos|recordings|traces)-.*" }
```

**Skip all Playwright traces:**

```json
{ "pattern": ".*-trace\\.zip$" }
```

**Skip debug/dev builds:**

```json
{ "pattern": ".*(debug|dev).*" }
```

**Skip large HTML reports (when JSON available):**

```json
{
  "workflow": "e2e",
  "skipArtifacts": [
    { "pattern": "playwright-report", "reason": "Using JSON report instead" }
  ]
}
```

## Common Expectation Patterns

Validate that your CI workflows produce expected artifacts:

**Require test results:**

```json
{
  "workflow": "ci",
  "expectArtifacts": [
    {
      "pattern": "test-results.*",
      "required": true,
      "reason": "CI must produce test results"
    }
  ]
}
```

**Expect coverage (optional):**

```json
{
  "workflow": "ci",
  "expectArtifacts": [
    {
      "pattern": "coverage-.*",
      "required": false,
      "reason": "Coverage reports are nice to have"
    }
  ]
}
```

**Multiple expectations:**

```json
{
  "workflow": "e2e",
  "expectArtifacts": [
    { "pattern": "playwright-report", "required": true },
    { "pattern": "test-results\\.json", "required": true },
    { "pattern": "screenshots-.*", "required": false }
  ]
}
```

**Flexible format matching:**

```json
{
  "workflow": "build",
  "expectArtifacts": [
    {
      "pattern": "dist-(linux|windows|macos).*",
      "required": true,
      "reason": "Must build for all platforms"
    }
  ]
}
```

## Supported Test Frameworks

**Artifact detection:**

- Playwright (JSON and HTML reports)
- Jest (JSON)
- pytest (JSON, HTML)
- JUnit (XML)
- Binary files (screenshots, videos)

**Linter detection:**

- ESLint
- Prettier
- Ruff
- flake8
- isort
- black
- TypeScript (`tsc`)
- mypy
- pylint

## Exit Codes

- `0`: Complete success - all runs finished, all artifacts downloaded
- `1`: Partial success - some artifacts failed to download
- `2`: Incomplete - workflow runs still in progress

## CLI Options

```
Usage: gh-ci-artifacts [options] <pr>

Arguments:
  pr                           Pull request number

Options:
  -V, --version                      output the version number
  -r, --repo <owner/repo>            Repository in owner/repo format (defaults to current repo)
  -o, --output-dir <dir>             Output directory
  --max-retries <count>              Maximum retry attempts (default: 3)
  --retry-delay <seconds>            Retry delay in seconds (default: 5)
  --resume                           Resume incomplete/failed downloads
  --include-successes                Include successful runs (default: only failures/cancelled)
  --wait                             Wait for in-progress workflows to complete (polls periodically)
  --poll-interval <seconds>          Seconds between polls when waiting (default: 1800 = 30 min)
  --max-wait-time <seconds>          Maximum seconds to wait for completion (default: 21600 = 6 hours)
  --open                             Open HTML viewer in browser when complete
  --debug                            Enable debug logging
  --dry-run                          Show what would be downloaded without downloading
  -h, --help                         display help for command
```

## Use Cases

### Claude Integration

#### Using with Claude Code

After downloading artifacts, you can create a custom Claude command to analyze the failures. Add this context block to your `.claude/commands/analyze-ci.md` file (or include it in any command prompt):

```markdown
# Analyze CI Failures

Analyze the CI failures for PR {pr_number} and provide recommendations.

## gh-ci-artifacts Output Guide

When analyzing CI failures from gh-ci-artifacts, the tool downloads and organizes GitHub Actions artifacts/logs into `.gh-ci-artifacts/<pr-number>/`:

### Key Files (in priority order)

1. **`summary.json`** - Master overview with all metadata, download status, validation results, and statistics
2. **`catalog.json`** - Type detection results for all artifacts (playwright-json, jest-json, pytest-json, junit-xml, eslint-txt, etc.)
3. **`artifacts.json`** - Download inventory with artifact metadata

### Directory Structure

- **`converted/`** - HTML reports converted to JSON (PREFER THESE over originals)
  - Playwright HTML → JSON with test results, failures, traces
  - pytest-html → JSON with test outcomes, errors, durations
- **`raw/`** - Original downloaded artifacts organized by `<run-id>/artifact-<id>/`
- **`linting/`** - Extracted linter outputs (ESLint, Prettier, Ruff, flake8, mypy, tsc, etc.) organized by `<run-id>/<job-name>-<linter>.txt`

### Important Context

- **By default, ONLY FAILURES are included** - all artifacts/logs represent failed or cancelled runs
- **Always check `converted/` first** - more structured and easier to parse than HTML/raw formats
- **Artifact IDs in paths** - `artifact-<id>` directories handle duplicate names from matrix builds
- **Latest retry only** - if workflows were retried, only the most recent attempt is included
- **Check `summary.json` for download status** - expired/failed artifacts noted in `downloadStatus` field

### Analyzing Failures

1. Start with `summary.json` to understand which workflows/jobs failed
2. Check `catalog.json` to find detected test framework types
3. Look in `converted/` for structured JSON reports (preferred)
4. Check `linting/` for linter/compiler errors
5. Fall back to `raw/` only if converted versions unavailable

### Common Patterns

- Test failures: Check `converted/*.json` for test names, error messages, stack traces
- Linter errors: Check `linting/<run-id>/<job>-eslint.txt`, etc.
- Type errors: Check `linting/<run-id>/<job>-tsc.txt` or `<job>-mypy.txt`
- Build failures: Look in `raw/` for build logs if no linter output extracted
```

Then run the command after downloading artifacts:

```bash
npx gh-ci-artifacts 123
claude analyze-ci --pr_number=123
```

#### Programmatic Usage

```typescript
import { execSync } from "child_process";
import { readFileSync } from "fs";

// Download artifacts (uses current repo)
execSync("npx gh-ci-artifacts 123", { stdio: "inherit" });

// Load summary for analysis
const summary = JSON.parse(
  readFileSync(".gh-ci-artifacts/123/summary.json", "utf-8"),
);

// Feed to Claude for analysis
console.log(summary);
```

### Recommended Test Reporter Setup

For optimal results, configure your test frameworks to output JSON:

**Playwright:**

```typescript
// playwright.config.ts
export default {
  reporter: [["json", { outputFile: "results.json" }]],
};
```

**Jest:**

```json
{
  "reporters": ["default", "jest-json-reporter"]
}
```

This reduces the need for HTML parsing and improves data quality.

## How It Works

1. **Fetch PR metadata**: Get the latest commit SHA for the PR
2. **Find workflow runs**: Query all runs for that commit
3. **Download artifacts**: Serially download artifacts (rate-limit friendly)
4. **Extract logs**: For runs without artifacts, fetch job logs
5. **Detect types**: Identify test frameworks and linters
6. **Convert HTML**: Extract JSON from HTML reports (Playwright, pytest-html)
7. **Extract linters**: Parse linter outputs from logs
8. **Generate summary**: Combine everything into a master summary

## Limitations

- Artifacts expire after 90 days (GitHub limitation) - tool gracefully handles this
- Serial downloads to respect GitHub rate limits
- `gh` CLI must be authenticated
- Some HTML formats may not be parseable (cataloged as-is)

## Contributing

Contributions welcome! Areas for improvement:

- Additional test framework support
- More linter patterns
- HTML parser improvements
- Performance optimizations

## License

MIT
