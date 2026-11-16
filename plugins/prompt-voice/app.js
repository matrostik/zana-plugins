function ln(){let e=globalThis.__ZCC_PLUGIN_HOST__;if(!e)throw new Error("plugin host is not available");return e}function Pe(){return globalThis.__ZCC_PLUGIN_RUNTIME__??{}}function at(e){throw new Error(`${e} is not available until the host plugin runtime is installed`)}async function cn(e,t,o){return ln().callRpc(e,t,o)}async function Pt(e,t){return ln().setSettings(e,t)}function pn(e){return{__zccPluginApp:!0,setup:e}}function qe(){return Pe().useRpc?.()??at("useRpc")}function Rt(e,t){Pe().useRealtime?.(e,t)}function It(){return Pe().useSettings?.()??{values:void 0,isLoading:!0}}function Tt(){return Pe().useZccContext?.()??{projectId:null,threadId:null}}function kt(){return Pe().useZccNavigate?.()??at("useZccNavigate")}function Ze(){return Pe().useComposer?.()??at("useComposer")}function Nt(){return Pe().useComposerView?.()??at("useComposerView")}var T=globalThis.__ZCC_HOST_REACT__,dn=T,ti=T.Children,ni=T.Component,oi=T.Fragment,ri=T.StrictMode,ii=T.Suspense,si=T.cloneElement,ai=T.createContext,li=T.createElement,ci=T.createRef,pi=T.forwardRef,di=T.isValidElement,ui=T.lazy,mi=T.memo,fi=T.startTransition,k=T.useCallback,bi=T.useContext,gi=T.useDebugValue,vi=T.useDeferredValue,M=T.useEffect,hi=T.useId,xi=T.useImperativeHandle,yi=T.useInsertionEffect,Si=T.useLayoutEffect,G=T.useMemo,un=T.useReducer,w=T.useRef,g=T.useState,wi=T.useSyncExternalStore,Ai=T.useTransition,Ci=T.version;var L="default";function No(e){if(typeof e!="string")return L;let t=e.trim().slice(0,256);return!t||t===L?L:t}function Do(e){return typeof e!="string"?"":e.trim().slice(0,200)}function _o(e){return!(e===!1||typeof e=="string"&&e.trim().toLowerCase()==="false")}function Mo(e){let t=typeof e=="number"?e:typeof e=="string"&&e.trim()!==""?Number(e):Number.NaN;return Number.isFinite(t)?Math.round(Math.min(100,Math.max(0,t))):75}function ge(e){let t=e??{},o=No(t.micDeviceId);return{micDeviceId:o,micLabel:o===L?"":Do(t.micLabel),soundCuesEnabled:_o(t.soundCuesEnabled),soundCuesVolume:Mo(t.soundCuesVolume)}}var Le="promptVoice.transcribe",Re="promptVoice.status",mn="promptVoice.rephrase",fn="promptVoice.availableModels",ve="promptVoice.settings.get",he="promptVoice.settings.update",bn="promptVoice:settingsChanged",gn="promptVoice:modelsUpdated",ie={state:"promptVoice.localWhisper.state",installRuntime:"promptVoice.localWhisper.installRuntime",cancelRuntimeInstall:"promptVoice.localWhisper.cancelRuntimeInstall",downloadModel:"promptVoice.localWhisper.downloadModel",cancelModelDownload:"promptVoice.localWhisper.cancelModelDownload",removeModel:"promptVoice.localWhisper.removeModel",selectModel:"promptVoice.localWhisper.selectModel",start:"promptVoice.localWhisper.start",stop:"promptVoice.localWhisper.stop"};var xe="prompt-studio",Oe="prompt-studio";var vn="zcc:prompt-voice:audio-prefs:v1";function Dt(){try{if(typeof localStorage>"u")return null;let e=localStorage.getItem(vn);if(!e)return null;let t=JSON.parse(e);return!t||typeof t!="object"||Array.isArray(t)?null:ge(t)}catch{return null}}function ce(){return Dt()??ge({})}function pe(e){let t=ge(e);try{typeof localStorage<"u"&&localStorage.setItem(vn,JSON.stringify({micDeviceId:t.micDeviceId,micLabel:t.micDeviceId===L?"":t.micLabel,soundCuesEnabled:String(t.soundCuesEnabled),soundCuesVolume:String(t.soundCuesVolume)}))}catch{}return t}var _t=`/* Base Container */
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
`;var hn="zcc-ext-prompt-voice-styles";function J(){if(typeof document>"u")return;let e=document.getElementById(hn);e||(e=document.createElement("style"),e.id=hn,document.head.appendChild(e)),e.textContent!==_t&&(e.textContent=_t)}var Oo=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4"];var Q=class extends Error{code;constructor(t,o){super(o),this.name="RecordingError",this.code=t}};function Vo(e){return Oo.find(t=>e(t))??null}var Uo="audio/webm";function xn(){return{getUserMedia:e=>navigator.mediaDevices.getUserMedia(e),createRecorder:(e,t)=>new MediaRecorder(e,t?{mimeType:t}:void 0),isTypeSupported:e=>typeof MediaRecorder<"u"&&MediaRecorder.isTypeSupported(e)}}async function zo(e,t){let o=t&&t!=="default"?t:void 0,r=o?{audio:{deviceId:{exact:o}}}:{audio:!0};try{return await e.getUserMedia(r)}catch(i){let c=i instanceof Error?i.name:"";if(c==="NotAllowedError"||c==="SecurityError")throw new Q("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again.");if(o&&(c==="OverconstrainedError"||c==="NotFoundError"))try{return await e.getUserMedia({audio:!0})}catch(l){let p=l instanceof Error?l.name:"";if(p==="NotAllowedError"||p==="SecurityError")throw new Q("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again.")}throw new Q("MIC_UNAVAILABLE","No microphone is available. Connect one and try again.")}}function Mt(e){return new Promise((t,o)=>{let r=new FileReader;r.onload=()=>{let i=typeof r.result=="string"?r.result:"";t(i.slice(i.indexOf(",")+1))},r.onerror=()=>o(new Q("RECORDING_FAILED","The recording could not be read.")),r.readAsDataURL(e)})}async function jo(e,t){let o=new Blob(e,{type:t});return{base64:await Mt(o),mimeType:o.type||t}}function $o(e,t){if(!(e>0&&Number.isFinite(e)))return()=>{};let o=setTimeout(t,e);return()=>clearTimeout(o)}var Fo="That recording is too large to transcribe. Keep dictation shorter and try again.";function Ho(e,t){let o=Math.max(t,e),r=[],i=0,c=!1;return{chunks:r,get overflowed(){return c},add(l){return l.size===0||c?"ignored":i+l.size>o?(c=!0,"overflow"):(r.push(l),i+=l.size,i>=e?"limit-reached":"accepted")}}}function Bo(e,t){let o=new Promise((r,i)=>{e.onstop=()=>r(),e.onerror=()=>{let c=new Q("RECORDING_FAILED","Recording stopped unexpectedly. Try again.");t(c),i(c)}});return o.catch(()=>{}),o}function Wo(e,t,o,r){let i=Bo(e,r);return e.ondataavailable=c=>{let l=t.add(c.data);(l==="limit-reached"||l==="overflow")&&o()},e.start(1e3),i}async function Go(e,t,o,r){try{await e}finally{t()}if(o.overflowed)throw new Q("RECORDING_FAILED",Fo);return jo(o.chunks,r)}function qo(e){let t=()=>{};return{stopRecorder(){t(),e.state!=="inactive"&&e.stop()},armTimer(o,r){t=$o(o,r)}}}function Zo(e,t){let o=null;return{attach(r){o=r},detach(){o=null},autoStop(){e();let r=o?.onAutoStop;o&&(o.onAutoStop=void 0),r?.()},fail(r){e(),t();let i=o?.onError;o=null,i?.(r)}}}function Yo(e,t,o,r){let i=Ho(r.maxBytes??9437184,r.hardMaxBytes??10485760),{stopRecorder:c,armTimer:l}=qo(e),p=Zo(c,t);l(r.maxDurationMs??12e4,p.autoStop);let d=Wo(e,i,p.autoStop,p.fail),m={onError:r.onError,onAutoStop:r.onAutoStop,async stop(){c();try{return await Go(d,t,i,e.mimeType||o)}finally{p.detach()}},cancel(){c(),t(),p.detach()}};return p.attach(m),m}var de=e=>Ko(xn(),e);async function Ko(e=xn(),t={}){let o=await zo(e,t.deviceId),r=Xo(o),i=o.getTracks(),c,l=()=>{for(let p of i)c&&p.removeEventListener?.("ended",c);r?.close(),i.forEach(p=>p.stop())};try{let p=Vo(e.isTypeSupported)??Uo,d=e.createRecorder(o,p),m=Yo(d,l,p,t);return m.getAudioLevel=()=>r?.level()??null,c=()=>{let f=m.onError;m.cancel(),f?.(new Q("MIC_UNAVAILABLE","Microphone disconnected. Check your device and try again."))},i.forEach(f=>f.addEventListener?.("ended",c)),m}catch(p){throw l(),p instanceof Q?p:new Q("RECORDING_FAILED",p instanceof Error?p.message:"The recording could not be started.")}}function Xo(e){let t;try{t=new AudioContext;let o=t.createMediaStreamSource(e),r=t.createAnalyser();r.fftSize=256,o.connect(r);let i=new Uint8Array(r.fftSize),c=t,l=!1;return{level(){if(c.state&&c.state!=="running")return null;r.getByteTimeDomainData(i);let p=i.reduce((d,m)=>d+((m-128)/128)**2,0)/i.length;return Math.min(1,Math.sqrt(p)*5)},close(){l||(l=!0,o.disconnect(),c.close().catch(p=>console.error("Prompt Voice audio meter cleanup failed",p)))}}}catch(o){return t&&t.close().catch(r=>console.error("Prompt Voice audio meter cleanup failed",r)),console.warn("Prompt Voice audio meter unavailable",o),null}}var Lt=["both","main","projects","off"];var Jo="both",Ot=[{id:"all",label:"Main Screen & Projects",description:"Show on Zana Home, inside Projects, and in all composers.",settings:{showHomeWidget:!0,showInProjects:!0,micVisibility:"both"}},{id:"projects",label:"Projects Only",description:"Show the Prompt Studio tab and mic button only inside projects.",settings:{showHomeWidget:!1,showInProjects:!0,micVisibility:"projects"}},{id:"main",label:"Main Screen Only",description:"Show on Zana Home and global composers; hide project tabs and project mics.",settings:{showHomeWidget:!0,showInProjects:!1,micVisibility:"main"}},{id:"mic-only",label:"Composer Mic Only",description:"Hide the Home widget and project tabs; keep only the composer mic.",settings:{showHomeWidget:!1,showInProjects:!1,micVisibility:"both"}}],Sn={both:"Everywhere (Main & Projects)",main:"Main screen composers only",projects:"Project composers only",off:"Hidden"};function yn(e,t){if(typeof e=="boolean")return e;if(typeof e=="string"){let o=e.trim().toLowerCase();if(o==="true")return!0;if(o==="false")return!1}return t}function Qo(e){return typeof e=="string"&&Lt.includes(e)?e:Jo}function Vt(e){let t=e??{};return{showHomeWidget:yn(t.showHomeWidget,!0),showInProjects:yn(t.showInProjects,!0),micVisibility:Qo(t.micVisibility)}}function wn(e){for(let t of Ot)if(t.settings.showHomeWidget===e.showHomeWidget&&t.settings.showInProjects===e.showInProjects&&t.settings.micVisibility===e.micVisibility)return t.id;return"custom"}function An(e,t,o){if(e==="off")return!1;if(e==="both")return!0;let r=t&&typeof t=="object"&&"projectId"in t?t.projectId:void 0,i=r!==void 0?r:o,c=typeof i=="string"&&i.length>0;return e==="projects"?c:!c}var Ie="prompt-voice";function er(){try{let e=cn;return typeof e=="function"?e:void 0}catch{return}}function tr(){try{return typeof It=="function"?It():null}catch{return null}}function lt(){try{return typeof Nt=="function"?Nt():null}catch{return null}}function Cn(){try{return typeof Tt=="function"?Tt():null}catch{return null}}function ct(){try{return typeof kt=="function"?kt():null}catch{return null}}function En(){try{return typeof Ze=="function"?Ze():null}catch{return null}}function nr(){try{return typeof qe=="function"?qe():null}catch{return null}}function pt(e){let t=nr(),o=w(t);o.current=t;let r=w(e);return r.current=e,G(()=>({async call(i,c){let l=er(),p=c!==void 0;if(r.current&&r.current!==Ie&&l)return p?await l(Ie,i,c):await l(Ie,i);let d=o.current;if(d)try{return p?await d.call(i,c):await d.call(i)}catch(m){if(l&&m instanceof Error&&/unknown rpc/i.test(m.message))return p?await l(Ie,i,c):await l(Ie,i);throw m}if(l)return p?await l(Ie,i,c):await l(Ie,i);throw new Error("Prompt Voice RPC is unavailable in this environment.")}}),[])}function Ut(e,t){try{typeof Rt=="function"&&Rt(e,t)}catch{}}function ye(){let t=tr()?.values,o=Vt(t),[r,i]=g(null);return M(()=>{i(null)},[o.showHomeWidget,o.showInProjects,o.micVisibility]),Ut(bn,c=>{c&&typeof c=="object"&&i(Vt(c))}),r??o}async function dt(e,t){if(typeof Pt!="function")throw new Error("Plugin settings API is unavailable in this environment.");await Pt(e,t)}var or={start:[{frequency:523.25,offsetSec:0,durationSec:.11,type:"sine",peakFactor:.9},{frequency:659.25,offsetSec:.075,durationSec:.14,type:"sine",peakFactor:1}],stop:[{frequency:493.88,offsetSec:0,durationSec:.1,type:"sine",peakFactor:.85}],complete:[{frequency:659.25,offsetSec:0,durationSec:.1,type:"sine",peakFactor:.85},{frequency:783.99,offsetSec:.075,durationSec:.16,type:"sine",peakFactor:1}],error:[{frequency:329.63,offsetSec:0,durationSec:.12,type:"triangle",peakFactor:.9},{frequency:246.94,offsetSec:.095,durationSec:.16,type:"triangle",peakFactor:.9}]},ut=null;function rr(){if(typeof window>"u")return null;let e=window.AudioContext??window.webkitAudioContext;return e?((!ut||ut.state==="closed")&&(ut=new e),ut):null}function Pn(e,t,o){let r=e.currentTime,i=or[t],c=null,l=0;for(let p of i){let d=e.createOscillator(),m=e.createGain(),f=r+p.offsetSec,b=f+p.durationSec,v=p.offsetSec+p.durationSec+.02,S=o*(p.peakFactor??1);v>=l&&(l=v,c=d),d.type=p.type??"sine",d.frequency.setValueAtTime(p.frequency,f),m.gain.setValueAtTime(1e-4,f),m.gain.exponentialRampToValueAtTime(Math.max(2e-4,S),f+.015),m.gain.exponentialRampToValueAtTime(1e-4,b),d.connect(m),m.connect(e.destination),d.start(f),d.stop(b+.02)}return{finalOsc:c,totalDurationSec:l}}function Rn(e,t){let o=Math.ceil(t*1e3)+40;return new Promise(r=>{let i=!1,c=null,l=()=>{i||(i=!0,c!==null&&clearTimeout(c),e&&typeof e.removeEventListener=="function"&&e.removeEventListener("ended",l),r())};if(e&&typeof e.addEventListener=="function")e.addEventListener("ended",l,{once:!0});else if(e&&"onended"in e){let p=e.onended;e.onended=function(d){typeof p=="function"&&p.call(this,d),l()}}c=setTimeout(l,o)})}async function ir(e){if(e.state!=="suspended")return e.state==="running";let t=null;try{return await Promise.race([e.resume(),new Promise(o=>{t=setTimeout(o,750)})]),e.state!=="suspended"}catch{return!1}finally{t!==null&&clearTimeout(t)}}function _(e,t){if(!t.enabled)return null;let o=Math.min(100,Math.max(0,t.volume));if(!Number.isFinite(o)||o<=0)return null;try{let r=rr();if(!r)return null;let i=o/100*.2;if(r.state==="suspended")return(async()=>{if(!await ir(r))return;let{finalOsc:d,totalDurationSec:m}=Pn(r,e,i);await Rn(d,m)})().catch(()=>{});let{finalOsc:c,totalDurationSec:l}=Pn(r,e,i);return Rn(c,l)}catch{return null}}var zt=16e3,In=44,Ye=2,sr="This recording couldn't be prepared for Local Whisper. Try again.",ar=async(e,t)=>{let r=await new OfflineAudioContext(1,1,t).decodeAudioData(e),i=Array.from({length:r.numberOfChannels},(c,l)=>r.getChannelData(l));return{sampleRate:r.sampleRate,channels:i}};function lr(e){if(e.length===0)return new Float32Array(0);if(e.length===1)return e[0];let t=Math.min(...e.map(r=>r.length)),o=new Float32Array(t);for(let r=0;r<t;r+=1){let i=0;for(let c of e)i+=c[r];o[r]=i/e.length}return o}function cr(e,t){let o=e.length*Ye,r=new Uint8Array(In+o),i=new DataView(r.buffer),c=(l,p)=>{for(let d=0;d<p.length;d+=1)i.setUint8(l+d,p.charCodeAt(d))};c(0,"RIFF"),i.setUint32(4,36+o,!0),c(8,"WAVE"),c(12,"fmt "),i.setUint32(16,16,!0),i.setUint16(20,1,!0),i.setUint16(22,1,!0),i.setUint32(24,t,!0),i.setUint32(28,t*Ye,!0),i.setUint16(32,Ye,!0),i.setUint16(34,8*Ye,!0),c(36,"data"),i.setUint32(40,o,!0);for(let l=0;l<e.length;l+=1){let p=Math.max(-1,Math.min(1,e[l]));i.setInt16(In+l*Ye,p<0?p*32768:p*32767,!0)}return r}function pr(e){let t=atob(e),o=new Uint8Array(t.length);for(let r=0;r<t.length;r+=1)o[r]=t.charCodeAt(r);return o.buffer}async function dr(e,t=ar){let o;try{let r=await t(pr(e.base64),zt);if(r.sampleRate!==zt)throw new Error("decoder ignored the requested sample rate");o=cr(lr(r.channels),zt)}catch{throw new Q("RECORDING_FAILED",sr)}return{base64:await Mt(new Blob([o],{type:"audio/wav"})),mimeType:"audio/wav"}}async function Ve(e,t,o=dr){return(await e.call(Re).catch(()=>null))?.audioFormat==="wav"?o(t):t}var Tn=globalThis.__ZCC_HOST_REACT__,ee=Tn.Fragment;function n(e,t,o){return Tn.createElement(e,o===void 0?t:{...t,key:o})}var a=n;var ur={system:"Zana Voice",openai:"OpenAI Whisper","google-gemini":"Google Gemini","local-whisper":"Local Whisper"};function kn(e){return ye().showHomeWidget?n(mr,{...e}):null}function mr({pluginId:e,projectId:t,startSession:o=de}){J();let r=pt(e),i=w(r);i.current=r;let c=ct(),[l,p]=g("system"),[d,m]=g("assistant"),[f,b]=g("idle"),[v,S]=g(0),[A,P]=g(null),[N,h]=g(null),I=w(!0),C=w(null),W=w(0),ue=w(ce());M(()=>{I.current=!0;let F=i.current;return F.call(Re).then(O=>{if(!I.current||!O||typeof O!="object")return;let Y=O;Y.sttProvider&&p(Y.sttProvider),Y.llmProvider&&m(Y.llmProvider)}).catch(()=>{}),F.call(ve).then(O=>{!I.current||!O||typeof O!="object"||(ue.current=pe(O))}).catch(()=>{}),()=>{I.current=!1,W.current++,C.current&&(C.current.cancel(),C.current=null)}},[]),M(()=>{if(f!=="recording"){S(0);return}let F=Date.now(),O=setInterval(()=>{S(Math.floor((Date.now()-F)/1e3))},250);return()=>clearInterval(O)},[f]);let Te=k(()=>{if(t&&typeof c?.toProject=="function"){c.toProject(t,{tabId:Oe});return}typeof c?.toPluginPanel=="function"&&c.toPluginPanel(xe)},[c,t]),oe=k(async()=>{let F=C.current;if(C.current=null,!F){b("idle");return}let O=i.current,Y=ue.current,z={enabled:Y.soundCuesEnabled,volume:Y.soundCuesVolume};b("transcribing");try{let te=await F.stop();if(!I.current)return;_("stop",z);let ae=await Ve(O,te),K=await O.call(Le,{audio:ae.base64,mimeType:ae.mimeType});if(!I.current)return;K.ok&&K.status==="ok"?(_("complete",z),typeof c?.toCompose=="function"?(c.toCompose({initialPrompt:K.text,focusPrompt:!0}),P("Draft opened in new thread composer.")):P(K.text)):K.ok&&K.status==="no-speech"?P("No speech detected. Try again."):K.ok||(_("error",z),h(K.message))}catch(te){if(!I.current)return;_("error",z),h(te instanceof Error?te.message:"Quick dictation failed.")}finally{I.current&&b("idle")}},[c]),me=k(async()=>{h(null),P(null);let F=ce();ue.current=F;let O={enabled:F.soundCuesEnabled,volume:F.soundCuesVolume},Y=++W.current;b("starting");try{let z=_("start",O);if(z&&(await z,!I.current||W.current!==Y))return;let te=await(F.micDeviceId!==L?o({deviceId:F.micDeviceId}):o());if(!I.current||W.current!==Y){te.cancel();return}te.onError=ae=>{C.current=null,I.current&&(_("error",O),h(ae.message),b("idle"))},te.onAutoStop=()=>{I.current&&oe()},C.current=te,b("recording")}catch(z){if(!I.current)return;_("error",O),h(z instanceof Error?z.message:"Microphone access denied."),b("idle")}},[o,oe]),q=k(()=>{W.current++,C.current&&(C.current.cancel(),C.current=null),b("idle")},[]),U=()=>{f==="recording"?oe():f==="idle"&&me()},Z=`${Math.floor(v/60)}:${String(v%60).padStart(2,"0")}`,H=ur[l]??l;return a("div",{className:"ps-home-card","data-testid":"pv-home-widget",children:[a("div",{className:"ps-home-card-top",children:[a("div",{className:"ps-home-copy",children:[a("div",{className:"ps-home-heading",children:[n("span",{"aria-hidden":"true",children:"\u{1F399}\uFE0F"}),n("span",{children:"Dictate a new thread or refine in Prompt Studio"})]}),a("div",{className:"ps-home-meta",children:[n("span",{children:H}),n("span",{"aria-hidden":"true",children:"\xB7"}),n("span",{children:d==="none"?"Raw transcript":"AI cleanup on"})]})]}),a("div",{className:"ps-home-actions",children:[n("button",{type:"button",className:`ps-btn ${f==="recording"?"ps-btn-danger":"ps-btn-primary"}`,disabled:f==="starting"||f==="transcribing",onClick:U,children:f==="starting"?"Starting mic\u2026":f==="recording"?`Stop & Compose (${Z})`:f==="transcribing"?"Transcribing\u2026":"Dictate to New Thread"}),f==="starting"||f==="recording"?n("button",{type:"button",className:"ps-btn",onClick:q,children:"Cancel"}):n("button",{type:"button",className:"ps-btn",onClick:Te,children:"Open Prompt Studio"})]})]}),A?n("div",{role:"status",className:"ps-home-status",children:A}):null,N?n("div",{role:"alert",className:"ps-home-error",children:N}):null]})}function Ue(e,t){let o=t.trim();return o?e?/\s$/.test(e)?`${e}${o}`:`${e} ${o}`:o:e}var fr="No speech detected.",jt={phase:"idle",notice:null,error:null};function Nn(e,t){switch(t.type){case"START":return e.phase==="idle"||e.phase==="error"?{phase:"starting",notice:null,error:null}:e;case"STARTED":return e.phase==="starting"?{...e,phase:"recording"}:e;case"STOP":return e.phase==="recording"||e.phase==="starting"?{phase:"processing",notice:null,error:null}:e;case"CANCEL":return e.phase==="recording"||e.phase==="starting"?{...jt}:e;case"SUCCESS":case"NO_SPEECH":return e.phase!=="processing"?e:{phase:"idle",notice:t.type==="NO_SPEECH"?fr:t.notice,error:null};case"CLEAR_NOTICE":return e.notice?{...e,notice:null}:e;case"FAILURE":return{phase:"error",notice:null,error:t.message}}}var br="Prompt Voice returned an unexpected response. Try again.",gr="Dictation failed. Try again.",vr=4e3;function hr(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}function xr(e){return typeof e=="object"&&e!==null&&!("ok"in e&&"status"in e)}async function yr(e,t){let o=await Ve(e,t),r=await e.call(Le,{audio:o.base64,mimeType:o.mimeType});if(!hr(r))throw new Error(br);return r}function Dn(e){return e instanceof Error&&e.message?e.message:gr}function ze(e){return{enabled:e.soundCuesEnabled,volume:e.soundCuesVolume}}function Sr(e,t,o,r=ce()){if(!e.ok){_("error",ze(r)),o({type:"FAILURE",message:e.message});return}if(e.status==="no-speech"){o({type:"NO_SPEECH"});return}_("complete",ze(r)),t.updateText(c=>Ue(c,e.text)),t.focus();let i=e.refineNotice?`Inserted the raw transcript. ${e.refineNotice.message}`:"Added to draft.";o({type:"SUCCESS",notice:i})}function wr(e,t,o,r){return t()?(e.onError=i=>{t()&&r(i)},e.onAutoStop=()=>{t()&&o()},e):(e.cancel(),null)}function Ar(e,t,o,r,i,c){let l=p=>{_("error",ze(c())),i({type:"FAILURE",message:Dn(p)})};return e.then(p=>{if(!p)return null;let d=wr(p,o,r,m=>{t.current=null,l(m)});return d&&(t.current=d),d},p=>(o()&&l(p),null))}function Cr(e,t,o){let r=w(null),i=w(null),c=w(0),l=w(!0),p=k(()=>{c.current++,i.current=null,r.current&&(r.current.cancel(),r.current=null),t({type:"CANCEL"})},[t]);M(()=>(l.current=!0,()=>{l.current=!1,p()}),[p]);let d=k(async()=>{let v=i.current?await i.current:r.current;return r.current=null,v},[]),m=k(async(v,S)=>{let A=++c.current,P=()=>l.current&&c.current===A,N=_("start",ze(S)),I=Ar((async()=>N&&(await N,!P())?null:await(S.micDeviceId!==L?e({deviceId:S.micDeviceId}):e()))(),r,P,v,t,o);i.current=I,await I&&P()&&t({type:"STARTED"}),i.current===I&&(i.current=null)},[t,o,e]),f=k(()=>l.current,[]),b=k(()=>r.current?.getAudioLevel?.()??null,[]);return{start:m,takeSession:d,cancel:p,isMounted:f,getAudioLevel:b}}function _n({startSession:e=de,noticeDurationMs:t=vr}={}){let o=Ze(),r=qe(),i=w(r);i.current=r;let[c,l]=un(Nn,jt),p=w(c.phase);p.current=c.phase;let d=w(null),m=w(ce()),f=k(()=>m.current,[]),{start:b,takeSession:v,cancel:S,isMounted:A,getAudioLevel:P}=Cr(e,l,f),[N,h]=g(null),[I,C]=g(0),[W,ue]=g(!1);M(()=>{let U=!0;return i.current.call(ve).then(Z=>{if(!U||!xr(Z))return;let H=pe(Z);d.current=H,(p.current==="idle"||p.current==="error")&&(m.current=H)}).catch(()=>{}),()=>{U=!1}},[]),M(()=>{if(c.phase!=="recording"){h(null),C(0);return}let U=Date.now(),Z=()=>{h(P()),C(Math.floor((Date.now()-U)/1e3))};Z();let H=setInterval(Z,100);return()=>clearInterval(H)},[P,c.phase]),M(()=>{if(!c.notice)return;let U=setTimeout(()=>{l({type:"CLEAR_NOTICE"})},t);return()=>clearTimeout(U)},[t,c.notice]);let Te=k(()=>{l({type:"CLEAR_NOTICE"})},[]),oe=k(async()=>{let U=m.current;l({type:"STOP"});let Z=await v();if(!(!A()||!Z))try{let H=await Z.stop();if(!A())return;_("stop",ze(U));let je=await yr(r,H);if(!A())return;Sr(je,o,l,U)}catch(H){if(!A())return;_("error",ze(U)),l({type:"FAILURE",message:Dn(H)})}},[o,A,r,v]),me=k(async()=>{let U=Dt()??d.current??ge({});m.current=U,ue(!1),l({type:"START"}),await b(()=>{ue(!0),oe()},U)},[oe,b]),q=k(()=>{c.phase==="recording"||c.phase==="starting"?oe():c.phase!=="processing"&&me()},[me,oe,c.phase]);return{phase:c.phase,error:c.error,notice:c.notice,level:N,seconds:I,autoStopped:W,onClick:q,cancel:S,clearNotice:Te,beginDictation:me,finishDictation:oe}}var Er="Dictation",Pr={idle:"Start dictation",starting:"Stop dictation",recording:"Stop dictation",processing:"Transcribing",error:"Start dictation"},Mn={position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",border:0};function Ln({startSession:e=de}){let t=ye(),o=lt(),r=Cn();return An(t.micVisibility,o?.scope,r?.projectId)?n(Rr,{startSession:e}):null}function Rr({startSession:e=de}){J();let{phase:t,error:o,notice:r,onClick:i,cancel:c,clearNotice:l,level:p,seconds:d,autoStopped:m}=_n({startSession:e}),f=t==="starting"||t==="recording"||t==="processing",b=t==="idle"&&!!r,v=`${Math.floor(d/60)}:${String(d%60).padStart(2,"0")}`;return a("div",{className:`pv-mic pv-dictation-pill pv-phase-${t} ${b?"pv-has-notice":""}`,onClick:b?l:void 0,title:b?"Click to dismiss":void 0,children:[n("button",{type:"button",className:`pv-mic-button pv-mic-${t} ${f?"pv-pill-btn-stop":"pv-idle-icon"}`,"aria-label":Er,"aria-pressed":t==="recording"||t==="starting",title:Pr[t],disabled:t==="processing",onClick:i,style:b?{display:"none"}:void 0,children:t==="idle"||t==="error"?n("svg",{viewBox:"0 0 24 24",width:"16",height:"16","aria-hidden":"true",focusable:"false",children:n("path",{d:"M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5Zm6 9h2v-3h-2v3Z",fill:"currentColor"})}):t==="processing"?n("span",{className:"pv-mic-spinner","aria-hidden":"true"}):n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("rect",{x:"6",y:"6",width:"12",height:"12",rx:"2.5",fill:"currentColor"})})}),b?a("span",{role:"status",className:"pv-notice-content",children:[n("span",{className:"pv-notice-check",children:"\u2713"}),n("span",{className:"pv-pill-status",children:r})]}):null,t==="starting"?a(ee,{children:[a("div",{className:"pv-pill-timer-badge",children:[n("div",{className:"pv-pill-dot pv-pill-dot-starting"}),n("span",{className:"pv-pill-timer-text",children:"0:00"})]}),a("div",{className:"pv-pill-center",role:"status",children:[n("span",{className:"pv-mic-spinner","aria-hidden":"true"}),n("span",{className:"pv-pill-status",children:"Requesting microphone\u2026"})]})]}):null,t==="recording"?a(ee,{children:[a("div",{className:"pv-pill-timer-badge",children:[n("div",{className:"pv-pill-dot"}),a("span",{className:"pv-pill-timer-text",children:[n("span",{className:"pv-sr-only",style:Mn,children:"Recording "}),v]})]}),a("div",{className:"pv-pill-center",role:"status",children:[p===null?n("span",{className:"pv-sr-only",style:Mn,children:"Audio meter unavailable"}):null,n("span",{className:`pv-pill-waveform ${p===null?"animated":""}`,"aria-label":"Microphone audio activity",role:"meter","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":Math.round((p??.3)*100),children:[.4,.7,1,.7,.4].map((S,A)=>n("span",{className:"pv-pill-waveform-bar",style:p!==null?{height:`${Math.max(3,p*S*20)}px`}:void 0},A))}),n("span",{className:"pv-pill-status",children:"Listening..."}),p!==null&&p<.015&&d>=5?n("span",{className:"pv-mic-quiet-warning",children:"No audio detected \u2014 check your microphone."}):null]})]}):null,t==="processing"?a(ee,{children:[n("div",{className:"pv-pill-timer-badge",children:n("span",{className:"pv-pill-timer-text",children:v})}),n("div",{className:"pv-pill-center",role:"status",children:a("span",{className:"pv-pill-status",children:[n("span",{className:"pv-mic-spinner","aria-hidden":"true"})," ",m?"Recording limit reached. ":"","Transcribing and refining\u2026"]})})]}):null,t==="starting"||t==="recording"?n("button",{type:"button",className:"pv-mic-cancel pv-pill-btn-cancel",onClick:c,"aria-label":"Cancel recording",title:"Cancel recording",children:n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("path",{d:"M18 6L6 18M6 6l12 12",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round"})})}):null,t==="error"&&o?n("span",{role:"alert",className:"pv-pill-status pv-mic-error",children:o}):null]})}var Ir=500,Tr=5e3;function $t(e){return e>=1e3**3?`${(e/1e3**3).toFixed(1)} GB`:`${Math.round(e/1e3**2)} MB`}function kr(e){return e.runtime.status==="installing"||e.server.state==="starting"||e.models.some(t=>t.status==="downloading")}function Nr(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}function Dr(e){let[t,o]=g(null),[r,i]=g(null),[c,l]=g(null),p=w(!0),d=k(v=>{if(p.current){if(!Nr(v)){i("Local Whisper returned an unexpected response.");return}v.state&&o(v.state),i(v.ok?null:v.message)}},[]),m=k(()=>e.call(ie.state).then(d,()=>p.current&&i("Could not load Local Whisper status.")),[e,d]),f=k(async(v,S,A)=>{l(v);try{d(await e.call(S,A))}catch{p.current&&i("Local Whisper request failed. Try again.")}finally{p.current&&l(null)}},[e,d]);M(()=>(p.current=!0,m(),()=>{p.current=!1}),[m]);let b=t?kr(t):!1;return M(()=>{let v=setInterval(()=>void m(),b?Ir:Tr);return()=>clearInterval(v)},[b,m]),{state:t,error:r,pending:c,run:f}}function Ft({tone:e}){return n("span",{"aria-hidden":"true",style:{width:9,height:9,borderRadius:"50%",marginTop:4,flex:"none",background:{ok:"var(--ps-success)",warn:"var(--ps-warn)",err:"var(--ps-danger)",busy:"var(--ps-accent)",idle:"var(--ps-text-muted)"}[e]}})}function On({value:e,label:t}){let o=Math.round(e*100);return n("div",{role:"progressbar","aria-label":t,"aria-valuenow":o,"aria-valuemin":0,"aria-valuemax":100,style:{height:5,minWidth:80,background:"var(--ps-bg-hover)",borderRadius:3,overflow:"hidden"},children:n("div",{style:{width:`${o}%`,height:"100%",background:"var(--ps-accent)"}})})}var mt={display:"flex",gap:10,alignItems:"flex-start",padding:"10px 12px",borderRadius:6,border:"1px solid var(--ps-border)"},Se={color:"var(--ps-text-muted)",fontSize:11};function _r(e){let{runtime:t,server:o,activeModelId:r}=e;return t.status==="not-installed"?{tone:"idle",title:"Runtime not installed",detail:`whisper.cpp ${t.version} \xB7 requires ${t.requirements.join(", ")||"no extra components"}`,action:{label:"Install runtime",method:ie.installRuntime,primary:!0}}:t.status==="installing"?{tone:"busy",title:`Installing runtime\u2026 ${Math.round((t.progress??0)*100)}%`,detail:"Verifying the download as it arrives.",action:{label:"Cancel",method:ie.cancelRuntimeInstall}}:o.state==="running"?{tone:"ok",title:"Running",detail:`Model ${o.modelId} \xB7 on this device (127.0.0.1) \xB7 managed by Prompt Voice`,action:{label:"Stop",method:ie.stop}}:o.state==="starting"?{tone:"busy",title:"Starting\u2026",detail:`Loading model ${o.modelId}.`}:o.state==="crashed"?{tone:"err",title:"Stopped unexpectedly",detail:`Exit code ${o.exitCode??"unknown"}. Logs contain no audio or transcripts.`,action:{label:"Restart",method:ie.start,primary:!0}}:r?{tone:"warn",title:"Stopped",detail:"Starts automatically when you dictate.",action:{label:"Start",method:ie.start}}:{tone:"warn",title:"Runtime installed",detail:"Download a model below and choose Use to start."}}function Mr({model:e,state:t,pending:o,onRun:r}){let i=t.activeModelId===e.id,c=t.runtime.status==="installed"&&!i,l=f=>`${f}:${e.id}`,p={modelId:e.id},d=null,m;return e.status==="downloading"?(d=a(ee,{children:[n(On,{value:e.progress??0,label:`Downloading ${e.label}`}),a("span",{style:Se,children:[Math.round((e.progress??0)*100),"% of ",$t(e.sizeBytes)]})]}),m=n("button",{type:"button",className:"ps-btn",onClick:()=>r(l("cancel"),ie.cancelModelDownload,p),children:"Cancel"})):e.status==="available"?m=a("button",{type:"button",className:"ps-btn",disabled:o===l("download"),onClick:()=>r(l("download"),ie.downloadModel,p),children:["Download ",$t(e.sizeBytes)]}):(d=i?n("span",{className:"ps-tag",children:"Active"}):o===l("use")?n("span",{className:"ps-tag",children:"Loading\u2026"}):n("span",{className:"ps-tag",children:"Installed"}),m=a(ee,{children:[c&&n("button",{type:"button",className:"ps-btn",disabled:o!==null,onClick:()=>r(l("use"),ie.selectModel,p),children:"Use"}),n("button",{type:"button",className:"ps-btn ps-btn-danger",disabled:i||o!==null,title:i?"Choose another model before removing this one":void 0,"aria-label":`Remove ${e.label}`,onClick:()=>r(l("remove"),ie.removeModel,p),children:"Remove"})]})),a("tr",{style:i?{background:"color-mix(in srgb, var(--ps-accent) 10%, transparent)"}:void 0,children:[a("td",{style:{padding:"8px 6px"},children:[n("strong",{children:e.label})," ",e.recommended&&n("span",{className:"ps-tag",children:"Recommended"})]}),a("td",{style:{padding:"8px 6px",...Se},children:[$t(e.sizeBytes)," disk",e.memoryEstimate?a(ee,{children:[n("br",{}),e.memoryEstimate," RAM"]}):null]}),n("td",{style:{padding:"8px 6px"},children:n("div",{style:{display:"flex",flexDirection:"column",gap:4},children:d})}),n("td",{style:{padding:"8px 6px",textAlign:"right",whiteSpace:"nowrap"},children:n("div",{style:{display:"inline-flex",gap:6},children:m})})]})}function Lr(e,t){let o=e==="local-whisper";return o&&t==="none"?{offline:!0,text:"Audio and text stay on this device."}:o?{offline:!1,text:"Audio stays on this device. Cleanup sends the transcript to your selected cleanup model."}:{offline:!1,text:"Audio leaves this device for transcription."}}function Vn({rpc:e,sttProvider:t,llmProvider:o,onApplyPreset:r}){let{state:i,error:c,pending:l,run:p}=Dr(e),d=Lr(t,o),m=i?.runtime.status==="installed"&&i.activeModelId!==null;return a("section",{className:"ps-pane",style:{flex:"none"},"aria-labelledby":"ps-lw-title",children:[a("div",{className:"ps-pane-header",children:[n("h2",{id:"ps-lw-title",className:"ps-pane-title",style:{margin:0},children:"Local Whisper"}),n("span",{className:"ps-tag",children:i?i.platform.supported?m?"Ready":"Not set up":"Unavailable":"Loading\u2026"})]}),a("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[n("p",{style:{...Se,margin:0},children:"Transcribe on this device. Audio is never sent anywhere when Local Whisper is the speech provider."}),(c||i?.lastError)&&n("div",{role:"alert",style:{...mt,borderColor:"var(--ps-danger)",color:"var(--ps-danger)",fontSize:12},children:c??i?.lastError?.message}),i&&!i.platform.supported&&a("div",{style:mt,children:[n(Ft,{tone:"err"}),a("div",{children:[n("strong",{children:"Not available on this computer"}),n("div",{style:Se,children:i.platform.message})]})]}),i?.platform.supported&&n(Or,{state:i,pending:l,onRun:p}),i?.platform.supported&&a("div",{children:[a("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"baseline"},children:[n("span",{className:"ps-field-label",children:"Models \xB7 multilingual"}),n("span",{style:Se,children:"Stored in this computer's app data"})]}),a("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:12},children:[n("thead",{children:n("tr",{children:["Model","Size","Status",""].map(f=>n("th",{style:{textAlign:"left",...Se,fontWeight:600,padding:"4px 6px"},children:f},f))})}),n("tbody",{children:i.models.map(f=>n(Mr,{model:f,state:i,pending:l,onRun:p},f.id))})]})]}),a("div",{style:mt,children:[n(Ft,{tone:d.offline?"ok":"warn"}),a("div",{style:{flex:1},children:[n("strong",{children:d.offline?"Fully offline":"Not fully offline"}),n("div",{style:Se,children:d.text})]}),!d.offline&&n("button",{type:"button",className:"ps-btn",onClick:()=>r({sttProvider:"local-whisper",llmProvider:"none"}),children:"Use offline preset"})]})]})]})}function Or({state:e,pending:t,onRun:o}){let r=_r(e);return a("div",{style:mt,"aria-live":"polite",children:[n(Ft,{tone:r.tone}),a("div",{style:{flex:1,minWidth:0},children:[n("strong",{children:r.title}),n("div",{style:Se,children:r.detail}),e.runtime.status==="installing"&&n("div",{style:{marginTop:6},children:n(On,{value:e.runtime.progress??0,label:"Installing runtime"})})]}),r.action&&n("button",{type:"button",className:r.action.primary?"ps-btn ps-btn-primary":"ps-btn",disabled:t==="runtime",onClick:()=>o("runtime",r.action.method),children:r.action.label})]})}function ft({pluginId:e}){J();let t=ye(),o=wn(t),[r,i]=g(!1),[c,l]=g(null),[p,d]=g(null),m=async f=>{i(!0),d(null),l("Saving\u2026");try{await dt(e,f),l("Saved")}catch(b){l(null),d(b instanceof Error?b.message:"Could not update visibility settings.")}finally{i(!1)}};return a("section",{className:"ps-vis-section","aria-labelledby":"ps-visibility-heading",children:[a("div",{className:"ps-vis-header",children:[a("div",{children:[n("h3",{id:"ps-visibility-heading",className:"ps-vis-title",children:"Where Prompt Voice Appears"}),n("p",{className:"ps-vis-subtitle",children:"Control whether Prompt Voice surfaces on the main Home screen, inside Projects, and in thread composers."})]}),n("div",{className:"ps-vis-status-slot",children:c?n("span",{role:"status",className:"ps-vis-status",children:c}):null})]}),p?n("div",{role:"alert",className:"ps-vis-error",children:p}):null,n("div",{className:"ps-vis-presets",role:"group","aria-label":"Surface visibility presets",children:Ot.map(f=>{let b=o===f.id;return a("button",{type:"button",className:`ps-vis-preset-card ${b?"active":""}`,"aria-pressed":b,disabled:r,onClick:()=>void m(f.settings),children:[n("span",{className:"ps-vis-preset-label",children:f.label}),n("span",{className:"ps-vis-preset-desc",children:f.description})]},f.id)})}),a("div",{className:"ps-vis-controls",children:[a("div",{className:"ps-toggle-card",children:[a("div",{className:"ps-toggle-copy",children:[n("span",{id:"ps-vis-home-label",className:"ps-toggle-title",children:"Main Home screen widget"}),n("small",{className:"ps-vis-help",children:"Show a quick-dictate & Prompt Studio card on Zana\u2019s main Home screen."})]}),n("button",{type:"button",className:"ps-switch",role:"switch","aria-checked":t.showHomeWidget,"aria-labelledby":"ps-vis-home-label",disabled:r,onClick:()=>void m({showHomeWidget:!t.showHomeWidget})})]}),a("div",{className:"ps-toggle-card",children:[a("div",{className:"ps-toggle-copy",children:[n("span",{id:"ps-vis-projects-label",className:"ps-toggle-title",children:"Prompt Studio tab in projects"}),n("small",{className:"ps-vis-help",children:"Display a dedicated Prompt Studio tab inside each project with project-scoped drafts."})]}),n("button",{type:"button",className:"ps-switch",role:"switch","aria-checked":t.showInProjects,"aria-labelledby":"ps-vis-projects-label",disabled:r,onClick:()=>void m({showInProjects:!t.showInProjects})})]}),a("div",{className:"ps-toggle-card ps-vis-select-row",children:[a("div",{className:"ps-toggle-copy",children:[n("label",{htmlFor:"ps-vis-mic-select",className:"ps-toggle-title",children:"Composer mic button placement"}),n("small",{className:"ps-vis-help",children:"Choose which chat composers display the voice dictation mic pill."})]}),n("select",{id:"ps-vis-mic-select","aria-label":"Composer mic button placement",className:"ps-select ps-vis-select",value:t.micVisibility,disabled:r,onChange:f=>void m({micVisibility:f.target.value}),children:Lt.map(f=>n("option",{value:f,children:Sn[f]},f))})]})]}),a("p",{className:"ps-vis-note",children:["Tip: You can hide or reorder the global ",n("strong",{children:"Prompt Studio"})," item in Zana\u2019s left sidebar using Zana\u2019s sidebar customize menu."]})]})}function Ht(e){if(typeof e!="string")return[];let t=new Set,o=/[,\n]/;for(let r of e.split(o)){let i=r.trim().slice(0,80);if(i&&t.add(i),t.size>=200)break}return[...t]}function Un(e,t){let o=Ht(t);if(o.length===0)return[...e];let r=new Set(e),i=[...e];for(let c of o){if(i.length>=200)break;r.has(c)||(r.add(c),i.push(c))}return i}function Bt(e){return e.join(`
`)}var Wt=[{code:"auto",label:"Detect automatically"},{code:"af",label:"Afrikaans"},{code:"ar",label:"Arabic"},{code:"hy",label:"Armenian"},{code:"az",label:"Azerbaijani"},{code:"eu",label:"Basque"},{code:"be",label:"Belarusian"},{code:"bn",label:"Bengali"},{code:"bs",label:"Bosnian"},{code:"bg",label:"Bulgarian"},{code:"ca",label:"Catalan"},{code:"zh",label:"Chinese"},{code:"hr",label:"Croatian"},{code:"cs",label:"Czech"},{code:"da",label:"Danish"},{code:"nl",label:"Dutch"},{code:"en",label:"English"},{code:"et",label:"Estonian"},{code:"fi",label:"Finnish"},{code:"fr",label:"French"},{code:"gl",label:"Galician"},{code:"ka",label:"Georgian"},{code:"de",label:"German"},{code:"el",label:"Greek"},{code:"gu",label:"Gujarati"},{code:"he",label:"Hebrew"},{code:"hi",label:"Hindi"},{code:"hu",label:"Hungarian"},{code:"is",label:"Icelandic"},{code:"id",label:"Indonesian"},{code:"ga",label:"Irish"},{code:"it",label:"Italian"},{code:"ja",label:"Japanese"},{code:"kn",label:"Kannada"},{code:"kk",label:"Kazakh"},{code:"ko",label:"Korean"},{code:"lv",label:"Latvian"},{code:"lt",label:"Lithuanian"},{code:"mk",label:"Macedonian"},{code:"ms",label:"Malay"},{code:"ml",label:"Malayalam"},{code:"mt",label:"Maltese"},{code:"mr",label:"Marathi"},{code:"ne",label:"Nepali"},{code:"no",label:"Norwegian"},{code:"fa",label:"Persian"},{code:"pl",label:"Polish"},{code:"pt",label:"Portuguese"},{code:"pa",label:"Punjabi"},{code:"ro",label:"Romanian"},{code:"ru",label:"Russian"},{code:"sr",label:"Serbian"},{code:"sk",label:"Slovak"},{code:"sl",label:"Slovenian"},{code:"es",label:"Spanish"},{code:"sw",label:"Swahili"},{code:"sv",label:"Swedish"},{code:"tl",label:"Tagalog"},{code:"ta",label:"Tamil"},{code:"te",label:"Telugu"},{code:"th",label:"Thai"},{code:"tr",label:"Turkish"},{code:"uk",label:"Ukrainian"},{code:"ur",label:"Urdu"},{code:"vi",label:"Vietnamese"},{code:"cy",label:"Welsh"}];function jn(){if(!(typeof navigator>"u"))return navigator.mediaDevices}function Vr(e){return e.replace(/^default\s*[-–:]\s*/i,"").trim()}function $n(e){let t=e instanceof Error?e.name:"";return t==="NotAllowedError"||t==="SecurityError"}function zn(e){let t=e.filter(p=>p.kind==="audioinput"),o=t.some(p=>!!p.label?.trim()),r=null,i=[],c=new Set,l=1;for(let p of t){let d=p.label?.trim()??"";if(p.deviceId===L){d&&(r=Vr(d)||d);continue}!p.deviceId||c.has(p.deviceId)||(c.add(p.deviceId),i.push({deviceId:p.deviceId,label:d||`Microphone ${l}`,isDefault:!1}),l++)}return{devices:i,defaultDeviceLabel:r,labelsAvailable:o}}async function Ur(e){if(!e.getUserMedia||!e.enumerateDevices)return{ok:!1,permissionDenied:!1};try{return(await e.getUserMedia({audio:!0})).getTracks().forEach(o=>o.stop()),{ok:!0,rawDevices:await e.enumerateDevices()}}catch(t){return $n(t)?{ok:!1,permissionDenied:!0}:(console.warn("Prompt Voice failed to refresh audio input devices",t),{ok:!1,permissionDenied:!1})}}async function Fn(e={}){let t=e.mediaDevices??jn();if(!t?.enumerateDevices)return{devices:[],defaultDeviceLabel:null,labelsAvailable:!1,permissionDenied:!1,supported:!1,error:null};let o;try{o=await t.enumerateDevices()}catch(c){return console.warn("Prompt Voice failed to enumerate audio input devices",c),{devices:[],defaultDeviceLabel:null,labelsAvailable:!1,permissionDenied:$n(c),supported:!0,error:"Could not list microphones. Using System default."}}let r=zn(o),i=!1;if(e.requestPermissionIfUnlabeled&&!r.labelsAvailable){let c=await Ur(t);c.ok?r=zn(c.rawDevices):i=c.permissionDenied}return{...r,permissionDenied:i,supported:!0,error:null}}function Hn(e,t=jn()){if(!t?.addEventListener||!t?.removeEventListener)return()=>{};let o=()=>e();return t.addEventListener("devicechange",o),()=>t.removeEventListener?.("devicechange",o)}function Bn(){let[e,t]=g([]),[o,r]=g(null),[i,c]=g(!0),[l,p]=g(!1),[d,m]=g(null),[f,b]=g(!1),v=w(!0),S=w(0),A=k(async(P=!1)=>{let N=++S.current;v.current&&b(!0);try{let h=await Fn({requestPermissionIfUnlabeled:P});if(!v.current||S.current!==N)return;t(h.devices),r(h.defaultDeviceLabel),c(h.labelsAvailable),p(h.permissionDenied),m(h.error)}catch(h){if(console.warn("Prompt Voice audio device lookup failed",h),!v.current||S.current!==N)return;t([]),m("Could not list microphones. Using System default.")}finally{v.current&&S.current===N&&b(!1)}},[]);return M(()=>{v.current=!0,A(!1);let P=Hn(()=>{A(!1)});return()=>{v.current=!1,S.current++,P()}},[A]),{devices:e,defaultDeviceLabel:o,labelsAvailable:i,permissionDenied:l,error:d,isRefreshing:f,refresh:A}}var $r={"Voice & transcription":[{key:"sttProvider",label:"Speech-to-text provider",options:["system","google-gemini","openai","local-whisper"]},{key:"inputLanguage",label:"Input language",options:Wt.map(e=>e.code),help:"Spoken language for transcription, or Detect automatically."},{key:"dictionary",label:"Personal dictionary",help:"Add specific names, acronyms, or technical terms to guarantee accurate spelling."}],"Prompt Voice":[{key:"tone",label:"Cleanup tone",options:["conversational","formal","casual","technical","custom"]},{key:"customPrompt",label:"Custom cleanup instructions",multiline:!0}],Connections:[]},Gt={sttProvider:"system",inputLanguage:"auto",tone:"conversational"},Fr={...Object.fromEntries(Wt.map(e=>[e.code,e.label])),system:"Zana voice",none:"Off",assistant:"Zana assistant",openai:"OpenAI",anthropic:"Anthropic",google:"Google AI","google-gemini":"Google Gemini","local-whisper":"Local Whisper (on this device)"};function Hr(e,t,o){return e.error?{warn:!0,text:e.error}:e.permissionDenied?{warn:!0,text:"Microphone permission denied. Allow microphone access in system settings to see device names."}:t.micDeviceId!==L&&!o?{warn:!0,text:"Selected microphone is currently disconnected. Recording will fall back to System default until reconnected."}:!e.labelsAvailable&&e.devices.length>0?{warn:!1,text:"Device names are hidden until microphone access is granted. Click Refresh to detect names."}:t.micDeviceId===L?{warn:!1,text:"Uses your OS default input device. Saved selection applies to Prompt Studio and Composer dictation."}:{warn:!1,text:`Using ${o?.label??(t.micLabel||t.micDeviceId)}. Saved until you choose another mic.`}}function Br({prefs:e,audio:t,onSelect:o}){let r=t.devices.find(d=>d.deviceId===e.micDeviceId),i=e.micDeviceId!==L&&!r,c=Hr(t,e,r),l=t.defaultDeviceLabel?`System default (${t.defaultDeviceLabel})`:"System default",p=d=>{if(d===L){o(L,"");return}let m=t.devices.find(f=>f.deviceId===d);o(d,m?.label??e.micLabel)};return a("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-mic-select",className:"ps-field-label",children:"Input microphone"}),a("div",{className:"ps-mic-row",children:[a("select",{id:"ps-mic-select","aria-label":"Input microphone",className:"ps-select",value:e.micDeviceId,onChange:d=>p(d.target.value),children:[n("option",{value:L,children:l}),t.devices.map(d=>n("option",{value:d.deviceId,children:d.label},d.deviceId)),i&&n("option",{value:e.micDeviceId,children:`${e.micLabel||e.micDeviceId} (Disconnected)`})]}),n("button",{type:"button",className:"ps-btn",onClick:()=>void t.refresh(!0),disabled:t.isRefreshing,"aria-label":"Refresh microphones",title:"Refresh connected audio input devices",children:t.isRefreshing?"Refreshing\u2026":"\u21BB Refresh"})]}),a("div",{className:"ps-audio-status",role:t.error?"alert":void 0,children:[n("span",{className:`ps-audio-dot ${c.warn?"warn":""}`,"aria-hidden":"true"}),n("span",{children:c.text})]})]})}function Wr({prefs:e,onToggle:t,onVolumeChange:o}){let r=()=>{e.soundCuesEnabled&&_("start",{enabled:!0,volume:e.soundCuesVolume})};return a(ee,{children:[a("div",{className:"ps-toggle-card",children:[a("div",{className:"ps-toggle-copy",children:[n("span",{id:"ps-sound-cues-label",className:"ps-toggle-title",children:"Sound cues & chimes"}),n("small",{style:{color:"var(--ps-text-muted)"},children:"Play a subtle chime when dictation starts, finishes, or encounters an error."})]}),n("button",{type:"button",className:"ps-switch",role:"switch","aria-checked":e.soundCuesEnabled,"aria-labelledby":"ps-sound-cues-label",onClick:t})]}),a("div",{className:`ps-volume-card ${e.soundCuesEnabled?"":"disabled"}`,children:[a("div",{className:"ps-volume-header",children:[n("label",{htmlFor:"ps-chime-volume",className:"ps-field-label",children:"Chime volume"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 9px",fontSize:11},disabled:!e.soundCuesEnabled,onClick:r,children:"Test chime"})]}),a("div",{className:"ps-volume-controls",children:[n("input",{id:"ps-chime-volume",type:"range",className:"ps-volume-slider","aria-label":"Chime volume",min:0,max:100,step:5,value:e.soundCuesVolume,disabled:!e.soundCuesEnabled,onChange:i=>o(Number(i.target.value)),onPointerUp:r,onKeyUp:i=>{["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(i.key)&&r()}}),a("span",{className:"ps-volume-pct",children:[e.soundCuesVolume,"%"]})]})]})]})}function Gr({values:e,onSave:t}){let o=G(()=>ge(e),[e]),r=Bn();return a("section",{className:"ps-pane",style:{flex:"none"},"aria-labelledby":"ps-audio-feedback-title",children:[a("div",{className:"ps-pane-header",children:[n("h2",{id:"ps-audio-feedback-title",className:"ps-pane-title",style:{margin:0},children:"Audio & Feedback"}),n("button",{type:"button",className:"ps-btn",onClick:()=>t({micDeviceId:L,micLabel:"",soundCuesEnabled:String(!0),soundCuesVolume:String(75)}),children:"Reset"})]}),a("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[n(Br,{prefs:o,audio:r,onSelect:(l,p)=>t({micDeviceId:l,micLabel:p})}),n(Wr,{prefs:o,onToggle:()=>{let l=!o.soundCuesEnabled;t({soundCuesEnabled:String(l)}),l&&_("start",{enabled:!0,volume:o.soundCuesVolume})},onVolumeChange:l=>t({soundCuesVolume:String(l)})})]})]})}function qr({terms:e,atLimit:t,onRemove:o,onClearAll:r}){return a(ee,{children:[n("div",{className:"ps-dict-well",children:e.length>0?n("ul",{className:"ps-dict-pills","aria-label":"Dictionary terms",children:e.map(i=>a("li",{className:"ps-dict-pill",children:[n("span",{className:"ps-dict-pill-text",children:i}),n("button",{type:"button",className:"ps-dict-pill-remove",onClick:()=>o(i),"aria-label":`Remove ${i}`,title:`Remove ${i}`,children:"\xD7"})]},i))}):n("span",{className:"ps-dict-empty",children:"No terms added yet. Type a term above or paste a comma-separated list."})}),a("div",{className:"ps-dict-footer",children:[a("span",{className:"ps-dict-count",children:[e.length===1?"1 term active":`${e.length} terms active`,t?` (max ${200})`:""]}),n("button",{type:"button",className:"ps-btn ps-dict-clear-btn",onClick:r,disabled:e.length===0,children:"Clear all"})]})]})}function Zr({label:e,help:t,value:o,resetSignal:r,onChange:i}){let[c,l]=g(""),p=G(()=>Ht(o),[o]),d=p.length>=200;M(()=>{r>0&&l("")},[r]);let m=()=>{let b=c.trim();if(!b||d)return;let v=Un(p,b);l(""),v.length!==p.length&&i(Bt(v))};return a("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-dictionary-input",className:"ps-field-label",children:e}),t&&n("small",{style:{color:"var(--ps-text-muted)"},children:t}),a("div",{className:"ps-dict-container",children:[a("div",{className:"ps-dict-input-row",children:[n("input",{id:"ps-dictionary-input",type:"text",className:"ps-dict-input",value:c,onChange:b=>l(b.target.value),onKeyDown:b=>{b.key==="Enter"&&(b.preventDefault(),m())},onPaste:b=>{let v=b.clipboardData?.getData("text");if(!v||!/[\r\n]/.test(v))return;b.preventDefault();let S=b.currentTarget.selectionStart??c.length,A=b.currentTarget.selectionEnd??c.length;l(c.slice(0,S)+v.replace(/[\r\n]+/g,", ")+c.slice(A))},placeholder:"Type a term and press Enter (or paste comma-separated)...",disabled:d}),n("button",{type:"button",className:"ps-btn ps-btn-primary ps-dict-add-btn",onClick:m,disabled:!c.trim()||d,children:"+ Add"})]}),n(qr,{terms:p,atLimit:d,onRemove:b=>i(Bt(p.filter(v=>v!==b))),onClearAll:()=>{l(""),i("")}})]})]})}function Yr({field:e,values:t,resetSignal:o,onSave:r}){if(e.key==="dictionary")return n(Zr,{label:e.label,help:e.help,value:t.dictionary??"",resetSignal:o,onChange:l=>r({dictionary:l})});let i=t[e.key]??Gt[e.key]??"",c=e.options&&e.key==="inputLanguage"&&i&&!e.options.includes(i)?[...e.options,i]:e.options;return a("label",{className:"ps-field-group",children:[n("span",{className:"ps-field-label",children:e.label}),c?n("select",{className:"ps-select",value:i,onChange:l=>r({[e.key]:l.target.value}),children:c.map(l=>n("option",{value:l,children:Fr[l]??l},l))}):e.multiline?n("textarea",{className:"ps-custom-prompt-input",value:t[e.key]??"",onChange:l=>r({[e.key]:l.target.value})}):n("input",{type:e.secret?"password":"text",className:"ps-select",value:t[e.key]??"",onChange:l=>r({[e.key]:l.target.value}),placeholder:e.secret?"Enter API key\u2026":void 0}),e.help&&n("small",{style:{color:"var(--ps-text-muted)"},children:e.help})]})}function Gn({rpc:e,onBack:t,pluginId:o}){J();let[r,i]=g({}),[c,l]=g("Loading\u2026"),[p,d]=g(null),[m,f]=g(0),b=w(0),v=w({}),S=w(e);S.current=e,M(()=>{let P=!0;return S.current.call(ve).then(N=>{if(!P)return;let h=N||{};v.current=h,i(h),pe(h),l("Saved")}).catch(()=>{P&&l("Could not load settings")}),()=>{P=!1}},[]);let A=P=>{let N=++b.current,h=v.current={...v.current,...P};i(h),pe(h),l("Saving\u2026"),S.current.call(he,h).then(()=>{N===b.current&&(d(null),l("Saved"))}).catch(()=>{N===b.current&&(d(h),l("Could not save settings."))})};return n("div",{className:"ps-workspace",children:n("main",{className:"ps-editor-canvas",style:{overflowY:"auto"},children:a("div",{style:{width:"100%",maxWidth:760,margin:"0 auto",display:"flex",flexDirection:"column",gap:12},children:[a("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12},children:[a("div",{children:[n("h1",{style:{fontSize:18,margin:"4px 0"},children:"Settings"}),n("span",{style:{color:"var(--ps-text-muted)",fontSize:12},children:"Configure voice and cleanup defaults"})]}),n("button",{className:"ps-btn",onClick:t,children:"\u2190 Back to Studio"})]}),a("div",{style:{color:"var(--ps-text-muted)",fontSize:11},children:[n("span",{role:"status",children:c}),p&&n("button",{className:"ps-btn",onClick:()=>A(p),children:"Retry"})]}),n(Gr,{values:r,onSave:A}),Object.entries($r).map(([P,N])=>a(dn.Fragment,{children:[a("section",{className:"ps-pane",style:{flex:"none"},children:[a("div",{className:"ps-pane-header",children:[n("h2",{className:"ps-pane-title",style:{margin:0},children:P}),P!=="Connections"&&n("button",{className:"ps-btn",onClick:()=>{P==="Voice & transcription"&&f(h=>h+1),A(Object.fromEntries(N.map(h=>[h.key,Gt[h.key]??""])))},children:"Reset"})]}),a("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[P==="Connections"&&n("p",{children:"Manage API keys in Zana\u2019s Prompt Voice plugin settings."}),N.filter(h=>!(h.key==="customPrompt"&&r.tone!=="custom")).map(h=>n(Yr,{field:h,values:r,resetSignal:m,onSave:A},h.key))]})]}),P==="Voice & transcription"&&n(Vn,{rpc:e,sttProvider:r.sttProvider??Gt.sttProvider,llmProvider:r.llmProvider,onApplyPreset:A})]},P)),o?n("section",{className:"ps-pane",style:{flex:"none",padding:14},children:n(ft,{pluginId:o})}):null]})})})}function qn(e){return e?e.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]+/gu)||[]:[]}var Zn=1200;function Yn(e,t){if(!e&&!t)return[];if(e===t)return[{type:"unchanged",text:e}];if(!e)return[{type:"added",text:t}];if(!t)return[{type:"removed",text:e}];let o=qn(e),r=qn(t),i=o.length,c=r.length;if(i>Zn||c>Zn)return[{type:"removed",text:e},{type:"added",text:t}];let l=c+1,p=new Uint32Array((i+1)*l);for(let v=1;v<=i;v++){let S=v*l,A=(v-1)*l,P=o[v-1];for(let N=1;N<=c;N++)if(P===r[N-1])p[S+N]=p[A+(N-1)]+1;else{let h=p[S+(N-1)],I=p[A+N];p[S+N]=h>I?h:I}}let d=[],m=i,f=c;for(;m>0||f>0;){let v=m*l,S=(m-1)*l;m>0&&f>0&&o[m-1]===r[f-1]?(d.push({type:"unchanged",text:o[m-1]}),m--,f--):f>0&&(m===0||p[v+(f-1)]>=p[S+f])?(d.push({type:"added",text:r[f-1]}),f--):m>0&&(f===0||p[v+(f-1)]<p[S+f])&&(d.push({type:"removed",text:o[m-1]}),m--)}d.reverse();let b=[];for(let v of d)b.length>0&&b[b.length-1].type===v.type?b[b.length-1].text+=v.text:b.push({...v});return b}var Zt=`
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
`;async function qt(e){if(!e)return!1;if(typeof navigator<"u"&&navigator.clipboard&&typeof navigator.clipboard.writeText=="function")try{return await navigator.clipboard.writeText(e),!0}catch{}if(typeof document<"u")try{let t=document.createElement("textarea");t.value=e,t.setAttribute("readonly",""),t.style.position="fixed",t.style.top="-9999px",t.style.left="-9999px",t.style.opacity="0",document.body.appendChild(t),t.focus(),t.select();let o=document.execCommand("copy");if(document.body.removeChild(t),o)return!0}catch{}return!1}var Kn="zcc:prompt-voice:studio-draft:v1";function Kr(e){return e?`${Kn}:project:${e}`:Kn}var Xn=[{id:"polish",title:"Clean up writing",icon:"\u2728",desc:"Fix punctuation, grammar, and stuttering.",prompt:"Clean up disfluencies, typos, and improve sentence flow without altering intent.",tone:"technical"},{id:"executive",title:"Summarize",icon:"\u26A1",desc:"Condense into punchy bullet points.",prompt:"Summarize the core request into crisp, high-level executive bullet points.",tone:"formal"},{id:"spec",title:"Create a technical spec",icon:"\u{1F4D0}",desc:"Format with Goals, Context, Steps.",prompt:"Transform into a structured technical spec with ## Goal, ## Architecture, and ## Implementation Steps.",tone:"technical"},{id:"chat",title:"Make it conversational",icon:"\u{1F4AC}",desc:"Natural, conversational tone.",prompt:"Rephrase in a warm, polite, and helpful conversational tone.",tone:"conversational"}],Xr={system:"Host STT",openai:"OpenAI","google-gemini":"Google Gemini","local-whisper":"Local Whisper"};function Jn(e){return e==="openai"||e==="google-gemini"}var Jr=[{id:"google-gemini",label:"Google Gemini"},{id:"local-whisper",label:"Local Whisper (on this device)"},{id:"openai",label:"OpenAI (Whisper)"},{id:"system",label:"System (Zana Voice)"}],Qr=[{id:"assistant",displayName:"Zana Assistant",models:[{id:"assistant",key:"assistant",label:"Default Assistant (Host Agent)",providerId:"assistant"}]}],Qn=[1500,3e3];function eo({focusWindow:e,bringBack:t}){return J(),a("div",{className:"ps-container","data-testid":"ps-detached-placeholder",children:[n("style",{children:Zt}),n("div",{className:"ps-empty-state",children:a("div",{className:"ps-empty-card",children:[n("span",{style:{fontSize:22},"aria-hidden":"true",children:"\u{1F399}\uFE0F"}),n("div",{style:{fontSize:14,fontWeight:600},children:"Prompt Studio is open in its own window"}),n("div",{style:{fontSize:12,color:"var(--ps-text-muted)"},children:"Focus the floating window or bring Prompt Studio back to this project tab."}),a("div",{style:{display:"flex",gap:8,marginTop:4},children:[n("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:e,children:"Focus Window"}),n("button",{type:"button",className:"ps-btn",onClick:t,children:"Bring Back"})]})]})})]})}function Yt({pluginId:e,projectId:t,headerActions:o,startSession:r=de}){J();let[i,c]=g(!1),l=pt(e),p=En(),d=lt(),m=ct(),f=ye(),b=d?.providerId,v=d?.familyId,S=Kr(t),A=w(!1),[P,N]=g(null),[h,I]=g(""),[C,W]=g(""),[ue,Te]=g(!1),[oe,me]=g(!1),[q,U]=g(!1),[Z,H]=g(null),[je,F]=g(!1),[O,Y]=g(null),[z,te]=g(null),[ae,K]=g(!0),[Kt,bt]=g(null),[ke,Ne]=g("assistant"),[$e,De]=g("assistant"),[we,to]=g(null),[ei,Ke]=g(null),[Fe,Xt]=g(!0),[Jt,no]=g(null),[He,gt]=g(!1),[le,Xe]=g("polish"),[Je,Qt]=g(""),[Ae,en]=g(!1),[tn,R]=g(null),[B,Be]=g("system"),[vt,Qe]=g(""),[ht,nn]=g(!0),[xt,Ce]=g(null),[fe,yt]=g(!1),[oo,on]=g(0),[ro,St]=g(null),[rn,io]=g(()=>ce()),sn=w(rn);sn.current=rn;let be=w(null),_e=w(null),Me=w(null),an=w(null);M(()=>{try{let s=localStorage.getItem(S);if(s){let u=JSON.parse(s);I(typeof u.inputText=="string"?u.inputText:""),W(typeof u.outputText=="string"?u.outputText:""),Ne(u.selectedProviderId||"assistant"),De(u.selectedModelId||"assistant"),A.current=u.userManuallySelected===!0,Be(u.sttProvider||"system"),Qe(u.sttModel||"")}else I(""),W(""),Ne("assistant"),De("assistant"),Be("system"),Qe(""),A.current=!1}catch{}N(S)},[S]);let We=w(l);We.current=l;let ne=w(!0),wt=w(0),et=w(0),tt=w(0),nt=w(null),ot=k(s=>{s&&(s.llmProvider&&(Ke(s.llmProvider),Xt(s.llmProvider!=="none")),s.sttProvider&&Be(s.sttProvider),typeof s.sttKeyConfigured=="boolean"&&nn(s.sttKeyConfigured))},[]),At=k(()=>{We.current.call(Re).then(s=>{ne.current&&ot(s)}).catch(()=>{})},[ot]);M(()=>{let s=!0;return We.current.call(Re).then(u=>{s&&ot(u)}).catch(()=>{}),()=>{s=!1}},[ot]);let rt=k(s=>{io(u=>u.micDeviceId===s.micDeviceId&&u.micLabel===s.micLabel&&u.soundCuesEnabled===s.soundCuesEnabled&&u.soundCuesVolume===s.soundCuesVolume?u:s)},[]),it=k(()=>{let s=++wt.current;We.current.call(ve).then(u=>{if(!ne.current||wt.current!==s)return;let y=u||{};typeof y.sttProvider=="string"&&y.sttProvider&&Be(y.sttProvider),typeof y.sttModel=="string"&&y.sttModel&&Qe(y.sttModel),typeof y.llmProvider=="string"&&y.llmProvider&&y.llmProvider!=="none"&&to({providerId:y.llmProvider,modelId:typeof y.llmModel=="string"&&y.llmModel?y.llmModel:void 0}),u&&typeof u=="object"&&rt(pe(y))}).catch(()=>{})},[rt]),Ge=k(()=>{nt.current&&(clearTimeout(nt.current),nt.current=null)},[]),st=k((s={})=>{let u=s.refresh===!0,y=s.retryAttempt??0;Ge();let E=++tt.current;K(!0),(u||y===0)&&bt(null);let x=()=>{if(!ne.current||y>=Qn.length)return;let D=Qn[y];nt.current=setTimeout(()=>{ne.current&&st({retryAttempt:y+1})},D)};We.current.call(fn,u?{refresh:!0}:void 0).then(D=>{if(!ne.current||tt.current!==E)return;let V=Array.isArray(D)?D:[];te(V),K(!1),!V.some(se=>se.providerId!=="assistant"&&Array.isArray(se.models)&&se.models.length>0)&&!u&&x()}).catch(()=>{!ne.current||tt.current!==E||(K(!1),bt("Could not load Composer models. Using Zana Assistant."),x())})},[Ge]);Ut(gn,s=>{!ne.current||!Array.isArray(s)||(te(s),K(!1),bt(null),Ge())}),M(()=>(ne.current=!0,it(),st(),()=>{ne.current=!1,wt.current++,et.current++,tt.current++,Ge()}),[Ge,st,it]);let so=G(()=>(z??[]).some(s=>s.providerId!=="assistant"&&Array.isArray(s.models)&&s.models.length>0),[z]),re=G(()=>{let s=(x,D)=>[...x].sort((V,X)=>D(V).localeCompare(D(X),void 0,{sensitivity:"base",numeric:!0})),u=(z??[]).filter(x=>Array.isArray(x.models)&&x.models.length>0);if(u.length===0){let x=Qr.map(D=>{let V=!!(b&&D.id.toLowerCase()===b.toLowerCase()||v&&D.id.toLowerCase().includes(v.toLowerCase())),X=s(D.models,se=>se.label||se.id).map(se=>({...se,isComposerMatch:V}));return{...D,isComposerMatch:V,models:X}});return s(x,D=>D.displayName||D.id)}let y={"assistant:assistant":"assistant"},E=u.map(x=>{let D=!!(b&&x.providerId.toLowerCase()===b.toLowerCase()||v&&x.providerId.toLowerCase().includes(v.toLowerCase())),V=s(x.models,X=>X.label||X.id).map(X=>{let se=`${x.providerId}:${X.id}`,To=y[se]??X.id;return{id:X.id,key:To,label:X.label||X.id,providerId:x.providerId,isComposerMatch:D}});return{id:x.providerId,displayName:x.displayName||x.providerId,isComposerMatch:D,error:x.error??null,models:V}});return s(E,x=>x.displayName||x.id)},[z,b,v]),j=G(()=>re.find(s=>s.id===ke)??re[0],[re,ke]),Ee=G(()=>j?.models??[],[j]),$=G(()=>Ee.find(u=>u.id===$e||u.key===$e)??Ee[0],[Ee,$e]);M(()=>{if(z===null||A.current||re.length===0)return;let s=re.find(u=>u.isComposerMatch&&u.models.length>0)??re.find(u=>u.isComposerMatch);if(s){Ne(s.id),s.models.length>0&&De(u=>s.models.some(E=>E.id===u||E.key===u)?u:s.models[0].key||s.models[0].id);return}if(we&&we.providerId!=="assistant"){let u=re.find(y=>y.id===we.providerId&&y.models.length>0);if(u){Ne(u.id);let E=(we.modelId?u.models.find(x=>x.id===we.modelId||x.key===we.modelId):void 0)??u.models[0];E&&De(E.key||E.id)}}},[z,re,we]),M(()=>{if(P===S)try{localStorage.setItem(S,JSON.stringify({inputText:h,outputText:C,selectedProviderId:ke,selectedModelId:$e,userManuallySelected:A.current,sttProvider:B,sttModel:vt}))}catch{}},[P,S,h,C,ke,$e,B,vt]);let ao=s=>{Xt(s);let u=s?j?.id??"assistant":"none",y=s?$?.id??"assistant":"";Ke(u),l.call(he,{llmProvider:u,llmModel:y}).catch(()=>{R("Could not update cleanup setting.")})},Ct=s=>{Be(s),Ce(null),l.call(he,{sttProvider:s}).then(()=>At()).catch(()=>{R("Could not update speech provider setting.")})},lo=s=>{Qe(s),l.call(he,{sttModel:s}).catch(()=>{})},co=s=>{A.current=!0,Ne(s);let u=re.find(E=>E.id===s),y="";if(u&&u.models.length>0){let E=u.models[0].key||u.models[0].id;y=u.models[0].id,De(E)}Fe&&(Ke(s),l.call(he,{llmProvider:s,llmModel:y}).catch(()=>{}))},po=s=>{A.current=!0;let u=ke,y=s;for(let E of re){let x=E.models.find(D=>D.id===s||D.key===s);if(x){E.id!==ke&&(Ne(E.id),u=E.id),De(x.key||x.id),y=x.id;break}}Fe&&(Ke(u),l.call(he,{llmProvider:u,llmModel:y}).catch(()=>{}))};M(()=>()=>{_e.current&&clearInterval(_e.current),Me.current&&clearInterval(Me.current),be.current&&be.current.cancel()},[]);let uo=G(()=>{let s=h.trim();return`${s?s.split(/\s+/).length:0} words \xB7 ${h.length} chars`},[h]),mo=G(()=>{let s=C.trim();return`${s?s.split(/\s+/).length:0} words \xB7 ${C.length} chars`},[C]),fo=G(()=>!C||!He?[]:Yn(h,C),[h,C,He]),Et=()=>{_e.current&&(clearInterval(_e.current),_e.current=null),Me.current&&(clearInterval(Me.current),Me.current=null)},bo=()=>{Et(),_e.current=setInterval(()=>on(s=>s+1),1e3),Me.current=setInterval(()=>{be.current&&St(be.current.getAudioLevel?.()??null)},100)},go=async s=>{yt(!1),St(null),Et();let u=be.current;if(be.current=null,!!u){U(!0);try{let y=await u.stop();if(!ne.current)return;_("stop",s);let E=await Ve(l,y),x=await l.call(Le,{audio:E.base64,mimeType:E.mimeType,transcriptionOnly:!0});x.ok&&x.status==="ok"?(_("complete",s),I(D=>Ue(D,x.text)),Ce(null)):x.ok&&x.status==="no-speech"?(R("No speech detected. Try speaking closer to the microphone."),setTimeout(()=>R(null),4e3)):x.ok||(_("error",s),R(x.message),Ce(x.message),x.code==="MISSING_KEY"&&nn(!1))}catch(y){_("error",s),R(y instanceof Error?y.message:"Transcription failed.")}finally{U(!1)}}},vo=async(s,u)=>{if(Ce(null),R(null),B!=="system"&&!ht){_("error",u);let E=B==="openai"?"OpenAI":"Google Gemini";Ce(`API key required for direct ${E} speech-to-text. Switch to System (Zana Voice) below to dictate using host voice.`),R(`API key required for ${E}. Switch to System (Zana Voice) to dictate thoughts.`);return}let y=++et.current;try{let E=_("start",u);if(E&&(await E,!ne.current||et.current!==y))return;let x=await(s.micDeviceId!==L?r({deviceId:s.micDeviceId}):r());if(!ne.current||et.current!==y){x.cancel();return}x.onError=D=>{be.current=null,yt(!1),St(null),Et(),_("error",u),Ce(D.message),R(D.message)},be.current=x,yt(!0),on(0),bo()}catch(E){_("error",u),R(E instanceof Error?E.message:"Microphone access denied.")}},ho=k(()=>{c(!1),rt(ce()),it(),At()},[it,At,rt]),xo=async()=>{let s=sn.current,u={enabled:s.soundCuesEnabled,volume:s.soundCuesVolume};fe?await go(u):await vo(s,u)},yo=async()=>{let s=h.trim();if(!s||Ae||!$||le==="custom"&&!Je.trim())return;let u=Xn.find(V=>V.id===le),y=le==="custom"?Je.trim():u?.prompt||"Polish and format for clarity.",E=u?.tone||"technical",x=j?.id??"assistant",D=$?.id??"assistant";R(null),en(!0);try{let V=await l.call(mn,{text:s,tone:E,customPrompt:y,llmProvider:x,llmModel:D});V.ok?(W(V.text),no(`${j?.displayName||x}: ${V.llmModel||D}`)):R(V.message)}catch(V){R(V instanceof Error?V.message:"Refinement request failed.")}finally{en(!1)}},So=async()=>{try{let s=await navigator.clipboard.readText();if(!s||!s.trim()){R("Clipboard is empty."),setTimeout(()=>R(null),2500);return}I(u=>Ue(u,s)),R("Pasted from clipboard into input draft!"),setTimeout(()=>R(null),2500)}catch{R("Clipboard access denied or unavailable."),setTimeout(()=>R(null),2500)}},wo=async()=>{if(!h)return;await qt(h)?(me(!0),setTimeout(()=>me(!1),2e3),R("Input draft copied to clipboard!"),setTimeout(()=>R(null),2500)):(R("Failed to copy to clipboard."),setTimeout(()=>R(null),3e3))},Ao=async()=>{if(!C)return;await qt(C)?(Te(!0),setTimeout(()=>Te(!1),2e3),R("Refined output copied to clipboard!"),setTimeout(()=>R(null),2500)):(R("Failed to copy to clipboard."),setTimeout(()=>R(null),3e3))},Co=()=>{!h&&!C||(I(""),W(""),Xe("polish"),Qt(""),gt(!1),R("Studio canvas cleared."),setTimeout(()=>R(null),2500))},Eo=()=>{C&&(I(C),W(""),gt(!1),R("Refined output moved to input draft."),setTimeout(()=>R(null),2500))},Po=()=>{let s=C||h;if(s){if(p&&typeof p.updateText=="function")try{p.updateText(u=>Ue(u,s)),p.focus?.(),H("Inserted into Composer!"),setTimeout(()=>H(null),2500);return}catch{}if(m&&typeof m.toCompose=="function"){m.toCompose({initialPrompt:s,focusPrompt:!0}),H("Opened in New Thread Composer!"),setTimeout(()=>H(null),2500);return}qt(s).then(u=>{R(u?"No active composer \u2014 copied prompt to clipboard.":"Composer focus unavailable.")})}},Ro=async()=>{if(e){F(!0),Y(null);try{await dt(e,{showInProjects:!0})}catch(s){Y(s instanceof Error?s.message:"Could not update plugin settings.")}finally{F(!1)}}},Io=k(s=>{(s.ctrlKey||s.metaKey)&&s.key.toLowerCase()==="k"&&(s.preventDefault(),Xe("custom"),setTimeout(()=>an.current?.focus(),0))},[]);return t&&!f.showInProjects?a("div",{className:"ps-container",children:[n("style",{children:Zt}),a("header",{className:"ps-header",children:[a("div",{className:"ps-header-left",children:[n("span",{style:{fontSize:18},children:"\u{1F399}\uFE0F"}),n("span",{className:"ps-header-title",children:"Prompt Studio"}),n("span",{className:"ps-badge ps-badge-project",children:"Project"})]}),o?n("div",{className:"ps-header-actions",children:o}):null]}),n("div",{className:"ps-empty-state","data-testid":"ps-project-hidden-notice",children:a("div",{className:"ps-empty-card",children:[n("span",{style:{fontSize:22},"aria-hidden":"true",children:"\u{1F507}"}),n("div",{style:{fontSize:14,fontWeight:600},children:"Prompt Studio is hidden in projects"}),n("div",{style:{fontSize:12,color:"var(--ps-text-muted)",lineHeight:1.45},children:"You disabled the project tab in Prompt Voice plugin settings. Re-enable it anytime to use project-scoped drafts here."}),O?n("div",{role:"alert",style:{fontSize:11,color:"#fca5a5"},children:O}):null,e?n("button",{type:"button",className:"ps-btn ps-btn-primary",disabled:je,onClick:()=>void Ro(),children:je?"Enabling\u2026":"Enable Prompt Studio in Projects"}):null]})})]}):a("div",{className:"ps-container",onKeyDown:Io,children:[n("style",{children:Zt}),a("header",{className:"ps-header",children:[a("div",{className:"ps-header-left",children:[n("span",{style:{fontSize:18},children:"\u{1F399}\uFE0F"}),n("span",{className:"ps-header-title",children:"Prompt Studio"}),n("span",{className:"ps-badge",children:"Voice & AI Refinement"}),t?n("span",{className:"ps-badge ps-badge-project",children:"Project"}):null]}),o?n("div",{className:"ps-header-actions",children:o}):null]}),i?n(Gn,{rpc:l,pluginId:e,onBack:ho}):a("div",{className:"ps-workspace",children:[a("aside",{className:"ps-sidebar",children:[a("section",{className:"ps-section",children:[a("div",{className:"ps-section-title",children:[n("span",{children:"Voice Dictation"}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:Xr[B]??B})]}),a("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-stt-provider-select",className:"ps-field-label",children:"Speech Provider"}),n("select",{id:"ps-stt-provider-select",className:"ps-select","aria-label":"Speech-to-text provider",value:B,onChange:s=>{Ce(null),Ct(s.target.value)},disabled:fe||q,children:Jr.map(s=>n("option",{value:s.id,children:s.label},s.id))})]}),Jn(B)&&a("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-stt-model-input",className:"ps-field-label",children:"Speech Model (Optional)"}),n("input",{id:"ps-stt-model-input",className:"ps-select","aria-label":"Speech-to-text model",placeholder:"Provider default",value:vt,onChange:s=>lo(s.target.value),disabled:fe||q})]}),xt&&a("div",{role:"alert",style:{padding:"8px 10px",borderRadius:6,background:"rgba(239, 68, 68, 0.12)",border:"1px solid rgba(239, 68, 68, 0.35)",color:"#fca5a5",fontSize:11,textAlign:"left",lineHeight:1.4,display:"flex",flexDirection:"column",gap:6},children:[a("div",{children:["\u26A0\uFE0F ",xt]}),Jn(B)&&n("button",{type:"button",className:"ps-btn ps-btn-primary",style:{alignSelf:"flex-start",fontSize:11,padding:"4px 8px"},onClick:()=>Ct("system"),children:"Switch to System (Zana Voice)"})]}),B!=="system"&&!ht&&!xt&&a("div",{style:{padding:"8px 10px",borderRadius:6,background:"rgba(234, 179, 8, 0.1)",border:"1px solid rgba(234, 179, 8, 0.3)",color:"#fde047",fontSize:11,textAlign:"left",lineHeight:1.4,display:"flex",flexDirection:"column",gap:6},children:[a("div",{children:["\u2139\uFE0F ",n("strong",{children:"API key required:"})," Direct ",B==="openai"?"OpenAI Whisper":"Google Gemini"," speech-to-text requires an API key in Zana Settings."]}),n("button",{type:"button",className:"ps-btn ps-btn-primary",style:{alignSelf:"flex-start",fontSize:11,padding:"4px 8px"},onClick:()=>Ct("system"),children:"Switch to System (Zana Voice)"})]}),a("div",{className:"ps-dictation-card",children:[a("button",{type:"button",className:`ps-btn ${fe?"ps-btn-danger":q?"":"ps-btn-primary"}`,style:{width:"100%",justifyContent:"center",padding:"10px 0",opacity:q?.8:1},onClick:xo,disabled:q,"aria-label":q?"Transcribing audio":fe?"Stop dictation":"Start dictation",children:[n("span",{className:q?"ps-spin":void 0,children:q?"\u23F3":fe?"\u23F9\uFE0F":"\u{1F399}\uFE0F"}),n("span",{children:q?"Transcribing...":fe?`Stop Dictation (${oo}s)`:"Dictate Thoughts"})]}),fe&&a("div",{style:{width:"100%",display:"flex",flexDirection:"column",gap:4},children:[n("div",{className:"ps-meter-bar",children:n("div",{className:"ps-meter-fill",style:{width:`${Math.min(100,(ro??.1)*100)}%`}})}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:"Listening live..."})]})]}),n("div",{style:{fontSize:10,color:"var(--ps-text-subtle)",lineHeight:1.3},children:B==="system"?"Uses host Zana voice transcription without requiring external API keys.":B==="local-whisper"?"Transcribes on this device. Install the runtime and a model in Settings.":ht?`Using direct ${B==="openai"?"OpenAI Whisper":"Google Gemini"} speech-to-text.`:`\u26A0\uFE0F ${B==="openai"?"OpenAI":"Google Gemini"} requires an API key in Zana Settings. Choose System (Zana Voice) for built-in free dictation.`})]}),a("section",{className:"ps-section",children:[a("div",{className:"ps-section-title",children:[n("span",{children:"Refinement Engine"}),a("span",{style:{display:"inline-flex",alignItems:"center",gap:6},children:[n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:ae&&!so?"Loading\u2026":ae?"Refreshing\u2026":j?.isComposerMatch?"\u2605 Composer Active":"AI Model"}),n("button",{type:"button",className:"ps-btn",style:{padding:"2px 6px",fontSize:10},onClick:()=>st({refresh:!0}),disabled:ae||Ae,"aria-label":"Refresh models",title:"Reload models from Composer",children:ae?"\u2026":"\u21BB"})]})]}),a("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-provider-select",className:"ps-field-label",children:"Provider"}),n("select",{id:"ps-provider-select",className:"ps-select","aria-label":"Refinement provider",value:j?.id??"",onChange:s=>co(s.target.value),disabled:Ae,children:re.map(s=>a("option",{value:s.id,children:[s.displayName,s.isComposerMatch?" \u2605 (Composer)":""]},s.id))})]}),a("div",{className:"ps-field-group",children:[a("label",{htmlFor:"ps-model-select",className:"ps-field-label",children:["Model (",Ee.length,")"]}),n("select",{id:"ps-model-select",className:"ps-select","aria-label":"Refinement model",value:$?.key||$?.id||"",onChange:s=>po(s.target.value),disabled:Ae||Ee.length===0,children:Ee.length===0?n("option",{value:"",children:"No models available"}):Ee.map(s=>a("option",{value:s.key||s.id,children:[s.label,s.isComposerMatch?" \u2605 (Composer)":""]},s.key||s.id))})]}),(j?.error||Kt)&&n("div",{role:"status",style:{fontSize:10.5,color:"#fde047",lineHeight:1.35,padding:"6px 8px",borderRadius:6,background:"rgba(234, 179, 8, 0.1)",border:"1px solid rgba(234, 179, 8, 0.25)"},children:j?.error||Kt}),a("div",{style:{marginTop:8,paddingTop:8,borderTop:"1px solid var(--ps-border)",display:"flex",flexDirection:"column",gap:4},children:[a("label",{style:{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:11,fontWeight:500,userSelect:"none"},children:[n("input",{type:"checkbox","aria-label":"Auto-cleanup mic dictations",checked:Fe,onChange:s=>ao(s.target.checked)}),n("span",{children:"Auto-cleanup mic dictations"})]}),n("span",{style:{fontSize:10,color:"var(--ps-text-subtle)",lineHeight:1.3},children:Fe?`Composer mic cleans up using ${j?.displayName}${$?` (${$.label||$.id})`:""}.`:"Composer mic inserts raw transcript without AI cleanup."})]}),a("div",{style:{marginTop:4,fontSize:11,color:"var(--ps-text-muted)",lineHeight:1.35},children:[j?.isComposerMatch?a("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:600},children:["\u2605 Synced to Composer: ",j.displayName,$?` (${$.label})`:""]}):j?.id==="assistant"?"Uses the active Zana assistant agent with no extra API key required.":$?a(ee,{children:["Using ",n("strong",{children:j?.displayName})," \xB7 ",n("code",{children:$.id})]}):null,Jt?a("div",{style:{marginTop:3,color:"var(--ps-text-subtle)",fontSize:10},children:["Last refined: ",Jt]}):null]})]}),a("section",{className:"ps-section",children:[n("div",{className:"ps-section-title",children:"How should we improve it?"}),a("div",{className:"ps-presets-list",role:"radiogroup","aria-label":"How should we improve it?",children:[Xn.map(s=>a("label",{className:`ps-preset-btn ${le===s.id?"active":""}`,children:[a("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:s.id,checked:le===s.id,onChange:()=>Xe(s.id)}),s.title]}),n("span",{className:"preset-desc",children:s.desc})]},s.id)),a("label",{className:`ps-preset-btn ${le==="custom"?"active":""}`,children:[a("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:"custom",checked:le==="custom",onChange:()=>Xe("custom")}),"Custom instructions"]}),n("span",{className:"preset-desc",children:"Describe your own transformation."})]})]}),le==="custom"&&n("textarea",{ref:an,className:"ps-custom-prompt-input","aria-label":"Custom instructions",placeholder:"e.g. Turn into user stories with acceptance criteria...",value:Je,onChange:s=>Qt(s.target.value)})]}),n("button",{type:"button",className:"ps-btn",style:{marginTop:"auto"},onClick:()=>c(!0),children:"Settings"})]}),a("main",{className:"ps-editor-canvas",children:[a("section",{className:"ps-pane",children:[a("div",{className:"ps-pane-header",children:[a("div",{className:"ps-pane-title",children:[n("span",{children:"\u{1F4DD}"}),n("span",{children:"Raw Input Draft"})]}),a("div",{style:{display:"flex",gap:6},children:[n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:So,title:"Paste from clipboard into input draft","aria-label":"Paste into input draft",children:"\u{1F4CB} Paste"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:wo,disabled:!h,title:"Copy raw input","aria-label":"Copy raw input",children:oe?"\u2705 Copied":"\u{1F4CB} Copy"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>I(""),disabled:!h,title:"Clear input",children:"Clear"})]})]}),n("textarea",{className:"ps-textarea",placeholder:"Type your raw thoughts or click Dictate in the left sidebar to speak...",value:h,onChange:s=>I(s.target.value),"aria-label":"Raw Input Text"})]}),a("div",{className:"ps-action-bar",children:[a("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12},children:[n("span",{className:"ps-pill",children:"\u2B07 Refine pipeline"}),n("span",{style:{color:"var(--ps-text-muted)"},children:h.trim()?`${h.trim().split(/\s+/).length} words ready`:"Add text to get started"})]}),n("div",{style:{display:"flex",alignItems:"center",gap:6},children:a("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:()=>yo(),disabled:Ae||!h.trim()||!$||le==="custom"&&!Je.trim(),title:"Transform raw draft into polished output",children:[n("span",{children:Ae?"\u23F3":"\u26A1"}),n("span",{children:Ae?"Refining...":"Refine text"})]})})]}),a("section",{className:"ps-pane",children:[a("div",{className:"ps-pane-header",children:[a("div",{className:"ps-pane-title",children:[n("span",{children:"\u2728"}),n("span",{children:"Result"})]}),a("div",{style:{display:"flex",gap:6},children:[C&&a("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>gt(s=>!s),title:"Toggle inline diff against input draft",children:[n("span",{children:He?"\u{1F441}\uFE0F":"\u{1F50D}"}),n("span",{children:He?"View Clean":"View Diff"})]}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Eo,disabled:!C,title:"Move output to input draft for iterative re-refinement",children:"\u2B06 Replace Input"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Ao,disabled:!C,title:"Copy refined text to clipboard","aria-label":"Copy refined output",children:ue?"\u2705 Copied":"\u{1F4CB} Copy"})]})]}),He&&C?n("div",{className:"ps-output-view",children:fo.map((s,u)=>s.type==="added"?n("span",{className:"ps-diff-added",children:s.text},u):s.type==="removed"?n("span",{className:"ps-diff-removed",children:s.text},u):n("span",{className:"ps-diff-unchanged",children:s.text},u))}):n("textarea",{className:"ps-textarea",placeholder:"Polished, structured output will appear here after clicking Refine...",value:C,onChange:s=>W(s.target.value),"aria-label":"Refined output"})]}),a("div",{className:"ps-action-bar",children:[n("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12},children:Z?n("span",{className:"ps-badge",style:{background:"rgba(34, 197, 94, 0.2)",color:"#86efac"},children:Z}):n("span",{style:{color:"var(--ps-text-muted)"},children:C?"Ready to insert refined result into Composer":h?"Ready to insert raw draft into Composer":"Draft or refine a prompt to insert into Composer"})}),a("div",{style:{display:"flex",alignItems:"center",gap:8},children:[a("button",{type:"button",className:"ps-btn",onClick:Co,title:"Clear current input and output",disabled:!h&&!C,children:[n("span",{children:"\u{1F5D1}\uFE0F"}),n("span",{children:"Clear"})]}),a("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:Po,disabled:!h&&!C,title:"Append current text directly into Zana Composer",children:[n("span",{children:"\u{1F4AC}"}),n("span",{children:"Insert into Composer"})]})]})]})]})]}),a("footer",{className:"ps-status-bar",children:[a("div",{style:{display:"flex",gap:12},children:[a("span",{children:["Input: ",uo]}),a("span",{children:["Output: ",mo]}),tn&&n("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:500},children:tn})]}),a("div",{style:{display:"flex",gap:12,alignItems:"center"},children:[a("span",{children:["Engine: ",j?.displayName," \xB7 ",$?.label??"No model"]}),a("span",{className:"ps-pill",children:["Mic cleanup: ",Fe?`${j?.displayName}${$?` (${$.label||$.id})`:""}`:"Off (Raw)"]}),j?.isComposerMatch&&n("span",{className:"ps-pill",style:{color:"var(--accent, #3b82f6)"},children:"\u2605 Composer Synced"}),n("span",{children:"Zana Prompt Studio"})]})]})]})}var Aa=pn(e=>{J(),e.composer.customize({id:"prompt-voice-mic",actions:[{id:"prompt-voice-mic",component:Ln}]}),e.slots.navPanel?.({id:xe,title:"Prompt Studio",icon:"Sparkles",path:xe,component:Yt}),e.slots.projectTab?.({id:Oe,label:"Prompt Studio",icon:"Sparkles",order:50,global:!1,header:"custom",detachable:!0,component:Yt,detachedPlaceholder:eo}),e.slots.homepageSection?.({id:"prompt-voice-home",title:"Prompt Voice",component:kn}),e.slots.settingsSection?.({id:"prompt-voice-visibility",title:"Where Prompt Voice Appears",description:"Choose whether Prompt Voice appears on the main Home screen, inside projects, and in composers.",component:ft}),e.slots.commandPaletteAction?.({id:"open-prompt-studio",title:"Prompt Studio: Open Canvas",isAvailable:()=>!0,run:t=>{if(typeof t.toPluginPanel=="function"){t.toPluginPanel(xe);return}t.navigate?.(`/${xe}`)}}),e.slots.commandPaletteAction?.({id:"open-prompt-studio-project",title:"Prompt Studio: Open in This Project",isAvailable:t=>!!t.projectId,run:t=>{t.projectId&&typeof t.toProject=="function"&&t.toProject(t.projectId,{tabId:Oe})}})});export{xe as PROMPT_STUDIO_PANEL_PATH,Oe as PROMPT_STUDIO_PROJECT_TAB_ID,Aa as default};
//# sourceMappingURL=app.js.map
