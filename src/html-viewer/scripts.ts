/**
 * JavaScript for HTML viewer interactivity
 */

export function getScripts(): string {
  return `
${getTabScripts()}
${getTreeScripts()}
${getPreviewScripts()}
${getTableScripts()}
${getArtifactCardScripts()}
${getUtilityScripts()}
`;
}

function getTabScripts(): string {
  return `
// Tab switching
document.addEventListener('click', (e) => {
  const tabBtn = e.target.closest('.tab-btn');
  if (tabBtn) {
    const tabName = tabBtn.dataset.tab;

    // Update button states
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update content visibility
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.dataset.tabContent === tabName);
    });
  }
});
`;
}

function getTreeScripts(): string {
  return `
// Toggle directory expansion
document.addEventListener('click', (e) => {
  const toggle = e.target.closest('.toggle');
  if (toggle && toggle.closest('.tree-node.directory')) {
    const node = toggle.closest('.tree-node');
    const children = node.querySelector('.children');
    if (children) {
      children.classList.toggle('hidden');
      toggle.textContent = children.classList.contains('hidden') ? '▶' : '▼';
    }
  }
});
`;
}

function getPreviewScripts(): string {
  return `
let currentView = 'rich'; // 'rich' or 'raw'
let currentFilePath = null;
let currentFileContent = null;

// Preview file - click on file row
document.addEventListener('click', (e) => {
  const fileNode = e.target.closest('.tree-node.file.clickable');
  if (fileNode) {
    const path = fileNode.dataset.path;
    const content = window.fileData[path];
    const filename = path.split('/').pop();
    
    currentFilePath = path;
    currentFileContent = content;
    
    showPreview(filename, path, content);
  }
});

function showPreview(filename, path, content) {
  const panel = document.querySelector('.preview-panel');
  const title = document.querySelector('.preview-title');
  const contentDiv = document.querySelector('.preview-content');
  
  title.textContent = filename;
  
  // Check if this is a special JSON file
  const isSpecialJson = ['summary.json', 'catalog.json', 'artifacts.json'].includes(filename);
  
  // Add/update view toggle buttons
  let controls = document.querySelector('.preview-controls');
  if (!controls) {
    controls = document.createElement('div');
    controls.className = 'preview-controls';
    document.querySelector('.preview-header').insertBefore(
      controls,
      document.querySelector('.close-btn')
    );
  }
  
  if (isSpecialJson) {
    controls.innerHTML = \`
      <div class="view-toggle">
        <button class="view-toggle-btn \${currentView === 'rich' ? 'active' : ''}" data-view="rich">Rich View</button>
        <button class="view-toggle-btn \${currentView === 'raw' ? 'active' : ''}" data-view="raw">Raw JSON</button>
      </div>
    \`;
  } else {
    controls.innerHTML = '';
    currentView = 'raw'; // Always show raw for non-special files
  }
  
  renderPreviewContent(filename, path, content, isSpecialJson);
  panel.classList.remove('hidden');
}

function renderPreviewContent(filename, path, content, isSpecialJson) {
  const contentDiv = document.querySelector('.preview-content');
  
  if (!content) {
    contentDiv.className = 'preview-content';
    contentDiv.innerHTML = '<p>Preview not available. File too large or not embedded.</p>';
    return;
  }
  
  if (isSpecialJson && currentView === 'rich') {
    contentDiv.className = 'preview-content';
    try {
      const data = JSON.parse(content);
      contentDiv.innerHTML = renderSpecialJson(filename, data);
    } catch (e) {
      contentDiv.className = 'preview-content raw-view';
      contentDiv.innerHTML = '<pre>Error parsing JSON: ' + e.message + '</pre>';
    }
  } else {
    // Raw view
    contentDiv.className = 'preview-content raw-view';
    if (path.endsWith('.json')) {
      try {
        const parsed = JSON.parse(content);
        const formatted = JSON.stringify(parsed, null, 2);
        contentDiv.innerHTML = '<pre>' + syntaxHighlightJson(formatted) + '</pre>';
      } catch (e) {
        contentDiv.innerHTML = '<pre>' + escapeHtml(content) + '</pre>';
      }
    } else {
      contentDiv.innerHTML = '<pre>' + escapeHtml(content) + '</pre>';
    }
  }
}

function renderSpecialJson(filename, data) {
  if (filename === 'summary.json') {
    return renderSummaryRich(data);
  } else if (filename === 'catalog.json') {
    return renderCatalogRich(data);
  } else if (filename === 'artifacts.json') {
    return renderArtifactsRich(data);
  }
  return '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
}

// View toggle handler
document.addEventListener('click', (e) => {
  const toggleBtn = e.target.closest('.view-toggle-btn');
  if (toggleBtn) {
    const view = toggleBtn.dataset.view;
    currentView = view;
    
    // Update button states
    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    // Re-render content
    const filename = currentFilePath.split('/').pop();
    const isSpecialJson = ['summary.json', 'catalog.json', 'artifacts.json'].includes(filename);
    renderPreviewContent(filename, currentFilePath, currentFileContent, isSpecialJson);
  }
});

// Close preview
document.addEventListener('click', (e) => {
  if (e.target.closest('.close-btn')) {
    document.querySelector('.preview-panel').classList.add('hidden');
    currentFilePath = null;
    currentFileContent = null;
    currentView = 'rich';
  }
});

// Prevent action buttons from triggering file preview
document.addEventListener('click', (e) => {
  if (e.target.closest('.file-actions')) {
    e.stopPropagation();
  }
});

// Copy path to clipboard
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.copy-path-btn');
  if (btn) {
    const path = btn.dataset.path;
    navigator.clipboard.writeText(path).then(() => {
      const originalText = btn.textContent;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove('copied');
      }, 2000);
    });
  }
});

// Expandable sections
document.addEventListener('click', (e) => {
  const header = e.target.closest('.section-header');
  if (header) {
    const sectionId = header.dataset.section;
    const content = document.querySelector(\`[data-section-content="\${sectionId}"]\`);
    const toggle = header.querySelector('.toggle');
    
    if (content) {
      content.classList.toggle('hidden');
      toggle.textContent = content.classList.contains('hidden') ? '▶' : '▼';
    }
  }
});
`;
}

