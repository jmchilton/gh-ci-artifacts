# Existing NPM Ecosystem Analysis

## Summary

No existing package provides end-to-end PR failure analysis pipeline. We'll leverage existing parsers but need custom implementation for orchestration, type detection, HTML conversion, and linter extraction.

---

## Artifact Download

### `@actions/artifact` (Official GitHub Package)
- **What it does:** Programmatic artifact upload/download via Node.js API
- **Limitation:** Designed for use *within* GitHub Actions workflows, not standalone CLI
- **Example:** `await artifact.downloadArtifact(id, { path: '/tmp/dst/path' })`
- **Decision:** ❌ Not suitable - requires running inside GHA context

### `octokit` / `octokit.js`
- **What it does:** Full-featured GitHub REST/GraphQL API client
- **Capabilities:**
  - `octokit.rest.actions.downloadArtifact()` for artifact downloads
  - `octokit.rest.actions.getArtifact()` for download URLs
  - Complete workflow run/job/log access
- **Limitation:** Requires custom auth handling, rate limit management, download orchestration
- **Known issues:** v4 artifacts may return 500 errors when downloaded via Octokit (reported 2024)
- **Decision:** 🔮 Future alternative to `gh` CLI (Phase 8 extensibility option)

### `gh` CLI (GitHub Official CLI)
- **What it does:** Battle-tested CLI for GitHub API operations
- **Why we're using it:**
  - Handles auth automatically
  - Built-in retry/rate limiting
  - Well-documented artifact download: `gh run download <run-id>`
- **Decision:** ✅ Primary choice for Phase 1-7

---

## Test Result Parsing

### `junit-xml-parser`
- **What it does:** Parse JUnit XML to JavaScript objects
- **API:** Returns structured test suite data (name, time, pass/fail stats, test cases)
- **Use case:** Parse XML artifacts from pytest, Java/JVM tests, etc.
- **Decision:** ✅ Use in Phase 4 for XML artifact parsing

### `jest-junit`
- **What it does:** Generate JUnit XML *from* Jest tests
- **Direction:** Jest → JUnit (opposite of what we need)
- **Decision:** ❌ Not applicable

### `playwright-ctrf-json-reporter`
- **What it does:** Playwright test reporter generating standardized JSON (Common Test Report Format)
- **Config:** Add to `playwright.config.ts` reporters array
- **Limitation:** Requires users configure their Playwright setup
- **Decision:** 📝 Document as recommended Playwright reporter (skip HTML parsing when used)

### Playwright Built-in JSON Reporter
- **What it does:** Native Playwright reporter: `reporter: [['json', { outputFile: 'results.json' }]]`
- **Decision:** 📝 Document as preferred format alongside CTRF

---

## HTML Parsing (for HTML→JSON conversion)

### `cheerio`
- **What it does:** Fast, jQuery-like HTML parsing for Node.js
- **Use case:** Extract embedded JSON from Playwright HTML reports (`data-jsonblob` attributes)
- **Decision:** ✅ Use in Phase 4 for HTML artifact parsing

### `jsdom`
- **What it does:** Full DOM implementation for Node.js
- **Tradeoff:** More heavyweight than cheerio, but handles complex JS-rendered HTML
- **Decision:** 🔄 Alternative to cheerio if needed

---

## Log Parsing

### `log-parser`
- **What it does:** Parse log streams containing JSON, error stacks, or simple messages
- **Limitation:** Generic parser, doesn't understand CI-specific patterns
- **Decision:** ❌ Too generic for linter extraction

### `github-actions-parser`
- **What it does:** Language server features for GitHub Actions YAML syntax
- **Limitation:** Not for parsing workflow logs/outputs
- **Decision:** ❌ Not applicable

### Custom Implementation Needed
- **Why:** Need CI-specific pattern matching for:
  - eslint, prettier, ruff, flake8, isort, black, tsc output formats
  - Log boundary detection (where linter output starts/ends)
  - Job name → linter type inference
- **Decision:** ✅ Build custom extractors in Phase 5

---

## Workflow/Run Metadata

### No existing specialized tools found
- Fetching workflow runs for PR head SHA
- Tracking run states (failed/in_progress/cancelled/success)
- Correlating artifacts to runs
- **Decision:** ✅ Custom implementation using `gh` CLI in Phase 2-3

---

## What We're Building (Unique Value)

**No existing package combines:**
1. External PR artifact collection (outside GHA workflows)
2. Multi-framework type detection (playwright/jest/pytest/junit/eslint)
3. HTML→JSON fallback conversion
4. Linter output extraction from logs
5. Unified summary format optimized for LLM consumption
6. Resume functionality for incomplete downloads
7. Graceful handling of expired artifacts

**Our niche:** End-to-end PR failure analysis pipeline for Claude Code integration.

---

## Libraries to Use

| Phase | Library | Purpose |
|-------|---------|---------|
| Phase 1-7 | `gh` CLI | Artifact/log downloads, API calls |
| Phase 4 | `junit-xml-parser` | Parse XML test results |
| Phase 4 | `cheerio` | Extract JSON from HTML reports |
| Phase 8 | `octokit` (optional) | Alternative backend to `gh` CLI |

---

## Libraries to Document (User-Facing)

Recommend users configure these for better output:
- `playwright-ctrf-json-reporter` - Standardized Playwright JSON
- Playwright built-in JSON reporter - Native JSON output
- Jest/pytest native JSON outputs where available

This reduces need for HTML parsing and improves data quality.
