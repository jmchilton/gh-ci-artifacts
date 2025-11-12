# Artifact Detection Architecture

The detection system identifies artifact types by analyzing file content structure, not just filenames. It uses a multi-stage detection pipeline that combines automatic detection with user-defined custom mappings.

## Detection Pipeline

```
File → Content Analysis → Type Detection → Custom Mapping → Final Type
       (artifact-detective)   (pattern matching)  (user config)
```

### Stage 1: Content Analysis

**Component:** `artifact-detective.detectArtifactType()`

**Process:**
1. **Read file content** - Loads file into memory
2. **Analyze structure** - Examines content for structural markers:
   - JSON schemas and structure
   - HTML structure and embedded data
   - XML namespaces and structure
   - Text patterns and formats
3. **Detect format** - Identifies original format (json/html/xml/txt)
4. **Check binary** - Determines if file is binary

**Output:**
```typescript
{
  detectedType: ArtifactType | "unknown" | "binary",
  originalFormat: "json" | "html" | "xml" | "txt",
  isBinary: boolean,
  artifact?: ArtifactDescriptor,
  validationResult?: ValidationResult
}
```

### Stage 2: Custom Type Mapping

**Component:** `applyCustomArtifactType()` in `cataloger.ts`

**Process:**
1. **Check if unknown** - Only applies if `detectedType === "unknown"`
2. **Match filename** - Tests filename against regex patterns
3. **Apply mapping** - Returns mapped type if pattern matches
4. **Preserve known types** - Never overrides successfully detected types

**Configuration:**
- Global mappings: `config.customArtifactTypes`
- Workflow-specific: `config.workflows[].customArtifactTypes`
- Merged together: Global first, then workflow-specific

### Stage 3: Validation (Optional)

**Component:** `artifact-detective` validation functions

**Process:**
1. **Type-specific validator** - Uses validator for detected type
2. **Content validation** - Checks content matches expected schema/structure
3. **Error reporting** - Returns validation errors if invalid

**Enabled by:** `detectArtifactType(filePath, { validate: true })`

## Detection Registry

The detection system uses `ARTIFACT_TYPE_REGISTRY` from artifact-detective, which provides:

- **Type capabilities** - What each type supports (detection, validation, normalization)
- **Validator functions** - Type-specific validation logic
- **Extractor functions** - For extracting from logs
- **Normalization functions** - For converting to JSON

The registry is dynamically loaded, ensuring automatic updates when artifact-detective adds new types.

## Detection Strategy

### Content-Based Detection

Detection relies on **structural markers** in file content:

**JSON Files:**
- Schema structure (e.g., Jest has `testResults` array)
- Field names (e.g., Playwright has `config` and `suites`)
- Data patterns (e.g., pytest has `tests` array with specific structure)

**HTML Files:**
- Embedded JSON data (e.g., `window.testResults = {...}`)
- HTML structure (e.g., pytest HTML has specific table structure)
- Script tags with data

**XML Files:**
- Namespace declarations (e.g., JUnit uses `junit` namespace)
- Root element names (e.g., `<testsuites>` for JUnit)
- Element structure

**Text Files:**
- Line patterns (e.g., ESLint: `file.js:10:5 error ...`)
- Header patterns (e.g., TypeScript compiler output)
- Format-specific markers

### Filename-Based Fallback

Custom mappings use filename patterns as a fallback when content detection fails:

```typescript
// Only applied when detectedType === "unknown"
if (pattern.test(fileName)) {
  return mapping.type;
}
```

This allows users to handle:
- Custom formats not recognized by artifact-detective
- Internal tools with known formats
- Edge cases where content detection fails

## Detection Flow in Cataloger

```typescript
// For each file in artifact directory
const detection = detectArtifactType(filePath, { validate: true });

// Apply custom mapping if unknown
const finalType = applyCustomArtifactType(
  filePath,
  detection.detectedType,
  customArtifactTypes,
);

// Handle binary files
if (detection.isBinary) {
  catalog.push({ ...detection, skipped: true });
  continue;
}

// Process non-binary artifacts
// ... normalization, cataloging, etc.
```

## Detection Results

### Artifact Descriptor

When detection succeeds, `artifact-detective` provides an `ArtifactDescriptor`:

