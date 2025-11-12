# Claude Integration

`gh-ci-artifacts` is optimized for LLM analysis, particularly with Claude. This guide shows how to integrate it into your Claude workflow.

## Using with Claude Code

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

- **`converted/`** - Normalized artifacts (HTML/NDJSON/TXT → JSON) (PREFER THESE over originals)
  - Playwright HTML → JSON with test results, failures, traces
  - pytest-html → JSON with test outcomes, errors, durations
  - NDJSON formats normalized to JSON arrays
  - Text formats parsed and converted to JSON
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

## Programmatic Usage

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

## Recommended Test Reporter Setup

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
