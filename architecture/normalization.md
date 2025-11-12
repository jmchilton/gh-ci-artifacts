# Normalization Architecture

The normalization system converts non-JSON artifact formats (HTML, NDJSON, TXT) into structured JSON, making artifacts easier to parse programmatically and analyze. This document describes the architecture and implementation of the normalization process.

## Overview

Normalization is a **post-detection** process that runs after artifact type detection. It:

1. **Identifies convertible formats** - Checks if detected type supports normalization
2. **Preserves originals** - Keeps original files in `raw/` directory
3. **Generates JSON** - Creates normalized JSON files in `converted/` directory
4. **Updates catalog** - Marks normalized artifacts in catalog with `converted: true`

## Normalization Pipeline

```
Detected Artifact → Check Format → Check Capability → Normalize → Save JSON → Update Catalog
```

### Stage 1: Format Check

**Component:** `isJSON()` helper function

**Process:**
1. Check if `detection.originalFormat === "json"`
2. Check if artifact type already indicates JSON format
3. Skip normalization if already JSON

**Purpose:** Avoid unnecessary normalization of already-JSON artifacts.

### Stage 2: Capability Check

**Component:** `canConvertToJSON()` from artifact-detective

**Process:**
1. Query `ARTIFACT_TYPE_REGISTRY` for detected type
2. Check if type has normalization function registered
3. Verify normalization target type exists

**Purpose:** Only normalize formats that have registered normalization functions.

### Stage 3: Normalization

**Component:** `convertToJSON()` from artifact-detective

**Process:**
1. **Load normalization function** - Get type-specific normalizer from registry
2. **Read file content** - Load original file
3. **Parse format** - Use format-specific parser:
   - **HTML:** Extract embedded JSON or parse HTML structure
   - **NDJSON:** Parse newline-delimited JSON into array
   - **TXT:** Parse text patterns into structured JSON
4. **Transform data** - Convert to target JSON format
5. **Return JSON object** - Structured JSON data

**Output:**
```typescript
{
  // Format-specific JSON structure
  // e.g., for test results: { suites: [], tests: [], summary: {} }
  // e.g., for linter output: [{ file: string, line: number, error: string }]
}
```

### Stage 4: File Saving

**Component:** File system operations in `cataloger.ts`

**Process:**
1. **Create directory:** `outputDir/converted/{runId}/`
2. **Generate filename:** `{originalName}.json` (preserve base name, change extension)
3. **Write JSON:** `JSON.stringify(jsonData, null, 2)` (pretty-printed)
4. **Save file:** Write to `converted/` directory

**File Structure:**
```
outputDir/
  raw/
    {runId}/
      artifact-{artifactId}/
        playwright-report.html  (original)
  converted/
    {runId}/
      playwright-report.json    (normalized)
```

### Stage 5: Catalog Update

**Component:** Catalog entry creation in `cataloger.ts`

**Process:**
1. **Create catalog entry** with:
   - `filePath`: Points to normalized JSON file (in `converted/`)
   - `converted: true`: Marks as normalized
   - `detectedType`: Original type (e.g., `playwright-html`)
   - `artifact.normalizedFrom`: Original type (e.g., `playwright-html`)
   - `artifact.artifactType`: Normalized type (e.g., `playwright-json`)

**Catalog Entry:**
```typescript
{
  artifactName: "playwright-report",
  artifactId: 12345,
  runId: "19186134146",
  detectedType: "playwright-html",  // Original type
  originalFormat: "html",
  filePath: "converted/19186134146/playwright-report.json",  // Normalized path
  converted: true,  // Marked as normalized
  artifact: {
    artifactType: "playwright-json",  // Normalized type
    normalizedFrom: "playwright-html",  // Original type
    shortDescription: "Playwright test results in JSON format"
  }
}
```

## Normalization Functions

### HTML Normalization

**Supported Types:**
- `jest-html` → `jest-json`
- `pytest-html` → `pytest-json`
- `playwright-html` → `playwright-json`

**Process:**
1. **Parse HTML** - Load HTML file
2. **Extract embedded JSON** - Find `<script>` tags with JSON data
   - Common pattern: `window.testResults = {...}`
   - Or: `<script type="application/json">...</script>`
3. **Parse HTML structure** - If no embedded JSON, parse HTML tables/structure
4. **Transform to JSON** - Convert to standardized test result format

**Example:**
```html
<!-- Input -->
<script>
  window.testResults = {
    suites: [...],
    tests: [...]
  };
</script>
```