```typescript
{
  artifactType: "jest-json",
  fileExtension: "json",
  shortDescription: "Jest test results in JSON format",
  toolUrl: "https://jestjs.io/",
  formatUrl: "https://jestjs.io/docs/configuration#testresultsprocessor-string",
  parsingGuide: "Jest JSON reports contain...",
  isJSON: true,
  normalizedFrom?: undefined  // Set if normalized
}
```

This metadata is:
- **Stored in catalog** - Available for programmatic access
- **Displayed in HTML viewer** - Shown to users
- **Used for parsing** - Guides how to interpret artifacts

### Validation Results

When validation is enabled:

```typescript
{
  valid: true | false,
  error?: string,  // Error message if invalid
  artifact?: ArtifactDescriptor
}
```

Validation ensures:
- **Content integrity** - File matches expected format
- **Schema compliance** - Structure matches type requirements
- **Data quality** - Can be safely parsed

## Custom Type Mapping Architecture

### Mapping Application Order

1. **Global mappings** - Applied first
2. **Workflow-specific mappings** - Applied after global
3. **First match wins** - Patterns checked in order

### Pattern Matching

```typescript
function applyCustomArtifactType(
  filePath: string,
  detectedType: string,
  customMappings?: ArtifactTypeMapping[],
): string {
  // Only apply if detection failed
  if (detectedType !== "unknown" || !customMappings) {
    return detectedType;
  }

  // Try each pattern in order
  for (const mapping of customMappings) {
    const pattern = new RegExp(mapping.pattern);
    if (pattern.test(fileName)) {
      return mapping.type;  // First match wins
    }
  }

  return detectedType;  // No match, keep "unknown"
}
```

### Configuration Merging

Custom types are merged from:
- **Global config** - `config.customArtifactTypes`
- **Workflow configs** - `config.workflows[].customArtifactTypes`

Merged list is passed to cataloger, ensuring both global and workflow-specific mappings are available.

## Binary Detection

Binary files are detected by:
- **Content analysis** - Checking for binary content patterns
- **File type detection** - Not just extension-based
- **Early exit** - Binary files skip normalization and parsing

Binary artifacts are:
- **Cataloged** - Included in catalog with `skipped: true`
- **Preserved** - Original files kept in `raw/` directory
- **Not processed** - No type detection or normalization attempted

## Integration Points

### With artifact-detective

- **Detection** - Uses `detectArtifactType()` for all detection
- **Validation** - Uses type-specific validators from registry
- **Metadata** - Uses `ArtifactDescriptor` for type information
- **Registry** - Dynamically loads `ARTIFACT_TYPE_REGISTRY`

### With Configuration System

- **Custom mappings** - Loaded from config files
- **Workflow matching** - Workflow-specific mappings applied
- **Pattern validation** - Regex patterns validated at config load time

### With Cataloging

- **Type information** - Detection results stored in catalog
- **Validation results** - Validation status included
- **Metadata** - Artifact descriptors stored for reference

## Performance Considerations

### File Reading

- **Single pass** - Files read once for detection
- **Content analysis** - May read entire file for pattern matching
- **Binary detection** - Early exit for binary files

### Detection Caching

- **No caching** - Each file detected independently
- **Stateless** - Detection doesn't depend on other files
- **Parallelizable** - Files can be detected in parallel (future optimization)

## Error Handling

### Invalid Patterns

- **Regex errors** - Invalid patterns skipped with warning
- **Graceful degradation** - Detection continues with other patterns
- **Config validation** - Patterns validated at config load time (via Zod)

### Detection Failures

- **Unknown types** - Treated as `"unknown"`, can use custom mappings
- **Binary files** - Detected and skipped gracefully
- **Corrupted files** - Detection may fail, file still cataloged

### Validation Failures

- **Invalid content** - Validation errors logged but don't block processing
- **Type mismatches** - Warnings logged, artifact still cataloged
- **Schema violations** - Errors stored in validation result

## Future Enhancements

Potential improvements:
- **Parallel detection** - Detect multiple files concurrently
- **Detection caching** - Cache detection results for identical files
- **Incremental detection** - Only detect new/changed files
- **Confidence scores** - Provide detection confidence levels
