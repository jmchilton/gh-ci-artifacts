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

### Phase 0.5: Testing Strategy

**Test framework:** Vitest (fast, TypeScript-native, Jest-compatible API)

**Unit tests (high coverage target: 80%+):**
- **Config parsing** (`src/config.ts`)
  - Valid/invalid `.gh-ci-artifacts.json` handling
  - CLI arg override behavior
  - Default value resolution
- **Artifact type detection** (`src/detectors/`)
  - Filename pattern matching (playwright, jest, pytest, junit, eslint, etc.)
  - Content-based detection fallbacks
  - Binary file detection
  - Test fixtures: Sample HTML/JSON/XML/binary files in `test/fixtures/artifacts/`
- **HTML parsers** (`src/parsers/html/`)
  - Playwright HTML reporter JSON extraction (`data-jsonblob` attribute)
  - pytest-html parsing
  - Test fixtures: `test/fixtures/html/` with real-world HTML reports
- **Linter extraction** (`src/parsers/linters/`)
  - Log pattern matching for eslint, prettier, ruff, flake8, tsc
  - Output boundary detection
  - Test fixtures: `test/fixtures/logs/` with sample CI logs
- **Summary generation** (`src/summary.ts`)
  - Combining run/artifact/log metadata
  - Exit code logic (complete/partial/incomplete)
  - Stats calculation
  - Mock input data structures
- **Rate limiting/retry** (`src/utils/retry.ts`)
  - Exponential backoff calculation
  - 429/410 response handling
  - `Retry-After` header parsing
  - Mock API responses with test doubles

**Integration tests (snapshot-based):**
- **`gh` CLI mocking** (`test/integration/`)
  - Use `execa` mock or fixture-based subprocess stubbing
  - Recorded API response fixtures in `test/fixtures/gh-responses/`
  - Test scenarios:
    - Successful artifact download flow
    - Expired artifacts (410 responses)
    - Rate limiting (429 with retry)
    - In-progress runs
    - Missing artifacts (empty runs)
- **End-to-end output validation**
  - Run CLI with mocked `gh` commands
  - Assert `summary.json`, `catalog.json`, `artifacts.json` structure
  - Use snapshot testing for JSON outputs
  - Verify file system layout matches expected structure

**Test utilities:**
- **Fixture factory** (`test/utils/fixtures.ts`)
  - Generate mock GitHub API responses
  - Create sample artifact/log files
  - Helper: `createMockRun(options)`, `createMockArtifact(options)`
- **Temp directory manager** (`test/utils/fs.ts`)
  - Create/cleanup test output dirs
  - Use `tmp` package for isolated test environments
- **`gh` CLI stub** (`test/utils/gh-stub.ts`)
  - Intercept subprocess calls
  - Return fixture data based on command patterns
  - Track call history for assertions

**CI setup:**
- GitHub Actions workflow (`.github/workflows/test.yml`)
  - Run on: push, PR
  - Node versions: 18.x, 20.x, 22.x
  - Steps: install, lint (eslint), type-check (tsc), test (vitest), coverage report
- Coverage reporting: vitest's built-in coverage (c8)
- Fail PR if coverage drops below 75%

**Testing phases:**
- Phase 1: Add unit tests alongside CLI scaffold implementation
- Phase 2-5: Add unit tests for each parser/detector as implemented
- Phase 6: Add integration tests for full pipeline
- Phase 7: Add error scenario tests (network failures, timeouts, invalid responses)

**Out of scope for initial testing:**
- Real GitHub API integration tests (too flaky, requires live repos)
- Performance/load testing
- Cross-platform CLI behavior (assume POSIX-compliant shells)

### Phase 1: Core CLI scaffold ✅ COMPLETE
- ✅ Init TypeScript package (`gh-ci-artifacts`, Node 18+)
- ✅ CLI entry: `gh-ci-artifacts <owner>/<repo> <pr-number> [--output-dir <dir>]`
- ✅ Config file support (`.gh-ci-artifacts.json` in current directory only): `outputDir`, `defaultRepo`
- ✅ Default output: `./.gh-ci-artifacts/<pr-number>/`
- ✅ Validate `gh` CLI installed and authenticated
- ✅ Setup progress logging to stderr
- ✅ Add `--resume` flag: Resume incomplete/failed downloads for an existing PR (skip already downloaded artifacts, retry failed ones)
- ✅ Unit tests for config parsing (10 tests passing)

### Phase 2: Artifact inventory & download
- Fetch PR head SHA (always target latest): `gh pr view <pr> --json headRefOid`
- Find all runs for head SHA: `gh api repos/<owner>/<repo>/commits/<sha>/check-runs`
- Track run states: `failed`, `in_progress`, `cancelled`, `success`
- For each run, list artifacts: `gh api repos/<owner>/<repo>/actions/runs/<run-id>/artifacts`
- Track each artifact: name, size, run ID, download status (pending/success/expired/failed)
- Download artifacts **serially** (one at a time to avoid GitHub rate limits): `gh run download <run-id> --dir <output>/raw/<run-id>/`
- **Rate limiting strategy:**
  - Respect `Retry-After` header on 429 responses
  - CLI flags: `--max-retries <count>` (default: 3), `--retry-delay <seconds>` (default: 5)
  - Exponential backoff: delay *= 2 on each retry
  - Max retry delay cap: 60 seconds
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
  - Binary: images, videos, etc.
- **For HTML artifacts only:**
  - Extract embedded JSON (e.g., `data-jsonblob` in Playwright HTML)
  - Save extracted JSON: `<output>/converted/<run-id>/<artifact-name>.json`
  - Track: `{converted: true, originalFormat: "html"}`
- **For JSON/XML artifacts:**
  - Leave as-is, just catalog
- **For binary artifacts:**
  - Catalog only, no parsing attempted
  - Track: `{detectedType: "binary", skipped: true}`
- Save detection results: `<output>/catalog.json`:
  ```typescript
  [{
    artifactName: string,
    runId: string,
    detectedType: "playwright-json" | "jest-json" | "pytest-json" | "junit-xml" | "playwright-html" | "eslint-txt" | "binary" | "unknown",
    originalFormat: "json" | "xml" | "html" | "txt" | "binary",
    filePath: string,           // Path to original or converted file
    converted?: boolean,        // True if we extracted JSON from HTML
    skipped?: boolean           // True for binary artifacts
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
    status: "complete" | "partial" | "incomplete",  // incomplete if in_progress runs exist
    inProgressRuns: number,  // Count of runs still in progress
    runs: [{
      runId: string,
      conclusion: "failure" | "success" | "cancelled" | "in_progress",
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
- Exit codes:
  - 0: All runs complete, all downloads succeeded
  - 1: Partial success (some downloads failed but no in_progress runs)
  - 2: Incomplete (in_progress runs detected)

### Phase 7: Error handling & polish
- Network failure retry logic with configurable `--max-retries` and `--retry-delay`
- Timeout handling for large artifacts
- Validate downloaded files exist and are non-empty
- Progress indicators: "Run 2/5: Downloading 3 artifacts..."
- Debug mode: `--debug` for verbose logging
- Dry run: `--dry-run` to show what would be downloaded
- Resume mode: `--resume` to skip successful downloads and retry failed ones based on existing `summary.json`

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
