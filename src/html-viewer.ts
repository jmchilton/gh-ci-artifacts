import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, relative, extname, basename } from 'path';
import type { Summary, CatalogEntry, RunConclusion } from './types.js';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  detectedType?: string;
  preview?: string;
  runId?: string;
  conclusion?: RunConclusion;
  children?: FileNode[];
}

const PREVIEW_SIZE_INLINE = 50 * 1024; // 50KB
const PREVIEW_SIZE_LAZY = 500 * 1024; // 500KB

export function generateHtmlViewer(
  outputDir: string,
  summary: Summary,
  catalog: CatalogEntry[]
): void {
  // Build file tree
  const tree = buildFileTree(outputDir, summary, catalog);

  // Generate HTML
  const html = generateHtml(summary, tree);

  // Write to index.html
  const htmlPath = join(outputDir, 'index.html');
  writeFileSync(htmlPath, html);
}

function buildFileTree(
  outputDir: string,
  summary: Summary,
  catalog: CatalogEntry[]
): FileNode {
  const root: FileNode = {
    name: basename(outputDir),
    path: outputDir,
    type: 'directory',
    children: [],
  };

  // Add raw/ directory
  const rawDir = join(outputDir, 'raw');
  try {
    const rawNode = buildDirectoryNode(rawDir, outputDir, summary, catalog);
    if (rawNode) root.children!.push(rawNode);
  } catch (e) {
    // raw/ doesn't exist
  }

  // Add converted/ directory
  const convertedDir = join(outputDir, 'converted');
  try {
    const convertedNode = buildDirectoryNode(convertedDir, outputDir, summary, catalog);
    if (convertedNode) root.children!.push(convertedNode);
  } catch (e) {
    // converted/ doesn't exist
  }

  // Add linting/ directory
  const lintingDir = join(outputDir, 'linting');
  try {
    const lintingNode = buildDirectoryNode(lintingDir, outputDir, summary, catalog);
    if (lintingNode) root.children!.push(lintingNode);
  } catch (e) {
    // linting/ doesn't exist
  }

  // Add JSON files
  ['summary.json', 'catalog.json', 'artifacts.json'].forEach(filename => {
    const filePath = join(outputDir, filename);
    try {
      const stats = statSync(filePath);
      root.children!.push({
        name: filename,
        path: filePath,
        type: 'file',
        size: stats.size,
        detectedType: 'json',
      });
    } catch (e) {
      // File doesn't exist
    }
  });

  return root;
}

function buildDirectoryNode(
  dirPath: string,
  outputDir: string,
  summary: Summary,
  catalog: CatalogEntry[]
): FileNode | null {
  try {
    const stats = statSync(dirPath);
    if (!stats.isDirectory()) return null;

    const name = basename(dirPath);
    const node: FileNode = {
      name,
      path: dirPath,
      type: 'directory',
      children: [],
    };

    // Check if this is a run directory (numeric ID)
    const runId = /^\d+$/.test(name) ? name : undefined;
    if (runId) {
      const runSummary = summary.runs.find(r => r.runId === runId);
      node.runId = runId;
      node.conclusion = runSummary?.conclusion;
    }

    // List children
    const entries = readdirSync(dirPath);
    for (const entry of entries) {
      const childPath = join(dirPath, entry);
      const childStats = statSync(childPath);

      if (childStats.isDirectory()) {
        const childNode = buildDirectoryNode(childPath, outputDir, summary, catalog);
        if (childNode) node.children!.push(childNode);
      } else {
        // Find catalog entry for this file
        const relPath = relative(outputDir, childPath);
        const catalogEntry = catalog.find(c => c.filePath === relPath);

        const fileNode: FileNode = {
          name: entry,
          path: childPath,
          type: 'file',
          size: childStats.size,
          detectedType: catalogEntry?.detectedType,
        };

        // Add preview for small text files
        if (shouldInlinePreview(childStats.size, childPath)) {
          try {
            fileNode.preview = readFileSync(childPath, 'utf-8');
          } catch (e) {
            // Binary file or read error
          }
        }

        node.children!.push(fileNode);
      }
    }

    // Sort: directories first, then by name
    node.children!.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return node;
  } catch (e) {
    return null;
  }
}

