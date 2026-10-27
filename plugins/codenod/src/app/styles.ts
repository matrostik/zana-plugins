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
  appearance: none; border: 1px solid var(--cn-border-strong); background: transparent; color: var(--cn-text);
  border-radius: 6px; padding: 4px 10px; font: inherit; cursor: pointer; white-space: nowrap;
}
.cn-btn:hover:not(:disabled) { background: var(--cn-hover); }
.cn-btn:disabled { opacity: 0.5; cursor: default; }
.cn-btn:focus-visible, .cn-tab:focus-visible, .cn-row:focus-visible { outline: 2px solid var(--cn-accent); outline-offset: -2px; }
.cn-btn-primary { background: var(--cn-accent); border-color: var(--cn-accent); color: #fff; }
.cn-btn-primary:hover:not(:disabled) { background: var(--cn-accent); filter: brightness(1.1); }
.cn-btn-warn { border-color: var(--cn-warn); color: var(--cn-warn); background: color-mix(in srgb, var(--cn-warn) 10%, transparent); }
.cn-btn-danger { border-color: var(--cn-danger); color: var(--cn-danger); }
.cn-input, .cn-select, .cn-textarea {
  background: var(--cn-card); color: var(--cn-text); border: 1px solid var(--cn-border-strong);
  border-radius: 6px; padding: 4px 8px; font: inherit; min-width: 0;
}
.cn-textarea { width: 100%; min-height: 60px; resize: vertical; }
.cn-body { display: flex; flex: 1; min-height: 0; }
.cn-list { width: clamp(260px, 36%, 460px); border-right: 1px solid var(--cn-border); display: flex; flex-direction: column; min-height: 0; }
.cn-tabs { display: flex; gap: 2px; padding: 6px 8px 0; border-bottom: 1px solid var(--cn-border); }
.cn-tab {
  appearance: none; background: transparent; border: none; border-bottom: 2px solid transparent; color: var(--cn-muted);
  padding: 6px 10px; font: inherit; cursor: pointer;
}
.cn-tab[aria-selected="true"] { color: var(--cn-text); border-bottom-color: var(--cn-accent); }
.cn-count { margin-left: 6px; font-size: 11px; padding: 0 6px; border-radius: 10px; background: var(--cn-hover); }
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
.cn-badge-ok { color: var(--cn-ok); border-color: color-mix(in srgb, var(--cn-ok) 50%, transparent); }
.cn-badge-warn { color: var(--cn-warn); border-color: color-mix(in srgb, var(--cn-warn) 50%, transparent); }
.cn-badge-danger { color: var(--cn-danger); border-color: color-mix(in srgb, var(--cn-danger) 50%, transparent); }
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
.cn-model-agreement { color: var(--cn-text); background: color-mix(in srgb, var(--cn-bg) 30%, transparent); }
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
.cn-banner { margin: 8px 12px; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--cn-border-strong); background: var(--cn-card); }
.cn-banner-warn { border-color: var(--cn-warn); background: color-mix(in srgb, var(--cn-warn) 12%, var(--cn-bg)); }
.cn-banner-warn strong, .cn-banner-warn code { color: var(--cn-warn); }
.cn-banner-warn p { margin: 6px 0 0; }
.cn-banner-warn code { overflow-wrap: anywhere; }
.cn-banner-error { border-color: var(--cn-danger); }
.cn-table { width: 100%; border-collapse: collapse; }
.cn-table th, .cn-table td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--cn-border); vertical-align: top; }
.cn-diff { font-family: var(--cn-mono); font-size: 12px; white-space: pre; overflow: auto; border: 1px solid var(--cn-border); border-radius: 6px; margin: 6px 0 14px; }
.cn-diff-line { padding: 0 8px; }
.cn-diff-add { background: color-mix(in srgb, var(--cn-ok) 14%, transparent); }
.cn-diff-del { background: color-mix(in srgb, var(--cn-danger) 14%, transparent); }
.cn-diff-hunk { color: var(--cn-muted); background: var(--cn-hover); }
.cn-section { margin-bottom: 24px; }
.cn-section h3 { font-size: 13px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--cn-muted); }
.cn-inline { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.cn-spinner {
  width: 12px; height: 12px; flex: none; border-radius: 50%;
  border: 2px solid var(--cn-border-strong); border-top-color: var(--cn-accent);
  animation: cn-spin 0.8s linear infinite;
}
@keyframes cn-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .cn-spinner { animation: none; }
}
.cn-settings { padding: 16px; overflow: auto; flex: 1; max-width: 900px; }
.cn-check { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.cn-settings-tabs { padding: 0; margin-bottom: 16px; }
.cn-settings-panel[hidden] { display: none; }
.cn-accounts, .cn-host-list { list-style: none; margin: 0 0 8px; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.cn-account { display: flex; gap: 10px; align-items: flex-start; padding: 8px 10px; border: 1px solid var(--cn-border); border-radius: 8px; background: var(--cn-card); }
.cn-account-name { font-weight: 600; }
.cn-avatar { width: 36px; height: 36px; flex: none; border-radius: 50%; background: var(--cn-hover); object-fit: cover; }
.cn-instructions { min-height: 140px; font-family: var(--cn-mono); font-size: 12px; margin-bottom: 8px; }
.cn-prompt { margin-top: 12px; }
.cn-prompt summary { cursor: pointer; color: var(--cn-accent); }
.cn-prompt-text { white-space: pre-wrap; font-family: var(--cn-mono); font-size: 12px; max-height: 360px; overflow: auto; padding: 8px 10px; border: 1px solid var(--cn-border); border-radius: 6px; background: var(--cn-card); }
.cn-org { margin: 8px 0; border: 1px solid var(--cn-border); border-radius: 8px; }
.cn-org summary { cursor: pointer; padding: 6px 10px; }
.cn-org .cn-table { border-top: 1px solid var(--cn-border); }
.cn-fields { display: flex; flex-direction: column; gap: 12px; margin-bottom: 8px; }
.cn-field { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
.cn-field .cn-select { max-width: 360px; width: 100%; }
.cn-number { width: 96px; }
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
@media (max-width: 720px) {
  .cn-body { flex-direction: column; }
  .cn-list { width: 100%; max-height: 45%; border-right: none; border-bottom: 1px solid var(--cn-border); }
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
