export const STYLE_ELEMENT_ID = 'zcc-ext-codenod-styles';

export const CODENOD_STYLES = `
.cn-root {
  --cn-bg: var(--bg-base, #1e1e1e);
  --cn-card: var(--bg-panel, #252526);
  --cn-hover: var(--bg-hover, rgba(255, 255, 255, 0.06));
  --cn-selected: color-mix(in srgb, var(--accent, #007acc) 22%, transparent);
  --cn-border: var(--border, rgba(255, 255, 255, 0.08));
  --cn-border-strong: var(--border-strong, rgba(255, 255, 255, 0.16));
  --cn-text: var(--text-primary, #e6edf3);
  --cn-muted: var(--text-muted, #8a8a8a);
  --cn-accent: var(--accent, #007acc);
  --cn-danger: var(--danger, #e5534b);
  --cn-warn: #d29922;
  --cn-ok: var(--success, #3fb950);
  --cn-font: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
  --cn-mono: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  background: var(--cn-bg);
  color: var(--cn-text);
  font-family: var(--cn-font);
  font-size: 13px;
}
.cn-root *, .cn-root *::before, .cn-root *::after { box-sizing: border-box; }
.cn-toolbar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--cn-border); }
.cn-toolbar h1 { font-size: 14px; margin: 0 8px 0 0; font-weight: 600; }
.cn-spacer { flex: 1; }
.cn-muted { color: var(--cn-muted); }
.cn-small { font-size: 12px; }
.cn-mono { font-family: var(--cn-mono); }
.cn-btn {
  appearance: none; border: 1px solid var(--cn-border-strong); background: color-mix(in srgb, var(--cn-card) 70%, transparent); color: var(--cn-text);
  border-radius: 6px; padding: 5px 12px; font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s ease;
}
.cn-btn:hover:not(:disabled) { background: var(--cn-hover); border-color: var(--cn-border-strong); }
.cn-btn:active:not(:disabled) { transform: translateY(1px); }
.cn-btn:disabled { opacity: 0.45; cursor: default; }
.cn-btn:focus-visible, .cn-tab:focus-visible, .cn-row:focus-visible { outline: 2px solid var(--cn-accent); outline-offset: -2px; }
.cn-btn-primary { background: var(--cn-accent); border-color: var(--cn-accent); color: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.18); }
.cn-btn-primary:hover:not(:disabled) { background: var(--cn-accent); filter: brightness(1.12); border-color: var(--cn-accent); }
.cn-btn-warn { border-color: var(--cn-warn); color: var(--cn-warn); background: color-mix(in srgb, var(--cn-warn) 10%, transparent); }
.cn-btn-danger { border-color: color-mix(in srgb, var(--cn-danger) 40%, transparent); color: var(--cn-danger); }
.cn-btn-danger:hover:not(:disabled) { background: color-mix(in srgb, var(--cn-danger) 12%, transparent); border-color: var(--cn-danger); }
.cn-btn.cn-small { padding: 3px 8px; font-size: 12px; }
.cn-input, .cn-select, .cn-textarea {
  background: var(--cn-card); color: var(--cn-text); border: 1px solid var(--cn-border-strong);
  border-radius: 6px; padding: 5px 10px; font: inherit; font-size: 13px; min-width: 0;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.cn-input { height: 34px; }
.cn-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  height: 34px;
  padding: 5px 30px 5px 10px;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238a8a8a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}
.cn-select.cn-small { height: 28px; padding: 2px 24px 2px 8px; font-size: 12px; }
.cn-input:hover:not(:disabled), .cn-select:hover:not(:disabled), .cn-textarea:hover:not(:disabled) { border-color: var(--cn-accent); }
.cn-input:focus-visible, .cn-select:focus-visible, .cn-textarea:focus-visible {
  outline: none; border-color: var(--cn-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--cn-accent) 25%, transparent);
}
.cn-input:disabled, .cn-select:disabled, .cn-textarea:disabled { opacity: 0.5; cursor: not-allowed; }
.cn-textarea { width: 100%; min-height: 60px; resize: vertical; line-height: 1.5; }
.cn-body { display: flex; flex: 1; min-height: 0; }
.cn-list { width: clamp(260px, 36%, 460px); border-right: 1px solid var(--cn-border); display: flex; flex-direction: column; min-height: 0; }
.cn-tabs { display: flex; gap: 2px; padding: 6px 8px 0; border-bottom: 1px solid var(--cn-border); }
.cn-tab {
  appearance: none; background: transparent; border: none; border-bottom: 2px solid transparent; color: var(--cn-muted);
  padding: 6px 10px; font: inherit; cursor: pointer;
}
.cn-tab[aria-selected="true"] { color: var(--cn-text); border-bottom-color: var(--cn-accent); }
.cn-count { margin-left: 6px; font-size: 11px; padding: 1px 6px; border-radius: 10px; background: var(--cn-hover); border: 1px solid var(--cn-border); }
.cn-search { padding: 8px; }
.cn-search .cn-input { width: 100%; }
.cn-rows { list-style: none; margin: 0; padding: 0; overflow: auto; flex: 1; }
.cn-row { display: block; width: 100%; text-align: left; padding: 8px 12px; border: none; border-bottom: 1px solid var(--cn-border); background: transparent; color: inherit; font: inherit; cursor: pointer; }
.cn-row:hover { background: var(--cn-hover); }
.cn-row[aria-current="true"] { background: var(--cn-selected); }
.cn-row-title { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cn-row-meta { display: flex; gap: 8px; align-items: center; margin-top: 4px; color: var(--cn-muted); font-size: 12px; flex-wrap: wrap; }
.cn-badge { display: inline-flex; align-items: center; gap: 4px; padding: 1px 6px; border-radius: 10px; font-size: 11px; border: 1px solid var(--cn-border-strong); white-space: nowrap; }
.cn-draft { margin-right: 6px; }
.cn-badge-ok { color: var(--cn-ok); border-color: color-mix(in srgb, var(--cn-ok) 50%, transparent); background: color-mix(in srgb, var(--cn-ok) 8%, transparent); }
.cn-badge-warn { color: var(--cn-warn); border-color: color-mix(in srgb, var(--cn-warn) 50%, transparent); background: color-mix(in srgb, var(--cn-warn) 8%, transparent); }
.cn-badge-danger { color: var(--cn-danger); border-color: color-mix(in srgb, var(--cn-danger) 50%, transparent); background: color-mix(in srgb, var(--cn-danger) 8%, transparent); }
.cn-badge-muted { color: var(--cn-muted); border-color: var(--cn-border); }
.cn-detail { flex: 1; min-width: 0; display: flex; flex-direction: column; min-height: 0; }
.cn-detail-scroll { flex: 1; overflow: auto; padding: 16px; }
.cn-empty { padding: 32px; text-align: center; color: var(--cn-muted); }
.cn-header h2 { font-size: 16px; margin: 0 0 4px; }
.cn-scores { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
.cn-score { border: 1px solid var(--cn-border-strong); border-radius: 8px; padding: 6px 10px; min-width: 110px; background: var(--cn-card); }
.cn-score-label { font-size: 11px; color: var(--cn-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.cn-score-value { font-size: 18px; font-weight: 600; }
.cn-summary { line-height: 1.5; margin: 8px 0 12px; }
.cn-actions { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 16px; border-top: 1px solid var(--cn-border); align-items: center; }
.cn-findings { padding-top: 14px; }
.cn-finding-filters { padding-bottom: 12px; margin-bottom: 14px; border-bottom: 1px solid var(--cn-border-strong); }
.cn-filter-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.cn-filter { display: inline-flex; align-items: center; gap: 6px; border: 1px solid transparent; border-radius: 20px; background: var(--cn-hover); color: var(--cn-muted); padding: 5px 12px; font: inherit; font-size: 12px; cursor: pointer; }
.cn-filter[aria-pressed="true"] { background: var(--cn-selected); border-color: var(--cn-accent); color: var(--cn-text); }
.cn-filter:hover:not(:disabled) { color: var(--cn-text); border-color: var(--cn-border-strong); }
.cn-filter:disabled, .cn-text-btn:disabled, .cn-icon-btn:disabled, .cn-file-toggle:disabled { opacity: 0.5; cursor: default; }
.cn-finding-tools { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding-top: 4px; }
.cn-finding-tools .cn-btn { display: inline-flex; gap: 5px; align-items: center; }
.cn-file-group { margin-bottom: 16px; min-width: 0; }
.cn-file-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; border-radius: 6px; background: var(--cn-hover); }
.cn-file-toggle { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; padding: 9px 10px; border: 0; background: transparent; color: var(--cn-text); text-align: left; font: inherit; cursor: pointer; }
.cn-file-name { font-family: var(--cn-mono); font-size: 12px; overflow-wrap: anywhere; }
.cn-file-chevron { display: flex; }
.cn-file-toggle[aria-expanded="true"] .cn-file-chevron { transform: rotate(90deg); }
.cn-file-link { color: var(--cn-muted); padding: 8px 12px; text-decoration: none; }
.cn-file-findings { display: flex; flex-direction: column; gap: 12px; }
.cn-finding, .cn-filter { --cn-severity: #4c79ff; --cn-dot: #38bdf8; --cn-fill: #5279ff; --cn-fill-amount: 32%; }
.cn-finding-critical, .cn-filter-critical { --cn-severity: #dc2626; --cn-dot: #f87171; --cn-fill: #dc2626; }
.cn-finding-high, .cn-filter-high { --cn-severity: #ea580c; --cn-dot: #fb923c; --cn-fill: #d96935; }
.cn-finding-medium, .cn-filter-medium { --cn-severity: #dc9300; --cn-dot: #facc15; --cn-fill: #ed873f; }
:root[data-theme='light'] .cn-finding { --cn-fill-amount: 9%; }
:root[data-theme='light'] .cn-filter, :root[data-theme='light'] .cn-finding { --cn-dot: var(--cn-severity); }
.cn-finding { border: 1px solid var(--cn-severity); border-radius: 8px; padding: 12px; background: color-mix(in srgb, var(--cn-fill) var(--cn-fill-amount), var(--cn-card)); overflow: hidden; min-width: 0; }
.cn-finding-head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 6px; }
.cn-severity-dot { display: inline-block; width: 8px; height: 8px; flex: 0 0 8px; border-radius: 50%; background: var(--cn-dot); }
.cn-severity-label { font-size: 12px; font-weight: 650; }
.cn-category { padding: 3px 6px; border-radius: 3px; background: color-mix(in srgb, var(--cn-bg) 65%, transparent); color: var(--cn-text); font-size: 10px; letter-spacing: 0.05em; text-transform: uppercase; line-height: 1.2; }
.cn-model-agreement { color: var(--cn-text); background: color-mix(in srgb, var(--cn-bg) 30%, transparent); white-space: normal; overflow-wrap: anywhere; }
.cn-finding-select { display: inline-flex; align-items: center; gap: 4px; color: var(--cn-muted); font-size: 11px; cursor: pointer; }
.cn-finding-select input { accent-color: var(--cn-accent); }
.cn-finding-location { color: inherit; font-size: 11px; text-decoration: none; }
.cn-finding-location:hover, .cn-file-link:hover { text-decoration: underline; }
.cn-finding-description { margin: 6px 0 0; font-size: 14px; line-height: 1.6; overflow-wrap: anywhere; white-space: pre-wrap; }
.cn-finding-description code { font-family: var(--cn-mono); font-size: 0.94em; }
.cn-suggested-fix { margin-top: 8px; border: 1px dashed color-mix(in srgb, var(--cn-ok) 70%, var(--cn-text)); border-radius: 3px; background: color-mix(in srgb, var(--cn-ok) 7%, transparent); overflow: hidden; }
.cn-suggested-fix-header { display: flex; gap: 6px; align-items: center; padding: 6px 12px; border-bottom: 1px solid color-mix(in srgb, var(--cn-ok) 40%, var(--cn-border)); background: color-mix(in srgb, var(--cn-ok) 18%, transparent); color: color-mix(in srgb, var(--cn-ok) 65%, var(--cn-text)); font-size: 11px; }
.cn-suggested-fix pre { margin: 0; padding: 8px 12px; font: 12px/1.65 var(--cn-mono); white-space: pre-wrap; overflow-wrap: anywhere; }
.cn-icon { flex: 0 0 auto; vertical-align: middle; }
.cn-icon-btn, .cn-text-btn { display: inline-flex; align-items: center; justify-content: center; gap: 4px; border: 0; border-radius: 4px; background: transparent; color: inherit; cursor: pointer; font: inherit; font-size: 12px; }
.cn-icon-btn { padding: 3px; }
.cn-text-btn { padding: 4px 6px; }
.cn-icon-btn:hover:not(:disabled), .cn-text-btn:hover:not(:disabled) { background: var(--cn-hover); }
.cn-finding-footer { display: flex; align-items: center; gap: 10px; margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--cn-border-strong); }
.cn-finding-editor { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.cn-finding-editor label { font-size: 12px; font-weight: 600; }
.cn-finding-editor .cn-textarea { padding: 8px 10px; line-height: 1.6; }
.cn-finding-editor [role="alert"] { color: var(--cn-text); padding: 8px; border: 1px solid var(--cn-danger); border-radius: 4px; }
.cn-undo { display: flex; gap: 12px; align-items: center; justify-content: space-between; border: 1px solid var(--cn-border-strong); border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; background: var(--cn-card); }
.cn-context-unavailable { margin: 8px 0; }
.cn-snippet { border: 1px solid var(--cn-border-strong); border-radius: 5px; margin: 8px 0; background: var(--cn-bg); overflow: auto; font: 11px/1.8 var(--cn-mono); }
.cn-snippet-line { display: flex; min-width: max-content; }
.cn-snippet-line[data-target="true"] { box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--cn-warn) 75%, transparent); }
.cn-line-number { width: 42px; flex: 0 0 42px; text-align: right; padding-right: 8px; color: var(--cn-muted); border-right: 1px solid var(--cn-border-strong); user-select: none; }
.cn-line-sign { width: 20px; flex: 0 0 20px; text-align: center; color: var(--cn-muted); user-select: none; }
.cn-snippet-line code { white-space: pre; padding-right: 12px; font: inherit; }
.cn-filter:focus-visible, .cn-text-btn:focus-visible, .cn-icon-btn:focus-visible, .cn-file-toggle:focus-visible, .cn-file-link:focus-visible, .cn-snippet:focus-visible { outline: 2px solid var(--cn-accent); outline-offset: 2px; }
.cn-sev-critical { color: var(--cn-danger); font-weight: 600; }
.cn-sev-high { color: var(--cn-danger); }
.cn-sev-medium { color: var(--cn-warn); }
.cn-sev-low { color: var(--cn-muted); }
.cn-banner { margin: 8px 0 16px; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--cn-border-strong); background: var(--cn-card); font-size: 13px; line-height: 1.5; }
.cn-banner-warn { border-color: var(--cn-warn); background: color-mix(in srgb, var(--cn-warn) 12%, var(--cn-bg)); }
.cn-banner-warn strong, .cn-banner-warn code { color: var(--cn-warn); }
.cn-banner-warn p { margin: 6px 0 0; }
.cn-banner-warn code { overflow-wrap: anywhere; }
.cn-banner-watch { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.cn-banner-error { border-color: var(--cn-danger); background: color-mix(in srgb, var(--cn-danger) 10%, var(--cn-card)); color: var(--cn-text); }
.cn-table { width: 100%; border-collapse: collapse; }
.cn-table th, .cn-table td { text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--cn-border); vertical-align: middle; }
.cn-table th { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--cn-muted); background: color-mix(in srgb, var(--cn-bg) 50%, var(--cn-card)); }
.cn-table-wrap { border: 1px solid var(--cn-border); border-radius: 8px; overflow: hidden; }
.cn-diff { font-family: var(--cn-mono); font-size: 12px; white-space: pre; overflow: auto; border: 1px solid var(--cn-border); border-radius: 6px; margin: 6px 0 14px; }
.cn-diff-line { padding: 0 8px; }
.cn-diff-add { background: color-mix(in srgb, var(--cn-ok) 14%, transparent); }
.cn-diff-del { background: color-mix(in srgb, var(--cn-danger) 14%, transparent); }
.cn-diff-hunk { color: var(--cn-muted); background: var(--cn-hover); }

/* Settings Layout */
.cn-settings { padding: 24px 28px; overflow: auto; flex: 1; max-width: 900px; width: 100%; margin: 0 auto; }
.cn-segmented, .cn-settings-tabs {
  display: inline-flex; flex-wrap: wrap; gap: 4px; padding: 4px;
  background: color-mix(in srgb, var(--cn-card) 60%, var(--cn-bg));
  border: 1px solid var(--cn-border); border-radius: 8px;
}
.cn-settings-tabs { margin-bottom: 24px; }
.cn-segmented .cn-tab, .cn-settings-tabs .cn-tab {
  appearance: none; background: transparent; border: none; border-bottom: none;
  color: var(--cn-muted); padding: 7px 16px; font: inherit; font-size: 13px; font-weight: 500;
  border-radius: 6px; cursor: pointer; transition: all 0.15s ease;
}
.cn-segmented .cn-tab:hover:not([aria-selected="true"]):not([aria-checked="true"]):not(:disabled),
.cn-settings-tabs .cn-tab:hover:not([aria-selected="true"]) { color: var(--cn-text); background: var(--cn-hover); }
.cn-segmented .cn-tab[aria-selected="true"], .cn-segmented .cn-tab[aria-checked="true"], .cn-settings-tabs .cn-tab[aria-selected="true"] {
  color: var(--cn-text); background: var(--cn-card); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.16); font-weight: 600;
}
.cn-segmented .cn-tab:disabled { opacity: 0.5; cursor: default; }
.cn-segmented .cn-tab:focus-visible { outline: 2px solid var(--cn-accent); outline-offset: -2px; }
.cn-mode-switch { padding: 2px; gap: 2px; }
.cn-mode-switch .cn-tab { padding: 4px 12px; font-size: 12px; }
.cn-settings-panel[hidden] { display: none; }

.cn-section {
  background: var(--cn-card); border: 1px solid var(--cn-border);
  border-radius: 10px; padding: 20px 22px; margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.cn-section h3 {
  font-size: 15px; font-weight: 600; margin: 0 0 6px; color: var(--cn-text);
  letter-spacing: -0.01em; text-transform: none;
}
.cn-section > p.cn-muted { margin: 0 0 16px; font-size: 13px; line-height: 1.5; color: var(--cn-muted); }

.cn-inline { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.cn-status-saved {
  color: var(--cn-ok); display: inline-flex; align-items: center; gap: 5px;
  font-weight: 500; font-size: 12px; padding: 3px 8px; border-radius: 12px;
  background: color-mix(in srgb, var(--cn-ok) 12%, transparent);
}
.cn-check {
  display: inline-flex; align-items: center; gap: 10px; padding: 8px 12px;
  border-radius: 6px; background: color-mix(in srgb, var(--cn-hover) 80%, transparent);
  border: 1px solid var(--cn-border); cursor: pointer; user-select: none; transition: all 0.15s ease;
}
.cn-check:hover { background: var(--cn-hover); border-color: var(--cn-border-strong); }
.cn-check input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--cn-accent); margin: 0; cursor: pointer; }
.cn-checkbox-group { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }

.cn-fields { display: flex; flex-direction: column; gap: 14px; margin-bottom: 12px; }
.cn-field { display: flex; flex-direction: column; gap: 5px; align-items: flex-start; }
.cn-field > label, .cn-field > span:first-child {
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--cn-muted);
}
.cn-field .cn-select { max-width: 420px; width: 100%; }

.cn-number-wrap { display: inline-flex; align-items: center; gap: 8px; }
.cn-number { width: 90px; }
.cn-number-badge {
  font-size: 11px; color: var(--cn-muted); font-family: var(--cn-mono);
  padding: 2px 6px; border-radius: 4px; background: var(--cn-hover); border: 1px solid var(--cn-border);
}

/* Model Priority Setting UI */
.cn-model-priority {
  margin: 0 0 20px; padding: 16px 18px; border: 1px solid var(--cn-border-strong);
  border-radius: 8px; background: color-mix(in srgb, var(--cn-bg) 40%, var(--cn-card));
}
.cn-model-priority h4 { margin: 0 0 4px; font-size: 14px; font-weight: 600; color: var(--cn-text); }
.cn-model-omitted-notice {
  display: flex; gap: 8px; align-items: flex-start; padding: 8px 12px; margin: 10px 0 14px;
  border-radius: 6px; font-size: 12px; line-height: 1.45;
  background: color-mix(in srgb, var(--cn-warn) 10%, var(--cn-card));
  border: 1px solid color-mix(in srgb, var(--cn-warn) 30%, transparent); color: var(--cn-text);
}
.cn-model-omitted-notice .cn-icon { color: var(--cn-warn); margin-top: 1px; }
.cn-model-omitted-notice p { margin: 0 0 4px; }
.cn-model-omitted-notice ul { margin: 0; padding-left: 18px; }
.cn-model-omitted-notice li + li { margin-top: 4px; }
.cn-model-omitted-notice details { margin-top: 2px; }
.cn-model-omitted-notice summary { cursor: pointer; color: var(--cn-muted); }
.cn-model-omitted-notice code { overflow-wrap: anywhere; }

.cn-priority-list { display: flex; flex-direction: column; gap: 10px; list-style: none; margin: 12px 0 14px; padding: 0; }
.cn-priority-row {
  display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; padding: 10px 12px;
  border: 1px solid var(--cn-border); border-radius: 8px; background: var(--cn-card);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.cn-priority-row:hover { border-color: var(--cn-border-strong); }
.cn-priority-coordinator {
  border-color: color-mix(in srgb, var(--cn-accent) 40%, var(--cn-border));
  background: color-mix(in srgb, var(--cn-accent) 4%, var(--cn-card));
}
.cn-priority-rank-wrap { display: flex; align-items: center; justify-content: center; height: 34px; margin-bottom: 1px; }
.cn-priority-rank {
  display: inline-flex; width: 28px; height: 28px; align-items: center; justify-content: center;
  border-radius: 6px; background: var(--cn-hover); border: 1px solid var(--cn-border);
  color: var(--cn-muted); font-size: 12px; font-weight: 700; font-family: var(--cn-mono);
}
.cn-priority-rank-first {
  background: var(--cn-accent); border-color: var(--cn-accent); color: #fff;
  box-shadow: 0 1px 3px color-mix(in srgb, var(--cn-accent) 40%, transparent);
}
.cn-priority-rank-add {
  background: color-mix(in srgb, var(--cn-accent) 15%, transparent);
  border-color: color-mix(in srgb, var(--cn-accent) 30%, transparent); color: var(--cn-accent);
}

.cn-priority-provider-field { flex: 1.2; min-width: 140px; margin: 0; }
.cn-priority-model-field { flex: 2.2; min-width: 220px; margin: 0; }
.cn-priority-reasoning-field { flex: 0.9; min-width: 110px; margin: 0; }
.cn-priority-row .cn-select, .cn-priority-add-row .cn-select { width: 100%; max-width: none; }

.cn-priority-controls { display: inline-flex; gap: 4px; align-items: center; height: 34px; margin-bottom: 1px; }
.cn-priority-btn {
  width: 32px; height: 32px; padding: 0; border-radius: 6px;
  border: 1px solid var(--cn-border); background: color-mix(in srgb, var(--cn-card) 70%, transparent);
  color: var(--cn-muted); cursor: pointer; transition: all 0.15s ease;
}
.cn-priority-btn:hover:not(:disabled) {
  color: var(--cn-text); background: var(--cn-hover); border-color: var(--cn-border-strong);
}
.cn-priority-btn-remove:hover:not(:disabled) {
  color: var(--cn-danger); border-color: color-mix(in srgb, var(--cn-danger) 40%, transparent);
  background: color-mix(in srgb, var(--cn-danger) 12%, transparent);
}
.cn-priority-btn .cn-btn-label {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}

.cn-priority-add-row {
  border: 1px dashed var(--cn-accent);
  background: color-mix(in srgb, var(--cn-accent) 5%, var(--cn-card));
  display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; padding: 10px 12px; border-radius: 8px;
}
.cn-btn-add-model {
  width: 100%; border: 1px dashed var(--cn-border-strong); background: transparent;
  padding: 8px 14px; border-radius: 8px; color: var(--cn-muted); font-size: 13px; font-weight: 500;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s ease;
}
.cn-btn-add-model:hover {
  border-color: var(--cn-accent); color: var(--cn-accent);
  background: color-mix(in srgb, var(--cn-accent) 8%, transparent);
}

/* Profile / Accounts */
.cn-accounts, .cn-host-list { list-style: none; margin: 0 0 12px; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.cn-account {
  display: flex; gap: 14px; align-items: center; padding: 12px 16px;
  border: 1px solid var(--cn-border); border-radius: 8px; background: var(--cn-card);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.cn-account-body { display: flex; flex-direction: column; gap: 3px; flex: 1; }
.cn-account-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.cn-account-name { font-weight: 600; font-size: 14px; }
.cn-avatar {
  width: 42px; height: 42px; flex: none; border-radius: 50%;
  border: 1px solid var(--cn-border-strong); background: var(--cn-hover); object-fit: cover;
}
.cn-badge-auth {
  font-size: 10.5px; font-weight: 500; padding: 1px 7px; border-radius: 10px;
  background: var(--cn-hover); border: 1px solid var(--cn-border); color: var(--cn-muted);
}
.cn-instructions {
  min-height: 140px; font-family: var(--cn-mono); font-size: 12.5px; line-height: 1.6;
  padding: 10px 12px; margin-bottom: 10px; border-radius: 8px;
}
.cn-prompt {
  margin-top: 16px; border: 1px solid var(--cn-border); border-radius: 8px;
  background: color-mix(in srgb, var(--cn-bg) 40%, var(--cn-card)); overflow: hidden;
}
.cn-prompt summary {
  cursor: pointer; color: var(--cn-accent); font-weight: 500; font-size: 13px;
  padding: 10px 14px; user-select: none;
}
.cn-prompt-text {
  margin: 0; white-space: pre-wrap; font-family: var(--cn-mono); font-size: 12px; line-height: 1.6;
  max-height: 360px; overflow: auto; padding: 12px 14px; border: 0;
  border-top: 1px solid var(--cn-border); background: var(--cn-bg);
}

/* Repos / Organizations */
.cn-host-item {
  display: flex; gap: 10px; align-items: center; padding: 8px 12px;
  border: 1px solid var(--cn-border); border-radius: 6px; background: color-mix(in srgb, var(--cn-bg) 50%, var(--cn-card));
}
.cn-host-form { margin-top: 10px; }
.cn-repo-form { margin-bottom: 12px; }
.cn-suggestions-banner { margin: 8px 0 14px; padding: 10px 14px; }
.cn-suggestion-chip {
  background: var(--cn-card); border-radius: 16px; padding: 4px 10px;
  border: 1px solid var(--cn-border-strong);
}
.cn-suggestion-chip:hover { border-color: var(--cn-accent); color: var(--cn-accent); }
.cn-org { margin: 12px 0; border: 1px solid var(--cn-border); border-radius: 8px; overflow: hidden; background: var(--cn-card); }
.cn-org summary {
  cursor: pointer; padding: 10px 14px; font-weight: 500; display: flex; align-items: center;
  gap: 8px; user-select: none; background: color-mix(in srgb, var(--cn-bg) 35%, var(--cn-card));
}
.cn-org .cn-table { border-top: 1px solid var(--cn-border); }

.cn-combobox { position: relative; max-width: 520px; }
.cn-combobox .cn-input { width: 100%; }
.cn-combobox-list {
  position: absolute; z-index: 8; left: 0; right: 0; max-height: 240px; overflow: auto; margin: 4px 0 0; padding: 4px 0;
  list-style: none; background: var(--cn-card); border: 1px solid var(--cn-border-strong); border-radius: 6px;
}
.cn-combobox-option {
  display: flex; gap: 8px; align-items: baseline; width: 100%; text-align: left; padding: 6px 10px;
  border: none; background: transparent; color: inherit; font: inherit; cursor: pointer;
}
.cn-combobox-option[aria-selected="true"], .cn-combobox-option:hover { background: var(--cn-hover); }
.cn-combobox-empty { padding: 8px 10px; color: var(--cn-muted); }
.cn-selected-models { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.cn-selected-model { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.cn-selected-model-name { display: inline-flex; flex: 1; min-width: 150px; flex-direction: column; gap: 2px; }

/* Local changes */
.cn-list-tools { padding: 8px; border-bottom: 1px solid var(--cn-border); }
.cn-local-group {
  margin: 0; padding: 10px 12px 4px; font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.04em; color: var(--cn-muted);
}
.cn-local-rows { list-style: none; margin: 0; padding: 0; }
.cn-local-form { margin-top: 12px; }
.cn-field-wide { align-items: stretch; }
.cn-field .cn-input { max-width: 420px; width: 100%; }
.cn-local-summary-badge { margin-left: 8px; }
.cn-skipped-list { list-style: none; margin: 0; padding: 10px 14px; display: flex; flex-direction: column; gap: 6px; border-top: 1px solid var(--cn-border); }
.cn-skipped-item { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: 12px; overflow-wrap: anywhere; }
.cn-local-history { margin: 0; border-width: 1px 0 0; border-radius: 0; overflow-x: auto; }
.cn-local-history tr[aria-current="true"] td { background: var(--cn-selected); }
.cn-visually-hidden {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}

.cn-spinner {
  width: 12px; height: 12px; flex: none; border-radius: 50%;
  border: 2px solid var(--cn-border-strong); border-top-color: var(--cn-accent);
  animation: cn-spin 0.8s linear infinite;
}
@keyframes cn-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .cn-spinner { animation: none; }
}

@media (max-width: 720px) {
  .cn-body { flex-direction: column; }
  .cn-list { width: 100%; max-height: 45%; border-right: none; border-bottom: 1px solid var(--cn-border); }
  .cn-settings { padding: 14px 12px; }
  .cn-priority-row, .cn-priority-add-row { flex-direction: column; align-items: stretch; }
  .cn-priority-controls { justify-content: flex-end; }
  .cn-toolbar { flex-wrap: wrap; }
  .cn-field .cn-input, .cn-field .cn-select { max-width: none; }
  .cn-local-form .cn-segmented { display: flex; }
  .cn-local-form .cn-segmented .cn-tab { flex: 1 1 auto; }
  .cn-actions { align-items: stretch; }
}
`;

export function ensureStylesInjected(): void {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(STYLE_ELEMENT_ID);
  if (existing) {
    if (existing.textContent !== CODENOD_STYLES) existing.textContent = CODENOD_STYLES;
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.textContent = CODENOD_STYLES;
  document.head.appendChild(style);
}
