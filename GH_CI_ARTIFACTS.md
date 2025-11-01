# Plan: `gh-ci-artifacts` NPM Package

## Motivation & Use Cases

**Problem:** Analyzing CI failures on GitHub PRs requires manually navigating multiple workflow runs, downloading artifacts, parsing different test framework outputs, and extracting relevant errors from logs. This is time-consuming and error-prone for large projects with complex CI pipelines.

**Solution:** `gh-ci-artifacts` automates collection and normalization of GitHub Actions CI failures into structured JSON optimized for LLM analysis (Claude). It handles artifact downloads, log extraction, and parsing common test/linter formats.

**Primary use case:** Galaxy project uses this to power `/summarize_ci` Claude command - download all CI artifacts/logs for a PR, parse into JSON, then let Claude reason about transient vs new failures, generate summaries, post to PRs.

**Key goals:**
- Zero-config operation with optional config for advanced use
- Robust handling of expired/missing artifacts
- Convert HTML test reports to JSON where no JSON exists (e.g., playwright-html-reporter, pytest-html)
- Detect and label artifact types (playwright, jest, pytest, junit, eslint, etc.) without schema transformation
- Collect linter outputs for downstream processing
- Stream progress for long-running downloads
- Partial success handling - save what we can, fail gracefully

---

## Iterative Implementation Plan

### Phase 1: Core CLI scaffold
- Init TypeScript package (`gh-ci-artifacts`, Node 18+)
- CLI entry: `gh-ci-artifacts <owner>/<repo> <pr-number> [--output-dir <dir>]`
- Config file support (`.gh-ci-artifacts.json`): `outputDir`, `defaultRepo`
- Default output: `./.gh-ci-artifacts/<pr-number>/`
- Validate `gh` CLI installed and authenticated
- Setup progress logging to stderr

### Phase 2: Artifact inventory & download
- Fetch PR head SHA: `gh pr view <pr> --json headRefOid`
- Find failed runs: `gh api repos/<owner>/<repo>/commits/<sha>/check-runs`
- For each failed run, list artifacts: `gh api repos/<owner>/<repo>/actions/runs/<run-id>/artifacts`
- Track each artifact: name, size, run ID, download status (pending/success/expired/failed)
- Download artifacts **serially** (one at a time to avoid GitHub rate limits): `gh run download <run-id> --dir <output>/raw/<run-id>/`
- Detect expiry: Check error messages for "expired" or 410 HTTP status
- Stream progress: "Downloading artifact 3/7: Playwright results (0.5 MB)..."
- Save inventory: `<output>/artifacts.json` - array of `{runId, artifactName, sizeBytes, status, errorMessage?}`

### Phase 3: Log extraction for artifact-less runs
- For runs with no artifacts, fetch failed jobs: `gh api repos/<owner>/<repo>/actions/runs/<run-id>/jobs`
- Extract job logs: `gh api repos/<owner>/<repo>/actions/jobs/<job-id>/logs`
- Save raw logs: `<output>/raw/<run-id>/<job-name>.log`
- Track in inventory: `{runId, jobName, logExtracted: true/false, status}`

### Phase 4: Artifact type detection & HTML conversion
- Detect artifact type by filename/content patterns:
  - JSON: `*playwright*.json`, `*jest*.json`, `*pytest*.json`
  - XML: `*.xml` (JUnit)
  - HTML: `*playwright*.html`, `*pytest*.html`, etc.
- **For HTML artifacts only:**
  - Extract embedded JSON (e.g., `data-jsonblob` in Playwright HTML)
  - Save extracted JSON: `<output>/converted/<run-id>/<artifact-name>.json`
  - Track: `{converted: true, originalFormat: "html"}`
- **For JSON/XML artifacts:**
  - Leave as-is, just catalog
- Save detection results: `<output>/catalog.json`:
  ```typescript
  [{
    artifactName: string,
    runId: string,
    detectedType: "playwright-json" | "jest-json" | "pytest-json" | "junit-xml" | "playwright-html" | "eslint-txt" | "unknown",
    originalFormat: "json" | "xml" | "html" | "txt",
    filePath: string,           // Path to original or converted file
    converted?: boolean         // True if we extracted JSON from HTML
  }]
  ```

