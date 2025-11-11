# Artifact Extraction from Logs

After extracting raw job logs (see [Log Extraction](log-extraction.md)), gh-ci-artifacts can parse those logs to extract structured artifacts like test results, linter output, and other CI tool outputs. This is useful when tools output structured data to console logs instead of saving them as downloadable artifacts.

## Overview

Artifact extraction from logs uses pattern matching to find structured artifact content within raw log files. It supports extracting:

- **Test results** - Jest, pytest, Playwright, and other test framework outputs
- **Linter output** - ESLint, TypeScript compiler, Ruff, and other linter outputs
- **Formatter output** - Prettier, Black, isort, and other formatter outputs
- **Any artifact type** - Any type supported by artifact-detective

## How It Works

### Two-Step Process

1. **Log Extraction** - Downloads raw logs from GitHub Actions (see [Log Extraction](log-extraction.md))
2. **Artifact Parsing** - Parses logs to find and extract structured artifacts

### Pattern Matching

The tool uses [artifact-detective](https://github.com/jmchilton/artifact-detective)'s `extract()` function to:

- **Search log content** - Scans through log text looking for artifact patterns
- **Identify artifact boundaries** - Finds start/end markers for artifact content
- **Extract structured data** - Pulls out the artifact content as a separate file
- **Validate content** - Optionally validates extracted content matches expected format
- **Normalize to JSON** - Optionally converts HTML/XML artifacts to JSON format

## Configuration

Configure which artifact types to extract from logs:

```json
{
  "extractArtifactTypesFromLogs": [
    {
      "type": "jest-json",
      "required": true,
      "reason": "Tests should always be captured from logs"
    },
    {
      "type": "eslint-json",
      "matchJobName": "lint",
      "required": false,
      "reason": "Lint output from specific jobs"
    },
    {
      "type": "pytest-html",
      "toJson": true,
      "required": true,
      "extractorConfig": {
        "startMarker": "=== pytest report ===",
        "endMarker": "=== end pytest report ===",
        "includeEndMarker": false
      }
    }
  ]
}
```

### Configuration Options

**`type`** (required)
- Artifact type to extract (e.g., `"jest-json"`, `"eslint-txt"`, `"pytest-html"`)
- Must be a valid artifact type from artifact-detective

**`required`** (optional)
- If `true`, missing artifacts will be flagged as validation errors
- If `false` (default), missing artifacts are logged as warnings
- Used for tracking which extractions are critical

**`matchJobName`** (optional)
- Regex pattern to match job names
- Only extracts from jobs matching this pattern
- Example: `"lint"` matches jobs with "lint" in the name

**`toJson`** (optional)
- If `true`, normalizes extracted content to JSON format
- Converts HTML/XML artifacts to structured JSON
- Example: `pytest-html` → `pytest-json`

**`extractorConfig`** (optional)
- Custom extraction configuration:
  - `startMarker`: Regex pattern marking start of artifact content
  - `endMarker`: Regex pattern marking end of artifact content
  - `includeEndMarker`: Whether to include end marker in extracted content

**`reason`** (optional)
- Human-readable explanation of why this extraction is configured
- Useful for documentation and debugging

## Extraction Process

### Step 1: Read Log Files

For each extracted log file (from log extraction step):
- Read log content as text
- Skip logs that failed to extract (`extractionStatus !== "success"`)

### Step 2: Try Each Configured Type

For each configured artifact type:
1. **Check job name** - If `matchJobName` is set, verify job matches pattern
2. **Extract content** - Use artifact-detective's `extract()` function
3. **Validate** - Optionally validate extracted content
4. **Normalize** - Optionally convert to JSON format
5. **Save artifact** - Write extracted content to file

### Step 3: Save Extracted Artifacts

Extracted artifacts are saved to:
```
.gh-ci-artifacts/
└── pr-123/
    └── artifacts/
        └── {runId}/
            ├── test-backend-jest-json.json
            ├── lint-backend-eslint-json.json
            └── test-playwright-pytest-json.json
```

### Step 4: Update Job Logs

Extracted artifacts are linked back to job logs:
- `JobLog.linterOutputs[]` - Array of extracted artifacts
- Each entry includes file path, artifact descriptor, and validation result

## Supported Artifact Types

All artifact types supported by artifact-detective can be extracted from logs:

**Test Frameworks:**
- `jest-json`, `jest-html`
- `pytest-json`, `pytest-html`
- `playwright-json`
- `rspec-json`, `rspec-html`
- `junit-xml`
- `go-test-ndjson`, `go-test-json`

**Linters:**
- `eslint-json`, `eslint-txt`
- `tsc-txt`
- `ruff-txt`, `flake8-txt`
- `mypy-ndjson`, `mypy-json`, `mypy-txt`
- `clippy-ndjson`, `clippy-json`, `clippy-txt`
- `golangci-lint-json`

**Formatters:**
- `rustfmt-txt`, `gofmt-txt`
- `isort-txt`, `black-txt`

See [Artifact Detection](artifact-detection.md) for complete list.

## Workflow-Specific Configuration

Configure extraction per workflow:

```json
{
  "workflows": [
    {
      "workflow": "ci",
      "extractArtifactTypesFromLogs": [
        {
          "type": "jest-json",
          "required": true
        }
      ]
    },
    {
      "workflow": "lint",
      "extractArtifactTypesFromLogs": [
        {
          "type": "eslint-json",
          "required": true
        }
      ]
    }
  ]
}
```

Workflow-specific configs **merge** with global configs - both are applied.

## Custom Extraction Markers

For artifacts with custom formatting, specify start/end markers:

```json
{
  "extractArtifactTypesFromLogs": [
    {
      "type": "jest-json",
      "extractorConfig": {
        "startMarker": "BEGIN_JEST_OUTPUT",
        "endMarker": "END_JEST_OUTPUT",
        "includeEndMarker": false
      }
    }
  ]
}
```

Markers are regex patterns, so you can use:
- `"startMarker": "=== Test Results ==="`
- `"startMarker": "\\d{4}-\\d{2}-\\d{2}.*Test output"`

## Validation

Extracted artifacts can be validated:

- **Automatic validation** - artifact-detective validates content structure
- **Validation results** - Stored with extracted artifacts
- **Invalid artifacts** - Logged as warnings but still saved

Validation ensures extracted content matches the expected format for the artifact type.

## Normalization to JSON

Some artifact types can be normalized to JSON:

```json
{
  "extractArtifactTypesFromLogs": [
    {
      "type": "pytest-html",
      "toJson": true  // Converts pytest-html to pytest-json
    }
  ]
}
```

Normalization:
- Converts HTML/XML artifacts to structured JSON
- Makes artifacts easier to parse programmatically
- Preserves all data while changing format

## Output Format

Extracted artifacts are saved with:
- **File path** - Location of extracted artifact file
- **Detected type** - Artifact type (e.g., `"jest-json"`)
- **Artifact descriptor** - Metadata about the artifact type
- **Validation result** - Content validation status

This information is included in:
- `catalog.json` - Artifact catalog
- `summary.json` - Run summary
- HTML viewer - Visual display

## Use Cases

**Test results in logs:**
- Extract Jest/pytest output from console
- Parse test results when artifacts aren't uploaded
- Capture test output from failed runs

**Linter output:**
- Extract ESLint/TypeScript errors from logs
- Parse linter output for analysis
- Capture linter results not saved as artifacts

**Custom tool output:**
- Extract any structured output from logs
- Parse custom test frameworks
- Capture tool-specific formats

## Limitations

- **Pattern matching** - Requires recognizable patterns in logs
- **Performance** - Large logs take longer to parse
- **False positives** - May extract content that looks like artifacts
- **Format variations** - Different tool versions may have different formats

## Best Practices

1. **Use `required: true`** for critical artifacts
2. **Specify `matchJobName`** to limit extraction scope
3. **Use custom markers** for tools with unique formats
4. **Enable `toJson`** for easier programmatic access
5. **Test configurations** with real log files before deploying
