export const STYLE_ELEMENT_ID = 'zcc-ext-ai-usage-monitor-styles';

export const USAGE_MONITOR_STYLES = `
.aum-root {
  --aum-bg: var(--bg-base, #0b0d11);
  --aum-surface: var(--bg-panel, #12151c);
  --aum-surface-2: #181c26;
  --aum-surface-3: #222736;
  --aum-border: var(--border, #1f2430);
  --aum-border-strong: var(--border-strong, #2c3446);
  --aum-text: var(--text-primary, #e2e8f0);
  --aum-muted: var(--text-muted, #94a3b8);
  --aum-dim: #64748b;
  --aum-accent: var(--accent, #6366f1);
  --aum-emerald: var(--success, #10b981);
  --aum-amber: #f59e0b;
  --aum-rose: var(--danger, #f43f5e);
  --aum-cyan: #06b6d4;
  --aum-mono: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
  --aum-sans: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif);
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--aum-bg);
  color: var(--aum-text);
  font-family: var(--aum-sans);
  font-size: 13px;
  line-height: 1.45;
  overflow: hidden;
}
.aum-root *, .aum-root *::before, .aum-root *::after { box-sizing: border-box; }
.aum-mono { font-family: var(--aum-mono); font-variant-numeric: tabular-nums; }
.aum-muted { color: var(--aum-muted); font-size: 12px; }
.aum-subtext { color: var(--aum-muted); font-size: 11px; }

.aum-topbar {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
  gap: 10px; padding: 10px 16px; border-bottom: 1px solid var(--aum-border);
  background: color-mix(in srgb, var(--aum-surface) 75%, var(--aum-bg));
}
.aum-title-wrap { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.aum-badge-icon {
  width: 28px; height: 28px; border-radius: 6px; display: grid; place-items: center;
  background: color-mix(in srgb, var(--aum-accent) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--aum-accent) 40%, transparent);
  color: #a5b4fc; font-weight: 700; font-size: 11px; font-family: var(--aum-mono);
}
.aum-title { font-size: 15px; font-weight: 600; margin: 0; letter-spacing: -0.01em; }
.aum-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.aum-prov-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }

.aum-subtabs {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 0 16px; border-bottom: 1px solid var(--aum-border);
  background: var(--aum-bg); overflow-x: auto; flex-shrink: 0;
}
.aum-tablist { display: flex; gap: 4px; }
.aum-tab {
  appearance: none; background: transparent; border: none; border-bottom: 2px solid transparent;
  color: var(--aum-muted); padding: 9px 12px; font: inherit; font-size: 12px; font-weight: 500;
  cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
}
.aum-tab:hover { color: var(--aum-text); }
.aum-tab.active { color: #a5b4fc; border-bottom-color: var(--aum-accent); }

.aum-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 14px 16px 24px; display: flex; flex-direction: column; gap: 14px; }

.aum-seg {
  display: inline-flex; background: var(--aum-surface); border: 1px solid var(--aum-border);
  border-radius: 6px; padding: 2px; gap: 2px;
}
.aum-seg button {
  appearance: none; background: transparent; border: none; color: var(--aum-muted);
  padding: 4px 9px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 500; font-family: var(--aum-mono);
}
.aum-seg button:hover { color: var(--aum-text); }
.aum-seg button.active {
  background: var(--aum-surface-3); color: #a5b4fc;
  border: 1px solid color-mix(in srgb, var(--aum-accent) 40%, transparent);
}

.aum-btn {
  appearance: none; background: var(--aum-surface); color: var(--aum-text);
  border: 1px solid var(--aum-border-strong); padding: 5px 10px; border-radius: 5px;
  font: inherit; font-size: 12px; font-weight: 500; cursor: pointer;
  display: inline-flex; align-items: center; gap: 5px; white-space: nowrap;
}
.aum-btn:hover:not(:disabled) { background: var(--aum-surface-2); border-color: #3b445b; }
.aum-btn:disabled { opacity: 0.45; cursor: default; }
.aum-btn-primary { background: var(--aum-accent); border-color: #818cf8; color: #fff; }
.aum-btn-primary:hover:not(:disabled) { filter: brightness(1.1); background: var(--aum-accent); }
.aum-btn-danger { color: #fb7185; border-color: rgba(244, 63, 94, 0.35); }
.aum-btn-sm { padding: 3px 8px; font-size: 11px; }
.aum-icon-btn {
  appearance: none; background: var(--aum-surface-2); color: var(--aum-muted);
  border: 1px solid var(--aum-border-strong); width: 22px; height: 22px; padding: 0;
  border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: color 0.15s, border-color 0.15s, background-color 0.15s;
}
.aum-icon-btn:hover:not(:disabled) {
  color: var(--aum-text); background: var(--aum-surface-3); border-color: #4b5563;
}
.aum-icon-btn:disabled { opacity: 0.45; cursor: default; }

.aum-input, .aum-select {
  background: var(--aum-surface-2); color: var(--aum-text);
  border: 1px solid var(--aum-border-strong); border-radius: 5px;
  padding: 5px 9px; font: inherit; font-size: 12px; outline: none;
}
.aum-input:focus, .aum-select:focus { border-color: var(--aum-accent); }

.aum-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.05em; font-family: var(--aum-mono);
}
.aum-pill-indigo { background: rgba(99, 102, 241, 0.14); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.35); }
.aum-pill-emerald { background: rgba(16, 185, 129, 0.12); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
.aum-pill-amber { background: rgba(245, 158, 11, 0.12); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
.aum-pill-rose { background: rgba(244, 63, 94, 0.12); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.3); }
.aum-pill-cyan { background: rgba(6, 182, 212, 0.12); color: #67e8f9; border: 1px solid rgba(6, 182, 212, 0.3); }
.aum-pill-neutral { background: var(--aum-surface-2); color: var(--aum-muted); border: 1px solid var(--aum-border-strong); }

.aum-spinner {
  width: 12px; height: 12px; display: inline-block; flex-shrink: 0;
  animation: aum-spin 0.85s linear infinite;
}
.aum-refresh-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 500;
  font-family: var(--aum-mono); color: #93c5fd;
  background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59, 130, 246, 0.28);
}
.aum-stale-warn { color: #fbbf24; font-size: 10px; }
@keyframes aum-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.aum-kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.aum-summary { display: flex; flex-direction: column; gap: 18px; container-type: inline-size; }
.aum-summary h2 { font-size: 14px; font-weight: 600; margin: 0; }
.aum-summary h3 { font-size: 12px; font-weight: 500; color: var(--aum-muted); margin: 0; }
.aum-summary p { margin: 0; line-height: 1.5; }
.aum-summary section > p { margin-top: 4px; }
.aum-summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 10px; }
.aum-summary .aum-card { padding: 15px 16px; min-width: 0; gap: 10px; overflow-wrap: anywhere; }
.aum-summary .aum-muted { font-size: 12px; }
.aum-summary-quota { grid-column: span 2; }
.aum-summary-provider { display: flex; align-items: center; gap: 10px; min-width: 0; }
.aum-summary-other-windows { display: flex; flex-wrap: wrap; gap: 6px; }
.aum-summary-status { font-size: 18px; font-weight: 600; }
.aum-summary-remaining { color: var(--aum-emerald); }
.aum-summary-warning { color: var(--aum-amber); }
.aum-explanation { border-top: 1px solid var(--aum-border); padding-top: 10px; font-size: 12px; margin-top: auto; }
.aum-explanation summary { cursor: pointer; color: #a5b4fc; font-weight: 500; }
.aum-explanation p, .aum-summary-source { margin-top: 8px; }
.aum-explanation summary:focus-visible, .aum-summary button:focus-visible { outline: 2px solid var(--aum-accent); outline-offset: 3px; }
.aum-summary-diagnostics {
  border: 1px solid var(--aum-border); border-radius: 7px; padding: 11px 14px;
  background: color-mix(in srgb, var(--aum-surface) 80%, var(--aum-bg));
}
.aum-summary .aum-btn { white-space: normal; text-align: left; align-self: flex-start; }
@container (max-width: 850px) {
  .aum-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .aum-summary-quota { grid-column: auto; }
}
@container (max-width: 540px) {
  .aum-summary-grid { grid-template-columns: minmax(0, 1fr); }
}
.aum-prov-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.aum-split-2 { display: grid; grid-template-columns: 1.55fr 1fr; gap: 10px; }
.aum-logs-split { display: grid; grid-template-columns: 1.75fr 1fr; gap: 10px; align-items: start; }
@media (max-width: 1120px) {
  .aum-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .aum-prov-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .aum-split-2, .aum-logs-split { grid-template-columns: 1fr; }
}
@media (max-width: 680px) {
  .aum-kpi-grid, .aum-prov-grid { grid-template-columns: 1fr; }
}

.aum-card {
  background: var(--aum-surface); border: 1px solid var(--aum-border); border-radius: 7px;
  padding: 12px 14px; display: flex; flex-direction: column; gap: 9px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.aum-card:hover { border-color: var(--aum-border-strong); }
.aum-card-amber { border-color: rgba(245, 158, 11, 0.38); }
.aum-card-rose { border-color: rgba(244, 63, 94, 0.42); }
.aum-card-refreshing { border-color: rgba(59, 130, 246, 0.42); box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.14); }
.aum-card-reordering { cursor: grab; border-style: dashed; border-color: rgba(99, 102, 241, 0.45); }
.aum-card-reordering:hover { border-color: #818cf8; }
.aum-card-dragging { opacity: 0.48; }
.aum-card-drag-over { border-color: #a5b4fc; border-style: solid; box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25); }
.aum-reorder-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 6px;
  padding: 4px 8px; border-radius: 5px;
  background: rgba(99, 102, 241, 0.09); border: 1px solid rgba(99, 102, 241, 0.25);
}
.aum-card-label {
  font-size: 10px; font-family: var(--aum-mono); text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--aum-dim); display: flex; justify-content: space-between; align-items: center;
}
.aum-kpi-val { font-size: 22px; font-weight: 700; font-family: var(--aum-mono); letter-spacing: -0.02em; }
.aum-row-between { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }

.aum-bar-track { width: 100%; height: 6px; background: #1c212e; border-radius: 3px; overflow: hidden; display: flex; }
.aum-bar-fill { height: 100%; transition: width 0.2s ease; }

.aum-window-box {
  background: rgba(255, 255, 255, 0.02); border: 1px solid var(--aum-border);
  border-radius: 5px; padding: 8px 10px; display: flex; flex-direction: column; gap: 5px;
}
.aum-prov-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--aum-border); }
.aum-prov-avatar {
  width: 28px; height: 28px; border-radius: 6px; display: grid; place-items: center;
  font-weight: 700; font-family: var(--aum-mono); font-size: 11px; flex-shrink: 0;
}
.aum-card-footer {
  padding-top: 8px; border-top: 1px solid var(--aum-border); margin-top: auto;
  display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--aum-muted);
}
.aum-chip-row { display: flex; flex-wrap: wrap; gap: 4px; }
.aum-chip {
  font-family: var(--aum-mono); font-size: 10px; padding: 2px 6px; border-radius: 4px;
  background: var(--aum-surface-2); border: 1px solid var(--aum-border); color: var(--aum-muted);
}

.aum-chart-box {
  height: 170px; display: flex; align-items: flex-end; gap: 4px; padding: 10px 4px 4px;
  border-bottom: 1px solid var(--aum-border);
}
.aum-day-col {
  flex: 1; display: flex; flex-direction: column; justify-content: flex-end; height: 100%; gap: 1px;
  min-width: 6px; cursor: pointer;
}
.aum-day-seg { width: 100%; border-radius: 1px; min-height: 2px; }

.aum-table-wrap { overflow-x: auto; border: 1px solid var(--aum-border); border-radius: 7px; background: var(--aum-surface); }
.aum-table { width: 100%; border-collapse: collapse; text-align: left; }
.aum-table th {
  padding: 8px 11px; font-size: 10px; font-family: var(--aum-mono); text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--aum-dim); border-bottom: 1px solid var(--aum-border);
  background: color-mix(in srgb, var(--aum-surface) 60%, var(--aum-bg)); white-space: nowrap;
}
.aum-table td { padding: 8px 11px; border-bottom: 1px solid var(--aum-border); font-size: 12px; vertical-align: middle; }
.aum-table tbody tr:last-child td { border-bottom: none; }
.aum-table tbody tr:hover { background: var(--aum-surface-2); }
.aum-table tbody tr.selected { background: rgba(99, 102, 241, 0.12); box-shadow: inset 2px 0 0 var(--aum-accent); }

.aum-pre {
  background: #080a0e; border: 1px solid var(--aum-border); border-radius: 5px;
  padding: 10px; font-family: var(--aum-mono); font-size: 11px; color: #cbd5e1;
  overflow-x: auto; max-height: 240px; white-space: pre-wrap; word-break: break-word; margin: 0;
}

.aum-banner {
  padding: 8px 12px; border-radius: 6px; font-size: 12px;
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
}
.aum-banner-error { background: rgba(244, 63, 94, 0.12); border: 1px solid rgba(244, 63, 94, 0.35); color: #fda4af; }
.aum-banner-info { background: rgba(99, 102, 241, 0.12); border: 1px solid rgba(99, 102, 241, 0.35); color: #c7d2fe; }
`;

export function ensureStylesInjected(): void {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(STYLE_ELEMENT_ID);
  if (existing) {
    if (existing.textContent !== USAGE_MONITOR_STYLES) {
      existing.textContent = USAGE_MONITOR_STYLES;
    }
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.textContent = USAGE_MONITOR_STYLES;
  document.head.appendChild(style);
}
