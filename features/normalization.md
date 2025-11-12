# Normalization

gh-ci-artifacts automatically normalizes non-JSON artifact formats to structured JSON, making them easier to parse programmatically and analyze. Normalization converts HTML reports, NDJSON (newline-delimited JSON), and text formats into standardized JSON structures.

## Overview

Many CI tools output artifacts in formats like HTML reports or NDJSON streams. While these formats are human-readable, they're harder to parse programmatically. Normalization converts these formats to JSON, preserving all data while making it easier to:

- **Parse programmatically** - JSON is easier to work with than HTML/XML
- **Analyze with LLMs** - Structured JSON is more suitable for AI analysis
- **Integrate with tools** - JSON can be easily consumed by other tools
- **Maintain consistency** - All artifacts end up in a consistent format

## Supported Formats

Normalization supports multiple input formats:

### HTML Formats

**Test Framework Reports:**
- `jest-html` → `jest-json` - Jest HTML reports converted to JSON
- `pytest-html` → `pytest-json` - pytest HTML reports converted to JSON
- `playwright-html` → `playwright-json` - Playwright HTML reports converted to JSON

HTML reports typically contain embedded JSON data or structured HTML that can be parsed into JSON test results.

### NDJSON Formats (Newline-Delimited JSON)

**Linter/Type Checker Output:**
- `mypy-ndjson` → `mypy-json` - Mypy NDJSON output normalized to JSON array
- `clippy-ndjson` → `clippy-json` - Clippy NDJSON output normalized to JSON array
- `go-test-ndjson` → `go-test-json` - Go test NDJSON output normalized to JSON array

NDJSON files contain one JSON object per line. Normalization converts these into a single JSON array.

### Text Formats

**Linter Output:**
- `mypy-txt` → `mypy-json` - Mypy text output parsed and converted to JSON

Text formats are parsed using pattern matching to extract structured data.

## How Normalization Works

### Automatic Detection

The tool automatically detects which artifacts can be normalized:

1. **Type Detection** - Uses artifact-detective to identify artifact type
2. **Capability Check** - Checks if the type supports normalization ([`canConvertToJSON()`](https://jmchilton.github.io/artifact-detective/#/api/functions/canConvertToJSON))
3. **Format Check** - Skips artifacts already in JSON format
4. **Normalization** - Converts to JSON using appropriate parser

### Normalization Process

```typescript
// Simplified process
if (!isJSON(detection) && canConvertToJSON(detection)) {
  const jsonData = convertToJSON(detection, filePath);
  // Save normalized JSON to converted/ directory
}
```

### Output Location

Normalized artifacts are saved to:
```
.gh-ci-artifacts/
└── pr-123/
    └── converted/
        └── {runId}/
            ├── playwright-report.json
            ├── pytest-results.json
            └── jest-results.json
```

The original artifacts remain in `raw/` directory unchanged.

## Normalization Examples

### HTML Report Normalization

**Input (HTML):**
```html
<!DOCTYPE html>
<html>
  <body>
    <script>
      window.testResults = {
        "suites": [...],
        "tests": [...]
      };
    </script>
  </body>
</html>
```

**Output (JSON):**
```json
{
  "suites": [...],
  "tests": [...],
  "summary": {
    "total": 10,
    "passed": 8,
    "failed": 2
  }
}
```

### NDJSON Normalization

**Input (NDJSON):**
```ndjson
{"file": "src/file1.py", "line": 10, "error": "Type error"}
{"file": "src/file2.py", "line": 5, "error": "Import error"}
```

**Output (JSON):**
```json
[
  {"file": "src/file1.py", "line": 10, "error": "Type error"},
  {"file": "src/file2.py", "line": 5, "error": "Import error"}
]
```

## Catalog Entries

Normalized artifacts are marked in the catalog:

```json
{
  "artifactName": "playwright-report",
  "detectedType": "playwright-html",
  "originalFormat": "html",
  "filePath": "converted/19186134146/playwright-report.json",
  "converted": true,
  "artifact": {
    "artifactType": "playwright-json",
    "normalizedFrom": "playwright-html",
    "shortDescription": "Playwright test results in JSON format"
  }
}
```

Key fields:
- `converted: true` - Indicates artifact was normalized
- `artifact.normalizedFrom` - Original format before normalization
- `filePath` - Points to normalized JSON file (in `converted/` directory)

## Benefits

### For Programmatic Analysis

- **Structured data** - JSON is easier to parse than HTML/XML
- **Type safety** - JSON schemas can be validated
- **Tool integration** - Easy to consume with jq, Python, Node.js, etc.

### For LLM Analysis

- **Consistent format** - All artifacts in same JSON structure
- **Rich metadata** - Includes parsing guides and artifact descriptors
- **Easy to query** - JSON is ideal for AI analysis

### For Users

- **Prefer normalized** - Always check `converted/` directory first
- **Fallback available** - Original files still in `raw/` if needed
- **Automatic** - No configuration needed, happens automatically

## Configuration

Normalization happens automatically - no configuration needed. The tool:

1. Detects artifact types automatically
2. Checks normalization capability
3. Converts when possible
4. Falls back to original if conversion fails

For artifacts extracted from logs, you can enable normalization:

```json
{
  "extractArtifactTypesFromLogs": [
    {
      "type": "pytest-html",
      "toJson": true,  // Normalize to pytest-json
      "required": true
    }
  ]
}
```

## Error Handling

If normalization fails:

- **Original preserved** - Original artifact remains in `raw/` directory
- **Catalog entry** - Artifact is still cataloged with original format
- **Error logged** - Failure is logged but doesn't block processing
- **Graceful degradation** - Tool continues with other artifacts

Common failure reasons:
- Malformed HTML/XML structure
- Missing embedded JSON data
- Unsupported format variations
- File corruption

## Best Practices

1. **Check `converted/` first** - Normalized JSON is preferred over originals
2. **Use catalog metadata** - Check `artifact.normalizedFrom` to understand original format
3. **Fallback to `raw/`** - If normalized version unavailable, use original
4. **Validate structure** - Check `artifact.validation` status in catalog
5. **Read parsing guides** - Use `artifact.parsingGuide` for format details

## Integration with artifact-detective

Normalization uses [artifact-detective](https://github.com/jmchilton/artifact-detective)'s normalization functions:

- **[`canConvertToJSON()`](https://jmchilton.github.io/artifact-detective/#/api/functions/canConvertToJSON)** - Checks if format supports normalization
- **[`convertToJSON()`](https://jmchilton.github.io/artifact-detective/#/api/functions/convertToJSON)** - Performs the actual normalization
- **Format-specific parsers** - Each format has its own parser

The normalization registry ([`ARTIFACT_TYPE_REGISTRY`](https://jmchilton.github.io/artifact-detective/#/api/variables/ARTIFACT_TYPE_REGISTRY)) determines which formats can be normalized and what they normalize to.

## Statistics

Normalization statistics are included in `summary.json`:

```json
{
  "stats": {
    "htmlConverted": 5,  // Number of artifacts normalized
    "artifactsCataloged": 12
  }
}
```

Note: The field name `htmlConverted` is historical - it counts all normalized artifacts, not just HTML.
