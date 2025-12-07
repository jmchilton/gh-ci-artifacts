import type { Summary, ValidationResult } from "../../types.js";
import {
  renderStatsCards,
  renderStatusBadge,
  renderExpandableSection,
  renderTable,
  formatBytes,
  escapeHtml,
  type TableColumn,
} from "../components.js";

export function renderSummaryJson(data: Summary): string {
  let html = '<div class="rich-view summary-view">';

  // Header
  const refDisplay =
    data.mode === "pr"
      ? `PR #${data.pr}`
      : `Branch: ${data.branch}`;
  html += `
    <div class="rich-header">
      <h2>Summary: ${escapeHtml(data.repo)} ${refDisplay}</h2>
      <div class="metadata-row">
        ${renderStatusBadge(data.status, data.status.toUpperCase())}
        <span class="metadata-item">SHA: <code>${data.headSha.substring(0, 8)}</code></span>
        <span class="metadata-item">Analyzed: ${new Date(data.analyzedAt).toLocaleString()}</span>
      </div>
    </div>
  `;

  // Stats cards
  html += '<div class="stats-grid">';
  html += renderStatsCards([
    { label: "Total Runs", value: data.stats.totalRuns },
    {
      label: "✓ Downloaded",
      value: data.stats.artifactsDownloaded,
      type: "success",
    },
    {
      label: "✗ Failed",
      value: data.stats.artifactsFailed,
      type: data.stats.artifactsFailed > 0 ? "failure" : "",
    },
    { label: "📄 Logs", value: data.stats.logsExtracted },
    { label: "🔄 Converted", value: data.stats.htmlConverted },
    {
      label: "✓ Validated",
      value: data.stats.artifactsValidated,
      type: "success",
    },
    {
      label: "✗ Invalid",
      value: data.stats.artifactsInvalid,
      type: data.stats.artifactsInvalid > 0 ? "warning" : "",
    },
    {
      label: "🔍 Linters",
      value: data.stats.linterOutputsExtracted,
      type: "info",
    },
  ]);

  // Add in-progress runs if any
  if (data.inProgressRuns > 0) {
    html += `<div class="stat stat-incomplete">⏳ In Progress: ${data.inProgressRuns}</div>`;
  }
  html += "</div>";

  // Validation results
  if (data.validationResults && data.validationResults.length > 0) {
    html += renderValidationSection(data.validationResults);
  }

  // Runs table
  html += '<div class="section-divider"></div>';
  html += "<h3>Workflow Runs</h3>";
  html += renderRunsTable(data);

  html += "</div>";
  return html;
}

