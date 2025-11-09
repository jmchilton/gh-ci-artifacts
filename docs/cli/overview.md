# CLI Reference

`gh-ci-artifacts` provides a comprehensive command-line interface for downloading and analyzing GitHub Actions artifacts.

## General Syntax

```bash
gh-ci-artifacts <ref> [options]
```

### Arguments

- **`<ref>`** - Pull request number (numeric) or branch name (string)
  - `123` → Download artifacts for PR #123
  - `main` → Download artifacts for main branch
  - `feat/new-feature` → Download artifacts for branch

## Global Options

### Repository Selection

```bash
--repo <owner/repo>    Specify repository (defaults to current repo)
--remote <name>        Git remote for branches (default: origin)
```

### Download Control

```bash
--dry-run              Preview without downloading
--resume               Retry failed downloads (skip successes)
--include-successes    Include successful runs (default: failures only)
```

### Filtering & Limits

```bash
--max-retries <n>      Maximum retry attempts (default: 3)
--output-dir <path>    Output directory (default: .gh-ci-artifacts)
```

### Workflow Control

```bash
--wait                 Wait for in-progress workflows to complete
--poll-interval <sec>  Polling interval in seconds (default: 1800 = 30 min)
--max-wait-time <sec>  Maximum wait time in seconds (default: 21600 = 6 hours)
```

### Display Options

```bash
--debug                Enable debug logging
--open                 Open HTML viewer automatically when complete
```

## Examples

### Download PR Artifacts

```bash
# Download from current repo
gh-ci-artifacts 123

# From specific repo
gh-ci-artifacts 123 --repo owner/repo

# Preview without downloading
gh-ci-artifacts 123 --dry-run

# Resume from interruption
gh-ci-artifacts 123 --resume
```

### Download Branch Artifacts

```bash
# Download from main branch
gh-ci-artifacts main

# From specific remote
gh-ci-artifacts develop --remote upstream

# From different repo
gh-ci-artifacts main --repo owner/repo --remote origin
```

### Advanced Options

```bash
# Wait for in-progress workflows
gh-ci-artifacts 123 --wait

# Include all runs + auto-open
gh-ci-artifacts 123 --include-successes --open

# Custom output with debug
gh-ci-artifacts 123 --output-dir ./ci-analysis --debug

# Multiple options
gh-ci-artifacts 123 \
  --repo owner/repo \
  --output-dir ./results \
  --resume \
  --include-successes \
  --debug
```

## Exit Codes

| Code | Meaning | Example |
|------|---------|---------|
| 0    | Complete success | All artifacts downloaded, all runs analyzed |
| 1    | Partial success | Some artifacts missing/failed but analysis complete |
| 2    | Incomplete | Major download failures or analysis errors |

See [Exit Codes Guide](../guide/exit-codes.md) for details.

## Configuration File

For projects with consistent settings, create `.gh-ci-artifacts.json`:

```json
{
  "defaultRepo": "owner/repo",
  "outputDir": "./ci-artifacts",
  "maxRetries": 5,
  "retryDelay": 10,
  "workflows": [
    {
      "workflow": "test",
      "expectArtifacts": [
        { "pattern": "test-results", "required": true }
      ]
    }
  ]
}
```

Then use simplified commands:

```bash
gh-ci-artifacts 123
```

See [Configuration Guide](../guide/configuration.md) for all options.

## Environment Variables

```bash
# Set default repository
export GH_CI_ARTIFACTS_REPO=owner/repo

# Set output directory
export GH_CI_ARTIFACTS_OUTPUT=./ci-data

# Enable debug output
export DEBUG=gh-ci-artifacts:*
```

## Tips & Tricks

### Batch Download Multiple PRs

```bash
for pr in 100 101 102; do
  gh-ci-artifacts $pr --repo owner/repo
done
```

### Schedule Regular Downloads

```bash
# macOS/Linux cron
0 2 * * * cd /path/to/repo && gh-ci-artifacts main --output-dir ./ci-history/$(date +\%Y\%m\%d)
```

### Analyze in CI/CD

```bash
# GitHub Actions
- name: Download artifacts
  run: npx gh-ci-artifacts ${{ github.event.pull_request.number }} --repo ${{ github.repository }}

- name: Analyze
  run: cat .gh-ci-artifacts/pr-${{ github.event.pull_request.number }}/summary.json
```

## Common Issues

### "gh CLI not authenticated"

```bash
gh auth login
gh auth status
```

### "Repository not found"

```bash
# Verify repository access
gh repo view owner/repo

# Specify full repo path
gh-ci-artifacts 123 --repo owner/repo
```

### "No artifacts found"

- Artifacts expire after 90 days (GitHub limitation)
- Check that workflows actually generate artifacts
- Use `--include-successes` to include successful runs

### "Artifact download failed"

```bash
# Retry failed downloads
gh-ci-artifacts 123 --resume

# Try with longer timeout
gh-ci-artifacts 123 --resume --poll-interval 600
```

See [Troubleshooting Guide](../guide/troubleshooting.md) for more help.
