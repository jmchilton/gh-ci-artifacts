# Architecture Overview

gh-ci-artifacts is a TypeScript CLI tool that orchestrates the download, processing, and analysis of GitHub Actions CI artifacts and logs. The architecture follows a pipeline pattern, processing artifacts through distinct stages from download to final summary generation.

## System Purpose

The tool transforms raw GitHub Actions CI outputs into structured, LLM-optimized JSON summaries by:

1. **Downloading** artifacts and logs from GitHub Actions
2. **Detecting** artifact types automatically
3. **Normalizing** formats (HTML/NDJSON/TXT → JSON)
4. **Extracting** structured data from logs
5. **Cataloging** and validating artifacts
6. **Generating** comprehensive summaries and HTML viewers

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Layer                             │
│  (cli.ts, config.ts, config-lint.ts)                        │
│  - Command parsing and validation                            │
│  - Configuration loading and merging                         │
│  - Orchestration of pipeline stages                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Download Stage                            │
│  (downloader.ts, github/api.ts)                             │
│  - Workflow run discovery                                    │
│  - Artifact download with retry logic                        │
│  - Rate limit handling                                       │
│  - Resume mode support                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Log Extraction Stage                      │
│  (log-extractor.ts)                                          │
│  - Job log download for runs without artifacts               │
│  - Log file organization                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Artifact Extraction Stage                      │
│  (linter-collector.ts)                                       │
│  - Parse logs for structured artifacts                       │
│  - Extract test results, linter output, etc.                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Cataloging Stage                            │
│  (cataloger.ts, workflow-matcher.ts)                        │
│  - Type detection (artifact-detective)                       │
│  - Normalization to JSON                                     │
│  - Custom type mapping                                       │
│  - Validation                                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Summary Generation                          │
│  (summary-generator.ts, html-viewer/)                        │
│  - Generate summary.json                                    │
│  - Generate catalog.json                                     │
│  - Generate HTML viewer                                      │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. CLI Layer (`cli.ts`, `config.ts`)

**Responsibilities:**
- Parse command-line arguments
- Load and merge configuration files
- Orchestrate the processing pipeline
- Handle errors and exit codes

**Key Functions:**
- `loadConfig()` - Load configuration from files
- `mergeConfig()` - Merge file config with CLI overrides
- `getOutputDir()` - Determine output directory structure

### 2. Download Module (`downloader.ts`)

**Responsibilities:**
- Discover workflow runs for PRs/branches
- Download artifacts serially (to avoid rate limits)
- Handle retries with exponential backoff
- Support resume mode for interrupted downloads
- Track download status in inventory

**Key Features:**
- Serial downloads (one at a time)
- Retry logic with configurable delays
- Rate limit detection and handling
- Expired artifact detection
- Polling support for in-progress workflows

### 3. Log Extraction (`log-extractor.ts`)

**Responsibilities:**
- Download raw job logs from GitHub Actions API
- Organize logs by run ID and job name
- Handle log extraction failures gracefully

**Output:**
- `raw/{runId}/{jobName}.log` files
- `JobLog[]` objects with extraction status

### 4. Artifact Collection (`linter-collector.ts`)

**Responsibilities:**
- Parse log files for structured artifacts
- Extract test results, linter output, etc.
- Normalize extracted content to JSON
- Save extracted artifacts to filesystem

**Uses:** artifact-detective's `extract()` function for pattern matching

### 5. Cataloging (`cataloger.ts`)

**Responsibilities:**
- Detect artifact types using artifact-detective
- Normalize formats (HTML/NDJSON/TXT → JSON)
- Apply custom type mappings
- Validate artifact content
- Generate catalog entries

**Key Features:**
- Automatic type detection
- Format normalization
- Custom type mapping for unknown artifacts
- Content validation

### 6. Workflow Matching (`workflow-matcher.ts`)

**Responsibilities:**
- Match workflow runs to configuration
- Apply workflow-specific settings
- Evaluate skip patterns
- Validate artifact expectations

**Key Functions:**
- `getWorkflowName()` - Extract workflow name from path
- `findWorkflowConfig()` - Match run to config
- `shouldSkipArtifact()` - Check skip patterns
- `validateExpectations()` - Check expected artifacts

### 7. Summary Generation (`summary-generator.ts`)

**Responsibilities:**
- Aggregate all data into master summary
- Calculate statistics
- Determine overall status
- Generate JSON output files

**Output Files:**
- `summary.json` - Master summary with all metadata
- `catalog.json` - Artifact catalog with type info
- `artifacts.json` - Download inventory

### 8. HTML Viewer (`html-viewer/`)

**Responsibilities:**
- Generate self-contained HTML viewer
- Build interactive file tree
- Embed small file previews
- Provide navigation and search

**Components:**
- `index.ts` - Main generator
- `components.ts` - UI components
- `renderers/` - Data renderers (summary, catalog, artifacts)
- `styles.ts` - Embedded CSS
- `scripts.ts` - Embedded JavaScript

### 9. GitHub API Wrapper (`github/api.ts`)

**Responsibilities:**
- Wrap GitHub CLI (`gh`) commands
- Provide type-safe API access
- Handle API responses
- Abstract GitHub API details