function getTableScripts(): string {
  return `
// Table sorting
document.addEventListener('click', (e) => {
  const th = e.target.closest('th.sortable');
  if (th) {
    const table = th.closest('table');
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr:not(.expanded-row)'));
    const key = th.dataset.key;
    const currentSort = th.classList.contains('sorted-asc') ? 'asc' : 
                        th.classList.contains('sorted-desc') ? 'desc' : 'none';
    
    // Clear other column sorts
    table.querySelectorAll('th').forEach(h => {
      h.classList.remove('sorted-asc', 'sorted-desc');
    });
    
    // Determine new sort direction
    const newSort = currentSort === 'none' ? 'asc' : 
                    currentSort === 'asc' ? 'desc' : 'asc';
    th.classList.add('sorted-' + newSort);
    
    // Sort rows
    rows.sort((a, b) => {
      const aData = JSON.parse(a.dataset.row);
      const bData = JSON.parse(b.dataset.row);
      const aVal = aData[key];
      const bVal = bData[key];
      
      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal || '').localeCompare(String(bVal || ''));
      }
      
      return newSort === 'asc' ? comparison : -comparison;
    });
    
    // Re-append rows
    rows.forEach(row => tbody.appendChild(row));
  }
});

// Table search
document.addEventListener('input', (e) => {
  const search = e.target.closest('.table-search');
  if (search) {
    const tableId = search.dataset.table;
    const table = document.getElementById(tableId);
    const query = search.value.toLowerCase();
    
    const rows = table.querySelectorAll('tbody tr:not(.expanded-row)');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      if (text.includes(query)) {
        row.classList.remove('filtered-out');
      } else {
        row.classList.add('filtered-out');
        // Close expanded row if open
        const next = row.nextElementSibling;
        if (next && next.classList.contains('expanded-row')) {
          next.remove();
          row.querySelector('.row-toggle').textContent = '▶';
        }
      }
    });
  }
});

// Table filtering
document.addEventListener('change', (e) => {
  const filter = e.target.closest('.table-filter');
  if (filter) {
    const tableId = filter.dataset.table;
    const filterKey = filter.dataset.filter;
    const filterValue = filter.value;
    const table = document.getElementById(tableId);
    
    const rows = table.querySelectorAll('tbody tr:not(.expanded-row)');
    rows.forEach(row => {
      const rowData = JSON.parse(row.dataset.row);
      const cellValue = rowData[filterKey];
      
      if (!filterValue || String(cellValue) === filterValue) {
        row.classList.remove('filtered-out');
      } else {
        row.classList.add('filtered-out');
        // Close expanded row if open
        const next = row.nextElementSibling;
        if (next && next.classList.contains('expanded-row')) {
          next.remove();
          row.querySelector('.row-toggle').textContent = '▶';
        }
      }
    });
  }
});

// Type card filtering (catalog view)
document.addEventListener('click', (e) => {
  const typeCard = e.target.closest('.type-card');
  if (typeCard) {
    const type = typeCard.dataset.type;
    const table = document.getElementById('catalog-table');
    const filter = table.closest('.table-container').querySelector('.table-filter[data-filter="detectedType"]');
    
    if (filter) {
      filter.value = type;
      filter.dispatchEvent(new Event('change'));
    }
  }
});

// Status card filtering (artifacts view)
document.addEventListener('click', (e) => {
  const statusCard = e.target.closest('.status-card');
  if (statusCard) {
    const status = statusCard.dataset.status;
    const table = document.getElementById('artifacts-table');
    const filter = table.closest('.table-container').querySelector('.table-filter[data-filter="status"]');
    
    if (filter) {
      filter.value = status;
      filter.dispatchEvent(new Event('change'));
    }
  }
});

// Row toggle for summary runs table (inside rich view)
document.addEventListener('click', (e) => {
  const toggle = e.target.closest('.row-toggle');
  if (toggle) {
    const row = toggle.closest('tr');
    const nextRow = row.nextElementSibling;
    
    if (nextRow && nextRow.classList.contains('expanded-row')) {
      // Collapse
      nextRow.remove();
      toggle.textContent = '▶';
    } else {
      // Expand
      const rowData = JSON.parse(row.dataset.row);
      const detailRow = document.createElement('tr');
      detailRow.className = 'expanded-row';
      detailRow.innerHTML = '<td colspan="7">' + renderRunDetails(rowData) + '</td>';
      row.after(detailRow);
      toggle.textContent = '▼';
    }
  }
});

function renderRunDetails(run) {
  let html = '<div class="run-details">';
  
  // Artifacts
  if (run.artifacts && run.artifacts.length > 0) {
    html += '<h4>Artifacts</h4>';
    html += '<table class="detail-table"><thead><tr>';
    html += '<th>Name</th><th>Status</th><th>Size</th><th>Type</th></tr></thead><tbody>';
    run.artifacts.forEach(a => {
      const statusBadge = '<span class="badge badge-' + a.downloadStatus + '">' + a.downloadStatus + '</span>';
      const size = a.sizeBytes ? formatBytes(a.sizeBytes) : '';
      const type = a.detectedType || '';
      html += '<tr><td>' + a.name + '</td><td>' + statusBadge + '</td><td>' + size + '</td><td>' + type + '</td></tr>';
    });
    html += '</tbody></table>';
  }
  
  // Logs
  if (run.logs && run.logs.length > 0) {
    html += '<h4>Logs</h4>';
    html += '<table class="detail-table"><thead><tr>';
    html += '<th>Job Name</th><th>Job Status</th><th>Download Status</th><th>Artifacts Extracted</th><th>GitHub Actions</th></tr></thead><tbody>';
    run.logs.forEach(l => {
      let jobStatusBadge = '';
      if (l.jobStatus) {
        jobStatusBadge = '<span class="badge badge-' + l.jobStatus + '">' + l.jobStatus + '</span>';
      }
      let statusBadge = '<span class="badge badge-' + l.extractionStatus + '"';
      if (l.skipReason) {
        statusBadge += ' title="' + escapeHtml(l.skipReason) + '" style="cursor: help;"';
      }
      statusBadge += '>' + l.extractionStatus + '</span>';
      const artifacts = l.linterOutputs ? l.linterOutputs.length : 0;
      let jobLink = '';
      if (l.jobId && run.repo && run.runId) {
        const jobUrl = 'https://github.com/' + run.repo + '/actions/runs/' + run.runId + '/job/' + l.jobId;
        jobLink = '<a href="' + jobUrl + '" target="_blank" rel="noopener noreferrer">View Logs</a>';
      }
      html += '<tr><td>' + l.jobName + '</td><td>' + jobStatusBadge + '</td><td>' + statusBadge + '</td><td>' + artifacts + '</td><td>' + jobLink + '</td></tr>';
    });
    html += '</tbody></table>';
  }
  
  // Validation
  if (run.validationResult) {
    html += '<h4>Validation Issues</h4>';
    const vr = run.validationResult;
    html += '<ul class="validation-list">';
    vr.missingRequired.forEach(v => {
      html += '<li class="validation-item-error"><code>' + v.pattern + '</code> (required)';
      if (v.reason) html += ' - ' + v.reason;
      html += '</li>';
    });
    vr.missingOptional.forEach(v => {
      html += '<li class="validation-item-warning"><code>' + v.pattern + '</code> (optional)';
      if (v.reason) html += ' - ' + v.reason;
      html += '</li>';
    });
    html += '</ul>';
  }
  
  html += '</div>';
  return html;
}
`;
}

