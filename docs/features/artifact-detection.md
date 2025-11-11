# Artifact Detection

gh-ci-artifacts automatically detects and categorizes CI artifacts using [artifact-detective](https://github.com/jmchilton/artifact-detective), a library that identifies test framework outputs, linter reports, and other CI artifacts by analyzing their content structure.

## Overview

When artifacts are downloaded from GitHub Actions, each file is analyzed to determine its type. The detection process:

1. **Content Analysis**: Reads file content to identify structural markers (not just file extensions)
2. **Type Detection**: Matches content patterns against known artifact formats
3. **Validation**: Optionally validates that content matches the detected type's expected format
4. **Custom Mapping**: Applies user-defined type mappings for unrecognized artifacts
5. **Categorization**: Classifies artifacts as test results, linter output, binary files, etc.

## Detection Process

### Automatic Detection

The tool uses `detectArtifactType()` from artifact-detective, which:

- **Analyzes file content** - Reads actual file contents, not just filenames
- **Identifies structural markers** - Looks for unique patterns like JSON schemas, HTML structure, XML namespaces
- **Returns detection result** - Provides detected type, original format (json/html/xml/txt), and binary status
- **Validates content** - When `validate: true` is used, verifies content matches expected format

```typescript
const detection = detectArtifactType(filePath, { validate: true });
// Returns:
// {
//   detectedType: "jest-json" | "playwright-html" | "eslint-txt" | "unknown" | ...
//   originalFormat: "json" | "html" | "xml" | "txt"
//   isBinary: boolean
//   artifact?: ArtifactDescriptor
//   validationResult?: ValidationResult
// }
```

### Supported Artifact Types

The tool supports 31+ artifact types across multiple categories:

**Test Frameworks:**
- `playwright-json`, `playwright-html`
- `jest-json`, `jest-html`
- `pytest-json`, `pytest-html`
- `junit-xml`
- `rspec-json`, `rspec-html`
- `go-test-ndjson`, `go-test-json`

**Linters & Formatters:**
- `eslint-json`, `eslint-txt`
- `tsc-txt`
- `ruff-txt`, `flake8-txt`
- `mypy-ndjson`, `mypy-json`, `mypy-txt`
- `clippy-ndjson`, `clippy-json`, `clippy-txt`
- `rustfmt-txt`, `gofmt-txt`
- `isort-txt`, `black-txt`
- `golangci-lint-json`

**Code Quality Tools:**
- `checkstyle-xml`, `checkstyle-sarif-json`
- `spotbugs-xml`
- `surefire-html`

For a complete list, see the [artifact-detective documentation](https://jmchilton.github.io/artifact-detective/#/artifact-types/).

## Custom Type Mappings

When artifact-detective can't identify an artifact type (detected as `"unknown"`), you can register custom type mappings in your configuration:

```json
{
  "customArtifactTypes": [
    {
      "pattern": "internal-test-report\\.json$",
      "type": "jest-json",
      "reason": "Internal test framework uses jest-compatible format"
    },
    {
      "pattern": "custom-lint-.*\\.html$",
      "type": "jest-html",
      "reason": "Custom linter output in HTML format"
    }
  ]
}
```

### How Custom Mappings Work

1. **Pattern Matching**: Filenames are matched against regex patterns
2. **Only for Unknown**: Mappings are only applied when detected type is `"unknown"`
3. **First Match Wins**: Patterns are checked in order, first match is used
4. **Global or Per-Workflow**: Can be defined globally or per-workflow

```json
{
  "workflows": [
    {
      "workflow": "ci",
      "customArtifactTypes": [
        {
          "pattern": ".*-custom-report\\.json$",
          "type": "pytest-json"
        }
      ]
    }
  ]
}
```

## Validation

When `validate: true` is passed to `detectArtifactType()`, the tool:

- **Validates content structure** - Ensures content matches the detected type's expected format
- **Provides validation results** - Returns `validationResult` with success/failure status
- **Logs validation warnings** - Invalid artifacts are logged with error details
- **Includes in catalog** - Validation results are stored in the artifact catalog

Example validation output:
```
✓ Validation: valid
✗ Validation: INVALID - Expected JSON object but found array
```

## Binary File Handling

Binary files (images, videos, archives) are:

- **Detected automatically** - `isBinary: true` in detection result
- **Skipped for processing** - Not converted or parsed
- **Included in catalog** - Listed with `skipped: true` flag
- **Preserved in output** - Original files remain available

Binary detection is based on file content analysis, not just file extensions.

## Detection Results

Each detected artifact includes:

- **Detected Type**: The artifact type (e.g., `"jest-json"`)
- **Original Format**: File format (`json`, `html`, `xml`, `txt`)
- **Artifact Descriptor**: Metadata including:
  - Short description
  - Tool URL (if applicable)
  - Format documentation URL
  - Parsing guide
  - JSON compatibility flag
- **Validation Result**: Content validation status (if validation enabled)
- **Binary Status**: Whether file is binary

This information is stored in `catalog.json` and displayed in the HTML viewer.

## Integration with artifact-detective

gh-ci-artifacts uses artifact-detective as its detection engine. The artifact type registry is dynamically loaded from `ARTIFACT_TYPE_REGISTRY`, ensuring:

- **Automatic updates**: New artifact types in artifact-detective are automatically available
- **Type safety**: TypeScript types stay in sync with runtime validation
- **Consistent detection**: Same detection logic across the ecosystem

See the [artifact-detective documentation](https://jmchilton.github.io/artifact-detective/) for details on how detection works internally.