function shouldInlinePreview(size: number, path: string): boolean {
  if (size > PREVIEW_SIZE_INLINE) return false;

  const ext = extname(path).toLowerCase();
  const textExts = ['.json', '.txt', '.log', '.xml', '.html', '.md', '.yml', '.yaml'];
  return textExts.includes(ext);
}

function generateHtml(summary: Summary, tree: FileNode): string {
  // Embed file data
  const embeddedData = collectEmbeddedData(tree);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PR #${summary.pr} - ${summary.repo}</title>
  <style>${getStyles()}</style>
</head>
<body>
  <header>
    <h1>PR #${summary.pr} - ${summary.repo}</h1>
    <div class="metadata">
      <span class="status-badge status-${summary.status}">Status: ${summary.status}</span>
      <span>SHA: ${summary.headSha.substring(0, 8)}</span>
      <span>${summary.stats.totalRuns} runs</span>
      <span>${summary.stats.artifactsDownloaded} artifacts</span>
    </div>
  </header>

  <section class="stats">
    <div class="stat ${getStatClass('success', summary)}">✓ ${countSuccessRuns(summary)} Passed</div>
    <div class="stat ${getStatClass('failure', summary)}">✗ ${countFailureRuns(summary)} Failed</div>
    <div class="stat">📦 ${summary.stats.artifactsDownloaded} Artifacts</div>
    <div class="stat">📄 ${summary.stats.logsExtracted} Logs</div>
  </section>

  <section class="tree">
    ${tree.children?.map(child => renderTreeNode(child, 0)).join('') || ''}
  </section>

  <section class="preview-panel hidden">
    <div class="preview-header">
      <span class="preview-title"></span>
      <button class="close-btn">✕</button>
    </div>
    <div class="preview-content"></div>
  </section>

  <script>
    window.fileData = ${JSON.stringify(embeddedData)};
    ${getScripts()}
  </script>
</body>
</html>`;
}

function collectEmbeddedData(node: FileNode): Record<string, string> {
  const data: Record<string, string> = {};

  if (node.type === 'file' && node.preview) {
    data[node.path] = node.preview;
  }

  if (node.children) {
    for (const child of node.children) {
      Object.assign(data, collectEmbeddedData(child));
    }
  }

  return data;
}

function renderTreeNode(node: FileNode, depth: number): string {
  const indent = depth * 20;

  if (node.type === 'directory') {
    const conclusionBadge = node.conclusion
      ? `<span class="badge badge-${node.conclusion}">${node.conclusion.toUpperCase()}</span>`
      : '';

    return `
    <div class="tree-node directory" style="padding-left: ${indent}px">
      <span class="toggle">▶</span>
      <span class="icon">📁</span>
      <span class="name">${escapeHtml(node.name)}</span>
      ${conclusionBadge}
      <div class="children hidden">
        ${node.children?.map(child => renderTreeNode(child, depth + 1)).join('') || ''}
      </div>
    </div>`;
  } else {
    const typeBadge = node.detectedType
      ? `<span class="type-badge">${node.detectedType}</span>`
      : '';
    const size = node.size ? formatBytes(node.size) : '';
    const canPreview = node.preview || (node.size && node.size < PREVIEW_SIZE_LAZY);

    return `
    <div class="tree-node file ${canPreview ? 'clickable' : ''}" style="padding-left: ${indent}px" ${canPreview ? `data-path="${escapeHtml(node.path)}"` : ''}>
      <span class="icon">📄</span>
      <span class="name">${escapeHtml(node.name)}</span>
      ${typeBadge}
      <span class="size">${size}</span>
    </div>`;
  }
}

function getStatClass(type: string, summary: Summary): string {
  const count = type === 'success' ? countSuccessRuns(summary) : countFailureRuns(summary);
  return count > 0 ? `stat-${type}` : '';
}

function countSuccessRuns(summary: Summary): number {
  return summary.runs.filter(r => r.conclusion === 'success').length;
}

function countFailureRuns(summary: Summary): number {
  return summary.runs.filter(r => r.conclusion === 'failure').length;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function getStyles(): string {
  return `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
  background: #f5f5f5;
}

