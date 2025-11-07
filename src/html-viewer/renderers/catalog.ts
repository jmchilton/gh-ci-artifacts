import type { CatalogEntry } from "../../types.js";
import {
  renderStatsCards,
  renderTable,
  escapeHtml,
  type TableColumn,
} from "../components.js";
import { join } from "path";

export function renderCatalogJson(
  data: CatalogEntry[],
  outputDir?: string,
): string {
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
  const validatedCount = data.filter((d) => d.validation !== undefined).length;
  const invalidCount = data.filter((d) => d.validation && !d.validation.valid)
    .length;

  html += '<div class="stats-grid">';
  html += renderStatsCards([
    { label: "Total", value: data.length },
    { label: "Converted", value: convertedCount },
    { label: "Skipped", value: skippedCount },
    {
      label: "✓ Validated",
      value: validatedCount,
      type: "success",
    },
    {
      label: "✗ Invalid",
      value: invalidCount,
      type: invalidCount > 0 ? "warning" : "",
    },
  ]);
  html += "</div>";

  // Table
  html += '<div class="section-divider"></div>';
  html += "<h3>All Artifacts</h3>";
  html += renderCatalogTable(data, outputDir);

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

function renderCatalogTable(data: CatalogEntry[], outputDir?: string): string {
  const columns: TableColumn[] = [
    { key: "artifactName", label: "Artifact Name", headerTooltip: "Name of the downloaded artifact file" },
    { key: "runId", label: "Run ID", headerTooltip: "GitHub Actions workflow run ID" },
    {
      key: "detectedType",
      label: "Type",
      headerTooltip: "Detected artifact type (test framework, linter, etc.)",
      render: (val, row) => {
        const validIcon =
          row.validation === true
            ? '✓'
            : row.validation === false
              ? '✗'
              : '';
        const ext =
          row.artifact?.fileExtension && val
            ? `<span class="ext">.${row.artifact.fileExtension}</span>`
            : '';
        const validClass =
          row.validation === true
            ? 'valid'
            : row.validation === false
              ? 'invalid'
              : '';

        // Generate artifact card HTML for tooltip (will be shown on hover)
        const cardHtml = row.artifact ? generateArtifactCardHtml(val, row.artifact) : '';
        const tooltipAttr = cardHtml ? ` data-artifact-card="${escapeHtml(cardHtml)}"` : '';

        return `<span class="type-badge ${validClass} artifact-type-trigger"${tooltipAttr}>${escapeHtml(val)} ${validIcon} ${ext}</span>`;
      },
    },
    { key: "originalFormat", label: "Format", headerTooltip: "Original file format before conversion" },
    {
      key: "artifact",
      label: "Description",
      headerTooltip: "Short description of the artifact's purpose and content",
      render: (val, row) => {
        if (!row.artifact?.shortDescription) return "-";
        return `<span title="${escapeHtml(row.artifact.shortDescription)}">${escapeHtml(row.artifact.shortDescription.substring(0, 50))}</span>`;
      },
    },
    {
      key: "validation",
      label: "Valid",
      headerTooltip: "Validation status - whether artifact meets requirements for processing",
      render: (val, row) => {
        const validationInfo = renderValidationTooltipContent(row);
        const tooltipAttr = ` data-validation-info="${escapeHtml(validationInfo)}"`;

        if (!row.validation) {
          return `<span class="validation-trigger"${tooltipAttr}>-</span>`;
        }

        if (row.validation.valid) {
          return `<span class="validation-badge valid validation-trigger" style="color: green; cursor: help;"${tooltipAttr}>✓</span>`;
        }

        return `<span class="validation-badge invalid validation-trigger" style="color: red; cursor: help;"${tooltipAttr}>✗</span>`;
      },
    },
    {
      key: "converted",
      label: "Converted",
      headerTooltip: "Whether artifact was converted from original format to normalized format",
      render: (val, row) => {
        const conversionInfo = renderConversionTooltipContent(row);
        const tooltipAttr = ` data-conversion-info="${escapeHtml(conversionInfo)}"`;

        if (val) {
          return `<span class="conversion-trigger" style="color: green; cursor: help;"${tooltipAttr}>✓</span>`;
        }

        return `<span class="conversion-trigger"${tooltipAttr}></span>`;
      },
    },
    {
      key: "skipped",
      label: "Skipped",
      headerTooltip: "Whether artifact processing was skipped",
      render: (val) => (val ? "✓" : ""),
    },
    {
      key: "filePath",
      label: "Path",
      headerTooltip: "File path to the artifact in the output directory",
      render: (val) => `<code class="file-path">${escapeHtml(val)}</code>`,
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      headerTooltip: "Open or copy artifact file path",
      render: (val, row) => {
        if (!row.filePath) return "";
        // Extract relative path for Open link
        const pathParts = row.filePath.split("/");
        const dirIndex =
          pathParts.lastIndexOf("converted") !== -1
            ? pathParts.lastIndexOf("converted")
            : pathParts.lastIndexOf("linting") !== -1
              ? pathParts.lastIndexOf("linting")
              : pathParts.lastIndexOf("raw");
        const relativePath =
          dirIndex !== -1 ? pathParts.slice(dirIndex).join("/") : row.filePath;

        // Construct absolute path for Copy button
        const absolutePath = outputDir
          ? join(outputDir, row.filePath)
          : row.filePath;

        return `
          <div class="catalog-actions">
            <a href="${escapeHtml(relativePath)}" target="_blank" class="action-link" title="Open artifact file">Open</a>
            <button class="copy-path-btn" data-path="${escapeHtml(absolutePath)}" title="Copy file path">Copy Path</button>
          </div>
        `;
      },
    },
  ];

  return renderTable(columns, data, {
    id: "catalog-table",
    searchable: true,
    sortable: true,
    filterBy: ["detectedType", "originalFormat", "validation"],
  });
}

function generateArtifactCardHtml(type: string, artifact: any): string {
  return `
    <div class="artifact-card-popup">
      <h4>${escapeHtml(type)}${artifact.fileExtension ? ` <span class="ext">.${artifact.fileExtension}</span>` : ''}</h4>
      <p class="description">${escapeHtml(artifact.shortDescription)}</p>
      ${artifact.normalizedFrom ? `<div class="meta"><strong>Normalized from:</strong> ${escapeHtml(artifact.normalizedFrom)}</div>` : ''}
      ${artifact.toolUrl ? `<div class="meta"><strong>Tool:</strong> <a href="${escapeHtml(artifact.toolUrl)}" target="_blank">${escapeHtml(new URL(artifact.toolUrl).hostname)}</a></div>` : ''}
      ${artifact.formatUrl ? `<div class="meta"><strong>Format:</strong> <a href="${escapeHtml(artifact.formatUrl)}" target="_blank">${escapeHtml(new URL(artifact.formatUrl).hostname)}</a></div>` : ''}
      <details class="parsing-guide">
        <summary>Parsing Guide</summary>
        <pre>${escapeHtml(artifact.parsingGuide)}</pre>
      </details>
    </div>
  `;
}

function renderValidationTooltipContent(row: CatalogEntry): string {
  let html = '<div class="validation-tooltip">';

  if (!row.validation) {
    html += '<p><strong>No validation performed</strong></p>';
    html += '<p class="tooltip-desc">This artifact type does not require validation or was not validated during processing.</p>';
  } else if (row.validation.valid) {
    html += '<p><strong>✓ Valid</strong></p>';
    html += '<p class="tooltip-desc">This artifact passed all validation checks and is ready for processing.</p>';
    html += '<p class="tooltip-checks">Validation ensures the artifact contains required fields and has proper structure for LLM analysis.</p>';
  } else {
    html += '<p><strong>✗ Invalid</strong></p>';
    if (row.validation.error) {
      html += `<p class="tooltip-error"><strong>Error:</strong> ${escapeHtml(row.validation.error)}</p>`;
    }
    html += '<p class="tooltip-desc">This artifact failed validation and may not be suitable for processing.</p>';
  }

  html += '</div>';
  return html;
}

function renderConversionTooltipContent(row: CatalogEntry): string {
  let html = '<div class="conversion-tooltip">';

  if (row.converted) {
    html += '<p><strong>✓ Converted</strong></p>';
    html += `<p class="tooltip-info"><strong>From:</strong> ${escapeHtml(row.originalFormat || 'unknown')}</p>`;
    html += `<p class="tooltip-info"><strong>To:</strong> ${escapeHtml(row.detectedType)}</p>`;
    if (row.artifact?.normalizedFrom) {
      html += `<p class="tooltip-info"><strong>Normalized from:</strong> ${escapeHtml(row.artifact.normalizedFrom)}</p>`;
    }
    html += '<p class="tooltip-desc">The artifact was converted from its original format to a normalized format for consistent processing.</p>';
  } else {
    html += '<p><strong>Not Converted</strong></p>';
    html += `<p class="tooltip-info"><strong>Format:</strong> ${escapeHtml(row.originalFormat || 'unknown')}</p>`;
    html += '<p class="tooltip-desc">This artifact was already in the target format or did not require conversion.</p>';
  }

  html += '</div>';
  return html;
}