function renderValidationSection(results: ValidationResult[]): string {
  const totalRequired = results.reduce(
    (sum, r) => sum + r.missingRequired.length,
    0,
  );
  const totalOptional = results.reduce(
    (sum, r) => sum + r.missingOptional.length,
    0,
  );
  const totalRequiredLogArtifacts = results.reduce(
    (sum, r) => sum + (r.missingRequiredLogArtifacts?.length || 0),
    0,
  );
  const totalOptionalLogArtifacts = results.reduce(
    (sum, r) => sum + (r.missingOptionalLogArtifacts?.length || 0),
    0,
  );

  let content = '<div class="validation-summary">';

  if (totalRequired > 0) {
    content += `<div class="validation-error">✗ ${totalRequired} required artifact(s) missing</div>`;
  }
  if (totalOptional > 0) {
    content += `<div class="validation-warning">⚠ ${totalOptional} optional artifact(s) missing</div>`;
  }
  if (totalRequiredLogArtifacts > 0) {
    content += `<div class="validation-error">✗ ${totalRequiredLogArtifacts} required log artifact type(s) missing</div>`;
  }
  if (totalOptionalLogArtifacts > 0) {
    content += `<div class="validation-warning">⚠ ${totalOptionalLogArtifacts} optional log artifact type(s) missing</div>`;
  }

  content += '<div class="validation-details">';

  results.forEach((result) => {
    const artifactViolations = [...result.missingRequired, ...result.missingOptional];
    const logArtifactViolations = [
      ...(result.missingRequiredLogArtifacts || []),
      ...(result.missingOptionalLogArtifacts || []),
    ];
    if (artifactViolations.length === 0 && logArtifactViolations.length === 0) return;

    content += `
      <div class="validation-workflow">
        <strong>${escapeHtml(result.workflowName)}</strong>
        <span class="text-muted">(Run ${result.runId})</span>
        <ul class="validation-list">
    `;

    // Artifact pattern violations
    result.missingRequired.forEach((v) => {
      content += `<li class="validation-item-error">
        <code>${escapeHtml(v.pattern)}</code> (required artifact)
        ${v.reason ? `<span class="text-muted">- ${escapeHtml(v.reason)}</span>` : ""}
      </li>`;
    });

    result.missingOptional.forEach((v) => {
      content += `<li class="validation-item-warning">
        <code>${escapeHtml(v.pattern)}</code> (optional artifact)
        ${v.reason ? `<span class="text-muted">- ${escapeHtml(v.reason)}</span>` : ""}
      </li>`;
    });

    // Log artifact type violations
    result.missingRequiredLogArtifacts?.forEach((v) => {
      content += `<li class="validation-item-error">
        <code>${escapeHtml(v.type)}</code> (required log artifact type)
        ${v.matchJobName ? `<span class="text-muted">in jobs matching "${escapeHtml(v.matchJobName)}"</span>` : ""}
        ${v.reason ? `<span class="text-muted">- ${escapeHtml(v.reason)}</span>` : ""}
      </li>`;
    });

    result.missingOptionalLogArtifacts?.forEach((v) => {
      content += `<li class="validation-item-warning">
        <code>${escapeHtml(v.type)}</code> (optional log artifact type)
        ${v.matchJobName ? `<span class="text-muted">in jobs matching "${escapeHtml(v.matchJobName)}"</span>` : ""}
        ${v.reason ? `<span class="text-muted">- ${escapeHtml(v.reason)}</span>` : ""}
      </li>`;
    });

    content += "</ul></div>";
  });

  content += "</div></div>";

  return renderExpandableSection(
    "validation",
    "Validation Results",
    content,
    true,
  );
}

function renderRunsTable(data: Summary): string {
  const columns: TableColumn[] = [
    {
      key: "expand",
      label: "",
      sortable: false,
      render: () => '<span class="row-toggle">▶</span>',
    },
    { key: "workflowName", label: "Workflow" },
    {
      key: "runId",
      label: "Run ID",
      render: (val, row) => {
        const runUrl = `https://github.com/${data.repo}/actions/runs/${val}`;
        return `<a href="${runUrl}" target="_blank" rel="noopener noreferrer">${val}</a>`;
      },
    },
    {
      key: "conclusion",
      label: "Status",
      render: (val) => renderStatusBadge(val),
    },
    { key: "artifactCount", label: "Artifacts" },
    { key: "logCount", label: "Logs" },
    {
      key: "hasValidation",
      label: "Validation",
      render: (val, row) => {
        if (!row.validationResult) return "";
        const req = row.validationResult.missingRequired.length;
        const opt = row.validationResult.missingOptional.length;
        if (req > 0)
          return `<span class="validation-badge-error">${req} required</span>`;
        if (opt > 0)
          return `<span class="validation-badge-warning">${opt} optional</span>`;
        return "";
      },
    },
  ];

  const rows = data.runs.map((run) => ({
    workflowName: run.workflowName,
    runId: run.runId,
    conclusion: run.conclusion,
    artifactCount: run.artifacts.length,
    logCount: run.logs.length,
    hasValidation: run.validationResult ? "yes" : "no",
    validationResult: run.validationResult,
    artifacts: run.artifacts,
    logs: run.logs,
    repo: data.repo,
  }));

  let html = renderTable(columns, rows, {
    id: "runs-table",
    sortable: true,
  });

  return html;
}
