function cn(){let e=globalThis.__ZCC_PLUGIN_HOST__;if(!e)throw new Error("plugin host is not available");return e}function ye(){return globalThis.__ZCC_PLUGIN_RUNTIME__??{}}function ot(e){throw new Error(`${e} is not available until the host plugin runtime is installed`)}async function pn(e,t,o){return cn().callRpc(e,t,o)}async function wt(e,t){return cn().setSettings(e,t)}function dn(e){return{__zccPluginApp:!0,setup:e}}function Fe(){return ye().useRpc?.()??ot("useRpc")}function At(e,t){ye().useRealtime?.(e,t)}function Ct(){return ye().useSettings?.()??{values:void 0,isLoading:!0}}function Pt(){return ye().useZccContext?.()??{projectId:null,threadId:null}}function Rt(){return ye().useZccNavigate?.()??ot("useZccNavigate")}function $e(){return ye().useComposer?.()??ot("useComposer")}function Et(){return ye().useComposerView?.()??ot("useComposerView")}var I=globalThis.__ZCC_HOST_REACT__,un=I,ui=I.Children,mi=I.Component,fi=I.Fragment,bi=I.StrictMode,gi=I.Suspense,vi=I.cloneElement,hi=I.createContext,yi=I.createElement,xi=I.createRef,Si=I.forwardRef,wi=I.isValidElement,Ai=I.lazy,Ci=I.memo,Pi=I.startTransition,T=I.useCallback,Ri=I.useContext,Ei=I.useDebugValue,Ii=I.useDeferredValue,_=I.useEffect,Ti=I.useId,ki=I.useImperativeHandle,Ni=I.useInsertionEffect,Di=I.useLayoutEffect,$=I.useMemo,mn=I.useReducer,w=I.useRef,b=I.useState,_i=I.useSyncExternalStore,Mi=I.useTransition,Li=I.version;var M="default";function Do(e){if(typeof e!="string")return M;let t=e.trim().slice(0,256);return!t||t===M?M:t}function _o(e){return typeof e!="string"?"":e.trim().slice(0,200)}function Mo(e){return!(e===!1||typeof e=="string"&&e.trim().toLowerCase()==="false")}function Lo(e){let t=typeof e=="number"?e:typeof e=="string"&&e.trim()!==""?Number(e):Number.NaN;return Number.isFinite(t)?Math.round(Math.min(100,Math.max(0,t))):75}function ce(e){let t=e??{},o=Do(t.micDeviceId);return{micDeviceId:o,micLabel:o===M?"":_o(t.micLabel),soundCuesEnabled:Mo(t.soundCuesEnabled),soundCuesVolume:Lo(t.soundCuesVolume)}}var Te="promptVoice.transcribe",xe="promptVoice.status",fn="promptVoice.rephrase",bn="promptVoice.availableModels",pe="promptVoice.settings.get",de="promptVoice.settings.update",gn="promptVoice:settingsChanged",vn="promptVoice:modelsUpdated",Q={state:"promptVoice.localWhisper.state",installRuntime:"promptVoice.localWhisper.installRuntime",cancelRuntimeInstall:"promptVoice.localWhisper.cancelRuntimeInstall",downloadModel:"promptVoice.localWhisper.downloadModel",cancelModelDownload:"promptVoice.localWhisper.cancelModelDownload",removeModel:"promptVoice.localWhisper.removeModel",selectModel:"promptVoice.localWhisper.selectModel",start:"promptVoice.localWhisper.start",stop:"promptVoice.localWhisper.stop"};var ue="prompt-studio",ke="prompt-studio";var hn="zcc:prompt-voice:audio-prefs:v1";function It(){try{if(typeof localStorage>"u")return null;let e=localStorage.getItem(hn);if(!e)return null;let t=JSON.parse(e);return!t||typeof t!="object"||Array.isArray(t)?null:ce(t)}catch{return null}}function re(){return It()??ce({})}function ie(e){let t=ce(e);try{typeof localStorage<"u"&&localStorage.setItem(hn,JSON.stringify({micDeviceId:t.micDeviceId,micLabel:t.micDeviceId===M?"":t.micLabel,soundCuesEnabled:String(t.soundCuesEnabled),soundCuesVolume:String(t.soundCuesVolume)}))}catch{}return t}var Tt=`/* Base Container */
.pv-mic {
  display: inline-flex;
  align-items: center;
  height: 36px;
  box-sizing: border-box;
  vertical-align: middle;
  background: transparent;
  border: none;
  user-select: none;
  position: relative;
}

.pv-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Base button reset */
.pv-mic-button {
  box-sizing: border-box;
  font: inherit;
}

.pv-mic-button:focus-visible {
  outline: 2px solid var(--focus-ring, #4a90e2);
  outline-offset: 2px;
}

.pv-mic-button:disabled {
  opacity: 0.6;
  cursor: progress;
}

/* Dictation Pill Container: shared morphing capsule across all phases */
.pv-dictation-pill {
  display: inline-flex;
  align-items: center;
  height: 36px;
  border-radius: 9999px;
  background: var(--pv-pill-bg, #181920);
  border: 1px solid var(--pv-pill-border, rgba(239, 68, 68, 0.35));
  transition: width 0.28s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.25s ease,
              box-shadow 0.25s ease,
              background 0.25s ease,
              padding 0.25s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  box-sizing: border-box;
}

/* 1. Idle: Oval Capsule Pill with Signature Crimson Border containing only the mic icon */
.pv-mic.pv-phase-idle {
  width: 58px;
  height: 36px;
  border-radius: 9999px;
  background: var(--pv-pill-bg, #181920);
  border: 1px solid rgba(239, 68, 68, 0.35);
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.12);
  padding: 0;
  justify-content: center;
  cursor: pointer;
}

.pv-mic.pv-phase-idle:hover {
  background: #20222c;
  border-color: rgba(239, 68, 68, 0.75);
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.28);
  transform: scale(1.04);
}

.pv-mic.pv-phase-idle:active {
  transform: scale(0.97);
}

.pv-mic.pv-phase-idle .pv-idle-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 9999px;
  background: transparent;
  border: none;
  box-shadow: none;
  color: var(--text-secondary, #cbd5e1);
  cursor: pointer;
  padding: 0;
  transition: color 0.15s ease;
}

.pv-mic.pv-phase-idle:hover .pv-idle-icon {
  color: #ffffff;
}

/* 2. Starting Oval: extends smoothly */
.pv-mic.pv-phase-starting {
  width: auto;
  border-radius: 9999px;
  border-color: rgba(234, 179, 8, 0.45);
  box-shadow: 0 0 14px rgba(234, 179, 8, 0.15);
  padding: 0 4px 0 10px;
  gap: 10px;
}

/* 3. Recording / Listening Oval: extends with red glow */
.pv-mic.pv-phase-recording {
  width: auto;
  border-radius: 9999px;
  border-color: rgba(239, 68, 68, 0.45);
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.18), 0 4px 16px rgba(0, 0, 0, 0.4);
  padding: 0 4px 0 10px;
  gap: 10px;
}

/* 4. Processing Oval */
.pv-mic.pv-phase-processing {
  width: auto;
  border-radius: 9999px;
  border-color: rgba(56, 189, 248, 0.4);
  box-shadow: 0 0 14px rgba(56, 189, 248, 0.15);
  padding: 0 6px 0 10px;
  gap: 10px;
}

/* 5. Notice Oval: same control showing completion */
.pv-mic.pv-has-notice {
  width: auto;
  border-radius: 9999px;
  border-color: rgba(34, 197, 94, 0.45);
  box-shadow: 0 0 16px rgba(34, 197, 94, 0.15);
  padding: 0 14px 0 12px;
  gap: 8px;
  cursor: pointer;
}

.pv-mic.pv-has-notice:hover {
  border-color: rgba(34, 197, 94, 0.75);
  background: rgba(34, 197, 94, 0.08);
}

.pv-notice-content {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  animation: pv-notice-enter 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.pv-notice-check {
  color: #4ade80;
  font-weight: 700;
  font-size: 13px;
}

@keyframes pv-notice-enter {
  from { opacity: 0; transform: scale(0.96) translateX(-3px); }
  to { opacity: 1; transform: scale(1) translateX(0); }
}

/* Flex ordering for active pill children */
.pv-mic-active .pv-pill-timer-badge {
  order: 1;
}

.pv-mic-active .pv-pill-center {
  order: 2;
}

.pv-mic-active .pv-mic-button.pv-pill-btn-stop {
  order: 3;
}

.pv-mic-active .pv-pill-btn-cancel {
  order: 4;
}

/* Timer Badge */
.pv-pill-timer-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 9999px;
  padding: 2px 8px 2px 6px;
}

.pv-pill-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--danger-color, #ef4444);
  box-shadow: 0 0 8px var(--danger-color, #ef4444);
  animation: pv-pulse-dot 1.4s ease-in-out infinite;
}

.pv-pill-dot-starting {
  background: #eab308;
  box-shadow: 0 0 8px #eab308;
}

@keyframes pv-pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

.pv-pill-timer-text {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  font-weight: 600;
  color: #f8fafc;
  letter-spacing: 0.02em;
}

/* Center area */
.pv-pill-center {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.pv-pill-waveform {
  display: inline-flex;
  align-items: center;
  gap: 2.5px;
  height: 16px;
}

.pv-pill-waveform-bar {
  width: 3px;
  background: #38bdf8;
  border-radius: 9999px;
  box-shadow: 0 0 6px rgba(56, 189, 248, 0.4);
  transition: height 0.08s ease;
  min-height: 3px;
  height: 5px;
}

.pv-pill-waveform.animated .pv-pill-waveform-bar:nth-child(1) { animation: pv-wave 0.8s ease-in-out infinite alternate; }
.pv-pill-waveform.animated .pv-pill-waveform-bar:nth-child(2) { animation: pv-wave 0.6s ease-in-out infinite alternate 0.15s; }
.pv-pill-waveform.animated .pv-pill-waveform-bar:nth-child(3) { animation: pv-wave 0.7s ease-in-out infinite alternate 0.3s; }
.pv-pill-waveform.animated .pv-pill-waveform-bar:nth-child(4) { animation: pv-wave 0.5s ease-in-out infinite alternate 0.2s; }
.pv-pill-waveform.animated .pv-pill-waveform-bar:nth-child(5) { animation: pv-wave 0.9s ease-in-out infinite alternate 0.05s; }

@keyframes pv-wave {
  0% { height: 4px; }
  100% { height: 14px; }
}

.pv-pill-status {
  font-size: 13px;
  font-weight: 500;
  color: #e2e8f0;
  white-space: nowrap;
}

.pv-mic-quiet-warning {
  font-size: 11px;
  color: #fbbf24;
}

/* Stop button inside active pill */
.pv-mic-button.pv-pill-btn-stop {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.22);
  border: 1px solid rgba(239, 68, 68, 0.55);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #f87171;
  padding: 0;
  transition: all 0.15s ease;
}

.pv-mic-button.pv-pill-btn-stop:hover {
  background: rgba(239, 68, 68, 0.38);
  border-color: rgba(239, 68, 68, 0.8);
  color: #ffffff;
  transform: scale(1.05);
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
}

/* Cancel button inside active pill */
.pv-pill-btn-cancel {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #94a3b8;
  padding: 0;
  transition: all 0.15s ease;
}

.pv-pill-btn-cancel:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #f1f5f9;
  transform: scale(1.05);
}

/* Spinner */
.pv-mic-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: pv-spin 0.8s linear infinite;
  vertical-align: middle;
}

@keyframes pv-spin {
  to { transform: rotate(360deg); }
}

/* Error styles */
.pv-mic.pv-phase-error {
  width: auto;
  border-radius: 9999px;
  border-color: rgba(239, 68, 68, 0.7);
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.25);
  padding: 0 10px;
}

.pv-mic-error {
  color: var(--danger-color, #ef4444);
}

@media (prefers-reduced-motion: reduce) {
  .pv-pill-waveform.animated .pv-pill-waveform-bar { animation: none; height: 8px; }
  .pv-pill-waveform-bar { transition: none; }
  .pv-mic-spinner { animation: none; }
}


/* ==========================================================================
   Prompt Studio - Zana Native Vertical Stack (Input Top, Output Bottom)
   ========================================================================== */

:root {
  --ps-bg-base: var(--bg-base, #1e1e1e);
  --ps-bg-panel: var(--bg-panel, #252526);
  --ps-bg-header: var(--bg-header, #202021);
  --ps-bg-subtle: rgba(255, 255, 255, 0.04);
  --ps-bg-hover: var(--bg-hover, rgba(255, 255, 255, 0.06));
  --ps-bg-active: rgba(255, 255, 255, 0.1);
  --ps-border: var(--border, rgba(255, 255, 255, 0.08));
  --ps-border-strong: var(--border-strong, rgba(255, 255, 255, 0.16));
  --ps-text: var(--text-primary, #e6edf3);
  --ps-text-muted: var(--text-muted, #8a8a8a);
  --ps-accent: var(--accent, #007acc);
  --ps-accent-hover: #0098ff;
  --ps-danger: var(--danger, #e5534b);
  --ps-warn: #d29922;
  --ps-success: var(--success, #3fb950);
  --ps-font: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
  --ps-mono: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
}

.ps-root {
  display: flex !important;
  flex-direction: column !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  background: var(--ps-bg-base) !important;
  color: var(--ps-text) !important;
  font-family: var(--ps-font) !important;
  font-size: 13px !important;
  overflow: hidden !important;
  position: relative !important;
  box-sizing: border-box !important;
}

.ps-root *, .ps-root *::before, .ps-root *::after {
  box-sizing: border-box !important;
}

/* \u2500\u2500\u2500 Top Studio Toolbar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.ps-toolbar {
  height: 40px !important;
  background: var(--ps-bg-header) !important;
  border-bottom: 1px solid var(--ps-border) !important;
  display: flex !important;
  align-items: center !important;
  padding: 0 14px !important;
  gap: 12px !important;
  flex-shrink: 0 !important;
  z-index: 10 !important;
}

.ps-brand {
  font-size: 13px !important;
  font-weight: 600 !important;
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  color: var(--ps-text) !important;
}

.ps-brand-badge {
  font-size: 11px !important;
  background: var(--ps-bg-subtle) !important;
  border: 1px solid var(--ps-border) !important;
  padding: 1px 6px !important;
  border-radius: 4px !important;
  color: var(--ps-text-muted) !important;
}

.ps-spacer {
  flex: 1 !important;
}

/* \u2500\u2500\u2500 Zana Native Button Styles \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.ps-btn {
  appearance: none !important;
  border: 1px solid var(--ps-border-strong) !important;
  background: var(--ps-bg-panel) !important;
  color: var(--ps-text) !important;
  border-radius: 4px !important;
  padding: 4px 10px !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
  height: 28px !important;
  font-family: inherit !important;
  transition: all 0.12s ease !important;
  white-space: nowrap !important;
}

.ps-btn:hover:not(:disabled) {
  background: var(--ps-bg-hover) !important;
  border-color: var(--ps-text-muted) !important;
}

.ps-btn:disabled {
  opacity: 0.45 !important;
  cursor: default !important;
}

.ps-btn-primary {
  background: var(--ps-accent) !important;
  border-color: var(--ps-accent) !important;
  color: #ffffff !important;
  font-weight: 600 !important;
}

.ps-btn-primary:hover:not(:disabled) {
  background: var(--ps-accent-hover) !important;
  border-color: var(--ps-accent-hover) !important;
}

.ps-btn-success {
  background: #238636 !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
  color: #ffffff !important;
  font-weight: 600 !important;
}

.ps-btn-success:hover:not(:disabled) {
  background: #2ea043 !important;
}

.ps-btn-danger {
  background: rgba(229, 83, 75, 0.15) !important;
  border-color: var(--ps-danger) !important;
  color: #fca5a5 !important;
}

.ps-btn-danger:hover:not(:disabled) {
  background: rgba(229, 83, 75, 0.25) !important;
}

.ps-btn-sm {
  height: 24px !important;
  padding: 2px 8px !important;
  font-size: 11px !important;
}

/* \u2500\u2500\u2500 Main Workspace Layout \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.ps-workspace {
  flex: 1 !important;
  display: flex !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

/* \u2500\u2500\u2500 Left Sidebar: Audio & Refinement Config \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.ps-sidebar {
  width: 290px !important;
  background: var(--ps-bg-panel) !important;
  border-right: 1px solid var(--ps-border) !important;
  display: flex !important;
  flex-direction: column !important;
  overflow-y: auto !important;
  flex-shrink: 0 !important;
}

.ps-section {
  padding: 12px 14px !important;
  border-bottom: 1px solid var(--ps-border) !important;
}

.ps-section-title {
  font-size: 11px !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  color: var(--ps-text-muted) !important;
  margin-bottom: 8px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
}

/* Model Select Dropdown */
.ps-select {
  appearance: none !important;
  -webkit-appearance: none !important;
  width: 100% !important;
  height: 30px !important;
  background: var(--ps-bg-base) !important;
  color: var(--ps-text) !important;
  border: 1px solid var(--ps-border-strong) !important;
  border-radius: 4px !important;
  padding: 4px 28px 4px 8px !important;
  font-size: 12px !important;
  font-family: inherit !important;
  cursor: pointer !important;
  outline: none !important;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238a8a8a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;
  background-repeat: no-repeat !important;
  background-position: right 8px center !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.ps-select:hover:not(:disabled) {
  border-color: var(--ps-accent) !important;
}

.ps-select:focus-visible {
  border-color: var(--ps-accent) !important;
  box-shadow: 0 0 0 1px var(--ps-accent) !important;
}

/* Dictation Card */
.ps-dictation-card {
  background: var(--ps-bg-base) !important;
  border: 1px solid var(--ps-border) !important;
  border-radius: 5px !important;
  padding: 10px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
}

.ps-mic-btn {
  height: 32px !important;
  border-radius: 4px !important;
  border: 1px solid var(--ps-danger) !important;
  background: rgba(229, 83, 75, 0.12) !important;
  color: #fca5a5 !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 7px !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

.ps-mic-btn:hover {
  background: rgba(229, 83, 75, 0.22) !important;
}

.ps-mic-btn.recording {
  background: var(--ps-danger) !important;
  color: #fff !important;
  animation: ps-pulse 1.5s infinite !important;
}

@keyframes ps-pulse {
  0% { box-shadow: 0 0 0 0 rgba(229, 83, 75, 0.5); }
  70% { box-shadow: 0 0 0 6px rgba(229, 83, 75, 0); }
  100% { box-shadow: 0 0 0 0 rgba(229, 83, 75, 0); }
}

.ps-audio-meter {
  height: 6px !important;
  background: rgba(255, 255, 255, 0.06) !important;
  border-radius: 3px !important;
  overflow: hidden !important;
}

.ps-audio-bar {
  height: 100% !important;
  width: 0% !important;
  background: #3fb950 !important;
  border-radius: 3px !important;
  transition: width 0.1s linear !important;
}

/* Presets List */
.ps-presets-list {
  display: flex !important;
  flex-direction: column !important;
  gap: 5px !important;
}

.ps-preset-item {
  background: var(--ps-bg-base) !important;
  border: 1px solid var(--ps-border) !important;
  border-radius: 4px !important;
  padding: 7px 9px !important;
  cursor: pointer !important;
  transition: all 0.12s ease !important;
  text-align: left !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 2px !important;
}

.ps-preset-item:hover {
  border-color: var(--ps-border-strong) !important;
  background: var(--ps-bg-hover) !important;
}

.ps-preset-item.active {
  border-color: var(--ps-accent) !important;
  background: color-mix(in srgb, var(--ps-accent) 14%, transparent) !important;
}

.ps-preset-header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
}

.ps-preset-name {
  font-size: 12px !important;
  font-weight: 600 !important;
  color: var(--ps-text) !important;
}

.ps-preset-desc {
  font-size: 11px !important;
  color: var(--ps-text-muted) !important;
  line-height: 1.3 !important;
}

/* Custom Instructions Input */
.ps-instructions-input {
  width: 100% !important;
  background: var(--ps-bg-base) !important;
  border: 1px solid var(--ps-border-strong) !important;
  border-radius: 4px !important;
  color: var(--ps-text) !important;
  padding: 7px 9px !important;
  font-size: 12px !important;
  font-family: inherit !important;
  resize: vertical !important;
  min-height: 65px !important;
  outline: none !important;
  line-height: 1.4 !important;
}

.ps-instructions-input:focus {
  border-color: var(--ps-accent) !important;
  box-shadow: 0 0 0 1px var(--ps-accent) !important;
}

/* \u2500\u2500\u2500 Vertical Stack: Input (Top) & Output (Bottom) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.ps-stack-workspace {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  min-width: 0 !important;
  background: var(--ps-bg-base) !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

/* Spec Title Sub-header */
.ps-stack-header {
  padding: 7px 16px !important;
  background: var(--ps-bg-header) !important;
  border-bottom: 1px solid var(--ps-border) !important;
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  flex-shrink: 0 !important;
}

.ps-title-field {
  flex: 1 !important;
  background: transparent !important;
  border: none !important;
  outline: none !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  color: var(--ps-text) !important;
  font-family: inherit !important;
  padding: 2px 4px !important;
}

.ps-title-field:focus {
  background: var(--ps-bg-panel) !important;
  border-radius: 3px !important;
  box-shadow: 0 0 0 1px var(--ps-border-strong) !important;
}

/* Vertical Panes Container */
.ps-vertical-panes {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

/* TOP PANE: Raw Input */
.ps-section-input {
  flex: 0 0 42% !important;
  display: flex !important;
  flex-direction: column !important;
  min-height: 140px !important;
  background: var(--ps-bg-base) !important;
  border-bottom: 1px solid var(--ps-border) !important;
  position: relative !important;
}

/* MIDDLE ACTION BAR */
.ps-mid-action-bar {
  height: 36px !important;
  background: var(--ps-bg-header) !important;
  border-bottom: 1px solid var(--ps-border) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 0 14px !important;
  flex-shrink: 0 !important;
  z-index: 5 !important;
}

.ps-mid-info {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  font-size: 11px !important;
  color: var(--ps-text-muted) !important;
}

.ps-mid-actions {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

/* BOTTOM PANE: Refined Output */
.ps-section-output {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  min-height: 180px !important;
  background: var(--ps-bg-base) !important;
  position: relative !important;
  overflow: hidden !important;
}

/* Pane Headers */
.ps-pane-header {
  height: 32px !important;
  background: var(--ps-bg-panel) !important;
  border-bottom: 1px solid var(--ps-border) !important;
  padding: 0 14px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  font-size: 12px !important;
  flex-shrink: 0 !important;
}

.ps-pane-title {
  display: flex !important;
  align-items: center !important;
  gap: 7px !important;
  font-weight: 600 !important;
}

.ps-badge {
  font-size: 10px !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  padding: 1px 6px !important;
  border-radius: 3px !important;
  letter-spacing: 0.04em !important;
}

.ps-badge-input {
  background: rgba(255, 255, 255, 0.08) !important;
  color: var(--ps-text-muted) !important;
}

.ps-badge-output {
  background: rgba(63, 185, 80, 0.15) !important;
  color: #7ee787 !important;
  border: 1px solid rgba(63, 185, 80, 0.3) !important;
}

.ps-pane-actions {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
}

/* Textarea & Output Body */
.ps-input-textarea {
  width: 100% !important;
  height: 100% !important;
  background: transparent !important;
  color: var(--ps-text) !important;
  border: none !important;
  outline: none !important;
  padding: 12px 16px !important;
  font-size: 13.5px !important;
  line-height: 1.6 !important;
  font-family: var(--ps-font) !important;
  resize: none !important;
  overflow-y: auto !important;
}

.ps-input-textarea::placeholder {
  color: #64748b !important;
}

.ps-output-scroll {
  width: 100% !important;
  height: 100% !important;
  overflow-y: auto !important;
  padding: 14px 16px !important;
  font-size: 13.5px !important;
  line-height: 1.6 !important;
  white-space: pre-wrap !important;
  user-select: text !important;
  font-family: var(--ps-font) !important;
}

.ps-output-empty {
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 10px !important;
  color: var(--ps-text-muted) !important;
  text-align: center !important;
  padding: 24px !important;
}

/* Diff Tokens */
.ps-diff-added {
  background: rgba(46, 160, 67, 0.22) !important;
  color: #7ee787 !important;
  padding: 1px 3px !important;
  border-radius: 3px !important;
}

.ps-diff-removed {
  background: rgba(229, 83, 75, 0.22) !important;
  color: #fca5a5 !important;
  text-decoration: line-through !important;
  padding: 1px 3px !important;
  border-radius: 3px !important;
}

.ps-diff-unchanged {
  color: var(--ps-text) !important;
}

/* \u2500\u2500\u2500 Bottom Status Bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.ps-statusbar {
  height: 26px !important;
  background: var(--ps-bg-header) !important;
  border-top: 1px solid var(--ps-border) !important;
  display: flex !important;
  align-items: center !important;
  padding: 0 14px !important;
  font-size: 11px !important;
  color: var(--ps-text-muted) !important;
  gap: 16px !important;
  flex-shrink: 0 !important;
}

.ps-status-item {
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
}

.ps-kbd {
  background: var(--ps-bg-panel) !important;
  border: 1px solid var(--ps-border-strong) !important;
  padding: 1px 4px !important;
  border-radius: 3px !important;
  font-size: 10px !important;
  font-family: var(--ps-mono) !important;
}

/* \u2500\u2500\u2500 Studio Settings: Dictionary, Microphone & Sound Cues \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.ps-dict-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.ps-dict-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.ps-dict-input {
  flex: 1;
  min-width: 0;
  height: 34px;
  padding: 6px 12px;
  background-color: var(--ps-input-bg, #0f1115);
  border: 1px solid var(--ps-border, #2a2e37);
  border-radius: 8px;
  color: var(--text-primary, #e2e8f0);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  color-scheme: dark;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.ps-dict-input:hover:not(:disabled) {
  border-color: var(--ps-text-subtle, #64748b);
}
.ps-dict-input:focus {
  border-color: var(--ps-accent, #3b82f6);
  box-shadow: 0 0 0 1px var(--ps-accent, #3b82f6);
}
.ps-dict-input::placeholder {
  color: var(--ps-text-subtle, #64748b);
}
.ps-dict-input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.ps-dict-add-btn {
  height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  font-weight: 600;
  flex-shrink: 0;
}
.ps-dict-well {
  background-color: var(--ps-input-bg, #0f1115);
  border: 1px solid var(--ps-border, #2a2e37);
  border-radius: 8px;
  padding: 12px;
  min-height: 54px;
  display: flex;
  align-items: center;
}
.ps-dict-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  list-style: none;
  margin: 0;
  padding: 0;
}
.ps-dict-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 4px 12px;
  border-radius: 9999px;
  background: var(--ps-panel-bg, #181b20);
  border: 1px solid var(--ps-border, #2a2e37);
  color: var(--text-primary, #e2e8f0);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  max-width: 100%;
  transition: border-color 0.15s, background-color 0.15s;
}
.ps-dict-pill:hover {
  border-color: var(--ps-text-subtle, #64748b);
  background: rgba(255, 255, 255, 0.04);
}
.ps-dict-pill-text {
  overflow-wrap: anywhere;
  word-break: break-word;
}
.ps-dict-pill-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 9999px;
  background: transparent;
  color: var(--ps-text-muted, #94a3b8);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 0.15s, color 0.15s;
}
.ps-dict-pill-remove:hover {
  background: rgba(239, 68, 68, 0.18);
  color: #fca5a5;
}
.ps-dict-pill-remove:focus-visible {
  outline: 1px solid var(--ps-accent, #3b82f6);
  outline-offset: 1px;
}
.ps-dict-empty {
  font-size: 12px;
  color: var(--ps-text-subtle, #64748b);
}
.ps-dict-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 2px;
}
.ps-dict-count {
  font-size: 11px;
  color: var(--ps-text-muted, #94a3b8);
}
.ps-dict-clear-btn {
  border-radius: 9999px;
  padding: 4px 12px;
  font-size: 11px;
}
.ps-mic-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.ps-mic-row .ps-select {
  flex: 1;
  min-width: 0;
}
.ps-audio-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--ps-text-muted, #94a3b8);
  line-height: 1.4;
}
.ps-audio-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #3fb950;
  flex-shrink: 0;
}
.ps-audio-dot.warn {
  background: #d29922;
}
.ps-toggle-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background-color: var(--ps-input-bg, #0f1115);
  border: 1px solid var(--ps-border, #2a2e37);
}
.ps-toggle-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ps-toggle-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #e2e8f0);
}
.ps-switch {
  position: relative;
  width: 38px;
  height: 22px;
  border-radius: 9999px;
  background: #2d3340;
  border: 1px solid var(--ps-border, #2a2e37);
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  transition: background-color 0.16s, border-color 0.16s;
}
.ps-switch[aria-checked="true"] {
  background: var(--ps-accent, #3b82f6);
  border-color: var(--ps-accent, #3b82f6);
}
.ps-switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  transition: transform 0.16s;
}
.ps-switch[aria-checked="true"]::after {
  transform: translateX(16px);
}
.ps-switch:focus-visible {
  outline: 2px solid var(--ps-accent, #3b82f6);
  outline-offset: 2px;
}
.ps-volume-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background-color: var(--ps-input-bg, #0f1115);
  border: 1px solid var(--ps-border, #2a2e37);
  transition: opacity 0.15s;
}
.ps-volume-card.disabled {
  opacity: 0.48;
}
.ps-volume-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ps-volume-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ps-volume-slider {
  flex: 1;
  accent-color: var(--ps-accent, #3b82f6);
  cursor: pointer;
  height: 4px;
}
.ps-volume-slider:disabled {
  cursor: not-allowed;
}
.ps-volume-pct {
  min-width: 38px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #e2e8f0);
}

/* \u2500\u2500\u2500 Home Screen Widget & Visibility Settings \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.ps-home-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 8px;
  background-color: var(--bg-panel, #181b20);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  color: var(--text-primary, #e2e8f0);
}
.ps-home-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.ps-home-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ps-home-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}
.ps-home-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-muted, #94a3b8);
}
.ps-home-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.ps-home-status {
  font-size: 12px;
  color: #86efac;
}
.ps-home-error {
  font-size: 12px;
  color: #fca5a5;
}
.ps-vis-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: var(--text-primary, #e2e8f0);
}
.ps-vis-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.ps-vis-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.ps-vis-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted, #94a3b8);
}
.ps-vis-status-slot {
  min-width: 56px;
  text-align: right;
}
.ps-vis-status {
  font-size: 11px;
  color: var(--text-muted, #94a3b8);
}
.ps-vis-error {
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #fca5a5;
  font-size: 12px;
}
.ps-vis-presets {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 8px;
}
.ps-vis-preset-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border, #2a2e37);
  background: var(--bg-input, #0f1115);
  color: var(--text-primary, #e2e8f0);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}
.ps-vis-preset-card:hover:not(:disabled) {
  border-color: var(--text-subtle, #64748b);
  background: rgba(255, 255, 255, 0.04);
}
.ps-vis-preset-card.active {
  border-color: var(--accent, #3b82f6);
  background: rgba(59, 130, 246, 0.14);
}
.ps-vis-preset-card:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.ps-vis-preset-label {
  font-size: 12px;
  font-weight: 600;
}
.ps-vis-preset-desc {
  font-size: 11px;
  line-height: 1.35;
  color: var(--text-muted, #94a3b8);
}
.ps-vis-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ps-vis-help {
  color: var(--text-muted, #94a3b8);
}
.ps-vis-select-row {
  flex-wrap: wrap;
}
.ps-vis-select {
  width: auto !important;
  min-width: 220px;
}
.ps-vis-note {
  margin: 0;
  font-size: 11px;
  color: var(--text-muted, #94a3b8);
}
`;var yn="zcc-ext-prompt-voice-styles";function W(){if(typeof document>"u")return;let e=document.getElementById(yn);e||(e=document.createElement("style"),e.id=yn,document.head.appendChild(e)),e.textContent!==Tt&&(e.textContent=Tt)}var Vo=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4"];var G=class extends Error{code;constructor(t,o){super(o),this.name="RecordingError",this.code=t}};function Uo(e){return Vo.find(t=>e(t))??null}var zo="audio/webm";function xn(){return{getUserMedia:e=>navigator.mediaDevices.getUserMedia(e),createRecorder:(e,t)=>new MediaRecorder(e,t?{mimeType:t}:void 0),isTypeSupported:e=>typeof MediaRecorder<"u"&&MediaRecorder.isTypeSupported(e)}}async function jo(e,t){let o=t&&t!=="default"?t:void 0,r=o?{audio:{deviceId:{exact:o}}}:{audio:!0};try{return await e.getUserMedia(r)}catch(i){let s=i instanceof Error?i.name:"";if(s==="NotAllowedError"||s==="SecurityError")throw new G("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again.");if(o&&(s==="OverconstrainedError"||s==="NotFoundError"))try{return await e.getUserMedia({audio:!0})}catch(c){let p=c instanceof Error?c.name:"";if(p==="NotAllowedError"||p==="SecurityError")throw new G("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again.")}throw new G("MIC_UNAVAILABLE","No microphone is available. Connect one and try again.")}}function kt(e){return new Promise((t,o)=>{let r=new FileReader;r.onload=()=>{let i=typeof r.result=="string"?r.result:"";t(i.slice(i.indexOf(",")+1))},r.onerror=()=>o(new G("RECORDING_FAILED","The recording could not be read.")),r.readAsDataURL(e)})}async function Fo(e,t){let o=new Blob(e,{type:t});return{base64:await kt(o),mimeType:o.type||t}}function $o(e,t){if(!(e>0&&Number.isFinite(e)))return()=>{};let o=setTimeout(t,e);return()=>clearTimeout(o)}var Ho="That recording is too large to transcribe. Keep dictation shorter and try again.";function Bo(e,t){let o=Math.max(t,e),r=[],i=0,s=!1;return{chunks:r,get overflowed(){return s},add(c){return c.size===0||s?"ignored":i+c.size>o?(s=!0,"overflow"):(r.push(c),i+=c.size,i>=e?"limit-reached":"accepted")}}}function Wo(e,t){let o=new Promise((r,i)=>{e.onstop=()=>r(),e.onerror=()=>{let s=new G("RECORDING_FAILED","Recording stopped unexpectedly. Try again.");t(s),i(s)}});return o.catch(()=>{}),o}function Go(e,t,o,r){let i=Wo(e,r);return e.ondataavailable=s=>{let c=t.add(s.data);(c==="limit-reached"||c==="overflow")&&o()},e.start(1e3),i}async function qo(e,t,o,r){try{await e}finally{t()}if(o.overflowed)throw new G("RECORDING_FAILED",Ho);return Fo(o.chunks,r)}function Zo(e){let t=()=>{};return{stopRecorder(){t(),e.state!=="inactive"&&e.stop()},armTimer(o,r){t=$o(o,r)}}}function Yo(e,t){let o=null;return{attach(r){o=r},detach(){o=null},autoStop(){e();let r=o?.onAutoStop;o&&(o.onAutoStop=void 0),r?.()},fail(r){e(),t();let i=o?.onError;o=null,i?.(r)}}}function Ko(e,t,o,r){let i=Bo(r.maxBytes??9437184,r.hardMaxBytes??10485760),{stopRecorder:s,armTimer:c}=Zo(e),p=Yo(s,t);c(r.maxDurationMs??12e4,p.autoStop);let d=Go(e,i,p.autoStop,p.fail),u={onError:r.onError,onAutoStop:r.onAutoStop,async stop(){s();try{return await qo(d,t,i,e.mimeType||o)}finally{p.detach()}},cancel(){s(),t(),p.detach()}};return p.attach(u),u}var se=e=>Xo(xn(),e);async function Xo(e=xn(),t={}){let o=await jo(e,t.deviceId),r=Jo(o),i=o.getTracks(),s,c=()=>{for(let p of i)s&&p.removeEventListener?.("ended",s);r?.close(),i.forEach(p=>p.stop())};try{let p=Uo(e.isTypeSupported)??zo,d=e.createRecorder(o,p),u=Ko(d,c,p,t);return u.getAudioLevel=()=>r?.level()??null,s=()=>{let f=u.onError;u.cancel(),f?.(new G("MIC_UNAVAILABLE","Microphone disconnected. Check your device and try again."))},i.forEach(f=>f.addEventListener?.("ended",s)),u}catch(p){throw c(),p instanceof G?p:new G("RECORDING_FAILED",p instanceof Error?p.message:"The recording could not be started.")}}function Jo(e){let t;try{t=new AudioContext;let o=t.createMediaStreamSource(e),r=t.createAnalyser();r.fftSize=256,o.connect(r);let i=new Uint8Array(r.fftSize),s=t,c=!1;return{level(){if(s.state&&s.state!=="running")return null;r.getByteTimeDomainData(i);let p=i.reduce((d,u)=>d+((u-128)/128)**2,0)/i.length;return Math.min(1,Math.sqrt(p)*5)},close(){c||(c=!0,o.disconnect(),s.close().catch(p=>console.error("Prompt Voice audio meter cleanup failed",p)))}}}catch(o){return t&&t.close().catch(r=>console.error("Prompt Voice audio meter cleanup failed",r)),console.warn("Prompt Voice audio meter unavailable",o),null}}var Nt=["both","main","projects","off"];var Qo="both",Dt=[{id:"all",label:"Main Screen & Projects",description:"Show on Zana Home, inside Projects, and in all composers.",settings:{showHomeWidget:!0,showInProjects:!0,micVisibility:"both"}},{id:"projects",label:"Projects Only",description:"Show the Prompt Studio tab and mic button only inside projects.",settings:{showHomeWidget:!1,showInProjects:!0,micVisibility:"projects"}},{id:"main",label:"Main Screen Only",description:"Show on Zana Home and global composers; hide project tabs and project mics.",settings:{showHomeWidget:!0,showInProjects:!1,micVisibility:"main"}},{id:"mic-only",label:"Composer Mic Only",description:"Hide the Home widget and project tabs; keep only the composer mic.",settings:{showHomeWidget:!1,showInProjects:!1,micVisibility:"both"}}],wn={both:"Everywhere (Main & Projects)",main:"Main screen composers only",projects:"Project composers only",off:"Hidden"};function Sn(e,t){if(typeof e=="boolean")return e;if(typeof e=="string"){let o=e.trim().toLowerCase();if(o==="true")return!0;if(o==="false")return!1}return t}function er(e){return typeof e=="string"&&Nt.includes(e)?e:Qo}function _t(e){let t=e??{};return{showHomeWidget:Sn(t.showHomeWidget,!0),showInProjects:Sn(t.showInProjects,!0),micVisibility:er(t.micVisibility)}}function An(e){for(let t of Dt)if(t.settings.showHomeWidget===e.showHomeWidget&&t.settings.showInProjects===e.showInProjects&&t.settings.micVisibility===e.micVisibility)return t.id;return"custom"}function Cn(e,t,o){if(e==="off")return!1;if(e==="both")return!0;let r=t&&typeof t=="object"&&"projectId"in t?t.projectId:void 0,i=r!==void 0?r:o,s=typeof i=="string"&&i.length>0;return e==="projects"?s:!s}var Ne="prompt-voice";function tr(e){return Ne}function nr(){try{let e=pn;return typeof e=="function"?e:void 0}catch{return}}function or(){try{return typeof Ct=="function"?Ct():null}catch{return null}}function rt(){try{return typeof Et=="function"?Et():null}catch{return null}}function Pn(){try{return typeof Pt=="function"?Pt():null}catch{return null}}function it(){try{return typeof Rt=="function"?Rt():null}catch{return null}}function Rn(){try{return typeof $e=="function"?$e():null}catch{return null}}function rr(){try{return typeof Fe=="function"?Fe():null}catch{return null}}function st(e){let t=rr(),o=w(t);o.current=t;let r=w(e);return r.current=e,$(()=>({async call(i,s){let c=nr(),p=s!==void 0,d=async()=>{if(!c)throw new Error("Prompt Voice RPC is unavailable in this environment.");return p?await c(Ne,i,s):await c(Ne,i)};if(r.current&&r.current!==Ne&&c)return d();let u=o.current;if(u)try{return p?await u.call(i,s):await u.call(i)}catch(f){if(c&&f instanceof Error&&/unknown rpc/i.test(f.message))return d();throw f}return d()}}),[])}function Mt(e,t){try{typeof At=="function"&&At(e,t)}catch{}}function me(){let t=or()?.values,o=_t(t),[r,i]=b(null);return _(()=>{i(null)},[o.showHomeWidget,o.showInProjects,o.micVisibility]),Mt(gn,s=>{s&&typeof s=="object"&&i(_t(s))}),r??o}async function at(e,t){if(typeof wt!="function")throw new Error("Plugin settings API is unavailable in this environment.");await wt(tr(e),t)}var ir={start:[{frequency:523.25,offsetSec:0,durationSec:.11,type:"sine",peakFactor:.9},{frequency:659.25,offsetSec:.075,durationSec:.14,type:"sine",peakFactor:1}],stop:[{frequency:493.88,offsetSec:0,durationSec:.1,type:"sine",peakFactor:.85}],complete:[{frequency:659.25,offsetSec:0,durationSec:.1,type:"sine",peakFactor:.85},{frequency:783.99,offsetSec:.075,durationSec:.16,type:"sine",peakFactor:1}],error:[{frequency:329.63,offsetSec:0,durationSec:.12,type:"triangle",peakFactor:.9},{frequency:246.94,offsetSec:.095,durationSec:.16,type:"triangle",peakFactor:.9}]},lt=null;function sr(){if(typeof window>"u")return null;let e=window.AudioContext??window.webkitAudioContext;return e?((!lt||lt.state==="closed")&&(lt=new e),lt):null}function En(e,t,o){let r=e.currentTime,i=ir[t],s=null,c=0;for(let p of i){let d=e.createOscillator(),u=e.createGain(),f=r+p.offsetSec,v=f+p.durationSec,g=p.offsetSec+p.durationSec+.02,S=o*(p.peakFactor??1);g>=c&&(c=g,s=d),d.type=p.type??"sine",d.frequency.setValueAtTime(p.frequency,f),u.gain.setValueAtTime(1e-4,f),u.gain.exponentialRampToValueAtTime(Math.max(2e-4,S),f+.015),u.gain.exponentialRampToValueAtTime(1e-4,v),d.connect(u),u.connect(e.destination),d.start(f),d.stop(v+.02)}return{finalOsc:s,totalDurationSec:c}}function In(e,t){let o=Math.ceil(t*1e3)+40;return new Promise(r=>{let i=!1,s=null,c=()=>{i||(i=!0,s!==null&&clearTimeout(s),e&&typeof e.removeEventListener=="function"&&e.removeEventListener("ended",c),r())};if(e&&typeof e.addEventListener=="function")e.addEventListener("ended",c,{once:!0});else if(e&&"onended"in e){let p=e.onended;e.onended=function(d){typeof p=="function"&&p.call(this,d),c()}}s=setTimeout(c,o)})}async function ar(e){if(e.state!=="suspended")return e.state==="running";let t=null;try{return await Promise.race([e.resume(),new Promise(o=>{t=setTimeout(o,750)})]),e.state!=="suspended"}catch{return!1}finally{t!==null&&clearTimeout(t)}}function D(e,t){if(!t.enabled)return null;let o=Math.min(100,Math.max(0,t.volume));if(!Number.isFinite(o)||o<=0)return null;try{let r=sr();if(!r)return null;let i=o/100*.2;if(r.state==="suspended")return(async()=>{if(!await ar(r))return;let{finalOsc:d,totalDurationSec:u}=En(r,e,i);await In(d,u)})().catch(()=>{});let{finalOsc:s,totalDurationSec:c}=En(r,e,i);return In(s,c)}catch{return null}}var Lt=16e3,Tn=44,He=2,lr="This recording couldn't be prepared for Local Whisper. Try again.",cr=async(e,t)=>{let r=await new OfflineAudioContext(1,1,t).decodeAudioData(e),i=Array.from({length:r.numberOfChannels},(s,c)=>r.getChannelData(c));return{sampleRate:r.sampleRate,channels:i}};function pr(e){if(e.length===0)return new Float32Array(0);if(e.length===1)return e[0];let t=Math.min(...e.map(r=>r.length)),o=new Float32Array(t);for(let r=0;r<t;r+=1){let i=0;for(let s of e)i+=s[r];o[r]=i/e.length}return o}function dr(e,t){let o=e.length*He,r=new Uint8Array(Tn+o),i=new DataView(r.buffer),s=(c,p)=>{for(let d=0;d<p.length;d+=1)i.setUint8(c+d,p.charCodeAt(d))};s(0,"RIFF"),i.setUint32(4,36+o,!0),s(8,"WAVE"),s(12,"fmt "),i.setUint32(16,16,!0),i.setUint16(20,1,!0),i.setUint16(22,1,!0),i.setUint32(24,t,!0),i.setUint32(28,t*He,!0),i.setUint16(32,He,!0),i.setUint16(34,8*He,!0),s(36,"data"),i.setUint32(40,o,!0);for(let c=0;c<e.length;c+=1){let p=Math.max(-1,Math.min(1,e[c]));i.setInt16(Tn+c*He,p<0?p*32768:p*32767,!0)}return r}function ur(e){let t=atob(e),o=new Uint8Array(t.length);for(let r=0;r<t.length;r+=1)o[r]=t.charCodeAt(r);return o.buffer}async function mr(e,t=cr){let o;try{let r=await t(ur(e.base64),Lt);if(r.sampleRate!==Lt)throw new Error("decoder ignored the requested sample rate");o=dr(pr(r.channels),Lt)}catch{throw new G("RECORDING_FAILED",lr)}return{base64:await kt(new Blob([o],{type:"audio/wav"})),mimeType:"audio/wav"}}async function De(e,t,o=mr){return(await e.call(xe).catch(()=>null))?.audioFormat==="wav"?o(t):t}var kn=globalThis.__ZCC_HOST_REACT__,q=kn.Fragment;function n(e,t,o){return kn.createElement(e,o===void 0?t:{...t,key:o})}var l=n;var fr={system:"Zana Voice",openai:"OpenAI Whisper","google-gemini":"Google Gemini","local-whisper":"Local Whisper"};function br(e,t){let[o,r]=b("system"),[i,s]=b("assistant");return _(()=>{let c=!0;return e.call(xe).then(p=>{if(!c||!p||typeof p!="object")return;let d=p;d.sttProvider&&r(d.sttProvider),d.llmProvider&&s(d.llmProvider)}).catch(()=>{}),e.call(pe).then(p=>{!c||!p||typeof p!="object"||(t.current=ie(p))}).catch(()=>{}),()=>{c=!1}},[t,e]),{sttProvider:o,llmProvider:i}}function gr(e){let[t,o]=b(0);return _(()=>{if(e!=="recording"){o(0);return}let r=Date.now(),i=setInterval(()=>{o(Math.floor((Date.now()-r)/1e3))},250);return()=>clearInterval(i)},[e]),t}async function vr(e,t,o,r,i,s){let c={enabled:o.soundCuesEnabled,volume:o.soundCuesVolume},p=await e.stop();if(!i.current)return;D("stop",c);let d=await De(t,p),u=await t.call(Te,{audio:d.base64,mimeType:d.mimeType});if(i.current){if(u.ok&&u.status==="ok"){D("complete",c),typeof r?.toCompose=="function"?(r.toCompose({initialPrompt:u.text,focusPrompt:!0}),s.setNotice("Draft opened in new thread composer.")):s.setNotice(u.text);return}if(u.ok&&u.status==="no-speech"){s.setNotice("No speech detected. Try again.");return}u.ok||(D("error",c),s.setError(u.message))}}async function hr(e,t,o){let r={enabled:e.soundCuesEnabled,volume:e.soundCuesVolume},i=D("start",r);if(i&&(await i,!o()))return null;let s=await(e.micDeviceId!==M?t({deviceId:e.micDeviceId}):t());return o()?s:(s.cancel(),null)}function yr(e,t,o){let[r,i]=b("idle"),[s,c]=b(null),[p,d]=b(null),u=w(!0),f=w(null),v=w(0),g=w(re()),{sttProvider:S,llmProvider:A}=br(e,g),k=gr(r);_(()=>(u.current=!0,()=>{u.current=!1,v.current++,f.current?.cancel(),f.current=null}),[]);let E=T(async()=>{let C=f.current;if(f.current=null,!C){i("idle");return}let j=g.current;i("transcribing");try{await vr(C,e,j,t,u,{setNotice:c,setError:d})}catch(te){if(!u.current)return;D("error",{enabled:j.soundCuesEnabled,volume:j.soundCuesVolume}),d(te instanceof Error?te.message:"Quick dictation failed.")}finally{u.current&&i("idle")}},[t,e]),h=T(async()=>{d(null),c(null);let C=re();g.current=C;let j={enabled:C.soundCuesEnabled,volume:C.soundCuesVolume},te=++v.current;i("starting");try{let Z=await hr(C,o,()=>u.current&&v.current===te);if(!Z)return;Z.onError=ne=>{f.current=null,u.current&&(D("error",j),d(ne.message),i("idle"))},Z.onAutoStop=()=>{u.current&&E()},f.current=Z,i("recording")}catch(Z){if(!u.current)return;D("error",j),d(Z instanceof Error?Z.message:"Microphone access denied."),i("idle")}},[o,E]),L=T(()=>{v.current++,f.current?.cancel(),f.current=null,i("idle")},[]);return{sttProvider:S,llmProvider:A,phase:r,seconds:k,notice:s,error:p,start:h,stopAndTranscribe:E,cancel:L}}function xr({phase:e,formattedTime:t,onToggleDictate:o,onCancel:r,onOpenStudio:i}){let s=e==="starting"?"Starting mic\u2026":e==="recording"?`Stop & Compose (${t})`:e==="transcribing"?"Transcribing\u2026":"Dictate to New Thread";return l("div",{className:"ps-home-actions",children:[n("button",{type:"button",className:`ps-btn ${e==="recording"?"ps-btn-danger":"ps-btn-primary"}`,disabled:e==="starting"||e==="transcribing",onClick:o,children:s}),e==="starting"||e==="recording"?n("button",{type:"button",className:"ps-btn",onClick:r,children:"Cancel"}):n("button",{type:"button",className:"ps-btn",onClick:i,children:"Open Prompt Studio"})]})}function Nn(e){return me().showHomeWidget?n(Sr,{...e}):null}function Sr({pluginId:e,projectId:t,startSession:o=se}){W();let r=st(e),i=it(),s=yr(r,i,o),c=T(()=>{if(t&&typeof i?.toProject=="function"){i.toProject(t,{tabId:ke});return}i?.toPluginPanel?.(ue)},[i,t]),p=()=>{s.phase==="recording"?s.stopAndTranscribe():s.phase==="idle"&&s.start()},d=`${Math.floor(s.seconds/60)}:${String(s.seconds%60).padStart(2,"0")}`,u=fr[s.sttProvider]??s.sttProvider,f=s.llmProvider==="none"?"Raw transcript":"AI cleanup on";return l("div",{className:"ps-home-card","data-testid":"pv-home-widget",children:[l("div",{className:"ps-home-card-top",children:[l("div",{className:"ps-home-copy",children:[l("div",{className:"ps-home-heading",children:[n("span",{"aria-hidden":"true",children:"\u{1F399}\uFE0F"}),n("span",{children:"Dictate a new thread or refine in Prompt Studio"})]}),l("div",{className:"ps-home-meta",children:[n("span",{children:u}),n("span",{"aria-hidden":"true",children:"\xB7"}),n("span",{children:f})]})]}),n(xr,{phase:s.phase,formattedTime:d,onToggleDictate:p,onCancel:s.cancel,onOpenStudio:c})]}),s.notice?n("div",{role:"status",className:"ps-home-status",children:s.notice}):null,s.error?n("div",{role:"alert",className:"ps-home-error",children:s.error}):null]})}function _e(e,t){let o=t.trim();return o?e?/\s$/.test(e)?`${e}${o}`:`${e} ${o}`:o:e}var wr="No speech detected.",Ot={phase:"idle",notice:null,error:null};function Dn(e,t){switch(t.type){case"START":return e.phase==="idle"||e.phase==="error"?{phase:"starting",notice:null,error:null}:e;case"STARTED":return e.phase==="starting"?{...e,phase:"recording"}:e;case"STOP":return e.phase==="recording"||e.phase==="starting"?{phase:"processing",notice:null,error:null}:e;case"CANCEL":return e.phase==="recording"||e.phase==="starting"?{...Ot}:e;case"SUCCESS":case"NO_SPEECH":return e.phase!=="processing"?e:{phase:"idle",notice:t.type==="NO_SPEECH"?wr:t.notice,error:null};case"CLEAR_NOTICE":return e.notice?{...e,notice:null}:e;case"FAILURE":return{phase:"error",notice:null,error:t.message}}}var Ar="Prompt Voice returned an unexpected response. Try again.",Cr="Dictation failed. Try again.",Pr=4e3;function Rr(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}function Er(e){return typeof e=="object"&&e!==null&&!("ok"in e&&"status"in e)}async function Ir(e,t){let o=await De(e,t),r=await e.call(Te,{audio:o.base64,mimeType:o.mimeType});if(!Rr(r))throw new Error(Ar);return r}function _n(e){return e instanceof Error&&e.message?e.message:Cr}function Me(e){return{enabled:e.soundCuesEnabled,volume:e.soundCuesVolume}}function Tr(e,t,o,r=re()){if(!e.ok){D("error",Me(r)),o({type:"FAILURE",message:e.message});return}if(e.status==="no-speech"){o({type:"NO_SPEECH"});return}D("complete",Me(r)),t.updateText(s=>_e(s,e.text)),t.focus();let i=e.refineNotice?`Inserted the raw transcript. ${e.refineNotice.message}`:"Added to draft.";o({type:"SUCCESS",notice:i})}function kr(e,t,o,r){return t()?(e.onError=i=>{t()&&r(i)},e.onAutoStop=()=>{t()&&o()},e):(e.cancel(),null)}function Nr(e,t,o,r,i,s){let c=p=>{D("error",Me(s())),i({type:"FAILURE",message:_n(p)})};return e.then(p=>{if(!p)return null;let d=kr(p,o,r,u=>{t.current=null,c(u)});return d&&(t.current=d),d},p=>(o()&&c(p),null))}function Dr(e,t,o){let r=w(null),i=w(null),s=w(0),c=w(!0),p=T(()=>{s.current++,i.current=null,r.current&&(r.current.cancel(),r.current=null),t({type:"CANCEL"})},[t]);_(()=>(c.current=!0,()=>{c.current=!1,p()}),[p]);let d=T(async()=>{let g=i.current?await i.current:r.current;return r.current=null,g},[]),u=T(async(g,S)=>{let A=++s.current,k=()=>c.current&&s.current===A,E=D("start",Me(S)),L=Nr((async()=>E&&(await E,!k())?null:await(S.micDeviceId!==M?e({deviceId:S.micDeviceId}):e()))(),r,k,g,t,o);i.current=L,await L&&k()&&t({type:"STARTED"}),i.current===L&&(i.current=null)},[t,o,e]),f=T(()=>c.current,[]),v=T(()=>r.current?.getAudioLevel?.()??null,[]);return{start:u,takeSession:d,cancel:p,isMounted:f,getAudioLevel:v}}function Mn({startSession:e=se,noticeDurationMs:t=Pr}={}){let o=$e(),r=Fe(),i=w(r);i.current=r;let[s,c]=mn(Dn,Ot),p=w(s.phase);p.current=s.phase;let d=w(null),u=w(re()),f=T(()=>u.current,[]),{start:v,takeSession:g,cancel:S,isMounted:A,getAudioLevel:k}=Dr(e,c,f),[E,h]=b(null),[L,C]=b(0),[j,te]=b(!1);_(()=>{let z=!0;return i.current.call(pe).then(X=>{if(!z||!Er(X))return;let H=ie(X);d.current=H,(p.current==="idle"||p.current==="error")&&(u.current=H)}).catch(()=>{}),()=>{z=!1}},[]),_(()=>{if(s.phase!=="recording"){h(null),C(0);return}let z=Date.now(),X=()=>{h(k()),C(Math.floor((Date.now()-z)/1e3))};X();let H=setInterval(X,100);return()=>clearInterval(H)},[k,s.phase]),_(()=>{if(!s.notice)return;let z=setTimeout(()=>{c({type:"CLEAR_NOTICE"})},t);return()=>clearTimeout(z)},[t,s.notice]);let Z=T(()=>{c({type:"CLEAR_NOTICE"})},[]),ne=T(async()=>{let z=u.current;c({type:"STOP"});let X=await g();if(!(!A()||!X))try{let H=await X.stop();if(!A())return;D("stop",Me(z));let Be=await Ir(r,H);if(!A())return;Tr(Be,o,c,z)}catch(H){if(!A())return;D("error",Me(z)),c({type:"FAILURE",message:_n(H)})}},[o,A,r,g]),Se=T(async()=>{let z=It()??d.current??ce({});u.current=z,te(!1),c({type:"START"}),await v(()=>{te(!0),ne()},z)},[ne,v]),K=T(()=>{s.phase==="recording"||s.phase==="starting"?ne():s.phase!=="processing"&&Se()},[Se,ne,s.phase]);return{phase:s.phase,error:s.error,notice:s.notice,level:E,seconds:L,autoStopped:j,onClick:K,cancel:S,clearNotice:Z,beginDictation:Se,finishDictation:ne}}var _r="Dictation",Mr={idle:"Start dictation",starting:"Stop dictation",recording:"Stop dictation",processing:"Transcribing",error:"Start dictation"},Ln={position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",border:0};function On({startSession:e=se}){let t=me(),o=rt(),r=Pn();return Cn(t.micVisibility,o?.scope,r?.projectId)?n(Lr,{startSession:e}):null}function Lr({startSession:e=se}){W();let{phase:t,error:o,notice:r,onClick:i,cancel:s,clearNotice:c,level:p,seconds:d,autoStopped:u}=Mn({startSession:e}),f=t==="starting"||t==="recording"||t==="processing",v=t==="idle"&&!!r,g=`${Math.floor(d/60)}:${String(d%60).padStart(2,"0")}`;return l("div",{className:`pv-mic pv-dictation-pill pv-phase-${t} ${v?"pv-has-notice":""}`,onClick:v?c:void 0,title:v?"Click to dismiss":void 0,children:[n("button",{type:"button",className:`pv-mic-button pv-mic-${t} ${f?"pv-pill-btn-stop":"pv-idle-icon"}`,"aria-label":_r,"aria-pressed":t==="recording"||t==="starting",title:Mr[t],disabled:t==="processing",onClick:i,style:v?{display:"none"}:void 0,children:t==="idle"||t==="error"?n("svg",{viewBox:"0 0 24 24",width:"16",height:"16","aria-hidden":"true",focusable:"false",children:n("path",{d:"M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5Zm6 9h2v-3h-2v3Z",fill:"currentColor"})}):t==="processing"?n("span",{className:"pv-mic-spinner","aria-hidden":"true"}):n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("rect",{x:"6",y:"6",width:"12",height:"12",rx:"2.5",fill:"currentColor"})})}),v?l("span",{role:"status",className:"pv-notice-content",children:[n("span",{className:"pv-notice-check",children:"\u2713"}),n("span",{className:"pv-pill-status",children:r})]}):null,t==="starting"?l(q,{children:[l("div",{className:"pv-pill-timer-badge",children:[n("div",{className:"pv-pill-dot pv-pill-dot-starting"}),n("span",{className:"pv-pill-timer-text",children:"0:00"})]}),l("div",{className:"pv-pill-center",role:"status",children:[n("span",{className:"pv-mic-spinner","aria-hidden":"true"}),n("span",{className:"pv-pill-status",children:"Requesting microphone\u2026"})]})]}):null,t==="recording"?l(q,{children:[l("div",{className:"pv-pill-timer-badge",children:[n("div",{className:"pv-pill-dot"}),l("span",{className:"pv-pill-timer-text",children:[n("span",{className:"pv-sr-only",style:Ln,children:"Recording "}),g]})]}),l("div",{className:"pv-pill-center",role:"status",children:[p===null?n("span",{className:"pv-sr-only",style:Ln,children:"Audio meter unavailable"}):null,n("span",{className:`pv-pill-waveform ${p===null?"animated":""}`,"aria-label":"Microphone audio activity",role:"meter","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":Math.round((p??.3)*100),children:[.4,.7,1,.7,.4].map((S,A)=>n("span",{className:"pv-pill-waveform-bar",style:p!==null?{height:`${Math.max(3,p*S*20)}px`}:void 0},A))}),n("span",{className:"pv-pill-status",children:"Listening..."}),p!==null&&p<.015&&d>=5?n("span",{className:"pv-mic-quiet-warning",children:"No audio detected \u2014 check your microphone."}):null]})]}):null,t==="processing"?l(q,{children:[n("div",{className:"pv-pill-timer-badge",children:n("span",{className:"pv-pill-timer-text",children:g})}),n("div",{className:"pv-pill-center",role:"status",children:l("span",{className:"pv-pill-status",children:[n("span",{className:"pv-mic-spinner","aria-hidden":"true"})," ",u?"Recording limit reached. ":"","Transcribing and refining\u2026"]})})]}):null,t==="starting"||t==="recording"?n("button",{type:"button",className:"pv-mic-cancel pv-pill-btn-cancel",onClick:s,"aria-label":"Cancel recording",title:"Cancel recording",children:n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("path",{d:"M18 6L6 18M6 6l12 12",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round"})})}):null,t==="error"&&o?n("span",{role:"alert",className:"pv-pill-status pv-mic-error",children:o}):null]})}var Or=500,Vr=5e3;function Vt(e){return e>=1e3**3?`${(e/1e3**3).toFixed(1)} GB`:`${Math.round(e/1e3**2)} MB`}function Ur(e){return e.runtime.status==="installing"||e.server.state==="starting"||e.models.some(t=>t.status==="downloading")}function zr(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}function jr(e){let[t,o]=b(null),[r,i]=b(null),[s,c]=b(null),p=w(!0),d=T(g=>{if(p.current){if(!zr(g)){i("Local Whisper returned an unexpected response.");return}g.state&&o(g.state),i(g.ok?null:g.message)}},[]),u=T(()=>e.call(Q.state).then(d,()=>p.current&&i("Could not load Local Whisper status.")),[e,d]),f=T(async(g,S,A)=>{c(g);try{d(await e.call(S,A))}catch{p.current&&i("Local Whisper request failed. Try again.")}finally{p.current&&c(null)}},[e,d]);_(()=>(p.current=!0,u(),()=>{p.current=!1}),[u]);let v=t?Ur(t):!1;return _(()=>{let g=setInterval(()=>void u(),v?Or:Vr);return()=>clearInterval(g)},[v,u]),{state:t,error:r,pending:s,run:f}}function Ut({tone:e}){return n("span",{"aria-hidden":"true",style:{width:9,height:9,borderRadius:"50%",marginTop:4,flex:"none",background:{ok:"var(--ps-success)",warn:"var(--ps-warn)",err:"var(--ps-danger)",busy:"var(--ps-accent)",idle:"var(--ps-text-muted)"}[e]}})}function Vn({value:e,label:t}){let o=Math.round(e*100);return n("div",{role:"progressbar","aria-label":t,"aria-valuenow":o,"aria-valuemin":0,"aria-valuemax":100,style:{height:5,minWidth:80,background:"var(--ps-bg-hover)",borderRadius:3,overflow:"hidden"},children:n("div",{style:{width:`${o}%`,height:"100%",background:"var(--ps-accent)"}})})}var ct={display:"flex",gap:10,alignItems:"flex-start",padding:"10px 12px",borderRadius:6,border:"1px solid var(--ps-border)"},fe={color:"var(--ps-text-muted)",fontSize:11};function Fr(e){let{runtime:t,server:o,activeModelId:r}=e;return t.status==="not-installed"?{tone:"idle",title:"Runtime not installed",detail:`whisper.cpp ${t.version} \xB7 requires ${t.requirements.join(", ")||"no extra components"}`,action:{label:"Install runtime",method:Q.installRuntime,primary:!0}}:t.status==="installing"?{tone:"busy",title:`Installing runtime\u2026 ${Math.round((t.progress??0)*100)}%`,detail:"Verifying the download as it arrives.",action:{label:"Cancel",method:Q.cancelRuntimeInstall}}:o.state==="running"?{tone:"ok",title:"Running",detail:`Model ${o.modelId} \xB7 on this device (127.0.0.1) \xB7 managed by Prompt Voice`,action:{label:"Stop",method:Q.stop}}:o.state==="starting"?{tone:"busy",title:"Starting\u2026",detail:`Loading model ${o.modelId}.`}:o.state==="crashed"?{tone:"err",title:"Stopped unexpectedly",detail:`Exit code ${o.exitCode??"unknown"}. Logs contain no audio or transcripts.`,action:{label:"Restart",method:Q.start,primary:!0}}:r?{tone:"warn",title:"Stopped",detail:"Starts automatically when you dictate.",action:{label:"Start",method:Q.start}}:{tone:"warn",title:"Runtime installed",detail:"Download a model below and choose Use to start."}}function $r({model:e,state:t,pending:o,onRun:r}){let i=t.activeModelId===e.id,s=t.runtime.status==="installed"&&!i,c=f=>`${f}:${e.id}`,p={modelId:e.id},d=null,u;return e.status==="downloading"?(d=l(q,{children:[n(Vn,{value:e.progress??0,label:`Downloading ${e.label}`}),l("span",{style:fe,children:[Math.round((e.progress??0)*100),"% of ",Vt(e.sizeBytes)]})]}),u=n("button",{type:"button",className:"ps-btn",onClick:()=>r(c("cancel"),Q.cancelModelDownload,p),children:"Cancel"})):e.status==="available"?u=l("button",{type:"button",className:"ps-btn",disabled:o===c("download"),onClick:()=>r(c("download"),Q.downloadModel,p),children:["Download ",Vt(e.sizeBytes)]}):(d=i?n("span",{className:"ps-tag",children:"Active"}):o===c("use")?n("span",{className:"ps-tag",children:"Loading\u2026"}):n("span",{className:"ps-tag",children:"Installed"}),u=l(q,{children:[s&&n("button",{type:"button",className:"ps-btn",disabled:o!==null,onClick:()=>r(c("use"),Q.selectModel,p),children:"Use"}),n("button",{type:"button",className:"ps-btn ps-btn-danger",disabled:i||o!==null,title:i?"Choose another model before removing this one":void 0,"aria-label":`Remove ${e.label}`,onClick:()=>r(c("remove"),Q.removeModel,p),children:"Remove"})]})),l("tr",{style:i?{background:"color-mix(in srgb, var(--ps-accent) 10%, transparent)"}:void 0,children:[l("td",{style:{padding:"8px 6px"},children:[n("strong",{children:e.label})," ",e.recommended&&n("span",{className:"ps-tag",children:"Recommended"})]}),l("td",{style:{padding:"8px 6px",...fe},children:[Vt(e.sizeBytes)," disk",e.memoryEstimate?l(q,{children:[n("br",{}),e.memoryEstimate," RAM"]}):null]}),n("td",{style:{padding:"8px 6px"},children:n("div",{style:{display:"flex",flexDirection:"column",gap:4},children:d})}),n("td",{style:{padding:"8px 6px",textAlign:"right",whiteSpace:"nowrap"},children:n("div",{style:{display:"inline-flex",gap:6},children:u})})]})}function Hr(e,t){let o=e==="local-whisper";return o&&t==="none"?{offline:!0,text:"Audio and text stay on this device."}:o?{offline:!1,text:"Audio stays on this device. Cleanup sends the transcript to your selected cleanup model."}:{offline:!1,text:"Audio leaves this device for transcription."}}function Un({rpc:e,sttProvider:t,llmProvider:o,onApplyPreset:r}){let{state:i,error:s,pending:c,run:p}=jr(e),d=Hr(t,o),u=i?.runtime.status==="installed"&&i.activeModelId!==null;return l("section",{className:"ps-pane",style:{flex:"none"},"aria-labelledby":"ps-lw-title",children:[l("div",{className:"ps-pane-header",children:[n("h2",{id:"ps-lw-title",className:"ps-pane-title",style:{margin:0},children:"Local Whisper"}),n("span",{className:"ps-tag",children:i?i.platform.supported?u?"Ready":"Not set up":"Unavailable":"Loading\u2026"})]}),l("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[n("p",{style:{...fe,margin:0},children:"Transcribe on this device. Audio is never sent anywhere when Local Whisper is the speech provider."}),(s||i?.lastError)&&n("div",{role:"alert",style:{...ct,borderColor:"var(--ps-danger)",color:"var(--ps-danger)",fontSize:12},children:s??i?.lastError?.message}),i&&!i.platform.supported&&l("div",{style:ct,children:[n(Ut,{tone:"err"}),l("div",{children:[n("strong",{children:"Not available on this computer"}),n("div",{style:fe,children:i.platform.message})]})]}),i?.platform.supported&&n(Br,{state:i,pending:c,onRun:p}),i?.platform.supported&&l("div",{children:[l("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"baseline"},children:[n("span",{className:"ps-field-label",children:"Models \xB7 multilingual"}),n("span",{style:fe,children:"Stored in this computer's app data"})]}),l("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:12},children:[n("thead",{children:n("tr",{children:["Model","Size","Status",""].map(f=>n("th",{style:{textAlign:"left",...fe,fontWeight:600,padding:"4px 6px"},children:f},f))})}),n("tbody",{children:i.models.map(f=>n($r,{model:f,state:i,pending:c,onRun:p},f.id))})]})]}),l("div",{style:ct,children:[n(Ut,{tone:d.offline?"ok":"warn"}),l("div",{style:{flex:1},children:[n("strong",{children:d.offline?"Fully offline":"Not fully offline"}),n("div",{style:fe,children:d.text})]}),!d.offline&&n("button",{type:"button",className:"ps-btn",onClick:()=>r({sttProvider:"local-whisper",llmProvider:"none"}),children:"Use offline preset"})]})]})]})}function Br({state:e,pending:t,onRun:o}){let r=Fr(e);return l("div",{style:ct,"aria-live":"polite",children:[n(Ut,{tone:r.tone}),l("div",{style:{flex:1,minWidth:0},children:[n("strong",{children:r.title}),n("div",{style:fe,children:r.detail}),e.runtime.status==="installing"&&n("div",{style:{marginTop:6},children:n(Vn,{value:e.runtime.progress??0,label:"Installing runtime"})})]}),r.action&&n("button",{type:"button",className:r.action.primary?"ps-btn ps-btn-primary":"ps-btn",disabled:t==="runtime",onClick:()=>o("runtime",r.action.method),children:r.action.label})]})}function Wr({statusMessage:e}){return l("div",{className:"ps-vis-header",children:[l("div",{children:[n("h3",{id:"ps-visibility-heading",className:"ps-vis-title",children:"Where Prompt Voice Appears"}),n("p",{className:"ps-vis-subtitle",children:"Control whether Prompt Voice surfaces on the main Home screen, inside Projects, and in thread composers."})]}),n("div",{className:"ps-vis-status-slot",children:e?n("span",{role:"status",className:"ps-vis-status",children:e}):null})]})}function Gr({activePreset:e,disabled:t,onSelect:o}){return n("div",{className:"ps-vis-presets",role:"group","aria-label":"Surface visibility presets",children:Dt.map(r=>{let i=e===r.id;return l("button",{type:"button",className:`ps-vis-preset-card ${i?"active":""}`,"aria-pressed":i,disabled:t,onClick:()=>o(r.settings),children:[n("span",{className:"ps-vis-preset-label",children:r.label}),n("span",{className:"ps-vis-preset-desc",children:r.description})]},r.id)})})}function zn({labelId:e,title:t,helpText:o,checked:r,disabled:i,onToggle:s}){return l("div",{className:"ps-toggle-card",children:[l("div",{className:"ps-toggle-copy",children:[n("span",{id:e,className:"ps-toggle-title",children:t}),n("small",{className:"ps-vis-help",children:o})]}),n("button",{type:"button",className:"ps-switch",role:"switch","aria-checked":r,"aria-labelledby":e,disabled:i,onClick:s})]})}function qr({value:e,disabled:t,onChange:o}){return l("div",{className:"ps-toggle-card ps-vis-select-row",children:[l("div",{className:"ps-toggle-copy",children:[n("label",{htmlFor:"ps-vis-mic-select",className:"ps-toggle-title",children:"Composer mic button placement"}),n("small",{className:"ps-vis-help",children:"Choose which chat composers display the voice dictation mic pill."})]}),n("select",{id:"ps-vis-mic-select","aria-label":"Composer mic button placement",className:"ps-select ps-vis-select",value:e,disabled:t,onChange:r=>o(r.target.value),children:Nt.map(r=>n("option",{value:r,children:wn[r]},r))})]})}function pt(e){W();let t=me(),o=An(t),[r,i]=b(!1),[s,c]=b(null),[p,d]=b(null),u=async f=>{i(!0),d(null),c("Saving\u2026");try{await at(Ne,f),c("Saved")}catch(v){c(null),d(v instanceof Error?v.message:"Could not update visibility settings.")}finally{i(!1)}};return l("section",{className:"ps-vis-section","aria-labelledby":"ps-visibility-heading",children:[n(Wr,{statusMessage:s}),p?n("div",{role:"alert",className:"ps-vis-error",children:p}):null,n(Gr,{activePreset:o,disabled:r,onSelect:f=>void u(f)}),l("div",{className:"ps-vis-controls",children:[n(zn,{labelId:"ps-vis-home-label",title:"Main Home screen widget",helpText:"Show a quick-dictate & Prompt Studio card on Zana\u2019s main Home screen.",checked:t.showHomeWidget,disabled:r,onToggle:()=>void u({showHomeWidget:!t.showHomeWidget})}),n(zn,{labelId:"ps-vis-projects-label",title:"Prompt Studio tab in projects",helpText:"Display a dedicated Prompt Studio tab inside each project with project-scoped drafts.",checked:t.showInProjects,disabled:r,onToggle:()=>void u({showInProjects:!t.showInProjects})}),n(qr,{value:t.micVisibility,disabled:r,onChange:f=>void u({micVisibility:f})})]}),l("p",{className:"ps-vis-note",children:["Tip: You can hide or reorder the global ",n("strong",{children:"Prompt Studio"})," item in Zana\u2019s left sidebar using Zana\u2019s sidebar customize menu."]})]})}function zt(e){if(typeof e!="string")return[];let t=new Set,o=/[,\n]/;for(let r of e.split(o)){let i=r.trim().slice(0,80);if(i&&t.add(i),t.size>=200)break}return[...t]}function jn(e,t){let o=zt(t);if(o.length===0)return[...e];let r=new Set(e),i=[...e];for(let s of o){if(i.length>=200)break;r.has(s)||(r.add(s),i.push(s))}return i}function jt(e){return e.join(`
`)}var Ft=[{code:"auto",label:"Detect automatically"},{code:"af",label:"Afrikaans"},{code:"ar",label:"Arabic"},{code:"hy",label:"Armenian"},{code:"az",label:"Azerbaijani"},{code:"eu",label:"Basque"},{code:"be",label:"Belarusian"},{code:"bn",label:"Bengali"},{code:"bs",label:"Bosnian"},{code:"bg",label:"Bulgarian"},{code:"ca",label:"Catalan"},{code:"zh",label:"Chinese"},{code:"hr",label:"Croatian"},{code:"cs",label:"Czech"},{code:"da",label:"Danish"},{code:"nl",label:"Dutch"},{code:"en",label:"English"},{code:"et",label:"Estonian"},{code:"fi",label:"Finnish"},{code:"fr",label:"French"},{code:"gl",label:"Galician"},{code:"ka",label:"Georgian"},{code:"de",label:"German"},{code:"el",label:"Greek"},{code:"gu",label:"Gujarati"},{code:"he",label:"Hebrew"},{code:"hi",label:"Hindi"},{code:"hu",label:"Hungarian"},{code:"is",label:"Icelandic"},{code:"id",label:"Indonesian"},{code:"ga",label:"Irish"},{code:"it",label:"Italian"},{code:"ja",label:"Japanese"},{code:"kn",label:"Kannada"},{code:"kk",label:"Kazakh"},{code:"ko",label:"Korean"},{code:"lv",label:"Latvian"},{code:"lt",label:"Lithuanian"},{code:"mk",label:"Macedonian"},{code:"ms",label:"Malay"},{code:"ml",label:"Malayalam"},{code:"mt",label:"Maltese"},{code:"mr",label:"Marathi"},{code:"ne",label:"Nepali"},{code:"no",label:"Norwegian"},{code:"fa",label:"Persian"},{code:"pl",label:"Polish"},{code:"pt",label:"Portuguese"},{code:"pa",label:"Punjabi"},{code:"ro",label:"Romanian"},{code:"ru",label:"Russian"},{code:"sr",label:"Serbian"},{code:"sk",label:"Slovak"},{code:"sl",label:"Slovenian"},{code:"es",label:"Spanish"},{code:"sw",label:"Swahili"},{code:"sv",label:"Swedish"},{code:"tl",label:"Tagalog"},{code:"ta",label:"Tamil"},{code:"te",label:"Telugu"},{code:"th",label:"Thai"},{code:"tr",label:"Turkish"},{code:"uk",label:"Ukrainian"},{code:"ur",label:"Urdu"},{code:"vi",label:"Vietnamese"},{code:"cy",label:"Welsh"}];function $n(){if(!(typeof navigator>"u"))return navigator.mediaDevices}function Zr(e){return e.replace(/^default\s*[-–:]\s*/i,"").trim()}function Hn(e){let t=e instanceof Error?e.name:"";return t==="NotAllowedError"||t==="SecurityError"}function Fn(e){let t=e.filter(p=>p.kind==="audioinput"),o=t.some(p=>!!p.label?.trim()),r=null,i=[],s=new Set,c=1;for(let p of t){let d=p.label?.trim()??"";if(p.deviceId===M){d&&(r=Zr(d)||d);continue}!p.deviceId||s.has(p.deviceId)||(s.add(p.deviceId),i.push({deviceId:p.deviceId,label:d||`Microphone ${c}`,isDefault:!1}),c++)}return{devices:i,defaultDeviceLabel:r,labelsAvailable:o}}async function Yr(e){if(!e.getUserMedia||!e.enumerateDevices)return{ok:!1,permissionDenied:!1};try{return(await e.getUserMedia({audio:!0})).getTracks().forEach(o=>o.stop()),{ok:!0,rawDevices:await e.enumerateDevices()}}catch(t){return Hn(t)?{ok:!1,permissionDenied:!0}:(console.warn("Prompt Voice failed to refresh audio input devices",t),{ok:!1,permissionDenied:!1})}}async function Bn(e={}){let t=e.mediaDevices??$n();if(!t?.enumerateDevices)return{devices:[],defaultDeviceLabel:null,labelsAvailable:!1,permissionDenied:!1,supported:!1,error:null};let o;try{o=await t.enumerateDevices()}catch(s){return console.warn("Prompt Voice failed to enumerate audio input devices",s),{devices:[],defaultDeviceLabel:null,labelsAvailable:!1,permissionDenied:Hn(s),supported:!0,error:"Could not list microphones. Using System default."}}let r=Fn(o),i=!1;if(e.requestPermissionIfUnlabeled&&!r.labelsAvailable){let s=await Yr(t);s.ok?r=Fn(s.rawDevices):i=s.permissionDenied}return{...r,permissionDenied:i,supported:!0,error:null}}function Wn(e,t=$n()){if(!t?.addEventListener||!t?.removeEventListener)return()=>{};let o=()=>e();return t.addEventListener("devicechange",o),()=>t.removeEventListener?.("devicechange",o)}function Gn(){let[e,t]=b([]),[o,r]=b(null),[i,s]=b(!0),[c,p]=b(!1),[d,u]=b(null),[f,v]=b(!1),g=w(!0),S=w(0),A=T(async(k=!1)=>{let E=++S.current;g.current&&v(!0);try{let h=await Bn({requestPermissionIfUnlabeled:k});if(!g.current||S.current!==E)return;t(h.devices),r(h.defaultDeviceLabel),s(h.labelsAvailable),p(h.permissionDenied),u(h.error)}catch(h){if(console.warn("Prompt Voice audio device lookup failed",h),!g.current||S.current!==E)return;t([]),u("Could not list microphones. Using System default.")}finally{g.current&&S.current===E&&v(!1)}},[]);return _(()=>{g.current=!0,A(!1);let k=Wn(()=>{A(!1)});return()=>{g.current=!1,S.current++,k()}},[A]),{devices:e,defaultDeviceLabel:o,labelsAvailable:i,permissionDenied:c,error:d,isRefreshing:f,refresh:A}}var Jr={"Voice & transcription":[{key:"sttProvider",label:"Speech-to-text provider",options:["system","google-gemini","openai","local-whisper"]},{key:"inputLanguage",label:"Input language",options:Ft.map(e=>e.code),help:"Spoken language for transcription, or Detect automatically."},{key:"dictionary",label:"Personal dictionary",help:"Add specific names, acronyms, or technical terms to guarantee accurate spelling."}],"Prompt Voice":[{key:"tone",label:"Cleanup tone",options:["conversational","formal","casual","technical","custom"]},{key:"customPrompt",label:"Custom cleanup instructions",multiline:!0}],Connections:[]},$t={sttProvider:"system",inputLanguage:"auto",tone:"conversational"},Qr={...Object.fromEntries(Ft.map(e=>[e.code,e.label])),system:"Zana voice",none:"Off",assistant:"Zana assistant",openai:"OpenAI",anthropic:"Anthropic",google:"Google AI","google-gemini":"Google Gemini","local-whisper":"Local Whisper (on this device)"};function ei(e,t,o){return e.error?{warn:!0,text:e.error}:e.permissionDenied?{warn:!0,text:"Microphone permission denied. Allow microphone access in system settings to see device names."}:t.micDeviceId!==M&&!o?{warn:!0,text:"Selected microphone is currently disconnected. Recording will fall back to System default until reconnected."}:!e.labelsAvailable&&e.devices.length>0?{warn:!1,text:"Device names are hidden until microphone access is granted. Click Refresh to detect names."}:t.micDeviceId===M?{warn:!1,text:"Uses your OS default input device. Saved selection applies to Prompt Studio and Composer dictation."}:{warn:!1,text:`Using ${o?.label??(t.micLabel||t.micDeviceId)}. Saved until you choose another mic.`}}function ti({prefs:e,audio:t,onSelect:o}){let r=t.devices.find(d=>d.deviceId===e.micDeviceId),i=e.micDeviceId!==M&&!r,s=ei(t,e,r),c=t.defaultDeviceLabel?`System default (${t.defaultDeviceLabel})`:"System default",p=d=>{if(d===M){o(M,"");return}let u=t.devices.find(f=>f.deviceId===d);o(d,u?.label??e.micLabel)};return l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-mic-select",className:"ps-field-label",children:"Input microphone"}),l("div",{className:"ps-mic-row",children:[l("select",{id:"ps-mic-select","aria-label":"Input microphone",className:"ps-select",value:e.micDeviceId,onChange:d=>p(d.target.value),children:[n("option",{value:M,children:c}),t.devices.map(d=>n("option",{value:d.deviceId,children:d.label},d.deviceId)),i&&n("option",{value:e.micDeviceId,children:`${e.micLabel||e.micDeviceId} (Disconnected)`})]}),n("button",{type:"button",className:"ps-btn",onClick:()=>void t.refresh(!0),disabled:t.isRefreshing,"aria-label":"Refresh microphones",title:"Refresh connected audio input devices",children:t.isRefreshing?"Refreshing\u2026":"\u21BB Refresh"})]}),l("div",{className:"ps-audio-status",role:t.error?"alert":void 0,children:[n("span",{className:`ps-audio-dot ${s.warn?"warn":""}`,"aria-hidden":"true"}),n("span",{children:s.text})]})]})}function ni({prefs:e,onToggle:t,onVolumeChange:o}){let r=()=>{e.soundCuesEnabled&&D("start",{enabled:!0,volume:e.soundCuesVolume})};return l(q,{children:[l("div",{className:"ps-toggle-card",children:[l("div",{className:"ps-toggle-copy",children:[n("span",{id:"ps-sound-cues-label",className:"ps-toggle-title",children:"Sound cues & chimes"}),n("small",{style:{color:"var(--ps-text-muted)"},children:"Play a subtle chime when dictation starts, finishes, or encounters an error."})]}),n("button",{type:"button",className:"ps-switch",role:"switch","aria-checked":e.soundCuesEnabled,"aria-labelledby":"ps-sound-cues-label",onClick:t})]}),l("div",{className:`ps-volume-card ${e.soundCuesEnabled?"":"disabled"}`,children:[l("div",{className:"ps-volume-header",children:[n("label",{htmlFor:"ps-chime-volume",className:"ps-field-label",children:"Chime volume"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 9px",fontSize:11},disabled:!e.soundCuesEnabled,onClick:r,children:"Test chime"})]}),l("div",{className:"ps-volume-controls",children:[n("input",{id:"ps-chime-volume",type:"range",className:"ps-volume-slider","aria-label":"Chime volume",min:0,max:100,step:5,value:e.soundCuesVolume,disabled:!e.soundCuesEnabled,onChange:i=>o(Number(i.target.value)),onPointerUp:r,onKeyUp:i=>{["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(i.key)&&r()}}),l("span",{className:"ps-volume-pct",children:[e.soundCuesVolume,"%"]})]})]})]})}function oi({values:e,onSave:t}){let o=$(()=>ce(e),[e]),r=Gn();return l("section",{className:"ps-pane",style:{flex:"none"},"aria-labelledby":"ps-audio-feedback-title",children:[l("div",{className:"ps-pane-header",children:[n("h2",{id:"ps-audio-feedback-title",className:"ps-pane-title",style:{margin:0},children:"Audio & Feedback"}),n("button",{type:"button",className:"ps-btn",onClick:()=>t({micDeviceId:M,micLabel:"",soundCuesEnabled:String(!0),soundCuesVolume:String(75)}),children:"Reset"})]}),l("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[n(ti,{prefs:o,audio:r,onSelect:(c,p)=>t({micDeviceId:c,micLabel:p})}),n(ni,{prefs:o,onToggle:()=>{let c=!o.soundCuesEnabled;t({soundCuesEnabled:String(c)}),c&&D("start",{enabled:!0,volume:o.soundCuesVolume})},onVolumeChange:c=>t({soundCuesVolume:String(c)})})]})]})}function ri({terms:e,atLimit:t,onRemove:o,onClearAll:r}){return l(q,{children:[n("div",{className:"ps-dict-well",children:e.length>0?n("ul",{className:"ps-dict-pills","aria-label":"Dictionary terms",children:e.map(i=>l("li",{className:"ps-dict-pill",children:[n("span",{className:"ps-dict-pill-text",children:i}),n("button",{type:"button",className:"ps-dict-pill-remove",onClick:()=>o(i),"aria-label":`Remove ${i}`,title:`Remove ${i}`,children:"\xD7"})]},i))}):n("span",{className:"ps-dict-empty",children:"No terms added yet. Type a term above or paste a comma-separated list."})}),l("div",{className:"ps-dict-footer",children:[l("span",{className:"ps-dict-count",children:[e.length===1?"1 term active":`${e.length} terms active`,t?` (max ${200})`:""]}),n("button",{type:"button",className:"ps-btn ps-dict-clear-btn",onClick:r,disabled:e.length===0,children:"Clear all"})]})]})}function ii({label:e,help:t,value:o,resetSignal:r,onChange:i}){let[s,c]=b(""),p=$(()=>zt(o),[o]),d=p.length>=200;_(()=>{r>0&&c("")},[r]);let u=()=>{let v=s.trim();if(!v||d)return;let g=jn(p,v);c(""),g.length!==p.length&&i(jt(g))};return l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-dictionary-input",className:"ps-field-label",children:e}),t&&n("small",{style:{color:"var(--ps-text-muted)"},children:t}),l("div",{className:"ps-dict-container",children:[l("div",{className:"ps-dict-input-row",children:[n("input",{id:"ps-dictionary-input",type:"text",className:"ps-dict-input",value:s,onChange:v=>c(v.target.value),onKeyDown:v=>{v.key==="Enter"&&(v.preventDefault(),u())},onPaste:v=>{let g=v.clipboardData?.getData("text");if(!g||!/[\r\n]/.test(g))return;v.preventDefault();let S=v.currentTarget.selectionStart??s.length,A=v.currentTarget.selectionEnd??s.length;c(s.slice(0,S)+g.replace(/[\r\n]+/g,", ")+s.slice(A))},placeholder:"Type a term and press Enter (or paste comma-separated)...",disabled:d}),n("button",{type:"button",className:"ps-btn ps-btn-primary ps-dict-add-btn",onClick:u,disabled:!s.trim()||d,children:"+ Add"})]}),n(ri,{terms:p,atLimit:d,onRemove:v=>i(jt(p.filter(g=>g!==v))),onClearAll:()=>{c(""),i("")}})]})]})}function si({field:e,values:t,resetSignal:o,onSave:r}){if(e.key==="dictionary")return n(ii,{label:e.label,help:e.help,value:t.dictionary??"",resetSignal:o,onChange:c=>r({dictionary:c})});let i=t[e.key]??$t[e.key]??"",s=e.options&&e.key==="inputLanguage"&&i&&!e.options.includes(i)?[...e.options,i]:e.options;return l("label",{className:"ps-field-group",children:[n("span",{className:"ps-field-label",children:e.label}),s?n("select",{className:"ps-select",value:i,onChange:c=>r({[e.key]:c.target.value}),children:s.map(c=>n("option",{value:c,children:Qr[c]??c},c))}):e.multiline?n("textarea",{className:"ps-custom-prompt-input",value:t[e.key]??"",onChange:c=>r({[e.key]:c.target.value})}):n("input",{type:e.secret?"password":"text",className:"ps-select",value:t[e.key]??"",onChange:c=>r({[e.key]:c.target.value}),placeholder:e.secret?"Enter API key\u2026":void 0}),e.help&&n("small",{style:{color:"var(--ps-text-muted)"},children:e.help})]})}function Zn({rpc:e,onBack:t,pluginId:o}){W();let[r,i]=b({}),[s,c]=b("Loading\u2026"),[p,d]=b(null),[u,f]=b(0),v=w(0),g=w({}),S=w(e);S.current=e,_(()=>{let k=!0;return S.current.call(pe).then(E=>{if(!k)return;let h=E||{};g.current=h,i(h),ie(h),c("Saved")}).catch(()=>{k&&c("Could not load settings")}),()=>{k=!1}},[]);let A=k=>{let E=++v.current,h=g.current={...g.current,...k};i(h),ie(h),c("Saving\u2026"),S.current.call(de,h).then(()=>{E===v.current&&(d(null),c("Saved"))}).catch(()=>{E===v.current&&(d(h),c("Could not save settings."))})};return n("div",{className:"ps-workspace",children:n("main",{className:"ps-editor-canvas",style:{overflowY:"auto"},children:l("div",{style:{width:"100%",maxWidth:760,margin:"0 auto",display:"flex",flexDirection:"column",gap:12},children:[l("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12},children:[l("div",{children:[n("h1",{style:{fontSize:18,margin:"4px 0"},children:"Settings"}),n("span",{style:{color:"var(--ps-text-muted)",fontSize:12},children:"Configure voice and cleanup defaults"})]}),n("button",{className:"ps-btn",onClick:t,children:"\u2190 Back to Studio"})]}),l("div",{style:{color:"var(--ps-text-muted)",fontSize:11},children:[n("span",{role:"status",children:s}),p&&n("button",{className:"ps-btn",onClick:()=>A(p),children:"Retry"})]}),n(oi,{values:r,onSave:A}),Object.entries(Jr).map(([k,E])=>l(un.Fragment,{children:[l("section",{className:"ps-pane",style:{flex:"none"},children:[l("div",{className:"ps-pane-header",children:[n("h2",{className:"ps-pane-title",style:{margin:0},children:k}),k!=="Connections"&&n("button",{className:"ps-btn",onClick:()=>{k==="Voice & transcription"&&f(h=>h+1),A(Object.fromEntries(E.map(h=>[h.key,$t[h.key]??""])))},children:"Reset"})]}),l("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[k==="Connections"&&n("p",{children:"Manage API keys in Zana\u2019s Prompt Voice plugin settings."}),E.filter(h=>!(h.key==="customPrompt"&&r.tone!=="custom")).map(h=>n(si,{field:h,values:r,resetSignal:u,onSave:A},h.key))]})]}),k==="Voice & transcription"&&n(Un,{rpc:e,sttProvider:r.sttProvider??$t.sttProvider,llmProvider:r.llmProvider,onApplyPreset:A})]},k)),o?n("section",{className:"ps-pane",style:{flex:"none",padding:14},children:n(pt,{pluginId:o})}):null]})})})}function Yn(e){return e?e.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]+/gu)||[]:[]}var Kn=1200;function Xn(e,t){if(!e&&!t)return[];if(e===t)return[{type:"unchanged",text:e}];if(!e)return[{type:"added",text:t}];if(!t)return[{type:"removed",text:e}];let o=Yn(e),r=Yn(t),i=o.length,s=r.length;if(i>Kn||s>Kn)return[{type:"removed",text:e},{type:"added",text:t}];let c=s+1,p=new Uint32Array((i+1)*c);for(let g=1;g<=i;g++){let S=g*c,A=(g-1)*c,k=o[g-1];for(let E=1;E<=s;E++)if(k===r[E-1])p[S+E]=p[A+(E-1)]+1;else{let h=p[S+(E-1)],L=p[A+E];p[S+E]=h>L?h:L}}let d=[],u=i,f=s;for(;u>0||f>0;){let g=u*c,S=(u-1)*c;u>0&&f>0&&o[u-1]===r[f-1]?(d.push({type:"unchanged",text:o[u-1]}),u--,f--):f>0&&(u===0||p[g+(f-1)]>=p[S+f])?(d.push({type:"added",text:r[f-1]}),f--):u>0&&(f===0||p[g+(f-1)]<p[S+f])&&(d.push({type:"removed",text:o[u-1]}),u--)}d.reverse();let v=[];for(let g of d)v.length>0&&v[v.length-1].type===g.type?v[v.length-1].text+=g.text:v.push({...g});return v}var Bt=`
  .ps-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background-color: var(--bg-base, #121417);
    color: var(--text-primary, #e2e8f0);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    overflow: hidden;
    box-sizing: border-box;
    --ps-border: var(--border, #2a2e37);
    --ps-panel-bg: var(--bg-panel, #181b20);
    --ps-input-bg: var(--bg-input, #0f1115);
    --ps-accent: var(--accent, #3b82f6);
    --ps-accent-hover: var(--accent-hover, #2563eb);
    --ps-text-muted: var(--text-muted, #94a3b8);
    --ps-text-subtle: var(--text-subtle, #64748b);
  }

  .ps-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-bottom: 1px solid var(--ps-border);
    background-color: var(--ps-panel-bg);
    flex-shrink: 0;
  }

  .ps-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .ps-header-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary, #e2e8f0);
    letter-spacing: -0.2px;
  }

  .ps-badge {
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 4px;
    background: rgba(59, 130, 246, 0.15);
    color: var(--ps-accent);
    font-weight: 500;
  }

  .ps-badge-project {
    background: rgba(34, 197, 94, 0.14);
    color: #86efac;
  }

  .ps-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ps-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid var(--ps-border);
    background: var(--ps-panel-bg);
    color: var(--text-primary, #e2e8f0);
    transition: background 0.15s, border-color 0.15s;
    user-select: none;
  }
  .ps-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--text-subtle, #64748b);
  }
  .ps-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .ps-btn-primary {
    background: var(--ps-accent);
    color: #ffffff;
    border-color: var(--ps-accent);
  }
  .ps-btn-primary:hover:not(:disabled) {
    background: var(--ps-accent-hover);
    border-color: var(--ps-accent-hover);
  }

  .ps-btn-danger {
    color: #f87171;
  }
  .ps-btn-danger:hover:not(:disabled) {
    background: rgba(248, 113, 113, 0.1);
    border-color: #f87171;
  }

  .ps-workspace {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .ps-sidebar {
    width: 280px;
    border-right: 1px solid var(--ps-border);
    background: var(--ps-panel-bg);
    display: flex;
    flex-direction: column;
    padding: 14px;
    gap: 16px;
    overflow-y: auto;
    flex-shrink: 0;
  }

  .ps-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ps-section-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--ps-text-subtle);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .ps-field-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
  }

  .ps-field-label {
    font-size: 11px;
    font-weight: 500;
    color: var(--ps-text-muted);
  }

  .ps-select {
    width: 100%;
    padding: 7px 10px;
    background-color: var(--ps-input-bg);
    border: 1px solid var(--ps-border);
    border-radius: 6px;
    color: var(--text-primary, #e2e8f0);
    font-size: 12px;
    outline: none;
    cursor: pointer;
    color-scheme: dark;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ps-select:hover:not(:disabled) {
    border-color: var(--text-subtle, #64748b);
  }
  .ps-select:focus {
    border-color: var(--ps-accent, #3b82f6);
    box-shadow: 0 0 0 1px var(--ps-accent, #3b82f6);
  }
  .ps-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .ps-select option {
    background-color: #181b20;
    color: #e2e8f0;
    padding: 6px 8px;
  }

  .ps-dictation-card {
    background: var(--ps-input-bg);
    border: 1px solid var(--ps-border);
    border-radius: 8px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    text-align: center;
  }

  .ps-meter-bar {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;
  }

  .ps-meter-fill {
    height: 100%;
    background: var(--ps-accent);
    transition: width 0.08s ease;
  }

  .ps-presets-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
  }

  .ps-preset-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid var(--ps-border);
    background: var(--ps-input-bg);
    color: var(--text-primary, #e2e8f0);
    cursor: pointer;
    font-size: 11px;
    text-align: left;
    transition: border-color 0.15s, background 0.15s;
    width: 100%;
    box-sizing: border-box;
  }
  .ps-preset-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--text-subtle);
  }
  .ps-preset-btn.active {
    border-color: var(--ps-accent);
    background: rgba(59, 130, 246, 0.12);
  }
  .ps-preset-btn .preset-title {
    font-weight: 600;
    margin-bottom: 2px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
  }
  .ps-preset-btn .preset-desc {
    font-size: 10.5px;
    color: var(--ps-text-muted);
    line-height: 1.3;
  }

  .ps-custom-prompt-input {
    width: 100%;
    background: var(--ps-input-bg);
    border: 1px solid var(--ps-border);
    border-radius: 6px;
    padding: 8px;
    color: var(--text-primary, #e2e8f0);
    font-size: 12px;
    resize: vertical;
    min-height: 54px;
    box-sizing: border-box;
    outline: none;
    font-family: inherit;
    color-scheme: dark;
  }
  .ps-custom-prompt-input:focus {
    border-color: var(--ps-accent);
  }

  .ps-editor-canvas {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-base, #121417);
    padding: 12px 16px;
    gap: 12px;
  }

  .ps-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--ps-border);
    border-radius: 8px;
    background: var(--ps-panel-bg);
    overflow: hidden;
    min-height: 0;
  }

  .ps-pane-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid var(--ps-border);
    background: rgba(255, 255, 255, 0.02);
    flex-shrink: 0;
  }

  .ps-pane-title {
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .ps-textarea {
    flex: 1;
    width: 100%;
    background: transparent;
    border: none;
    padding: 12px;
    color: var(--text-primary, #e2e8f0);
    font-size: 13px;
    line-height: 1.6;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    resize: none;
    outline: none;
    box-sizing: border-box;
    overflow-y: auto;
    color-scheme: dark;
  }

  .ps-output-view {
    flex: 1;
    width: 100%;
    padding: 12px;
    color: var(--text-primary, #e2e8f0);
    font-size: 13px;
    line-height: 1.6;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    overflow-y: auto;
    box-sizing: border-box;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .ps-diff-added {
    background-color: rgba(34, 197, 94, 0.25);
    color: #86efac;
    border-radius: 2px;
    padding: 0 2px;
  }

  .ps-diff-removed {
    background-color: rgba(239, 68, 68, 0.25);
    color: #fca5a5;
    text-decoration: line-through;
    border-radius: 2px;
    padding: 0 2px;
  }

  .ps-diff-unchanged {
    color: inherit;
  }

  .ps-action-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--ps-panel-bg);
    border: 1px solid var(--ps-border);
    border-radius: 8px;
    flex-shrink: 0;
    gap: 8px;
  }

  .ps-status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 16px;
    background: var(--ps-panel-bg);
    border-top: 1px solid var(--ps-border);
    font-size: 11px;
    color: var(--ps-text-subtle);
    flex-shrink: 0;
  }

  .ps-pill {
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.06);
    font-size: 10px;
  }

  .ps-empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 32px 24px;
    gap: 12px;
  }

  .ps-empty-card {
    max-width: 440px;
    padding: 20px 24px;
    border-radius: 10px;
    border: 1px solid var(--ps-border);
    background: var(--ps-panel-bg);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  @keyframes ps-spin-anim {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .ps-spin {
    display: inline-block;
    animation: ps-spin-anim 1.2s linear infinite;
  }
`;async function Ht(e){if(!e)return!1;if(typeof navigator<"u"&&navigator.clipboard&&typeof navigator.clipboard.writeText=="function")try{return await navigator.clipboard.writeText(e),!0}catch{}if(typeof document<"u")try{let t=document.createElement("textarea");t.value=e,t.setAttribute("readonly",""),t.style.position="fixed",t.style.top="-9999px",t.style.left="-9999px",t.style.opacity="0",document.body.appendChild(t),t.focus(),t.select();let o=document.execCommand("copy");if(document.body.removeChild(t),o)return!0}catch{}return!1}var Jn="zcc:prompt-voice:studio-draft:v1";function ai(e){return e?`${Jn}:project:${e}`:Jn}var Qn=[{id:"polish",title:"Clean up writing",icon:"\u2728",desc:"Fix punctuation, grammar, and stuttering.",prompt:"Clean up disfluencies, typos, and improve sentence flow without altering intent.",tone:"technical"},{id:"executive",title:"Summarize",icon:"\u26A1",desc:"Condense into punchy bullet points.",prompt:"Summarize the core request into crisp, high-level executive bullet points.",tone:"formal"},{id:"spec",title:"Create a technical spec",icon:"\u{1F4D0}",desc:"Format with Goals, Context, Steps.",prompt:"Transform into a structured technical spec with ## Goal, ## Architecture, and ## Implementation Steps.",tone:"technical"},{id:"chat",title:"Make it conversational",icon:"\u{1F4AC}",desc:"Natural, conversational tone.",prompt:"Rephrase in a warm, polite, and helpful conversational tone.",tone:"conversational"}],li={system:"Host STT",openai:"OpenAI","google-gemini":"Google Gemini","local-whisper":"Local Whisper"};function eo(e){return e==="openai"||e==="google-gemini"}var ci=[{id:"google-gemini",label:"Google Gemini"},{id:"local-whisper",label:"Local Whisper (on this device)"},{id:"openai",label:"OpenAI (Whisper)"},{id:"system",label:"System (Zana Voice)"}],pi=[{id:"assistant",displayName:"Zana Assistant",models:[{id:"assistant",key:"assistant",label:"Default Assistant (Host Agent)",providerId:"assistant"}]}],to=[1500,3e3];function no({focusWindow:e,bringBack:t}){return W(),l("div",{className:"ps-container","data-testid":"ps-detached-placeholder",children:[n("style",{children:Bt}),n("div",{className:"ps-empty-state",children:l("div",{className:"ps-empty-card",children:[n("span",{style:{fontSize:22},"aria-hidden":"true",children:"\u{1F399}\uFE0F"}),n("div",{style:{fontSize:14,fontWeight:600},children:"Prompt Studio is open in its own window"}),n("div",{style:{fontSize:12,color:"var(--ps-text-muted)"},children:"Focus the floating window or bring Prompt Studio back to this project tab."}),l("div",{style:{display:"flex",gap:8,marginTop:4},children:[n("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:e,children:"Focus Window"}),n("button",{type:"button",className:"ps-btn",onClick:t,children:"Bring Back"})]})]})})]})}function Wt({pluginId:e,projectId:t,headerActions:o,startSession:r=se}){W();let[i,s]=b(!1),c=st(e),p=Rn(),d=rt(),u=it(),f=me(),v=d?.providerId,g=d?.familyId,S=ai(t),A=w(!1),[k,E]=b(null),[h,L]=b(""),[C,j]=b(""),[te,Z]=b(!1),[ne,Se]=b(!1),[K,z]=b(!1),[X,H]=b(null),[Be,Gt]=b(!1),[qt,Zt]=b(null),[we,Yt]=b(null),[We,Ge]=b(!0),[Kt,dt]=b(null),[Ae,Ce]=b("assistant"),[Le,Pe]=b("assistant"),[be,Xt]=b(null),[di,qe]=b(null),[Oe,Jt]=b(!0),[Qt,oo]=b(null),[Ve,ut]=b(!1),[oe,Ze]=b("polish"),[Ye,en]=b(""),[ge,tn]=b(!1),[nn,R]=b(null),[F,Ue]=b("system"),[mt,Ke]=b(""),[ft,on]=b(!0),[bt,ve]=b(null),[ae,gt]=b(!1),[ro,rn]=b(0),[io,vt]=b(null),[sn,so]=b(()=>re()),an=w(sn);an.current=sn;let le=w(null),Re=w(null),Ee=w(null),ln=w(null);_(()=>{try{let a=localStorage.getItem(S);if(a){let m=JSON.parse(a);L(typeof m.inputText=="string"?m.inputText:""),j(typeof m.outputText=="string"?m.outputText:""),Ce(m.selectedProviderId||"assistant"),Pe(m.selectedModelId||"assistant"),A.current=m.userManuallySelected===!0,Ue(m.sttProvider||"system"),Ke(m.sttModel||"")}else L(""),j(""),Ce("assistant"),Pe("assistant"),Ue("system"),Ke(""),A.current=!1}catch{}E(S)},[S]);let ze=w(c);ze.current=c;let Y=w(!0),ht=w(0),Xe=w(0),Je=w(0),Qe=w(null),et=T(a=>{a&&(a.llmProvider&&(qe(a.llmProvider),Jt(a.llmProvider!=="none")),a.sttProvider&&Ue(a.sttProvider),typeof a.sttKeyConfigured=="boolean"&&on(a.sttKeyConfigured))},[]),yt=T(()=>{ze.current.call(xe).then(a=>{Y.current&&et(a)}).catch(()=>{})},[et]);_(()=>{let a=!0;return ze.current.call(xe).then(m=>{a&&et(m)}).catch(()=>{}),()=>{a=!1}},[et]);let tt=T(a=>{so(m=>m.micDeviceId===a.micDeviceId&&m.micLabel===a.micLabel&&m.soundCuesEnabled===a.soundCuesEnabled&&m.soundCuesVolume===a.soundCuesVolume?m:a)},[]),nt=T(()=>{let a=++ht.current;ze.current.call(pe).then(m=>{if(!Y.current||ht.current!==a)return;let x=m||{};typeof x.sttProvider=="string"&&x.sttProvider&&Ue(x.sttProvider),typeof x.sttModel=="string"&&x.sttModel&&Ke(x.sttModel),typeof x.llmProvider=="string"&&x.llmProvider&&x.llmProvider!=="none"?Xt({providerId:x.llmProvider,modelId:typeof x.llmModel=="string"&&x.llmModel?x.llmModel:void 0}):x.llmProvider==="none"&&Xt(null),m&&typeof m=="object"&&tt(ie(x))}).catch(()=>{})},[tt]),je=T(()=>{Qe.current&&(clearTimeout(Qe.current),Qe.current=null)},[]),Ie=T((a={})=>{let m=a.refresh===!0,x=a.retryAttempt??0;je();let P=++Je.current;Ge(!0),(m||x===0)&&dt(null);let y=()=>{if(!Y.current||x>=to.length)return;let N=to[x];Qe.current=setTimeout(()=>{Y.current&&Ie({retryAttempt:x+1})},N)};ze.current.call(bn,m?{refresh:!0}:void 0).then(N=>{if(!Y.current||Je.current!==P)return;let O=Array.isArray(N)?N:[];Yt(O),Ge(!1),!O.some(ee=>ee.providerId!=="assistant"&&Array.isArray(ee.models)&&ee.models.length>0)&&!m&&y()}).catch(()=>{!Y.current||Je.current!==P||(Ge(!1),dt("Could not load Composer models. Using Zana Assistant."),y())})},[je]);Mt(vn,a=>{!Y.current||!Array.isArray(a)||(Yt(a),Ge(!1),dt(null),je())}),_(()=>(Y.current=!0,nt(),Ie(),()=>{Y.current=!1,ht.current++,Xe.current++,Je.current++,je()}),[je,Ie,nt]);let ao=$(()=>(we??[]).some(a=>a.providerId!=="assistant"&&Array.isArray(a.models)&&a.models.length>0),[we]),J=$(()=>{let a=(y,N)=>[...y].sort((O,B)=>N(O).localeCompare(N(B),void 0,{sensitivity:"base",numeric:!0})),m=(we??[]).filter(y=>Array.isArray(y.models)&&y.models.length>0);if(m.length===0){let y=pi.map(N=>{let O=!!(v&&N.id.toLowerCase()===v.toLowerCase()||g&&N.id.toLowerCase().includes(g.toLowerCase())),B=a(N.models,ee=>ee.label||ee.id).map(ee=>({...ee,isComposerMatch:O}));return{...N,isComposerMatch:O,models:B}});return a(y,N=>N.displayName||N.id)}let x={"assistant:assistant":"assistant"},P=m.map(y=>{let N=!!(v&&y.providerId.toLowerCase()===v.toLowerCase()||g&&y.providerId.toLowerCase().includes(g.toLowerCase())),O=a(y.models,B=>B.label||B.id).map(B=>{let ee=`${y.providerId}:${B.id}`,ko=x[ee]??B.id;return{id:B.id,key:ko,label:B.label||B.id,providerId:y.providerId,isComposerMatch:N}});return{id:y.providerId,displayName:y.displayName||y.providerId,isComposerMatch:N,error:y.error??null,models:O}});return a(P,y=>y.displayName||y.id)},[we,v,g]),V=$(()=>J.find(a=>a.id===Ae)??J[0],[J,Ae]),he=$(()=>V?.models??[],[V]),U=$(()=>he.find(m=>m.id===Le||m.key===Le)??he[0],[he,Le]);_(()=>{if(we===null||A.current||J.length===0)return;let a=J.find(m=>m.isComposerMatch&&m.models.length>0)??J.find(m=>m.isComposerMatch);if(a){Ce(a.id),a.models.length>0&&Pe(m=>a.models.some(P=>P.id===m||P.key===m)?m:a.models[0].key||a.models[0].id);return}if(be&&be.providerId!=="assistant"){let m=J.find(x=>x.id===be.providerId&&x.models.length>0);if(m){Ce(m.id);let P=(be.modelId?m.models.find(y=>y.id===be.modelId||y.key===be.modelId):void 0)??m.models[0];P&&Pe(P.key||P.id)}}},[we,J,be]),_(()=>{if(k===S)try{localStorage.setItem(S,JSON.stringify({inputText:h,outputText:C,selectedProviderId:Ae,selectedModelId:Le,userManuallySelected:A.current,sttProvider:F,sttModel:mt}))}catch{}},[k,S,h,C,Ae,Le,F,mt]);let lo=a=>{Jt(a);let m=a?V?.id??"assistant":"none",x=a?U?.id??"assistant":"";qe(m),c.call(de,{llmProvider:m,llmModel:x}).catch(()=>{R("Could not update cleanup setting.")})},xt=a=>{Ue(a),ve(null),c.call(de,{sttProvider:a}).then(()=>yt()).catch(()=>{R("Could not update speech provider setting.")})},co=a=>{Ke(a),c.call(de,{sttModel:a}).catch(()=>{})},po=a=>{A.current=!0,Ce(a);let m=J.find(P=>P.id===a),x="";if(m&&m.models.length>0){let P=m.models[0].key||m.models[0].id;x=m.models[0].id,Pe(P)}Oe&&(qe(a),c.call(de,{llmProvider:a,llmModel:x}).catch(()=>{}))},uo=a=>{A.current=!0;let m=Ae,x=a;for(let P of J){let y=P.models.find(N=>N.id===a||N.key===a);if(y){P.id!==Ae&&(Ce(P.id),m=P.id),Pe(y.key||y.id),x=y.id;break}}Oe&&(qe(m),c.call(de,{llmProvider:m,llmModel:x}).catch(()=>{}))};_(()=>()=>{Re.current&&clearInterval(Re.current),Ee.current&&clearInterval(Ee.current),le.current&&le.current.cancel()},[]);let mo=$(()=>{let a=h.trim();return`${a?a.split(/\s+/).length:0} words \xB7 ${h.length} chars`},[h]),fo=$(()=>{let a=C.trim();return`${a?a.split(/\s+/).length:0} words \xB7 ${C.length} chars`},[C]),bo=$(()=>!C||!Ve?[]:Xn(h,C),[h,C,Ve]),St=()=>{Re.current&&(clearInterval(Re.current),Re.current=null),Ee.current&&(clearInterval(Ee.current),Ee.current=null)},go=()=>{St(),Re.current=setInterval(()=>rn(a=>a+1),1e3),Ee.current=setInterval(()=>{le.current&&vt(le.current.getAudioLevel?.()??null)},100)},vo=async a=>{gt(!1),vt(null),St();let m=le.current;if(le.current=null,!!m){z(!0);try{let x=await m.stop();if(!Y.current)return;D("stop",a);let P=await De(c,x),y=await c.call(Te,{audio:P.base64,mimeType:P.mimeType,transcriptionOnly:!0});y.ok&&y.status==="ok"?(D("complete",a),L(N=>_e(N,y.text)),ve(null)):y.ok&&y.status==="no-speech"?(R("No speech detected. Try speaking closer to the microphone."),setTimeout(()=>R(null),4e3)):y.ok||(D("error",a),R(y.message),ve(y.message),y.code==="MISSING_KEY"&&on(!1))}catch(x){D("error",a),R(x instanceof Error?x.message:"Transcription failed.")}finally{z(!1)}}},ho=async(a,m)=>{if(ve(null),R(null),F!=="system"&&!ft){D("error",m);let P=F==="openai"?"OpenAI":"Google Gemini";ve(`API key required for direct ${P} speech-to-text. Switch to System (Zana Voice) below to dictate using host voice.`),R(`API key required for ${P}. Switch to System (Zana Voice) to dictate thoughts.`);return}let x=++Xe.current;try{let P=D("start",m);if(P&&(await P,!Y.current||Xe.current!==x))return;let y=await(a.micDeviceId!==M?r({deviceId:a.micDeviceId}):r());if(!Y.current||Xe.current!==x){y.cancel();return}y.onError=N=>{le.current=null,gt(!1),vt(null),St(),D("error",m),ve(N.message),R(N.message)},le.current=y,gt(!0),rn(0),go()}catch(P){D("error",m),R(P instanceof Error?P.message:"Microphone access denied.")}},yo=T(()=>{s(!1),tt(re()),nt(),yt(),Ie()},[Ie,nt,yt,tt]),xo=async()=>{let a=an.current,m={enabled:a.soundCuesEnabled,volume:a.soundCuesVolume};ae?await vo(m):await ho(a,m)},So=async()=>{let a=h.trim();if(!a||ge||!U||oe==="custom"&&!Ye.trim())return;let m=Qn.find(O=>O.id===oe),x=oe==="custom"?Ye.trim():m?.prompt||"Polish and format for clarity.",P=m?.tone||"technical",y=V?.id??"assistant",N=U?.id??"assistant";R(null),tn(!0);try{let O=await c.call(fn,{text:a,tone:P,customPrompt:x,llmProvider:y,llmModel:N});O.ok?(j(O.text),oo(`${V?.displayName||y}: ${O.llmModel||N}`)):R(O.message)}catch(O){R(O instanceof Error?O.message:"Refinement request failed.")}finally{tn(!1)}},wo=async()=>{try{let a=await navigator.clipboard.readText();if(!a||!a.trim()){R("Clipboard is empty."),setTimeout(()=>R(null),2500);return}L(m=>_e(m,a)),R("Pasted from clipboard into input draft!"),setTimeout(()=>R(null),2500)}catch{R("Clipboard access denied or unavailable."),setTimeout(()=>R(null),2500)}},Ao=async()=>{if(!h)return;await Ht(h)?(Se(!0),setTimeout(()=>Se(!1),2e3),R("Input draft copied to clipboard!"),setTimeout(()=>R(null),2500)):(R("Failed to copy to clipboard."),setTimeout(()=>R(null),3e3))},Co=async()=>{if(!C)return;await Ht(C)?(Z(!0),setTimeout(()=>Z(!1),2e3),R("Refined output copied to clipboard!"),setTimeout(()=>R(null),2500)):(R("Failed to copy to clipboard."),setTimeout(()=>R(null),3e3))},Po=()=>{!h&&!C||(L(""),j(""),Ze("polish"),en(""),ut(!1),R("Studio canvas cleared."),setTimeout(()=>R(null),2500))},Ro=()=>{C&&(L(C),j(""),ut(!1),R("Refined output moved to input draft."),setTimeout(()=>R(null),2500))},Eo=()=>{let a=C||h;if(a){if(p&&typeof p.updateText=="function")try{p.updateText(m=>_e(m,a)),p.focus?.(),H("Inserted into Composer!"),setTimeout(()=>H(null),2500);return}catch{}if(u&&typeof u.toCompose=="function"){u.toCompose({initialPrompt:a,focusPrompt:!0}),H("Opened in New Thread Composer!"),setTimeout(()=>H(null),2500);return}Ht(a).then(m=>{R(m?"No active composer \u2014 copied prompt to clipboard.":"Composer focus unavailable.")})}},Io=async()=>{if(e){Gt(!0),Zt(null);try{await at(e,{showInProjects:!0})}catch(a){Zt(a instanceof Error?a.message:"Could not update plugin settings.")}finally{Gt(!1)}}},To=T(a=>{(a.ctrlKey||a.metaKey)&&a.key.toLowerCase()==="k"&&(a.preventDefault(),Ze("custom"),setTimeout(()=>ln.current?.focus(),0))},[]);return t&&!f.showInProjects?l("div",{className:"ps-container",children:[n("style",{children:Bt}),l("header",{className:"ps-header",children:[l("div",{className:"ps-header-left",children:[n("span",{style:{fontSize:18},children:"\u{1F399}\uFE0F"}),n("span",{className:"ps-header-title",children:"Prompt Studio"}),n("span",{className:"ps-badge ps-badge-project",children:"Project"})]}),o?n("div",{className:"ps-header-actions",children:o}):null]}),n("div",{className:"ps-empty-state","data-testid":"ps-project-hidden-notice",children:l("div",{className:"ps-empty-card",children:[n("span",{style:{fontSize:22},"aria-hidden":"true",children:"\u{1F507}"}),n("div",{style:{fontSize:14,fontWeight:600},children:"Prompt Studio is hidden in projects"}),n("div",{style:{fontSize:12,color:"var(--ps-text-muted)",lineHeight:1.45},children:"You disabled the project tab in Prompt Voice plugin settings. Re-enable it anytime to use project-scoped drafts here."}),qt?n("div",{role:"alert",style:{fontSize:11,color:"#fca5a5"},children:qt}):null,e?n("button",{type:"button",className:"ps-btn ps-btn-primary",disabled:Be,onClick:()=>void Io(),children:Be?"Enabling\u2026":"Enable Prompt Studio in Projects"}):null]})})]}):l("div",{className:"ps-container",onKeyDown:To,children:[n("style",{children:Bt}),l("header",{className:"ps-header",children:[l("div",{className:"ps-header-left",children:[n("span",{style:{fontSize:18},children:"\u{1F399}\uFE0F"}),n("span",{className:"ps-header-title",children:"Prompt Studio"}),n("span",{className:"ps-badge",children:"Voice & AI Refinement"}),t?n("span",{className:"ps-badge ps-badge-project",children:"Project"}):null]}),o?n("div",{className:"ps-header-actions",children:o}):null]}),i?n(Zn,{rpc:c,pluginId:e,onBack:yo}):l("div",{className:"ps-workspace",children:[l("aside",{className:"ps-sidebar",children:[l("section",{className:"ps-section",children:[l("div",{className:"ps-section-title",children:[n("span",{children:"Voice Dictation"}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:li[F]??F})]}),l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-stt-provider-select",className:"ps-field-label",children:"Speech Provider"}),n("select",{id:"ps-stt-provider-select",className:"ps-select","aria-label":"Speech-to-text provider",value:F,onChange:a=>{ve(null),xt(a.target.value)},disabled:ae||K,children:ci.map(a=>n("option",{value:a.id,children:a.label},a.id))})]}),eo(F)&&l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-stt-model-input",className:"ps-field-label",children:"Speech Model (Optional)"}),n("input",{id:"ps-stt-model-input",className:"ps-select","aria-label":"Speech-to-text model",placeholder:"Provider default",value:mt,onChange:a=>co(a.target.value),disabled:ae||K})]}),bt&&l("div",{role:"alert",style:{padding:"8px 10px",borderRadius:6,background:"rgba(239, 68, 68, 0.12)",border:"1px solid rgba(239, 68, 68, 0.35)",color:"#fca5a5",fontSize:11,textAlign:"left",lineHeight:1.4,display:"flex",flexDirection:"column",gap:6},children:[l("div",{children:["\u26A0\uFE0F ",bt]}),eo(F)&&n("button",{type:"button",className:"ps-btn ps-btn-primary",style:{alignSelf:"flex-start",fontSize:11,padding:"4px 8px"},onClick:()=>xt("system"),children:"Switch to System (Zana Voice)"})]}),F!=="system"&&!ft&&!bt&&l("div",{style:{padding:"8px 10px",borderRadius:6,background:"rgba(234, 179, 8, 0.1)",border:"1px solid rgba(234, 179, 8, 0.3)",color:"#fde047",fontSize:11,textAlign:"left",lineHeight:1.4,display:"flex",flexDirection:"column",gap:6},children:[l("div",{children:["\u2139\uFE0F ",n("strong",{children:"API key required:"})," Direct ",F==="openai"?"OpenAI Whisper":"Google Gemini"," speech-to-text requires an API key in Zana Settings."]}),n("button",{type:"button",className:"ps-btn ps-btn-primary",style:{alignSelf:"flex-start",fontSize:11,padding:"4px 8px"},onClick:()=>xt("system"),children:"Switch to System (Zana Voice)"})]}),l("div",{className:"ps-dictation-card",children:[l("button",{type:"button",className:`ps-btn ${ae?"ps-btn-danger":K?"":"ps-btn-primary"}`,style:{width:"100%",justifyContent:"center",padding:"10px 0",opacity:K?.8:1},onClick:xo,disabled:K,"aria-label":K?"Transcribing audio":ae?"Stop dictation":"Start dictation",children:[n("span",{className:K?"ps-spin":void 0,children:K?"\u23F3":ae?"\u23F9\uFE0F":"\u{1F399}\uFE0F"}),n("span",{children:K?"Transcribing...":ae?`Stop Dictation (${ro}s)`:"Dictate Thoughts"})]}),ae&&l("div",{style:{width:"100%",display:"flex",flexDirection:"column",gap:4},children:[n("div",{className:"ps-meter-bar",children:n("div",{className:"ps-meter-fill",style:{width:`${Math.min(100,(io??.1)*100)}%`}})}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:"Listening live..."})]})]}),n("div",{style:{fontSize:10,color:"var(--ps-text-subtle)",lineHeight:1.3},children:F==="system"?"Uses host Zana voice transcription without requiring external API keys.":F==="local-whisper"?"Transcribes on this device. Install the runtime and a model in Settings.":ft?`Using direct ${F==="openai"?"OpenAI Whisper":"Google Gemini"} speech-to-text.`:`\u26A0\uFE0F ${F==="openai"?"OpenAI":"Google Gemini"} requires an API key in Zana Settings. Choose System (Zana Voice) for built-in free dictation.`})]}),l("section",{className:"ps-section",children:[l("div",{className:"ps-section-title",children:[n("span",{children:"Refinement Engine"}),l("span",{style:{display:"inline-flex",alignItems:"center",gap:6},children:[n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:We&&!ao?"Loading\u2026":We?"Refreshing\u2026":V?.isComposerMatch?"\u2605 Composer Active":"AI Model"}),n("button",{type:"button",className:"ps-btn",style:{padding:"2px 6px",fontSize:10},onClick:()=>Ie({refresh:!0}),disabled:We||ge,"aria-label":"Refresh models",title:"Reload models from Composer",children:We?"\u2026":"\u21BB"})]})]}),l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-provider-select",className:"ps-field-label",children:"Provider"}),n("select",{id:"ps-provider-select",className:"ps-select","aria-label":"Refinement provider",value:V?.id??"",onChange:a=>po(a.target.value),disabled:ge,children:J.map(a=>l("option",{value:a.id,children:[a.displayName,a.isComposerMatch?" \u2605 (Composer)":""]},a.id))})]}),l("div",{className:"ps-field-group",children:[l("label",{htmlFor:"ps-model-select",className:"ps-field-label",children:["Model (",he.length,")"]}),n("select",{id:"ps-model-select",className:"ps-select","aria-label":"Refinement model",value:U?.key||U?.id||"",onChange:a=>uo(a.target.value),disabled:ge||he.length===0,children:he.length===0?n("option",{value:"",children:"No models available"}):he.map(a=>l("option",{value:a.key||a.id,children:[a.label,a.isComposerMatch?" \u2605 (Composer)":""]},a.key||a.id))})]}),(V?.error||Kt)&&n("div",{role:"status",style:{fontSize:10.5,color:"#fde047",lineHeight:1.35,padding:"6px 8px",borderRadius:6,background:"rgba(234, 179, 8, 0.1)",border:"1px solid rgba(234, 179, 8, 0.25)"},children:V?.error||Kt}),l("div",{style:{marginTop:8,paddingTop:8,borderTop:"1px solid var(--ps-border)",display:"flex",flexDirection:"column",gap:4},children:[l("label",{style:{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:11,fontWeight:500,userSelect:"none"},children:[n("input",{type:"checkbox","aria-label":"Auto-cleanup mic dictations",checked:Oe,onChange:a=>lo(a.target.checked)}),n("span",{children:"Auto-cleanup mic dictations"})]}),n("span",{style:{fontSize:10,color:"var(--ps-text-subtle)",lineHeight:1.3},children:Oe?`Composer mic cleans up using ${V?.displayName}${U?` (${U.label||U.id})`:""}.`:"Composer mic inserts raw transcript without AI cleanup."})]}),l("div",{style:{marginTop:4,fontSize:11,color:"var(--ps-text-muted)",lineHeight:1.35},children:[V?.isComposerMatch?l("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:600},children:["\u2605 Synced to Composer: ",V.displayName,U?` (${U.label})`:""]}):V?.id==="assistant"?"Uses the active Zana assistant agent with no extra API key required.":U?l(q,{children:["Using ",n("strong",{children:V?.displayName})," \xB7 ",n("code",{children:U.id})]}):null,Qt?l("div",{style:{marginTop:3,color:"var(--ps-text-subtle)",fontSize:10},children:["Last refined: ",Qt]}):null]})]}),l("section",{className:"ps-section",children:[n("div",{className:"ps-section-title",children:"How should we improve it?"}),l("div",{className:"ps-presets-list",role:"radiogroup","aria-label":"How should we improve it?",children:[Qn.map(a=>l("label",{className:`ps-preset-btn ${oe===a.id?"active":""}`,children:[l("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:a.id,checked:oe===a.id,onChange:()=>Ze(a.id)}),a.title]}),n("span",{className:"preset-desc",children:a.desc})]},a.id)),l("label",{className:`ps-preset-btn ${oe==="custom"?"active":""}`,children:[l("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:"custom",checked:oe==="custom",onChange:()=>Ze("custom")}),"Custom instructions"]}),n("span",{className:"preset-desc",children:"Describe your own transformation."})]})]}),oe==="custom"&&n("textarea",{ref:ln,className:"ps-custom-prompt-input","aria-label":"Custom instructions",placeholder:"e.g. Turn into user stories with acceptance criteria...",value:Ye,onChange:a=>en(a.target.value)})]}),n("button",{type:"button",className:"ps-btn",style:{marginTop:"auto"},onClick:()=>s(!0),children:"Settings"})]}),l("main",{className:"ps-editor-canvas",children:[l("section",{className:"ps-pane",children:[l("div",{className:"ps-pane-header",children:[l("div",{className:"ps-pane-title",children:[n("span",{children:"\u{1F4DD}"}),n("span",{children:"Raw Input Draft"})]}),l("div",{style:{display:"flex",gap:6},children:[n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:wo,title:"Paste from clipboard into input draft","aria-label":"Paste into input draft",children:"\u{1F4CB} Paste"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Ao,disabled:!h,title:"Copy raw input","aria-label":"Copy raw input",children:ne?"\u2705 Copied":"\u{1F4CB} Copy"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>L(""),disabled:!h,title:"Clear input",children:"Clear"})]})]}),n("textarea",{className:"ps-textarea",placeholder:"Type your raw thoughts or click Dictate in the left sidebar to speak...",value:h,onChange:a=>L(a.target.value),"aria-label":"Raw Input Text"})]}),l("div",{className:"ps-action-bar",children:[l("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12},children:[n("span",{className:"ps-pill",children:"\u2B07 Refine pipeline"}),n("span",{style:{color:"var(--ps-text-muted)"},children:h.trim()?`${h.trim().split(/\s+/).length} words ready`:"Add text to get started"})]}),n("div",{style:{display:"flex",alignItems:"center",gap:6},children:l("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:()=>So(),disabled:ge||!h.trim()||!U||oe==="custom"&&!Ye.trim(),title:"Transform raw draft into polished output",children:[n("span",{children:ge?"\u23F3":"\u26A1"}),n("span",{children:ge?"Refining...":"Refine text"})]})})]}),l("section",{className:"ps-pane",children:[l("div",{className:"ps-pane-header",children:[l("div",{className:"ps-pane-title",children:[n("span",{children:"\u2728"}),n("span",{children:"Result"})]}),l("div",{style:{display:"flex",gap:6},children:[C&&l("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>ut(a=>!a),title:"Toggle inline diff against input draft",children:[n("span",{children:Ve?"\u{1F441}\uFE0F":"\u{1F50D}"}),n("span",{children:Ve?"View Clean":"View Diff"})]}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Ro,disabled:!C,title:"Move output to input draft for iterative re-refinement",children:"\u2B06 Replace Input"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Co,disabled:!C,title:"Copy refined text to clipboard","aria-label":"Copy refined output",children:te?"\u2705 Copied":"\u{1F4CB} Copy"})]})]}),Ve&&C?n("div",{className:"ps-output-view",children:bo.map((a,m)=>a.type==="added"?n("span",{className:"ps-diff-added",children:a.text},m):a.type==="removed"?n("span",{className:"ps-diff-removed",children:a.text},m):n("span",{className:"ps-diff-unchanged",children:a.text},m))}):n("textarea",{className:"ps-textarea",placeholder:"Polished, structured output will appear here after clicking Refine...",value:C,onChange:a=>j(a.target.value),"aria-label":"Refined output"})]}),l("div",{className:"ps-action-bar",children:[n("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12},children:X?n("span",{className:"ps-badge",style:{background:"rgba(34, 197, 94, 0.2)",color:"#86efac"},children:X}):n("span",{style:{color:"var(--ps-text-muted)"},children:C?"Ready to insert refined result into Composer":h?"Ready to insert raw draft into Composer":"Draft or refine a prompt to insert into Composer"})}),l("div",{style:{display:"flex",alignItems:"center",gap:8},children:[l("button",{type:"button",className:"ps-btn",onClick:Po,title:"Clear current input and output",disabled:!h&&!C,children:[n("span",{children:"\u{1F5D1}\uFE0F"}),n("span",{children:"Clear"})]}),l("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:Eo,disabled:!h&&!C,title:"Append current text directly into Zana Composer",children:[n("span",{children:"\u{1F4AC}"}),n("span",{children:"Insert into Composer"})]})]})]})]})]}),l("footer",{className:"ps-status-bar",children:[l("div",{style:{display:"flex",gap:12},children:[l("span",{children:["Input: ",mo]}),l("span",{children:["Output: ",fo]}),nn&&n("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:500},children:nn})]}),l("div",{style:{display:"flex",gap:12,alignItems:"center"},children:[l("span",{children:["Engine: ",V?.displayName," \xB7 ",U?.label??"No model"]}),l("span",{className:"ps-pill",children:["Mic cleanup: ",Oe?`${V?.displayName}${U?` (${U.label||U.id})`:""}`:"Off (Raw)"]}),V?.isComposerMatch&&n("span",{className:"ps-pill",style:{color:"var(--accent, #3b82f6)"},children:"\u2605 Composer Synced"}),n("span",{children:"Zana Prompt Studio"})]})]})]})}var Ma=dn(e=>{W(),e.composer.customize({id:"prompt-voice-mic",actions:[{id:"prompt-voice-mic",component:On}]}),e.slots.navPanel?.({id:ue,title:"Prompt Studio",icon:"Sparkles",path:ue,component:Wt}),e.slots.projectTab?.({id:ke,label:"Prompt Studio",icon:"Sparkles",order:50,global:!1,header:"custom",detachable:!0,component:Wt,detachedPlaceholder:no}),e.slots.homepageSection?.({id:"prompt-voice-home",title:"Prompt Voice",component:Nn}),e.slots.settingsSection?.({id:"prompt-voice-visibility",title:"Where Prompt Voice Appears",description:"Choose whether Prompt Voice appears on the main Home screen, inside projects, and in composers.",component:pt}),e.slots.commandPaletteAction?.({id:"open-prompt-studio",title:"Prompt Studio: Open Canvas",isAvailable:()=>!0,run:t=>{if(typeof t.toPluginPanel=="function"){t.toPluginPanel(ue);return}t.navigate?.(`/${ue}`)}}),e.slots.commandPaletteAction?.({id:"open-prompt-studio-project",title:"Prompt Studio: Open in This Project",isAvailable:t=>!!t.projectId,run:t=>{t.projectId&&typeof t.toProject=="function"&&t.toProject(t.projectId,{tabId:ke})}})});export{ue as PROMPT_STUDIO_PANEL_PATH,ke as PROMPT_STUDIO_PROJECT_TAB_ID,Ma as default};
//# sourceMappingURL=app.js.map
