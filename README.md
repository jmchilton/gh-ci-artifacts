# gh-ci-artifacts

[![npm version](https://img.shields.io/npm/v/gh-ci-artifacts.svg?style=flat-square)](https://www.npmjs.com/package/gh-ci-artifacts)
[![CI Status](https://img.shields.io/github/actions/workflow/status/jmchilton/gh-ci-artifacts/ci.yml?branch=main&style=flat-square)](https://github.com/jmchilton/gh-ci-artifacts/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node 20+](https://img.shields.io/badge/Node-20%2B-brightgreen.svg?style=flat-square)](https://nodejs.org/)

Download and parse GitHub Actions CI artifacts and logs for LLM analysis.

📖 **[Full Documentation →](https://jmchilton.github.io/gh-ci-artifacts/#/)**

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

# Download artifacts for a branch
npx gh-ci-artifacts main

# Specify a different repository
npx gh-ci-artifacts 123 --repo owner/repo

# Resume interrupted download
npx gh-ci-artifacts 123 --resume

# Include successful runs (default: only failures/cancelled)
npx gh-ci-artifacts 123 --include-successes

# Wait for in-progress workflows to complete
npx gh-ci-artifacts 123 --wait

# Open HTML viewer in browser when complete
npx gh-ci-artifacts 123 --open
```

After downloading, open `.gh-ci-artifacts/<ref>/index.html` in your browser for an interactive file tree viewer (where `<ref>` is `pr-<number>` for PRs or `branch-<remote>-<name>` for branches).

**Default Behavior:**

- Only failed and cancelled runs are downloaded. Use `--include-successes` to download all runs.
- Only the latest retry attempt for each workflow is processed.

## Configuration

Create `.gh-ci-artifacts.json` in your project directory:

```json
{
  "outputDir": "./ci-artifacts",
  "maxRetries": 5,
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
    }
  ]
}
```

See the [Configuration Guide](https://jmchilton.github.io/gh-ci-artifacts/#/guide/configuration) for all available options.

## Output Structure

```
.gh-ci-artifacts/
└── pr-<number>/              # or branch-<remote>-<name>/
    ├── index.html            # Interactive HTML viewer
    ├── summary.json          # Master summary with all metadata
    ├── catalog.json          # Artifact catalog with type detection
    ├── artifacts.json        # Download inventory
    ├── raw/                  # Original downloaded artifacts
    ├── converted/            # Normalized artifacts (HTML/NDJSON/TXT → JSON)
    └── logs/                 # Extracted job logs (if applicable)
```

See the [Output Format Guide](https://jmchilton.github.io/gh-ci-artifacts/#/guide/output-format) for detailed schema documentation.

## Supported Artifact Types

Supports 20+ artifact types including:

- **Test Frameworks:** Playwright, Jest, pytest, JUnit, Vitest, and more
- **Linters & Formatters:** ESLint, Prettier, Ruff, flake8, mypy, TypeScript (`tsc`), and more
- **Coverage Reports:** Coverage.py, JaCoCo, Nyc, and more

For a complete list, see the [artifact-detective documentation](https://jmchilton.github.io/artifact-detective/#/artifact-types/).

## Documentation

- **[Getting Started](https://jmchilton.github.io/gh-ci-artifacts/#/getting-started)** - Installation and setup
- **[CLI Reference](https://jmchilton.github.io/gh-ci-artifacts/#/cli/overview)** - All command-line options
- **[Configuration Guide](https://jmchilton.github.io/gh-ci-artifacts/#/guide/configuration)** - Configuration options and examples
- **[Output Format](https://jmchilton.github.io/gh-ci-artifacts/#/guide/output-format)** - Understanding the results
- **[Features](https://jmchilton.github.io/gh-ci-artifacts/#/features/artifact-detection)** - Artifact detection, normalization, log extraction
- **[API Reference](https://jmchilton.github.io/gh-ci-artifacts/#/api/)** - Use as a library
- **[Architecture](https://jmchilton.github.io/gh-ci-artifacts/#/architecture/)** - How it works internally

## Exit Codes

- `0` - Complete success (all artifacts downloaded)
- `1` - Partial success (some artifacts failed)
- `2` - Incomplete (workflows still in progress)

See [Exit Codes Guide](https://jmchilton.github.io/gh-ci-artifacts/#/guide/exit-codes) for details.

## Use Cases

### Claude Integration

After downloading artifacts, analyze failures with Claude using the structured JSON output. See the [Claude Integration Guide](https://jmchilton.github.io/gh-ci-artifacts/#/guide/claude-integration) for detailed examples and best practices.

### Programmatic Usage

```typescript
import { execSync } from "child_process";
import { readFileSync } from "fs";

// Download artifacts
execSync("npx gh-ci-artifacts 123", { stdio: "inherit" });

// Load summary for analysis
const summary = JSON.parse(
  readFileSync(".gh-ci-artifacts/pr-123/summary.json", "utf-8")
);
```

See the [API Reference](https://jmchilton.github.io/gh-ci-artifacts/#/api/) for library usage.

## Limitations

- Artifacts expire after 90 days (GitHub limitation)
- Serial downloads to respect GitHub rate limits
- Branch mode only queries `push` event workflows
- Requires GitHub CLI (`gh`) to be authenticated

## Contributing

Contributions welcome! Areas for improvement:

- **Artifact type support** - Contribute to [artifact-detective](https://github.com/jmchilton/artifact-detective) for artifact detection improvements
- **Performance optimizations** - Improve download speed or processing efficiency
- **Documentation** - Help improve docs and examples

See the [Contributing Guide](https://jmchilton.github.io/gh-ci-artifacts/#/development/contributing) for details.

## License

MIT
