# Configuration

Configure `gh-ci-artifacts` with a `.gh-ci-artifacts.json` file (or `.gh-ci-artifacts.yml`) in your project root, or specify a custom config path via CLI.

## Basic Configuration

Create `.gh-ci-artifacts.json`:

```json
{
  "outputDir": "./.gh-ci-artifacts",
  "defaultRepo": "owner/repo",
  "maxRetries": 3,
  "retryDelay": 5
}
```

Then use simplified commands:

```bash
gh-ci-artifacts 123
```

## Specifying Custom Config File Path

Use the `--config` option to specify a config file at any location:

```bash
# Use a config file in a subdirectory
gh-ci-artifacts 123 --config ./config/ci-config.json

# Use absolute path
gh-ci-artifacts 123 --config /etc/gh-ci-artifacts/production.json

# Use parent directory config
gh-ci-artifacts 123 --config ../shared/ci-config.yml
```

The `--config` path can be:
- **Absolute**: `/path/to/config.json`
- **Relative to cwd**: `./config/file.json`, `../shared/file.json`

The CLI config file path always takes precedence over default `.gh-ci-artifacts.{json,yml,yaml}` files.

## Configuration Options

### Output Settings

```json
{
  "outputDir": "./custom-output",
  "defaultRepo": "owner/repo"
}
```

- **`outputDir`** - Where to save results (default: `./.gh-ci-artifacts`)
- **`defaultRepo`** - Default repository (format: `owner/repo`)

### Retry Strategy

```json
{
  "maxRetries": 5,
  "retryDelay": 10
}
```

- **`maxRetries`** - Maximum attempts per failed download (default: 3)
- **`retryDelay`** - Initial delay in seconds (default: 5)
  - Uses exponential backoff: delay × 2^attempt

### Workflow Polling

```json
{
  "pollInterval": 1800,
  "maxWaitTime": 21600
}
```

- **`pollInterval`** - Seconds between polls with `--wait` (default: 1800 = 30 min)
- **`maxWaitTime`** - Maximum wait time in seconds (default: 21600 = 6 hours)

## Skip Artifacts

Exclude artifacts by pattern:

```json
{
  "skipArtifacts": [
    {
      "pattern": ".*-screenshots$",
      "reason": "Screenshots too large for analysis"
    },
    {
      "pattern": ".*-videos$",
      "reason": "Video files not needed"
    }
  ]
}
```

Patterns are regex-matched against artifact names.

## Workflow-Specific Configuration

Configure behavior per workflow:

```json
{
  "workflows": [
    {
      "workflow": "test",
      "skipArtifacts": [
        {
          "pattern": ".*\\.log$",
          "reason": "Large log files"
        }
      ],
      "expectArtifacts": [
        {
          "pattern": "test-results",
          "required": true,
          "reason": "Tests must generate results"
        }
      ]
    },
    {
      "workflow": "deploy-preview",
      "skip": true
    }
  ]
}
```

### Workflow Configuration Options

- **`workflow`** - Workflow filename without extension (e.g., `test` for `.github/workflows/test.yml`)
- **`skip`** - Skip this workflow entirely (boolean)
- **`skipArtifacts`** - Skip specific artifacts in this workflow
- **`expectArtifacts`** - Expected artifacts (for validation)
- **`description`** - Documentation for this config

## Custom Artifact Types

Map unknown artifacts to known types:

```json
{
  "customArtifactTypes": [
    {
      "pattern": "internal-test-report\\.json$",
      "type": "jest-json",
      "reason": "Internal tool uses jest format"
    },
    {
      "pattern": "coverage-*.html$",
      "type": "playwright-html",
      "reason": "Custom coverage reports"
    }
  ]
}
```

Patterns are only matched for artifacts detected as "unknown".

## Log Extraction

Extract artifacts from job logs when not available as artifacts:

```json
{
  "extractArtifactTypesFromLogs": [
    {
      "type": "jest-json",
      "required": true,
      "reason": "Tests must appear in logs"
    },
    {
      "type": "eslint-json",
      "matchJobName": "lint",
      "required": false,
      "reason": "Lint output from specific jobs"
    }
  ]
}
```

Options:
- **`type`** - Artifact type to extract
- **`required`** - Error if not found (true = error, false = warning)
- **`matchJobName`** - Regex to filter which jobs to search
- **`reason`** - Documentation

## Full Example

```json
{
  "outputDir": "./ci-artifacts",
  "defaultRepo": "galaxyproject/galaxy",
  "maxRetries": 5,
  "retryDelay": 10,
  "pollInterval": 600,
  "maxWaitTime": 3600,

  "skipArtifacts": [
    {
      "pattern": ".*-videos$",
      "reason": "Videos too large"
    }
  ],

  "customArtifactTypes": [
    {
      "pattern": "galaxy-.*\\.xml$",
      "type": "junit-xml",
      "reason": "Galaxy-specific test format"
    }
  ],

  "workflows": [
    {
      "workflow": "test",
      "expectArtifacts": [
        {
          "pattern": "test-results",
          "required": true
        },
        {
          "pattern": "coverage-",
          "required": false
        }
      ]
    },
    {
      "workflow": "lint",
      "skipArtifacts": [
        {
          "pattern": "detailed-report"
        }
      ]
    }
  ]
}
```

## CLI Override

CLI options override configuration file settings:

```bash
# .gh-ci-artifacts.json says maxRetries: 3
# But this command uses 10:
gh-ci-artifacts 123 --max-retries 10
```

Priority (highest to lowest):
1. Command-line arguments
2. Environment variables
3. `.gh-ci-artifacts.json`
4. Defaults
