import type { ArtifactInventoryItem } from "../../types.js";
import {
  renderStatsCards,
  renderTable,
  renderStatusBadge,
  formatBytes,
  escapeHtml,
  type TableColumn,
} from "../components.js";
import { join } from "path";

export function renderArtifactsJson(
  data: ArtifactInventoryItem[],
  outputDir?: string,
): string {
  let html = '<div class="rich-view artifacts-view">';

  // Header
  html += `
    <div class="rich-header">
      <h2>Artifact Inventory</h2>
      <div class="metadata-row">
        <span class="metadata-item">Total Artifacts: ${data.length}</span>
      </div>
    </div>
  `;

  // Status breakdown
  const statusBreakdown = getStatusBreakdown(data);
  html += "<h3>Download Status</h3>";
  html += '<div class="status-grid">';

  const statusConfig = [
    { status: "success", label: "Success", icon: "✓" },
    { status: "failed", label: "Failed", icon: "✗" },
    { status: "expired", label: "Expired", icon: "⏰" },
    { status: "skipped", label: "Skipped", icon: "⊘" },
  ];

  statusConfig.forEach(({ status, label, icon }) => {
    const count = statusBreakdown[status] || 0;
    html += `
      <div class="status-card status-card-${status}" data-status="${status}">
        <div class="status-icon">${icon}</div>
        <div class="status-label">${label}</div>
        <div class="status-count">${count}</div>
      </div>
    `;
  });
  html += "</div>";

  // Stats
  const successRate =
    data.length > 0
      ? (((statusBreakdown.success || 0) / data.length) * 100).toFixed(1)
      : "0.0";

  html += '<div class="stats-grid">';
  html += renderStatsCards([
    { label: "Total", value: data.length },
    {
      label: "Success Rate",
      value: `${successRate}%`,
      type: parseFloat(successRate) === 100 ? "success" : "",
    },
  ]);
  html += "</div>";

  // Table
  html += '<div class="section-divider"></div>';
  html += "<h3>All Artifacts</h3>";
  html += renderArtifactsTable(data, outputDir);

  html += "</div>";
  return html;
}

function getStatusBreakdown(
  data: ArtifactInventoryItem[],
): Record<string, number> {
  const breakdown: Record<string, number> = {};
  data.forEach((item) => {
    breakdown[item.status] = (breakdown[item.status] || 0) + 1;
  });
  return breakdown;
}

function renderArtifactsTable(
  data: ArtifactInventoryItem[],
  outputDir?: string,
): string {
  const columns: TableColumn[] = [
    { key: "runId", label: "Run ID" },
    { key: "artifactName", label: "Artifact Name" },
    {
      key: "sizeBytes",
      label: "Size",
      render: (val) => (val ? formatBytes(val) : ""),
    },
    {
      key: "status",
      label: "Status",
      render: (val) => renderStatusBadge(val),
    },
    {
      key: "errorMessage",
      label: "Message",
      render: (val, row) => {
        if (row.skipReason)
          return `<span class="text-muted">${escapeHtml(row.skipReason)}</span>`;
        if (val) return `<span class="error-text">${escapeHtml(val)}</span>`;
        return "";
      },
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (val, row) => {
        const relativePath = `raw/${row.runId}/artifact-${row.artifactId}`;
        const absolutePath = outputDir
          ? join(outputDir, relativePath)
          : relativePath;
        return `
          <div class="artifact-actions">
            <button class="copy-path-btn" data-path="${escapeHtml(absolutePath)}" title="Copy artifact path">Copy Path</button>
          </div>
        `;
      },
    },
  ];

  return renderTable(columns, data, {
    id: "artifacts-table",
    searchable: true,
    sortable: true,
    filterBy: ["status", "runId"],
  });
}
