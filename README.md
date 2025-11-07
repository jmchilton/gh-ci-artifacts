# gh-ci-artifacts

[![npm version](https://img.shields.io/npm/v/gh-ci-artifacts.svg?style=flat-square)](https://www.npmjs.com/package/gh-ci-artifacts)
[![CI Status](https://img.shields.io/github/actions/workflow/status/jmchilton/gh-ci-artifacts/ci.yml?branch=main&style=flat-square)](https://github.com/jmchilton/gh-ci-artifacts/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node 20+](https://img.shields.io/badge/Node-20%2B-brightgreen.svg?style=flat-square)](https://nodejs.org/)

Download and parse GitHub Actions CI artifacts and logs for LLM analysis.

## Overview

`gh-ci-artifacts` automates the collection and normalization of GitHub Actions CI failures into structured JSON optimized for LLM analysis. It handles artifact downloads, log extraction, and parsing of common test/linter formats. Artifact type detection and validation is powered by [artifact-detective](https://jmchilton.github.io/artifact-detective/), which identifies and validates 20+ test framework and linter output formats.

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

# Download artifacts for a branch (from current repo, uses origin remote)
npx gh-ci-artifacts main

# Download from a different remote
npx gh-ci-artifacts main --remote upstream

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

After downloading, open `.gh-ci-artifacts/<ref>/index.html` in your browser for an interactive file tree viewer (where `<ref>` is `pr-<number>` for PRs or `branch-<remote>-<name>` for branches).

### Re-downloading Artifacts

When re-running for an existing PR or branch:

- **Without --resume**: Existing artifacts backed up to `.gh-ci-artifacts/<ref>-<timestamp>`, fresh download starts
- **With --resume**: Uses existing artifacts, retries only failures and incomplete downloads

This allows tracking evolution over time (PR updates or branch commits) while preserving historical snapshots.

## Example Repository

Try `gh-ci-artifacts` with our example repository:

```bash
# Download artifacts from an example PR
npx gh-ci-artifacts 1 --repo jmchilton/gh-ci-artifacts-example-full-stack-fastapi
```

The [gh-ci-artifacts-example-full-stack-fastapi](https://github.com/jmchilton/gh-ci-artifacts-example-full-stack-fastapi) repository demonstrates the tool with:

- **Full Stack Application:** FastAPI backend (Python) + React frontend (TypeScript)
- **Multiple Artifact Types:** Pytest coverage reports, Playwright E2E test results, Linter outputs
- **Intentional Failures:** Test failures showcasing error artifact analysis
- **GitHub Actions CI:** Simplified workflows that generate realistic artifacts

This is perfect for understanding what `gh-ci-artifacts` can do with your CI outputs.

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
- `customArtifactTypes` (array, optional): Map unknown artifact types to known types
  - `pattern` (string): Regex pattern to match artifact filenames
  - `type` (string): Artifact type to assign when pattern matches (e.g., "jest-json", "playwright-html")
  - `reason` (string, optional): Why this type mapping is needed
  - Useful when internal tools produce output in formats compatible with known types
  - Patterns are only matched for artifacts detected as "unknown"
- `extractArtifactTypesFromLogs` (array, optional): Extract artifacts from job logs
  - `type` (string): Artifact type to extract (e.g., "jest-json", "eslint-json")
  - `toJson` (boolean, optional): If true, normalize output to JSON format
  - `required` (boolean, optional): If true, expect this type in logs; if false, optional
  - `matchJobName` (string, optional): Regex to filter which jobs to search
  - `reason` (string, optional): Documentation for why this extraction is configured
  - `extractorConfig` (object, optional): Custom extraction patterns
    - `startMarker` (string): Regex pattern for where output starts
    - `endMarker` (string): Regex pattern for where output ends
    - `includeEndMarker` (boolean): Include the end marker in extracted output
- `workflows` (array): Per-workflow configuration
  - `workflow` (string): Workflow filename without extension (e.g., "ci" for `.github/workflows/ci.yml`)
  - `skip` (boolean, optional): Skip this entire workflow
  - `skipArtifacts` (array, optional): Skip patterns specific to this workflow
  - `customArtifactTypes` (array, optional): Workflow-specific artifact type mappings (overrides global)
  - `extractArtifactTypesFromLogs` (array, optional): Workflow-specific log extraction (merges with global)
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

**Custom Artifact Types:**

When artifact-detective can't identify an artifact type (labeled as "unknown"), you can register custom type mappings to tell gh-ci-artifacts what type the file actually is:

```json
{
  "customArtifactTypes": [
    {
      "pattern": "internal-test-report\\.json$",
      "type": "jest-json",
      "reason": "Internal test framework uses jest-compatible format"
    },
    {
      "pattern": "custom-lint-.*\\.html$",
      "type": "playwright-html",
      "reason": "Custom linter output in HTML format"
    }
  ]
}
```

- Patterns are regex-matched against artifact filenames
- Mappings are applied only when artifact type is detected as "unknown"
- Use at global level for repo-wide mappings or per-workflow for workflow-specific mappings
- The UI will show help text for unknown artifacts suggesting this configuration

**Artifact Expectations:**

- Validate that expected artifacts are present after download
- Required expectations (default) will log errors if artifacts are missing
- Optional expectations will log warnings if artifacts are missing
- Validation results are included in `summary.json` for analysis
- Useful for ensuring CI workflows produce expected outputs

**Log Artifact Extraction:**

Extract artifacts directly from job logs when they're not available as downloadable artifacts:

```json
{
  "extractArtifactTypesFromLogs": [
    {
      "type": "jest-json",
      "required": true,
      "reason": "Tests should always be captured from logs"
    },
    {
      "type": "eslint-json",
      "matchJobName": "lint",
      "required": false,
      "reason": "Lint output from specific jobs"
    }
  ]
}
```

- Configured at global level (all workflows) or per-workflow level (merges with global)
- Supports optional regex filtering by job name (`matchJobName`)
- Optional and required flags help track which extractions are critical
- Uses pattern matching to find artifact content within logs
- Customizable start/end markers for precise extraction

**Workflow Matching:**

- Workflows are matched by their filename without the `.yml` or `.yaml` extension
- Example: `.github/workflows/ci.yml` → `"workflow": "ci"`
- Example: `.github/workflows/e2e-tests.yaml` → `"workflow": "e2e-tests"`

CLI arguments override config file values.

## Output Structure

```
.gh-ci-artifacts/
├── pr-<number>/              # For PR mode (e.g., pr-123)
│   ├── index.html
│   ├── summary.json
│   ├── catalog.json
│   └── ...
└── branch-<remote>-<name>/   # For branch mode (e.g., branch-origin-main)
    ├── index.html
    ├── summary.json
    ├── catalog.json
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
  pr?: number;                // Present in PR mode only
  branch?: string;            // Present in branch mode only
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
      artifact?: {  // ArtifactDescriptor with parsingGuide for AI consumption
        artifactType: string;
        shortDescription: string;
        parsingGuide: string;  // AI-optimized instructions for analyzing this artifact
        toolUrl?: string;
        formatUrl?: string;
        fileExtension?: string;
        isJSON: boolean;
        normalizedFrom?: string;
      };
      validation?: {
        valid: boolean;
        error?: string;
      };
    }>;
    logs: Array<{
      jobName: string;
      extractionStatus: "success" | "failed";
      logFile?: string;
      linterOutputs?: Array<{
        detectedType: string;
        filePath: string;
        artifact?: {  // ArtifactDescriptor with parsingGuide for extracted linter output
          artifactType: string;
          shortDescription: string;
          parsingGuide: string;  // AI-optimized instructions for this linter format
          fileExtension?: string;
        };
        validation?: {
          valid: boolean;
          error?: string;
        };
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
    artifactsValidated: number;  // Artifacts that were validated
    artifactsInvalid: number;    // Artifacts that failed validation
    linterOutputsExtracted: number;  // Total linter outputs extracted from logs
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
  artifact?: {
    // ArtifactDescriptor with metadata optimized for AI consumption
    artifactType: string;
    fileExtension?: string;
    shortDescription: string; // Human-readable description
    toolUrl?: string; // Link to tool documentation
    formatUrl?: string; // Link to format specification
    parsingGuide: string; // AI-optimized parsing instructions for this artifact type
    isJSON: boolean;
    normalizedFrom?: string; // If artifact was normalized (e.g., pytest-html → pytest-json)
  };
  validation?: {
    // Validation result for the artifact
    valid: boolean;
    error?: string; // Validation error message if invalid
  };
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

## Supported CI Artifact Types

For a comprehensive list of all supported artifact types, see the [artifact-detective documentation](https://jmchilton.github.io/artifact-detective/#/artifact-types/). This includes:

- **[Test Frameworks](https://jmchilton.github.io/artifact-detective/#/artifact-types/test-frameworks)** - Playwright, Jest, pytest, JUnit, and more
- **[Linters & Formatters](https://jmchilton.github.io/artifact-detective/#/artifact-types/linters)** - ESLint, Prettier, Ruff, flake8, isort, black, TypeScript (`tsc`), mypy, pylint
- **Binary artifacts** - Screenshots, videos, and other non-text artifacts

Artifact type detection and validation is handled by [artifact-detective](https://jmchilton.github.io/artifact-detective/), the source of truth for artifact format specifications.

## Exit Codes

- `0`: Complete success - all runs finished, all artifacts downloaded
- `1`: Partial success - some artifacts failed to download
- `2`: Incomplete - workflow runs still in progress

## CLI Options

```
Usage: gh-ci-artifacts [options] <ref>

Arguments:
  ref                          Pull request number or branch name

Options:
  -V, --version                      output the version number
  -r, --repo <owner/repo>            Repository in owner/repo format (defaults to current repo)
  -o, --output-dir <dir>             Output directory
  --remote <name>                    Git remote name for branch mode (default: origin)
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
2. **`catalog.json`** - Type detection results for all artifacts with `artifact.parsingGuide` containing AI-optimized parsing instructions for each artifact type
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
2. Check `catalog.json` to find detected test framework types and **read the `artifact.parsingGuide` for AI-optimized instructions on how to consume each artifact type**
3. Look in `converted/` for structured JSON reports (preferred)
4. Check `linting/` for linter/compiler errors
5. Validate artifact integrity using `artifact.validation` status in `catalog.json`
6. Fall back to `raw/` only if converted versions unavailable

**Pro Tip:** When analyzing an artifact, include the `parsingGuide` from `catalog.json` in your Claude prompt. The parsing guide is specifically written for AI agents and contains:
- How to interpret the artifact structure
- Key fields to focus on for failure analysis
- Caveats and edge cases
- Best practices for consumption

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

**PR Mode:**

1. **Fetch PR metadata**: Get the latest commit SHA for the PR
2. **Find workflow runs**: Query all runs for that commit (filters to `pull_request` events)
3. **Download artifacts**: Serially download artifacts (rate-limit friendly)
4. **Extract logs**: For runs without artifacts, fetch job logs
5. **Detect types**: Identify test frameworks and linters
6. **Convert HTML**: Extract JSON from HTML reports (Playwright, pytest-html)
7. **Extract linters**: Parse linter outputs from logs
8. **Generate summary**: Combine everything into a master summary

**Branch Mode:**

1. **Fetch branch metadata**: Get the latest commit SHA for the branch head
2. **Find workflow runs**: Query all runs for that commit (filters to `push` events only - see limitations)
3. **Download artifacts**: Serially download artifacts (rate-limit friendly)
4. **Extract logs**, **Detect types**, **Convert HTML**, **Extract linters**, **Generate summary**: Same as PR mode

## Limitations

- Artifacts expire after 90 days (GitHub limitation) - tool gracefully handles this
- Serial downloads to respect GitHub rate limits
- `gh` CLI must be authenticated
- Some HTML formats may not be parseable (cataloged as-is)
- **Branch mode**: Only queries `push` event workflows - misses manually triggered (`workflow_dispatch`) or scheduled workflows running on that branch

## Contributing

Contributions welcome! Areas for improvement:

- **Artifact type support** (test frameworks, linters, formatters) - Contribute to [artifact-detective](https://github.com/jmchilton/artifact-detective) for artifact detection and validation improvements
- **HTML parser improvements** - Also contribute to [artifact-detective](https://github.com/jmchilton/artifact-detective) for HTML-to-JSON conversion
- **Performance optimizations** - Improve download speed, API efficiency, or artifact processing
- **Documentation and examples** - Help document use cases and best practices

**Note:** Artifact type detection, validation, and conversion is primarily handled by [artifact-detective](https://jmchilton.github.io/artifact-detective/). For new test framework support, linter patterns, or HTML parser improvements, please contribute directly to that project.

## License

MIT
