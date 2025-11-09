# Quick Start Examples

## Basic Usage

### Download and Analyze PR Artifacts

```bash
# 1. Download artifacts from PR #123 in current repo
npx gh-ci-artifacts 123

# 2. View results
open .gh-ci-artifacts/pr-123/index.html
```

## Common Scenarios

### Analyze Failed CI Run

```bash
# Download artifacts and focus on failures
npx gh-ci-artifacts 456 --repo owner/repo
```

The HTML viewer shows:
- **Summary** - Overview of failures
- **Catalog** - Detected artifact types
- **Files** - Raw artifact files and logs

### Resume Interrupted Download

```bash
# Resume from last failure point
npx gh-ci-artifacts 123 --resume
```

### Include Successful Runs

By default, only failures are downloaded. To include everything:

```bash
npx gh-ci-artifacts 123 --include-successes
```

### Dry Run (Preview Without Download)

```bash
# See what would be downloaded without downloading
npx gh-ci-artifacts 123 --dry-run
```

### Enable Debug Output

```bash
# See detailed logging for troubleshooting
npx gh-ci-artifacts 123 --debug
```

### Open in Browser Automatically

```bash
# Automatically opens results when done
npx gh-ci-artifacts 123 --open
```

### Custom Output Directory

```bash
# Save results to custom location
npx gh-ci-artifacts 123 --output-dir ./ci-results
```

## Branch Artifacts

### Download from Branch

```bash
# Downloads artifacts from latest commit on 'main' branch
npx gh-ci-artifacts main

# Specify remote
npx gh-ci-artifacts develop --remote upstream
```

Creates directory: `.gh-ci-artifacts/branch-origin-main/`

## Advanced Usage

### Combine Options

```bash
# Resume download, debug output, custom output directory
npx gh-ci-artifacts 123 \
  --resume \
  --debug \
  --output-dir ./analysis \
  --include-successes
```

### Wait for In-Progress Workflows

```bash
# Poll every 30 minutes, wait up to 6 hours
npx gh-ci-artifacts 123 --wait

# Custom polling interval (300 seconds) and timeout (1 hour)
npx gh-ci-artifacts 123 --wait --poll-interval 300 --max-wait-time 3600
```

## Configuration File

For projects with consistent settings, create `.gh-ci-artifacts.json`:

```json
{
  "outputDir": "./ci-data",
  "defaultRepo": "owner/repo",
  "maxRetries": 5,
  "include-successes": false
}
```

Then use simplified commands:

```bash
npx gh-ci-artifacts 123
```

See [Configuration Guide](guide/configuration.md) for full options.

## Understanding Results

The generated `index.html` includes:

1. **Header** - PR/Branch info and GitHub links
2. **Summary** - Run status and statistics
3. **Catalog** - Artifact types detected (Playwright, pytest, ESLint, etc.)
4. **Files** - Raw artifacts and extracted logs
5. **Converted Artifacts** - HTML reports converted to JSON

## Troubleshooting

### "gh CLI not authenticated"

```bash
gh auth login
```

### "No artifacts found"

- Artifacts expire after 90 days
- Check workflow status on GitHub
- Verify you have access to the repository

### "Artifact download failed"

Use `--resume` to retry failed downloads:

```bash
npx gh-ci-artifacts 123 --resume
```

## Next Steps

- [CLI Reference](cli/overview.md) - Complete option list
- [Configuration](guide/configuration.md) - Advanced setup
- [API Integration](api/) - Use as a library
