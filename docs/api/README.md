# API Reference

`gh-ci-artifacts` exports a library API for integration into other tools and scripts.

## Installation

```bash
npm install gh-ci-artifacts
```

## Basic Usage

### As CLI Tool

```bash
npx gh-ci-artifacts 123 --repo owner/repo
```

### As Library

```typescript
import { downloadArtifacts, generateSummary } from 'gh-ci-artifacts';

const artifacts = await downloadArtifacts({
  pr: 123,
  repo: 'owner/repo',
  outputDir: './ci-artifacts'
});

const summary = await generateSummary({
  pr: 123,
  repo: 'owner/repo',
  artifacts
});
```

## Core Modules

### CLI Module (`src/cli.ts`)

Main entry point for command-line usage.

**Export:** `default` - Commander.js program

### Types (`src/types.ts`)

TypeScript type definitions for all data structures.

**Key Types:**
- `Summary` - Main analysis result
- `CatalogEntry` - Detected artifact information
- `ArtifactInventoryItem` - Downloaded artifact metadata
- `Config` - Configuration options

### Config Module (`src/config.ts`)

Configuration file loading and merging.

```typescript
import { loadConfig, mergeConfig } from 'gh-ci-artifacts/dist/config';

const userConfig = await loadConfig('.gh-ci-artifacts.json');
const merged = mergeConfig(userConfig, cliOverrides);
```

### Downloader (`src/downloader.ts`)

Download artifacts from GitHub Actions.

```typescript
import { downloadArtifacts } from 'gh-ci-artifacts/dist/downloader';

const result = await downloadArtifacts({
  pr: 123,
  repo: 'owner/repo',
  outputDir: './.gh-ci-artifacts/pr-123',
  resume: false,
  dryRun: false
});
```

### Log Extractor (`src/log-extractor.ts`)

Extract logs from failed workflow runs.

```typescript
import { extractLogsForRuns } from 'gh-ci-artifacts/dist/log-extractor';

const logs = await extractLogsForRuns({
  repo: 'owner/repo',
  runs: [/* run objects */],
  outputDir: './logs'
});
```

### Cataloger (`src/cataloger.ts`)

Detect artifact types and convert HTML to JSON.

```typescript
import { catalogArtifacts } from 'gh-ci-artifacts/dist/cataloger';

const catalog = await catalogArtifacts({
  outputDir: './.gh-ci-artifacts/pr-123',
  repo: 'owner/repo'
});
```

### Summary Generator (`src/summary-generator.ts`)

Generate comprehensive analysis summary.

```typescript
import { generateSummary } from 'gh-ci-artifacts/dist/summary-generator';

const summary = await generateSummary({
  pr: 123,
  repo: 'owner/repo',
  outputDir: './.gh-ci-artifacts/pr-123'
});
```

## Utility Modules

### GitHub API (`src/github/api.ts`)

Wrapper around `gh` CLI for GitHub API calls.

```typescript
import {
  getPRInfo,
  getWorkflowRuns,
  getBranchHeadSha
} from 'gh-ci-artifacts/dist/github/api';

// Get PR information
const pr = await getPRInfo('owner/repo', 123);

// Get workflow runs
const runs = await getWorkflowRuns('owner/repo', 123);

// Get branch HEAD SHA
const sha = await getBranchHeadSha('owner/repo', 'main');
```

### Logger (`src/utils/logger.ts`)

Progress and status logging.

```typescript
import { createLogger } from 'gh-ci-artifacts/dist/utils/logger';

const logger = createLogger({ debug: true });
logger.info('Download started');
logger.warn('Artifact expired');
logger.error('Failed to process');
```

### Retry Logic (`src/utils/retry.ts`)

Exponential backoff retry utility.

```typescript
import { retryWithBackoff } from 'gh-ci-artifacts/dist/utils/retry';

const result = await retryWithBackoff(
  async () => fetchArtifact(),
  { maxRetries: 3, initialDelay: 1000 }
);
```

## Type Definitions

### Summary

```typescript
interface Summary {
  mode: 'pr' | 'branch';
  pr?: number;
  prBranch?: string;
  branch?: string;
  repo: string;
  headSha: string;
  analyzedAt: string;
  status: 'complete' | 'partial' | 'incomplete';
  inProgressRuns: number;
  runs: RunResult[];
  catalogFile: string;
  stats: {
    totalRuns: number;
    artifactsDownloaded: number;
    artifactsFailed: number;
    logsExtracted: number;
    htmlConverted: number;
    artifactsValidated: number;
    artifactsInvalid: number;
    linterOutputsExtracted: number;
  };
}
```

### CatalogEntry

```typescript
interface CatalogEntry {
  name: string;
  runId: string;
  type: string;
  format: string;
  description?: string;
  status: 'valid' | 'skipped' | 'invalid';
  detectedType?: string;
  converted?: boolean;
  parsed?: boolean;
  path: string;
}
```

### Config

```typescript
interface Config {
  outputDir?: string;
  defaultRepo?: string;
  maxRetries?: number;
  retryDelay?: number;
  pollInterval?: number;
  maxWaitTime?: number;
  skipArtifacts?: SkipPattern[];
  workflows?: WorkflowConfig[];
}
```

## Examples

### Download PR and Generate Report

```typescript
import {
  downloadArtifacts,
  catalogArtifacts,
  generateSummary
} from 'gh-ci-artifacts';

const pr = 123;
const repo = 'owner/repo';
const outputDir = `./.gh-ci-artifacts/pr-${pr}`;

// 1. Download artifacts
const downloadResult = await downloadArtifacts({
  pr,
  repo,
  outputDir
});

// 2. Catalog and convert HTML
const catalog = await catalogArtifacts({
  outputDir,
  repo
});

// 3. Generate summary
const summary = await generateSummary({
  pr,
  repo,
  outputDir,
  prBranch: downloadResult.prBranch
});

console.log(summary);
```

### Analyze Branch with Custom Config

```typescript
import { downloadArtifacts } from 'gh-ci-artifacts';
import { loadConfig } from 'gh-ci-artifacts/dist/config';

const config = await loadConfig('.gh-ci-artifacts.json');

const result = await downloadArtifacts({
  branch: 'develop',
  remote: 'origin',
  repo: 'owner/repo',
  outputDir: config.outputDir,
  resume: true,
  dryRun: false
});
```

## Published Exports

```typescript
// Main functions
export { downloadArtifacts } from './downloader';
export { generateSummary } from './summary-generator';
export { generateHtmlViewer } from './html-viewer';

// Core modules
export { loadConfig, mergeConfig } from './config';
export * from './types';

// For advanced use
export * as github from './github/api';
export * as utils from './utils';
```

See [Types](api/types.md) for complete type definitions.