header {
  background: white;
  padding: 20px;
  border-bottom: 1px solid #ddd;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

header h1 {
  font-size: 24px;
  margin-bottom: 10px;
}

.metadata {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  font-size: 14px;
  color: #666;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.status-complete {
  background: #d1fae5;
  color: #065f46;
}

.status-partial {
  background: #fed7aa;
  color: #92400e;
}

.status-incomplete {
  background: #dbeafe;
  color: #1e40af;
}

.stats {
  display: flex;
  gap: 20px;
  padding: 20px;
  background: white;
  margin: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat {
  padding: 10px 15px;
  border-radius: 6px;
  background: #f9fafb;
  font-weight: 500;
}

.stat-success {
  background: #d1fae5;
  color: #065f46;
}

.stat-failure {
  background: #fee2e2;
  color: #991b1b;
}

.tree {
  background: white;
  margin: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 20px;
  max-height: calc(100vh - 400px);
  overflow-y: auto;
}

.tree-node {
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.tree-node:hover {
  background: #f9fafb;
}

.tree-node .toggle {
  cursor: pointer;
  user-select: none;
  width: 16px;
  font-size: 12px;
}

.tree-node.file .toggle {
  display: none;
}

.tree-node.file.clickable {
  cursor: pointer;
}

.tree-node.file.clickable:hover {
  background: #e5e7eb;
}

.tree-node .icon {
  font-size: 16px;
}

.tree-node .name {
  flex: 1;
  font-size: 14px;
}

.tree-node .children {
  width: 100%;
}

.tree-node .children.hidden {
  display: none;
}

.badge {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-success {
  background: #d1fae5;
  color: #065f46;
}

.badge-failure {
  background: #fee2e2;
  color: #991b1b;
}

.badge-cancelled {
  background: #fed7aa;
  color: #92400e;
}

.badge-in_progress {
  background: #dbeafe;
  color: #1e40af;
}

.type-badge {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  background: #e5e7eb;
  color: #374151;
}

.size {
  font-size: 12px;
  color: #6b7280;
}

.preview-btn {
  padding: 4px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.preview-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.preview-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50vh;
  background: white;
  border-top: 2px solid #ddd;
  box-shadow: 0 -4px 8px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.preview-panel.hidden {
  display: none;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #ddd;
  background: #f9fafb;
}

.preview-title {
  font-weight: 500;
  font-size: 14px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  background: #e5e7eb;
}

.preview-content {
  flex: 1;
  overflow: auto;
  padding: 20px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.preview-content pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}
`;
}

function getScripts(): string {
  return `
// Toggle directory expansion
document.addEventListener('click', (e) => {
  const toggle = e.target.closest('.toggle');
  if (toggle) {
    const node = toggle.closest('.tree-node');
    const children = node.querySelector('.children');
    if (children) {
      children.classList.toggle('hidden');
      toggle.textContent = children.classList.contains('hidden') ? '▶' : '▼';
    }
  }
});

// Preview file - click on file row
document.addEventListener('click', (e) => {
  const fileNode = e.target.closest('.tree-node.file.clickable');
  if (fileNode) {
    const path = fileNode.dataset.path;
    const content = window.fileData[path];
    const panel = document.querySelector('.preview-panel');
    const title = document.querySelector('.preview-title');
    const contentDiv = document.querySelector('.preview-content');

    title.textContent = path.split('/').pop();

    if (content) {
      // Render preview
      if (path.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content);
          contentDiv.innerHTML = '<pre>' + JSON.stringify(parsed, null, 2) + '</pre>';
        } catch (e) {
          contentDiv.innerHTML = '<pre>' + content + '</pre>';
        }
      } else {
        contentDiv.innerHTML = '<pre>' + content + '</pre>';
      }
    } else {
      contentDiv.innerHTML = '<p>Preview not available. File too large or not embedded.</p>';
    }

    panel.classList.remove('hidden');
  }
});

// Close preview
document.querySelector('.close-btn').addEventListener('click', () => {
  document.querySelector('.preview-panel').classList.add('hidden');
});
`;
}
