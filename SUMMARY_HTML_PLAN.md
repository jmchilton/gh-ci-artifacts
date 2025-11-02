# Summary HTML Viewer - Implementation Plan

## Overview
Generate a single, self-contained HTML file that provides an interactive file tree viewer for exploring downloaded CI artifacts and logs. Auto-generated after each successful run.

## User Requirements
- **Generation:** Automatic (always generated)
- **Content:** Hybrid approach - small files inline, large files as links with preview
- **Failure Highlighting:** Run-level indicators with color coding
- **Filename:** `index.html`

## File Structure

```
.gh-ci-artifacts/21227/
├── index.html           # ← NEW: Interactive viewer
├── summary.json
├── catalog.json
├── artifacts.json
├── raw/
│   └── <run-id>/
│       └── <artifact-name>/
├── converted/
│   └── <run-id>/
│       └── <artifact-name>.json
└── linting/
    └── <run-id>/
        └── <job-name>-<linter>.txt
```

## Architecture

### 1. HTML Generator Module (`src/html-viewer.ts`)

**Responsibilities:**
- Generate self-contained HTML from `summary.json` + file system
- Embed all CSS/JS inline (no external dependencies)
- Create collapsible file tree structure
- Handle inline previews for small files

**Key Functions:**
```typescript
export function generateHtmlViewer(
  outputDir: string,
  summary: Summary,
  catalog: CatalogEntry[]
): void

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  detectedType?: string;
  preview?: string;  // For small files
  children?: FileNode[];
}
```

### 2. File Tree Builder

**Logic:**
1. Read `summary.json` to get run metadata
2. Read `catalog.json` for artifact type info
3. Scan file system for actual files in `raw/`, `converted/`, `linting/`
4. Build hierarchical tree structure
5. Determine preview strategy per file (inline vs. link)

**Preview Size Threshold:**
- Inline: < 50KB and text-based (JSON, TXT, log)
- Link with preview button: 50KB - 500KB
- Link only: > 500KB or binary

### 3. HTML Template Structure

```html
<!DOCTYPE html>
<html>
<head>
  <title>PR #21227 - CI Artifacts</title>
  <style>/* Embedded CSS */</style>
</head>
<body>
  <!-- Header -->
  <header>
    <h1>PR #21227 - galaxyproject/galaxy</h1>
    <div class="metadata">
      <span>Status: ✓ Complete</span>
      <span>SHA: 98991d85</span>
      <span>26 runs, 5 artifacts</span>
    </div>
  </header>

  <!-- Summary Stats -->
  <section class="stats">
    <div class="stat success">✓ 20 Passed</div>
    <div class="stat failure">✗ 6 Failed</div>
    <div class="stat">📦 5 Artifacts</div>
    <div class="stat">📄 21 Logs</div>
  </section>

  <!-- File Tree -->
  <section class="tree">
    <div class="tree-node directory">
      <span class="toggle">▼</span>
      <span class="icon">📁</span>
      <span class="name">raw/</span>

      <div class="children">
        <div class="tree-node directory">
          <span class="toggle">▶</span>
          <span class="icon">📁</span>
          <span class="name">18948753346/</span>
          <span class="badge failure">FAILED</span>

          <div class="children hidden">
            <div class="tree-node file">
              <span class="icon">📄</span>
              <span class="name">Playwright test results (3.9, 2)</span>
              <span class="type">playwright-html</span>
              <span class="size">117.0 KB</span>
              <button class="preview-btn">Preview</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Preview Panel (bottom) -->
  <section class="preview-panel hidden">
    <div class="preview-header">
      <span class="preview-title"></span>
      <button class="close-btn">✕</button>
    </div>
    <div class="preview-content">
      <!-- Injected content here -->
    </div>
  </section>

  <script>/* Embedded JavaScript */</script>
</body>
</html>
```

### 4. Styling

