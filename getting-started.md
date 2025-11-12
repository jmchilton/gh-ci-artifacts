# Getting Started

## Installation

### Install Globally

Install globally for regular use:

```bash
npm install -g gh-ci-artifacts
gh-ci-artifacts 123
```

### Install as Project Dependency

For use in scripts or automation:

```bash
npm install gh-ci-artifacts
npx gh-ci-artifacts 123
```

### Using npx (No Installation Required)

You can also use `npx` without installing:

```bash
npx gh-ci-artifacts 123
```

This downloads and runs the latest version without any installation.

## Requirements

- **Node.js** 20 or higher
- **GitHub CLI (`gh`)** [installed and authenticated](https://cli.github.com)

### Verify Prerequisites

```bash
# Check Node.js version
node --version

# Check GitHub CLI is installed and authenticated
gh auth status
```

## Quick Start

### Download PR Artifacts

From the repository containing the PR:

```bash
npx gh-ci-artifacts 123
```

This creates a `.gh-ci-artifacts/pr-123/` directory with:
- `index.html` - Interactive file viewer (open in browser)
- `summary.json` - Analysis results
- `artifacts.json` - Download inventory
- `catalog.json` - Artifact type detection results

### Download Branch Artifacts

```bash
npx gh-ci-artifacts main
```

Creates `.gh-ci-artifacts/branch-origin-main/` directory.

### View Results

Open the generated HTML file in your browser:

```bash
# macOS
open .gh-ci-artifacts/pr-123/index.html

# Linux
xdg-open .gh-ci-artifacts/pr-123/index.html

# Windows
start .gh-ci-artifacts/pr-123/index.html
```

### Specify Repository

If not in the repository directory:

```bash
npx gh-ci-artifacts 123 --repo owner/repo
```

## Next Steps

- [CLI Usage Reference](cli/overview.md) - All command options
- [Configuration](guide/configuration.md) - Customize behavior
- [Output Format](guide/output-format.md) - Understand the results
