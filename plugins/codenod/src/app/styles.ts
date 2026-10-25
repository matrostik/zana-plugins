export const STYLE_ELEMENT_ID = 'zcc-ext-codenod-styles';

export const CODENOD_STYLES = `
.cn-root {
  --cn-bg: var(--background-base, #1e1e1e);
  --cn-card: var(--background-card, #252526);
  --cn-hover: var(--background-hover, rgba(255, 255, 255, 0.06));
  --cn-selected: color-mix(in srgb, var(--accent, #007acc) 22%, transparent);
  --cn-border: var(--border-subtle, rgba(255, 255, 255, 0.08));
  --cn-border-strong: var(--border-strong, rgba(255, 255, 255, 0.16));
  --cn-text: var(--text-normal, #cccccc);
  --cn-muted: var(--text-muted, #8a8a8a);
  --cn-accent: var(--accent, #007acc);
  --cn-danger: #e5534b;
  --cn-warn: #d29922;
  --cn-ok: #3fb950;
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
.cn-finding { border: 1px solid var(--cn-border); border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; background: var(--cn-card); }
.cn-finding[data-dismissed="true"] { opacity: 0.5; }
.cn-finding-head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.cn-finding p { margin: 6px 0 0; line-height: 1.45; }
.cn-sev-critical { color: var(--cn-danger); font-weight: 600; }
.cn-sev-high { color: var(--cn-danger); }
.cn-sev-medium { color: var(--cn-warn); }
.cn-sev-low { color: var(--cn-muted); }
.cn-banner { margin: 8px 12px; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--cn-border-strong); background: var(--cn-card); }
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
.cn-settings { padding: 16px; overflow: auto; flex: 1; max-width: 900px; }
.cn-check { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
@media (max-width: 720px) {
  .cn-body { flex-direction: column; }
  .cn-list { width: 100%; max-height: 45%; border-right: none; border-bottom: 1px solid var(--cn-border); }
}
`;

export function ensureStylesInjected(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ELEMENT_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.textContent = CODENOD_STYLES;
  document.head.appendChild(style);
}
