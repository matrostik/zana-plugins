function yn(){let e=globalThis.__ZCC_PLUGIN_HOST__;if(!e)throw new Error("plugin host is not available");return e}function we(){return globalThis.__ZCC_PLUGIN_RUNTIME__??{}}function ct(e){throw new Error(`${e} is not available until the host plugin runtime is installed`)}async function Sn(e,t,o){return yn().callRpc(e,t,o)}async function Nt(e,t){return yn().setSettings(e,t)}function wn(e){return{__zccPluginApp:!0,setup:e}}function We(){return we().useRpc?.()??ct("useRpc")}function Dt(e,t){we().useRealtime?.(e,t)}function _t(){return we().useSettings?.()??{values:void 0,isLoading:!0}}function Mt(){return we().useZccContext?.()??{projectId:null,threadId:null}}function Lt(){return we().useZccNavigate?.()??ct("useZccNavigate")}function qe(){return we().useComposer?.()??ct("useComposer")}function Ot(){return we().useComposerView?.()??ct("useComposerView")}var T=globalThis.__ZCC_HOST_REACT__,An=T,Ii=T.Children,Ei=T.Component,Ri=T.Fragment,Ti=T.StrictMode,ki=T.Suspense,Ni=T.cloneElement,Di=T.createContext,_i=T.createElement,Mi=T.createRef,Li=T.forwardRef,Oi=T.isValidElement,Vi=T.lazy,Ui=T.memo,zi=T.startTransition,k=T.useCallback,ji=T.useContext,Fi=T.useDebugValue,$i=T.useDeferredValue,M=T.useEffect,Hi=T.useId,Bi=T.useImperativeHandle,Gi=T.useInsertionEffect,Wi=T.useLayoutEffect,G=T.useMemo,Pn=T.useReducer,w=T.useRef,f=T.useState,qi=T.useSyncExternalStore,Zi=T.useTransition,Yi=T.version;var L="default";function Ho(e){if(typeof e!="string")return L;let t=e.trim().slice(0,256);return!t||t===L?L:t}function Bo(e){return typeof e!="string"?"":e.trim().slice(0,200)}function Go(e){return!(e===!1||typeof e=="string"&&e.trim().toLowerCase()==="false")}function Wo(e){let t=typeof e=="number"?e:typeof e=="string"&&e.trim()!==""?Number(e):Number.NaN;return Number.isFinite(t)?Math.round(Math.min(100,Math.max(0,t))):75}function ue(e){let t=e??{},o=Ho(t.micDeviceId);return{micDeviceId:o,micLabel:o===L?"":Bo(t.micLabel),soundCuesEnabled:Go(t.soundCuesEnabled),soundCuesVolume:Wo(t.soundCuesVolume)}}var _e="promptVoice.transcribe",Ae="promptVoice.status",Cn="promptVoice.rephrase",In="promptVoice.availableModels",me="promptVoice.settings.get",fe="promptVoice.settings.update",En="promptVoice:settingsChanged",Rn="promptVoice:modelsUpdated",ne={state:"promptVoice.localWhisper.state",installRuntime:"promptVoice.localWhisper.installRuntime",cancelRuntimeInstall:"promptVoice.localWhisper.cancelRuntimeInstall",downloadModel:"promptVoice.localWhisper.downloadModel",cancelModelDownload:"promptVoice.localWhisper.cancelModelDownload",removeModel:"promptVoice.localWhisper.removeModel",selectModel:"promptVoice.localWhisper.selectModel",start:"promptVoice.localWhisper.start",stop:"promptVoice.localWhisper.stop"};var Tn=["standard","casual","conversational","formal","technical","custom"],ge="prompt-studio",Me="prompt-studio";var kn="zcc:prompt-voice:audio-prefs:v1";function Vt(){try{if(typeof localStorage>"u")return null;let e=localStorage.getItem(kn);if(!e)return null;let t=JSON.parse(e);return!t||typeof t!="object"||Array.isArray(t)?null:ue(t)}catch{return null}}function se(){return Vt()??ue({})}function ae(e){let t=ue(e);try{typeof localStorage<"u"&&localStorage.setItem(kn,JSON.stringify({micDeviceId:t.micDeviceId,micLabel:t.micDeviceId===L?"":t.micLabel,soundCuesEnabled:String(t.soundCuesEnabled),soundCuesVolume:String(t.soundCuesVolume)}))}catch{}return t}var Ut=`/* Base Container */
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
`;var Nn="zcc-ext-prompt-voice-styles";function q(){if(typeof document>"u")return;let e=document.getElementById(Nn);e||(e=document.createElement("style"),e.id=Nn,document.head.appendChild(e)),e.textContent!==Ut&&(e.textContent=Ut)}var Zo=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4"];var Z=class extends Error{code;constructor(t,o){super(o),this.name="RecordingError",this.code=t}};function Yo(e){return Zo.find(t=>e(t))??null}var Ko="audio/webm";function Dn(){return{getUserMedia:e=>navigator.mediaDevices.getUserMedia(e),createRecorder:(e,t)=>new MediaRecorder(e,t?{mimeType:t}:void 0),isTypeSupported:e=>typeof MediaRecorder<"u"&&MediaRecorder.isTypeSupported(e)}}async function Xo(e,t){let o=t&&t!=="default"?t:void 0,r=o?{audio:{deviceId:{exact:o}}}:{audio:!0};try{return await e.getUserMedia(r)}catch(i){let a=i instanceof Error?i.name:"";if(a==="NotAllowedError"||a==="SecurityError")throw new Z("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again.");if(o&&(a==="OverconstrainedError"||a==="NotFoundError"))try{return await e.getUserMedia({audio:!0})}catch(c){let p=c instanceof Error?c.name:"";if(p==="NotAllowedError"||p==="SecurityError")throw new Z("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again.")}throw new Z("MIC_UNAVAILABLE","No microphone is available. Connect one and try again.")}}function zt(e){return new Promise((t,o)=>{let r=new FileReader;r.onload=()=>{let i=typeof r.result=="string"?r.result:"";t(i.slice(i.indexOf(",")+1))},r.onerror=()=>o(new Z("RECORDING_FAILED","The recording could not be read.")),r.readAsDataURL(e)})}async function Jo(e,t){let o=new Blob(e,{type:t});return{base64:await zt(o),mimeType:o.type||t}}function Qo(e,t){if(!(e>0&&Number.isFinite(e)))return()=>{};let o=setTimeout(t,e);return()=>clearTimeout(o)}var er="That recording is too large to transcribe. Keep dictation shorter and try again.";function tr(e,t){let o=Math.max(t,e),r=[],i=0,a=!1;return{chunks:r,get overflowed(){return a},add(c){return c.size===0||a?"ignored":i+c.size>o?(a=!0,"overflow"):(r.push(c),i+=c.size,i>=e?"limit-reached":"accepted")}}}function nr(e,t){let o=new Promise((r,i)=>{e.onstop=()=>r(),e.onerror=()=>{let a=new Z("RECORDING_FAILED","Recording stopped unexpectedly. Try again.");t(a),i(a)}});return o.catch(()=>{}),o}function or(e,t,o,r){let i=nr(e,r);return e.ondataavailable=a=>{let c=t.add(a.data);(c==="limit-reached"||c==="overflow")&&o()},e.start(1e3),i}async function rr(e,t,o,r){try{await e}finally{t()}if(o.overflowed)throw new Z("RECORDING_FAILED",er);return Jo(o.chunks,r)}function ir(e){let t=()=>{};return{stopRecorder(){t(),e.state!=="inactive"&&e.stop()},armTimer(o,r){t=Qo(o,r)}}}function sr(e,t){let o=null;return{attach(r){o=r},detach(){o=null},autoStop(){e();let r=o?.onAutoStop;o&&(o.onAutoStop=void 0),r?.()},fail(r){e(),t();let i=o?.onError;o=null,i?.(r)}}}function ar(e,t,o,r){let i=tr(r.maxBytes??9437184,r.hardMaxBytes??10485760),{stopRecorder:a,armTimer:c}=ir(e),p=sr(a,t);c(r.maxDurationMs??12e4,p.autoStop);let d=or(e,i,p.autoStop,p.fail),m={onError:r.onError,onAutoStop:r.onAutoStop,async stop(){a();try{return await rr(d,t,i,e.mimeType||o)}finally{p.detach()}},cancel(){a(),t(),p.detach()}};return p.attach(m),m}var le=e=>lr(Dn(),e);async function lr(e=Dn(),t={}){let o=await Xo(e,t.deviceId),r=cr(o),i=o.getTracks(),a,c=()=>{for(let p of i)a&&p.removeEventListener?.("ended",a);r?.close(),i.forEach(p=>p.stop())};try{let p=Yo(e.isTypeSupported)??Ko,d=e.createRecorder(o,p),m=ar(d,c,p,t);return m.getAudioLevel=()=>r?.level()??null,a=()=>{let g=m.onError;m.cancel(),g?.(new Z("MIC_UNAVAILABLE","Microphone disconnected. Check your device and try again."))},i.forEach(g=>g.addEventListener?.("ended",a)),m}catch(p){throw c(),p instanceof Z?p:new Z("RECORDING_FAILED",p instanceof Error?p.message:"The recording could not be started.")}}function cr(e){let t;try{t=new AudioContext;let o=t.createMediaStreamSource(e),r=t.createAnalyser();r.fftSize=256,o.connect(r);let i=new Uint8Array(r.fftSize),a=t,c=!1;return{level(){if(a.state&&a.state!=="running")return null;r.getByteTimeDomainData(i);let p=i.reduce((d,m)=>d+((m-128)/128)**2,0)/i.length;return Math.min(1,Math.sqrt(p)*5)},close(){c||(c=!0,o.disconnect(),a.close().catch(p=>console.error("Prompt Voice audio meter cleanup failed",p)))}}}catch(o){return t&&t.close().catch(r=>console.error("Prompt Voice audio meter cleanup failed",r)),console.warn("Prompt Voice audio meter unavailable",o),null}}var jt=["both","main","projects","off"];var pr="both",Ft=[{id:"all",label:"Main Screen & Projects",description:"Show on Zana Home, inside Projects, and in all composers.",settings:{showHomeWidget:!0,showInProjects:!0,micVisibility:"both"}},{id:"projects",label:"Projects Only",description:"Show the Prompt Studio tab and mic button only inside projects.",settings:{showHomeWidget:!1,showInProjects:!0,micVisibility:"projects"}},{id:"main",label:"Main Screen Only",description:"Show on Zana Home and global composers; hide project tabs and project mics.",settings:{showHomeWidget:!0,showInProjects:!1,micVisibility:"main"}},{id:"mic-only",label:"Composer Mic Only",description:"Hide the Home widget and project tabs; keep only the composer mic.",settings:{showHomeWidget:!1,showInProjects:!1,micVisibility:"both"}}],Mn={both:"Everywhere (Main & Projects)",main:"Main screen composers only",projects:"Project composers only",off:"Hidden"};function _n(e,t){if(typeof e=="boolean")return e;if(typeof e=="string"){let o=e.trim().toLowerCase();if(o==="true")return!0;if(o==="false")return!1}return t}function dr(e){return typeof e=="string"&&jt.includes(e)?e:pr}function $t(e){let t=e??{};return{showHomeWidget:_n(t.showHomeWidget,!0),showInProjects:_n(t.showInProjects,!0),micVisibility:dr(t.micVisibility)}}function Ln(e){for(let t of Ft)if(t.settings.showHomeWidget===e.showHomeWidget&&t.settings.showInProjects===e.showInProjects&&t.settings.micVisibility===e.micVisibility)return t.id;return"custom"}function On(e,t,o){if(e==="off")return!1;if(e==="both")return!0;let r=t&&typeof t=="object"&&"projectId"in t?t.projectId:void 0,i=r!==void 0?r:o,a=typeof i=="string"&&i.length>0;return e==="projects"?a:!a}var Le="prompt-voice";function ur(e){return Le}function mr(){try{let e=Sn;return typeof e=="function"?e:void 0}catch{return}}function fr(){try{return typeof _t=="function"?_t():null}catch{return null}}function pt(){try{return typeof Ot=="function"?Ot():null}catch{return null}}function Vn(){try{return typeof Mt=="function"?Mt():null}catch{return null}}function dt(){try{return typeof Lt=="function"?Lt():null}catch{return null}}function Un(){try{return typeof qe=="function"?qe():null}catch{return null}}function gr(){try{return typeof We=="function"?We():null}catch{return null}}function ut(e){let t=gr(),o=w(t);o.current=t;let r=w(e);return r.current=e,G(()=>({async call(i,a){let c=mr(),p=a!==void 0,d=async()=>{if(!c)throw new Error("Prompt Voice RPC is unavailable in this environment.");return p?await c(Le,i,a):await c(Le,i)};if(r.current&&r.current!==Le&&c)return d();let m=o.current;if(m)try{return p?await m.call(i,a):await m.call(i)}catch(g){if(c&&g instanceof Error&&/unknown rpc/i.test(g.message))return d();throw g}return d()}}),[])}function Ht(e,t){try{typeof Dt=="function"&&Dt(e,t)}catch{}}function be(){let t=fr()?.values,o=$t(t),[r,i]=f(null);return M(()=>{i(null)},[o.showHomeWidget,o.showInProjects,o.micVisibility]),Ht(En,a=>{a&&typeof a=="object"&&i($t(a))}),r??o}async function mt(e,t){if(typeof Nt!="function")throw new Error("Plugin settings API is unavailable in this environment.");await Nt(ur(e),t)}var br={start:[{frequency:523.25,offsetSec:0,durationSec:.11,type:"sine",peakFactor:.9},{frequency:659.25,offsetSec:.075,durationSec:.14,type:"sine",peakFactor:1}],stop:[{frequency:493.88,offsetSec:0,durationSec:.1,type:"sine",peakFactor:.85}],complete:[{frequency:659.25,offsetSec:0,durationSec:.1,type:"sine",peakFactor:.85},{frequency:783.99,offsetSec:.075,durationSec:.16,type:"sine",peakFactor:1}],error:[{frequency:329.63,offsetSec:0,durationSec:.12,type:"triangle",peakFactor:.9},{frequency:246.94,offsetSec:.095,durationSec:.16,type:"triangle",peakFactor:.9}]},ft=null;function vr(){if(typeof window>"u")return null;let e=window.AudioContext??window.webkitAudioContext;return e?((!ft||ft.state==="closed")&&(ft=new e),ft):null}function zn(e,t,o){let r=e.currentTime,i=br[t],a=null,c=0;for(let p of i){let d=e.createOscillator(),m=e.createGain(),g=r+p.offsetSec,v=g+p.durationSec,b=p.offsetSec+p.durationSec+.02,S=o*(p.peakFactor??1);b>=c&&(c=b,a=d),d.type=p.type??"sine",d.frequency.setValueAtTime(p.frequency,g),m.gain.setValueAtTime(1e-4,g),m.gain.exponentialRampToValueAtTime(Math.max(2e-4,S),g+.015),m.gain.exponentialRampToValueAtTime(1e-4,v),d.connect(m),m.connect(e.destination),d.start(g),d.stop(v+.02)}return{finalOsc:a,totalDurationSec:c}}function jn(e,t){let o=Math.ceil(t*1e3)+40;return new Promise(r=>{let i=!1,a=null,c=()=>{i||(i=!0,a!==null&&clearTimeout(a),e&&typeof e.removeEventListener=="function"&&e.removeEventListener("ended",c),r())};if(e&&typeof e.addEventListener=="function")e.addEventListener("ended",c,{once:!0});else if(e&&"onended"in e){let p=e.onended;e.onended=function(d){typeof p=="function"&&p.call(this,d),c()}}a=setTimeout(c,o)})}async function hr(e){if(e.state!=="suspended")return e.state==="running";let t=null;try{return await Promise.race([e.resume(),new Promise(o=>{t=setTimeout(o,750)})]),e.state!=="suspended"}catch{return!1}finally{t!==null&&clearTimeout(t)}}function _(e,t){if(!t.enabled)return null;let o=Math.min(100,Math.max(0,t.volume));if(!Number.isFinite(o)||o<=0)return null;try{let r=vr();if(!r)return null;let i=o/100*.2;if(r.state==="suspended")return(async()=>{if(!await hr(r))return;let{finalOsc:d,totalDurationSec:m}=zn(r,e,i);await jn(d,m)})().catch(()=>{});let{finalOsc:a,totalDurationSec:c}=zn(r,e,i);return jn(a,c)}catch{return null}}var Bt=16e3,Fn=44,Ze=2,xr="This recording couldn't be prepared for Local Whisper. Try again.",yr=async(e,t)=>{let r=await new OfflineAudioContext(1,1,t).decodeAudioData(e),i=Array.from({length:r.numberOfChannels},(a,c)=>r.getChannelData(c));return{sampleRate:r.sampleRate,channels:i}};function Sr(e){if(e.length===0)return new Float32Array(0);if(e.length===1)return e[0];let t=Math.min(...e.map(r=>r.length)),o=new Float32Array(t);for(let r=0;r<t;r+=1){let i=0;for(let a of e)i+=a[r];o[r]=i/e.length}return o}function wr(e,t){let o=e.length*Ze,r=new Uint8Array(Fn+o),i=new DataView(r.buffer),a=(c,p)=>{for(let d=0;d<p.length;d+=1)i.setUint8(c+d,p.charCodeAt(d))};a(0,"RIFF"),i.setUint32(4,36+o,!0),a(8,"WAVE"),a(12,"fmt "),i.setUint32(16,16,!0),i.setUint16(20,1,!0),i.setUint16(22,1,!0),i.setUint32(24,t,!0),i.setUint32(28,t*Ze,!0),i.setUint16(32,Ze,!0),i.setUint16(34,8*Ze,!0),a(36,"data"),i.setUint32(40,o,!0);for(let c=0;c<e.length;c+=1){let p=Math.max(-1,Math.min(1,e[c]));i.setInt16(Fn+c*Ze,p<0?p*32768:p*32767,!0)}return r}function Ar(e){let t=atob(e),o=new Uint8Array(t.length);for(let r=0;r<t.length;r+=1)o[r]=t.charCodeAt(r);return o.buffer}async function Pr(e,t=yr){let o;try{let r=await t(Ar(e.base64),Bt);if(r.sampleRate!==Bt)throw new Error("decoder ignored the requested sample rate");o=wr(Sr(r.channels),Bt)}catch{throw new Z("RECORDING_FAILED",xr)}return{base64:await zt(new Blob([o],{type:"audio/wav"})),mimeType:"audio/wav"}}async function Oe(e,t,o=Pr){return(await e.call(Ae).catch(()=>null))?.audioFormat==="wav"?o(t):t}var $n=globalThis.__ZCC_HOST_REACT__,Y=$n.Fragment;function n(e,t,o){return $n.createElement(e,o===void 0?t:{...t,key:o})}var l=n;var Cr={system:"Zana Voice",openai:"OpenAI Whisper","google-gemini":"Google Gemini","local-whisper":"Local Whisper"};function Ir(e,t){let[o,r]=f("system"),[i,a]=f("assistant");return M(()=>{let c=!0;return e.call(Ae).then(p=>{if(!c||!p||typeof p!="object")return;let d=p;d.sttProvider&&r(d.sttProvider),d.llmProvider&&a(d.llmProvider)}).catch(()=>{}),e.call(me).then(p=>{!c||!p||typeof p!="object"||(t.current=ae(p))}).catch(()=>{}),()=>{c=!1}},[t,e]),{sttProvider:o,llmProvider:i}}function Er(e){let[t,o]=f(0);return M(()=>{if(e!=="recording"){o(0);return}let r=Date.now(),i=setInterval(()=>{o(Math.floor((Date.now()-r)/1e3))},250);return()=>clearInterval(i)},[e]),t}async function Rr(e,t,o,r,i,a){let c={enabled:o.soundCuesEnabled,volume:o.soundCuesVolume},p=await e.stop();if(!i.current)return;_("stop",c);let d=await Oe(t,p),m=await t.call(_e,{audio:d.base64,mimeType:d.mimeType});if(i.current){if(m.ok&&m.status==="ok"){_("complete",c),typeof r?.toCompose=="function"?(r.toCompose({initialPrompt:m.text,focusPrompt:!0}),a.setNotice("Draft opened in new thread composer.")):a.setNotice(m.text);return}if(m.ok&&m.status==="no-speech"){a.setNotice("No speech detected. Try again.");return}m.ok||(_("error",c),a.setError(m.message))}}async function Tr(e,t,o){let r={enabled:e.soundCuesEnabled,volume:e.soundCuesVolume},i=_("start",r);if(i&&(await i,!o()))return null;let a=await(e.micDeviceId!==L?t({deviceId:e.micDeviceId}):t());return o()?a:(a.cancel(),null)}function kr(e,t,o){let[r,i]=f("idle"),[a,c]=f(null),[p,d]=f(null),m=w(!0),g=w(null),v=w(0),b=w(se()),{sttProvider:S,llmProvider:P}=Ir(e,b),N=Er(r);M(()=>(m.current=!0,()=>{m.current=!1,v.current++,g.current?.cancel(),g.current=null}),[]);let R=k(async()=>{let C=g.current;if(g.current=null,!C){i("idle");return}let H=b.current;i("transcribing");try{await Rr(C,e,H,t,m,{setNotice:c,setError:d})}catch(re){if(!m.current)return;_("error",{enabled:H.soundCuesEnabled,volume:H.soundCuesVolume}),d(re instanceof Error?re.message:"Quick dictation failed.")}finally{m.current&&i("idle")}},[t,e]),h=k(async()=>{d(null),c(null);let C=se();b.current=C;let H={enabled:C.soundCuesEnabled,volume:C.soundCuesVolume},re=++v.current;i("starting");try{let K=await Tr(C,o,()=>m.current&&v.current===re);if(!K)return;K.onError=ie=>{g.current=null,m.current&&(_("error",H),d(ie.message),i("idle"))},K.onAutoStop=()=>{m.current&&R()},g.current=K,i("recording")}catch(K){if(!m.current)return;_("error",H),d(K instanceof Error?K.message:"Microphone access denied."),i("idle")}},[o,R]),U=k(()=>{v.current++,g.current?.cancel(),g.current=null,i("idle")},[]);return{sttProvider:S,llmProvider:P,phase:r,seconds:N,notice:a,error:p,start:h,stopAndTranscribe:R,cancel:U}}function Nr({phase:e,formattedTime:t,onToggleDictate:o,onCancel:r,onOpenStudio:i}){let a=e==="starting"?"Starting mic\u2026":e==="recording"?`Stop & Compose (${t})`:e==="transcribing"?"Transcribing\u2026":"Dictate to New Thread";return l("div",{className:"ps-home-actions",children:[n("button",{type:"button",className:`ps-btn ${e==="recording"?"ps-btn-danger":"ps-btn-primary"}`,disabled:e==="starting"||e==="transcribing",onClick:o,children:a}),e==="starting"||e==="recording"?n("button",{type:"button",className:"ps-btn",onClick:r,children:"Cancel"}):n("button",{type:"button",className:"ps-btn",onClick:i,children:"Open Prompt Studio"})]})}function Hn(e){return be().showHomeWidget?n(Dr,{...e}):null}function Dr({pluginId:e,projectId:t,startSession:o=le}){q();let r=ut(e),i=dt(),a=kr(r,i,o),c=k(()=>{if(t&&typeof i?.toProject=="function"){i.toProject(t,{tabId:Me});return}i?.toPluginPanel?.(ge)},[i,t]),p=()=>{a.phase==="recording"?a.stopAndTranscribe():a.phase==="idle"&&a.start()},d=`${Math.floor(a.seconds/60)}:${String(a.seconds%60).padStart(2,"0")}`,m=Cr[a.sttProvider]??a.sttProvider,g=a.llmProvider==="none"?"Raw transcript":"AI cleanup on";return l("div",{className:"ps-home-card","data-testid":"pv-home-widget",children:[l("div",{className:"ps-home-card-top",children:[l("div",{className:"ps-home-copy",children:[l("div",{className:"ps-home-heading",children:[n("span",{"aria-hidden":"true",children:"\u{1F399}\uFE0F"}),n("span",{children:"Dictate a new thread or refine in Prompt Studio"})]}),l("div",{className:"ps-home-meta",children:[n("span",{children:m}),n("span",{"aria-hidden":"true",children:"\xB7"}),n("span",{children:g})]})]}),n(Nr,{phase:a.phase,formattedTime:d,onToggleDictate:p,onCancel:a.cancel,onOpenStudio:c})]}),a.notice?n("div",{role:"status",className:"ps-home-status",children:a.notice}):null,a.error?n("div",{role:"alert",className:"ps-home-error",children:a.error}):null]})}function Ve(e,t){let o=t.trim();return o?e?/\s$/.test(e)?`${e}${o}`:`${e} ${o}`:o:e}var _r="No speech detected.",Gt={phase:"idle",notice:null,error:null};function Bn(e,t){switch(t.type){case"START":return e.phase==="idle"||e.phase==="error"?{phase:"starting",notice:null,error:null}:e;case"STARTED":return e.phase==="starting"?{...e,phase:"recording"}:e;case"STOP":return e.phase==="recording"||e.phase==="starting"?{phase:"processing",notice:null,error:null}:e;case"CANCEL":return e.phase==="recording"||e.phase==="starting"?{...Gt}:e;case"SUCCESS":case"NO_SPEECH":return e.phase!=="processing"?e:{phase:"idle",notice:t.type==="NO_SPEECH"?_r:t.notice,error:null};case"CLEAR_NOTICE":return e.notice?{...e,notice:null}:e;case"FAILURE":return{phase:"error",notice:null,error:t.message}}}var Mr="Prompt Voice returned an unexpected response. Try again.",Lr="Dictation failed. Try again.",Or=4e3;function Vr(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}function Ur(e){return typeof e=="object"&&e!==null&&!("ok"in e&&"status"in e)}async function zr(e,t){let o=await Oe(e,t),r=await e.call(_e,{audio:o.base64,mimeType:o.mimeType});if(!Vr(r))throw new Error(Mr);return r}function Gn(e){return e instanceof Error&&e.message?e.message:Lr}function Ue(e){return{enabled:e.soundCuesEnabled,volume:e.soundCuesVolume}}function jr(e,t,o,r=se()){if(!e.ok){_("error",Ue(r)),o({type:"FAILURE",message:e.message});return}if(e.status==="no-speech"){o({type:"NO_SPEECH"});return}_("complete",Ue(r)),t.updateText(a=>Ve(a,e.text)),t.focus();let i=e.refineNotice?`Inserted the raw transcript. ${e.refineNotice.message}`:"Added to draft.";o({type:"SUCCESS",notice:i})}function Fr(e,t,o,r){return t()?(e.onError=i=>{t()&&r(i)},e.onAutoStop=()=>{t()&&o()},e):(e.cancel(),null)}function $r(e,t,o,r,i,a){let c=p=>{_("error",Ue(a())),i({type:"FAILURE",message:Gn(p)})};return e.then(p=>{if(!p)return null;let d=Fr(p,o,r,m=>{t.current=null,c(m)});return d&&(t.current=d),d},p=>(o()&&c(p),null))}function Hr(e,t,o){let r=w(null),i=w(null),a=w(0),c=w(!0),p=k(()=>{a.current++,i.current=null,r.current&&(r.current.cancel(),r.current=null),t({type:"CANCEL"})},[t]);M(()=>(c.current=!0,()=>{c.current=!1,p()}),[p]);let d=k(async()=>{let b=i.current?await i.current:r.current;return r.current=null,b},[]),m=k(async(b,S)=>{let P=++a.current,N=()=>c.current&&a.current===P,R=_("start",Ue(S)),U=$r((async()=>R&&(await R,!N())?null:await(S.micDeviceId!==L?e({deviceId:S.micDeviceId}):e()))(),r,N,b,t,o);i.current=U,await U&&N()&&t({type:"STARTED"}),i.current===U&&(i.current=null)},[t,o,e]),g=k(()=>c.current,[]),v=k(()=>r.current?.getAudioLevel?.()??null,[]);return{start:m,takeSession:d,cancel:p,isMounted:g,getAudioLevel:v}}function Wn({startSession:e=le,noticeDurationMs:t=Or}={}){let o=qe(),r=We(),i=w(r);i.current=r;let[a,c]=Pn(Bn,Gt),p=w(a.phase);p.current=a.phase;let d=w(null),m=w(se()),g=k(()=>m.current,[]),{start:v,takeSession:b,cancel:S,isMounted:P,getAudioLevel:N}=Hr(e,c,g),[R,h]=f(null),[U,C]=f(0),[H,re]=f(!1);M(()=>{let F=!0;return i.current.call(me).then(ee=>{if(!F||!Ur(ee))return;let W=ae(ee);d.current=W,(p.current==="idle"||p.current==="error")&&(m.current=W)}).catch(()=>{}),()=>{F=!1}},[]),M(()=>{if(a.phase!=="recording"){h(null),C(0);return}let F=Date.now(),ee=()=>{h(N()),C(Math.floor((Date.now()-F)/1e3))};ee();let W=setInterval(ee,100);return()=>clearInterval(W)},[N,a.phase]),M(()=>{if(!a.notice)return;let F=setTimeout(()=>{c({type:"CLEAR_NOTICE"})},t);return()=>clearTimeout(F)},[t,a.notice]);let K=k(()=>{c({type:"CLEAR_NOTICE"})},[]),ie=k(async()=>{let F=m.current;c({type:"STOP"});let ee=await b();if(!(!P()||!ee))try{let W=await ee.stop();if(!P())return;_("stop",Ue(F));let Ke=await zr(r,W);if(!P())return;jr(Ke,o,c,F)}catch(W){if(!P())return;_("error",Ue(F)),c({type:"FAILURE",message:Gn(W)})}},[o,P,r,b]),Pe=k(async()=>{let F=Vt()??d.current??ue({});m.current=F,re(!1),c({type:"START"}),await v(()=>{re(!0),ie()},F)},[ie,v]),Q=k(()=>{a.phase==="recording"||a.phase==="starting"?ie():a.phase!=="processing"&&Pe()},[Pe,ie,a.phase]);return{phase:a.phase,error:a.error,notice:a.notice,level:R,seconds:U,autoStopped:H,onClick:Q,cancel:S,clearNotice:K,beginDictation:Pe,finishDictation:ie}}var Br="Dictation",Gr={idle:"Start dictation",starting:"Stop dictation",recording:"Stop dictation",processing:"Transcribing",error:"Start dictation"},qn={position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",border:0};function Zn({startSession:e=le}){let t=be(),o=pt(),r=Vn();return On(t.micVisibility,o?.scope,r?.projectId)?n(Wr,{startSession:e}):null}function Wr({startSession:e=le}){q();let{phase:t,error:o,notice:r,onClick:i,cancel:a,clearNotice:c,level:p,seconds:d,autoStopped:m}=Wn({startSession:e}),g=t==="starting"||t==="recording"||t==="processing",v=t==="idle"&&!!r,b=`${Math.floor(d/60)}:${String(d%60).padStart(2,"0")}`;return l("div",{className:`pv-mic pv-dictation-pill pv-phase-${t} ${v?"pv-has-notice":""}`,onClick:v?c:void 0,title:v?"Click to dismiss":void 0,children:[n("button",{type:"button",className:`pv-mic-button pv-mic-${t} ${g?"pv-pill-btn-stop":"pv-idle-icon"}`,"aria-label":Br,"aria-pressed":t==="recording"||t==="starting",title:Gr[t],disabled:t==="processing",onClick:i,style:v?{display:"none"}:void 0,children:t==="idle"||t==="error"?n("svg",{viewBox:"0 0 24 24",width:"16",height:"16","aria-hidden":"true",focusable:"false",children:n("path",{d:"M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5Zm6 9h2v-3h-2v3Z",fill:"currentColor"})}):t==="processing"?n("span",{className:"pv-mic-spinner","aria-hidden":"true"}):n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("rect",{x:"6",y:"6",width:"12",height:"12",rx:"2.5",fill:"currentColor"})})}),v?l("span",{role:"status",className:"pv-notice-content",children:[n("span",{className:"pv-notice-check",children:"\u2713"}),n("span",{className:"pv-pill-status",children:r})]}):null,t==="starting"?l(Y,{children:[l("div",{className:"pv-pill-timer-badge",children:[n("div",{className:"pv-pill-dot pv-pill-dot-starting"}),n("span",{className:"pv-pill-timer-text",children:"0:00"})]}),l("div",{className:"pv-pill-center",role:"status",children:[n("span",{className:"pv-mic-spinner","aria-hidden":"true"}),n("span",{className:"pv-pill-status",children:"Requesting microphone\u2026"})]})]}):null,t==="recording"?l(Y,{children:[l("div",{className:"pv-pill-timer-badge",children:[n("div",{className:"pv-pill-dot"}),l("span",{className:"pv-pill-timer-text",children:[n("span",{className:"pv-sr-only",style:qn,children:"Recording "}),b]})]}),l("div",{className:"pv-pill-center",role:"status",children:[p===null?n("span",{className:"pv-sr-only",style:qn,children:"Audio meter unavailable"}):null,n("span",{className:`pv-pill-waveform ${p===null?"animated":""}`,"aria-label":"Microphone audio activity",role:"meter","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":Math.round((p??.3)*100),children:[.4,.7,1,.7,.4].map((S,P)=>n("span",{className:"pv-pill-waveform-bar",style:p!==null?{height:`${Math.max(3,p*S*20)}px`}:void 0},P))}),n("span",{className:"pv-pill-status",children:"Listening..."}),p!==null&&p<.015&&d>=5?n("span",{className:"pv-mic-quiet-warning",children:"No audio detected \u2014 check your microphone."}):null]})]}):null,t==="processing"?l(Y,{children:[n("div",{className:"pv-pill-timer-badge",children:n("span",{className:"pv-pill-timer-text",children:b})}),n("div",{className:"pv-pill-center",role:"status",children:l("span",{className:"pv-pill-status",children:[n("span",{className:"pv-mic-spinner","aria-hidden":"true"})," ",m?"Recording limit reached. ":"","Transcribing and refining\u2026"]})})]}):null,t==="starting"||t==="recording"?n("button",{type:"button",className:"pv-mic-cancel pv-pill-btn-cancel",onClick:a,"aria-label":"Cancel recording",title:"Cancel recording",children:n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("path",{d:"M18 6L6 18M6 6l12 12",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round"})})}):null,t==="error"&&o?n("span",{role:"alert",className:"pv-pill-status pv-mic-error",children:o}):null]})}var qr=500,Zr=5e3;function Wt(e){return e>=1e3**3?`${(e/1e3**3).toFixed(1)} GB`:`${Math.round(e/1e3**2)} MB`}function Yr(e){return e.runtime.status==="installing"||e.server.state==="starting"||e.models.some(t=>t.status==="downloading")}function Kr(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}function Xr(e){let[t,o]=f(null),[r,i]=f(null),[a,c]=f(null),p=w(!0),d=k(b=>{if(p.current){if(!Kr(b)){i("Local Whisper returned an unexpected response.");return}b.state&&o(b.state),i(b.ok?null:b.message)}},[]),m=k(()=>e.call(ne.state).then(d,()=>p.current&&i("Could not load Local Whisper status.")),[e,d]),g=k(async(b,S,P)=>{c(b);try{d(await e.call(S,P))}catch{p.current&&i("Local Whisper request failed. Try again.")}finally{p.current&&c(null)}},[e,d]);M(()=>(p.current=!0,m(),()=>{p.current=!1}),[m]);let v=t?Yr(t):!1;return M(()=>{let b=setInterval(()=>void m(),v?qr:Zr);return()=>clearInterval(b)},[v,m]),{state:t,error:r,pending:a,run:g}}function qt({tone:e}){return n("span",{"aria-hidden":"true",style:{width:9,height:9,borderRadius:"50%",marginTop:4,flex:"none",background:{ok:"var(--ps-success)",warn:"var(--ps-warn)",err:"var(--ps-danger)",busy:"var(--ps-accent)",idle:"var(--ps-text-muted)"}[e]}})}function Yn({value:e,label:t}){let o=Math.round(e*100);return n("div",{role:"progressbar","aria-label":t,"aria-valuenow":o,"aria-valuemin":0,"aria-valuemax":100,style:{height:5,minWidth:80,background:"var(--ps-bg-hover)",borderRadius:3,overflow:"hidden"},children:n("div",{style:{width:`${o}%`,height:"100%",background:"var(--ps-accent)"}})})}var gt={display:"flex",gap:10,alignItems:"flex-start",padding:"10px 12px",borderRadius:6,border:"1px solid var(--ps-border)"},ve={color:"var(--ps-text-muted)",fontSize:11};function Jr(e){let{runtime:t,server:o,activeModelId:r}=e;return t.status==="not-installed"?{tone:"idle",title:"Runtime not installed",detail:`whisper.cpp ${t.version} \xB7 requires ${t.requirements.join(", ")||"no extra components"}`,action:{label:"Install runtime",method:ne.installRuntime,primary:!0}}:t.status==="installing"?{tone:"busy",title:`Installing runtime\u2026 ${Math.round((t.progress??0)*100)}%`,detail:"Verifying the download as it arrives.",action:{label:"Cancel",method:ne.cancelRuntimeInstall}}:o.state==="running"?{tone:"ok",title:"Running",detail:`Model ${o.modelId} \xB7 on this device (127.0.0.1) \xB7 managed by Prompt Voice`,action:{label:"Stop",method:ne.stop}}:o.state==="starting"?{tone:"busy",title:"Starting\u2026",detail:`Loading model ${o.modelId}.`}:o.state==="crashed"?{tone:"err",title:"Stopped unexpectedly",detail:`Exit code ${o.exitCode??"unknown"}. Logs contain no audio or transcripts.`,action:{label:"Restart",method:ne.start,primary:!0}}:r?{tone:"warn",title:"Stopped",detail:"Starts automatically when you dictate.",action:{label:"Start",method:ne.start}}:{tone:"warn",title:"Runtime installed",detail:"Download a model below and choose Use to start."}}function Qr({model:e,state:t,pending:o,onRun:r}){let i=t.activeModelId===e.id,a=t.runtime.status==="installed"&&!i,c=g=>`${g}:${e.id}`,p={modelId:e.id},d=null,m;return e.status==="downloading"?(d=l(Y,{children:[n(Yn,{value:e.progress??0,label:`Downloading ${e.label}`}),l("span",{style:ve,children:[Math.round((e.progress??0)*100),"% of ",Wt(e.sizeBytes)]})]}),m=n("button",{type:"button",className:"ps-btn",onClick:()=>r(c("cancel"),ne.cancelModelDownload,p),children:"Cancel"})):e.status==="available"?m=l("button",{type:"button",className:"ps-btn",disabled:o===c("download"),onClick:()=>r(c("download"),ne.downloadModel,p),children:["Download ",Wt(e.sizeBytes)]}):(d=i?n("span",{className:"ps-tag",children:"Active"}):o===c("use")?n("span",{className:"ps-tag",children:"Loading\u2026"}):n("span",{className:"ps-tag",children:"Installed"}),m=l(Y,{children:[a&&n("button",{type:"button",className:"ps-btn",disabled:o!==null,onClick:()=>r(c("use"),ne.selectModel,p),children:"Use"}),n("button",{type:"button",className:"ps-btn ps-btn-danger",disabled:i||o!==null,title:i?"Choose another model before removing this one":void 0,"aria-label":`Remove ${e.label}`,onClick:()=>r(c("remove"),ne.removeModel,p),children:"Remove"})]})),l("tr",{style:i?{background:"color-mix(in srgb, var(--ps-accent) 10%, transparent)"}:void 0,children:[l("td",{style:{padding:"8px 6px"},children:[n("strong",{children:e.label})," ",e.recommended&&n("span",{className:"ps-tag",children:"Recommended"})]}),l("td",{style:{padding:"8px 6px",...ve},children:[Wt(e.sizeBytes)," disk",e.memoryEstimate?l(Y,{children:[n("br",{}),e.memoryEstimate," RAM"]}):null]}),n("td",{style:{padding:"8px 6px"},children:n("div",{style:{display:"flex",flexDirection:"column",gap:4},children:d})}),n("td",{style:{padding:"8px 6px",textAlign:"right",whiteSpace:"nowrap"},children:n("div",{style:{display:"inline-flex",gap:6},children:m})})]})}function ei(e,t){let o=e==="local-whisper";return o&&t==="none"?{offline:!0,text:"Audio and text stay on this device."}:o?{offline:!1,text:"Audio stays on this device. Cleanup sends the transcript to your selected cleanup model."}:{offline:!1,text:"Audio leaves this device for transcription."}}function Kn({rpc:e,sttProvider:t,llmProvider:o,onApplyPreset:r}){let{state:i,error:a,pending:c,run:p}=Xr(e),d=ei(t,o),m=i?.runtime.status==="installed"&&i.activeModelId!==null;return l("section",{className:"ps-pane",style:{flex:"none"},"aria-labelledby":"ps-lw-title",children:[l("div",{className:"ps-pane-header",children:[n("h2",{id:"ps-lw-title",className:"ps-pane-title",style:{margin:0},children:"Local Whisper"}),n("span",{className:"ps-tag",children:i?i.platform.supported?m?"Ready":"Not set up":"Unavailable":"Loading\u2026"})]}),l("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[n("p",{style:{...ve,margin:0},children:"Transcribe on this device. Audio is never sent anywhere when Local Whisper is the speech provider."}),(a||i?.lastError)&&n("div",{role:"alert",style:{...gt,borderColor:"var(--ps-danger)",color:"var(--ps-danger)",fontSize:12},children:a??i?.lastError?.message}),i&&!i.platform.supported&&l("div",{style:gt,children:[n(qt,{tone:"err"}),l("div",{children:[n("strong",{children:"Not available on this computer"}),n("div",{style:ve,children:i.platform.message})]})]}),i?.platform.supported&&n(ti,{state:i,pending:c,onRun:p}),i?.platform.supported&&l("div",{children:[l("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"baseline"},children:[n("span",{className:"ps-field-label",children:"Models \xB7 multilingual"}),n("span",{style:ve,children:"Stored in this computer's app data"})]}),l("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:12},children:[n("thead",{children:n("tr",{children:["Model","Size","Status",""].map(g=>n("th",{style:{textAlign:"left",...ve,fontWeight:600,padding:"4px 6px"},children:g},g))})}),n("tbody",{children:i.models.map(g=>n(Qr,{model:g,state:i,pending:c,onRun:p},g.id))})]})]}),l("div",{style:gt,children:[n(qt,{tone:d.offline?"ok":"warn"}),l("div",{style:{flex:1},children:[n("strong",{children:d.offline?"Fully offline":"Not fully offline"}),n("div",{style:ve,children:d.text})]}),!d.offline&&n("button",{type:"button",className:"ps-btn",onClick:()=>r({sttProvider:"local-whisper",llmProvider:"none"}),children:"Use offline preset"})]})]})]})}function ti({state:e,pending:t,onRun:o}){let r=Jr(e);return l("div",{style:gt,"aria-live":"polite",children:[n(qt,{tone:r.tone}),l("div",{style:{flex:1,minWidth:0},children:[n("strong",{children:r.title}),n("div",{style:ve,children:r.detail}),e.runtime.status==="installing"&&n("div",{style:{marginTop:6},children:n(Yn,{value:e.runtime.progress??0,label:"Installing runtime"})})]}),r.action&&n("button",{type:"button",className:r.action.primary?"ps-btn ps-btn-primary":"ps-btn",disabled:t==="runtime",onClick:()=>o("runtime",r.action.method),children:r.action.label})]})}function ni({statusMessage:e}){return l("div",{className:"ps-vis-header",children:[l("div",{children:[n("h3",{id:"ps-visibility-heading",className:"ps-vis-title",children:"Where Prompt Voice Appears"}),n("p",{className:"ps-vis-subtitle",children:"Control whether Prompt Voice surfaces on the main Home screen, inside Projects, and in thread composers."})]}),n("div",{className:"ps-vis-status-slot",children:e?n("span",{role:"status",className:"ps-vis-status",children:e}):null})]})}function oi({activePreset:e,disabled:t,onSelect:o}){return n("div",{className:"ps-vis-presets",role:"group","aria-label":"Surface visibility presets",children:Ft.map(r=>{let i=e===r.id;return l("button",{type:"button",className:`ps-vis-preset-card ${i?"active":""}`,"aria-pressed":i,disabled:t,onClick:()=>o(r.settings),children:[n("span",{className:"ps-vis-preset-label",children:r.label}),n("span",{className:"ps-vis-preset-desc",children:r.description})]},r.id)})})}function Xn({labelId:e,title:t,helpText:o,checked:r,disabled:i,onToggle:a}){return l("div",{className:"ps-toggle-card",children:[l("div",{className:"ps-toggle-copy",children:[n("span",{id:e,className:"ps-toggle-title",children:t}),n("small",{className:"ps-vis-help",children:o})]}),n("button",{type:"button",className:"ps-switch",role:"switch","aria-checked":r,"aria-labelledby":e,disabled:i,onClick:a})]})}function ri({value:e,disabled:t,onChange:o}){return l("div",{className:"ps-toggle-card ps-vis-select-row",children:[l("div",{className:"ps-toggle-copy",children:[n("label",{htmlFor:"ps-vis-mic-select",className:"ps-toggle-title",children:"Composer mic button placement"}),n("small",{className:"ps-vis-help",children:"Choose which chat composers display the voice dictation mic pill."})]}),n("select",{id:"ps-vis-mic-select","aria-label":"Composer mic button placement",className:"ps-select ps-vis-select",value:e,disabled:t,onChange:r=>o(r.target.value),children:jt.map(r=>n("option",{value:r,children:Mn[r]},r))})]})}function bt(e){q();let t=be(),o=Ln(t),[r,i]=f(!1),[a,c]=f(null),[p,d]=f(null),m=async g=>{i(!0),d(null),c("Saving\u2026");try{await mt(Le,g),c("Saved")}catch(v){c(null),d(v instanceof Error?v.message:"Could not update visibility settings.")}finally{i(!1)}};return l("section",{className:"ps-vis-section","aria-labelledby":"ps-visibility-heading",children:[n(ni,{statusMessage:a}),p?n("div",{role:"alert",className:"ps-vis-error",children:p}):null,n(oi,{activePreset:o,disabled:r,onSelect:g=>void m(g)}),l("div",{className:"ps-vis-controls",children:[n(Xn,{labelId:"ps-vis-home-label",title:"Main Home screen widget",helpText:"Show a quick-dictate & Prompt Studio card on Zana\u2019s main Home screen.",checked:t.showHomeWidget,disabled:r,onToggle:()=>void m({showHomeWidget:!t.showHomeWidget})}),n(Xn,{labelId:"ps-vis-projects-label",title:"Prompt Studio tab in projects",helpText:"Display a dedicated Prompt Studio tab inside each project with project-scoped drafts.",checked:t.showInProjects,disabled:r,onToggle:()=>void m({showInProjects:!t.showInProjects})}),n(ri,{value:t.micVisibility,disabled:r,onChange:g=>void m({micVisibility:g})})]}),l("p",{className:"ps-vis-note",children:["Tip: You can hide or reorder the global ",n("strong",{children:"Prompt Studio"})," item in Zana\u2019s left sidebar using Zana\u2019s sidebar customize menu."]})]})}function Zt(e){if(typeof e!="string")return[];let t=new Set,o=/[,\n]/;for(let r of e.split(o)){let i=r.trim().slice(0,80);if(i&&t.add(i),t.size>=200)break}return[...t]}function Jn(e,t){let o=Zt(t);if(o.length===0)return[...e];let r=new Set(e),i=[...e];for(let a of o){if(i.length>=200)break;r.has(a)||(r.add(a),i.push(a))}return i}function Yt(e){return e.join(`
`)}var vt=[{code:"auto",label:"Detect automatically"},{code:"af",label:"Afrikaans"},{code:"ar",label:"Arabic"},{code:"hy",label:"Armenian"},{code:"az",label:"Azerbaijani"},{code:"eu",label:"Basque"},{code:"be",label:"Belarusian"},{code:"bn",label:"Bengali"},{code:"bs",label:"Bosnian"},{code:"bg",label:"Bulgarian"},{code:"ca",label:"Catalan"},{code:"zh",label:"Chinese"},{code:"hr",label:"Croatian"},{code:"cs",label:"Czech"},{code:"da",label:"Danish"},{code:"nl",label:"Dutch"},{code:"en",label:"English"},{code:"et",label:"Estonian"},{code:"fi",label:"Finnish"},{code:"fr",label:"French"},{code:"gl",label:"Galician"},{code:"ka",label:"Georgian"},{code:"de",label:"German"},{code:"el",label:"Greek"},{code:"gu",label:"Gujarati"},{code:"he",label:"Hebrew"},{code:"hi",label:"Hindi"},{code:"hu",label:"Hungarian"},{code:"is",label:"Icelandic"},{code:"id",label:"Indonesian"},{code:"ga",label:"Irish"},{code:"it",label:"Italian"},{code:"ja",label:"Japanese"},{code:"kn",label:"Kannada"},{code:"kk",label:"Kazakh"},{code:"ko",label:"Korean"},{code:"lv",label:"Latvian"},{code:"lt",label:"Lithuanian"},{code:"mk",label:"Macedonian"},{code:"ms",label:"Malay"},{code:"ml",label:"Malayalam"},{code:"mt",label:"Maltese"},{code:"mr",label:"Marathi"},{code:"ne",label:"Nepali"},{code:"no",label:"Norwegian"},{code:"fa",label:"Persian"},{code:"pl",label:"Polish"},{code:"pt",label:"Portuguese"},{code:"pa",label:"Punjabi"},{code:"ro",label:"Romanian"},{code:"ru",label:"Russian"},{code:"sr",label:"Serbian"},{code:"sk",label:"Slovak"},{code:"sl",label:"Slovenian"},{code:"es",label:"Spanish"},{code:"sw",label:"Swahili"},{code:"sv",label:"Swedish"},{code:"tl",label:"Tagalog"},{code:"ta",label:"Tamil"},{code:"te",label:"Telugu"},{code:"th",label:"Thai"},{code:"tr",label:"Turkish"},{code:"uk",label:"Ukrainian"},{code:"ur",label:"Urdu"},{code:"vi",label:"Vietnamese"},{code:"cy",label:"Welsh"}],Ye="en",Kt=vt.filter(e=>e.code!=="auto");function Xt(e){if(typeof e!="string")return;let t=e.trim().toLowerCase();if(t)return Kt.find(o=>o.code.toLowerCase()===t||o.label.toLowerCase()===t)}function eo(){if(!(typeof navigator>"u"))return navigator.mediaDevices}function ii(e){return e.replace(/^default\s*[-–:]\s*/i,"").trim()}function to(e){let t=e instanceof Error?e.name:"";return t==="NotAllowedError"||t==="SecurityError"}function Qn(e){let t=e.filter(p=>p.kind==="audioinput"),o=t.some(p=>!!p.label?.trim()),r=null,i=[],a=new Set,c=1;for(let p of t){let d=p.label?.trim()??"";if(p.deviceId===L){d&&(r=ii(d)||d);continue}!p.deviceId||a.has(p.deviceId)||(a.add(p.deviceId),i.push({deviceId:p.deviceId,label:d||`Microphone ${c}`,isDefault:!1}),c++)}return{devices:i,defaultDeviceLabel:r,labelsAvailable:o}}async function si(e){if(!e.getUserMedia||!e.enumerateDevices)return{ok:!1,permissionDenied:!1};try{return(await e.getUserMedia({audio:!0})).getTracks().forEach(o=>o.stop()),{ok:!0,rawDevices:await e.enumerateDevices()}}catch(t){return to(t)?{ok:!1,permissionDenied:!0}:(console.warn("Prompt Voice failed to refresh audio input devices",t),{ok:!1,permissionDenied:!1})}}async function no(e={}){let t=e.mediaDevices??eo();if(!t?.enumerateDevices)return{devices:[],defaultDeviceLabel:null,labelsAvailable:!1,permissionDenied:!1,supported:!1,error:null};let o;try{o=await t.enumerateDevices()}catch(a){return console.warn("Prompt Voice failed to enumerate audio input devices",a),{devices:[],defaultDeviceLabel:null,labelsAvailable:!1,permissionDenied:to(a),supported:!0,error:"Could not list microphones. Using System default."}}let r=Qn(o),i=!1;if(e.requestPermissionIfUnlabeled&&!r.labelsAvailable){let a=await si(t);a.ok?r=Qn(a.rawDevices):i=a.permissionDenied}return{...r,permissionDenied:i,supported:!0,error:null}}function oo(e,t=eo()){if(!t?.addEventListener||!t?.removeEventListener)return()=>{};let o=()=>e();return t.addEventListener("devicechange",o),()=>t.removeEventListener?.("devicechange",o)}function ro(){let[e,t]=f([]),[o,r]=f(null),[i,a]=f(!0),[c,p]=f(!1),[d,m]=f(null),[g,v]=f(!1),b=w(!0),S=w(0),P=k(async(N=!1)=>{let R=++S.current;b.current&&v(!0);try{let h=await no({requestPermissionIfUnlabeled:N});if(!b.current||S.current!==R)return;t(h.devices),r(h.defaultDeviceLabel),a(h.labelsAvailable),p(h.permissionDenied),m(h.error)}catch(h){if(console.warn("Prompt Voice audio device lookup failed",h),!b.current||S.current!==R)return;t([]),m("Could not list microphones. Using System default.")}finally{b.current&&S.current===R&&v(!1)}},[]);return M(()=>{b.current=!0,P(!1);let N=oo(()=>{P(!1)});return()=>{b.current=!1,S.current++,N()}},[P]),{devices:e,defaultDeviceLabel:o,labelsAvailable:i,permissionDenied:c,error:d,isRefreshing:g,refresh:P}}var ci={"Voice & transcription":[{key:"sttProvider",label:"Speech-to-text provider",options:["system","google-gemini","openai","local-whisper"]},{key:"inputLanguage",label:"Input language",options:vt.map(e=>e.code),help:"Spoken language for transcription, or Detect automatically."},{key:"dictionary",label:"Personal dictionary",help:"Add specific names, acronyms, or technical terms to guarantee accurate spelling."}],"Prompt Voice":[{key:"tone",label:"Cleanup tone",options:[...Tn],help:"Fixes grammar and clarity in the original language without extending text length."},{key:"customPrompt",label:"Custom cleanup instructions",multiline:!0}],Connections:[]},Jt={sttProvider:"system",inputLanguage:"auto",tone:"standard"},pi={...Object.fromEntries(vt.map(e=>[e.code,e.label])),standard:"Standard (Fix & clarify)",casual:"Casual",conversational:"Conversational",formal:"Professional",technical:"Technical",custom:"Custom",system:"Zana voice",none:"Off",assistant:"Zana assistant",openai:"OpenAI",anthropic:"Anthropic",google:"Google AI","google-gemini":"Google Gemini","local-whisper":"Local Whisper (on this device)"};function di(e,t,o){return e.error?{warn:!0,text:e.error}:e.permissionDenied?{warn:!0,text:"Microphone permission denied. Allow microphone access in system settings to see device names."}:t.micDeviceId!==L&&!o?{warn:!0,text:"Selected microphone is currently disconnected. Recording will fall back to System default until reconnected."}:!e.labelsAvailable&&e.devices.length>0?{warn:!1,text:"Device names are hidden until microphone access is granted. Click Refresh to detect names."}:t.micDeviceId===L?{warn:!1,text:"Uses your OS default input device. Saved selection applies to Prompt Studio and Composer dictation."}:{warn:!1,text:`Using ${o?.label??(t.micLabel||t.micDeviceId)}. Saved until you choose another mic.`}}function ui({prefs:e,audio:t,onSelect:o}){let r=t.devices.find(d=>d.deviceId===e.micDeviceId),i=e.micDeviceId!==L&&!r,a=di(t,e,r),c=t.defaultDeviceLabel?`System default (${t.defaultDeviceLabel})`:"System default",p=d=>{if(d===L){o(L,"");return}let m=t.devices.find(g=>g.deviceId===d);o(d,m?.label??e.micLabel)};return l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-mic-select",className:"ps-field-label",children:"Input microphone"}),l("div",{className:"ps-mic-row",children:[l("select",{id:"ps-mic-select","aria-label":"Input microphone",className:"ps-select",value:e.micDeviceId,onChange:d=>p(d.target.value),children:[n("option",{value:L,children:c}),t.devices.map(d=>n("option",{value:d.deviceId,children:d.label},d.deviceId)),i&&n("option",{value:e.micDeviceId,children:`${e.micLabel||e.micDeviceId} (Disconnected)`})]}),n("button",{type:"button",className:"ps-btn",onClick:()=>void t.refresh(!0),disabled:t.isRefreshing,"aria-label":"Refresh microphones",title:"Refresh connected audio input devices",children:t.isRefreshing?"Refreshing\u2026":"\u21BB Refresh"})]}),l("div",{className:"ps-audio-status",role:t.error?"alert":void 0,children:[n("span",{className:`ps-audio-dot ${a.warn?"warn":""}`,"aria-hidden":"true"}),n("span",{children:a.text})]})]})}function mi({prefs:e,onToggle:t,onVolumeChange:o}){let r=()=>{e.soundCuesEnabled&&_("start",{enabled:!0,volume:e.soundCuesVolume})};return l(Y,{children:[l("div",{className:"ps-toggle-card",children:[l("div",{className:"ps-toggle-copy",children:[n("span",{id:"ps-sound-cues-label",className:"ps-toggle-title",children:"Sound cues & chimes"}),n("small",{style:{color:"var(--ps-text-muted)"},children:"Play a subtle chime when dictation starts, finishes, or encounters an error."})]}),n("button",{type:"button",className:"ps-switch",role:"switch","aria-checked":e.soundCuesEnabled,"aria-labelledby":"ps-sound-cues-label",onClick:t})]}),l("div",{className:`ps-volume-card ${e.soundCuesEnabled?"":"disabled"}`,children:[l("div",{className:"ps-volume-header",children:[n("label",{htmlFor:"ps-chime-volume",className:"ps-field-label",children:"Chime volume"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 9px",fontSize:11},disabled:!e.soundCuesEnabled,onClick:r,children:"Test chime"})]}),l("div",{className:"ps-volume-controls",children:[n("input",{id:"ps-chime-volume",type:"range",className:"ps-volume-slider","aria-label":"Chime volume",min:0,max:100,step:5,value:e.soundCuesVolume,disabled:!e.soundCuesEnabled,onChange:i=>o(Number(i.target.value)),onPointerUp:r,onKeyUp:i=>{["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(i.key)&&r()}}),l("span",{className:"ps-volume-pct",children:[e.soundCuesVolume,"%"]})]})]})]})}function fi({values:e,onSave:t}){let o=G(()=>ue(e),[e]),r=ro();return l("section",{className:"ps-pane",style:{flex:"none"},"aria-labelledby":"ps-audio-feedback-title",children:[l("div",{className:"ps-pane-header",children:[n("h2",{id:"ps-audio-feedback-title",className:"ps-pane-title",style:{margin:0},children:"Audio & Feedback"}),n("button",{type:"button",className:"ps-btn",onClick:()=>t({micDeviceId:L,micLabel:"",soundCuesEnabled:String(!0),soundCuesVolume:String(75)}),children:"Reset"})]}),l("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[n(ui,{prefs:o,audio:r,onSelect:(c,p)=>t({micDeviceId:c,micLabel:p})}),n(mi,{prefs:o,onToggle:()=>{let c=!o.soundCuesEnabled;t({soundCuesEnabled:String(c)}),c&&_("start",{enabled:!0,volume:o.soundCuesVolume})},onVolumeChange:c=>t({soundCuesVolume:String(c)})})]})]})}function gi({terms:e,atLimit:t,onRemove:o,onClearAll:r}){return l(Y,{children:[n("div",{className:"ps-dict-well",children:e.length>0?n("ul",{className:"ps-dict-pills","aria-label":"Dictionary terms",children:e.map(i=>l("li",{className:"ps-dict-pill",children:[n("span",{className:"ps-dict-pill-text",children:i}),n("button",{type:"button",className:"ps-dict-pill-remove",onClick:()=>o(i),"aria-label":`Remove ${i}`,title:`Remove ${i}`,children:"\xD7"})]},i))}):n("span",{className:"ps-dict-empty",children:"No terms added yet. Type a term above or paste a comma-separated list."})}),l("div",{className:"ps-dict-footer",children:[l("span",{className:"ps-dict-count",children:[e.length===1?"1 term active":`${e.length} terms active`,t?` (max ${200})`:""]}),n("button",{type:"button",className:"ps-btn ps-dict-clear-btn",onClick:r,disabled:e.length===0,children:"Clear all"})]})]})}function bi({label:e,help:t,value:o,resetSignal:r,onChange:i}){let[a,c]=f(""),p=G(()=>Zt(o),[o]),d=p.length>=200;M(()=>{r>0&&c("")},[r]);let m=()=>{let v=a.trim();if(!v||d)return;let b=Jn(p,v);c(""),b.length!==p.length&&i(Yt(b))};return l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-dictionary-input",className:"ps-field-label",children:e}),t&&n("small",{style:{color:"var(--ps-text-muted)"},children:t}),l("div",{className:"ps-dict-container",children:[l("div",{className:"ps-dict-input-row",children:[n("input",{id:"ps-dictionary-input",type:"text",className:"ps-dict-input",value:a,onChange:v=>c(v.target.value),onKeyDown:v=>{v.key==="Enter"&&(v.preventDefault(),m())},onPaste:v=>{let b=v.clipboardData?.getData("text");if(!b||!/[\r\n]/.test(b))return;v.preventDefault();let S=v.currentTarget.selectionStart??a.length,P=v.currentTarget.selectionEnd??a.length;c(a.slice(0,S)+b.replace(/[\r\n]+/g,", ")+a.slice(P))},placeholder:"Type a term and press Enter (or paste comma-separated)...",disabled:d}),n("button",{type:"button",className:"ps-btn ps-btn-primary ps-dict-add-btn",onClick:m,disabled:!a.trim()||d,children:"+ Add"})]}),n(gi,{terms:p,atLimit:d,onRemove:v=>i(Yt(p.filter(b=>b!==v))),onClearAll:()=>{c(""),i("")}})]})]})}function vi({field:e,values:t,resetSignal:o,onSave:r}){if(e.key==="dictionary")return n(bi,{label:e.label,help:e.help,value:t.dictionary??"",resetSignal:o,onChange:c=>r({dictionary:c})});let i=t[e.key]??Jt[e.key]??"",a=e.options&&e.key==="inputLanguage"&&i&&!e.options.includes(i)?[...e.options,i]:e.options;return l("label",{className:"ps-field-group",children:[n("span",{className:"ps-field-label",children:e.label}),a?n("select",{className:"ps-select",value:i,onChange:c=>r({[e.key]:c.target.value}),children:a.map(c=>n("option",{value:c,children:pi[c]??c},c))}):e.multiline?n("textarea",{className:"ps-custom-prompt-input",value:t[e.key]??"",onChange:c=>r({[e.key]:c.target.value})}):n("input",{type:e.secret?"password":"text",className:"ps-select",value:t[e.key]??"",onChange:c=>r({[e.key]:c.target.value}),placeholder:e.secret?"Enter API key\u2026":void 0}),e.help&&n("small",{style:{color:"var(--ps-text-muted)"},children:e.help})]})}function so({rpc:e,onBack:t,pluginId:o}){q();let[r,i]=f({}),[a,c]=f("Loading\u2026"),[p,d]=f(null),[m,g]=f(0),v=w(0),b=w({}),S=w(e);S.current=e,M(()=>{let N=!0;return S.current.call(me).then(R=>{if(!N)return;let h=R||{};b.current=h,i(h),ae(h),c("Saved")}).catch(()=>{N&&c("Could not load settings")}),()=>{N=!1}},[]);let P=N=>{let R=++v.current,h=b.current={...b.current,...N};i(h),ae(h),c("Saving\u2026"),S.current.call(fe,h).then(()=>{R===v.current&&(d(null),c("Saved"))}).catch(()=>{R===v.current&&(d(h),c("Could not save settings."))})};return n("div",{className:"ps-workspace",children:n("main",{className:"ps-editor-canvas",style:{overflowY:"auto"},children:l("div",{style:{width:"100%",maxWidth:760,margin:"0 auto",display:"flex",flexDirection:"column",gap:12},children:[l("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12},children:[l("div",{children:[n("h1",{style:{fontSize:18,margin:"4px 0"},children:"Settings"}),n("span",{style:{color:"var(--ps-text-muted)",fontSize:12},children:"Configure voice and cleanup defaults"})]}),n("button",{className:"ps-btn",onClick:t,children:"\u2190 Back to Studio"})]}),l("div",{style:{color:"var(--ps-text-muted)",fontSize:11},children:[n("span",{role:"status",children:a}),p&&n("button",{className:"ps-btn",onClick:()=>P(p),children:"Retry"})]}),n(fi,{values:r,onSave:P}),Object.entries(ci).map(([N,R])=>l(An.Fragment,{children:[l("section",{className:"ps-pane",style:{flex:"none"},children:[l("div",{className:"ps-pane-header",children:[n("h2",{className:"ps-pane-title",style:{margin:0},children:N}),N!=="Connections"&&n("button",{className:"ps-btn",onClick:()=>{N==="Voice & transcription"&&g(h=>h+1),P(Object.fromEntries(R.map(h=>[h.key,Jt[h.key]??""])))},children:"Reset"})]}),l("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[N==="Connections"&&n("p",{children:"Manage API keys in Zana\u2019s Prompt Voice plugin settings."}),R.filter(h=>!(h.key==="customPrompt"&&r.tone!=="custom")).map(h=>n(vi,{field:h,values:r,resetSignal:m,onSave:P},h.key))]})]}),N==="Voice & transcription"&&n(Kn,{rpc:e,sttProvider:r.sttProvider??Jt.sttProvider,llmProvider:r.llmProvider,onApplyPreset:P})]},N)),o?n("section",{className:"ps-pane",style:{flex:"none",padding:14},children:n(bt,{pluginId:o})}):null]})})})}function ao(e){return e?e.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]+/gu)||[]:[]}var lo=1200;function co(e,t){if(!e&&!t)return[];if(e===t)return[{type:"unchanged",text:e}];if(!e)return[{type:"added",text:t}];if(!t)return[{type:"removed",text:e}];let o=ao(e),r=ao(t),i=o.length,a=r.length;if(i>lo||a>lo)return[{type:"removed",text:e},{type:"added",text:t}];let c=a+1,p=new Uint32Array((i+1)*c);for(let b=1;b<=i;b++){let S=b*c,P=(b-1)*c,N=o[b-1];for(let R=1;R<=a;R++)if(N===r[R-1])p[S+R]=p[P+(R-1)]+1;else{let h=p[S+(R-1)],U=p[P+R];p[S+R]=h>U?h:U}}let d=[],m=i,g=a;for(;m>0||g>0;){let b=m*c,S=(m-1)*c;m>0&&g>0&&o[m-1]===r[g-1]?(d.push({type:"unchanged",text:o[m-1]}),m--,g--):g>0&&(m===0||p[b+(g-1)]>=p[S+g])?(d.push({type:"added",text:r[g-1]}),g--):m>0&&(g===0||p[b+(g-1)]<p[S+g])&&(d.push({type:"removed",text:o[m-1]}),m--)}d.reverse();let v=[];for(let b of d)v.length>0&&v[v.length-1].type===b.type?v[v.length-1].text+=b.text:v.push({...b});return v}var en=`
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
`;async function Qt(e){if(!e)return!1;if(typeof navigator<"u"&&navigator.clipboard&&typeof navigator.clipboard.writeText=="function")try{return await navigator.clipboard.writeText(e),!0}catch{}if(typeof document<"u")try{let t=document.createElement("textarea");t.value=e,t.setAttribute("readonly",""),t.style.position="fixed",t.style.top="-9999px",t.style.left="-9999px",t.style.opacity="0",document.body.appendChild(t),t.focus(),t.select();let o=document.execCommand("copy");if(document.body.removeChild(t),o)return!0}catch{}return!1}var po="zcc:prompt-voice:studio-draft:v1";function hi(e){return e?`${po}:project:${e}`:po}var ht=[{id:"standard",label:"Standard",desc:"Fix grammar & clarity while keeping your natural tone and length."},{id:"casual",label:"Casual",desc:"Relaxed, everyday phrasing \u2014 natural without sounding stiff."},{id:"conversational",label:"Conversational",desc:"Warm, natural, and easy to read \u2014 like speaking clearly."},{id:"formal",label:"Professional",desc:"Polished, respectful phrasing for emails, PRs, or stakeholders."},{id:"technical",label:"Technical",desc:"Precise, unambiguous engineering phrasing without fluff."}],A={improve:"improve",executive:"executive",spec:"spec",custom:"custom",translate:"translate"},xi=new Set(Object.values(A)),tn=[{id:A.improve,title:"Improve writing",icon:"\u2728",desc:"Fix grammar, phrasing & punctuation without extending length.",tone:"standard"},{id:A.executive,title:"Summarize",icon:"\u26A1",desc:"Condense into punchy bullet points.",instruction:"Summarize the core request into crisp, high-level executive bullet points.",tone:"formal"},{id:A.spec,title:"Create a technical spec",icon:"\u{1F4D0}",desc:"Format with Goals, Context, Steps.",instruction:"Transform into a structured technical spec with ## Goal, ## Architecture, and ## Implementation Steps.",tone:"technical"}];function yi(e,t){switch(e){case A.improve:return t?"Improving...":"Improve text";case A.executive:return t?"Summarizing...":"Summarize";case A.spec:return t?"Creating spec...":"Create spec";case A.custom:return t?"Running...":"Run instructions";case A.translate:return t?"Translating...":"Translate";default:return t?"Transforming...":"Transform text"}}function Si(e,t,o){switch(e){case A.improve:return`\u2B07 Improve writing \xB7 ${t}`;case A.translate:return`\u2B07 Translate \xB7 ${Xt(o)?.label??o}`;case A.custom:return"\u2B07 Custom instructions";default:return`\u2B07 ${tn.find(r=>r.id===e)?.title??"Refine pipeline"}`}}var wi={system:"Host STT",openai:"OpenAI","google-gemini":"Google Gemini","local-whisper":"Local Whisper"};function uo(e){return e==="openai"||e==="google-gemini"}var Ai=[{id:"google-gemini",label:"Google Gemini"},{id:"local-whisper",label:"Local Whisper (on this device)"},{id:"openai",label:"OpenAI (Whisper)"},{id:"system",label:"System (Zana Voice)"}],Pi=[{id:"assistant",displayName:"Zana Assistant",models:[{id:"assistant",key:"assistant",label:"Default Assistant (Host Agent)",providerId:"assistant"}]}],mo=[1500,3e3];function fo({focusWindow:e,bringBack:t}){return q(),l("div",{className:"ps-container","data-testid":"ps-detached-placeholder",children:[n("style",{children:en}),n("div",{className:"ps-empty-state",children:l("div",{className:"ps-empty-card",children:[n("span",{style:{fontSize:22},"aria-hidden":"true",children:"\u{1F399}\uFE0F"}),n("div",{style:{fontSize:14,fontWeight:600},children:"Prompt Studio is open in its own window"}),n("div",{style:{fontSize:12,color:"var(--ps-text-muted)"},children:"Focus the floating window or bring Prompt Studio back to this project tab."}),l("div",{style:{display:"flex",gap:8,marginTop:4},children:[n("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:e,children:"Focus Window"}),n("button",{type:"button",className:"ps-btn",onClick:t,children:"Bring Back"})]})]})})]})}function nn({pluginId:e,projectId:t,headerActions:o,startSession:r=le}){q();let[i,a]=f(!1),c=ut(e),p=Un(),d=pt(),m=dt(),g=be(),v=d?.providerId,b=d?.familyId,S=hi(t),P=w(!1),[N,R]=f(null),[h,U]=f(""),[C,H]=f(""),[re,K]=f(!1),[ie,Pe]=f(!1),[Q,F]=f(!1),[ee,W]=f(null),[Ke,on]=f(!1),[rn,sn]=f(null),[Ce,an]=f(null),[Xe,Je]=f(!0),[ln,xt]=f(null),[Ie,Ee]=f("assistant"),[ze,Re]=f("assistant"),[he,cn]=f(null),[Ci,Qe]=f(null),[je,pn]=f(!0),[dn,go]=f(null),[Fe,yt]=f(!1),[O,oe]=f(A.improve),[Te,xe]=f("standard"),[$e,et]=f(Ye),[tt,un]=f(""),[ce,mn]=f(!1),[fn,E]=f(null),[B,He]=f("system"),[St,nt]=f(""),[wt,gn]=f(!0),[At,ye]=f(null),[pe,Pt]=f(!1),[bo,bn]=f(0),[vo,Ct]=f(null),[vn,ho]=f(()=>se()),hn=w(vn);hn.current=vn;let de=w(null),ke=w(null),Ne=w(null),xn=w(null);M(()=>{try{let s=localStorage.getItem(S);if(s){let u=JSON.parse(s);U(typeof u.inputText=="string"?u.inputText:""),H(typeof u.outputText=="string"?u.outputText:""),Ee(u.selectedProviderId||"assistant"),Re(u.selectedModelId||"assistant"),P.current=u.userManuallySelected===!0,He(u.sttProvider||"system"),nt(u.sttModel||""),u.selectedPresetId==="polish"?(oe(A.improve),xe("standard")):u.selectedPresetId==="chat"?(oe(A.improve),xe("conversational")):typeof u.selectedPresetId=="string"&&xi.has(u.selectedPresetId)?oe(u.selectedPresetId):oe(A.improve),typeof u.selectedToneId=="string"&&ht.some(x=>x.id===u.selectedToneId)?xe(u.selectedToneId):u.selectedPresetId!=="chat"&&xe("standard"),et(Xt(u.targetLanguage)?.code??Ye)}else U(""),H(""),Ee("assistant"),Re("assistant"),He("system"),nt(""),oe(A.improve),xe("standard"),et(Ye),P.current=!1}catch{}R(S)},[S]);let Be=w(c);Be.current=c;let X=w(!0),It=w(0),ot=w(0),rt=w(0),it=w(null),st=k(s=>{s&&(s.llmProvider&&(Qe(s.llmProvider),pn(s.llmProvider!=="none")),s.sttProvider&&He(s.sttProvider),typeof s.sttKeyConfigured=="boolean"&&gn(s.sttKeyConfigured))},[]),Et=k(()=>{Be.current.call(Ae).then(s=>{X.current&&st(s)}).catch(()=>{})},[st]);M(()=>{let s=!0;return Be.current.call(Ae).then(u=>{s&&st(u)}).catch(()=>{}),()=>{s=!1}},[st]);let at=k(s=>{ho(u=>u.micDeviceId===s.micDeviceId&&u.micLabel===s.micLabel&&u.soundCuesEnabled===s.soundCuesEnabled&&u.soundCuesVolume===s.soundCuesVolume?u:s)},[]),lt=k(()=>{let s=++It.current;Be.current.call(me).then(u=>{if(!X.current||It.current!==s)return;let x=u||{};typeof x.sttProvider=="string"&&x.sttProvider&&He(x.sttProvider),typeof x.sttModel=="string"&&x.sttModel&&nt(x.sttModel),typeof x.llmProvider=="string"&&x.llmProvider&&x.llmProvider!=="none"?cn({providerId:x.llmProvider,modelId:typeof x.llmModel=="string"&&x.llmModel?x.llmModel:void 0}):x.llmProvider==="none"&&cn(null),u&&typeof u=="object"&&at(ae(x))}).catch(()=>{})},[at]),Ge=k(()=>{it.current&&(clearTimeout(it.current),it.current=null)},[]),De=k((s={})=>{let u=s.refresh===!0,x=s.retryAttempt??0;Ge();let I=++rt.current;Je(!0),(u||x===0)&&xt(null);let y=()=>{if(!X.current||x>=mo.length)return;let D=mo[x];it.current=setTimeout(()=>{X.current&&De({retryAttempt:x+1})},D)};Be.current.call(In,u?{refresh:!0}:void 0).then(D=>{if(!X.current||rt.current!==I)return;let J=Array.isArray(D)?D:[];an(J),Je(!1),!J.some(V=>V.providerId!=="assistant"&&Array.isArray(V.models)&&V.models.length>0)&&!u&&y()}).catch(()=>{!X.current||rt.current!==I||(Je(!1),xt("Could not load Composer models. Using Zana Assistant."),y())})},[Ge]);Ht(Rn,s=>{!X.current||!Array.isArray(s)||(an(s),Je(!1),xt(null),Ge())}),M(()=>(X.current=!0,lt(),De(),()=>{X.current=!1,It.current++,ot.current++,rt.current++,Ge()}),[Ge,De,lt]);let xo=G(()=>(Ce??[]).some(s=>s.providerId!=="assistant"&&Array.isArray(s.models)&&s.models.length>0),[Ce]),te=G(()=>{let s=(y,D)=>[...y].sort((J,$)=>D(J).localeCompare(D($),void 0,{sensitivity:"base",numeric:!0})),u=(Ce??[]).filter(y=>Array.isArray(y.models)&&y.models.length>0);if(u.length===0){let y=Pi.map(D=>{let J=!!(v&&D.id.toLowerCase()===v.toLowerCase()||b&&D.id.toLowerCase().includes(b.toLowerCase())),$=s(D.models,V=>V.label||V.id).map(V=>({...V,isComposerMatch:J}));return{...D,isComposerMatch:J,models:$}});return s(y,D=>D.displayName||D.id)}let x={"assistant:assistant":"assistant"},I=u.map(y=>{let D=!!(v&&y.providerId.toLowerCase()===v.toLowerCase()||b&&y.providerId.toLowerCase().includes(b.toLowerCase())),J=s(y.models,$=>$.label||$.id).map($=>{let V=`${y.providerId}:${$.id}`,Fo=x[V]??$.id;return{id:$.id,key:Fo,label:$.label||$.id,providerId:y.providerId,isComposerMatch:D}});return{id:y.providerId,displayName:y.displayName||y.providerId,isComposerMatch:D,error:y.error??null,models:J}});return s(I,y=>y.displayName||y.id)},[Ce,v,b]),z=G(()=>te.find(s=>s.id===Ie)??te[0],[te,Ie]),Se=G(()=>z?.models??[],[z]),j=G(()=>Se.find(u=>u.id===ze||u.key===ze)??Se[0],[Se,ze]);M(()=>{if(Ce===null||P.current||te.length===0)return;let s=te.find(u=>u.isComposerMatch&&u.models.length>0)??te.find(u=>u.isComposerMatch);if(s){Ee(s.id),s.models.length>0&&Re(u=>s.models.some(I=>I.id===u||I.key===u)?u:s.models[0].key||s.models[0].id);return}if(he&&he.providerId!=="assistant"){let u=te.find(x=>x.id===he.providerId&&x.models.length>0);if(u){Ee(u.id);let I=(he.modelId?u.models.find(y=>y.id===he.modelId||y.key===he.modelId):void 0)??u.models[0];I&&Re(I.key||I.id)}}},[Ce,te,he]),M(()=>{if(N===S)try{localStorage.setItem(S,JSON.stringify({inputText:h,outputText:C,selectedProviderId:Ie,selectedModelId:ze,userManuallySelected:P.current,sttProvider:B,sttModel:St,selectedPresetId:O,selectedToneId:Te,targetLanguage:$e}))}catch{}},[N,S,h,C,Ie,ze,B,St,O,Te,$e]);let yo=s=>{pn(s);let u=s?z?.id??"assistant":"none",x=s?j?.id??"assistant":"";Qe(u),c.call(fe,{llmProvider:u,llmModel:x}).catch(()=>{E("Could not update cleanup setting.")})},Rt=s=>{He(s),ye(null),c.call(fe,{sttProvider:s}).then(()=>Et()).catch(()=>{E("Could not update speech provider setting.")})},So=s=>{nt(s),c.call(fe,{sttModel:s}).catch(()=>{})},wo=s=>{P.current=!0,Ee(s);let u=te.find(I=>I.id===s),x="";if(u&&u.models.length>0){let I=u.models[0].key||u.models[0].id;x=u.models[0].id,Re(I)}je&&(Qe(s),c.call(fe,{llmProvider:s,llmModel:x}).catch(()=>{}))},Ao=s=>{P.current=!0;let u=Ie,x=s;for(let I of te){let y=I.models.find(D=>D.id===s||D.key===s);if(y){I.id!==Ie&&(Ee(I.id),u=I.id),Re(y.key||y.id),x=y.id;break}}je&&(Qe(u),c.call(fe,{llmProvider:u,llmModel:x}).catch(()=>{}))};M(()=>()=>{ke.current&&clearInterval(ke.current),Ne.current&&clearInterval(Ne.current),de.current&&de.current.cancel()},[]);let Po=G(()=>{let s=h.trim();return`${s?s.split(/\s+/).length:0} words \xB7 ${h.length} chars`},[h]),Co=G(()=>{let s=C.trim();return`${s?s.split(/\s+/).length:0} words \xB7 ${C.length} chars`},[C]),Io=G(()=>!C||!Fe?[]:co(h,C),[h,C,Fe]),Tt=()=>{ke.current&&(clearInterval(ke.current),ke.current=null),Ne.current&&(clearInterval(Ne.current),Ne.current=null)},Eo=()=>{Tt(),ke.current=setInterval(()=>bn(s=>s+1),1e3),Ne.current=setInterval(()=>{de.current&&Ct(de.current.getAudioLevel?.()??null)},100)},Ro=async s=>{Pt(!1),Ct(null),Tt();let u=de.current;if(de.current=null,!!u){F(!0);try{let x=await u.stop();if(!X.current)return;_("stop",s);let I=await Oe(c,x),y=await c.call(_e,{audio:I.base64,mimeType:I.mimeType,transcriptionOnly:!0});y.ok&&y.status==="ok"?(_("complete",s),U(D=>Ve(D,y.text)),ye(null)):y.ok&&y.status==="no-speech"?(E("No speech detected. Try speaking closer to the microphone."),setTimeout(()=>E(null),4e3)):y.ok||(_("error",s),E(y.message),ye(y.message),y.code==="MISSING_KEY"&&gn(!1))}catch(x){_("error",s),E(x instanceof Error?x.message:"Transcription failed.")}finally{F(!1)}}},To=async(s,u)=>{if(ye(null),E(null),B!=="system"&&!wt){_("error",u);let I=B==="openai"?"OpenAI":"Google Gemini";ye(`API key required for direct ${I} speech-to-text. Switch to System (Zana Voice) below to dictate using host voice.`),E(`API key required for ${I}. Switch to System (Zana Voice) to dictate thoughts.`);return}let x=++ot.current;try{let I=_("start",u);if(I&&(await I,!X.current||ot.current!==x))return;let y=await(s.micDeviceId!==L?r({deviceId:s.micDeviceId}):r());if(!X.current||ot.current!==x){y.cancel();return}y.onError=D=>{de.current=null,Pt(!1),Ct(null),Tt(),_("error",u),ye(D.message),E(D.message)},de.current=y,Pt(!0),bn(0),Eo()}catch(I){_("error",u),E(I instanceof Error?I.message:"Microphone access denied.")}},ko=k(()=>{a(!1),at(se()),lt(),Et(),De()},[De,lt,Et,at]),No=async()=>{let s=hn.current,u={enabled:s.soundCuesEnabled,volume:s.soundCuesVolume};pe?await Ro(u):await To(s,u)},Do=async()=>{let s=h.trim();if(!s||ce||!j||O===A.custom&&!tt.trim())return;let u=tn.find(V=>V.id===O),x=O===A.custom,I=O===A.improve,y=O===A.translate,D=y?"standard":x?"custom":I?Te:u?.tone||"technical",J=z?.id??"assistant",$=j?.id??"assistant";E(null),mn(!0);try{let V=await c.call(Cn,{text:s,tone:D,...y?{targetLanguage:$e}:{},...x?{customPrompt:tt.trim()}:{},...!x&&!y&&u?.instruction?{instruction:u.instruction}:{},llmProvider:J,llmModel:$});V.ok?(H(V.text),go(`${z?.displayName||J}: ${V.llmModel||$}`)):E(V.message)}catch(V){E(V instanceof Error?V.message:"Refinement request failed.")}finally{mn(!1)}},_o=async()=>{try{let s=await navigator.clipboard.readText();if(!s||!s.trim()){E("Clipboard is empty."),setTimeout(()=>E(null),2500);return}U(u=>Ve(u,s)),E("Pasted from clipboard into input draft!"),setTimeout(()=>E(null),2500)}catch{E("Clipboard access denied or unavailable."),setTimeout(()=>E(null),2500)}},Mo=async()=>{if(!h)return;await Qt(h)?(Pe(!0),setTimeout(()=>Pe(!1),2e3),E("Input draft copied to clipboard!"),setTimeout(()=>E(null),2500)):(E("Failed to copy to clipboard."),setTimeout(()=>E(null),3e3))},Lo=async()=>{if(!C)return;await Qt(C)?(K(!0),setTimeout(()=>K(!1),2e3),E("Refined output copied to clipboard!"),setTimeout(()=>E(null),2500)):(E("Failed to copy to clipboard."),setTimeout(()=>E(null),3e3))},Oo=()=>{!h&&!C||(U(""),H(""),oe(A.improve),xe("standard"),et(Ye),un(""),yt(!1),E("Studio canvas cleared."),setTimeout(()=>E(null),2500))},Vo=()=>{C&&(U(C),H(""),yt(!1),E("Refined output moved to input draft."),setTimeout(()=>E(null),2500))},Uo=()=>{let s=C||h;if(s){if(p&&typeof p.updateText=="function")try{p.updateText(u=>Ve(u,s)),p.focus?.(),W("Inserted into Composer!"),setTimeout(()=>W(null),2500);return}catch{}if(m&&typeof m.toCompose=="function"){m.toCompose({initialPrompt:s,focusPrompt:!0}),W("Opened in New Thread Composer!"),setTimeout(()=>W(null),2500);return}Qt(s).then(u=>{E(u?"No active composer \u2014 copied prompt to clipboard.":"Composer focus unavailable.")})}},zo=async()=>{if(e){on(!0),sn(null);try{await mt(e,{showInProjects:!0})}catch(s){sn(s instanceof Error?s.message:"Could not update plugin settings.")}finally{on(!1)}}},jo=k(s=>{(s.ctrlKey||s.metaKey)&&s.key.toLowerCase()==="k"&&(s.preventDefault(),oe(A.custom),setTimeout(()=>xn.current?.focus(),0))},[]);if(t&&!g.showInProjects)return l("div",{className:"ps-container",children:[n("style",{children:en}),l("header",{className:"ps-header",children:[l("div",{className:"ps-header-left",children:[n("span",{style:{fontSize:18},children:"\u{1F399}\uFE0F"}),n("span",{className:"ps-header-title",children:"Prompt Studio"}),n("span",{className:"ps-badge ps-badge-project",children:"Project"})]}),o?n("div",{className:"ps-header-actions",children:o}):null]}),n("div",{className:"ps-empty-state","data-testid":"ps-project-hidden-notice",children:l("div",{className:"ps-empty-card",children:[n("span",{style:{fontSize:22},"aria-hidden":"true",children:"\u{1F507}"}),n("div",{style:{fontSize:14,fontWeight:600},children:"Prompt Studio is hidden in projects"}),n("div",{style:{fontSize:12,color:"var(--ps-text-muted)",lineHeight:1.45},children:"You disabled the project tab in Prompt Voice plugin settings. Re-enable it anytime to use project-scoped drafts here."}),rn?n("div",{role:"alert",style:{fontSize:11,color:"#fca5a5"},children:rn}):null,e?n("button",{type:"button",className:"ps-btn ps-btn-primary",disabled:Ke,onClick:()=>void zo(),children:Ke?"Enabling\u2026":"Enable Prompt Studio in Projects"}):null]})})]});let kt=ht.find(s=>s.id===Te)??ht[0];return l("div",{className:"ps-container",onKeyDown:jo,children:[n("style",{children:en}),l("header",{className:"ps-header",children:[l("div",{className:"ps-header-left",children:[n("span",{style:{fontSize:18},children:"\u{1F399}\uFE0F"}),n("span",{className:"ps-header-title",children:"Prompt Studio"}),n("span",{className:"ps-badge",children:"Voice & AI Refinement"}),t?n("span",{className:"ps-badge ps-badge-project",children:"Project"}):null]}),o?n("div",{className:"ps-header-actions",children:o}):null]}),i?n(so,{rpc:c,pluginId:e,onBack:ko}):l("div",{className:"ps-workspace",children:[l("aside",{className:"ps-sidebar",children:[l("section",{className:"ps-section",children:[l("div",{className:"ps-section-title",children:[n("span",{children:"Voice Dictation"}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:wi[B]??B})]}),l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-stt-provider-select",className:"ps-field-label",children:"Speech Provider"}),n("select",{id:"ps-stt-provider-select",className:"ps-select","aria-label":"Speech-to-text provider",value:B,onChange:s=>{ye(null),Rt(s.target.value)},disabled:pe||Q,children:Ai.map(s=>n("option",{value:s.id,children:s.label},s.id))})]}),uo(B)&&l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-stt-model-input",className:"ps-field-label",children:"Speech Model (Optional)"}),n("input",{id:"ps-stt-model-input",className:"ps-select","aria-label":"Speech-to-text model",placeholder:"Provider default",value:St,onChange:s=>So(s.target.value),disabled:pe||Q})]}),At&&l("div",{role:"alert",style:{padding:"8px 10px",borderRadius:6,background:"rgba(239, 68, 68, 0.12)",border:"1px solid rgba(239, 68, 68, 0.35)",color:"#fca5a5",fontSize:11,textAlign:"left",lineHeight:1.4,display:"flex",flexDirection:"column",gap:6},children:[l("div",{children:["\u26A0\uFE0F ",At]}),uo(B)&&n("button",{type:"button",className:"ps-btn ps-btn-primary",style:{alignSelf:"flex-start",fontSize:11,padding:"4px 8px"},onClick:()=>Rt("system"),children:"Switch to System (Zana Voice)"})]}),B!=="system"&&!wt&&!At&&l("div",{style:{padding:"8px 10px",borderRadius:6,background:"rgba(234, 179, 8, 0.1)",border:"1px solid rgba(234, 179, 8, 0.3)",color:"#fde047",fontSize:11,textAlign:"left",lineHeight:1.4,display:"flex",flexDirection:"column",gap:6},children:[l("div",{children:["\u2139\uFE0F ",n("strong",{children:"API key required:"})," Direct ",B==="openai"?"OpenAI Whisper":"Google Gemini"," speech-to-text requires an API key in Zana Settings."]}),n("button",{type:"button",className:"ps-btn ps-btn-primary",style:{alignSelf:"flex-start",fontSize:11,padding:"4px 8px"},onClick:()=>Rt("system"),children:"Switch to System (Zana Voice)"})]}),l("div",{className:"ps-dictation-card",children:[l("button",{type:"button",className:`ps-btn ${pe?"ps-btn-danger":Q?"":"ps-btn-primary"}`,style:{width:"100%",justifyContent:"center",padding:"10px 0",opacity:Q?.8:1},onClick:No,disabled:Q,"aria-label":Q?"Transcribing audio":pe?"Stop dictation":"Start dictation",children:[n("span",{className:Q?"ps-spin":void 0,children:Q?"\u23F3":pe?"\u23F9\uFE0F":"\u{1F399}\uFE0F"}),n("span",{children:Q?"Transcribing...":pe?`Stop Dictation (${bo}s)`:"Dictate Thoughts"})]}),pe&&l("div",{style:{width:"100%",display:"flex",flexDirection:"column",gap:4},children:[n("div",{className:"ps-meter-bar",children:n("div",{className:"ps-meter-fill",style:{width:`${Math.min(100,(vo??.1)*100)}%`}})}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:"Listening live..."})]})]}),n("div",{style:{fontSize:10,color:"var(--ps-text-subtle)",lineHeight:1.3},children:B==="system"?"Uses host Zana voice transcription without requiring external API keys.":B==="local-whisper"?"Transcribes on this device. Install the runtime and a model in Settings.":wt?`Using direct ${B==="openai"?"OpenAI Whisper":"Google Gemini"} speech-to-text.`:`\u26A0\uFE0F ${B==="openai"?"OpenAI":"Google Gemini"} requires an API key in Zana Settings. Choose System (Zana Voice) for built-in free dictation.`})]}),l("section",{className:"ps-section",children:[l("div",{className:"ps-section-title",children:[n("span",{children:"Refinement Engine"}),l("span",{style:{display:"inline-flex",alignItems:"center",gap:6},children:[n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:Xe&&!xo?"Loading\u2026":Xe?"Refreshing\u2026":z?.isComposerMatch?"\u2605 Composer Active":"AI Model"}),n("button",{type:"button",className:"ps-btn",style:{padding:"2px 6px",fontSize:10},onClick:()=>De({refresh:!0}),disabled:Xe||ce,"aria-label":"Refresh models",title:"Reload models from Composer",children:Xe?"\u2026":"\u21BB"})]})]}),l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-provider-select",className:"ps-field-label",children:"Provider"}),n("select",{id:"ps-provider-select",className:"ps-select","aria-label":"Refinement provider",value:z?.id??"",onChange:s=>wo(s.target.value),disabled:ce,children:te.map(s=>l("option",{value:s.id,children:[s.displayName,s.isComposerMatch?" \u2605 (Composer)":""]},s.id))})]}),l("div",{className:"ps-field-group",children:[l("label",{htmlFor:"ps-model-select",className:"ps-field-label",children:["Model (",Se.length,")"]}),n("select",{id:"ps-model-select",className:"ps-select","aria-label":"Refinement model",value:j?.key||j?.id||"",onChange:s=>Ao(s.target.value),disabled:ce||Se.length===0,children:Se.length===0?n("option",{value:"",children:"No models available"}):Se.map(s=>l("option",{value:s.key||s.id,children:[s.label,s.isComposerMatch?" \u2605 (Composer)":""]},s.key||s.id))})]}),(z?.error||ln)&&n("div",{role:"status",style:{fontSize:10.5,color:"#fde047",lineHeight:1.35,padding:"6px 8px",borderRadius:6,background:"rgba(234, 179, 8, 0.1)",border:"1px solid rgba(234, 179, 8, 0.25)"},children:z?.error||ln}),l("div",{style:{marginTop:8,paddingTop:8,borderTop:"1px solid var(--ps-border)",display:"flex",flexDirection:"column",gap:4},children:[l("label",{style:{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:11,fontWeight:500,userSelect:"none"},children:[n("input",{type:"checkbox","aria-label":"Auto-cleanup mic dictations",checked:je,onChange:s=>yo(s.target.checked)}),n("span",{children:"Auto-cleanup mic dictations"})]}),n("span",{style:{fontSize:10,color:"var(--ps-text-subtle)",lineHeight:1.3},children:je?`Composer mic cleans up using ${z?.displayName}${j?` (${j.label||j.id})`:""}.`:"Composer mic inserts raw transcript without AI cleanup."})]}),l("div",{style:{marginTop:4,fontSize:11,color:"var(--ps-text-muted)",lineHeight:1.35},children:[z?.isComposerMatch?l("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:600},children:["\u2605 Synced to Composer: ",z.displayName,j?` (${j.label})`:""]}):z?.id==="assistant"?"Uses the active Zana assistant agent with no extra API key required.":j?l(Y,{children:["Using ",n("strong",{children:z?.displayName})," \xB7 ",n("code",{children:j.id})]}):null,dn?l("div",{style:{marginTop:3,color:"var(--ps-text-subtle)",fontSize:10},children:["Last refined: ",dn]}):null]})]}),l("section",{className:"ps-section",children:[n("div",{className:"ps-section-title",children:"How should we improve it?"}),l("div",{className:"ps-presets-list",role:"radiogroup","aria-label":"How should we improve it?",children:[tn.map(s=>l("div",{style:{display:"flex",flexDirection:"column",gap:6},children:[l("label",{className:`ps-preset-btn ${O===s.id?"active":""}`,children:[l("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:s.id,checked:O===s.id,onChange:()=>oe(s.id)}),s.title]}),n("span",{className:"preset-desc",children:s.desc})]}),s.id===A.improve&&O===A.improve&&l("div",{className:"ps-tone-panel",children:[l("div",{className:"ps-tone-header",children:[l("span",{children:["Tone: ",n("strong",{style:{color:"var(--text-primary, #e2e8f0)"},children:kt.label})]}),n("span",{style:{color:"var(--ps-text-subtle)"},children:"Same length"})]}),n("div",{className:"ps-tone-chips",role:"group","aria-label":"Improvement tone",children:ht.map(u=>n("button",{type:"button",className:`ps-tone-chip ${Te===u.id?"active":""}`,"aria-pressed":Te===u.id,onClick:()=>xe(u.id),children:u.label},u.id))}),n("div",{className:"ps-tone-hint",children:kt.desc})]})]},s.id)),l("label",{className:`ps-preset-btn ${O===A.custom?"active":""}`,children:[l("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:A.custom,checked:O===A.custom,onChange:()=>oe(A.custom)}),"Custom instructions"]}),n("span",{className:"preset-desc",children:"Describe your own transformation."})]}),O===A.custom&&n("textarea",{ref:xn,className:"ps-custom-prompt-input","aria-label":"Custom instructions",placeholder:"e.g. Turn into user stories with acceptance criteria...",value:tt,onChange:s=>un(s.target.value)}),l("div",{style:{display:"flex",flexDirection:"column",gap:6},children:[l("label",{className:`ps-preset-btn ${O===A.translate?"active":""}`,children:[l("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:A.translate,checked:O===A.translate,onChange:()=>oe(A.translate)}),"Translate"]}),n("span",{className:"preset-desc",children:"Translate into another language while keeping meaning."})]}),O===A.translate&&l("div",{className:"ps-tone-panel",children:[l("div",{className:"ps-tone-header",children:[n("label",{htmlFor:"ps-translate-lang-select",children:n("strong",{style:{color:"var(--text-primary, #e2e8f0)"},children:"Target language"})}),n("span",{style:{color:"var(--ps-text-subtle)"},children:"Same meaning"})]}),n("select",{id:"ps-translate-lang-select",className:"ps-select","aria-label":"Target language",value:$e,onChange:s=>et(s.target.value),disabled:ce,children:Kt.map(s=>n("option",{value:s.code,children:s.label},s.code))})]})]})]})]}),n("button",{type:"button",className:"ps-btn",style:{marginTop:"auto"},onClick:()=>a(!0),children:"Settings"})]}),l("main",{className:"ps-editor-canvas",children:[l("section",{className:"ps-pane",children:[l("div",{className:"ps-pane-header",children:[l("div",{className:"ps-pane-title",children:[n("span",{children:"\u{1F4DD}"}),n("span",{children:"Raw Input Draft"})]}),l("div",{style:{display:"flex",gap:6},children:[n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:_o,title:"Paste from clipboard into input draft","aria-label":"Paste into input draft",children:"\u{1F4CB} Paste"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Mo,disabled:!h,title:"Copy raw input","aria-label":"Copy raw input",children:ie?"\u2705 Copied":"\u{1F4CB} Copy"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>U(""),disabled:!h,title:"Clear input",children:"Clear"})]})]}),n("textarea",{className:"ps-textarea",placeholder:"Type your raw thoughts or click Dictate in the left sidebar to speak...",value:h,onChange:s=>U(s.target.value),"aria-label":"Raw Input Text"})]}),l("div",{className:"ps-action-bar",children:[l("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12},children:[n("span",{className:"ps-pill",children:Si(O,kt.label,$e)}),n("span",{style:{color:"var(--ps-text-muted)"},children:h.trim()?`${h.trim().split(/\s+/).length} words ready`:"Add text to get started"})]}),n("div",{style:{display:"flex",alignItems:"center",gap:6},children:l("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:()=>Do(),disabled:ce||!h.trim()||!j||O===A.custom&&!tt.trim(),title:O===A.translate?"Translate raw draft into the selected language":"Transform raw draft into output",children:[n("span",{children:ce?"\u23F3":"\u26A1"}),n("span",{children:yi(O,ce)})]})})]}),l("section",{className:"ps-pane",children:[l("div",{className:"ps-pane-header",children:[l("div",{className:"ps-pane-title",children:[n("span",{children:"\u2728"}),n("span",{children:"Result"})]}),l("div",{style:{display:"flex",gap:6},children:[C&&l("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>yt(s=>!s),title:"Toggle inline diff against input draft",children:[n("span",{children:Fe?"\u{1F441}\uFE0F":"\u{1F50D}"}),n("span",{children:Fe?"View Clean":"View Diff"})]}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Vo,disabled:!C,title:"Move output to input draft for iterative re-refinement",children:"\u2B06 Replace Input"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Lo,disabled:!C,title:"Copy refined text to clipboard","aria-label":"Copy refined output",children:re?"\u2705 Copied":"\u{1F4CB} Copy"})]})]}),Fe&&C?n("div",{className:"ps-output-view",children:Io.map((s,u)=>s.type==="added"?n("span",{className:"ps-diff-added",children:s.text},u):s.type==="removed"?n("span",{className:"ps-diff-removed",children:s.text},u):n("span",{className:"ps-diff-unchanged",children:s.text},u))}):n("textarea",{className:"ps-textarea",placeholder:"Your improved, structured, or translated text will appear here...",value:C,onChange:s=>H(s.target.value),"aria-label":"Refined output"})]}),l("div",{className:"ps-action-bar",children:[n("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12},children:ee?n("span",{className:"ps-badge",style:{background:"rgba(34, 197, 94, 0.2)",color:"#86efac"},children:ee}):n("span",{style:{color:"var(--ps-text-muted)"},children:C?"Ready to insert refined result into Composer":h?"Ready to insert raw draft into Composer":"Draft or refine a prompt to insert into Composer"})}),l("div",{style:{display:"flex",alignItems:"center",gap:8},children:[l("button",{type:"button",className:"ps-btn",onClick:Oo,title:"Clear current input and output",disabled:!h&&!C,children:[n("span",{children:"\u{1F5D1}\uFE0F"}),n("span",{children:"Clear"})]}),l("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:Uo,disabled:!h&&!C,title:"Append current text directly into Zana Composer",children:[n("span",{children:"\u{1F4AC}"}),n("span",{children:"Insert into Composer"})]})]})]})]})]}),l("footer",{className:"ps-status-bar",children:[l("div",{style:{display:"flex",gap:12},children:[l("span",{children:["Input: ",Po]}),l("span",{children:["Output: ",Co]}),fn&&n("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:500},children:fn})]}),l("div",{style:{display:"flex",gap:12,alignItems:"center"},children:[l("span",{children:["Engine: ",z?.displayName," \xB7 ",j?.label??"No model"]}),l("span",{className:"ps-pill",children:["Mic cleanup: ",je?`${z?.displayName}${j?` (${j.label||j.id})`:""}`:"Off (Raw)"]}),z?.isComposerMatch&&n("span",{className:"ps-pill",style:{color:"var(--accent, #3b82f6)"},children:"\u2605 Composer Synced"}),n("span",{children:"Zana Prompt Studio"})]})]})]})}var Ya=wn(e=>{q(),e.composer.customize({id:"prompt-voice-mic",actions:[{id:"prompt-voice-mic",component:Zn}]}),e.slots.navPanel?.({id:ge,title:"Prompt Studio",icon:"Sparkles",path:ge,component:nn}),e.slots.projectTab?.({id:Me,label:"Prompt Studio",icon:"Sparkles",order:50,global:!1,header:"custom",detachable:!0,component:nn,detachedPlaceholder:fo}),e.slots.homepageSection?.({id:"prompt-voice-home",title:"Prompt Voice",component:Hn}),e.slots.settingsSection?.({id:"prompt-voice-visibility",title:"Where Prompt Voice Appears",description:"Choose whether Prompt Voice appears on the main Home screen, inside projects, and in composers.",component:bt}),e.slots.commandPaletteAction?.({id:"open-prompt-studio",title:"Prompt Studio: Open Canvas",isAvailable:()=>!0,run:t=>{if(typeof t.toPluginPanel=="function"){t.toPluginPanel(ge);return}t.navigate?.(`/${ge}`)}}),e.slots.commandPaletteAction?.({id:"open-prompt-studio-project",title:"Prompt Studio: Open in This Project",isAvailable:t=>!!t.projectId,run:t=>{t.projectId&&typeof t.toProject=="function"&&t.toProject(t.projectId,{tabId:Me})}})});export{ge as PROMPT_STUDIO_PANEL_PATH,Me as PROMPT_STUDIO_PROJECT_TAB_ID,Ya as default};
//# sourceMappingURL=app.js.map
