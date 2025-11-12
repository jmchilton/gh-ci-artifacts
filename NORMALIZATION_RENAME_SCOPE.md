# Scope: Rename "HTML Conversion" to "Normalization"

## Current State

The feature is currently named "HTML Conversion" but actually performs **normalization** of multiple artifact formats to JSON, not just HTML.

### What Actually Gets Normalized

Based on `ARTIFACT_TYPE_REGISTRY` from artifact-detective, the following formats can be normalized:

1. **HTML formats:**
   - `jest-html` → `jest-json`
   - `pytest-html` → `pytest-json`
   - `playwright-html` → `playwright-json` (likely, though not in registry output)

2. **NDJSON formats (newline-delimited JSON):**
   - `mypy-ndjson` → `mypy-json`
   - `clippy-ndjson` → `clippy-json`
   - `go-test-ndjson` → `go-test-json`

3. **Text formats:**
   - `mypy-txt` → `mypy-json`

### Current Terminology Issues

1. **Naming inconsistency:**
   - Code uses "HTML conversion" in comments and logs
   - artifact-detective uses "normalization" terminology
   - Some code already references "normalized" (e.g., `normalizedFrom` field)
   - README mentions both "converted" and "normalized"

2. **Scope mismatch:**
   - Name suggests only HTML is converted
   - Actually handles HTML, NDJSON, and TXT formats
   - Feature is about normalizing to JSON, not just converting HTML

3. **User confusion:**
   - Users might not realize NDJSON/TXT formats are also normalized
   - "HTML conversion" doesn't convey the broader purpose

## Proposed Changes

### 1. File Rename
- `docs/features/html-conversion.md` → `docs/features/normalization.md`

### 2. Documentation Updates

**Files to update:**
- `docs/_sidebar.md` - Update navigation link
- `docs/features/normalization.md` - Rewrite content to cover all formats
- `README.md` - Update references from "HTML conversion" to "normalization"
- `docs/guide/output-format.md` - Update "converted/" directory description

**Content changes:**
- Explain normalization as converting non-JSON formats to JSON
- Document all supported formats (HTML, NDJSON, TXT)
- Clarify that normalization makes artifacts easier to parse programmatically
- Update examples to show non-HTML formats too

### 3. Code Comments (Optional)

**Files with "HTML conversion" comments:**
- `src/cataloger.ts` - Line 124: `// Handle HTML conversion`
- `src/cli.ts` - Line 222: `logger.info("\n=== Cataloging artifacts and converting HTML ===")`

**Proposed changes:**
- Update to "normalization" terminology
- Keep functionality the same, just update language

### 4. Variable/Field Names (Consider)

**Current naming:**
- `converted: boolean` in catalog entries
- `converted/` directory name
- `htmlConverted: number` in stats

**Options:**
- **Option A (Minimal):** Keep `converted` naming, just update docs
  - Pros: No breaking changes, less work
  - Cons: Still somewhat misleading
  
- **Option B (Comprehensive):** Rename to `normalized`
  - Pros: Accurate terminology throughout
  - Cons: Breaking change for JSON schema, more work

**Recommendation:** Option A for now (update docs only), consider Option B in future major version.

### 5. Log Messages

**Current:**
```
=== Cataloging artifacts and converting HTML ===
HTML converted to JSON: 5
```

**Proposed:**
```
=== Cataloging artifacts and normalizing to JSON ===
Artifacts normalized to JSON: 5
```

## Benefits of Rename

1. **Accuracy:** Name reflects what the feature actually does
2. **Consistency:** Aligns with artifact-detective terminology
3. **Clarity:** Users understand NDJSON/TXT formats are also normalized
4. **Future-proof:** Name works if more formats are added

## Implementation Plan

### Phase 1: Documentation (Non-breaking)
1. ✅ Rename `html-conversion.md` → `normalization.md`
2. ✅ Update sidebar navigation
3. ✅ Rewrite documentation to cover all formats
4. ✅ Update README references
5. ✅ Update output format guide

### Phase 2: Code Comments (Non-breaking)
1. Update `cataloger.ts` comment
2. Update `cli.ts` log message
3. Update any other comments referencing "HTML conversion"

### Phase 3: Consider Schema Changes (Breaking - Future)
1. Rename `converted` → `normalized` in catalog entries
2. Rename `converted/` → `normalized/` directory
3. Rename `htmlConverted` → `artifactsNormalized` in stats
4. Update all references in code
5. Document breaking change in CHANGELOG

## Testing Considerations

- Verify documentation links work after rename
- Check that examples still make sense
- Ensure no broken internal references
- Test that normalization still works for all formats

## Related Issues

- Issue #3: Documentation stubs (this rename is part of filling out docs)
- Future: Consider schema changes for `converted` → `normalized`

## Decision Needed

**Question:** Should we do Phase 3 (schema changes) now, or defer to future major version?

**Recommendation:** Defer Phase 3 - do Phases 1 & 2 now (non-breaking), consider Phase 3 for v2.0 or when we have other breaking changes.

