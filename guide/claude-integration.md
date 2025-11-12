# Claude Integration

`gh-ci-artifacts` is optimized for LLM analysis, particularly with Claude. This guide shows how to integrate it into your Claude workflow.

## Overview

After downloading artifacts, you can use the structured JSON output with Claude to analyze CI failures, understand test results, and get recommendations. The tool generates AI-optimized metadata including parsing guides for each artifact type.

## Quick Start

```bash
# 1. Download artifacts for PR #123
npx gh-ci-artifacts 123

# 2. Analyze with Claude
# The summary.json and catalog.json files contain all the information Claude needs
```

## Key Files for Claude Analysis

When analyzing CI failures with Claude, use these files in priority order:

### 1. `summary.json` - Master Overview

Contains all metadata, download status, validation results, and statistics:

- Workflow run information
- Artifact download status
- Validation results
- Overall statistics

### 2. `catalog.json` - Artifact Catalog

Contains type detection results with AI-optimized parsing guides:

- Detected artifact types
- `artifact.parsingGuide` - AI-optimized instructions for each artifact type
- Validation status
- Normalization information

### 3. `artifacts.json` - Download Inventory

Contains download metadata for all artifacts.

## Directory Structure for Analysis

### `converted/` - Normalized Artifacts (PREFERRED)

Normalized artifacts (HTML/NDJSON/TXT → JSON) are easier to parse:

- **Playwright HTML → JSON** - Test results, failures, traces
- **pytest-html → JSON** - Test outcomes, errors, durations
- **NDJSON → JSON arrays** - Structured data arrays
- **Text → JSON** - Parsed structured data

**Always check `converted/` first** - these are more structured and easier to parse than HTML/raw formats.

### `raw/` - Original Artifacts

Original downloaded artifacts organized by `<run-id>/artifact-<id>/`:

- Use as fallback if normalized versions unavailable
- Contains original format files

### `logs/` - Extracted Logs

Extracted job logs (if applicable):

- Raw log files for runs without artifacts
- Organized by run ID and job name

## Using with Claude Code

### Create a Claude Command

Add this context block to your `.claude/commands/analyze-ci.md` file:

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

- **`converted/`** - Normalized artifacts (HTML/NDJSON/TXT → JSON) (PREFER THESE over originals)
  - Playwright HTML → JSON with test results, failures, traces
  - pytest-html → JSON with test outcomes, errors, durations
  - NDJSON formats normalized to JSON arrays
  - Text formats parsed and converted to JSON
- **`raw/`** - Original downloaded artifacts organized by `<run-id>/artifact-<id>/`
- **`logs/`** - Extracted linter outputs (ESLint, Prettier, Ruff, flake8, mypy, tsc, etc.) organized by `<run-id>/<job-name>-<linter>.txt`

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
4. Check `logs/` for linter/compiler errors
5. Validate artifact integrity using `artifact.validation` status in `catalog.json`
6. Fall back to `raw/` only if converted versions unavailable

**Pro Tip:** When analyzing an artifact, include the `parsingGuide` from `catalog.json` in your Claude prompt. The parsing guide is specifically written for AI agents and contains:
- How to interpret the artifact structure
- Key fields to focus on for failure analysis
- Caveats and edge cases
- Best practices for consumption

### Common Patterns

- Test failures: Check `converted/*.json` for test names, error messages, stack traces
- Linter errors: Check `logs/<run-id>/<job>-eslint.txt`, etc.
- Type errors: Check `logs/<run-id>/<job>-tsc.txt` or `<job>-mypy.txt`
- Build failures: Look in `raw/` for build logs if no linter output extracted
```

### Run the Command

```bash
# Download artifacts
npx gh-ci-artifacts 123

# Run Claude command
claude analyze-ci --pr_number=123
```

## Programmatic Usage

### TypeScript Example

```typescript
import { execSync } from "child_process";
import { readFileSync } from "fs";

