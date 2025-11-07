/**
 * Shared UI components for HTML viewer
 */

export function renderStatsCards(
  stats: Array<{ label: string; value: number | string; type?: string }>,
): string {
  return stats
    .map((stat) => {
      const typeClass = stat.type ? `stat-${stat.type}` : "";
      return `<div class="stat ${typeClass}">${stat.label}: ${stat.value}</div>`;
    })
    .join("\n");
}

export function renderStatusBadge(status: string, label?: string): string {
  const text = label || status;
  return `<span class="badge badge-${status}">${escapeHtml(text)}</span>`;
}

export function renderExpandableSection(
  id: string,
  title: string,
  content: string,
  defaultOpen: boolean = false,
): string {
  const openClass = defaultOpen ? "" : "hidden";
  const arrow = defaultOpen ? "▼" : "▶";

  return `
    <div class="expandable-section">
      <div class="section-header" data-section="${id}">
        <span class="toggle">${arrow}</span>
        <span class="section-title">${escapeHtml(title)}</span>
      </div>
      <div class="section-content ${openClass}" data-section-content="${id}">
        ${content}
      </div>
    </div>
  `;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => string;
  headerTooltip?: string;
}

export interface TableOptions {
  id: string;
  searchable?: boolean;
  sortable?: boolean;
  filterBy?: string[];
}

export function renderTable(
  columns: TableColumn[],
  rows: any[],
  options?: TableOptions,
): string {
  const tableId = options?.id || "table";

  let html = '<div class="table-container">';

  // Search/filter controls
  if (options?.searchable || options?.filterBy) {
    html += '<div class="table-controls">';

    if (options.searchable) {
      html += `
        <input 
          type="text" 
          class="table-search" 
          data-table="${tableId}"
          placeholder="Search..."
        />
      `;
    }

    if (options.filterBy) {
      html += '<div class="table-filters">';
      options.filterBy.forEach((filterKey) => {
        const uniqueValues = [...new Set(rows.map((r) => r[filterKey]))].filter(
          Boolean,
        );
        if (uniqueValues.length > 0) {
          html += `
            <select class="table-filter" data-table="${tableId}" data-filter="${filterKey}">
              <option value="">All ${filterKey}</option>
              ${uniqueValues.map((val) => `<option value="${escapeHtml(String(val))}">${escapeHtml(String(val))}</option>`).join("")}
            </select>
          `;
        }
      });
      html += "</div>";
    }

    html += "</div>";
  }

  // Table
  html += `<table class="data-table" id="${tableId}">`;

  // Header
  html += "<thead><tr>";
  columns.forEach((col) => {
    const sortable = col.sortable !== false && options?.sortable !== false;
    const sortClass = sortable ? "sortable" : "";
    const tooltipAttr = col.headerTooltip
      ? ` class="column-header-trigger ${sortClass}" data-key="${col.key}" data-header-tooltip="${escapeHtml(col.headerTooltip)}"`
      : ` class="${sortClass}" data-key="${col.key}"`;
    html += `<th${tooltipAttr}>${escapeHtml(col.label)}</th>`;
  });
  html += "</tr></thead>";

  // Body
  html += "<tbody>";
  rows.forEach((row) => {
    const rowData = JSON.stringify(row).replace(/"/g, "&quot;");
    html += `<tr data-row='${rowData}'>`;
    columns.forEach((col) => {
      const value = row[col.key];
      const rendered = col.render
        ? col.render(value, row)
        : escapeHtml(String(value || ""));
      html += `<td>${rendered}</td>`;
    });
    html += "</tr>";
  });
  html += "</tbody>";

  html += "</table>";
  html += "</div>";

  return html;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
