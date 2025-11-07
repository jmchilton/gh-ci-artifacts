/**
 * CSS styles for HTML viewer
 */

export function getStyles(): string {
  return `
${getBaseStyles()}
${getTabStyles()}
${getTreeStyles()}
${getPreviewStyles()}
${getRichViewStyles()}
${getTableStyles()}
${getArtifactStyles()}
${getSyntaxHighlightStyles()}
`;
}

function getBaseStyles(): string {
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

code {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
}
`;
}

function getTabStyles(): string {
  return `
.tab-nav {
  display: flex;
  gap: 0;
  background: white;
  margin: 20px 20px 0;
  border-radius: 8px 8px 0 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
}

.tab-btn {
  flex: 1;
  padding: 15px 20px;
  background: #f9fafb;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  color: #666;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: #f3f4f6;
  color: #333;
}

.tab-btn.active {
  background: white;
  color: #2563eb;
  border-bottom-color: #2563eb;
}

.tab-content {
  display: none;
  background: white;
  margin: 0 20px 20px;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 20px;
  max-height: calc(100vh - 400px);
  overflow-y: auto;
}

.tab-content.active {
  display: block;
}
`;
}

function getTreeStyles(): string {
  return `
.tree {
  /* No extra styling needed - now inside tab-content */
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
  min-width: 150px;
}

.file-actions,
.artifact-actions,
.catalog-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-left: auto;
}

.action-link {
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 11px;
  color: #3b82f6;
  text-decoration: none;
  border: 1px solid #3b82f6;
  transition: all 0.2s;
}

.action-link:hover {
  background: #3b82f6;
  color: white;
}

