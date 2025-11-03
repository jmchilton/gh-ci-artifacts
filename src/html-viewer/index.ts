import { readdirSync, statSync, readFileSync, writeFileSync } from "fs";
import { join, relative, extname, basename } from "path";
import type {
  Summary,
  CatalogEntry,
  RunConclusion,
  ArtifactInventoryItem,
} from "../types.js";
import { getStyles } from "./styles.js";
import { getScripts } from "./scripts.js";
import { renderSummaryJson } from "./renderers/summary.js";
import { renderCatalogJson } from "./renderers/catalog.js";
import { renderArtifactsJson } from "./renderers/artifacts.js";

export interface FileNode {
  name: string;
  path: string;
  relativePath?: string; // Relative path from index.html
  type: "file" | "directory";
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
  catalog: CatalogEntry[],
): void {
  // Build file tree
  const tree = buildFileTree(outputDir, summary, catalog);

  // Load special JSON files for rich rendering
  const summaryData = summary;
  const catalogData = catalog;
  const artifactsData = loadArtifactsData(outputDir);

  // Generate HTML
  const html = generateHtml(
    summary,
    tree,
    summaryData,
    catalogData,
    artifactsData,
  );

  // Write to index.html
  const htmlPath = join(outputDir, "index.html");
  writeFileSync(htmlPath, html);
}

function loadArtifactsData(outputDir: string): ArtifactInventoryItem[] {
  try {
    const artifactsPath = join(outputDir, "artifacts.json");
    const content = readFileSync(artifactsPath, "utf-8");
    return JSON.parse(content);
  } catch (e) {
    return [];
  }
}

