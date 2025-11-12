# CLI Module API

The CLI module (`src/cli.ts`) is the command-line interface for `gh-ci-artifacts`. While it's not exported as a library API, this document describes its structure and behavior for reference.

## Command Structure

```bash
gh-ci-artifacts <ref> [options]
```

## Arguments

### `<ref>` (required)

Pull request number or branch name.

- **PR Mode:** If `ref` is all digits (e.g., `123`), treated as PR number
- **Branch Mode:** Otherwise, treated as branch name

**Examples:**
```bash
gh-ci-artifacts 123              # PR #123
gh-ci-artifacts main             # Branch "main"
gh-ci-artifacts feature/test     # Branch "feature/test"
```

## Options

### Repository Options

#### `-r, --repo <owner/repo>`

Repository in `owner/repo` format.

- **Default:** Current repository (detected from git)
- **Example:** `--repo jmchilton/gh-ci-artifacts`

#### `--remote <name>`

Git remote name for branch mode.

- **Default:** `origin`
- **Only used in branch mode**
- **Example:** `--remote upstream`

### Output Options

#### `-o, --output-dir <dir>`

Output directory for artifacts.

- **Default:** `.gh-ci-artifacts` in current directory
- **Example:** `--output-dir ./ci-data`

#### `--open`

Open the generated HTML viewer in default browser after completion.

- **Default:** `false`
- **Example:** `--open`

### Retry Options

#### `--max-retries <count>`

Maximum retry attempts for failed downloads.

- **Default:** `3` (or from config file)
- **Type:** Integer
- **Example:** `--max-retries 5`

#### `--retry-delay <seconds>`

Retry delay in seconds between attempts.

- **Default:** `5` (or from config file)
- **Type:** Integer
- **Example:** `--retry-delay 10`

### Workflow Options

#### `--include-successes`

Include artifacts from successful runs.

- **Default:** `false` (only failed/cancelled runs)
- **Example:** `--include-successes`

#### `--wait`

Wait for in-progress workflows to complete, polling periodically.

- **Default:** `false`
- **Example:** `--wait`

#### `--poll-interval <seconds>`

Seconds between polls when waiting for workflows.

- **Default:** `1800` (30 minutes, or from config file)
- **Type:** Integer
- **Example:** `--poll-interval 600`

#### `--max-wait-time <seconds>`

Maximum seconds to wait for workflow completion.

- **Default:** `21600` (6 hours, or from config file)
- **Type:** Integer
- **Example:** `--max-wait-time 7200`

### Mode Options

#### `--resume`

Resume incomplete/failed downloads.

- **Default:** `false` (existing artifacts are backed up)
- **Behavior:**
  - Without `--resume`: Existing artifacts backed up with timestamp
  - With `--resume`: Uses existing artifacts, retries only failures
- **Example:** `--resume`

#### `--dry-run`

Show what would be downloaded without downloading.

- **Default:** `false`
- **Example:** `--dry-run`

### Debug Options

#### `--debug`

Enable debug logging.

- **Default:** `false`
- **Example:** `--debug`

## Command Examples

### Basic Usage

```bash
# Download artifacts for PR #123
gh-ci-artifacts 123

# Download artifacts for branch "main"
gh-ci-artifacts main

# Specify repository
gh-ci-artifacts 123 --repo owner/repo
```

### With Options

```bash
# Custom output directory
gh-ci-artifacts 123 --output-dir ./ci-artifacts

# Include successful runs
gh-ci-artifacts 123 --include-successes

# Resume interrupted download
gh-ci-artifacts 123 --resume

# Wait for in-progress workflows
gh-ci-artifacts 123 --wait

# Custom retry settings
gh-ci-artifacts 123 --max-retries 5 --retry-delay 10

# Debug mode
gh-ci-artifacts 123 --debug

# Dry run
gh-ci-artifacts 123 --dry-run
```

### Complex Examples

```bash
# Download from different remote, wait for completion, open browser
gh-ci-artifacts feature/test --remote upstream --wait --open

# Resume with custom retry settings
gh-ci-artifacts 123 --resume --max-retries 10 --retry-delay 5

# Full example with all options
gh-ci-artifacts 123 \
  --repo owner/repo \
  --output-dir ./artifacts \
  --include-successes \
  --wait \
  --poll-interval 600 \
  --max-wait-time 7200 \
  --max-retries 5 \
  --retry-delay 10 \
  --open \
  --debug
```

## Configuration File Integration

CLI options override configuration file values. The CLI:

1. Loads config from `.gh-ci-artifacts.json` (or `.yml`/`.yaml`)
2. Merges CLI options with file config (CLI takes precedence)
3. Uses defaults for unspecified values

**Example:**
```json
// .gh-ci-artifacts.json
{
  "maxRetries": 3,
  "retryDelay": 5,
  "outputDir": "./ci-artifacts"
}
```

```bash
# Uses config file values
gh-ci-artifacts 123

# Overrides maxRetries from config
gh-ci-artifacts 123 --max-retries 10

# Overrides outputDir from config
gh-ci-artifacts 123 --output-dir ./custom-output
```

## Exit Codes

The CLI exits with different codes based on result:

- **0** - Complete success (all artifacts downloaded, all validations passed)
- **1** - Partial success (some artifacts failed, or optional validations failed)
- **2** - Incomplete (critical failures, or required validations failed)

**Example:**
```bash
gh-ci-artifacts 123
echo $?  # 0 = success, 1 = partial, 2 = incomplete
```

## Output Structure

After running, the CLI generates:

```
.gh-ci-artifacts/
└── pr-123/              # or branch-{remote}-{name}/
    ├── index.html       # Interactive HTML viewer
    ├── summary.json    # Master summary
    ├── catalog.json    # Artifact catalog
    ├── artifacts.json   # Download inventory
    ├── raw/            # Original artifacts
    ├── converted/      # Normalized JSON artifacts
    └── logs/           # Extracted logs (if applicable)
```

## Error Handling

The CLI handles errors gracefully:

- **GitHub CLI not installed:** Error message with installation instructions
- **Not authenticated:** Error message with authentication instructions
- **Config file errors:** Error message with file path and parse error
- **Download failures:** Continues with other artifacts, reports failures in summary
- **Network errors:** Retries with exponential backoff

## Integration with Other Tools

The CLI can be integrated into scripts and CI/CD pipelines:

```bash
#!/bin/bash
# Download artifacts and check exit code
if gh-ci-artifacts 123; then
  echo "Success"
else
  exit_code=$?
  if [ $exit_code -eq 1 ]; then
    echo "Partial success"
  else
    echo "Failed"
    exit $exit_code
  fi
fi
```

```yaml
# GitHub Actions example
- name: Download artifacts
  run: |
    npx gh-ci-artifacts ${{ github.event.pull_request.number }} \
      --repo ${{ github.repository }} \
      --output-dir ./artifacts
```

## See Also

- [CLI Usage Guide](../cli/overview.md) - User-facing CLI documentation
- [Configuration Guide](../guide/configuration.md) - Configuration file format
- [Core Functions API](core.md) - Programmatic API functions