function getArtifactCardScripts(): string {
  return `
// Artifact type card popup on mouseover
let artifactPopup = null;
let validationPopup = null;
let conversionPopup = null;
let headerPopup = null;

// Helper function to decode HTML entities
function decodeHtmlEntities(html) {
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

// Helper function to position popup near element
function positionPopup(popup, trigger) {
  const rect = trigger.getBoundingClientRect();
  popup.style.position = 'fixed';
  popup.style.top = (rect.bottom + 5) + 'px';
  popup.style.left = Math.max(10, rect.left) + 'px';
  popup.style.maxWidth = '400px';
  popup.style.zIndex = '10000';
}

document.addEventListener('mouseover', (e) => {
  const trigger = e.target.closest('.artifact-type-trigger');
  if (trigger && trigger.dataset.artifactCard) {
    // Hide any existing popup
    if (artifactPopup) {
      artifactPopup.remove();
    }

    // Create and show popup
    artifactPopup = document.createElement('div');
    artifactPopup.className = 'artifact-card-tooltip';

    // Decode the artifact card HTML
    const cardHtml = decodeHtmlEntities(trigger.dataset.artifactCard);
    artifactPopup.innerHTML = cardHtml;
    document.body.appendChild(artifactPopup);

    // Position popup near the trigger element
    positionPopup(artifactPopup, trigger);
  }
});

document.addEventListener('mouseout', (e) => {
  const trigger = e.target.closest('.artifact-type-trigger');
  if (trigger && artifactPopup) {
    // Check if we're moving to the popup itself
    if (!e.relatedTarget || !e.relatedTarget.closest('.artifact-card-tooltip')) {
      artifactPopup.remove();
      artifactPopup = null;
    }
  }
});

// Validation column tooltips
document.addEventListener('mouseover', (e) => {
  const trigger = e.target.closest('.validation-trigger');
  if (trigger && trigger.dataset.validationInfo) {
    // Hide any existing popup
    if (validationPopup) {
      validationPopup.remove();
    }

    // Create and show popup
    validationPopup = document.createElement('div');
    validationPopup.className = 'artifact-card-tooltip';

    // Decode the validation info HTML
    const infoHtml = decodeHtmlEntities(trigger.dataset.validationInfo);
    validationPopup.innerHTML = infoHtml;
    document.body.appendChild(validationPopup);

    // Position popup near the trigger element
    positionPopup(validationPopup, trigger);
  }
});

document.addEventListener('mouseout', (e) => {
  const trigger = e.target.closest('.validation-trigger');
  if (trigger && validationPopup) {
    // Check if we're moving to the popup itself
    if (!e.relatedTarget || !e.relatedTarget.closest('.artifact-card-tooltip')) {
      validationPopup.remove();
      validationPopup = null;
    }
  }
});

// Conversion column tooltips
document.addEventListener('mouseover', (e) => {
  const trigger = e.target.closest('.conversion-trigger');
  if (trigger && trigger.dataset.conversionInfo) {
    // Hide any existing popup
    if (conversionPopup) {
      conversionPopup.remove();
    }

    // Create and show popup
    conversionPopup = document.createElement('div');
    conversionPopup.className = 'artifact-card-tooltip';

    // Decode the conversion info HTML
    const infoHtml = decodeHtmlEntities(trigger.dataset.conversionInfo);
    conversionPopup.innerHTML = infoHtml;
    document.body.appendChild(conversionPopup);

    // Position popup near the trigger element
    positionPopup(conversionPopup, trigger);
  }
});

document.addEventListener('mouseout', (e) => {
  const trigger = e.target.closest('.conversion-trigger');
  if (trigger && conversionPopup) {
    // Check if we're moving to the popup itself
    if (!e.relatedTarget || !e.relatedTarget.closest('.artifact-card-tooltip')) {
      conversionPopup.remove();
      conversionPopup = null;
    }
  }
});

// Column header tooltips
document.addEventListener('mouseover', (e) => {
  const trigger = e.target.closest('.column-header-trigger');
  if (trigger && trigger.dataset.headerTooltip) {
    // Hide any existing popup
    if (headerPopup) {
      headerPopup.remove();
    }

    // Create and show popup
    headerPopup = document.createElement('div');
    headerPopup.className = 'artifact-card-tooltip';

    // Create header tooltip content
    const tooltipText = decodeHtmlEntities(trigger.dataset.headerTooltip);
    headerPopup.innerHTML = '<div class="header-tooltip"><p>' + tooltipText + '</p></div>';
    document.body.appendChild(headerPopup);

    // Position popup near the trigger element
    positionPopup(headerPopup, trigger);
  }
});

document.addEventListener('mouseout', (e) => {
  const trigger = e.target.closest('.column-header-trigger');
  if (trigger && headerPopup) {
    // Check if we're moving to the popup itself
    if (!e.relatedTarget || !e.relatedTarget.closest('.artifact-card-tooltip')) {
      headerPopup.remove();
      headerPopup = null;
    }
  }
});

// Keep popup visible when hovering over it
document.addEventListener('mouseenter', (e) => {
  const popup = e.target.closest('.artifact-card-tooltip');
  if (popup && (artifactPopup === popup || validationPopup === popup || conversionPopup === popup || headerPopup === popup)) {
    // Keep it alive
  }
}, true);

document.addEventListener('mouseleave', (e) => {
  const popup = e.target.closest('.artifact-card-tooltip');
  if (popup && (artifactPopup === popup || validationPopup === popup || conversionPopup === popup || headerPopup === popup)) {
    popup.remove();
    if (artifactPopup === popup) artifactPopup = null;
    if (validationPopup === popup) validationPopup = null;
    if (conversionPopup === popup) conversionPopup = null;
    if (headerPopup === popup) headerPopup = null;
  }
}, true);
`;
}

function getUtilityScripts(): string {
  return `
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

function syntaxHighlightJson(json) {
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(
    /(\\s*"[^"]+"):/g,
    '<span class="json-key">$1</span>:'
  ).replace(
    /: ("[^"]*")/g,
    ': <span class="json-string">$1</span>'
  ).replace(
    /: (-?\\d+\\.?\\d*)/g,
    ': <span class="json-number">$1</span>'
  ).replace(
    /: (true|false)/g,
    ': <span class="json-boolean">$1</span>'
  ).replace(
    /: (null)/g,
    ': <span class="json-null">$1</span>'
  );
}

// Rich renderers just return the pre-rendered HTML
function renderSummaryRich(data) {
  return window.__summaryRenderer;
}

function renderCatalogRich(data) {
  return window.__catalogRenderer;
}

function renderArtifactsRich(data) {
  return window.__artifactsRenderer;
}
`;
}