```json
// Output
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

**Supported Types:**
- `mypy-ndjson` → `mypy-json`
- `clippy-ndjson` → `clippy-json`
- `go-test-ndjson` → `go-test-json`

**Process:**
1. **Read file** - Load NDJSON file line by line
2. **Parse each line** - Each line is a JSON object
3. **Collect objects** - Build array of parsed objects
4. **Return array** - Single JSON array containing all objects

**Example:**
```ndjson
// Input
{"file": "src/file1.py", "line": 10, "error": "Type error"}
{"file": "src/file2.py", "line": 5, "error": "Import error"}
```

```json
// Output
[
  {"file": "src/file1.py", "line": 10, "error": "Type error"},
  {"file": "src/file2.py", "line": 5, "error": "Import error"}
]
```

### Text Format Normalization

**Supported Types:**
- `mypy-txt` → `mypy-json`

**Process:**
1. **Read file** - Load text file
2. **Parse patterns** - Use regex patterns to extract structured data
3. **Build JSON** - Convert parsed data to JSON structure
4. **Return JSON** - Structured JSON object/array

**Example:**
```txt
// Input
src/file1.py:10: error: Incompatible types
src/file2.py:5: error: Missing return type
```

```json
// Output
[
  {"file": "src/file1.py", "line": 10, "error": "Incompatible types"},
  {"file": "src/file2.py", "line": 5, "error": "Missing return type"}
]
```

## Integration with artifact-detective

### Registry Lookup

Normalization uses `ARTIFACT_TYPE_REGISTRY` from artifact-detective:

```typescript
const registryEntry = ARTIFACT_TYPE_REGISTRY[detectedType];
if (registryEntry?.normalize) {
  // Type supports normalization
  const jsonData = registryEntry.normalize(fileContent);
}
```

### Normalization Functions

Each artifact type can register:
- **`normalize()` function** - Converts format to JSON
- **Target type** - What the normalized type is (e.g., `playwright-html` → `playwright-json`)

### Dynamic Discovery

The registry is dynamically loaded, so:
- **New types** - Automatically supported if artifact-detective adds them
- **No hardcoding** - No need to update gh-ci-artifacts for new formats
- **Type safety** - Registry ensures normalization functions exist

## Error Handling

### Normalization Failures

**When normalization fails:**
1. **Error caught** - Try-catch around normalization
2. **Original cataloged** - Catalog entry points to original file
3. **Error logged** - Warning logged but doesn't block processing
4. **Continue processing** - Other artifacts still processed

**Common failure reasons:**
- Malformed HTML/XML structure
- Missing embedded JSON data
- Unsupported format variations
- File corruption
- Parser errors

**Code:**
```typescript
try {
  const jsonData = convertToJSON(detection, filePath);
  if (jsonData) {
    // Save normalized JSON
  } else {
    // Couldn't normalize, catalog original
  }
} catch (error) {
  logger.error(`Failed to normalize: ${error.message}`);
  // Catalog original file
}
```

### Graceful Degradation

- **Non-blocking** - Failures don't stop cataloging
- **Original preserved** - Original files always available
- **Partial success** - Some artifacts normalized, others not
- **User choice** - Users can use original or normalized

## Performance Considerations

### File I/O

- **Single read** - Original file read once
- **Single write** - Normalized JSON written once
- **No caching** - Each file normalized independently

### Memory Usage

- **Streaming** - NDJSON can be processed line-by-line
- **Chunked processing** - Large files processed in chunks (future optimization)
- **Memory limits** - Very large files may fail (logged, not fatal)

### Parallelization

**Current:** Sequential normalization (one file at a time)

**Future optimization:**
- Parallel normalization of multiple files
- Batch processing of similar types
- Worker threads for CPU-intensive parsing

## Catalog Integration

### Catalog Entry Fields

Normalized artifacts have special fields:

```typescript
{
  converted: true,  // Indicates normalization occurred
  filePath: "converted/...",  // Points to normalized file
  artifact: {
    artifactType: "playwright-json",  // Normalized type
    normalizedFrom: "playwright-html",  // Original type
    // ... other metadata
  }
}
```

### Catalog Query Patterns

**Find normalized artifacts:**
```typescript
catalog.filter(entry => entry.converted === true)
```

**Find by normalized type:**
```typescript
catalog.filter(entry => 
  entry.artifact?.artifactType === "playwright-json"
)
```

**Find originals:**
```typescript
catalog.filter(entry => entry.converted !== true)
```

## Directory Structure

### Original Artifacts

```
outputDir/
  raw/
    {runId}/
      artifact-{artifactId}/
        {original files}
```

### Normalized Artifacts

```
outputDir/
  converted/
    {runId}/
      {normalized files}.json
```

**Note:** Normalized files are organized by run ID, not artifact ID, to simplify structure.

## Statistics Tracking

### Summary Statistics

Normalization statistics tracked in `summary.json`:

```json
{
  "stats": {
    "htmlConverted": 5,  // Count of normalized artifacts
    "artifactsCataloged": 12
  }
}
```

**Note:** Field name `htmlConverted` is historical - it counts all normalized artifacts, not just HTML.

### Catalog Statistics

Per-artifact normalization status:
- `converted: true` - Successfully normalized
- `converted: false` or undefined - Not normalized (JSON or failed)

## Configuration

### Automatic Normalization

Normalization happens **automatically** for downloaded artifacts:
- No configuration needed
- Enabled by default
- Can't be disabled (by design)

### Log Extraction Normalization

For artifacts extracted from logs, normalization is **configurable**:

```json
{
  "extractArtifactTypesFromLogs": [
    {
      "type": "pytest-html",
      "toJson": true,  // Enable normalization
      "required": true
    }
  ]
}
```

When `toJson: true`, extracted artifacts are normalized to JSON format.

## Future Enhancements

Potential improvements:
- **Parallel normalization** - Normalize multiple files concurrently
- **Incremental normalization** - Only normalize new/changed files
- **Normalization caching** - Cache normalized results for identical files
- **Streaming normalization** - Process large files without loading entirely into memory
- **Custom normalizers** - Allow users to register custom normalization functions