**Color Coding for Run Status:**
- ✓ Success: Green (#10b981)
- ✗ Failure: Red (#ef4444)
- ⚠ Cancelled: Yellow (#f59e0b)
- ⏳ In Progress: Blue (#3b82f6)

**Tree Styling:**
- Indentation: 20px per level
- Icons: Unicode emojis (📁 📄 🔧 📊)
- Collapsible: Click folder name or toggle arrow
- Hover: Highlight row with light background

### 5. JavaScript Interactions

**Features:**
- Toggle folders (expand/collapse)
- Click file to preview in bottom panel
- For small files: inline preview with syntax highlighting
- For large files: "Open in new tab" button
- Persist tree state in localStorage (expanded/collapsed)

**Preview Rendering:**
```javascript
function renderPreview(filePath, detectedType) {
  if (detectedType === 'json' || detectedType.includes('json')) {
    // Pretty-print JSON with collapsible objects
    return syntaxHighlightJSON(content);
  } else if (detectedType === 'xml') {
    return syntaxHighlightXML(content);
  } else if (detectedType.includes('txt') || filePath.endsWith('.log')) {
    // Plain text with ANSI color support
    return renderPlainText(content);
  } else if (isImage(filePath)) {
    return `<img src="${filePath}" />`;
  }
  // Fallback: link to open
  return `<a href="${filePath}" target="_blank">Open file</a>`;
}
```

### 6. Data Embedding Strategy

**Hybrid Approach:**

1. **Small text files (< 50KB):**
   - Read during HTML generation
   - Embed in `<script>` tag as JSON data structure
   - Example: `window.fileData = {"path/to/file.json": {...}}`

2. **Medium files (50KB - 500KB):**
   - Keep as separate files
   - Generate relative links
   - Add "Load Preview" button that fetches via XHR

3. **Large/binary files (> 500KB or binary):**
   - Link only, no preview
   - Show metadata (size, type) in tree

**Benefits:**
- HTML file stays reasonably sized (< 1-2 MB typically)
- Still works offline for most content
- Progressive loading for heavy content

## Implementation Steps

### Phase 1: Core Generator
1. Create `src/html-viewer.ts` module
2. Implement `buildFileTree()` function
3. Create HTML template string with embedded CSS
4. Generate basic tree structure (no previews yet)
5. Write to `index.html` in output directory

### Phase 2: Run Status Integration
1. Parse `summary.json` for run conclusions
2. Add status badges to run folders
3. Color-code run names in tree
4. Add summary stats section at top

### Phase 3: Preview System
1. Implement size-based preview logic
2. Add file reading for small files
3. Embed data in HTML
4. Create preview panel UI
5. Add JavaScript for preview rendering

### Phase 4: Interactivity
1. Add folder toggle JavaScript
2. Implement preview panel open/close
3. Add localStorage for tree state
4. Handle file type-specific rendering (JSON, XML, images)

### Phase 5: Polish
1. Add responsive CSS
2. Improve syntax highlighting
3. Add search/filter functionality (optional)
4. Test with large PR (many runs/artifacts)

### Phase 6: Integration
1. Call `generateHtmlViewer()` from `summary-generator.ts`
2. Run after summary.json is written
3. Log HTML location to user
4. Update README with viewer documentation

## File Organization

```
src/
├── html-viewer.ts           # Main generator
├── html-viewer/
│   ├── template.ts          # HTML template string
│   ├── tree-builder.ts      # File tree logic
│   ├── file-reader.ts       # Read & embed files
│   └── syntax-highlight.ts  # JSON/XML highlighting
└── summary-generator.ts     # Call viewer generator
```

## Testing Strategy

1. **Unit tests:** Test tree building logic with fixtures
2. **Manual testing:** Generate viewer for various PR sizes
3. **Browser testing:** Check in Chrome, Firefox, Safari
4. **Edge cases:**
   - PR with no artifacts
   - PR with only expired artifacts
   - PR with 50+ runs
   - Very large JSON files

## Example Output Messages

```
=== Complete ===
Status: complete
Summary saved to: .gh-ci-artifacts/21227/summary.json
Catalog saved to: .gh-ci-artifacts/21227/catalog.json
Inventory saved to: .gh-ci-artifacts/21227/artifacts.json
HTML viewer saved to: .gh-ci-artifacts/21227/index.html  ← NEW

Open .gh-ci-artifacts/21227/index.html in your browser to explore results
```

## Future Enhancements (Not in Scope)

- Live reload during download progress
- Diff view between runs
- Timeline visualization of run durations
- Export filtered results
- Dark mode toggle
- Integrated LLM chat interface

## Open Questions

None - all design decisions confirmed through user Q&A.
