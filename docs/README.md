# gh-ci-artifacts Documentation

**Download and parse GitHub Actions CI artifacts and logs for LLM analysis.**

`gh-ci-artifacts` automates the collection and normalization of GitHub Actions CI failures into structured JSON optimized for LLM analysis. It handles artifact downloads, log extraction, and parsing of 20+ test/linter output formats.

## Quick Links

- [Installation & Quick Start](getting-started.md) - Get up and running in 5 minutes
- [CLI Reference](cli/overview.md) - All command-line options
- [Configuration Guide](guide/configuration.md) - Customize behavior
- [API Reference](api/) - Use as a library
- [Output Format](guide/output-format.md) - Understand the results

## Key Features

✨ **Zero-Config** - Works out of the box, optional `.gh-ci-artifacts.json`

🔍 **Automatic Detection** - Recognizes 20+ artifact types (Playwright, pytest, ESLint, etc.)

📥 **Smart Downloads** - Serial downloads respect GitHub rate limits, resume on failure

🎯 **Failure-Focused** - Downloads failed runs by default, filter as needed

🔄 **Log Extraction** - Captures CI logs when artifacts aren't available

📊 **HTML Conversion** - Converts test reports to JSON for analysis

🌐 **Interactive Viewer** - Browse results in generated HTML UI

## What It Does

1. **Downloads** artifacts from GitHub Actions runs (PRs or branches)
2. **Extracts** logs from failed workflows
3. **Detects** artifact types (powered by [artifact-detective](https://github.com/jmchilton/artifact-detective))
4. **Converts** HTML reports to JSON
5. **Analyzes** linter outputs from logs
6. **Generates** comprehensive summary optimized for LLM analysis

## Example Workflow

```bash
# 1. Download artifacts from PR #123
npx gh-ci-artifacts 123

# 2. View results in browser
open .gh-ci-artifacts/pr-123/index.html

# 3. Analyze JSON programmatically
cat .gh-ci-artifacts/pr-123/summary.json | jq
```

## Supported Artifact Types

### Test Frameworks
- Playwright (HTML reports)
- Jest (JSON reports)
- pytest (HTML/JSON coverage)
- Vitest (JSON reports)
- JUnit XML
- TestNG XML

### Linters & Formatters
- ESLint
- Ruff (Python)
- Mypy
- Flake8
- Rustfmt
- Prettier

### Coverage Reports
- Coverage.py (HTML)
- JaCoCo (HTML)
- Nyc (HTML)

[See full list](api/README.md#supported-artifact-types)

## Installation

```bash
# No installation needed
npx gh-ci-artifacts 123

# Or install globally
npm install -g gh-ci-artifacts
```

## Requirements

- Node.js 20+
- GitHub CLI (`gh`) installed and authenticated

## Documentation Structure

```
docs/
├── getting-started.md           # Installation & quick start
├── quick-start.md               # Common examples
├── cli/
│   └── overview.md              # CLI reference
├── guide/
│   ├── configuration.md         # Configuration options
│   ├── output-format.md         # Understanding results
│   └── exit-codes.md            # Exit codes
├── api/
│   ├── README.md                # API overview
│   └── typedoc/                 # Generated TypeScript docs
├── architecture/
│   ├── README.md                # Architecture overview
│   ├── detection.md             # Type detection
│   └── data-flow.md             # Data flow
└── development/
    ├── contributing.md          # Contributing guide
    ├── testing.md               # Test setup
    └── building.md              # Build process
```

## Development

```bash
# View docs locally
npm run docs:dev

# Generate API documentation
npm run docs:api

# Full build
npm run docs:build
```

## Links

- [GitHub Repository](https://github.com/jmchilton/gh-ci-artifacts)
- [npm Package](https://www.npmjs.com/package/gh-ci-artifacts)
- [artifact-detective](https://github.com/jmchilton/artifact-detective) - Artifact type detection engine