### Phase 5: Linter/build output collectors
- Detect linter types from job names/log patterns
- For each linter (eslint, prettier, ruff, flake8, isort, black, tsc):
  - Extract raw output sections from logs
  - Save: `<output>/linting/<run-id>/<job-name>-<linter>.txt`
  - Track in catalog: `{detectedType: "eslint-txt", filePath, ...}`
- No semantic parsing - just extraction for Claude consumption

### Phase 6: Master summary generation
- Combine all data into `<output>/summary.json`:
  ```typescript
  {
    repo: string,
    pr: number,
    headSha: string,
    analyzedAt: string,
    status: "complete" | "partial",  // partial if any downloads failed
    runs: [{
      runId: string,
      conclusion: "failure",
      artifacts: [{
        name: string,
        sizeBytes: number,
        downloadStatus: "success" | "expired" | "failed",
        errorMessage?: string,
        detectedType?: string,
        filePath?: string,
        converted?: boolean
      }],
      logs: [{
        jobName: string,
        extractionStatus: "success" | "failed",
        logFile?: string,
        linterOutputs?: [{detectedType: string, filePath: string}]
      }]
    }],
    catalogFile: "./catalog.json",
    stats: {
      totalRuns: number,
      artifactsDownloaded: number,
      artifactsFailed: number,
      logsExtracted: number,
      htmlConverted: number
    }
  }
  ```
- Exit code: 0 if all downloads succeeded, non-zero if any failed

### Phase 7: Error handling & polish
- Network failure retry logic (configurable attempts)
- Timeout handling for large artifacts
- Validate downloaded files exist and are non-empty
- Progress indicators: "Run 2/5: Downloading 3 artifacts..."
- Debug mode: `--debug` for verbose logging
- Dry run: `--dry-run` to show what would be downloaded

### Phase 8: Documentation & publishing
- README: installation, usage examples, config schema, output schema
- JSON schema definitions for config and summary output
- NPM publishing workflow
- Example: Integrate with Claude command

---

## Resolved Design Decisions

### Architecture:
- **Language:** TypeScript
- **GitHub API:** `gh` CLI (handles auth, battle-tested)
- **Node version:** 18+ (supports npm 10.9.3)
- **Package name:** `gh-ci-artifacts`

### Key Choices:
1. ✅ **HTML fallback:** Extract JSON from HTML for test frameworks when JSON unavailable
2. ✅ **Schema normalization:** Out of scope - catalog types, don't transform JSON formats
3. ✅ **Config extensibility:** Include framework detection config (custom artifact name patterns). Research existing NPM tools for pattern matching.
4. ✅ **Concurrent downloads:** Serial downloads to avoid GitHub rate limits. Document reasoning: GitHub API has rate limits for artifact downloads; serial processing ensures reliability over speed.
5. ✅ **Partial failures:** Save partial results, return non-zero exit code, track failures in summary.json
6. ✅ **Progress streaming:** Stream to stderr, final summary to stdout
7. ✅ **Default output:** `./.gh-ci-artifacts/<pr-number>/` with config override support

### Output Structure:
```
.gh-ci-artifacts/
└── <pr-number>/
    ├── summary.json          # Master summary with all metadata
    ├── catalog.json          # Type detection results
    ├── artifacts.json        # Download inventory
    ├── raw/                  # Downloaded artifacts (original format)
    │   └── <run-id>/
    │       └── <artifact-name>/
    ├── converted/            # HTML→JSON conversions
    │   └── <run-id>/
    │       └── <artifact-name>.json
    └── linting/              # Extracted linter outputs
        └── <run-id>/
            └── <job-name>-<linter>.txt
```

---

## Future Extensibility (Not in Initial Scope)

- Plugin system for custom parsers
- Support for GitLab CI, CircleCI
- Octokit backend as alternative to `gh` CLI
- Historical failure tracking/trends
- Transient failure detection (handled by downstream Claude command)