// Download artifacts (uses current repo)
execSync("npx gh-ci-artifacts 123", { stdio: "inherit" });

// Load summary for analysis
const summary = JSON.parse(
  readFileSync(".gh-ci-artifacts/pr-123/summary.json", "utf-8")
);

// Load catalog for parsing guides
const catalog = JSON.parse(
  readFileSync(".gh-ci-artifacts/pr-123/catalog.json", "utf-8")
);

// Feed to Claude for analysis
// Include summary, catalog, and relevant converted artifacts
console.log(JSON.stringify({ summary, catalog }, null, 2));
```

### Python Example

```python
import subprocess
import json

# Download artifacts
subprocess.run(["npx", "gh-ci-artifacts", "123"], check=True)

# Load summary for analysis
with open(".gh-ci-artifacts/pr-123/summary.json") as f:
    summary = json.load(f)

# Load catalog for parsing guides
with open(".gh-ci-artifacts/pr-123/catalog.json") as f:
    catalog = json.load(f)

# Feed to Claude API or use in analysis
print(json.dumps({"summary": summary, "catalog": catalog}, indent=2))
```

## Using Parsing Guides

Each artifact in `catalog.json` includes an `artifact.parsingGuide` field with AI-optimized instructions:

```json
{
  "artifact": {
    "artifactType": "playwright-json",
    "parsingGuide": "Playwright JSON reports contain test results in a structured format...",
    "shortDescription": "Playwright test results in JSON format"
  }
}
```

**Include the parsing guide in your Claude prompt** to help it understand how to interpret the artifact:

```markdown
Analyze this Playwright test failure:

Parsing Guide: {artifact.parsingGuide}

Test Results: {converted artifact content}
```

## Best Practices

### 1. Start with Summary

Always begin analysis with `summary.json` to understand:
- Which workflows failed
- Which artifacts were downloaded successfully
- Which artifacts failed or expired
- Overall statistics

### 2. Use Parsing Guides

Include `artifact.parsingGuide` from `catalog.json` in your prompts to help Claude understand artifact structure.

### 3. Prefer Converted Artifacts

Always check `converted/` directory first - these are normalized to JSON and easier to parse.

### 4. Check Validation Status

Use `artifact.validation` status in `catalog.json` to verify artifact integrity before analysis.

### 5. Handle Missing Artifacts

Check `summary.json` for `downloadStatus` to understand why artifacts might be missing:
- `"expired"` - Artifact expired (90-day GitHub limit)
- `"failed"` - Download failed
- `"skipped"` - Skipped by configuration

## Example Analysis Workflow

```bash
# 1. Download artifacts
npx gh-ci-artifacts 123

# 2. Check summary for overview
cat .gh-ci-artifacts/pr-123/summary.json | jq '.stats'

# 3. Find failed workflows
cat .gh-ci-artifacts/pr-123/summary.json | jq '.runs[] | select(.conclusion == "failure")'

# 4. Get parsing guide for artifact type
cat .gh-ci-artifacts/pr-123/catalog.json | jq '.[] | select(.detectedType == "playwright-json") | .artifact.parsingGuide'

# 5. Analyze converted artifacts
cat .gh-ci-artifacts/pr-123/converted/*/playwright-report.json | jq '.suites[] | select(.ok == false)'
```

## Recommended Test Reporter Setup

For optimal results, configure your test frameworks to output JSON:

### Playwright

```typescript
// playwright.config.ts
export default {
  reporter: [["json", { outputFile: "results.json" }]],
};
```

### Jest

```json
{
  "reporters": ["default", "jest-json-reporter"]
}
```

This reduces the need for HTML parsing and improves data quality.

## See Also

- [Output Format Guide](output-format.md) - Understanding the JSON structure
- [Artifact Detection](features/artifact-detection.md) - How artifact types are detected
- [Normalization](features/normalization.md) - How formats are normalized to JSON

