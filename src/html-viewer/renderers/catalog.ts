import type { CatalogEntry } from "../../types.js";
import {
  renderStatsCards,
  renderTable,
  escapeHtml,
  type TableColumn,
} from "../components.js";

export function renderCatalogJson(data: CatalogEntry[]): string {
  let html = '<div class="rich-view catalog-view">';

  // Header
  html += `
    <div class="rich-header">
      <h2>Artifact Catalog</h2>
      <div class="metadata-row">
        <span class="metadata-item">Total Artifacts: ${data.length}</span>
      </div>
    </div>
  `;

  // Type breakdown
  const typeBreakdown = getTypeBreakdown(data);
  html += "<h3>Artifact Types</h3>";
  html += '<div class="type-grid">';
  Object.entries(typeBreakdown).forEach(([type, count]) => {
    html += `
      <div class="type-card" data-type="${escapeHtml(type)}">
        <div class="type-name">${escapeHtml(type)}</div>
        <div class="type-count">${count}</div>
      </div>
    `;
  });
  html += "</div>";

  // Stats
  const convertedCount = data.filter((d) => d.converted).length;
  const skippedCount = data.filter((d) => d.skipped).length;

  html += '<div class="stats-grid">';
  html += renderStatsCards([
    { label: "Total", value: data.length },
    { label: "Converted", value: convertedCount },
    { label: "Skipped", value: skippedCount },
  ]);
  html += "</div>";

  // Table
  html += '<div class="section-divider"></div>';
  html += "<h3>All Artifacts</h3>";
  html += renderCatalogTable(data);

  html += "</div>";
  return html;
}

function getTypeBreakdown(data: CatalogEntry[]): Record<string, number> {
  const breakdown: Record<string, number> = {};
  data.forEach((item) => {
    breakdown[item.detectedType] = (breakdown[item.detectedType] || 0) + 1;
  });
  return breakdown;
}

function renderCatalogTable(data: CatalogEntry[]): string {
  const columns: TableColumn[] = [
    { key: "artifactName", label: "Artifact Name" },
    { key: "runId", label: "Run ID" },
    {
      key: "detectedType",
      label: "Type",
      render: (val) => `<span class="type-badge">${escapeHtml(val)}</span>`,
    },
    { key: "originalFormat", label: "Format" },
    {
      key: "converted",
      label: "Converted",
      render: (val) => (val ? "✓" : ""),
    },
    {
      key: "skipped",
      label: "Skipped",
      render: (val) => (val ? "✓" : ""),
    },
    {
      key: "filePath",
      label: "Path",
      render: (val) => `<code class="file-path">${escapeHtml(val)}</code>`,
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (val, row) => {
        if (!row.filePath) return "";
        // Extract relative path from absolute path (everything after the last occurrence of /pr_reviews/NNN/)
        // or just use the last path segments (converted/, linting/, raw/)
        const pathParts = row.filePath.split("/");
        const dirIndex = pathParts.lastIndexOf("converted") !== -1
          ? pathParts.lastIndexOf("converted")
          : pathParts.lastIndexOf("linting") !== -1
          ? pathParts.lastIndexOf("linting")
          : pathParts.lastIndexOf("raw");
        const relativePath = dirIndex !== -1 ? pathParts.slice(dirIndex).join("/") : row.filePath;

        return `
          <div class="catalog-actions">
            <a href="${escapeHtml(relativePath)}" target="_blank" class="action-link" title="Open artifact file">Open</a>
            <button class="copy-path-btn" data-path="${escapeHtml(relativePath)}" title="Copy file path">Copy Path</button>
          </div>
        `;
      },
    },
  ];

  return renderTable(columns, data, {
    id: "catalog-table",
    searchable: true,
    sortable: true,
    filterBy: ["detectedType", "originalFormat"],
  });
}