function buildFileTree(
  outputDir: string,
  summary: Summary,
  catalog: CatalogEntry[],
): FileNode {
  const root: FileNode = {
    name: basename(outputDir),
    path: outputDir,
    type: "directory",
    children: [],
  };

  // Add raw/ directory
  const rawDir = join(outputDir, "raw");
  try {
    const rawNode = buildDirectoryNode(rawDir, outputDir, summary, catalog);
    if (rawNode) root.children!.push(rawNode);
  } catch (e) {
    // raw/ doesn't exist
  }

  // Add converted/ directory
  const convertedDir = join(outputDir, "converted");
  try {
    const convertedNode = buildDirectoryNode(
      convertedDir,
      outputDir,
      summary,
      catalog,
    );
    if (convertedNode) root.children!.push(convertedNode);
  } catch (e) {
    // converted/ doesn't exist
  }

  // Add linting/ directory
  const lintingDir = join(outputDir, "linting");
  try {
    const lintingNode = buildDirectoryNode(
      lintingDir,
      outputDir,
      summary,
      catalog,
    );
    if (lintingNode) root.children!.push(lintingNode);
  } catch (e) {
    // linting/ doesn't exist
  }

  // Add JSON files
  ["summary.json", "catalog.json", "artifacts.json"].forEach((filename) => {
    const filePath = join(outputDir, filename);
    try {
      const stats = statSync(filePath);
      const fileNode: FileNode = {
        name: filename,
        path: filePath,
        relativePath: filename, // Relative to outputDir (where index.html is)
        type: "file",
        size: stats.size,
        detectedType: "json",
      };

      // Add preview for small text files
      if (shouldInlinePreview(stats.size, filePath)) {
        try {
          fileNode.preview = readFileSync(filePath, "utf-8");
        } catch (e) {
          // Binary file or read error
        }
      }

      root.children!.push(fileNode);
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
  catalog: CatalogEntry[],
): FileNode | null {
  try {
    const stats = statSync(dirPath);
    if (!stats.isDirectory()) return null;

    const name = basename(dirPath);
    const node: FileNode = {
      name,
      path: dirPath,
      type: "directory",
      children: [],
    };

    // Check if this is a run directory (numeric ID)
    const runId = /^\d+$/.test(name) ? name : undefined;
    if (runId) {
      const runSummary = summary.runs.find((r) => r.runId === runId);
      node.runId = runId;
      node.conclusion = runSummary?.conclusion;
    }

    // List children
    const entries = readdirSync(dirPath);
    for (const entry of entries) {
      const childPath = join(dirPath, entry);
      const childStats = statSync(childPath);

      if (childStats.isDirectory()) {
        const childNode = buildDirectoryNode(
          childPath,
          outputDir,
          summary,
          catalog,
        );
        if (childNode) node.children!.push(childNode);
      } else {
        // Find catalog entry for this file
        const relPath = relative(outputDir, childPath);
        const catalogEntry = catalog.find((c) => c.filePath === relPath);

        const fileNode: FileNode = {
          name: entry,
          path: childPath,
          relativePath: relPath,
          type: "file",
          size: childStats.size,
          detectedType: catalogEntry?.detectedType,
        };

        // Add preview for small text files
        if (shouldInlinePreview(childStats.size, childPath)) {
          try {
            fileNode.preview = readFileSync(childPath, "utf-8");
          } catch (e) {
            // Binary file or read error
          }
        }

        node.children!.push(fileNode);
      }
    }

    // Sort: directories first, then by name
    node.children!.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
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
  const textExts = [
    ".json",
    ".txt",
    ".log",
    ".xml",
    ".html",
    ".md",
    ".yml",
    ".yaml",
  ];
  return textExts.includes(ext);
}

function generateHtml(
  summary: Summary,
  tree: FileNode,
  summaryData: Summary,
  catalogData: CatalogEntry[],
  artifactsData: ArtifactInventoryItem[],
): string {
  // Embed file data
  const embeddedData = collectEmbeddedData(tree);

  // Pre-render rich views (as strings that will be embedded)
  const summaryRichHtml = renderSummaryJson(summaryData);
  const catalogRichHtml = renderCatalogJson(catalogData);
  const artifactsRichHtml = renderArtifactsJson(artifactsData);

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
    <div class="stat ${getStatClass("success", summary)}">✓ ${countSuccessRuns(summary)} Passed</div>
    <div class="stat ${getStatClass("failure", summary)}">✗ ${countFailureRuns(summary)} Failed</div>
    <div class="stat">📦 ${summary.stats.artifactsDownloaded} Artifacts</div>
    <div class="stat">📄 ${summary.stats.logsExtracted} Logs</div>
  </section>

  <nav class="tab-nav">
    <button class="tab-btn active" data-tab="catalog">Catalog</button>
    <button class="tab-btn" data-tab="summary">Summary</button>
    <button class="tab-btn" data-tab="files">Files</button>
  </nav>

  <section class="tab-content active" data-tab-content="catalog">
    ${catalogRichHtml}
  </section>

  <section class="tab-content" data-tab-content="summary">
    ${summaryRichHtml}
  </section>

  <section class="tab-content" data-tab-content="files">
    <div class="tree">
      ${tree.children?.map((child) => renderTreeNode(child, 0)).join("") || ""}
    </div>
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

    // Embed pre-rendered rich views
    window.__summaryRenderer = ${JSON.stringify(summaryRichHtml)};
    window.__catalogRenderer = ${JSON.stringify(catalogRichHtml)};
    window.__artifactsRenderer = ${JSON.stringify(artifactsRichHtml)};

    ${getScripts()}
  </script>
</body>
</html>`;
}

function collectEmbeddedData(node: FileNode): Record<string, string> {
  const data: Record<string, string> = {};

  if (node.type === "file" && node.preview) {
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

  if (node.type === "directory") {
    const conclusionBadge = node.conclusion
      ? `<span class="badge badge-${node.conclusion}">${node.conclusion.toUpperCase()}</span>`
      : "";

    return `
    <div class="tree-node directory" style="padding-left: ${indent}px">
      <span class="toggle">▶</span>
      <span class="icon">📁</span>
      <span class="name">${escapeHtml(node.name)}</span>
      ${conclusionBadge}
      <div class="children hidden">
        ${node.children?.map((child) => renderTreeNode(child, depth + 1)).join("") || ""}
      </div>
    </div>`;
  } else {
    const typeBadge = node.detectedType
      ? `<span class="type-badge">${node.detectedType}</span>`
      : "";
    const size = node.size ? formatBytes(node.size) : "";
    const canPreview =
      node.preview || (node.size && node.size < PREVIEW_SIZE_LAZY);

    // Use relative path from index.html (stored in node.relativePath)
    // Fallback to file:// if no relative path available
    const fileUrl = node.relativePath || "file://" + node.path;

    return `
    <div class="tree-node file ${canPreview ? "clickable" : ""}" style="padding-left: ${indent}px" ${canPreview ? `data-path="${escapeHtml(node.path)}"` : ""}>
      <span class="icon">📄</span>
      <span class="name">${escapeHtml(node.name)}</span>
      ${typeBadge}
      <span class="size">${size}</span>
      <div class="file-actions">
        <a href="${fileUrl}" target="_blank" class="action-link" title="Open raw file">Open</a>
        <button class="copy-path-btn" data-path="${escapeHtml(node.path)}" title="Copy file path">Copy Path</button>
      </div>
    </div>`;
  }
}

function getStatClass(type: string, summary: Summary): string {
  const count =
    type === "success" ? countSuccessRuns(summary) : countFailureRuns(summary);
  return count > 0 ? `stat-${type}` : "";
}

function countSuccessRuns(summary: Summary): number {
  return summary.runs.filter((r) => r.conclusion === "success").length;
}

function countFailureRuns(summary: Summary): number {
  return summary.runs.filter((r) => r.conclusion === "failure").length;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
