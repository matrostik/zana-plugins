function hn(){let e=globalThis.__ZCC_PLUGIN_HOST__;if(!e)throw new Error("plugin host is not available");return e}function we(){return globalThis.__ZCC_PLUGIN_RUNTIME__??{}}function ct(e){throw new Error(`${e} is not available until the host plugin runtime is installed`)}async function xn(e,t,o){return hn().callRpc(e,t,o)}async function kt(e,t){return hn().setSettings(e,t)}function yn(e){return{__zccPluginApp:!0,setup:e}}function We(){return we().useRpc?.()??ct("useRpc")}function Nt(e,t){we().useRealtime?.(e,t)}function Dt(){return we().useSettings?.()??{values:void 0,isLoading:!0}}function _t(){return we().useZccContext?.()??{projectId:null,threadId:null}}function Mt(){return we().useZccNavigate?.()??ct("useZccNavigate")}function qe(){return we().useComposer?.()??ct("useComposer")}function Lt(){return we().useComposerView?.()??ct("useComposerView")}var E=globalThis.__ZCC_HOST_REACT__,Sn=E,wi=E.Children,Ai=E.Component,Ci=E.Fragment,Pi=E.StrictMode,Ii=E.Suspense,Ri=E.cloneElement,Ei=E.createContext,Ti=E.createElement,ki=E.createRef,Ni=E.forwardRef,Di=E.isValidElement,_i=E.lazy,Mi=E.memo,Li=E.startTransition,T=E.useCallback,Oi=E.useContext,Vi=E.useDebugValue,Ui=E.useDeferredValue,_=E.useEffect,zi=E.useId,ji=E.useImperativeHandle,Fi=E.useInsertionEffect,$i=E.useLayoutEffect,B=E.useMemo,wn=E.useReducer,w=E.useRef,f=E.useState,Hi=E.useSyncExternalStore,Bi=E.useTransition,Gi=E.version;var L="default";function Fo(e){if(typeof e!="string")return L;let t=e.trim().slice(0,256);return!t||t===L?L:t}function $o(e){return typeof e!="string"?"":e.trim().slice(0,200)}function Ho(e){return!(e===!1||typeof e=="string"&&e.trim().toLowerCase()==="false")}function Bo(e){let t=typeof e=="number"?e:typeof e=="string"&&e.trim()!==""?Number(e):Number.NaN;return Number.isFinite(t)?Math.round(Math.min(100,Math.max(0,t))):75}function de(e){let t=e??{},o=Fo(t.micDeviceId);return{micDeviceId:o,micLabel:o===L?"":$o(t.micLabel),soundCuesEnabled:Ho(t.soundCuesEnabled),soundCuesVolume:Bo(t.soundCuesVolume)}}var _e="promptVoice.transcribe",Ae="promptVoice.status",An="promptVoice.rephrase",Cn="promptVoice.availableModels",ue="promptVoice.settings.get",me="promptVoice.settings.update",Pn="promptVoice:settingsChanged",In="promptVoice:modelsUpdated",te={state:"promptVoice.localWhisper.state",installRuntime:"promptVoice.localWhisper.installRuntime",cancelRuntimeInstall:"promptVoice.localWhisper.cancelRuntimeInstall",downloadModel:"promptVoice.localWhisper.downloadModel",cancelModelDownload:"promptVoice.localWhisper.cancelModelDownload",removeModel:"promptVoice.localWhisper.removeModel",selectModel:"promptVoice.localWhisper.selectModel",start:"promptVoice.localWhisper.start",stop:"promptVoice.localWhisper.stop"};var Rn=["standard","casual","conversational","formal","technical","custom"],fe="prompt-studio",Me="prompt-studio";var En="zcc:prompt-voice:audio-prefs:v1";function Ot(){try{if(typeof localStorage>"u")return null;let e=localStorage.getItem(En);if(!e)return null;let t=JSON.parse(e);return!t||typeof t!="object"||Array.isArray(t)?null:de(t)}catch{return null}}function ie(){return Ot()??de({})}function se(e){let t=de(e);try{typeof localStorage<"u"&&localStorage.setItem(En,JSON.stringify({micDeviceId:t.micDeviceId,micLabel:t.micDeviceId===L?"":t.micLabel,soundCuesEnabled:String(t.soundCuesEnabled),soundCuesVolume:String(t.soundCuesVolume)}))}catch{}return t}var Vt=`/* Base Container */
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
`;var Tn="zcc-ext-prompt-voice-styles";function W(){if(typeof document>"u")return;let e=document.getElementById(Tn);e||(e=document.createElement("style"),e.id=Tn,document.head.appendChild(e)),e.textContent!==Vt&&(e.textContent=Vt)}var Wo=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4"];var q=class extends Error{code;constructor(t,o){super(o),this.name="RecordingError",this.code=t}};function qo(e){return Wo.find(t=>e(t))??null}var Zo="audio/webm";function kn(){return{getUserMedia:e=>navigator.mediaDevices.getUserMedia(e),createRecorder:(e,t)=>new MediaRecorder(e,t?{mimeType:t}:void 0),isTypeSupported:e=>typeof MediaRecorder<"u"&&MediaRecorder.isTypeSupported(e)}}async function Yo(e,t){let o=t&&t!=="default"?t:void 0,r=o?{audio:{deviceId:{exact:o}}}:{audio:!0};try{return await e.getUserMedia(r)}catch(i){let a=i instanceof Error?i.name:"";if(a==="NotAllowedError"||a==="SecurityError")throw new q("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again.");if(o&&(a==="OverconstrainedError"||a==="NotFoundError"))try{return await e.getUserMedia({audio:!0})}catch(c){let p=c instanceof Error?c.name:"";if(p==="NotAllowedError"||p==="SecurityError")throw new q("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again.")}throw new q("MIC_UNAVAILABLE","No microphone is available. Connect one and try again.")}}function Ut(e){return new Promise((t,o)=>{let r=new FileReader;r.onload=()=>{let i=typeof r.result=="string"?r.result:"";t(i.slice(i.indexOf(",")+1))},r.onerror=()=>o(new q("RECORDING_FAILED","The recording could not be read.")),r.readAsDataURL(e)})}async function Ko(e,t){let o=new Blob(e,{type:t});return{base64:await Ut(o),mimeType:o.type||t}}function Xo(e,t){if(!(e>0&&Number.isFinite(e)))return()=>{};let o=setTimeout(t,e);return()=>clearTimeout(o)}var Jo="That recording is too large to transcribe. Keep dictation shorter and try again.";function Qo(e,t){let o=Math.max(t,e),r=[],i=0,a=!1;return{chunks:r,get overflowed(){return a},add(c){return c.size===0||a?"ignored":i+c.size>o?(a=!0,"overflow"):(r.push(c),i+=c.size,i>=e?"limit-reached":"accepted")}}}function er(e,t){let o=new Promise((r,i)=>{e.onstop=()=>r(),e.onerror=()=>{let a=new q("RECORDING_FAILED","Recording stopped unexpectedly. Try again.");t(a),i(a)}});return o.catch(()=>{}),o}function tr(e,t,o,r){let i=er(e,r);return e.ondataavailable=a=>{let c=t.add(a.data);(c==="limit-reached"||c==="overflow")&&o()},e.start(1e3),i}async function nr(e,t,o,r){try{await e}finally{t()}if(o.overflowed)throw new q("RECORDING_FAILED",Jo);return Ko(o.chunks,r)}function or(e){let t=()=>{};return{stopRecorder(){t(),e.state!=="inactive"&&e.stop()},armTimer(o,r){t=Xo(o,r)}}}function rr(e,t){let o=null;return{attach(r){o=r},detach(){o=null},autoStop(){e();let r=o?.onAutoStop;o&&(o.onAutoStop=void 0),r?.()},fail(r){e(),t();let i=o?.onError;o=null,i?.(r)}}}function ir(e,t,o,r){let i=Qo(r.maxBytes??9437184,r.hardMaxBytes??10485760),{stopRecorder:a,armTimer:c}=or(e),p=rr(a,t);c(r.maxDurationMs??12e4,p.autoStop);let d=tr(e,i,p.autoStop,p.fail),m={onError:r.onError,onAutoStop:r.onAutoStop,async stop(){a();try{return await nr(d,t,i,e.mimeType||o)}finally{p.detach()}},cancel(){a(),t(),p.detach()}};return p.attach(m),m}var ae=e=>sr(kn(),e);async function sr(e=kn(),t={}){let o=await Yo(e,t.deviceId),r=ar(o),i=o.getTracks(),a,c=()=>{for(let p of i)a&&p.removeEventListener?.("ended",a);r?.close(),i.forEach(p=>p.stop())};try{let p=qo(e.isTypeSupported)??Zo,d=e.createRecorder(o,p),m=ir(d,c,p,t);return m.getAudioLevel=()=>r?.level()??null,a=()=>{let g=m.onError;m.cancel(),g?.(new q("MIC_UNAVAILABLE","Microphone disconnected. Check your device and try again."))},i.forEach(g=>g.addEventListener?.("ended",a)),m}catch(p){throw c(),p instanceof q?p:new q("RECORDING_FAILED",p instanceof Error?p.message:"The recording could not be started.")}}function ar(e){let t;try{t=new AudioContext;let o=t.createMediaStreamSource(e),r=t.createAnalyser();r.fftSize=256,o.connect(r);let i=new Uint8Array(r.fftSize),a=t,c=!1;return{level(){if(a.state&&a.state!=="running")return null;r.getByteTimeDomainData(i);let p=i.reduce((d,m)=>d+((m-128)/128)**2,0)/i.length;return Math.min(1,Math.sqrt(p)*5)},close(){c||(c=!0,o.disconnect(),a.close().catch(p=>console.error("Prompt Voice audio meter cleanup failed",p)))}}}catch(o){return t&&t.close().catch(r=>console.error("Prompt Voice audio meter cleanup failed",r)),console.warn("Prompt Voice audio meter unavailable",o),null}}var zt=["both","main","projects","off"];var lr="both",jt=[{id:"all",label:"Main Screen & Projects",description:"Show on Zana Home, inside Projects, and in all composers.",settings:{showHomeWidget:!0,showInProjects:!0,micVisibility:"both"}},{id:"projects",label:"Projects Only",description:"Show the Prompt Studio tab and mic button only inside projects.",settings:{showHomeWidget:!1,showInProjects:!0,micVisibility:"projects"}},{id:"main",label:"Main Screen Only",description:"Show on Zana Home and global composers; hide project tabs and project mics.",settings:{showHomeWidget:!0,showInProjects:!1,micVisibility:"main"}},{id:"mic-only",label:"Composer Mic Only",description:"Hide the Home widget and project tabs; keep only the composer mic.",settings:{showHomeWidget:!1,showInProjects:!1,micVisibility:"both"}}],Dn={both:"Everywhere (Main & Projects)",main:"Main screen composers only",projects:"Project composers only",off:"Hidden"};function Nn(e,t){if(typeof e=="boolean")return e;if(typeof e=="string"){let o=e.trim().toLowerCase();if(o==="true")return!0;if(o==="false")return!1}return t}function cr(e){return typeof e=="string"&&zt.includes(e)?e:lr}function Ft(e){let t=e??{};return{showHomeWidget:Nn(t.showHomeWidget,!0),showInProjects:Nn(t.showInProjects,!0),micVisibility:cr(t.micVisibility)}}function _n(e){for(let t of jt)if(t.settings.showHomeWidget===e.showHomeWidget&&t.settings.showInProjects===e.showInProjects&&t.settings.micVisibility===e.micVisibility)return t.id;return"custom"}function Mn(e,t,o){if(e==="off")return!1;if(e==="both")return!0;let r=t&&typeof t=="object"&&"projectId"in t?t.projectId:void 0,i=r!==void 0?r:o,a=typeof i=="string"&&i.length>0;return e==="projects"?a:!a}var Le="prompt-voice";function pr(e){return Le}function dr(){try{let e=xn;return typeof e=="function"?e:void 0}catch{return}}function ur(){try{return typeof Dt=="function"?Dt():null}catch{return null}}function pt(){try{return typeof Lt=="function"?Lt():null}catch{return null}}function Ln(){try{return typeof _t=="function"?_t():null}catch{return null}}function dt(){try{return typeof Mt=="function"?Mt():null}catch{return null}}function On(){try{return typeof qe=="function"?qe():null}catch{return null}}function mr(){try{return typeof We=="function"?We():null}catch{return null}}function ut(e){let t=mr(),o=w(t);o.current=t;let r=w(e);return r.current=e,B(()=>({async call(i,a){let c=dr(),p=a!==void 0,d=async()=>{if(!c)throw new Error("Prompt Voice RPC is unavailable in this environment.");return p?await c(Le,i,a):await c(Le,i)};if(r.current&&r.current!==Le&&c)return d();let m=o.current;if(m)try{return p?await m.call(i,a):await m.call(i)}catch(g){if(c&&g instanceof Error&&/unknown rpc/i.test(g.message))return d();throw g}return d()}}),[])}function $t(e,t){try{typeof Nt=="function"&&Nt(e,t)}catch{}}function ge(){let t=ur()?.values,o=Ft(t),[r,i]=f(null);return _(()=>{i(null)},[o.showHomeWidget,o.showInProjects,o.micVisibility]),$t(Pn,a=>{a&&typeof a=="object"&&i(Ft(a))}),r??o}async function mt(e,t){if(typeof kt!="function")throw new Error("Plugin settings API is unavailable in this environment.");await kt(pr(e),t)}var fr={start:[{frequency:523.25,offsetSec:0,durationSec:.11,type:"sine",peakFactor:.9},{frequency:659.25,offsetSec:.075,durationSec:.14,type:"sine",peakFactor:1}],stop:[{frequency:493.88,offsetSec:0,durationSec:.1,type:"sine",peakFactor:.85}],complete:[{frequency:659.25,offsetSec:0,durationSec:.1,type:"sine",peakFactor:.85},{frequency:783.99,offsetSec:.075,durationSec:.16,type:"sine",peakFactor:1}],error:[{frequency:329.63,offsetSec:0,durationSec:.12,type:"triangle",peakFactor:.9},{frequency:246.94,offsetSec:.095,durationSec:.16,type:"triangle",peakFactor:.9}]},ft=null;function gr(){if(typeof window>"u")return null;let e=window.AudioContext??window.webkitAudioContext;return e?((!ft||ft.state==="closed")&&(ft=new e),ft):null}function Vn(e,t,o){let r=e.currentTime,i=fr[t],a=null,c=0;for(let p of i){let d=e.createOscillator(),m=e.createGain(),g=r+p.offsetSec,v=g+p.durationSec,b=p.offsetSec+p.durationSec+.02,S=o*(p.peakFactor??1);b>=c&&(c=b,a=d),d.type=p.type??"sine",d.frequency.setValueAtTime(p.frequency,g),m.gain.setValueAtTime(1e-4,g),m.gain.exponentialRampToValueAtTime(Math.max(2e-4,S),g+.015),m.gain.exponentialRampToValueAtTime(1e-4,v),d.connect(m),m.connect(e.destination),d.start(g),d.stop(v+.02)}return{finalOsc:a,totalDurationSec:c}}function Un(e,t){let o=Math.ceil(t*1e3)+40;return new Promise(r=>{let i=!1,a=null,c=()=>{i||(i=!0,a!==null&&clearTimeout(a),e&&typeof e.removeEventListener=="function"&&e.removeEventListener("ended",c),r())};if(e&&typeof e.addEventListener=="function")e.addEventListener("ended",c,{once:!0});else if(e&&"onended"in e){let p=e.onended;e.onended=function(d){typeof p=="function"&&p.call(this,d),c()}}a=setTimeout(c,o)})}async function br(e){if(e.state!=="suspended")return e.state==="running";let t=null;try{return await Promise.race([e.resume(),new Promise(o=>{t=setTimeout(o,750)})]),e.state!=="suspended"}catch{return!1}finally{t!==null&&clearTimeout(t)}}function D(e,t){if(!t.enabled)return null;let o=Math.min(100,Math.max(0,t.volume));if(!Number.isFinite(o)||o<=0)return null;try{let r=gr();if(!r)return null;let i=o/100*.2;if(r.state==="suspended")return(async()=>{if(!await br(r))return;let{finalOsc:d,totalDurationSec:m}=Vn(r,e,i);await Un(d,m)})().catch(()=>{});let{finalOsc:a,totalDurationSec:c}=Vn(r,e,i);return Un(a,c)}catch{return null}}var Ht=16e3,zn=44,Ze=2,vr="This recording couldn't be prepared for Local Whisper. Try again.",hr=async(e,t)=>{let r=await new OfflineAudioContext(1,1,t).decodeAudioData(e),i=Array.from({length:r.numberOfChannels},(a,c)=>r.getChannelData(c));return{sampleRate:r.sampleRate,channels:i}};function xr(e){if(e.length===0)return new Float32Array(0);if(e.length===1)return e[0];let t=Math.min(...e.map(r=>r.length)),o=new Float32Array(t);for(let r=0;r<t;r+=1){let i=0;for(let a of e)i+=a[r];o[r]=i/e.length}return o}function yr(e,t){let o=e.length*Ze,r=new Uint8Array(zn+o),i=new DataView(r.buffer),a=(c,p)=>{for(let d=0;d<p.length;d+=1)i.setUint8(c+d,p.charCodeAt(d))};a(0,"RIFF"),i.setUint32(4,36+o,!0),a(8,"WAVE"),a(12,"fmt "),i.setUint32(16,16,!0),i.setUint16(20,1,!0),i.setUint16(22,1,!0),i.setUint32(24,t,!0),i.setUint32(28,t*Ze,!0),i.setUint16(32,Ze,!0),i.setUint16(34,8*Ze,!0),a(36,"data"),i.setUint32(40,o,!0);for(let c=0;c<e.length;c+=1){let p=Math.max(-1,Math.min(1,e[c]));i.setInt16(zn+c*Ze,p<0?p*32768:p*32767,!0)}return r}function Sr(e){let t=atob(e),o=new Uint8Array(t.length);for(let r=0;r<t.length;r+=1)o[r]=t.charCodeAt(r);return o.buffer}async function wr(e,t=hr){let o;try{let r=await t(Sr(e.base64),Ht);if(r.sampleRate!==Ht)throw new Error("decoder ignored the requested sample rate");o=yr(xr(r.channels),Ht)}catch{throw new q("RECORDING_FAILED",vr)}return{base64:await Ut(new Blob([o],{type:"audio/wav"})),mimeType:"audio/wav"}}async function Oe(e,t,o=wr){return(await e.call(Ae).catch(()=>null))?.audioFormat==="wav"?o(t):t}var jn=globalThis.__ZCC_HOST_REACT__,Z=jn.Fragment;function n(e,t,o){return jn.createElement(e,o===void 0?t:{...t,key:o})}var l=n;var Ar={system:"Zana Voice",openai:"OpenAI Whisper","google-gemini":"Google Gemini","local-whisper":"Local Whisper"};function Cr(e,t){let[o,r]=f("system"),[i,a]=f("assistant");return _(()=>{let c=!0;return e.call(Ae).then(p=>{if(!c||!p||typeof p!="object")return;let d=p;d.sttProvider&&r(d.sttProvider),d.llmProvider&&a(d.llmProvider)}).catch(()=>{}),e.call(ue).then(p=>{!c||!p||typeof p!="object"||(t.current=se(p))}).catch(()=>{}),()=>{c=!1}},[t,e]),{sttProvider:o,llmProvider:i}}function Pr(e){let[t,o]=f(0);return _(()=>{if(e!=="recording"){o(0);return}let r=Date.now(),i=setInterval(()=>{o(Math.floor((Date.now()-r)/1e3))},250);return()=>clearInterval(i)},[e]),t}async function Ir(e,t,o,r,i,a){let c={enabled:o.soundCuesEnabled,volume:o.soundCuesVolume},p=await e.stop();if(!i.current)return;D("stop",c);let d=await Oe(t,p),m=await t.call(_e,{audio:d.base64,mimeType:d.mimeType});if(i.current){if(m.ok&&m.status==="ok"){D("complete",c),typeof r?.toCompose=="function"?(r.toCompose({initialPrompt:m.text,focusPrompt:!0}),a.setNotice("Draft opened in new thread composer.")):a.setNotice(m.text);return}if(m.ok&&m.status==="no-speech"){a.setNotice("No speech detected. Try again.");return}m.ok||(D("error",c),a.setError(m.message))}}async function Rr(e,t,o){let r={enabled:e.soundCuesEnabled,volume:e.soundCuesVolume},i=D("start",r);if(i&&(await i,!o()))return null;let a=await(e.micDeviceId!==L?t({deviceId:e.micDeviceId}):t());return o()?a:(a.cancel(),null)}function Er(e,t,o){let[r,i]=f("idle"),[a,c]=f(null),[p,d]=f(null),m=w(!0),g=w(null),v=w(0),b=w(ie()),{sttProvider:S,llmProvider:A}=Cr(e,b),k=Pr(r);_(()=>(m.current=!0,()=>{m.current=!1,v.current++,g.current?.cancel(),g.current=null}),[]);let R=T(async()=>{let C=g.current;if(g.current=null,!C){i("idle");return}let $=b.current;i("transcribing");try{await Ir(C,e,$,t,m,{setNotice:c,setError:d})}catch(oe){if(!m.current)return;D("error",{enabled:$.soundCuesEnabled,volume:$.soundCuesVolume}),d(oe instanceof Error?oe.message:"Quick dictation failed.")}finally{m.current&&i("idle")}},[t,e]),x=T(async()=>{d(null),c(null);let C=ie();b.current=C;let $={enabled:C.soundCuesEnabled,volume:C.soundCuesVolume},oe=++v.current;i("starting");try{let Y=await Rr(C,o,()=>m.current&&v.current===oe);if(!Y)return;Y.onError=re=>{g.current=null,m.current&&(D("error",$),d(re.message),i("idle"))},Y.onAutoStop=()=>{m.current&&R()},g.current=Y,i("recording")}catch(Y){if(!m.current)return;D("error",$),d(Y instanceof Error?Y.message:"Microphone access denied."),i("idle")}},[o,R]),V=T(()=>{v.current++,g.current?.cancel(),g.current=null,i("idle")},[]);return{sttProvider:S,llmProvider:A,phase:r,seconds:k,notice:a,error:p,start:x,stopAndTranscribe:R,cancel:V}}function Tr({phase:e,formattedTime:t,onToggleDictate:o,onCancel:r,onOpenStudio:i}){let a=e==="starting"?"Starting mic\u2026":e==="recording"?`Stop & Compose (${t})`:e==="transcribing"?"Transcribing\u2026":"Dictate to New Thread";return l("div",{className:"ps-home-actions",children:[n("button",{type:"button",className:`ps-btn ${e==="recording"?"ps-btn-danger":"ps-btn-primary"}`,disabled:e==="starting"||e==="transcribing",onClick:o,children:a}),e==="starting"||e==="recording"?n("button",{type:"button",className:"ps-btn",onClick:r,children:"Cancel"}):n("button",{type:"button",className:"ps-btn",onClick:i,children:"Open Prompt Studio"})]})}function Fn(e){return ge().showHomeWidget?n(kr,{...e}):null}function kr({pluginId:e,projectId:t,startSession:o=ae}){W();let r=ut(e),i=dt(),a=Er(r,i,o),c=T(()=>{if(t&&typeof i?.toProject=="function"){i.toProject(t,{tabId:Me});return}i?.toPluginPanel?.(fe)},[i,t]),p=()=>{a.phase==="recording"?a.stopAndTranscribe():a.phase==="idle"&&a.start()},d=`${Math.floor(a.seconds/60)}:${String(a.seconds%60).padStart(2,"0")}`,m=Ar[a.sttProvider]??a.sttProvider,g=a.llmProvider==="none"?"Raw transcript":"AI cleanup on";return l("div",{className:"ps-home-card","data-testid":"pv-home-widget",children:[l("div",{className:"ps-home-card-top",children:[l("div",{className:"ps-home-copy",children:[l("div",{className:"ps-home-heading",children:[n("span",{"aria-hidden":"true",children:"\u{1F399}\uFE0F"}),n("span",{children:"Dictate a new thread or refine in Prompt Studio"})]}),l("div",{className:"ps-home-meta",children:[n("span",{children:m}),n("span",{"aria-hidden":"true",children:"\xB7"}),n("span",{children:g})]})]}),n(Tr,{phase:a.phase,formattedTime:d,onToggleDictate:p,onCancel:a.cancel,onOpenStudio:c})]}),a.notice?n("div",{role:"status",className:"ps-home-status",children:a.notice}):null,a.error?n("div",{role:"alert",className:"ps-home-error",children:a.error}):null]})}function Ve(e,t){let o=t.trim();return o?e?/\s$/.test(e)?`${e}${o}`:`${e} ${o}`:o:e}var Nr="No speech detected.",Bt={phase:"idle",notice:null,error:null};function $n(e,t){switch(t.type){case"START":return e.phase==="idle"||e.phase==="error"?{phase:"starting",notice:null,error:null}:e;case"STARTED":return e.phase==="starting"?{...e,phase:"recording"}:e;case"STOP":return e.phase==="recording"||e.phase==="starting"?{phase:"processing",notice:null,error:null}:e;case"CANCEL":return e.phase==="recording"||e.phase==="starting"?{...Bt}:e;case"SUCCESS":case"NO_SPEECH":return e.phase!=="processing"?e:{phase:"idle",notice:t.type==="NO_SPEECH"?Nr:t.notice,error:null};case"CLEAR_NOTICE":return e.notice?{...e,notice:null}:e;case"FAILURE":return{phase:"error",notice:null,error:t.message}}}var Dr="Prompt Voice returned an unexpected response. Try again.",_r="Dictation failed. Try again.",Mr=4e3;function Lr(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}function Or(e){return typeof e=="object"&&e!==null&&!("ok"in e&&"status"in e)}async function Vr(e,t){let o=await Oe(e,t),r=await e.call(_e,{audio:o.base64,mimeType:o.mimeType});if(!Lr(r))throw new Error(Dr);return r}function Hn(e){return e instanceof Error&&e.message?e.message:_r}function Ue(e){return{enabled:e.soundCuesEnabled,volume:e.soundCuesVolume}}function Ur(e,t,o,r=ie()){if(!e.ok){D("error",Ue(r)),o({type:"FAILURE",message:e.message});return}if(e.status==="no-speech"){o({type:"NO_SPEECH"});return}D("complete",Ue(r)),t.updateText(a=>Ve(a,e.text)),t.focus();let i=e.refineNotice?`Inserted the raw transcript. ${e.refineNotice.message}`:"Added to draft.";o({type:"SUCCESS",notice:i})}function zr(e,t,o,r){return t()?(e.onError=i=>{t()&&r(i)},e.onAutoStop=()=>{t()&&o()},e):(e.cancel(),null)}function jr(e,t,o,r,i,a){let c=p=>{D("error",Ue(a())),i({type:"FAILURE",message:Hn(p)})};return e.then(p=>{if(!p)return null;let d=zr(p,o,r,m=>{t.current=null,c(m)});return d&&(t.current=d),d},p=>(o()&&c(p),null))}function Fr(e,t,o){let r=w(null),i=w(null),a=w(0),c=w(!0),p=T(()=>{a.current++,i.current=null,r.current&&(r.current.cancel(),r.current=null),t({type:"CANCEL"})},[t]);_(()=>(c.current=!0,()=>{c.current=!1,p()}),[p]);let d=T(async()=>{let b=i.current?await i.current:r.current;return r.current=null,b},[]),m=T(async(b,S)=>{let A=++a.current,k=()=>c.current&&a.current===A,R=D("start",Ue(S)),V=jr((async()=>R&&(await R,!k())?null:await(S.micDeviceId!==L?e({deviceId:S.micDeviceId}):e()))(),r,k,b,t,o);i.current=V,await V&&k()&&t({type:"STARTED"}),i.current===V&&(i.current=null)},[t,o,e]),g=T(()=>c.current,[]),v=T(()=>r.current?.getAudioLevel?.()??null,[]);return{start:m,takeSession:d,cancel:p,isMounted:g,getAudioLevel:v}}function Bn({startSession:e=ae,noticeDurationMs:t=Mr}={}){let o=qe(),r=We(),i=w(r);i.current=r;let[a,c]=wn($n,Bt),p=w(a.phase);p.current=a.phase;let d=w(null),m=w(ie()),g=T(()=>m.current,[]),{start:v,takeSession:b,cancel:S,isMounted:A,getAudioLevel:k}=Fr(e,c,g),[R,x]=f(null),[V,C]=f(0),[$,oe]=f(!1);_(()=>{let j=!0;return i.current.call(ue).then(Q=>{if(!j||!Or(Q))return;let G=se(Q);d.current=G,(p.current==="idle"||p.current==="error")&&(m.current=G)}).catch(()=>{}),()=>{j=!1}},[]),_(()=>{if(a.phase!=="recording"){x(null),C(0);return}let j=Date.now(),Q=()=>{x(k()),C(Math.floor((Date.now()-j)/1e3))};Q();let G=setInterval(Q,100);return()=>clearInterval(G)},[k,a.phase]),_(()=>{if(!a.notice)return;let j=setTimeout(()=>{c({type:"CLEAR_NOTICE"})},t);return()=>clearTimeout(j)},[t,a.notice]);let Y=T(()=>{c({type:"CLEAR_NOTICE"})},[]),re=T(async()=>{let j=m.current;c({type:"STOP"});let Q=await b();if(!(!A()||!Q))try{let G=await Q.stop();if(!A())return;D("stop",Ue(j));let Ke=await Vr(r,G);if(!A())return;Ur(Ke,o,c,j)}catch(G){if(!A())return;D("error",Ue(j)),c({type:"FAILURE",message:Hn(G)})}},[o,A,r,b]),Ce=T(async()=>{let j=Ot()??d.current??de({});m.current=j,oe(!1),c({type:"START"}),await v(()=>{oe(!0),re()},j)},[re,v]),J=T(()=>{a.phase==="recording"||a.phase==="starting"?re():a.phase!=="processing"&&Ce()},[Ce,re,a.phase]);return{phase:a.phase,error:a.error,notice:a.notice,level:R,seconds:V,autoStopped:$,onClick:J,cancel:S,clearNotice:Y,beginDictation:Ce,finishDictation:re}}var $r="Dictation",Hr={idle:"Start dictation",starting:"Stop dictation",recording:"Stop dictation",processing:"Transcribing",error:"Start dictation"},Gn={position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",border:0};function Wn({startSession:e=ae}){let t=ge(),o=pt(),r=Ln();return Mn(t.micVisibility,o?.scope,r?.projectId)?n(Br,{startSession:e}):null}function Br({startSession:e=ae}){W();let{phase:t,error:o,notice:r,onClick:i,cancel:a,clearNotice:c,level:p,seconds:d,autoStopped:m}=Bn({startSession:e}),g=t==="starting"||t==="recording"||t==="processing",v=t==="idle"&&!!r,b=`${Math.floor(d/60)}:${String(d%60).padStart(2,"0")}`;return l("div",{className:`pv-mic pv-dictation-pill pv-phase-${t} ${v?"pv-has-notice":""}`,onClick:v?c:void 0,title:v?"Click to dismiss":void 0,children:[n("button",{type:"button",className:`pv-mic-button pv-mic-${t} ${g?"pv-pill-btn-stop":"pv-idle-icon"}`,"aria-label":$r,"aria-pressed":t==="recording"||t==="starting",title:Hr[t],disabled:t==="processing",onClick:i,style:v?{display:"none"}:void 0,children:t==="idle"||t==="error"?n("svg",{viewBox:"0 0 24 24",width:"16",height:"16","aria-hidden":"true",focusable:"false",children:n("path",{d:"M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5Zm6 9h2v-3h-2v3Z",fill:"currentColor"})}):t==="processing"?n("span",{className:"pv-mic-spinner","aria-hidden":"true"}):n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("rect",{x:"6",y:"6",width:"12",height:"12",rx:"2.5",fill:"currentColor"})})}),v?l("span",{role:"status",className:"pv-notice-content",children:[n("span",{className:"pv-notice-check",children:"\u2713"}),n("span",{className:"pv-pill-status",children:r})]}):null,t==="starting"?l(Z,{children:[l("div",{className:"pv-pill-timer-badge",children:[n("div",{className:"pv-pill-dot pv-pill-dot-starting"}),n("span",{className:"pv-pill-timer-text",children:"0:00"})]}),l("div",{className:"pv-pill-center",role:"status",children:[n("span",{className:"pv-mic-spinner","aria-hidden":"true"}),n("span",{className:"pv-pill-status",children:"Requesting microphone\u2026"})]})]}):null,t==="recording"?l(Z,{children:[l("div",{className:"pv-pill-timer-badge",children:[n("div",{className:"pv-pill-dot"}),l("span",{className:"pv-pill-timer-text",children:[n("span",{className:"pv-sr-only",style:Gn,children:"Recording "}),b]})]}),l("div",{className:"pv-pill-center",role:"status",children:[p===null?n("span",{className:"pv-sr-only",style:Gn,children:"Audio meter unavailable"}):null,n("span",{className:`pv-pill-waveform ${p===null?"animated":""}`,"aria-label":"Microphone audio activity",role:"meter","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":Math.round((p??.3)*100),children:[.4,.7,1,.7,.4].map((S,A)=>n("span",{className:"pv-pill-waveform-bar",style:p!==null?{height:`${Math.max(3,p*S*20)}px`}:void 0},A))}),n("span",{className:"pv-pill-status",children:"Listening..."}),p!==null&&p<.015&&d>=5?n("span",{className:"pv-mic-quiet-warning",children:"No audio detected \u2014 check your microphone."}):null]})]}):null,t==="processing"?l(Z,{children:[n("div",{className:"pv-pill-timer-badge",children:n("span",{className:"pv-pill-timer-text",children:b})}),n("div",{className:"pv-pill-center",role:"status",children:l("span",{className:"pv-pill-status",children:[n("span",{className:"pv-mic-spinner","aria-hidden":"true"})," ",m?"Recording limit reached. ":"","Transcribing and refining\u2026"]})})]}):null,t==="starting"||t==="recording"?n("button",{type:"button",className:"pv-mic-cancel pv-pill-btn-cancel",onClick:a,"aria-label":"Cancel recording",title:"Cancel recording",children:n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("path",{d:"M18 6L6 18M6 6l12 12",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round"})})}):null,t==="error"&&o?n("span",{role:"alert",className:"pv-pill-status pv-mic-error",children:o}):null]})}var Gr=500,Wr=5e3;function Gt(e){return e>=1e3**3?`${(e/1e3**3).toFixed(1)} GB`:`${Math.round(e/1e3**2)} MB`}function qr(e){return e.runtime.status==="installing"||e.server.state==="starting"||e.models.some(t=>t.status==="downloading")}function Zr(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}function Yr(e){let[t,o]=f(null),[r,i]=f(null),[a,c]=f(null),p=w(!0),d=T(b=>{if(p.current){if(!Zr(b)){i("Local Whisper returned an unexpected response.");return}b.state&&o(b.state),i(b.ok?null:b.message)}},[]),m=T(()=>e.call(te.state).then(d,()=>p.current&&i("Could not load Local Whisper status.")),[e,d]),g=T(async(b,S,A)=>{c(b);try{d(await e.call(S,A))}catch{p.current&&i("Local Whisper request failed. Try again.")}finally{p.current&&c(null)}},[e,d]);_(()=>(p.current=!0,m(),()=>{p.current=!1}),[m]);let v=t?qr(t):!1;return _(()=>{let b=setInterval(()=>void m(),v?Gr:Wr);return()=>clearInterval(b)},[v,m]),{state:t,error:r,pending:a,run:g}}function Wt({tone:e}){return n("span",{"aria-hidden":"true",style:{width:9,height:9,borderRadius:"50%",marginTop:4,flex:"none",background:{ok:"var(--ps-success)",warn:"var(--ps-warn)",err:"var(--ps-danger)",busy:"var(--ps-accent)",idle:"var(--ps-text-muted)"}[e]}})}function qn({value:e,label:t}){let o=Math.round(e*100);return n("div",{role:"progressbar","aria-label":t,"aria-valuenow":o,"aria-valuemin":0,"aria-valuemax":100,style:{height:5,minWidth:80,background:"var(--ps-bg-hover)",borderRadius:3,overflow:"hidden"},children:n("div",{style:{width:`${o}%`,height:"100%",background:"var(--ps-accent)"}})})}var gt={display:"flex",gap:10,alignItems:"flex-start",padding:"10px 12px",borderRadius:6,border:"1px solid var(--ps-border)"},be={color:"var(--ps-text-muted)",fontSize:11};function Kr(e){let{runtime:t,server:o,activeModelId:r}=e;return t.status==="not-installed"?{tone:"idle",title:"Runtime not installed",detail:`whisper.cpp ${t.version} \xB7 requires ${t.requirements.join(", ")||"no extra components"}`,action:{label:"Install runtime",method:te.installRuntime,primary:!0}}:t.status==="installing"?{tone:"busy",title:`Installing runtime\u2026 ${Math.round((t.progress??0)*100)}%`,detail:"Verifying the download as it arrives.",action:{label:"Cancel",method:te.cancelRuntimeInstall}}:o.state==="running"?{tone:"ok",title:"Running",detail:`Model ${o.modelId} \xB7 on this device (127.0.0.1) \xB7 managed by Prompt Voice`,action:{label:"Stop",method:te.stop}}:o.state==="starting"?{tone:"busy",title:"Starting\u2026",detail:`Loading model ${o.modelId}.`}:o.state==="crashed"?{tone:"err",title:"Stopped unexpectedly",detail:`Exit code ${o.exitCode??"unknown"}. Logs contain no audio or transcripts.`,action:{label:"Restart",method:te.start,primary:!0}}:r?{tone:"warn",title:"Stopped",detail:"Starts automatically when you dictate.",action:{label:"Start",method:te.start}}:{tone:"warn",title:"Runtime installed",detail:"Download a model below and choose Use to start."}}function Xr({model:e,state:t,pending:o,onRun:r}){let i=t.activeModelId===e.id,a=t.runtime.status==="installed"&&!i,c=g=>`${g}:${e.id}`,p={modelId:e.id},d=null,m;return e.status==="downloading"?(d=l(Z,{children:[n(qn,{value:e.progress??0,label:`Downloading ${e.label}`}),l("span",{style:be,children:[Math.round((e.progress??0)*100),"% of ",Gt(e.sizeBytes)]})]}),m=n("button",{type:"button",className:"ps-btn",onClick:()=>r(c("cancel"),te.cancelModelDownload,p),children:"Cancel"})):e.status==="available"?m=l("button",{type:"button",className:"ps-btn",disabled:o===c("download"),onClick:()=>r(c("download"),te.downloadModel,p),children:["Download ",Gt(e.sizeBytes)]}):(d=i?n("span",{className:"ps-tag",children:"Active"}):o===c("use")?n("span",{className:"ps-tag",children:"Loading\u2026"}):n("span",{className:"ps-tag",children:"Installed"}),m=l(Z,{children:[a&&n("button",{type:"button",className:"ps-btn",disabled:o!==null,onClick:()=>r(c("use"),te.selectModel,p),children:"Use"}),n("button",{type:"button",className:"ps-btn ps-btn-danger",disabled:i||o!==null,title:i?"Choose another model before removing this one":void 0,"aria-label":`Remove ${e.label}`,onClick:()=>r(c("remove"),te.removeModel,p),children:"Remove"})]})),l("tr",{style:i?{background:"color-mix(in srgb, var(--ps-accent) 10%, transparent)"}:void 0,children:[l("td",{style:{padding:"8px 6px"},children:[n("strong",{children:e.label})," ",e.recommended&&n("span",{className:"ps-tag",children:"Recommended"})]}),l("td",{style:{padding:"8px 6px",...be},children:[Gt(e.sizeBytes)," disk",e.memoryEstimate?l(Z,{children:[n("br",{}),e.memoryEstimate," RAM"]}):null]}),n("td",{style:{padding:"8px 6px"},children:n("div",{style:{display:"flex",flexDirection:"column",gap:4},children:d})}),n("td",{style:{padding:"8px 6px",textAlign:"right",whiteSpace:"nowrap"},children:n("div",{style:{display:"inline-flex",gap:6},children:m})})]})}function Jr(e,t){let o=e==="local-whisper";return o&&t==="none"?{offline:!0,text:"Audio and text stay on this device."}:o?{offline:!1,text:"Audio stays on this device. Cleanup sends the transcript to your selected cleanup model."}:{offline:!1,text:"Audio leaves this device for transcription."}}function Zn({rpc:e,sttProvider:t,llmProvider:o,onApplyPreset:r}){let{state:i,error:a,pending:c,run:p}=Yr(e),d=Jr(t,o),m=i?.runtime.status==="installed"&&i.activeModelId!==null;return l("section",{className:"ps-pane",style:{flex:"none"},"aria-labelledby":"ps-lw-title",children:[l("div",{className:"ps-pane-header",children:[n("h2",{id:"ps-lw-title",className:"ps-pane-title",style:{margin:0},children:"Local Whisper"}),n("span",{className:"ps-tag",children:i?i.platform.supported?m?"Ready":"Not set up":"Unavailable":"Loading\u2026"})]}),l("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[n("p",{style:{...be,margin:0},children:"Transcribe on this device. Audio is never sent anywhere when Local Whisper is the speech provider."}),(a||i?.lastError)&&n("div",{role:"alert",style:{...gt,borderColor:"var(--ps-danger)",color:"var(--ps-danger)",fontSize:12},children:a??i?.lastError?.message}),i&&!i.platform.supported&&l("div",{style:gt,children:[n(Wt,{tone:"err"}),l("div",{children:[n("strong",{children:"Not available on this computer"}),n("div",{style:be,children:i.platform.message})]})]}),i?.platform.supported&&n(Qr,{state:i,pending:c,onRun:p}),i?.platform.supported&&l("div",{children:[l("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"baseline"},children:[n("span",{className:"ps-field-label",children:"Models \xB7 multilingual"}),n("span",{style:be,children:"Stored in this computer's app data"})]}),l("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:12},children:[n("thead",{children:n("tr",{children:["Model","Size","Status",""].map(g=>n("th",{style:{textAlign:"left",...be,fontWeight:600,padding:"4px 6px"},children:g},g))})}),n("tbody",{children:i.models.map(g=>n(Xr,{model:g,state:i,pending:c,onRun:p},g.id))})]})]}),l("div",{style:gt,children:[n(Wt,{tone:d.offline?"ok":"warn"}),l("div",{style:{flex:1},children:[n("strong",{children:d.offline?"Fully offline":"Not fully offline"}),n("div",{style:be,children:d.text})]}),!d.offline&&n("button",{type:"button",className:"ps-btn",onClick:()=>r({sttProvider:"local-whisper",llmProvider:"none"}),children:"Use offline preset"})]})]})]})}function Qr({state:e,pending:t,onRun:o}){let r=Kr(e);return l("div",{style:gt,"aria-live":"polite",children:[n(Wt,{tone:r.tone}),l("div",{style:{flex:1,minWidth:0},children:[n("strong",{children:r.title}),n("div",{style:be,children:r.detail}),e.runtime.status==="installing"&&n("div",{style:{marginTop:6},children:n(qn,{value:e.runtime.progress??0,label:"Installing runtime"})})]}),r.action&&n("button",{type:"button",className:r.action.primary?"ps-btn ps-btn-primary":"ps-btn",disabled:t==="runtime",onClick:()=>o("runtime",r.action.method),children:r.action.label})]})}function ei({statusMessage:e}){return l("div",{className:"ps-vis-header",children:[l("div",{children:[n("h3",{id:"ps-visibility-heading",className:"ps-vis-title",children:"Where Prompt Voice Appears"}),n("p",{className:"ps-vis-subtitle",children:"Control whether Prompt Voice surfaces on the main Home screen, inside Projects, and in thread composers."})]}),n("div",{className:"ps-vis-status-slot",children:e?n("span",{role:"status",className:"ps-vis-status",children:e}):null})]})}function ti({activePreset:e,disabled:t,onSelect:o}){return n("div",{className:"ps-vis-presets",role:"group","aria-label":"Surface visibility presets",children:jt.map(r=>{let i=e===r.id;return l("button",{type:"button",className:`ps-vis-preset-card ${i?"active":""}`,"aria-pressed":i,disabled:t,onClick:()=>o(r.settings),children:[n("span",{className:"ps-vis-preset-label",children:r.label}),n("span",{className:"ps-vis-preset-desc",children:r.description})]},r.id)})})}function Yn({labelId:e,title:t,helpText:o,checked:r,disabled:i,onToggle:a}){return l("div",{className:"ps-toggle-card",children:[l("div",{className:"ps-toggle-copy",children:[n("span",{id:e,className:"ps-toggle-title",children:t}),n("small",{className:"ps-vis-help",children:o})]}),n("button",{type:"button",className:"ps-switch",role:"switch","aria-checked":r,"aria-labelledby":e,disabled:i,onClick:a})]})}function ni({value:e,disabled:t,onChange:o}){return l("div",{className:"ps-toggle-card ps-vis-select-row",children:[l("div",{className:"ps-toggle-copy",children:[n("label",{htmlFor:"ps-vis-mic-select",className:"ps-toggle-title",children:"Composer mic button placement"}),n("small",{className:"ps-vis-help",children:"Choose which chat composers display the voice dictation mic pill."})]}),n("select",{id:"ps-vis-mic-select","aria-label":"Composer mic button placement",className:"ps-select ps-vis-select",value:e,disabled:t,onChange:r=>o(r.target.value),children:zt.map(r=>n("option",{value:r,children:Dn[r]},r))})]})}function bt(e){W();let t=ge(),o=_n(t),[r,i]=f(!1),[a,c]=f(null),[p,d]=f(null),m=async g=>{i(!0),d(null),c("Saving\u2026");try{await mt(Le,g),c("Saved")}catch(v){c(null),d(v instanceof Error?v.message:"Could not update visibility settings.")}finally{i(!1)}};return l("section",{className:"ps-vis-section","aria-labelledby":"ps-visibility-heading",children:[n(ei,{statusMessage:a}),p?n("div",{role:"alert",className:"ps-vis-error",children:p}):null,n(ti,{activePreset:o,disabled:r,onSelect:g=>void m(g)}),l("div",{className:"ps-vis-controls",children:[n(Yn,{labelId:"ps-vis-home-label",title:"Main Home screen widget",helpText:"Show a quick-dictate & Prompt Studio card on Zana\u2019s main Home screen.",checked:t.showHomeWidget,disabled:r,onToggle:()=>void m({showHomeWidget:!t.showHomeWidget})}),n(Yn,{labelId:"ps-vis-projects-label",title:"Prompt Studio tab in projects",helpText:"Display a dedicated Prompt Studio tab inside each project with project-scoped drafts.",checked:t.showInProjects,disabled:r,onToggle:()=>void m({showInProjects:!t.showInProjects})}),n(ni,{value:t.micVisibility,disabled:r,onChange:g=>void m({micVisibility:g})})]}),l("p",{className:"ps-vis-note",children:["Tip: You can hide or reorder the global ",n("strong",{children:"Prompt Studio"})," item in Zana\u2019s left sidebar using Zana\u2019s sidebar customize menu."]})]})}function qt(e){if(typeof e!="string")return[];let t=new Set,o=/[,\n]/;for(let r of e.split(o)){let i=r.trim().slice(0,80);if(i&&t.add(i),t.size>=200)break}return[...t]}function Kn(e,t){let o=qt(t);if(o.length===0)return[...e];let r=new Set(e),i=[...e];for(let a of o){if(i.length>=200)break;r.has(a)||(r.add(a),i.push(a))}return i}function Zt(e){return e.join(`
`)}var vt=[{code:"auto",label:"Detect automatically"},{code:"af",label:"Afrikaans"},{code:"ar",label:"Arabic"},{code:"hy",label:"Armenian"},{code:"az",label:"Azerbaijani"},{code:"eu",label:"Basque"},{code:"be",label:"Belarusian"},{code:"bn",label:"Bengali"},{code:"bs",label:"Bosnian"},{code:"bg",label:"Bulgarian"},{code:"ca",label:"Catalan"},{code:"zh",label:"Chinese"},{code:"hr",label:"Croatian"},{code:"cs",label:"Czech"},{code:"da",label:"Danish"},{code:"nl",label:"Dutch"},{code:"en",label:"English"},{code:"et",label:"Estonian"},{code:"fi",label:"Finnish"},{code:"fr",label:"French"},{code:"gl",label:"Galician"},{code:"ka",label:"Georgian"},{code:"de",label:"German"},{code:"el",label:"Greek"},{code:"gu",label:"Gujarati"},{code:"he",label:"Hebrew"},{code:"hi",label:"Hindi"},{code:"hu",label:"Hungarian"},{code:"is",label:"Icelandic"},{code:"id",label:"Indonesian"},{code:"ga",label:"Irish"},{code:"it",label:"Italian"},{code:"ja",label:"Japanese"},{code:"kn",label:"Kannada"},{code:"kk",label:"Kazakh"},{code:"ko",label:"Korean"},{code:"lv",label:"Latvian"},{code:"lt",label:"Lithuanian"},{code:"mk",label:"Macedonian"},{code:"ms",label:"Malay"},{code:"ml",label:"Malayalam"},{code:"mt",label:"Maltese"},{code:"mr",label:"Marathi"},{code:"ne",label:"Nepali"},{code:"no",label:"Norwegian"},{code:"fa",label:"Persian"},{code:"pl",label:"Polish"},{code:"pt",label:"Portuguese"},{code:"pa",label:"Punjabi"},{code:"ro",label:"Romanian"},{code:"ru",label:"Russian"},{code:"sr",label:"Serbian"},{code:"sk",label:"Slovak"},{code:"sl",label:"Slovenian"},{code:"es",label:"Spanish"},{code:"sw",label:"Swahili"},{code:"sv",label:"Swedish"},{code:"tl",label:"Tagalog"},{code:"ta",label:"Tamil"},{code:"te",label:"Telugu"},{code:"th",label:"Thai"},{code:"tr",label:"Turkish"},{code:"uk",label:"Ukrainian"},{code:"ur",label:"Urdu"},{code:"vi",label:"Vietnamese"},{code:"cy",label:"Welsh"}],Ye="en",Yt=vt.filter(e=>e.code!=="auto");function Kt(e){if(typeof e!="string")return;let t=e.trim().toLowerCase();if(t)return Yt.find(o=>o.code.toLowerCase()===t||o.label.toLowerCase()===t)}function Jn(){if(!(typeof navigator>"u"))return navigator.mediaDevices}function oi(e){return e.replace(/^default\s*[-–:]\s*/i,"").trim()}function Qn(e){let t=e instanceof Error?e.name:"";return t==="NotAllowedError"||t==="SecurityError"}function Xn(e){let t=e.filter(p=>p.kind==="audioinput"),o=t.some(p=>!!p.label?.trim()),r=null,i=[],a=new Set,c=1;for(let p of t){let d=p.label?.trim()??"";if(p.deviceId===L){d&&(r=oi(d)||d);continue}!p.deviceId||a.has(p.deviceId)||(a.add(p.deviceId),i.push({deviceId:p.deviceId,label:d||`Microphone ${c}`,isDefault:!1}),c++)}return{devices:i,defaultDeviceLabel:r,labelsAvailable:o}}async function ri(e){if(!e.getUserMedia||!e.enumerateDevices)return{ok:!1,permissionDenied:!1};try{return(await e.getUserMedia({audio:!0})).getTracks().forEach(o=>o.stop()),{ok:!0,rawDevices:await e.enumerateDevices()}}catch(t){return Qn(t)?{ok:!1,permissionDenied:!0}:(console.warn("Prompt Voice failed to refresh audio input devices",t),{ok:!1,permissionDenied:!1})}}async function eo(e={}){let t=e.mediaDevices??Jn();if(!t?.enumerateDevices)return{devices:[],defaultDeviceLabel:null,labelsAvailable:!1,permissionDenied:!1,supported:!1,error:null};let o;try{o=await t.enumerateDevices()}catch(a){return console.warn("Prompt Voice failed to enumerate audio input devices",a),{devices:[],defaultDeviceLabel:null,labelsAvailable:!1,permissionDenied:Qn(a),supported:!0,error:"Could not list microphones. Using System default."}}let r=Xn(o),i=!1;if(e.requestPermissionIfUnlabeled&&!r.labelsAvailable){let a=await ri(t);a.ok?r=Xn(a.rawDevices):i=a.permissionDenied}return{...r,permissionDenied:i,supported:!0,error:null}}function to(e,t=Jn()){if(!t?.addEventListener||!t?.removeEventListener)return()=>{};let o=()=>e();return t.addEventListener("devicechange",o),()=>t.removeEventListener?.("devicechange",o)}function no(){let[e,t]=f([]),[o,r]=f(null),[i,a]=f(!0),[c,p]=f(!1),[d,m]=f(null),[g,v]=f(!1),b=w(!0),S=w(0),A=T(async(k=!1)=>{let R=++S.current;b.current&&v(!0);try{let x=await eo({requestPermissionIfUnlabeled:k});if(!b.current||S.current!==R)return;t(x.devices),r(x.defaultDeviceLabel),a(x.labelsAvailable),p(x.permissionDenied),m(x.error)}catch(x){if(console.warn("Prompt Voice audio device lookup failed",x),!b.current||S.current!==R)return;t([]),m("Could not list microphones. Using System default.")}finally{b.current&&S.current===R&&v(!1)}},[]);return _(()=>{b.current=!0,A(!1);let k=to(()=>{A(!1)});return()=>{b.current=!1,S.current++,k()}},[A]),{devices:e,defaultDeviceLabel:o,labelsAvailable:i,permissionDenied:c,error:d,isRefreshing:g,refresh:A}}var ai={"Voice & transcription":[{key:"sttProvider",label:"Speech-to-text provider",options:["system","google-gemini","openai","local-whisper"]},{key:"inputLanguage",label:"Input language",options:vt.map(e=>e.code),help:"Spoken language for transcription, or Detect automatically."},{key:"dictionary",label:"Personal dictionary",help:"Add specific names, acronyms, or technical terms to guarantee accurate spelling."}],"Prompt Voice":[{key:"tone",label:"Cleanup tone",options:[...Rn],help:"Fixes grammar and clarity in the original language without extending text length."},{key:"customPrompt",label:"Custom cleanup instructions",multiline:!0}],Connections:[]},Xt={sttProvider:"system",inputLanguage:"auto",tone:"standard"},li={...Object.fromEntries(vt.map(e=>[e.code,e.label])),standard:"Standard (Fix & clarify)",casual:"Casual",conversational:"Conversational",formal:"Professional",technical:"Technical",custom:"Custom",system:"Zana voice",none:"Off",assistant:"Zana assistant",openai:"OpenAI",anthropic:"Anthropic",google:"Google AI","google-gemini":"Google Gemini","local-whisper":"Local Whisper (on this device)"};function ci(e,t,o){return e.error?{warn:!0,text:e.error}:e.permissionDenied?{warn:!0,text:"Microphone permission denied. Allow microphone access in system settings to see device names."}:t.micDeviceId!==L&&!o?{warn:!0,text:"Selected microphone is currently disconnected. Recording will fall back to System default until reconnected."}:!e.labelsAvailable&&e.devices.length>0?{warn:!1,text:"Device names are hidden until microphone access is granted. Click Refresh to detect names."}:t.micDeviceId===L?{warn:!1,text:"Uses your OS default input device. Saved selection applies to Prompt Studio and Composer dictation."}:{warn:!1,text:`Using ${o?.label??(t.micLabel||t.micDeviceId)}. Saved until you choose another mic.`}}function pi({prefs:e,audio:t,onSelect:o}){let r=t.devices.find(d=>d.deviceId===e.micDeviceId),i=e.micDeviceId!==L&&!r,a=ci(t,e,r),c=t.defaultDeviceLabel?`System default (${t.defaultDeviceLabel})`:"System default",p=d=>{if(d===L){o(L,"");return}let m=t.devices.find(g=>g.deviceId===d);o(d,m?.label??e.micLabel)};return l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-mic-select",className:"ps-field-label",children:"Input microphone"}),l("div",{className:"ps-mic-row",children:[l("select",{id:"ps-mic-select","aria-label":"Input microphone",className:"ps-select",value:e.micDeviceId,onChange:d=>p(d.target.value),children:[n("option",{value:L,children:c}),t.devices.map(d=>n("option",{value:d.deviceId,children:d.label},d.deviceId)),i&&n("option",{value:e.micDeviceId,children:`${e.micLabel||e.micDeviceId} (Disconnected)`})]}),n("button",{type:"button",className:"ps-btn",onClick:()=>void t.refresh(!0),disabled:t.isRefreshing,"aria-label":"Refresh microphones",title:"Refresh connected audio input devices",children:t.isRefreshing?"Refreshing\u2026":"\u21BB Refresh"})]}),l("div",{className:"ps-audio-status",role:t.error?"alert":void 0,children:[n("span",{className:`ps-audio-dot ${a.warn?"warn":""}`,"aria-hidden":"true"}),n("span",{children:a.text})]})]})}function di({prefs:e,onToggle:t,onVolumeChange:o}){let r=()=>{e.soundCuesEnabled&&D("start",{enabled:!0,volume:e.soundCuesVolume})};return l(Z,{children:[l("div",{className:"ps-toggle-card",children:[l("div",{className:"ps-toggle-copy",children:[n("span",{id:"ps-sound-cues-label",className:"ps-toggle-title",children:"Sound cues & chimes"}),n("small",{style:{color:"var(--ps-text-muted)"},children:"Play a subtle chime when dictation starts, finishes, or encounters an error."})]}),n("button",{type:"button",className:"ps-switch",role:"switch","aria-checked":e.soundCuesEnabled,"aria-labelledby":"ps-sound-cues-label",onClick:t})]}),l("div",{className:`ps-volume-card ${e.soundCuesEnabled?"":"disabled"}`,children:[l("div",{className:"ps-volume-header",children:[n("label",{htmlFor:"ps-chime-volume",className:"ps-field-label",children:"Chime volume"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 9px",fontSize:11},disabled:!e.soundCuesEnabled,onClick:r,children:"Test chime"})]}),l("div",{className:"ps-volume-controls",children:[n("input",{id:"ps-chime-volume",type:"range",className:"ps-volume-slider","aria-label":"Chime volume",min:0,max:100,step:5,value:e.soundCuesVolume,disabled:!e.soundCuesEnabled,onChange:i=>o(Number(i.target.value)),onPointerUp:r,onKeyUp:i=>{["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(i.key)&&r()}}),l("span",{className:"ps-volume-pct",children:[e.soundCuesVolume,"%"]})]})]})]})}function ui({values:e,onSave:t}){let o=B(()=>de(e),[e]),r=no();return l("section",{className:"ps-pane",style:{flex:"none"},"aria-labelledby":"ps-audio-feedback-title",children:[l("div",{className:"ps-pane-header",children:[n("h2",{id:"ps-audio-feedback-title",className:"ps-pane-title",style:{margin:0},children:"Audio & Feedback"}),n("button",{type:"button",className:"ps-btn",onClick:()=>t({micDeviceId:L,micLabel:"",soundCuesEnabled:String(!0),soundCuesVolume:String(75)}),children:"Reset"})]}),l("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[n(pi,{prefs:o,audio:r,onSelect:(c,p)=>t({micDeviceId:c,micLabel:p})}),n(di,{prefs:o,onToggle:()=>{let c=!o.soundCuesEnabled;t({soundCuesEnabled:String(c)}),c&&D("start",{enabled:!0,volume:o.soundCuesVolume})},onVolumeChange:c=>t({soundCuesVolume:String(c)})})]})]})}function mi({terms:e,atLimit:t,onRemove:o,onClearAll:r}){return l(Z,{children:[n("div",{className:"ps-dict-well",children:e.length>0?n("ul",{className:"ps-dict-pills","aria-label":"Dictionary terms",children:e.map(i=>l("li",{className:"ps-dict-pill",children:[n("span",{className:"ps-dict-pill-text",children:i}),n("button",{type:"button",className:"ps-dict-pill-remove",onClick:()=>o(i),"aria-label":`Remove ${i}`,title:`Remove ${i}`,children:"\xD7"})]},i))}):n("span",{className:"ps-dict-empty",children:"No terms added yet. Type a term above or paste a comma-separated list."})}),l("div",{className:"ps-dict-footer",children:[l("span",{className:"ps-dict-count",children:[e.length===1?"1 term active":`${e.length} terms active`,t?` (max ${200})`:""]}),n("button",{type:"button",className:"ps-btn ps-dict-clear-btn",onClick:r,disabled:e.length===0,children:"Clear all"})]})]})}function fi({label:e,help:t,value:o,resetSignal:r,onChange:i}){let[a,c]=f(""),p=B(()=>qt(o),[o]),d=p.length>=200;_(()=>{r>0&&c("")},[r]);let m=()=>{let v=a.trim();if(!v||d)return;let b=Kn(p,v);c(""),b.length!==p.length&&i(Zt(b))};return l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-dictionary-input",className:"ps-field-label",children:e}),t&&n("small",{style:{color:"var(--ps-text-muted)"},children:t}),l("div",{className:"ps-dict-container",children:[l("div",{className:"ps-dict-input-row",children:[n("input",{id:"ps-dictionary-input",type:"text",className:"ps-dict-input",value:a,onChange:v=>c(v.target.value),onKeyDown:v=>{v.key==="Enter"&&(v.preventDefault(),m())},onPaste:v=>{let b=v.clipboardData?.getData("text");if(!b||!/[\r\n]/.test(b))return;v.preventDefault();let S=v.currentTarget.selectionStart??a.length,A=v.currentTarget.selectionEnd??a.length;c(a.slice(0,S)+b.replace(/[\r\n]+/g,", ")+a.slice(A))},placeholder:"Type a term and press Enter (or paste comma-separated)...",disabled:d}),n("button",{type:"button",className:"ps-btn ps-btn-primary ps-dict-add-btn",onClick:m,disabled:!a.trim()||d,children:"+ Add"})]}),n(mi,{terms:p,atLimit:d,onRemove:v=>i(Zt(p.filter(b=>b!==v))),onClearAll:()=>{c(""),i("")}})]})]})}function gi({field:e,values:t,resetSignal:o,onSave:r}){if(e.key==="dictionary")return n(fi,{label:e.label,help:e.help,value:t.dictionary??"",resetSignal:o,onChange:c=>r({dictionary:c})});let i=t[e.key]??Xt[e.key]??"",a=e.options&&e.key==="inputLanguage"&&i&&!e.options.includes(i)?[...e.options,i]:e.options;return l("label",{className:"ps-field-group",children:[n("span",{className:"ps-field-label",children:e.label}),a?n("select",{className:"ps-select",value:i,onChange:c=>r({[e.key]:c.target.value}),children:a.map(c=>n("option",{value:c,children:li[c]??c},c))}):e.multiline?n("textarea",{className:"ps-custom-prompt-input",value:t[e.key]??"",onChange:c=>r({[e.key]:c.target.value})}):n("input",{type:e.secret?"password":"text",className:"ps-select",value:t[e.key]??"",onChange:c=>r({[e.key]:c.target.value}),placeholder:e.secret?"Enter API key\u2026":void 0}),e.help&&n("small",{style:{color:"var(--ps-text-muted)"},children:e.help})]})}function ro({rpc:e,onBack:t,pluginId:o}){W();let[r,i]=f({}),[a,c]=f("Loading\u2026"),[p,d]=f(null),[m,g]=f(0),v=w(0),b=w({}),S=w(e);S.current=e,_(()=>{let k=!0;return S.current.call(ue).then(R=>{if(!k)return;let x=R||{};b.current=x,i(x),se(x),c("Saved")}).catch(()=>{k&&c("Could not load settings")}),()=>{k=!1}},[]);let A=k=>{let R=++v.current,x=b.current={...b.current,...k};i(x),se(x),c("Saving\u2026"),S.current.call(me,x).then(()=>{R===v.current&&(d(null),c("Saved"))}).catch(()=>{R===v.current&&(d(x),c("Could not save settings."))})};return n("div",{className:"ps-workspace",children:n("main",{className:"ps-editor-canvas",style:{overflowY:"auto"},children:l("div",{style:{width:"100%",maxWidth:760,margin:"0 auto",display:"flex",flexDirection:"column",gap:12},children:[l("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12},children:[l("div",{children:[n("h1",{style:{fontSize:18,margin:"4px 0"},children:"Settings"}),n("span",{style:{color:"var(--ps-text-muted)",fontSize:12},children:"Configure voice and cleanup defaults"})]}),n("button",{className:"ps-btn",onClick:t,children:"\u2190 Back to Studio"})]}),l("div",{style:{color:"var(--ps-text-muted)",fontSize:11},children:[n("span",{role:"status",children:a}),p&&n("button",{className:"ps-btn",onClick:()=>A(p),children:"Retry"})]}),n(ui,{values:r,onSave:A}),Object.entries(ai).map(([k,R])=>l(Sn.Fragment,{children:[l("section",{className:"ps-pane",style:{flex:"none"},children:[l("div",{className:"ps-pane-header",children:[n("h2",{className:"ps-pane-title",style:{margin:0},children:k}),k!=="Connections"&&n("button",{className:"ps-btn",onClick:()=>{k==="Voice & transcription"&&g(x=>x+1),A(Object.fromEntries(R.map(x=>[x.key,Xt[x.key]??""])))},children:"Reset"})]}),l("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[k==="Connections"&&n("p",{children:"Manage API keys in Zana\u2019s Prompt Voice plugin settings."}),R.filter(x=>!(x.key==="customPrompt"&&r.tone!=="custom")).map(x=>n(gi,{field:x,values:r,resetSignal:m,onSave:A},x.key))]})]}),k==="Voice & transcription"&&n(Zn,{rpc:e,sttProvider:r.sttProvider??Xt.sttProvider,llmProvider:r.llmProvider,onApplyPreset:A})]},k)),o?n("section",{className:"ps-pane",style:{flex:"none",padding:14},children:n(bt,{pluginId:o})}):null]})})})}function io(e){return e?e.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]+/gu)||[]:[]}var so=1200;function ao(e,t){if(!e&&!t)return[];if(e===t)return[{type:"unchanged",text:e}];if(!e)return[{type:"added",text:t}];if(!t)return[{type:"removed",text:e}];let o=io(e),r=io(t),i=o.length,a=r.length;if(i>so||a>so)return[{type:"removed",text:e},{type:"added",text:t}];let c=a+1,p=new Uint32Array((i+1)*c);for(let b=1;b<=i;b++){let S=b*c,A=(b-1)*c,k=o[b-1];for(let R=1;R<=a;R++)if(k===r[R-1])p[S+R]=p[A+(R-1)]+1;else{let x=p[S+(R-1)],V=p[A+R];p[S+R]=x>V?x:V}}let d=[],m=i,g=a;for(;m>0||g>0;){let b=m*c,S=(m-1)*c;m>0&&g>0&&o[m-1]===r[g-1]?(d.push({type:"unchanged",text:o[m-1]}),m--,g--):g>0&&(m===0||p[b+(g-1)]>=p[S+g])?(d.push({type:"added",text:r[g-1]}),g--):m>0&&(g===0||p[b+(g-1)]<p[S+g])&&(d.push({type:"removed",text:o[m-1]}),m--)}d.reverse();let v=[];for(let b of d)v.length>0&&v[v.length-1].type===b.type?v[v.length-1].text+=b.text:v.push({...b});return v}var Qt=`
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

  .ps-tone-panel {
    margin-top: 2px;
    padding: 8px 9px;
    border-radius: 6px;
    border: 1px solid rgba(59, 130, 246, 0.35);
    background: rgba(59, 130, 246, 0.06);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .ps-tone-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 10.5px;
    color: var(--ps-text-muted);
  }
  .ps-tone-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .ps-tone-chip {
    border: 1px solid var(--ps-border);
    background: var(--ps-input-bg);
    color: var(--ps-text-muted);
    font-size: 11px;
    font-weight: 500;
    padding: 4px 8px;
    border-radius: 5px;
    cursor: pointer;
    font-family: inherit;
    transition: border-color 0.12s, background 0.12s, color 0.12s;
  }
  .ps-tone-chip:hover {
    color: var(--text-primary, #e2e8f0);
    border-color: var(--ps-text-subtle);
  }
  .ps-tone-chip.active {
    background: var(--ps-accent);
    border-color: var(--ps-accent);
    color: #ffffff;
    font-weight: 600;
  }
  .ps-tone-hint {
    font-size: 10px;
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
`;async function Jt(e){if(!e)return!1;if(typeof navigator<"u"&&navigator.clipboard&&typeof navigator.clipboard.writeText=="function")try{return await navigator.clipboard.writeText(e),!0}catch{}if(typeof document<"u")try{let t=document.createElement("textarea");t.value=e,t.setAttribute("readonly",""),t.style.position="fixed",t.style.top="-9999px",t.style.left="-9999px",t.style.opacity="0",document.body.appendChild(t),t.focus(),t.select();let o=document.execCommand("copy");if(document.body.removeChild(t),o)return!0}catch{}return!1}var lo="zcc:prompt-voice:studio-draft:v1";function bi(e){return e?`${lo}:project:${e}`:lo}var ze=[{id:"standard",label:"Standard",desc:"Fix grammar & clarity while keeping your natural tone and length."},{id:"casual",label:"Casual",desc:"Relaxed, everyday phrasing \u2014 natural without sounding stiff."},{id:"conversational",label:"Conversational",desc:"Warm, natural, and easy to read \u2014 like speaking clearly."},{id:"formal",label:"Professional",desc:"Polished, respectful phrasing for emails, PRs, or stakeholders."},{id:"technical",label:"Technical",desc:"Precise, unambiguous engineering phrasing without fluff."}];function vi(e,t){switch(e){case"improve":return t?"Improving...":"Improve text";case"executive":return t?"Summarizing...":"Summarize";case"spec":return t?"Creating spec...":"Create spec";case"custom":return t?"Running...":"Run instructions";case"translate":return t?"Translating...":"Translate";default:return t?"Transforming...":"Transform text"}}var ht=[{id:"improve",title:"Improve writing",icon:"\u2728",desc:"Fix grammar, phrasing & punctuation without extending length.",tone:"standard"},{id:"executive",title:"Summarize",icon:"\u26A1",desc:"Condense into punchy bullet points.",instruction:"Summarize the core request into crisp, high-level executive bullet points.",tone:"formal"},{id:"spec",title:"Create a technical spec",icon:"\u{1F4D0}",desc:"Format with Goals, Context, Steps.",instruction:"Transform into a structured technical spec with ## Goal, ## Architecture, and ## Implementation Steps.",tone:"technical"}],hi={system:"Host STT",openai:"OpenAI","google-gemini":"Google Gemini","local-whisper":"Local Whisper"};function co(e){return e==="openai"||e==="google-gemini"}var xi=[{id:"google-gemini",label:"Google Gemini"},{id:"local-whisper",label:"Local Whisper (on this device)"},{id:"openai",label:"OpenAI (Whisper)"},{id:"system",label:"System (Zana Voice)"}],yi=[{id:"assistant",displayName:"Zana Assistant",models:[{id:"assistant",key:"assistant",label:"Default Assistant (Host Agent)",providerId:"assistant"}]}],po=[1500,3e3];function uo({focusWindow:e,bringBack:t}){return W(),l("div",{className:"ps-container","data-testid":"ps-detached-placeholder",children:[n("style",{children:Qt}),n("div",{className:"ps-empty-state",children:l("div",{className:"ps-empty-card",children:[n("span",{style:{fontSize:22},"aria-hidden":"true",children:"\u{1F399}\uFE0F"}),n("div",{style:{fontSize:14,fontWeight:600},children:"Prompt Studio is open in its own window"}),n("div",{style:{fontSize:12,color:"var(--ps-text-muted)"},children:"Focus the floating window or bring Prompt Studio back to this project tab."}),l("div",{style:{display:"flex",gap:8,marginTop:4},children:[n("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:e,children:"Focus Window"}),n("button",{type:"button",className:"ps-btn",onClick:t,children:"Bring Back"})]})]})})]})}function en({pluginId:e,projectId:t,headerActions:o,startSession:r=ae}){W();let[i,a]=f(!1),c=ut(e),p=On(),d=pt(),m=dt(),g=ge(),v=d?.providerId,b=d?.familyId,S=bi(t),A=w(!1),[k,R]=f(null),[x,V]=f(""),[C,$]=f(""),[oe,Y]=f(!1),[re,Ce]=f(!1),[J,j]=f(!1),[Q,G]=f(null),[Ke,tn]=f(!1),[nn,on]=f(null),[Pe,rn]=f(null),[Xe,Je]=f(!0),[sn,xt]=f(null),[Ie,Re]=f("assistant"),[je,Ee]=f("assistant"),[ve,an]=f(null),[Si,Qe]=f(null),[Fe,ln]=f(!0),[cn,mo]=f(null),[$e,yt]=f(!1),[M,ne]=f("improve"),[he,xe]=f("standard"),[Te,et]=f(Ye),[tt,pn]=f(""),[le,dn]=f(!1),[un,I]=f(null),[H,He]=f("system"),[St,nt]=f(""),[wt,mn]=f(!0),[At,ye]=f(null),[ce,Ct]=f(!1),[fo,fn]=f(0),[go,Pt]=f(null),[gn,bo]=f(()=>ie()),bn=w(gn);bn.current=gn;let pe=w(null),ke=w(null),Ne=w(null),vn=w(null);_(()=>{try{let s=localStorage.getItem(S);if(s){let u=JSON.parse(s);V(typeof u.inputText=="string"?u.inputText:""),$(typeof u.outputText=="string"?u.outputText:""),Re(u.selectedProviderId||"assistant"),Ee(u.selectedModelId||"assistant"),A.current=u.userManuallySelected===!0,He(u.sttProvider||"system"),nt(u.sttModel||""),u.selectedPresetId==="polish"?(ne("improve"),xe("standard")):u.selectedPresetId==="chat"?(ne("improve"),xe("conversational")):typeof u.selectedPresetId=="string"&&(u.selectedPresetId==="custom"||u.selectedPresetId==="translate"||ht.some(h=>h.id===u.selectedPresetId))?ne(u.selectedPresetId):ne("improve"),typeof u.selectedToneId=="string"&&ze.some(h=>h.id===u.selectedToneId)?xe(u.selectedToneId):u.selectedPresetId!=="chat"&&xe("standard"),et(Kt(u.targetLanguage)?.code??Ye)}else V(""),$(""),Re("assistant"),Ee("assistant"),He("system"),nt(""),ne("improve"),xe("standard"),et(Ye),A.current=!1}catch{}R(S)},[S]);let Be=w(c);Be.current=c;let K=w(!0),It=w(0),ot=w(0),rt=w(0),it=w(null),st=T(s=>{s&&(s.llmProvider&&(Qe(s.llmProvider),ln(s.llmProvider!=="none")),s.sttProvider&&He(s.sttProvider),typeof s.sttKeyConfigured=="boolean"&&mn(s.sttKeyConfigured))},[]),Rt=T(()=>{Be.current.call(Ae).then(s=>{K.current&&st(s)}).catch(()=>{})},[st]);_(()=>{let s=!0;return Be.current.call(Ae).then(u=>{s&&st(u)}).catch(()=>{}),()=>{s=!1}},[st]);let at=T(s=>{bo(u=>u.micDeviceId===s.micDeviceId&&u.micLabel===s.micLabel&&u.soundCuesEnabled===s.soundCuesEnabled&&u.soundCuesVolume===s.soundCuesVolume?u:s)},[]),lt=T(()=>{let s=++It.current;Be.current.call(ue).then(u=>{if(!K.current||It.current!==s)return;let h=u||{};typeof h.sttProvider=="string"&&h.sttProvider&&He(h.sttProvider),typeof h.sttModel=="string"&&h.sttModel&&nt(h.sttModel),typeof h.llmProvider=="string"&&h.llmProvider&&h.llmProvider!=="none"?an({providerId:h.llmProvider,modelId:typeof h.llmModel=="string"&&h.llmModel?h.llmModel:void 0}):h.llmProvider==="none"&&an(null),u&&typeof u=="object"&&at(se(h))}).catch(()=>{})},[at]),Ge=T(()=>{it.current&&(clearTimeout(it.current),it.current=null)},[]),De=T((s={})=>{let u=s.refresh===!0,h=s.retryAttempt??0;Ge();let P=++rt.current;Je(!0),(u||h===0)&&xt(null);let y=()=>{if(!K.current||h>=po.length)return;let N=po[h];it.current=setTimeout(()=>{K.current&&De({retryAttempt:h+1})},N)};Be.current.call(Cn,u?{refresh:!0}:void 0).then(N=>{if(!K.current||rt.current!==P)return;let X=Array.isArray(N)?N:[];rn(X),Je(!1),!X.some(O=>O.providerId!=="assistant"&&Array.isArray(O.models)&&O.models.length>0)&&!u&&y()}).catch(()=>{!K.current||rt.current!==P||(Je(!1),xt("Could not load Composer models. Using Zana Assistant."),y())})},[Ge]);$t(In,s=>{!K.current||!Array.isArray(s)||(rn(s),Je(!1),xt(null),Ge())}),_(()=>(K.current=!0,lt(),De(),()=>{K.current=!1,It.current++,ot.current++,rt.current++,Ge()}),[Ge,De,lt]);let vo=B(()=>(Pe??[]).some(s=>s.providerId!=="assistant"&&Array.isArray(s.models)&&s.models.length>0),[Pe]),ee=B(()=>{let s=(y,N)=>[...y].sort((X,F)=>N(X).localeCompare(N(F),void 0,{sensitivity:"base",numeric:!0})),u=(Pe??[]).filter(y=>Array.isArray(y.models)&&y.models.length>0);if(u.length===0){let y=yi.map(N=>{let X=!!(v&&N.id.toLowerCase()===v.toLowerCase()||b&&N.id.toLowerCase().includes(b.toLowerCase())),F=s(N.models,O=>O.label||O.id).map(O=>({...O,isComposerMatch:X}));return{...N,isComposerMatch:X,models:F}});return s(y,N=>N.displayName||N.id)}let h={"assistant:assistant":"assistant"},P=u.map(y=>{let N=!!(v&&y.providerId.toLowerCase()===v.toLowerCase()||b&&y.providerId.toLowerCase().includes(b.toLowerCase())),X=s(y.models,F=>F.label||F.id).map(F=>{let O=`${y.providerId}:${F.id}`,zo=h[O]??F.id;return{id:F.id,key:zo,label:F.label||F.id,providerId:y.providerId,isComposerMatch:N}});return{id:y.providerId,displayName:y.displayName||y.providerId,isComposerMatch:N,error:y.error??null,models:X}});return s(P,y=>y.displayName||y.id)},[Pe,v,b]),U=B(()=>ee.find(s=>s.id===Ie)??ee[0],[ee,Ie]),Se=B(()=>U?.models??[],[U]),z=B(()=>Se.find(u=>u.id===je||u.key===je)??Se[0],[Se,je]);_(()=>{if(Pe===null||A.current||ee.length===0)return;let s=ee.find(u=>u.isComposerMatch&&u.models.length>0)??ee.find(u=>u.isComposerMatch);if(s){Re(s.id),s.models.length>0&&Ee(u=>s.models.some(P=>P.id===u||P.key===u)?u:s.models[0].key||s.models[0].id);return}if(ve&&ve.providerId!=="assistant"){let u=ee.find(h=>h.id===ve.providerId&&h.models.length>0);if(u){Re(u.id);let P=(ve.modelId?u.models.find(y=>y.id===ve.modelId||y.key===ve.modelId):void 0)??u.models[0];P&&Ee(P.key||P.id)}}},[Pe,ee,ve]),_(()=>{if(k===S)try{localStorage.setItem(S,JSON.stringify({inputText:x,outputText:C,selectedProviderId:Ie,selectedModelId:je,userManuallySelected:A.current,sttProvider:H,sttModel:St,selectedPresetId:M,selectedToneId:he,targetLanguage:Te}))}catch{}},[k,S,x,C,Ie,je,H,St,M,he,Te]);let ho=s=>{ln(s);let u=s?U?.id??"assistant":"none",h=s?z?.id??"assistant":"";Qe(u),c.call(me,{llmProvider:u,llmModel:h}).catch(()=>{I("Could not update cleanup setting.")})},Et=s=>{He(s),ye(null),c.call(me,{sttProvider:s}).then(()=>Rt()).catch(()=>{I("Could not update speech provider setting.")})},xo=s=>{nt(s),c.call(me,{sttModel:s}).catch(()=>{})},yo=s=>{A.current=!0,Re(s);let u=ee.find(P=>P.id===s),h="";if(u&&u.models.length>0){let P=u.models[0].key||u.models[0].id;h=u.models[0].id,Ee(P)}Fe&&(Qe(s),c.call(me,{llmProvider:s,llmModel:h}).catch(()=>{}))},So=s=>{A.current=!0;let u=Ie,h=s;for(let P of ee){let y=P.models.find(N=>N.id===s||N.key===s);if(y){P.id!==Ie&&(Re(P.id),u=P.id),Ee(y.key||y.id),h=y.id;break}}Fe&&(Qe(u),c.call(me,{llmProvider:u,llmModel:h}).catch(()=>{}))};_(()=>()=>{ke.current&&clearInterval(ke.current),Ne.current&&clearInterval(Ne.current),pe.current&&pe.current.cancel()},[]);let wo=B(()=>{let s=x.trim();return`${s?s.split(/\s+/).length:0} words \xB7 ${x.length} chars`},[x]),Ao=B(()=>{let s=C.trim();return`${s?s.split(/\s+/).length:0} words \xB7 ${C.length} chars`},[C]),Co=B(()=>!C||!$e?[]:ao(x,C),[x,C,$e]),Tt=()=>{ke.current&&(clearInterval(ke.current),ke.current=null),Ne.current&&(clearInterval(Ne.current),Ne.current=null)},Po=()=>{Tt(),ke.current=setInterval(()=>fn(s=>s+1),1e3),Ne.current=setInterval(()=>{pe.current&&Pt(pe.current.getAudioLevel?.()??null)},100)},Io=async s=>{Ct(!1),Pt(null),Tt();let u=pe.current;if(pe.current=null,!!u){j(!0);try{let h=await u.stop();if(!K.current)return;D("stop",s);let P=await Oe(c,h),y=await c.call(_e,{audio:P.base64,mimeType:P.mimeType,transcriptionOnly:!0});y.ok&&y.status==="ok"?(D("complete",s),V(N=>Ve(N,y.text)),ye(null)):y.ok&&y.status==="no-speech"?(I("No speech detected. Try speaking closer to the microphone."),setTimeout(()=>I(null),4e3)):y.ok||(D("error",s),I(y.message),ye(y.message),y.code==="MISSING_KEY"&&mn(!1))}catch(h){D("error",s),I(h instanceof Error?h.message:"Transcription failed.")}finally{j(!1)}}},Ro=async(s,u)=>{if(ye(null),I(null),H!=="system"&&!wt){D("error",u);let P=H==="openai"?"OpenAI":"Google Gemini";ye(`API key required for direct ${P} speech-to-text. Switch to System (Zana Voice) below to dictate using host voice.`),I(`API key required for ${P}. Switch to System (Zana Voice) to dictate thoughts.`);return}let h=++ot.current;try{let P=D("start",u);if(P&&(await P,!K.current||ot.current!==h))return;let y=await(s.micDeviceId!==L?r({deviceId:s.micDeviceId}):r());if(!K.current||ot.current!==h){y.cancel();return}y.onError=N=>{pe.current=null,Ct(!1),Pt(null),Tt(),D("error",u),ye(N.message),I(N.message)},pe.current=y,Ct(!0),fn(0),Po()}catch(P){D("error",u),I(P instanceof Error?P.message:"Microphone access denied.")}},Eo=T(()=>{a(!1),at(ie()),lt(),Rt(),De()},[De,lt,Rt,at]),To=async()=>{let s=bn.current,u={enabled:s.soundCuesEnabled,volume:s.soundCuesVolume};ce?await Io(u):await Ro(s,u)},ko=async()=>{let s=x.trim();if(!s||le||!z||M==="custom"&&!tt.trim())return;let u=ht.find(O=>O.id===M),h=M==="custom",P=M==="improve",y=M==="translate",N=h?"custom":P?he:u?.tone||"technical",X=U?.id??"assistant",F=z?.id??"assistant";I(null),dn(!0);try{let O=await c.call(An,{text:s,...y?{targetLanguage:Te}:{tone:N},...h?{customPrompt:tt.trim()}:{},...!h&&!y&&u?.instruction?{instruction:u.instruction}:{},llmProvider:X,llmModel:F});O.ok?($(O.text),mo(`${U?.displayName||X}: ${O.llmModel||F}`)):I(O.message)}catch(O){I(O instanceof Error?O.message:"Refinement request failed.")}finally{dn(!1)}},No=async()=>{try{let s=await navigator.clipboard.readText();if(!s||!s.trim()){I("Clipboard is empty."),setTimeout(()=>I(null),2500);return}V(u=>Ve(u,s)),I("Pasted from clipboard into input draft!"),setTimeout(()=>I(null),2500)}catch{I("Clipboard access denied or unavailable."),setTimeout(()=>I(null),2500)}},Do=async()=>{if(!x)return;await Jt(x)?(Ce(!0),setTimeout(()=>Ce(!1),2e3),I("Input draft copied to clipboard!"),setTimeout(()=>I(null),2500)):(I("Failed to copy to clipboard."),setTimeout(()=>I(null),3e3))},_o=async()=>{if(!C)return;await Jt(C)?(Y(!0),setTimeout(()=>Y(!1),2e3),I("Refined output copied to clipboard!"),setTimeout(()=>I(null),2500)):(I("Failed to copy to clipboard."),setTimeout(()=>I(null),3e3))},Mo=()=>{!x&&!C||(V(""),$(""),ne("improve"),xe("standard"),et(Ye),pn(""),yt(!1),I("Studio canvas cleared."),setTimeout(()=>I(null),2500))},Lo=()=>{C&&(V(C),$(""),yt(!1),I("Refined output moved to input draft."),setTimeout(()=>I(null),2500))},Oo=()=>{let s=C||x;if(s){if(p&&typeof p.updateText=="function")try{p.updateText(u=>Ve(u,s)),p.focus?.(),G("Inserted into Composer!"),setTimeout(()=>G(null),2500);return}catch{}if(m&&typeof m.toCompose=="function"){m.toCompose({initialPrompt:s,focusPrompt:!0}),G("Opened in New Thread Composer!"),setTimeout(()=>G(null),2500);return}Jt(s).then(u=>{I(u?"No active composer \u2014 copied prompt to clipboard.":"Composer focus unavailable.")})}},Vo=async()=>{if(e){tn(!0),on(null);try{await mt(e,{showInProjects:!0})}catch(s){on(s instanceof Error?s.message:"Could not update plugin settings.")}finally{tn(!1)}}},Uo=T(s=>{(s.ctrlKey||s.metaKey)&&s.key.toLowerCase()==="k"&&(s.preventDefault(),ne("custom"),setTimeout(()=>vn.current?.focus(),0))},[]);return t&&!g.showInProjects?l("div",{className:"ps-container",children:[n("style",{children:Qt}),l("header",{className:"ps-header",children:[l("div",{className:"ps-header-left",children:[n("span",{style:{fontSize:18},children:"\u{1F399}\uFE0F"}),n("span",{className:"ps-header-title",children:"Prompt Studio"}),n("span",{className:"ps-badge ps-badge-project",children:"Project"})]}),o?n("div",{className:"ps-header-actions",children:o}):null]}),n("div",{className:"ps-empty-state","data-testid":"ps-project-hidden-notice",children:l("div",{className:"ps-empty-card",children:[n("span",{style:{fontSize:22},"aria-hidden":"true",children:"\u{1F507}"}),n("div",{style:{fontSize:14,fontWeight:600},children:"Prompt Studio is hidden in projects"}),n("div",{style:{fontSize:12,color:"var(--ps-text-muted)",lineHeight:1.45},children:"You disabled the project tab in Prompt Voice plugin settings. Re-enable it anytime to use project-scoped drafts here."}),nn?n("div",{role:"alert",style:{fontSize:11,color:"#fca5a5"},children:nn}):null,e?n("button",{type:"button",className:"ps-btn ps-btn-primary",disabled:Ke,onClick:()=>void Vo(),children:Ke?"Enabling\u2026":"Enable Prompt Studio in Projects"}):null]})})]}):l("div",{className:"ps-container",onKeyDown:Uo,children:[n("style",{children:Qt}),l("header",{className:"ps-header",children:[l("div",{className:"ps-header-left",children:[n("span",{style:{fontSize:18},children:"\u{1F399}\uFE0F"}),n("span",{className:"ps-header-title",children:"Prompt Studio"}),n("span",{className:"ps-badge",children:"Voice & AI Refinement"}),t?n("span",{className:"ps-badge ps-badge-project",children:"Project"}):null]}),o?n("div",{className:"ps-header-actions",children:o}):null]}),i?n(ro,{rpc:c,pluginId:e,onBack:Eo}):l("div",{className:"ps-workspace",children:[l("aside",{className:"ps-sidebar",children:[l("section",{className:"ps-section",children:[l("div",{className:"ps-section-title",children:[n("span",{children:"Voice Dictation"}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:hi[H]??H})]}),l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-stt-provider-select",className:"ps-field-label",children:"Speech Provider"}),n("select",{id:"ps-stt-provider-select",className:"ps-select","aria-label":"Speech-to-text provider",value:H,onChange:s=>{ye(null),Et(s.target.value)},disabled:ce||J,children:xi.map(s=>n("option",{value:s.id,children:s.label},s.id))})]}),co(H)&&l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-stt-model-input",className:"ps-field-label",children:"Speech Model (Optional)"}),n("input",{id:"ps-stt-model-input",className:"ps-select","aria-label":"Speech-to-text model",placeholder:"Provider default",value:St,onChange:s=>xo(s.target.value),disabled:ce||J})]}),At&&l("div",{role:"alert",style:{padding:"8px 10px",borderRadius:6,background:"rgba(239, 68, 68, 0.12)",border:"1px solid rgba(239, 68, 68, 0.35)",color:"#fca5a5",fontSize:11,textAlign:"left",lineHeight:1.4,display:"flex",flexDirection:"column",gap:6},children:[l("div",{children:["\u26A0\uFE0F ",At]}),co(H)&&n("button",{type:"button",className:"ps-btn ps-btn-primary",style:{alignSelf:"flex-start",fontSize:11,padding:"4px 8px"},onClick:()=>Et("system"),children:"Switch to System (Zana Voice)"})]}),H!=="system"&&!wt&&!At&&l("div",{style:{padding:"8px 10px",borderRadius:6,background:"rgba(234, 179, 8, 0.1)",border:"1px solid rgba(234, 179, 8, 0.3)",color:"#fde047",fontSize:11,textAlign:"left",lineHeight:1.4,display:"flex",flexDirection:"column",gap:6},children:[l("div",{children:["\u2139\uFE0F ",n("strong",{children:"API key required:"})," Direct ",H==="openai"?"OpenAI Whisper":"Google Gemini"," speech-to-text requires an API key in Zana Settings."]}),n("button",{type:"button",className:"ps-btn ps-btn-primary",style:{alignSelf:"flex-start",fontSize:11,padding:"4px 8px"},onClick:()=>Et("system"),children:"Switch to System (Zana Voice)"})]}),l("div",{className:"ps-dictation-card",children:[l("button",{type:"button",className:`ps-btn ${ce?"ps-btn-danger":J?"":"ps-btn-primary"}`,style:{width:"100%",justifyContent:"center",padding:"10px 0",opacity:J?.8:1},onClick:To,disabled:J,"aria-label":J?"Transcribing audio":ce?"Stop dictation":"Start dictation",children:[n("span",{className:J?"ps-spin":void 0,children:J?"\u23F3":ce?"\u23F9\uFE0F":"\u{1F399}\uFE0F"}),n("span",{children:J?"Transcribing...":ce?`Stop Dictation (${fo}s)`:"Dictate Thoughts"})]}),ce&&l("div",{style:{width:"100%",display:"flex",flexDirection:"column",gap:4},children:[n("div",{className:"ps-meter-bar",children:n("div",{className:"ps-meter-fill",style:{width:`${Math.min(100,(go??.1)*100)}%`}})}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:"Listening live..."})]})]}),n("div",{style:{fontSize:10,color:"var(--ps-text-subtle)",lineHeight:1.3},children:H==="system"?"Uses host Zana voice transcription without requiring external API keys.":H==="local-whisper"?"Transcribes on this device. Install the runtime and a model in Settings.":wt?`Using direct ${H==="openai"?"OpenAI Whisper":"Google Gemini"} speech-to-text.`:`\u26A0\uFE0F ${H==="openai"?"OpenAI":"Google Gemini"} requires an API key in Zana Settings. Choose System (Zana Voice) for built-in free dictation.`})]}),l("section",{className:"ps-section",children:[l("div",{className:"ps-section-title",children:[n("span",{children:"Refinement Engine"}),l("span",{style:{display:"inline-flex",alignItems:"center",gap:6},children:[n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:Xe&&!vo?"Loading\u2026":Xe?"Refreshing\u2026":U?.isComposerMatch?"\u2605 Composer Active":"AI Model"}),n("button",{type:"button",className:"ps-btn",style:{padding:"2px 6px",fontSize:10},onClick:()=>De({refresh:!0}),disabled:Xe||le,"aria-label":"Refresh models",title:"Reload models from Composer",children:Xe?"\u2026":"\u21BB"})]})]}),l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-provider-select",className:"ps-field-label",children:"Provider"}),n("select",{id:"ps-provider-select",className:"ps-select","aria-label":"Refinement provider",value:U?.id??"",onChange:s=>yo(s.target.value),disabled:le,children:ee.map(s=>l("option",{value:s.id,children:[s.displayName,s.isComposerMatch?" \u2605 (Composer)":""]},s.id))})]}),l("div",{className:"ps-field-group",children:[l("label",{htmlFor:"ps-model-select",className:"ps-field-label",children:["Model (",Se.length,")"]}),n("select",{id:"ps-model-select",className:"ps-select","aria-label":"Refinement model",value:z?.key||z?.id||"",onChange:s=>So(s.target.value),disabled:le||Se.length===0,children:Se.length===0?n("option",{value:"",children:"No models available"}):Se.map(s=>l("option",{value:s.key||s.id,children:[s.label,s.isComposerMatch?" \u2605 (Composer)":""]},s.key||s.id))})]}),(U?.error||sn)&&n("div",{role:"status",style:{fontSize:10.5,color:"#fde047",lineHeight:1.35,padding:"6px 8px",borderRadius:6,background:"rgba(234, 179, 8, 0.1)",border:"1px solid rgba(234, 179, 8, 0.25)"},children:U?.error||sn}),l("div",{style:{marginTop:8,paddingTop:8,borderTop:"1px solid var(--ps-border)",display:"flex",flexDirection:"column",gap:4},children:[l("label",{style:{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:11,fontWeight:500,userSelect:"none"},children:[n("input",{type:"checkbox","aria-label":"Auto-cleanup mic dictations",checked:Fe,onChange:s=>ho(s.target.checked)}),n("span",{children:"Auto-cleanup mic dictations"})]}),n("span",{style:{fontSize:10,color:"var(--ps-text-subtle)",lineHeight:1.3},children:Fe?`Composer mic cleans up using ${U?.displayName}${z?` (${z.label||z.id})`:""}.`:"Composer mic inserts raw transcript without AI cleanup."})]}),l("div",{style:{marginTop:4,fontSize:11,color:"var(--ps-text-muted)",lineHeight:1.35},children:[U?.isComposerMatch?l("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:600},children:["\u2605 Synced to Composer: ",U.displayName,z?` (${z.label})`:""]}):U?.id==="assistant"?"Uses the active Zana assistant agent with no extra API key required.":z?l(Z,{children:["Using ",n("strong",{children:U?.displayName})," \xB7 ",n("code",{children:z.id})]}):null,cn?l("div",{style:{marginTop:3,color:"var(--ps-text-subtle)",fontSize:10},children:["Last refined: ",cn]}):null]})]}),l("section",{className:"ps-section",children:[n("div",{className:"ps-section-title",children:"How should we improve it?"}),l("div",{className:"ps-presets-list",role:"radiogroup","aria-label":"How should we improve it?",children:[ht.map(s=>{let u=ze.find(h=>h.id===he)??ze[0];return l("div",{style:{display:"flex",flexDirection:"column",gap:6},children:[l("label",{className:`ps-preset-btn ${M===s.id?"active":""}`,children:[l("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:s.id,checked:M===s.id,onChange:()=>ne(s.id)}),s.title]}),n("span",{className:"preset-desc",children:s.desc})]}),s.id==="improve"&&M==="improve"&&l("div",{className:"ps-tone-panel",children:[l("div",{className:"ps-tone-header",children:[l("span",{children:["Tone: ",n("strong",{style:{color:"var(--text-primary, #e2e8f0)"},children:u.label})]}),n("span",{style:{color:"var(--ps-text-subtle)"},children:"Same length"})]}),n("div",{className:"ps-tone-chips",role:"group","aria-label":"Improvement tone",children:ze.map(h=>n("button",{type:"button",className:`ps-tone-chip ${he===h.id?"active":""}`,"aria-pressed":he===h.id,onClick:()=>xe(h.id),children:h.label},h.id))}),n("div",{className:"ps-tone-hint",children:u.desc})]})]},s.id)}),l("label",{className:`ps-preset-btn ${M==="custom"?"active":""}`,children:[l("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:"custom",checked:M==="custom",onChange:()=>ne("custom")}),"Custom instructions"]}),n("span",{className:"preset-desc",children:"Describe your own transformation."})]}),M==="custom"&&n("textarea",{ref:vn,className:"ps-custom-prompt-input","aria-label":"Custom instructions",placeholder:"e.g. Turn into user stories with acceptance criteria...",value:tt,onChange:s=>pn(s.target.value)}),l("div",{style:{display:"flex",flexDirection:"column",gap:6},children:[l("label",{className:`ps-preset-btn ${M==="translate"?"active":""}`,children:[l("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:"translate",checked:M==="translate",onChange:()=>ne("translate")}),"Translate"]}),n("span",{className:"preset-desc",children:"Translate into another language while keeping meaning."})]}),M==="translate"&&l("div",{className:"ps-tone-panel",children:[l("div",{className:"ps-tone-header",children:[n("label",{htmlFor:"ps-translate-lang-select",children:n("strong",{style:{color:"var(--text-primary, #e2e8f0)"},children:"Target language"})}),n("span",{style:{color:"var(--ps-text-subtle)"},children:"Same meaning"})]}),n("select",{id:"ps-translate-lang-select",className:"ps-select","aria-label":"Target language",value:Te,onChange:s=>et(s.target.value),disabled:le,children:Yt.map(s=>n("option",{value:s.code,children:s.label},s.code))})]})]})]})]}),n("button",{type:"button",className:"ps-btn",style:{marginTop:"auto"},onClick:()=>a(!0),children:"Settings"})]}),l("main",{className:"ps-editor-canvas",children:[l("section",{className:"ps-pane",children:[l("div",{className:"ps-pane-header",children:[l("div",{className:"ps-pane-title",children:[n("span",{children:"\u{1F4DD}"}),n("span",{children:"Raw Input Draft"})]}),l("div",{style:{display:"flex",gap:6},children:[n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:No,title:"Paste from clipboard into input draft","aria-label":"Paste into input draft",children:"\u{1F4CB} Paste"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Do,disabled:!x,title:"Copy raw input","aria-label":"Copy raw input",children:re?"\u2705 Copied":"\u{1F4CB} Copy"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>V(""),disabled:!x,title:"Clear input",children:"Clear"})]})]}),n("textarea",{className:"ps-textarea",placeholder:"Type your raw thoughts or click Dictate in the left sidebar to speak...",value:x,onChange:s=>V(s.target.value),"aria-label":"Raw Input Text"})]}),l("div",{className:"ps-action-bar",children:[l("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12},children:[n("span",{className:"ps-pill",children:M==="improve"?`\u2B07 Improve writing \xB7 ${(ze.find(s=>s.id===he)??ze[0]).label}`:M==="translate"?`\u2B07 Translate \xB7 ${Kt(Te)?.label??Te}`:M==="custom"?"\u2B07 Custom instructions":`\u2B07 ${ht.find(s=>s.id===M)?.title??"Refine pipeline"}`}),n("span",{style:{color:"var(--ps-text-muted)"},children:x.trim()?`${x.trim().split(/\s+/).length} words ready`:"Add text to get started"})]}),n("div",{style:{display:"flex",alignItems:"center",gap:6},children:l("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:()=>ko(),disabled:le||!x.trim()||!z||M==="custom"&&!tt.trim(),title:M==="translate"?"Translate raw draft into the selected language":"Transform raw draft into output",children:[n("span",{children:le?"\u23F3":"\u26A1"}),n("span",{children:vi(M,le)})]})})]}),l("section",{className:"ps-pane",children:[l("div",{className:"ps-pane-header",children:[l("div",{className:"ps-pane-title",children:[n("span",{children:"\u2728"}),n("span",{children:"Result"})]}),l("div",{style:{display:"flex",gap:6},children:[C&&l("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>yt(s=>!s),title:"Toggle inline diff against input draft",children:[n("span",{children:$e?"\u{1F441}\uFE0F":"\u{1F50D}"}),n("span",{children:$e?"View Clean":"View Diff"})]}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Lo,disabled:!C,title:"Move output to input draft for iterative re-refinement",children:"\u2B06 Replace Input"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:_o,disabled:!C,title:"Copy refined text to clipboard","aria-label":"Copy refined output",children:oe?"\u2705 Copied":"\u{1F4CB} Copy"})]})]}),$e&&C?n("div",{className:"ps-output-view",children:Co.map((s,u)=>s.type==="added"?n("span",{className:"ps-diff-added",children:s.text},u):s.type==="removed"?n("span",{className:"ps-diff-removed",children:s.text},u):n("span",{className:"ps-diff-unchanged",children:s.text},u))}):n("textarea",{className:"ps-textarea",placeholder:"Your improved, structured, or translated text will appear here...",value:C,onChange:s=>$(s.target.value),"aria-label":"Refined output"})]}),l("div",{className:"ps-action-bar",children:[n("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12},children:Q?n("span",{className:"ps-badge",style:{background:"rgba(34, 197, 94, 0.2)",color:"#86efac"},children:Q}):n("span",{style:{color:"var(--ps-text-muted)"},children:C?"Ready to insert refined result into Composer":x?"Ready to insert raw draft into Composer":"Draft or refine a prompt to insert into Composer"})}),l("div",{style:{display:"flex",alignItems:"center",gap:8},children:[l("button",{type:"button",className:"ps-btn",onClick:Mo,title:"Clear current input and output",disabled:!x&&!C,children:[n("span",{children:"\u{1F5D1}\uFE0F"}),n("span",{children:"Clear"})]}),l("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:Oo,disabled:!x&&!C,title:"Append current text directly into Zana Composer",children:[n("span",{children:"\u{1F4AC}"}),n("span",{children:"Insert into Composer"})]})]})]})]})]}),l("footer",{className:"ps-status-bar",children:[l("div",{style:{display:"flex",gap:12},children:[l("span",{children:["Input: ",wo]}),l("span",{children:["Output: ",Ao]}),un&&n("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:500},children:un})]}),l("div",{style:{display:"flex",gap:12,alignItems:"center"},children:[l("span",{children:["Engine: ",U?.displayName," \xB7 ",z?.label??"No model"]}),l("span",{className:"ps-pill",children:["Mic cleanup: ",Fe?`${U?.displayName}${z?` (${z.label||z.id})`:""}`:"Off (Raw)"]}),U?.isComposerMatch&&n("span",{className:"ps-pill",style:{color:"var(--accent, #3b82f6)"},children:"\u2605 Composer Synced"}),n("span",{children:"Zana Prompt Studio"})]})]})]})}var Ga=yn(e=>{W(),e.composer.customize({id:"prompt-voice-mic",actions:[{id:"prompt-voice-mic",component:Wn}]}),e.slots.navPanel?.({id:fe,title:"Prompt Studio",icon:"Sparkles",path:fe,component:en}),e.slots.projectTab?.({id:Me,label:"Prompt Studio",icon:"Sparkles",order:50,global:!1,header:"custom",detachable:!0,component:en,detachedPlaceholder:uo}),e.slots.homepageSection?.({id:"prompt-voice-home",title:"Prompt Voice",component:Fn}),e.slots.settingsSection?.({id:"prompt-voice-visibility",title:"Where Prompt Voice Appears",description:"Choose whether Prompt Voice appears on the main Home screen, inside projects, and in composers.",component:bt}),e.slots.commandPaletteAction?.({id:"open-prompt-studio",title:"Prompt Studio: Open Canvas",isAvailable:()=>!0,run:t=>{if(typeof t.toPluginPanel=="function"){t.toPluginPanel(fe);return}t.navigate?.(`/${fe}`)}}),e.slots.commandPaletteAction?.({id:"open-prompt-studio-project",title:"Prompt Studio: Open in This Project",isAvailable:t=>!!t.projectId,run:t=>{t.projectId&&typeof t.toProject=="function"&&t.toProject(t.projectId,{tabId:Me})}})});export{fe as PROMPT_STUDIO_PANEL_PATH,Me as PROMPT_STUDIO_PROJECT_TAB_ID,Ga as default};
//# sourceMappingURL=app.js.map