.copy-path-btn {
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 11px;
  border: 1px solid #6b7280;
  background: white;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-path-btn:hover {
  background: #6b7280;
  color: white;
}

.copy-path-btn.copied {
  background: #10b981;
  border-color: #10b981;
  color: white;
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

.badge-skipped {
  background: #e5e7eb;
  color: #374151;
}

.badge-expired {
  background: #fef3c7;
  color: #92400e;
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
`;
}

function getPreviewStyles(): string {
  return `
.preview-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60vh;
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
  flex: 1;
}

.preview-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.view-toggle {
  display: flex;
  gap: 0;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  overflow: hidden;
}

.view-toggle-btn {
  padding: 6px 12px;
  background: white;
  border: none;
  cursor: pointer;
  font-size: 12px;
  color: #6b7280;
  transition: all 0.2s;
}

.view-toggle-btn:not(:last-child) {
  border-right: 1px solid #d1d5db;
}

.view-toggle-btn:hover {
  background: #f9fafb;
}

.view-toggle-btn.active {
  background: #3b82f6;
  color: white;
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
  margin-left: 10px;
}

.close-btn:hover {
  background: #e5e7eb;
}

.preview-content {
  flex: 1;
  overflow: auto;
  padding: 20px;
}

.preview-content.raw-view {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  line-height: 1.5;
  padding: 0;
}

.preview-content pre {
  margin: 0;
  padding: 20px;
  white-space: pre-wrap;
  word-wrap: break-word;
}
`;
}

function getRichViewStyles(): string {
  return `
.rich-view {
  /* No padding needed - parent tab-content has padding */
}

.rich-header {
  margin-bottom: 20px;
}

.rich-header h2 {
  font-size: 20px;
  margin-bottom: 10px;
}

.metadata-row {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
  font-size: 14px;
}

.metadata-item {
  color: #666;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.type-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 15px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.type-card:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.type-name {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 5px;
}

.type-count {
  font-size: 24px;
  font-weight: 600;
  color: #374151;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.status-card {
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  padding: 15px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.status-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.status-card-success {
  border-color: #10b981;
}

.status-card-failed {
  border-color: #ef4444;
}

.status-card-expired {
  border-color: #f59e0b;
}

.status-card-skipped {
  border-color: #6b7280;
}

.status-icon {
  font-size: 24px;
  margin-bottom: 5px;
}

.status-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 5px;
}

.status-count {
  font-size: 24px;
  font-weight: 600;
  color: #374151;
}

.section-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 30px 0;
}

.rich-view h3 {
  font-size: 18px;
  margin: 20px 0 15px 0;
  color: #374151;
}

.rich-view h4 {
  font-size: 16px;
  margin: 15px 0 10px 0;
  color: #374151;
}

.expandable-section {
  margin: 20px 0;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}

.section-header {
  padding: 12px 15px;
  background: #f9fafb;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  user-select: none;
  transition: background 0.2s;
}

.section-header:hover {
  background: #f3f4f6;
}

.section-header .toggle {
  font-size: 12px;
}

.section-title {
  font-weight: 500;
  color: #374151;
}

.section-content {
  padding: 15px;
}

.section-content.hidden {
  display: none;
}

.validation-summary {
  margin-top: 10px;
}

.validation-error {
  padding: 10px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 4px;
  margin-bottom: 10px;
  font-weight: 500;
}

.validation-warning {
  padding: 10px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 4px;
  margin-bottom: 10px;
  font-weight: 500;
}

.validation-details {
  margin-top: 15px;
}

.validation-workflow {
  margin-bottom: 20px;
}

.validation-list {
  list-style: none;
  margin-top: 10px;
}

.validation-list li {
  padding: 8px 12px;
  margin: 5px 0;
  border-radius: 4px;
}

.validation-item-error {
  background: #fee2e2;
  color: #991b1b;
  border-left: 3px solid #dc2626;
}

.validation-item-warning {
  background: #fef3c7;
  color: #92400e;
  border-left: 3px solid #f59e0b;
}

.validation-badge-error {
  background: #fee2e2;
  color: #991b1b;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
}

.validation-badge-warning {
  background: #fef3c7;
  color: #92400e;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
}

.text-muted {
  color: #6b7280;
  font-size: 13px;
}

.error-text {
  color: #dc2626;
  font-size: 13px;
}

.run-details {
  padding: 15px;
  background: #f9fafb;
  border-radius: 6px;
  margin-top: 10px;
}

.detail-table {
  width: 100%;
  margin: 10px 0;
  border-collapse: collapse;
  font-size: 13px;
}

.detail-table th {
  text-align: left;
  padding: 8px;
  background: #f3f4f6;
  border-bottom: 2px solid #e5e7eb;
  font-weight: 600;
  color: #374151;
}

.detail-table td {
  padding: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.detail-table tbody tr:hover {
  background: white;
}

.file-path {
  font-size: 11px;
  word-break: break-all;
}
`;
}

function getTableStyles(): string {
  return `
.table-container {
  margin: 20px 0;
}

.table-controls {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.table-search {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  min-width: 250px;
}

.table-search:focus {
  outline: none;
  border-color: #3b82f6;
}

.table-filters {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.table-filter {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.table-filter:focus {
  outline: none;
  border-color: #3b82f6;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.data-table thead {
  background: #f9fafb;
}

.data-table th {
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
  font-size: 13px;
}

.data-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.data-table th.sortable:hover {
  background: #f3f4f6;
}

.data-table th.sorted-asc::after {
  content: " ▲";
  font-size: 10px;
  color: #3b82f6;
}

.data-table th.sorted-desc::after {
  content: " ▼";
  font-size: 10px;
  color: #3b82f6;
}

.data-table td {
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 14px;
}

.data-table tbody tr {
  transition: background 0.2s;
}

.data-table tbody tr:hover {
  background: #f9fafb;
}

.data-table tbody tr.filtered-out {
  display: none;
}

.expanded-row {
  background: #f9fafb !important;
}

.expanded-row td {
  padding: 0 !important;
}

.row-toggle {
  cursor: pointer;
  user-select: none;
  color: #3b82f6;
  font-size: 12px;
}
`;
}

function getArtifactStyles(): string {
  return `
.validation-icon {
  margin-left: 4px;
  font-size: 0.9em;
  display: inline-block;
}

.validation-icon.valid {
  color: #28a745;
}

.validation-icon.invalid {
  color: #dc3545;
}

.artifact-details {
  margin-top: 8px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 0.9em;
}

.artifact-details .detail-row {
  margin-bottom: 8px;
  line-height: 1.4;
}

.artifact-details .parsing-guide {
  margin-top: 12px;
}

.artifact-details .parsing-guide summary {
  cursor: pointer;
  font-weight: 500;
  color: #007bff;
  margin-bottom: 8px;
}

.artifact-details .parsing-guide pre {
  background: white;
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.85em;
  border: 1px solid #dee2e6;
}

.artifact-details a {
  color: #007bff;
  text-decoration: none;
}

.artifact-details a:hover {
  text-decoration: underline;
}

#artifact-reference {
  margin-top: 40px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

#artifact-reference h2 {
  margin-bottom: 20px;
  color: #1f2937;
  font-size: 20px;
}

.artifact-type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.artifact-type-card {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 16px;
  background: white;
  transition: box-shadow 0.2s;
}

.artifact-type-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.artifact-type-card h3 {
  margin: 0 0 8px 0;
  color: #495057;
  font-size: 1.1em;
  display: flex;
  align-items: center;
  gap: 8px;
}

.artifact-type-card h3 .ext {
  color: #6c757d;
  font-size: 0.9em;
  font-weight: normal;
}

.artifact-type-card .description {
  color: #6c757d;
  margin: 8px 0 12px 0;
  font-size: 0.95em;
  line-height: 1.5;
}

.artifact-type-card .meta-row {
  margin: 8px 0;
  font-size: 0.9em;
  padding: 6px 0;
}

.artifact-type-card .meta-row strong {
  color: #495057;
  margin-right: 8px;
}

.artifact-type-card .meta-row a {
  color: #007bff;
  text-decoration: none;
}

.artifact-type-card .meta-row a:hover {
  text-decoration: underline;
}

.artifact-type-card .parsing-guide {
  margin-top: 12px;
  border-top: 1px solid #dee2e6;
  padding-top: 12px;
}

.artifact-type-card .parsing-guide summary {
  cursor: pointer;
  color: #007bff;
  font-weight: 500;
  font-size: 0.95em;
  padding: 6px 0;
}

.artifact-type-card .parsing-guide summary:hover {
  text-decoration: underline;
}

.artifact-type-card .parsing-guide pre {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.8em;
  margin-top: 8px;
  border: 1px solid #dee2e6;
  line-height: 1.4;
}

.stat-info {
  background: #cfe2ff;
  color: #084298;
}

.stat-warning {
  background: #fff3cd;
  color: #856404;
}

.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 4px;
  font-size: 0.9em;
  font-weight: 500;
}

.type-badge.valid {
  background: #c8e6c9;
  color: #2e7d32;
}

.type-badge.invalid {
  background: #ffcdd2;
  color: #c62828;
}

.type-badge .ext {
  font-size: 0.85em;
  color: #666;
  font-weight: normal;
}

.validation-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9em;
  font-weight: 500;
  white-space: nowrap;
}

.validation-badge.valid {
  background: #c8e6c9;
  color: #2e7d32;
}

.validation-badge.invalid {
  background: #ffcdd2;
  color: #c62828;
}
`;
}

function getSyntaxHighlightStyles(): string {
  return `
/* Simple JSON syntax highlighting */
.json-key {
  color: #0066cc;
}

.json-string {
  color: #067d17;
}

.json-number {
  color: #ff6600;
}

.json-boolean {
  color: #cc0066;
}

.json-null {
  color: #999999;
}

.json-punctuation {
  color: #666666;
}
`;
}