**Key Functions:**
- `getPRInfo()` - Get PR information
- `getWorkflowRunsForBranch()` - Find workflow runs
- `getArtifactsForRun()` - List artifacts
- `downloadArtifact()` - Download artifact
- `getJobLogs()` - Download job logs

### 10. Utilities

**`utils/gh.ts`** - GitHub CLI validation and helpers
**`utils/logger.ts`** - Progress logging with levels
**`utils/retry.ts`** - Retry logic with exponential backoff

## Data Flow

### Stage 1: Discovery
```
PR/Branch → GitHub API → Workflow Runs → Artifacts List
```

### Stage 2: Download
```
Artifacts List → Serial Download → raw/{runId}/artifact-{id}/
                                    ↓
                              artifacts.json (inventory)
```

### Stage 3: Log Extraction (if needed)
```
Runs without artifacts → GitHub API → raw/{runId}/{jobName}.log
```

### Stage 4: Artifact Extraction
```
Log files → Pattern Matching → artifacts/{runId}/{type}.{ext}
```

### Stage 5: Cataloging
```
raw/ artifacts → Type Detection → Normalization → converted/{runId}/
                                    ↓
                              catalog.json
```

### Stage 6: Summary
```
All data → Aggregation → summary.json + index.html
```

## Key Architectural Decisions

### 1. Serial Downloads
- **Decision:** Download artifacts one at a time
- **Rationale:** Avoid GitHub API rate limits
- **Trade-off:** Slower but more reliable

### 2. Resume Mode
- **Decision:** Track download status in `artifacts.json`
- **Rationale:** Allow resuming interrupted downloads
- **Trade-off:** Requires maintaining inventory state

### 3. External Detection Library
- **Decision:** Use artifact-detective for type detection
- **Rationale:** Leverage existing, tested detection logic
- **Trade-off:** Dependency but better detection

### 4. Self-Contained HTML Viewer
- **Decision:** Embed CSS/JS inline, no external dependencies
- **Rationale:** Works offline, easy to share
- **Trade-off:** Larger HTML file size

### 5. Configuration Merging
- **Decision:** Merge file config with CLI overrides
- **Rationale:** Flexible configuration with sensible defaults
- **Trade-off:** More complex config loading logic

### 6. Failure-Focused by Default
- **Decision:** Only download failed/cancelled runs
- **Rationale:** Focus on problems, reduce download time
- **Trade-off:** Requires `--include-successes` for full data

## Dependencies

### Runtime Dependencies
- **artifact-detective** - Artifact type detection and validation
- **commander** - CLI argument parsing
- **yaml** - YAML config file parsing
- **@types/node** - TypeScript types for Node.js

### Development Dependencies
- **TypeScript** - Type-safe JavaScript
- **Vitest** - Testing framework
- **tsx** - TypeScript execution for dev scripts

### External Tools
- **GitHub CLI (`gh`)** - Required for GitHub API access
- **Node.js 20+** - Runtime environment

## Module Organization

```
src/
├── cli.ts                    # Main CLI entry point
├── config.ts                 # Configuration loading
├── config-schema.ts          # Zod schema for validation
├── config-lint.ts            # Config validation CLI
├── types.ts                  # TypeScript type definitions
├── downloader.ts             # Artifact download orchestration
├── log-extractor.ts          # Job log extraction
├── linter-collector.ts       # Artifact extraction from logs
├── cataloger.ts              # Artifact cataloging and normalization
├── workflow-matcher.ts       # Workflow configuration matching
├── summary-generator.ts      # Summary generation
├── github/
│   └── api.ts                # GitHub API wrapper
├── html-viewer/              # HTML viewer generation
│   ├── index.ts
│   ├── components.ts
│   ├── styles.ts
│   ├── scripts.ts
│   └── renderers/
└── utils/
    ├── gh.ts                 # GitHub CLI helpers
    ├── logger.ts             # Logging utilities
    └── retry.ts              # Retry logic
```

## Processing Pipeline

The tool follows a strict sequential pipeline:

1. **Configuration** - Load and merge configs
2. **Discovery** - Find workflow runs
3. **Download** - Download artifacts (with retries)
4. **Log Extraction** - Download logs for runs without artifacts
5. **Artifact Extraction** - Parse logs for structured artifacts
6. **Cataloging** - Detect types and normalize formats
7. **Summary** - Generate summary and HTML viewer

Each stage depends on the previous stage's output, ensuring data consistency.

## Error Handling Strategy

- **Retry Logic** - Exponential backoff for transient failures
- **Graceful Degradation** - Continue processing on individual failures
- **Status Tracking** - Track success/failure/expired for each artifact
- **Resume Support** - Can retry failed downloads without re-downloading successful ones

## Output Structure

All output is organized in a predictable directory structure:

```
.gh-ci-artifacts/
└── pr-{number}/              # or branch-{remote}-{name}/
    ├── index.html            # Interactive viewer
    ├── summary.json          # Master summary
    ├── catalog.json          # Artifact catalog
    ├── artifacts.json        # Download inventory
    ├── raw/                  # Original artifacts
    ├── converted/            # Normalized JSON
    └── artifacts/            # Extracted from logs
```

This structure enables:
- Easy navigation
- Programmatic access
- Resume mode
- Sharing results
