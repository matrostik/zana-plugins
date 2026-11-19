function Xn(){let e=globalThis.__ZCC_PLUGIN_HOST__;if(!e)throw new Error("plugin host is not available");return e}function Ae(){return globalThis.__ZCC_PLUGIN_RUNTIME__??{}}function At(e){throw new Error(`${e} is not available until the host plugin runtime is installed`)}async function Jn(e,t,o){return Xn().callRpc(e,t,o)}async function tn(e,t){return Xn().setSettings(e,t)}function Qn(e){return{__zccPluginApp:!0,setup:e}}function lt(){return Ae().useRpc?.()??At("useRpc")}function nn(e,t){Ae().useRealtime?.(e,t)}function on(){return Ae().useSettings?.()??{values:void 0,isLoading:!0}}function rn(){return Ae().useZccContext?.()??{projectId:null,threadId:null}}function sn(){return Ae().useZccNavigate?.()??At("useZccNavigate")}function ct(){return Ae().useComposer?.()??At("useComposer")}function an(){return Ae().useComposerView?.()??At("useComposerView")}var L=globalThis.__ZCC_HOST_REACT__,eo=L,sa=L.Children,aa=L.Component,la=L.Fragment,ca=L.StrictMode,pa=L.Suspense,da=L.cloneElement,ua=L.createContext,ma=L.createElement,fa=L.createRef,ga=L.forwardRef,ba=L.isValidElement,va=L.lazy,ha=L.memo,ya=L.startTransition,C=L.useCallback,xa=L.useContext,Sa=L.useDebugValue,wa=L.useDeferredValue,D=L.useEffect,Ia=L.useId,Ta=L.useImperativeHandle,Ea=L.useInsertionEffect,Ca=L.useLayoutEffect,j=L.useMemo,to=L.useReducer,S=L.useRef,b=L.useState,Ra=L.useSyncExternalStore,Aa=L.useTransition,Pa=L.version;var U="default";function Fr(e){if(typeof e!="string")return U;let t=e.trim().slice(0,256);return!t||t===U?U:t}function Ur(e){return typeof e!="string"?"":e.trim().slice(0,200)}function zr(e){return!(e===!1||typeof e=="string"&&e.trim().toLowerCase()==="false")}function $r(e){let t=typeof e=="number"?e:typeof e=="string"&&e.trim()!==""?Number(e):Number.NaN;return Number.isFinite(t)?Math.round(Math.min(100,Math.max(0,t))):75}function ye(e){let t=e??{},o=Fr(t.micDeviceId);return{micDeviceId:o,micLabel:o===U?"":Ur(t.micLabel),soundCuesEnabled:zr(t.soundCuesEnabled),soundCuesVolume:$r(t.soundCuesVolume)}}var je="promptVoice.transcribe",Pe="promptVoice.status",no="promptVoice.rephrase",oo="promptVoice.availableModels",xe="promptVoice.settings.get",Se="promptVoice.settings.update",ro="promptVoice.history.list",io="promptVoice.history.star",so="promptVoice.history.delete",Pt="promptVoice.history.clear",ao="promptVoice.history.projects",lo="promptVoice:settingsChanged",co="promptVoice:modelsUpdated",po="promptVoice:historyChanged",pe={state:"promptVoice.localWhisper.state",installRuntime:"promptVoice.localWhisper.installRuntime",cancelRuntimeInstall:"promptVoice.localWhisper.cancelRuntimeInstall",downloadModel:"promptVoice.localWhisper.downloadModel",cancelModelDownload:"promptVoice.localWhisper.cancelModelDownload",removeModel:"promptVoice.localWhisper.removeModel",selectModel:"promptVoice.localWhisper.selectModel",start:"promptVoice.localWhisper.start",stop:"promptVoice.localWhisper.stop"};var uo=["standard","casual","conversational","formal","technical","custom"];var de="prompt-studio",ke="prompt-studio",we="history";var mo="zcc:prompt-voice:audio-prefs:v1";function ln(){try{if(typeof localStorage>"u")return null;let e=localStorage.getItem(mo);if(!e)return null;let t=JSON.parse(e);return!t||typeof t!="object"||Array.isArray(t)?null:ye(t)}catch{return null}}function me(){return ln()??ye({})}function fe(e){let t=ye(e);try{typeof localStorage<"u"&&localStorage.setItem(mo,JSON.stringify({micDeviceId:t.micDeviceId,micLabel:t.micDeviceId===U?"":t.micLabel,soundCuesEnabled:String(t.soundCuesEnabled),soundCuesVolume:String(t.soundCuesVolume)}))}catch{}return t}var cn="zcc:prompt-voice:switch-studio-tab",kt=null;function Fe(e){if(kt=e,typeof window<"u"&&typeof window.dispatchEvent=="function")try{window.dispatchEvent(new CustomEvent(cn,{detail:{tab:e}}))}catch{}}function fo(){let e=kt;return kt=null,e}function go(e){if(typeof window>"u"||typeof window.addEventListener!="function")return()=>{};let t=o=>{let r=o.detail;(r?.tab==="studio"||r?.tab==="history")&&(kt=null,e(r.tab))};return window.addEventListener(cn,t),()=>window.removeEventListener(cn,t)}var pn=`/* Base Container */
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
`;var bo="zcc-ext-prompt-voice-styles";function oe(){if(typeof document>"u")return;let e=document.getElementById(bo);e||(e=document.createElement("style"),e.id=bo,document.head.appendChild(e)),e.textContent!==pn&&(e.textContent=pn)}var Gr=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4"];var re=class extends Error{code;constructor(t,o){super(o),this.name="RecordingError",this.code=t}};function Wr(e){return Gr.find(t=>e(t))??null}var Yr="audio/webm";function vo(){return{getUserMedia:e=>navigator.mediaDevices.getUserMedia(e),createRecorder:(e,t)=>new MediaRecorder(e,t?{mimeType:t}:void 0),isTypeSupported:e=>typeof MediaRecorder<"u"&&MediaRecorder.isTypeSupported(e)}}async function qr(e,t){let o=t&&t!=="default"?t:void 0,r=o?{audio:{deviceId:{exact:o}}}:{audio:!0};try{return await e.getUserMedia(r)}catch(i){let a=i instanceof Error?i.name:"";if(a==="NotAllowedError"||a==="SecurityError")throw new re("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again.");if(o&&(a==="OverconstrainedError"||a==="NotFoundError"))try{return await e.getUserMedia({audio:!0})}catch(p){let s=p instanceof Error?p.name:"";if(s==="NotAllowedError"||s==="SecurityError")throw new re("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again.")}throw new re("MIC_UNAVAILABLE","No microphone is available. Connect one and try again.")}}function dn(e){return new Promise((t,o)=>{let r=new FileReader;r.onload=()=>{let i=typeof r.result=="string"?r.result:"";t(i.slice(i.indexOf(",")+1))},r.onerror=()=>o(new re("RECORDING_FAILED","The recording could not be read.")),r.readAsDataURL(e)})}async function Zr(e,t){let o=new Blob(e,{type:t});return{base64:await dn(o),mimeType:o.type||t}}function Kr(e,t){if(!(e>0&&Number.isFinite(e)))return()=>{};let o=setTimeout(t,e);return()=>clearTimeout(o)}var Xr="That recording is too large to transcribe. Keep dictation shorter and try again.";function Jr(e,t){let o=Math.max(t,e),r=[],i=0,a=!1;return{chunks:r,get overflowed(){return a},add(p){return p.size===0||a?"ignored":i+p.size>o?(a=!0,"overflow"):(r.push(p),i+=p.size,i>=e?"limit-reached":"accepted")}}}function Qr(e,t){let o=new Promise((r,i)=>{e.onstop=()=>r(),e.onerror=()=>{let a=new re("RECORDING_FAILED","Recording stopped unexpectedly. Try again.");t(a),i(a)}});return o.catch(()=>{}),o}function ei(e,t,o,r){let i=Qr(e,r);return e.ondataavailable=a=>{let p=t.add(a.data);(p==="limit-reached"||p==="overflow")&&o()},e.start(1e3),i}async function ti(e,t,o,r){try{await e}finally{t()}if(o.overflowed)throw new re("RECORDING_FAILED",Xr);return Zr(o.chunks,r)}function ni(e){let t=()=>{};return{stopRecorder(){t(),e.state!=="inactive"&&e.stop()},armTimer(o,r){t=Kr(o,r)}}}function oi(e,t){let o=null;return{attach(r){o=r},detach(){o=null},autoStop(){e();let r=o?.onAutoStop;o&&(o.onAutoStop=void 0),r?.()},fail(r){e(),t();let i=o?.onError;o=null,i?.(r)}}}function ri(e,t,o,r){let i=Jr(r.maxBytes??9437184,r.hardMaxBytes??10485760),{stopRecorder:a,armTimer:p}=ni(e),s=oi(a,t);p(r.maxDurationMs??12e4,s.autoStop);let d=ei(e,i,s.autoStop,s.fail),m={onError:r.onError,onAutoStop:r.onAutoStop,async stop(){a();try{return await ti(d,t,i,e.mimeType||o)}finally{s.detach()}},cancel(){a(),t(),s.detach()}};return s.attach(m),m}var ge=e=>ii(vo(),e);async function ii(e=vo(),t={}){let o=await qr(e,t.deviceId),r=si(o),i=o.getTracks(),a,p=()=>{for(let s of i)a&&s.removeEventListener?.("ended",a);r?.close(),i.forEach(s=>s.stop())};try{let s=Wr(e.isTypeSupported)??Yr,d=e.createRecorder(o,s),m=ri(d,p,s,t);return m.getAudioLevel=()=>r?.level()??null,a=()=>{let u=m.onError;m.cancel(),u?.(new re("MIC_UNAVAILABLE","Microphone disconnected. Check your device and try again."))},i.forEach(u=>u.addEventListener?.("ended",a)),m}catch(s){throw p(),s instanceof re?s:new re("RECORDING_FAILED",s instanceof Error?s.message:"The recording could not be started.")}}function si(e){let t;try{t=new AudioContext;let o=t.createMediaStreamSource(e),r=t.createAnalyser();r.fftSize=256,o.connect(r);let i=new Uint8Array(r.fftSize),a=t,p=!1;return{level(){if(a.state&&a.state!=="running")return null;r.getByteTimeDomainData(i);let s=i.reduce((d,m)=>d+((m-128)/128)**2,0)/i.length;return Math.min(1,Math.sqrt(s)*5)},close(){p||(p=!0,o.disconnect(),a.close().catch(s=>console.error("Prompt Voice audio meter cleanup failed",s)))}}}catch(o){return t&&t.close().catch(r=>console.error("Prompt Voice audio meter cleanup failed",r)),console.warn("Prompt Voice audio meter unavailable",o),null}}var un=["both","main","projects","off"];var ai="both",mn=[{id:"all",label:"Main Screen & Projects",description:"Show on Zana Home, inside Projects, and in all composers.",settings:{showHomeWidget:!0,showInProjects:!0,micVisibility:"both"}},{id:"projects",label:"Projects Only",description:"Show the Prompt Studio tab and mic button only inside projects.",settings:{showHomeWidget:!1,showInProjects:!0,micVisibility:"projects"}},{id:"main",label:"Main Screen Only",description:"Show on Zana Home and global composers; hide project tabs and project mics.",settings:{showHomeWidget:!0,showInProjects:!1,micVisibility:"main"}},{id:"mic-only",label:"Composer Mic Only",description:"Hide the Home widget and project tabs; keep only the composer mic.",settings:{showHomeWidget:!1,showInProjects:!1,micVisibility:"both"}}],yo={both:"Everywhere (Main & Projects)",main:"Main screen composers only",projects:"Project composers only",off:"Hidden"};function ho(e,t){if(typeof e=="boolean")return e;if(typeof e=="string"){let o=e.trim().toLowerCase();if(o==="true")return!0;if(o==="false")return!1}return t}function li(e){return typeof e=="string"&&un.includes(e)?e:ai}function fn(e){let t=e??{};return{showHomeWidget:ho(t.showHomeWidget,!0),showInProjects:ho(t.showInProjects,!0),micVisibility:li(t.micVisibility)}}function xo(e){for(let t of mn)if(t.settings.showHomeWidget===e.showHomeWidget&&t.settings.showInProjects===e.showInProjects&&t.settings.micVisibility===e.micVisibility)return t.id;return"custom"}function So(e,t,o){if(e==="off")return!1;if(e==="both")return!0;let r=t&&typeof t=="object"&&"projectId"in t?t.projectId:void 0,i=r!==void 0?r:o,a=typeof i=="string"&&i.length>0;return e==="projects"?a:!a}var Ue="prompt-voice";function ci(e){return Ue}function pi(){try{let e=Jn;return typeof e=="function"?e:void 0}catch{return}}function di(){try{return typeof on=="function"?on():null}catch{return null}}function ze(){try{return typeof an=="function"?an():null}catch{return null}}function $e(){try{return typeof rn=="function"?rn():null}catch{return null}}function Be(){try{return typeof sn=="function"?sn():null}catch{return null}}function wo(){try{return typeof ct=="function"?ct():null}catch{return null}}function ui(){try{return typeof lt=="function"?lt():null}catch{return null}}function Nt(e){let t=ui(),o=S(t);o.current=t;let r=S(e);return r.current=e,j(()=>({async call(i,a){let p=pi(),s=a!==void 0,d=async()=>{if(!p)throw new Error("Prompt Voice RPC is unavailable in this environment.");return s?await p(Ue,i,a):await p(Ue,i)};if(r.current&&r.current!==Ue&&p)return d();let m=o.current;if(m)try{return s?await m.call(i,a):await m.call(i)}catch(u){if(p&&u instanceof Error&&/unknown rpc/i.test(u.message))return d();throw u}return d()}}),[])}function pt(e,t){try{typeof nn=="function"&&nn(e,t)}catch{}}function Ie(){let t=di()?.values,o=fn(t),[r,i]=b(null);return D(()=>{i(null)},[o.showHomeWidget,o.showInProjects,o.micVisibility]),pt(lo,a=>{a&&typeof a=="object"&&i(fn(a))}),r??o}async function Dt(e,t){if(typeof tn!="function")throw new Error("Plugin settings API is unavailable in this environment.");await tn(ci(e),t)}var mi={start:[{frequency:523.25,offsetSec:0,durationSec:.11,type:"sine",peakFactor:.9},{frequency:659.25,offsetSec:.075,durationSec:.14,type:"sine",peakFactor:1}],stop:[{frequency:493.88,offsetSec:0,durationSec:.1,type:"sine",peakFactor:.85}],complete:[{frequency:659.25,offsetSec:0,durationSec:.1,type:"sine",peakFactor:.85},{frequency:783.99,offsetSec:.075,durationSec:.16,type:"sine",peakFactor:1}],error:[{frequency:329.63,offsetSec:0,durationSec:.12,type:"triangle",peakFactor:.9},{frequency:246.94,offsetSec:.095,durationSec:.16,type:"triangle",peakFactor:.9}]},_t=null;function fi(){if(typeof window>"u")return null;let e=window.AudioContext??window.webkitAudioContext;return e?((!_t||_t.state==="closed")&&(_t=new e),_t):null}function Io(e,t,o){let r=e.currentTime,i=mi[t],a=null,p=0;for(let s of i){let d=e.createOscillator(),m=e.createGain(),u=r+s.offsetSec,g=u+s.durationSec,v=s.offsetSec+s.durationSec+.02,h=o*(s.peakFactor??1);v>=p&&(p=v,a=d),d.type=s.type??"sine",d.frequency.setValueAtTime(s.frequency,u),m.gain.setValueAtTime(1e-4,u),m.gain.exponentialRampToValueAtTime(Math.max(2e-4,h),u+.015),m.gain.exponentialRampToValueAtTime(1e-4,g),d.connect(m),m.connect(e.destination),d.start(u),d.stop(g+.02)}return{finalOsc:a,totalDurationSec:p}}function To(e,t){let o=Math.ceil(t*1e3)+40;return new Promise(r=>{let i=!1,a=null,p=()=>{i||(i=!0,a!==null&&clearTimeout(a),e&&typeof e.removeEventListener=="function"&&e.removeEventListener("ended",p),r())};if(e&&typeof e.addEventListener=="function")e.addEventListener("ended",p,{once:!0});else if(e&&"onended"in e){let s=e.onended;e.onended=function(d){typeof s=="function"&&s.call(this,d),p()}}a=setTimeout(p,o)})}async function gi(e){if(e.state!=="suspended")return e.state==="running";let t=null;try{return await Promise.race([e.resume(),new Promise(o=>{t=setTimeout(o,750)})]),e.state!=="suspended"}catch{return!1}finally{t!==null&&clearTimeout(t)}}function H(e,t){if(!t.enabled)return null;let o=Math.min(100,Math.max(0,t.volume));if(!Number.isFinite(o)||o<=0)return null;try{let r=fi();if(!r)return null;let i=o/100*.2;if(r.state==="suspended")return(async()=>{if(!await gi(r))return;let{finalOsc:d,totalDurationSec:m}=Io(r,e,i);await To(d,m)})().catch(()=>{});let{finalOsc:a,totalDurationSec:p}=Io(r,e,i);return To(a,p)}catch{return null}}var gn=16e3,Eo=44,dt=2,bi="This recording couldn't be prepared for Local Whisper. Try again.",vi=async(e,t)=>{let r=await new OfflineAudioContext(1,1,t).decodeAudioData(e),i=Array.from({length:r.numberOfChannels},(a,p)=>r.getChannelData(p));return{sampleRate:r.sampleRate,channels:i}};function hi(e){if(e.length===0)return new Float32Array(0);if(e.length===1)return e[0];let t=Math.min(...e.map(r=>r.length)),o=new Float32Array(t);for(let r=0;r<t;r+=1){let i=0;for(let a of e)i+=a[r];o[r]=i/e.length}return o}function yi(e,t){let o=e.length*dt,r=new Uint8Array(Eo+o),i=new DataView(r.buffer),a=(p,s)=>{for(let d=0;d<s.length;d+=1)i.setUint8(p+d,s.charCodeAt(d))};a(0,"RIFF"),i.setUint32(4,36+o,!0),a(8,"WAVE"),a(12,"fmt "),i.setUint32(16,16,!0),i.setUint16(20,1,!0),i.setUint16(22,1,!0),i.setUint32(24,t,!0),i.setUint32(28,t*dt,!0),i.setUint16(32,dt,!0),i.setUint16(34,8*dt,!0),a(36,"data"),i.setUint32(40,o,!0);for(let p=0;p<e.length;p+=1){let s=Math.max(-1,Math.min(1,e[p]));i.setInt16(Eo+p*dt,s<0?s*32768:s*32767,!0)}return r}function xi(e){let t=atob(e),o=new Uint8Array(t.length);for(let r=0;r<t.length;r+=1)o[r]=t.charCodeAt(r);return o.buffer}async function Si(e,t=vi){let o;try{let r=await t(xi(e.base64),gn);if(r.sampleRate!==gn)throw new Error("decoder ignored the requested sample rate");o=yi(hi(r.channels),gn)}catch{throw new re("RECORDING_FAILED",bi)}return{base64:await dn(new Blob([o],{type:"audio/wav"})),mimeType:"audio/wav"}}async function Ge(e,t,o=Si){return(await e.call(Pe).catch(()=>null))?.audioFormat==="wav"?o(t):t}var Co=globalThis.__ZCC_HOST_REACT__,Z=Co.Fragment;function n(e,t,o){return Co.createElement(e,o===void 0?t:{...t,key:o})}var l=n;var wi={system:"Zana Voice",openai:"OpenAI Whisper","google-gemini":"Google Gemini","local-whisper":"Local Whisper"};function Ii(e,t){let[o,r]=b("system"),[i,a]=b("assistant");return D(()=>{let p=!0;return e.call(Pe).then(s=>{if(!p||!s||typeof s!="object")return;let d=s;d.sttProvider&&r(d.sttProvider),d.llmProvider&&a(d.llmProvider)}).catch(()=>{}),e.call(xe).then(s=>{!p||!s||typeof s!="object"||(t.current=fe(s))}).catch(()=>{}),()=>{p=!1}},[t,e]),{sttProvider:o,llmProvider:i}}function Ti(e){let[t,o]=b(0);return D(()=>{if(e!=="recording"){o(0);return}let r=Date.now(),i=setInterval(()=>{o(Math.floor((Date.now()-r)/1e3))},250);return()=>clearInterval(i)},[e]),t}async function Ei(e,t,o,r,i,a,p){let s={enabled:o.soundCuesEnabled,volume:o.soundCuesVolume},d=await e.stop();if(!i.current)return;H("stop",s);let m=await Ge(t,d),u=await t.call(je,{audio:m.base64,mimeType:m.mimeType,source:"home",...a.projectId?{projectId:a.projectId}:{},...typeof a.audioDurationMs=="number"?{audioDurationMs:a.audioDurationMs}:{}});if(i.current){if(u.ok&&u.status==="ok"){H("complete",s),typeof r?.toCompose=="function"?(r.toCompose({initialPrompt:u.text,focusPrompt:!0}),p.setNotice("Draft opened in new thread composer.")):p.setNotice(u.text);return}if(u.ok&&u.status==="no-speech"){p.setNotice("No speech detected. Try again.");return}u.ok||(H("error",s),p.setError(u.message))}}async function Ci(e,t,o){let r={enabled:e.soundCuesEnabled,volume:e.soundCuesVolume},i=H("start",r);if(i&&(await i,!o()))return null;let a=await(e.micDeviceId!==U?t({deviceId:e.micDeviceId}):t());return o()?a:(a.cancel(),null)}function Ri(e,t,o,r){let[i,a]=b("idle"),[p,s]=b(null),[d,m]=b(null),u=S(!0),g=S(null),v=S(null),h=S(0),E=S(me()),{sttProvider:w,llmProvider:R}=Ii(e,E),y=Ti(i);D(()=>(u.current=!0,()=>{u.current=!1,h.current++,g.current?.cancel(),g.current=null}),[]);let A=C(async()=>{let N=g.current;g.current=null;let F=v.current;v.current=null;let Y=F!==null?Math.max(0,Date.now()-F):void 0;if(!N){a("idle");return}let I=E.current;a("transcribing");try{await Ei(N,e,I,t,u,{projectId:r,audioDurationMs:Y},{setNotice:s,setError:m})}catch(K){if(!u.current)return;H("error",{enabled:I.soundCuesEnabled,volume:I.soundCuesVolume}),m(K instanceof Error?K.message:"Quick dictation failed.")}finally{u.current&&a("idle")}},[t,r,e]),te=C(async()=>{m(null),s(null);let N=me();E.current=N;let F={enabled:N.soundCuesEnabled,volume:N.soundCuesVolume},Y=++h.current;a("starting");try{let I=await Ci(N,o,()=>u.current&&h.current===Y);if(!I)return;I.onError=K=>{g.current=null,v.current=null,u.current&&(H("error",F),m(K.message),a("idle"))},I.onAutoStop=()=>{u.current&&A()},g.current=I,v.current=Date.now(),a("recording")}catch(I){if(!u.current)return;H("error",F),m(I instanceof Error?I.message:"Microphone access denied."),a("idle")}},[o,A]),W=C(()=>{h.current++,v.current=null,g.current?.cancel(),g.current=null,a("idle")},[]);return{sttProvider:w,llmProvider:R,phase:i,seconds:y,notice:p,error:d,start:te,stopAndTranscribe:A,cancel:W}}function Ai({phase:e,formattedTime:t,onToggleDictate:o,onCancel:r,onOpenStudio:i,onOpenHistory:a}){let p=e==="starting"?"Starting mic\u2026":e==="recording"?`Stop & Compose (${t})`:e==="transcribing"?"Transcribing\u2026":"Dictate to New Thread";return l("div",{className:"ps-home-actions",children:[n("button",{type:"button",className:`ps-btn ${e==="recording"?"ps-btn-danger":"ps-btn-primary"}`,disabled:e==="starting"||e==="transcribing",onClick:o,children:p}),e==="starting"||e==="recording"?n("button",{type:"button",className:"ps-btn",onClick:r,children:"Cancel"}):l(Z,{children:[n("button",{type:"button",className:"ps-btn",onClick:i,children:"Open Prompt Studio"}),n("button",{type:"button",className:"ps-btn",onClick:a,children:"History"})]})]})}function Ro(e){return Ie().showHomeWidget?n(Pi,{...e}):null}function Pi({pluginId:e,projectId:t,startSession:o=ge}){oe();let r=Nt(e),i=Be(),a=Ri(r,i,o,t),p=C(()=>{if(Fe("studio"),t&&typeof i?.toProject=="function"){i.toProject(t,{tabId:ke});return}i?.toPluginPanel?.(de)},[i,t]),s=C(()=>{if(Fe("history"),t&&typeof i?.toProject=="function"){i.toProject(t,{tabId:ke});return}i?.toPluginPanel?.(de,{subPath:we})},[i,t]),d=()=>{a.phase==="recording"?a.stopAndTranscribe():a.phase==="idle"&&a.start()},m=`${Math.floor(a.seconds/60)}:${String(a.seconds%60).padStart(2,"0")}`,u=wi[a.sttProvider]??a.sttProvider,g=a.llmProvider==="none"?"Raw transcript":"AI cleanup on";return l("div",{className:"ps-home-card","data-testid":"pv-home-widget",children:[l("div",{className:"ps-home-card-top",children:[l("div",{className:"ps-home-copy",children:[l("div",{className:"ps-home-heading",children:[n("span",{"aria-hidden":"true",children:"\u{1F399}\uFE0F"}),n("span",{children:"Dictate a new thread or refine in Prompt Studio"})]}),l("div",{className:"ps-home-meta",children:[n("span",{children:u}),n("span",{"aria-hidden":"true",children:"\xB7"}),n("span",{children:g})]})]}),n(Ai,{phase:a.phase,formattedTime:m,onToggleDictate:d,onCancel:a.cancel,onOpenStudio:p,onOpenHistory:s})]}),a.notice?n("div",{role:"status",className:"ps-home-status",children:a.notice}):null,a.error?n("div",{role:"alert",className:"ps-home-error",children:a.error}):null]})}function We(e,t){let o=t.trim();return o?e?/\s$/.test(e)?`${e}${o}`:`${e} ${o}`:o:e}var ki="No speech detected.",bn={phase:"idle",notice:null,error:null};function Ao(e,t){switch(t.type){case"START":return e.phase==="idle"||e.phase==="error"?{phase:"starting",notice:null,error:null}:e;case"STARTED":return e.phase==="starting"?{...e,phase:"recording"}:e;case"STOP":return e.phase==="recording"||e.phase==="starting"?{phase:"processing",notice:null,error:null}:e;case"CANCEL":return e.phase==="recording"||e.phase==="starting"?{...bn}:e;case"SUCCESS":case"NO_SPEECH":return e.phase!=="processing"?e:{phase:"idle",notice:t.type==="NO_SPEECH"?ki:t.notice,error:null};case"CLEAR_NOTICE":return e.notice?{...e,notice:null}:e;case"FAILURE":return{phase:"error",notice:null,error:t.message}}}var Ni="Prompt Voice returned an unexpected response. Try again.",Di="Dictation failed. Try again.",_i=4e3;function Mi(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}function Li(e){return typeof e=="object"&&e!==null&&!("ok"in e&&"status"in e)}function vn(e,t){if(e==null)return{projectId:t?.projectId||void 0,threadId:t?.threadId||void 0};if(e==="global"||typeof e=="object"&&e.kind==="global"){let o=typeof e=="object"?e:null;return{projectId:o?.projectId||void 0,threadId:o?.threadId||void 0}}if(typeof e=="object"){let o="projectId"in e&&e.projectId!==void 0,r="threadId"in e&&e.threadId!==void 0;return{projectId:(o?e.projectId:t?.projectId)||void 0,threadId:(r?e.threadId:t?.threadId)||void 0}}return{projectId:t?.projectId||void 0,threadId:t?.threadId||void 0}}async function Oi(e,t,o){let r=await Ge(e,t),i=await e.call(je,{audio:r.base64,mimeType:r.mimeType,source:"composer",...o.projectId?{projectId:o.projectId}:{},...o.threadId?{threadId:o.threadId}:{},...typeof o.audioDurationMs=="number"?{audioDurationMs:o.audioDurationMs}:{}});if(!Mi(i))throw new Error(Ni);return i}function Po(e){return e instanceof Error&&e.message?e.message:Di}function Ye(e){return{enabled:e.soundCuesEnabled,volume:e.soundCuesVolume}}function Hi(e,t,o,r=me()){if(!e.ok){H("error",Ye(r)),o({type:"FAILURE",message:e.message});return}if(e.status==="no-speech"){o({type:"NO_SPEECH"});return}H("complete",Ye(r)),t.updateText(a=>We(a,e.text)),t.focus();let i=e.refineNotice?`Inserted the raw transcript. ${e.refineNotice.message}`:"Added to draft.";o({type:"SUCCESS",notice:i})}function Vi(e,t,o,r){return t()?(e.onError=i=>{t()&&r(i)},e.onAutoStop=()=>{t()&&o()},e):(e.cancel(),null)}function ji(e,t,o,r,i,a){let p=s=>{H("error",Ye(a())),i({type:"FAILURE",message:Po(s)})};return e.then(s=>{if(!s)return null;let d=Vi(s,o,r,m=>{t.current=null,p(m)});return d&&(t.current=d),d},s=>(o()&&p(s),null))}function Fi(e,t,o){let r=S(null),i=S(null),a=S(0),p=S(!0),s=C(()=>{a.current++,i.current=null,r.current&&(r.current.cancel(),r.current=null),t({type:"CANCEL"})},[t]);D(()=>(p.current=!0,()=>{p.current=!1,s()}),[s]);let d=C(async()=>{let v=i.current?await i.current:r.current;return r.current=null,v},[]),m=C(async(v,h)=>{let E=++a.current,w=()=>p.current&&a.current===E,R=H("start",Ye(h)),A=ji((async()=>R&&(await R,!w())?null:await(h.micDeviceId!==U?e({deviceId:h.micDeviceId}):e()))(),r,w,v,t,o);i.current=A,await A&&w()&&t({type:"STARTED"}),i.current===A&&(i.current=null)},[t,o,e]),u=C(()=>p.current,[]),g=C(()=>r.current?.getAudioLevel?.()??null,[]);return{start:m,takeSession:d,cancel:s,isMounted:u,getAudioLevel:g}}function ko({startSession:e=ge,noticeDurationMs:t=_i}={}){let o=ct(),r=ze(),i=$e(),a=lt(),p=S(a);p.current=a;let[s,d]=to(Ao,bn),m=S(s.phase);m.current=s.phase;let u=S(null),g=S(me()),v=S(null),h=C(()=>g.current,[]),{start:E,takeSession:w,cancel:R,isMounted:y,getAudioLevel:A}=Fi(e,d,h),[te,W]=b(null),[N,F]=b(0),[Y,I]=b(!1),K=S({});K.current=vn(r?.scope,i),D(()=>{let z=!0;return p.current.call(xe).then(q=>{if(!z||!Li(q))return;let be=fe(q);u.current=be,(m.current==="idle"||m.current==="error")&&(g.current=be)}).catch(()=>{}),()=>{z=!1}},[]),D(()=>{if(s.phase!=="recording"){W(null),F(0);return}let z=Date.now();v.current=z;let q=()=>{W(A()),F(Math.floor((Date.now()-z)/1e3))};q();let be=setInterval(q,100);return()=>clearInterval(be)},[A,s.phase]),D(()=>{if(!s.notice)return;let z=setTimeout(()=>{d({type:"CLEAR_NOTICE"})},t);return()=>clearTimeout(z)},[t,s.notice]);let O=C(()=>{d({type:"CLEAR_NOTICE"})},[]),ne=C(async()=>{let z=g.current,q=v.current;v.current=null;let be=q!==null?Math.max(0,Date.now()-q):void 0;d({type:"STOP"});let Xe=await w();if(!(!y()||!Xe))try{let Je=await Xe.stop();if(!y())return;H("stop",Ye(z));let mt=await Oi(a,Je,{...K.current,audioDurationMs:be});if(!y())return;Hi(mt,o,d,z)}catch(Je){if(!y())return;H("error",Ye(z)),d({type:"FAILURE",message:Po(Je)})}},[o,y,a,w]),Ne=C(async()=>{let z=ln()??u.current??ye({});g.current=z,I(!1),d({type:"START"}),await E(()=>{I(!0),ne()},z)},[ne,E]),Ut=C(()=>{s.phase==="recording"||s.phase==="starting"?ne():s.phase!=="processing"&&Ne()},[Ne,ne,s.phase]);return{phase:s.phase,error:s.error,notice:s.notice,level:te,seconds:N,autoStopped:Y,onClick:Ut,cancel:R,clearNotice:O,beginDictation:Ne,finishDictation:ne}}var Ui="Dictation",zi={idle:"Start dictation",starting:"Stop dictation",recording:"Stop dictation",processing:"Transcribing",error:"Start dictation"},No={position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",border:0};function Do({startSession:e=ge}){let t=Ie(),o=ze(),r=$e();return So(t.micVisibility,o?.scope,r?.projectId)?n($i,{startSession:e}):null}function $i({startSession:e=ge}){oe();let{phase:t,error:o,notice:r,onClick:i,cancel:a,clearNotice:p,level:s,seconds:d,autoStopped:m}=ko({startSession:e}),u=t==="starting"||t==="recording"||t==="processing",g=t==="idle"&&!!r,v=`${Math.floor(d/60)}:${String(d%60).padStart(2,"0")}`;return l("div",{className:`pv-mic pv-dictation-pill pv-phase-${t} ${g?"pv-has-notice":""}`,onClick:g?p:void 0,title:g?"Click to dismiss":void 0,children:[n("button",{type:"button",className:`pv-mic-button pv-mic-${t} ${u?"pv-pill-btn-stop":"pv-idle-icon"}`,"aria-label":Ui,"aria-pressed":t==="recording"||t==="starting",title:zi[t],disabled:t==="processing",onClick:i,style:g?{display:"none"}:void 0,children:t==="idle"||t==="error"?n("svg",{viewBox:"0 0 24 24",width:"16",height:"16","aria-hidden":"true",focusable:"false",children:n("path",{d:"M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5Zm6 9h2v-3h-2v3Z",fill:"currentColor"})}):t==="processing"?n("span",{className:"pv-mic-spinner","aria-hidden":"true"}):n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("rect",{x:"6",y:"6",width:"12",height:"12",rx:"2.5",fill:"currentColor"})})}),g?l("span",{role:"status",className:"pv-notice-content",children:[n("span",{className:"pv-notice-check",children:"\u2713"}),n("span",{className:"pv-pill-status",children:r})]}):null,t==="starting"?l(Z,{children:[l("div",{className:"pv-pill-timer-badge",children:[n("div",{className:"pv-pill-dot pv-pill-dot-starting"}),n("span",{className:"pv-pill-timer-text",children:"0:00"})]}),l("div",{className:"pv-pill-center",role:"status",children:[n("span",{className:"pv-mic-spinner","aria-hidden":"true"}),n("span",{className:"pv-pill-status",children:"Requesting microphone\u2026"})]})]}):null,t==="recording"?l(Z,{children:[l("div",{className:"pv-pill-timer-badge",children:[n("div",{className:"pv-pill-dot"}),l("span",{className:"pv-pill-timer-text",children:[n("span",{className:"pv-sr-only",style:No,children:"Recording "}),v]})]}),l("div",{className:"pv-pill-center",role:"status",children:[s===null?n("span",{className:"pv-sr-only",style:No,children:"Audio meter unavailable"}):null,n("span",{className:`pv-pill-waveform ${s===null?"animated":""}`,"aria-label":"Microphone audio activity",role:"meter","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":Math.round((s??.3)*100),children:[.4,.7,1,.7,.4].map((h,E)=>n("span",{className:"pv-pill-waveform-bar",style:s!==null?{height:`${Math.max(3,s*h*20)}px`}:void 0},E))}),n("span",{className:"pv-pill-status",children:"Listening..."}),s!==null&&s<.015&&d>=5?n("span",{className:"pv-mic-quiet-warning",children:"No audio detected \u2014 check your microphone."}):null]})]}):null,t==="processing"?l(Z,{children:[n("div",{className:"pv-pill-timer-badge",children:n("span",{className:"pv-pill-timer-text",children:v})}),n("div",{className:"pv-pill-center",role:"status",children:l("span",{className:"pv-pill-status",children:[n("span",{className:"pv-mic-spinner","aria-hidden":"true"})," ",m?"Recording limit reached. ":"","Transcribing and refining\u2026"]})})]}):null,t==="starting"||t==="recording"?n("button",{type:"button",className:"pv-mic-cancel pv-pill-btn-cancel",onClick:a,"aria-label":"Cancel recording",title:"Cancel recording",children:n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("path",{d:"M18 6L6 18M6 6l12 12",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round"})})}):null,t==="error"&&o?n("span",{role:"alert",className:"pv-pill-status pv-mic-error",children:o}):null]})}var Bi=500,Gi=5e3;function hn(e){return e>=1e3**3?`${(e/1e3**3).toFixed(1)} GB`:`${Math.round(e/1e3**2)} MB`}function Wi(e){return e.runtime.status==="installing"||e.server.state==="starting"||e.models.some(t=>t.status==="downloading")}function Yi(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}function qi(e){let[t,o]=b(null),[r,i]=b(null),[a,p]=b(null),s=S(!0),d=C(v=>{if(s.current){if(!Yi(v)){i("Local Whisper returned an unexpected response.");return}v.state&&o(v.state),i(v.ok?null:v.message)}},[]),m=C(()=>e.call(pe.state).then(d,()=>s.current&&i("Could not load Local Whisper status.")),[e,d]),u=C(async(v,h,E)=>{p(v);try{d(await e.call(h,E))}catch{s.current&&i("Local Whisper request failed. Try again.")}finally{s.current&&p(null)}},[e,d]);D(()=>(s.current=!0,m(),()=>{s.current=!1}),[m]);let g=t?Wi(t):!1;return D(()=>{let v=setInterval(()=>void m(),g?Bi:Gi);return()=>clearInterval(v)},[g,m]),{state:t,error:r,pending:a,run:u}}function yn({tone:e}){return n("span",{"aria-hidden":"true",style:{width:9,height:9,borderRadius:"50%",marginTop:4,flex:"none",background:{ok:"var(--ps-success)",warn:"var(--ps-warn)",err:"var(--ps-danger)",busy:"var(--ps-accent)",idle:"var(--ps-text-muted)"}[e]}})}function _o({value:e,label:t}){let o=Math.round(e*100);return n("div",{role:"progressbar","aria-label":t,"aria-valuenow":o,"aria-valuemin":0,"aria-valuemax":100,style:{height:5,minWidth:80,background:"var(--ps-bg-hover)",borderRadius:3,overflow:"hidden"},children:n("div",{style:{width:`${o}%`,height:"100%",background:"var(--ps-accent)"}})})}var Mt={display:"flex",gap:10,alignItems:"flex-start",padding:"10px 12px",borderRadius:6,border:"1px solid var(--ps-border)"},Te={color:"var(--ps-text-muted)",fontSize:11};function Zi(e){let{runtime:t,server:o,activeModelId:r}=e;return t.status==="not-installed"?{tone:"idle",title:"Runtime not installed",detail:`whisper.cpp ${t.version} \xB7 requires ${t.requirements.join(", ")||"no extra components"}`,action:{label:"Install runtime",method:pe.installRuntime,primary:!0}}:t.status==="installing"?{tone:"busy",title:`Installing runtime\u2026 ${Math.round((t.progress??0)*100)}%`,detail:"Verifying the download as it arrives.",action:{label:"Cancel",method:pe.cancelRuntimeInstall}}:o.state==="running"?{tone:"ok",title:"Running",detail:`Model ${o.modelId} \xB7 on this device (127.0.0.1) \xB7 managed by Prompt Voice`,action:{label:"Stop",method:pe.stop}}:o.state==="starting"?{tone:"busy",title:"Starting\u2026",detail:`Loading model ${o.modelId}.`}:o.state==="crashed"?{tone:"err",title:"Stopped unexpectedly",detail:`Exit code ${o.exitCode??"unknown"}. Logs contain no audio or transcripts.`,action:{label:"Restart",method:pe.start,primary:!0}}:r?{tone:"warn",title:"Stopped",detail:"Starts automatically when you dictate.",action:{label:"Start",method:pe.start}}:{tone:"warn",title:"Runtime installed",detail:"Download a model below and choose Use to start."}}function Ki({model:e,state:t,pending:o,onRun:r}){let i=t.activeModelId===e.id,a=t.runtime.status==="installed"&&!i,p=u=>`${u}:${e.id}`,s={modelId:e.id},d=null,m;return e.status==="downloading"?(d=l(Z,{children:[n(_o,{value:e.progress??0,label:`Downloading ${e.label}`}),l("span",{style:Te,children:[Math.round((e.progress??0)*100),"% of ",hn(e.sizeBytes)]})]}),m=n("button",{type:"button",className:"ps-btn",onClick:()=>r(p("cancel"),pe.cancelModelDownload,s),children:"Cancel"})):e.status==="available"?m=l("button",{type:"button",className:"ps-btn",disabled:o===p("download"),onClick:()=>r(p("download"),pe.downloadModel,s),children:["Download ",hn(e.sizeBytes)]}):(d=i?n("span",{className:"ps-tag",children:"Active"}):o===p("use")?n("span",{className:"ps-tag",children:"Loading\u2026"}):n("span",{className:"ps-tag",children:"Installed"}),m=l(Z,{children:[a&&n("button",{type:"button",className:"ps-btn",disabled:o!==null,onClick:()=>r(p("use"),pe.selectModel,s),children:"Use"}),n("button",{type:"button",className:"ps-btn ps-btn-danger",disabled:i||o!==null,title:i?"Choose another model before removing this one":void 0,"aria-label":`Remove ${e.label}`,onClick:()=>r(p("remove"),pe.removeModel,s),children:"Remove"})]})),l("tr",{style:i?{background:"color-mix(in srgb, var(--ps-accent) 10%, transparent)"}:void 0,children:[l("td",{style:{padding:"8px 6px"},children:[n("strong",{children:e.label})," ",e.recommended&&n("span",{className:"ps-tag",children:"Recommended"})]}),l("td",{style:{padding:"8px 6px",...Te},children:[hn(e.sizeBytes)," disk",e.memoryEstimate?l(Z,{children:[n("br",{}),e.memoryEstimate," RAM"]}):null]}),n("td",{style:{padding:"8px 6px"},children:n("div",{style:{display:"flex",flexDirection:"column",gap:4},children:d})}),n("td",{style:{padding:"8px 6px",textAlign:"right",whiteSpace:"nowrap"},children:n("div",{style:{display:"inline-flex",gap:6},children:m})})]})}function Xi(e,t){let o=e==="local-whisper";return o&&t==="none"?{offline:!0,text:"Audio and text stay on this device."}:o?{offline:!1,text:"Audio stays on this device. Cleanup sends the transcript to your selected cleanup model."}:{offline:!1,text:"Audio leaves this device for transcription."}}function Mo({rpc:e,sttProvider:t,llmProvider:o,onApplyPreset:r}){let{state:i,error:a,pending:p,run:s}=qi(e),d=Xi(t,o),m=i?.runtime.status==="installed"&&i.activeModelId!==null;return l("section",{className:"ps-pane",style:{flex:"none"},"aria-labelledby":"ps-lw-title",children:[l("div",{className:"ps-pane-header",children:[n("h2",{id:"ps-lw-title",className:"ps-pane-title",style:{margin:0},children:"Local Whisper"}),n("span",{className:"ps-tag",children:i?i.platform.supported?m?"Ready":"Not set up":"Unavailable":"Loading\u2026"})]}),l("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[n("p",{style:{...Te,margin:0},children:"Transcribe on this device. Audio is never sent anywhere when Local Whisper is the speech provider."}),(a||i?.lastError)&&n("div",{role:"alert",style:{...Mt,borderColor:"var(--ps-danger)",color:"var(--ps-danger)",fontSize:12},children:a??i?.lastError?.message}),i&&!i.platform.supported&&l("div",{style:Mt,children:[n(yn,{tone:"err"}),l("div",{children:[n("strong",{children:"Not available on this computer"}),n("div",{style:Te,children:i.platform.message})]})]}),i?.platform.supported&&n(Ji,{state:i,pending:p,onRun:s}),i?.platform.supported&&l("div",{children:[l("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"baseline"},children:[n("span",{className:"ps-field-label",children:"Models \xB7 multilingual"}),n("span",{style:Te,children:"Stored in this computer's app data"})]}),l("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:12},children:[n("thead",{children:n("tr",{children:["Model","Size","Status",""].map(u=>n("th",{style:{textAlign:"left",...Te,fontWeight:600,padding:"4px 6px"},children:u},u))})}),n("tbody",{children:i.models.map(u=>n(Ki,{model:u,state:i,pending:p,onRun:s},u.id))})]})]}),l("div",{style:Mt,children:[n(yn,{tone:d.offline?"ok":"warn"}),l("div",{style:{flex:1},children:[n("strong",{children:d.offline?"Fully offline":"Not fully offline"}),n("div",{style:Te,children:d.text})]}),!d.offline&&n("button",{type:"button",className:"ps-btn",onClick:()=>r({sttProvider:"local-whisper",llmProvider:"none"}),children:"Use offline preset"})]})]})]})}function Ji({state:e,pending:t,onRun:o}){let r=Zi(e);return l("div",{style:Mt,"aria-live":"polite",children:[n(yn,{tone:r.tone}),l("div",{style:{flex:1,minWidth:0},children:[n("strong",{children:r.title}),n("div",{style:Te,children:r.detail}),e.runtime.status==="installing"&&n("div",{style:{marginTop:6},children:n(_o,{value:e.runtime.progress??0,label:"Installing runtime"})})]}),r.action&&n("button",{type:"button",className:r.action.primary?"ps-btn ps-btn-primary":"ps-btn",disabled:t==="runtime",onClick:()=>o("runtime",r.action.method),children:r.action.label})]})}function Qi({statusMessage:e}){return l("div",{className:"ps-vis-header",children:[l("div",{children:[n("h3",{id:"ps-visibility-heading",className:"ps-vis-title",children:"Where Prompt Voice Appears"}),n("p",{className:"ps-vis-subtitle",children:"Control whether Prompt Voice surfaces on the main Home screen, inside Projects, and in thread composers."})]}),n("div",{className:"ps-vis-status-slot",children:e?n("span",{role:"status",className:"ps-vis-status",children:e}):null})]})}function es({activePreset:e,disabled:t,onSelect:o}){return n("div",{className:"ps-vis-presets",role:"group","aria-label":"Surface visibility presets",children:mn.map(r=>{let i=e===r.id;return l("button",{type:"button",className:`ps-vis-preset-card ${i?"active":""}`,"aria-pressed":i,disabled:t,onClick:()=>o(r.settings),children:[n("span",{className:"ps-vis-preset-label",children:r.label}),n("span",{className:"ps-vis-preset-desc",children:r.description})]},r.id)})})}function Lo({labelId:e,title:t,helpText:o,checked:r,disabled:i,onToggle:a}){return l("div",{className:"ps-toggle-card",children:[l("div",{className:"ps-toggle-copy",children:[n("span",{id:e,className:"ps-toggle-title",children:t}),n("small",{className:"ps-vis-help",children:o})]}),n("button",{type:"button",className:"ps-switch",role:"switch","aria-checked":r,"aria-labelledby":e,disabled:i,onClick:a})]})}function ts({value:e,disabled:t,onChange:o}){return l("div",{className:"ps-toggle-card ps-vis-select-row",children:[l("div",{className:"ps-toggle-copy",children:[n("label",{htmlFor:"ps-vis-mic-select",className:"ps-toggle-title",children:"Composer mic button placement"}),n("small",{className:"ps-vis-help",children:"Choose which chat composers display the voice dictation mic pill."})]}),n("select",{id:"ps-vis-mic-select","aria-label":"Composer mic button placement",className:"ps-select ps-vis-select",value:e,disabled:t,onChange:r=>o(r.target.value),children:un.map(r=>n("option",{value:r,children:yo[r]},r))})]})}function Lt(e){oe();let t=Ie(),o=xo(t),[r,i]=b(!1),[a,p]=b(null),[s,d]=b(null),m=async u=>{i(!0),d(null),p("Saving\u2026");try{await Dt(Ue,u),p("Saved")}catch(g){p(null),d(g instanceof Error?g.message:"Could not update visibility settings.")}finally{i(!1)}};return l("section",{className:"ps-vis-section","aria-labelledby":"ps-visibility-heading",children:[n(Qi,{statusMessage:a}),s?n("div",{role:"alert",className:"ps-vis-error",children:s}):null,n(es,{activePreset:o,disabled:r,onSelect:u=>void m(u)}),l("div",{className:"ps-vis-controls",children:[n(Lo,{labelId:"ps-vis-home-label",title:"Main Home screen widget",helpText:"Show a quick-dictate & Prompt Studio card on Zana\u2019s main Home screen.",checked:t.showHomeWidget,disabled:r,onToggle:()=>void m({showHomeWidget:!t.showHomeWidget})}),n(Lo,{labelId:"ps-vis-projects-label",title:"Prompt Studio tab in projects",helpText:"Display a dedicated Prompt Studio tab inside each project with project-scoped drafts.",checked:t.showInProjects,disabled:r,onToggle:()=>void m({showInProjects:!t.showInProjects})}),n(ts,{value:t.micVisibility,disabled:r,onChange:u=>void m({micVisibility:u})})]}),l("p",{className:"ps-vis-note",children:["Tip: You can hide or reorder the global ",n("strong",{children:"Prompt Studio"})," item in Zana\u2019s left sidebar using Zana\u2019s sidebar customize menu."]})]})}function xn(e){if(typeof e!="string")return[];let t=new Set,o=/[,\n]/;for(let r of e.split(o)){let i=r.trim().slice(0,80);if(i&&t.add(i),t.size>=200)break}return[...t]}function Oo(e,t){let o=xn(t);if(o.length===0)return[...e];let r=new Set(e),i=[...e];for(let a of o){if(i.length>=200)break;r.has(a)||(r.add(a),i.push(a))}return i}function Sn(e){return e.join(`
`)}var Ho=[100,500,2e3,0],Vo=[30,90,365,0];function ns(e){return!(e===!1||typeof e=="string"&&e.trim().toLowerCase()==="false")}function jo(e,t,o){let r=typeof e=="number"?e:typeof e=="string"&&e.trim()!==""?Number(e):Number.NaN;if(!Number.isFinite(r)||r<0)return t;let i=Math.round(r);return Math.min(o,i)}function os(e){return jo(e,500,5e4)}function rs(e){return jo(e,90,3650)}function Fo(e){let t=e??{};return{historyEnabled:ns(t.historyEnabled),historyMaxEntries:os(t.historyMaxEntries),historyMaxDays:rs(t.historyMaxDays)}}var Ot=[{code:"auto",label:"Detect automatically"},{code:"af",label:"Afrikaans"},{code:"ar",label:"Arabic"},{code:"hy",label:"Armenian"},{code:"az",label:"Azerbaijani"},{code:"eu",label:"Basque"},{code:"be",label:"Belarusian"},{code:"bn",label:"Bengali"},{code:"bs",label:"Bosnian"},{code:"bg",label:"Bulgarian"},{code:"ca",label:"Catalan"},{code:"zh",label:"Chinese"},{code:"hr",label:"Croatian"},{code:"cs",label:"Czech"},{code:"da",label:"Danish"},{code:"nl",label:"Dutch"},{code:"en",label:"English"},{code:"et",label:"Estonian"},{code:"fi",label:"Finnish"},{code:"fr",label:"French"},{code:"gl",label:"Galician"},{code:"ka",label:"Georgian"},{code:"de",label:"German"},{code:"el",label:"Greek"},{code:"gu",label:"Gujarati"},{code:"he",label:"Hebrew"},{code:"hi",label:"Hindi"},{code:"hu",label:"Hungarian"},{code:"is",label:"Icelandic"},{code:"id",label:"Indonesian"},{code:"ga",label:"Irish"},{code:"it",label:"Italian"},{code:"ja",label:"Japanese"},{code:"kn",label:"Kannada"},{code:"kk",label:"Kazakh"},{code:"ko",label:"Korean"},{code:"lv",label:"Latvian"},{code:"lt",label:"Lithuanian"},{code:"mk",label:"Macedonian"},{code:"ms",label:"Malay"},{code:"ml",label:"Malayalam"},{code:"mt",label:"Maltese"},{code:"mr",label:"Marathi"},{code:"ne",label:"Nepali"},{code:"no",label:"Norwegian"},{code:"fa",label:"Persian"},{code:"pl",label:"Polish"},{code:"pt",label:"Portuguese"},{code:"pa",label:"Punjabi"},{code:"ro",label:"Romanian"},{code:"ru",label:"Russian"},{code:"sr",label:"Serbian"},{code:"sk",label:"Slovak"},{code:"sl",label:"Slovenian"},{code:"es",label:"Spanish"},{code:"sw",label:"Swahili"},{code:"sv",label:"Swedish"},{code:"tl",label:"Tagalog"},{code:"ta",label:"Tamil"},{code:"te",label:"Telugu"},{code:"th",label:"Thai"},{code:"tr",label:"Turkish"},{code:"uk",label:"Ukrainian"},{code:"ur",label:"Urdu"},{code:"vi",label:"Vietnamese"},{code:"cy",label:"Welsh"}],qe="en",wn=Ot.filter(e=>e.code!=="auto");function Ze(e){if(typeof e!="string")return;let t=e.trim().toLowerCase();if(t)return wn.find(o=>o.code.toLowerCase()===t||o.label.toLowerCase()===t)}function zo(){if(!(typeof navigator>"u"))return navigator.mediaDevices}function is(e){return e.replace(/^default\s*[-–:]\s*/i,"").trim()}function $o(e){let t=e instanceof Error?e.name:"";return t==="NotAllowedError"||t==="SecurityError"}function Uo(e){let t=e.filter(s=>s.kind==="audioinput"),o=t.some(s=>!!s.label?.trim()),r=null,i=[],a=new Set,p=1;for(let s of t){let d=s.label?.trim()??"";if(s.deviceId===U){d&&(r=is(d)||d);continue}!s.deviceId||a.has(s.deviceId)||(a.add(s.deviceId),i.push({deviceId:s.deviceId,label:d||`Microphone ${p}`,isDefault:!1}),p++)}return{devices:i,defaultDeviceLabel:r,labelsAvailable:o}}async function ss(e){if(!e.getUserMedia||!e.enumerateDevices)return{ok:!1,permissionDenied:!1};try{return(await e.getUserMedia({audio:!0})).getTracks().forEach(o=>o.stop()),{ok:!0,rawDevices:await e.enumerateDevices()}}catch(t){return $o(t)?{ok:!1,permissionDenied:!0}:(console.warn("Prompt Voice failed to refresh audio input devices",t),{ok:!1,permissionDenied:!1})}}async function Bo(e={}){let t=e.mediaDevices??zo();if(!t?.enumerateDevices)return{devices:[],defaultDeviceLabel:null,labelsAvailable:!1,permissionDenied:!1,supported:!1,error:null};let o;try{o=await t.enumerateDevices()}catch(a){return console.warn("Prompt Voice failed to enumerate audio input devices",a),{devices:[],defaultDeviceLabel:null,labelsAvailable:!1,permissionDenied:$o(a),supported:!0,error:"Could not list microphones. Using System default."}}let r=Uo(o),i=!1;if(e.requestPermissionIfUnlabeled&&!r.labelsAvailable){let a=await ss(t);a.ok?r=Uo(a.rawDevices):i=a.permissionDenied}return{...r,permissionDenied:i,supported:!0,error:null}}function Go(e,t=zo()){if(!t?.addEventListener||!t?.removeEventListener)return()=>{};let o=()=>e();return t.addEventListener("devicechange",o),()=>t.removeEventListener?.("devicechange",o)}function Wo(){let[e,t]=b([]),[o,r]=b(null),[i,a]=b(!0),[p,s]=b(!1),[d,m]=b(null),[u,g]=b(!1),v=S(!0),h=S(0),E=C(async(w=!1)=>{let R=++h.current;v.current&&g(!0);try{let y=await Bo({requestPermissionIfUnlabeled:w});if(!v.current||h.current!==R)return;t(y.devices),r(y.defaultDeviceLabel),a(y.labelsAvailable),s(y.permissionDenied),m(y.error)}catch(y){if(console.warn("Prompt Voice audio device lookup failed",y),!v.current||h.current!==R)return;t([]),m("Could not list microphones. Using System default.")}finally{v.current&&h.current===R&&g(!1)}},[]);return D(()=>{v.current=!0,E(!1);let w=Go(()=>{E(!1)});return()=>{v.current=!1,h.current++,w()}},[E]),{devices:e,defaultDeviceLabel:o,labelsAvailable:i,permissionDenied:p,error:d,isRefreshing:u,refresh:E}}var us={"Voice & transcription":[{key:"sttProvider",label:"Speech-to-text provider",options:["system","google-gemini","openai","local-whisper"]},{key:"inputLanguage",label:"Input language",options:Ot.map(e=>e.code),help:"Spoken language for transcription, or Detect automatically."},{key:"dictionary",label:"Personal dictionary",help:"Add specific names, acronyms, or technical terms to guarantee accurate spelling."}],"Prompt Voice":[{key:"tone",label:"Cleanup tone",options:[...uo],help:"Fixes grammar and clarity in the original language without extending text length."},{key:"customPrompt",label:"Custom cleanup instructions",multiline:!0}],Connections:[]},In={sttProvider:"system",inputLanguage:"auto",tone:"standard"},ms={...Object.fromEntries(Ot.map(e=>[e.code,e.label])),standard:"Standard (Fix & clarify)",casual:"Casual",conversational:"Conversational",formal:"Professional",technical:"Technical",custom:"Custom",system:"Zana voice",none:"Off",assistant:"Zana assistant",openai:"OpenAI",anthropic:"Anthropic",google:"Google AI","google-gemini":"Google Gemini","local-whisper":"Local Whisper (on this device)"};function fs(e,t,o){return e.error?{warn:!0,text:e.error}:e.permissionDenied?{warn:!0,text:"Microphone permission denied. Allow microphone access in system settings to see device names."}:t.micDeviceId!==U&&!o?{warn:!0,text:"Selected microphone is currently disconnected. Recording will fall back to System default until reconnected."}:!e.labelsAvailable&&e.devices.length>0?{warn:!1,text:"Device names are hidden until microphone access is granted. Click Refresh to detect names."}:t.micDeviceId===U?{warn:!1,text:"Uses your OS default input device. Saved selection applies to Prompt Studio and Composer dictation."}:{warn:!1,text:`Using ${o?.label??(t.micLabel||t.micDeviceId)}. Saved until you choose another mic.`}}function gs({prefs:e,audio:t,onSelect:o}){let r=t.devices.find(d=>d.deviceId===e.micDeviceId),i=e.micDeviceId!==U&&!r,a=fs(t,e,r),p=t.defaultDeviceLabel?`System default (${t.defaultDeviceLabel})`:"System default",s=d=>{if(d===U){o(U,"");return}let m=t.devices.find(u=>u.deviceId===d);o(d,m?.label??e.micLabel)};return l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-mic-select",className:"ps-field-label",children:"Input microphone"}),l("div",{className:"ps-mic-row",children:[l("select",{id:"ps-mic-select","aria-label":"Input microphone",className:"ps-select",value:e.micDeviceId,onChange:d=>s(d.target.value),children:[n("option",{value:U,children:p}),t.devices.map(d=>n("option",{value:d.deviceId,children:d.label},d.deviceId)),i&&n("option",{value:e.micDeviceId,children:`${e.micLabel||e.micDeviceId} (Disconnected)`})]}),n("button",{type:"button",className:"ps-btn",onClick:()=>void t.refresh(!0),disabled:t.isRefreshing,"aria-label":"Refresh microphones",title:"Refresh connected audio input devices",children:t.isRefreshing?"Refreshing\u2026":"\u21BB Refresh"})]}),l("div",{className:"ps-audio-status",role:t.error?"alert":void 0,children:[n("span",{className:`ps-audio-dot ${a.warn?"warn":""}`,"aria-hidden":"true"}),n("span",{children:a.text})]})]})}function bs({prefs:e,onToggle:t,onVolumeChange:o}){let r=()=>{e.soundCuesEnabled&&H("start",{enabled:!0,volume:e.soundCuesVolume})};return l(Z,{children:[l("div",{className:"ps-toggle-card",children:[l("div",{className:"ps-toggle-copy",children:[n("span",{id:"ps-sound-cues-label",className:"ps-toggle-title",children:"Sound cues & chimes"}),n("small",{style:{color:"var(--ps-text-muted)"},children:"Play a subtle chime when dictation starts, finishes, or encounters an error."})]}),n("button",{type:"button",className:"ps-switch",role:"switch","aria-checked":e.soundCuesEnabled,"aria-labelledby":"ps-sound-cues-label",onClick:t})]}),l("div",{className:`ps-volume-card ${e.soundCuesEnabled?"":"disabled"}`,children:[l("div",{className:"ps-volume-header",children:[n("label",{htmlFor:"ps-chime-volume",className:"ps-field-label",children:"Chime volume"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 9px",fontSize:11},disabled:!e.soundCuesEnabled,onClick:r,children:"Test chime"})]}),l("div",{className:"ps-volume-controls",children:[n("input",{id:"ps-chime-volume",type:"range",className:"ps-volume-slider","aria-label":"Chime volume",min:0,max:100,step:5,value:e.soundCuesVolume,disabled:!e.soundCuesEnabled,onChange:i=>o(Number(i.target.value)),onPointerUp:r,onKeyUp:i=>{["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(i.key)&&r()}}),l("span",{className:"ps-volume-pct",children:[e.soundCuesVolume,"%"]})]})]})]})}function vs({values:e,onSave:t}){let o=j(()=>ye(e),[e]),r=Wo();return l("section",{className:"ps-pane",style:{flex:"none"},"aria-labelledby":"ps-audio-feedback-title",children:[l("div",{className:"ps-pane-header",children:[n("h2",{id:"ps-audio-feedback-title",className:"ps-pane-title",style:{margin:0},children:"Audio & Feedback"}),n("button",{type:"button",className:"ps-btn",onClick:()=>t({micDeviceId:U,micLabel:"",soundCuesEnabled:String(!0),soundCuesVolume:String(75)}),children:"Reset"})]}),l("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[n(gs,{prefs:o,audio:r,onSelect:(p,s)=>t({micDeviceId:p,micLabel:s})}),n(bs,{prefs:o,onToggle:()=>{let p=!o.soundCuesEnabled;t({soundCuesEnabled:String(p)}),p&&H("start",{enabled:!0,volume:o.soundCuesVolume})},onVolumeChange:p=>t({soundCuesVolume:String(p)})})]})]})}function hs(e){return e===0?"Unlimited":`${e.toLocaleString()} entries`}function ys(e){return e===0?"Forever":e===365?"1 year":`${e} days`}function Yo(e,t){return e.includes(t)?[...e]:[...e,t]}function xs({enabled:e,onToggle:t}){return l("div",{className:"ps-toggle-card",children:[l("div",{className:"ps-toggle-copy",children:[n("span",{id:"ps-history-enabled-label",className:"ps-toggle-title",children:"Save activity history"}),n("small",{style:{color:"var(--ps-text-muted)"},children:"Store text and metadata from dictations and Prompt Studio refinements locally. Audio recordings are never saved."})]}),n("button",{type:"button",className:"ps-switch",role:"switch","aria-checked":e,"aria-labelledby":"ps-history-enabled-label",onClick:t})]})}function Ss({prefs:e,onSave:t}){let o=j(()=>Yo(Ho,e.historyMaxEntries),[e.historyMaxEntries]),r=j(()=>Yo(Vo,e.historyMaxDays),[e.historyMaxDays]);return l("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:12},children:[l("label",{className:"ps-field-group",children:[n("span",{className:"ps-field-label",children:"Maximum entries"}),n("select",{className:"ps-select","aria-label":"Maximum history entries",value:String(e.historyMaxEntries),onChange:i=>t({historyMaxEntries:i.target.value}),children:o.map(i=>n("option",{value:String(i),children:hs(i)},i))}),n("small",{style:{color:"var(--ps-text-muted)"},children:"Starred entries are exempt from automatic pruning."})]}),l("label",{className:"ps-field-group",children:[n("span",{className:"ps-field-label",children:"Retention period"}),n("select",{className:"ps-select","aria-label":"History retention period",value:String(e.historyMaxDays),onChange:i=>t({historyMaxDays:i.target.value}),children:r.map(i=>n("option",{value:String(i),children:ys(i)},i))}),n("small",{style:{color:"var(--ps-text-muted)"},children:"Older non-starred entries are pruned automatically."})]})]})}function ws({includeStarred:e,clearing:t,onIncludeStarredChange:o,onCancel:r,onConfirm:i}){return l("div",{role:"alertdialog","aria-label":"Confirm clear activity history",style:{display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:10,padding:"10px 12px",borderRadius:6,background:"rgba(239, 68, 68, 0.1)",border:"1px solid rgba(239, 68, 68, 0.35)"},children:[l("div",{style:{display:"flex",flexDirection:"column",gap:4},children:[n("strong",{style:{fontSize:12},children:"Clear all activity history?"}),l("label",{style:{display:"inline-flex",alignItems:"center",gap:6,fontSize:11.5,cursor:"pointer"},children:[n("input",{type:"checkbox",checked:e,onChange:a=>o(a.target.checked)}),n("span",{children:"Also delete starred entries"})]})]}),l("div",{style:{display:"flex",gap:6},children:[n("button",{type:"button",className:"ps-btn",disabled:t,onClick:r,children:"Cancel"}),n("button",{type:"button",className:"ps-btn ps-btn-danger",disabled:t,onClick:i,children:t?"Clearing\u2026":"Confirm clear"})]})]})}function Is({rpc:e}){let[t,o]=b(!1),[r,i]=b(!1),[a,p]=b(!1),[s,d]=b(null),m=async()=>{p(!0),d(null);try{let u=await e.call(Pt,{includeStarred:r});o(!1),i(!1),u?.ok?d(u.deletedCount===0?"No matching history entries to clear.":`Cleared ${u.deletedCount} history ${u.deletedCount===1?"entry":"entries"}.`):d("History storage is unavailable.")}catch{d("Could not clear history.")}finally{p(!1)}};return l("div",{style:{display:"flex",flexDirection:"column",gap:8,paddingTop:4,borderTop:"1px solid var(--ps-border)"},children:[t?n(ws,{includeStarred:r,clearing:a,onIncludeStarredChange:i,onCancel:()=>o(!1),onConfirm:()=>void m()}):l("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10},children:[n("small",{style:{color:"var(--ps-text-muted)"},children:"Remove stored dictation and refinement history from this machine."}),n("button",{type:"button",className:"ps-btn ps-btn-danger",onClick:()=>{i(!1),o(!0)},children:"Clear history"})]}),s?n("div",{role:"status",style:{fontSize:11.5,color:"var(--ps-text-muted)"},children:s}):null]})}function Ts({rpc:e,values:t,onSave:o}){let r=j(()=>Fo(t),[t]);return l("section",{className:"ps-pane",style:{flex:"none"},"aria-labelledby":"ps-history-privacy-title",children:[l("div",{className:"ps-pane-header",children:[n("h2",{id:"ps-history-privacy-title",className:"ps-pane-title",style:{margin:0},children:"History & Privacy"}),n("button",{type:"button",className:"ps-btn",onClick:()=>o({historyEnabled:String(!0),historyMaxEntries:String(500),historyMaxDays:String(90)}),children:"Reset"})]}),l("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[n(xs,{enabled:r.historyEnabled,onToggle:()=>o({historyEnabled:String(!r.historyEnabled)})}),n(Ss,{prefs:r,onSave:o}),n(Is,{rpc:e})]})]})}function Es({terms:e,atLimit:t,onRemove:o,onClearAll:r}){return l(Z,{children:[n("div",{className:"ps-dict-well",children:e.length>0?n("ul",{className:"ps-dict-pills","aria-label":"Dictionary terms",children:e.map(i=>l("li",{className:"ps-dict-pill",children:[n("span",{className:"ps-dict-pill-text",children:i}),n("button",{type:"button",className:"ps-dict-pill-remove",onClick:()=>o(i),"aria-label":`Remove ${i}`,title:`Remove ${i}`,children:"\xD7"})]},i))}):n("span",{className:"ps-dict-empty",children:"No terms added yet. Type a term above or paste a comma-separated list."})}),l("div",{className:"ps-dict-footer",children:[l("span",{className:"ps-dict-count",children:[e.length===1?"1 term active":`${e.length} terms active`,t?` (max ${200})`:""]}),n("button",{type:"button",className:"ps-btn ps-dict-clear-btn",onClick:r,disabled:e.length===0,children:"Clear all"})]})]})}function Cs({label:e,help:t,value:o,resetSignal:r,onChange:i}){let[a,p]=b(""),s=j(()=>xn(o),[o]),d=s.length>=200;D(()=>{r>0&&p("")},[r]);let m=()=>{let g=a.trim();if(!g||d)return;let v=Oo(s,g);p(""),v.length!==s.length&&i(Sn(v))};return l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-dictionary-input",className:"ps-field-label",children:e}),t&&n("small",{style:{color:"var(--ps-text-muted)"},children:t}),l("div",{className:"ps-dict-container",children:[l("div",{className:"ps-dict-input-row",children:[n("input",{id:"ps-dictionary-input",type:"text",className:"ps-dict-input",value:a,onChange:g=>p(g.target.value),onKeyDown:g=>{g.key==="Enter"&&(g.preventDefault(),m())},onPaste:g=>{let v=g.clipboardData?.getData("text");if(!v||!/[\r\n]/.test(v))return;g.preventDefault();let h=g.currentTarget.selectionStart??a.length,E=g.currentTarget.selectionEnd??a.length;p(a.slice(0,h)+v.replace(/[\r\n]+/g,", ")+a.slice(E))},placeholder:"Type a term and press Enter (or paste comma-separated)...",disabled:d}),n("button",{type:"button",className:"ps-btn ps-btn-primary ps-dict-add-btn",onClick:m,disabled:!a.trim()||d,children:"+ Add"})]}),n(Es,{terms:s,atLimit:d,onRemove:g=>i(Sn(s.filter(v=>v!==g))),onClearAll:()=>{p(""),i("")}})]})]})}function Rs({field:e,values:t,resetSignal:o,onSave:r}){if(e.key==="dictionary")return n(Cs,{label:e.label,help:e.help,value:t.dictionary??"",resetSignal:o,onChange:p=>r({dictionary:p})});let i=t[e.key]??In[e.key]??"",a=e.options&&e.key==="inputLanguage"&&i&&!e.options.includes(i)?[...e.options,i]:e.options;return l("label",{className:"ps-field-group",children:[n("span",{className:"ps-field-label",children:e.label}),a?n("select",{className:"ps-select",value:i,onChange:p=>r({[e.key]:p.target.value}),children:a.map(p=>n("option",{value:p,children:ms[p]??p},p))}):e.multiline?n("textarea",{className:"ps-custom-prompt-input",value:t[e.key]??"",onChange:p=>r({[e.key]:p.target.value})}):n("input",{type:e.secret?"password":"text",className:"ps-select",value:t[e.key]??"",onChange:p=>r({[e.key]:p.target.value}),placeholder:e.secret?"Enter API key\u2026":void 0}),e.help&&n("small",{style:{color:"var(--ps-text-muted)"},children:e.help})]})}function Zo({rpc:e,onBack:t,pluginId:o}){oe();let[r,i]=b({}),[a,p]=b("Loading\u2026"),[s,d]=b(null),[m,u]=b(0),g=S(0),v=S({}),h=S(e);h.current=e,D(()=>{let w=!0;return h.current.call(xe).then(R=>{if(!w)return;let y=R||{};v.current=y,i(y),fe(y),p("Saved")}).catch(()=>{w&&p("Could not load settings")}),()=>{w=!1}},[]);let E=w=>{let R=++g.current,y=v.current={...v.current,...w};i(y),fe(y),p("Saving\u2026"),h.current.call(Se,y).then(()=>{R===g.current&&(d(null),p("Saved"))}).catch(()=>{R===g.current&&(d(y),p("Could not save settings."))})};return n("div",{className:"ps-workspace",children:n("main",{className:"ps-editor-canvas",style:{overflowY:"auto"},children:l("div",{style:{width:"100%",maxWidth:760,margin:"0 auto",display:"flex",flexDirection:"column",gap:12},children:[l("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12},children:[l("div",{children:[n("h1",{style:{fontSize:18,margin:"4px 0"},children:"Settings"}),n("span",{style:{color:"var(--ps-text-muted)",fontSize:12},children:"Configure voice and cleanup defaults"})]}),n("button",{className:"ps-btn",onClick:t,children:"\u2190 Back to Studio"})]}),l("div",{style:{color:"var(--ps-text-muted)",fontSize:11},children:[n("span",{role:"status",children:a}),s&&n("button",{className:"ps-btn",onClick:()=>E(s),children:"Retry"})]}),n(vs,{values:r,onSave:E}),n(Ts,{rpc:e,values:r,onSave:E}),Object.entries(us).map(([w,R])=>l(eo.Fragment,{children:[l("section",{className:"ps-pane",style:{flex:"none"},children:[l("div",{className:"ps-pane-header",children:[n("h2",{className:"ps-pane-title",style:{margin:0},children:w}),w!=="Connections"&&n("button",{className:"ps-btn",onClick:()=>{w==="Voice & transcription"&&u(y=>y+1),E(Object.fromEntries(R.map(y=>[y.key,In[y.key]??""])))},children:"Reset"})]}),l("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[w==="Connections"&&n("p",{children:"Manage API keys in Zana\u2019s Prompt Voice plugin settings."}),R.filter(y=>!(y.key==="customPrompt"&&r.tone!=="custom")).map(y=>n(Rs,{field:y,values:r,resetSignal:m,onSave:E},y.key))]})]}),w==="Voice & transcription"&&n(Mo,{rpc:e,sttProvider:r.sttProvider??In.sttProvider,llmProvider:r.llmProvider,onApplyPreset:E})]},w)),o?n("section",{className:"ps-pane",style:{flex:"none",padding:14},children:n(Lt,{pluginId:o})}):null]})})})}async function Ke(e){if(!e)return!1;if(typeof navigator<"u"&&navigator.clipboard&&typeof navigator.clipboard.writeText=="function")try{return await navigator.clipboard.writeText(e),!0}catch{}if(typeof document<"u"){let t=document.createElement("textarea");t.value=e,t.setAttribute("readonly",""),t.style.position="fixed",t.style.top="-9999px",t.style.left="-9999px",t.style.opacity="0";try{if(document.body.appendChild(t),t.focus(),t.select(),document.execCommand("copy"))return!0}catch{}finally{t.parentNode&&t.parentNode.removeChild(t)}}return!1}var As={improve:"Improve writing",executive:"Summarize",spec:"Technical spec",custom:"Custom",translate:"Translate"},Ps={standard:"Standard",casual:"Casual",conversational:"Conversational",formal:"Professional",technical:"Technical",custom:"Custom"},Ht={composer:"Composer",home:"Home",studio:"Prompt Studio"},Tn={system:"Zana Voice","local-whisper":"Local Whisper","google-gemini":"Google Gemini",google:"Google Gemini",openai:"OpenAI",anthropic:"Anthropic",assistant:"Zana Assistant"};function Ko(e){if(e.presetId==="translate"||e.targetLanguage){let r=e.targetLanguage?Ze(e.targetLanguage)?.label??e.targetLanguage:null;return r?`Translate \xB7 ${r}`:"Translate"}let t=e.presetId?As[e.presetId]:null,o=e.tone?Ps[e.tone]??e.tone:null;return t==="Improve writing"&&o?`Improve \xB7 ${o}`:t||(o?`Refinement \xB7 ${o}`:"Refinement")}function Vt(e){return e.kind==="dictation"?"Dictation":e.kind==="dictation_cleanup"?e.presetId||e.targetLanguage?`Dictation + ${Ko(e)}`:"Dictation + Cleanup":Ko(e)}function jt(e){if(e===null||!Number.isFinite(e)||e<0)return null;if(e<1e3)return`${Math.round(e)}ms`;let t=Math.round(e/1e3);if(t<60)return`${t}s`;let o=Math.floor(t/60),r=t%60;return`${o}m ${String(r).padStart(2,"0")}s`}function Xo(e,t=Date.now()){let o=Math.max(0,Math.floor((t-e)/1e3));if(o<60)return"Just now";let r=Math.floor(o/60);if(r<60)return`${r}m ago`;let i=Math.floor(r/60);if(i<24)return`${i}h ago`;try{return new Date(e).toLocaleDateString(void 0,{month:"short",day:"numeric"})}catch{return`${Math.floor(i/24)}d ago`}}function Jo(e){try{return new Date(e).toLocaleString(void 0,{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}catch{return String(e)}}function Qo(e,t=Date.now()){let o=new Date(t);o.setHours(0,0,0,0);let r=new Date(o.getTime()-864e5),i={Today:[],Yesterday:[],Earlier:[]};for(let a of e)a.createdAt>=o.getTime()?i.Today.push(a):a.createdAt>=r.getTime()?i.Yesterday.push(a):i.Earlier.push(a);return["Today","Yesterday","Earlier"].filter(a=>i[a].length>0).map(a=>({label:a,entries:i[a]}))}function En(e){let t=e.trim();return`${t?t.split(/\s+/).length:0} words \xB7 ${e.length} chars`}function er(e){return e?e.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]+/gu)||[]:[]}var tr=1200;function Ft(e,t){if(!e&&!t)return[];if(e===t)return[{type:"unchanged",text:e}];if(!e)return[{type:"added",text:t}];if(!t)return[{type:"removed",text:e}];let o=er(e),r=er(t),i=o.length,a=r.length;if(i>tr||a>tr)return[{type:"removed",text:e},{type:"added",text:t}];let p=a+1,s=new Uint32Array((i+1)*p);for(let v=1;v<=i;v++){let h=v*p,E=(v-1)*p,w=o[v-1];for(let R=1;R<=a;R++)if(w===r[R-1])s[h+R]=s[E+(R-1)]+1;else{let y=s[h+(R-1)],A=s[E+R];s[h+R]=y>A?y:A}}let d=[],m=i,u=a;for(;m>0||u>0;){let v=m*p,h=(m-1)*p;m>0&&u>0&&o[m-1]===r[u-1]?(d.push({type:"unchanged",text:o[m-1]}),m--,u--):u>0&&(m===0||s[v+(u-1)]>=s[h+u])?(d.push({type:"added",text:r[u-1]}),u--):m>0&&(u===0||s[v+(u-1)]<s[h+u])&&(d.push({type:"removed",text:o[m-1]}),m--)}d.reverse();let g=[];for(let v of d)g.length>0&&g[g.length-1].type===v.type?g[g.length-1].text+=v.text:g.push({...v});return g}function ks({entry:e,projectName:t,onOpenThread:o}){let r=jt(e.audioDurationMs),i=jt(e.processingDurationMs);return l(Z,{children:[l("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"},children:[l("div",{className:"ps-history-meta-row",children:[n("span",{className:`ps-kind-badge ps-kind-${e.kind}`,children:Vt(e)}),n("span",{className:"ps-source-badge",children:Ht[e.source]??e.source}),t?n("span",{className:"ps-badge ps-badge-project",children:t}):null,n("span",{children:Jo(e.createdAt)})]}),e.threadId&&o?n("button",{type:"button",className:"ps-btn",style:{padding:"4px 9px",fontSize:11},onClick:()=>o(e.threadId),children:"Open thread"}):null]}),l("div",{className:"ps-history-meta-row",children:[e.sttProvider?l("span",{className:"ps-pill",children:["STT: ",Tn[e.sttProvider]??e.sttProvider,e.sttModel?` (${e.sttModel})`:""]}):null,e.llmProvider?l("span",{className:"ps-pill",children:["LLM: ",Tn[e.llmProvider]??e.llmProvider,e.llmModel?` (${e.llmModel})`:""]}):null,r?l("span",{className:"ps-pill",children:["Recorded: ",r]}):null,i?l("span",{className:"ps-pill",children:["Processed: ",i]}):null]})]})}function Ns({entry:e,primaryText:t,hasDistinctOutput:o,showDiff:r,copiedTarget:i,onToggleDiff:a,onCopyText:p,onLoadIntoStudio:s,onInsertIntoComposer:d,onToggleStar:m,onDelete:u}){return l("div",{className:"ps-history-actions-bar",children:[n("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:()=>s(e),children:"Load into Studio"}),n("button",{type:"button",className:"ps-btn",onClick:()=>d(t),children:"Insert into Composer"}),n("button",{type:"button",className:"ps-btn",onClick:()=>p(t,"output"),children:i==="output"?"Copied":o?"Copy Output":"Copy"}),o?l(Z,{children:[n("button",{type:"button",className:"ps-btn",onClick:()=>p(e.rawText,"raw"),children:i==="raw"?"Copied Raw":"Copy Raw"}),n("button",{type:"button",className:"ps-btn","aria-pressed":r,onClick:a,children:r?"View Clean":"View Diff"})]}):null,l("button",{type:"button",className:"ps-btn","aria-pressed":e.starred,onClick:()=>m(e),children:[n("span",{className:e.starred?"ps-star-active":void 0,children:e.starred?"\u2605":"\u2606"}),n("span",{children:e.starred?"Starred":"Star"})]}),n("button",{type:"button",className:"ps-btn ps-btn-danger",style:{marginLeft:"auto"},onClick:()=>u(e),children:"Delete"})]})}function Ds({rawText:e,outputText:t}){let o=j(()=>Ft(e,t),[t,e]);return l("div",{className:"ps-history-text-card",children:[n("div",{className:"ps-pane-header",children:n("span",{className:"ps-pane-title",children:"Word Diff (Raw \u2192 Refined)"})}),n("div",{className:"ps-history-text-body","data-testid":"history-diff-view",children:o.map((r,i)=>n("span",{className:r.type==="added"?"ps-diff-added":r.type==="removed"?"ps-diff-removed":"ps-diff-unchanged",children:r.text},i))})]})}function _s({entry:e,hasDistinctOutput:t}){let o=e.kind==="refinement"?"Original Input":t?"Raw Transcript":"Transcript";return l(Z,{children:[t?l("div",{className:"ps-history-text-card",children:[l("div",{className:"ps-pane-header",children:[n("span",{className:"ps-pane-title",children:"Refined Output"}),n("span",{style:{fontSize:11,color:"var(--ps-text-subtle)"},children:En(e.outputText)})]}),n("div",{className:"ps-history-text-body",children:e.outputText})]}):null,l("div",{className:"ps-history-text-card",children:[l("div",{className:"ps-pane-header",children:[n("span",{className:"ps-pane-title",children:o}),n("span",{style:{fontSize:11,color:"var(--ps-text-subtle)"},children:En(e.rawText)})]}),n("div",{className:"ps-history-text-body",children:e.rawText})]})]})}function nr({entry:e,projectName:t,showDiff:o,onToggleDiff:r,onCopyText:i,onLoadIntoStudio:a,onInsertIntoComposer:p,onToggleStar:s,onDelete:d,onOpenThread:m,copiedTarget:u}){let g=e.rawText!==e.outputText,v=e.outputText||e.rawText;return l("section",{className:"ps-history-detail-pane","aria-label":"Activity details",children:[l("div",{className:"ps-history-detail-header",children:[n(ks,{entry:e,projectName:t,onOpenThread:m}),n(Ns,{entry:e,primaryText:v,hasDistinctOutput:g,showDiff:o,copiedTarget:u,onToggleDiff:r,onCopyText:i,onLoadIntoStudio:a,onInsertIntoComposer:p,onToggleStar:s,onDelete:d})]}),e.refineNotice?l("div",{role:"status",style:{padding:"8px 12px",borderRadius:6,background:"rgba(234, 179, 8, 0.1)",border:"1px solid rgba(234, 179, 8, 0.3)",color:"#fde047",fontSize:12},children:["Cleanup fallback: ",e.refineNotice.message]}):null,e.customPrompt?l("div",{className:"ps-history-text-card",children:[n("div",{className:"ps-pane-header",children:n("span",{className:"ps-pane-title",children:"Custom Instructions"})}),n("div",{className:"ps-history-text-body",style:{fontSize:12,color:"var(--ps-text-muted)"},children:e.customPrompt})]}):null,o&&g?n(Ds,{rawText:e.rawText,outputText:e.outputText}):n(_s,{entry:e,hasDistinctOutput:g})]})}var or=50,Ms=180;function Ls(e){let[t,o]=b(""),[r,i]=b(""),[a,p]=b("all"),[s,d]=b("all"),[m,u]=b(!1),[g,v]=b(e?"project":"all"),[h,E]=b("");D(()=>{v(e?"project":"all"),E("")},[e]),D(()=>{let A=setTimeout(()=>i(t.trim()),Ms);return()=>clearTimeout(A)},[t]);let w=e?g==="project"?e:null:h||null,R=!!(r||a!=="all"||s!=="all"||m||h),y=C(()=>{o(""),i(""),p("all"),d("all"),u(!1),E("")},[]);return{searchInput:t,setSearchInput:o,debouncedQuery:r,typeFilter:a,setTypeFilter:p,sourceFilter:s,setSourceFilter:d,starredOnly:m,setStarredOnly:u,scopeMode:g,setScopeMode:v,selectedProjectFilter:h,setSelectedProjectFilter:E,effectiveProjectId:w,hasActiveFilters:R,resetFilters:y}}function Os(e){let[t,o]=b([]),r=C(()=>{e.current.call(ao).then(a=>{a&&Array.isArray(a.projects)&&o(a.projects)}).catch(()=>{})},[e]);D(()=>{r()},[r]);let i=j(()=>new Map(t.map(a=>[a.id,a.name])),[t]);return{projects:t,projectNameById:i,loadProjects:r}}function Hs(e,t,o,r,i){return C(async a=>{try{let p=await e.current.call(io,{id:a.id,starred:!a.starred});if(!p?.ok||!p.entry){i?.("Could not update star status.");return}t&&!p.entry.starred?(o(s=>s.filter(d=>d.id!==a.id)),r(s=>Math.max(0,s-1))):o(s=>s.map(d=>d.id===a.id?p.entry:d))}catch{i?.("Could not update star status.")}},[i,e,o,r,t])}function Vs(e,t,o,r){return C(async i=>{try{let a=await e.current.call(so,{id:i.id});if(!a?.ok||!a.deleted){r?.("Could not delete history entry.");return}t(p=>p.filter(s=>s.id!==i.id)),o(p=>Math.max(0,p-1)),r?.("History entry deleted.")}catch{r?.("Could not delete history entry.")}},[r,e,t,o])}function js(e,t,o,r){let[i,a]=b(!1),p=C(async s=>{a(!0);try{let d=await e.current.call(Pt,{projectId:t,includeStarred:s});if(!d?.ok){r?.("Could not clear history.");return}r?.(d.deletedCount===0?"No matching entries were cleared.":`Cleared ${d.deletedCount} history ${d.deletedCount===1?"entry":"entries"}.`),await o()}catch{r?.("Could not clear history.")}finally{a(!1)}},[t,r,o,e]);return{clearing:i,clearHistory:p}}function Fs(e,t){let[o,r]=b([]),[i,a]=b(0),[p,s]=b(!1),[d,m]=b(!0),[u,g]=b(!0),[v,h]=b(!0),[E,w]=b(!1),[R,y]=b(null),A=S(0),te=C(async(W={})=>{let N=++A.current,F=W.append===!0;F?w(!0):h(!0),y(null);try{let Y=await e.current.call(ro,{query:t.query||void 0,type:t.type,source:t.source,projectId:t.projectId,starredOnly:t.starredOnly,limit:W.limit??or,offset:W.offset??0});if(A.current!==N)return;let I=Array.isArray(Y?.entries)?Y.entries:[];r(K=>F?[...K,...I]:I),a(typeof Y?.total=="number"?Y.total:I.length),s(!!Y?.hasMore),m(Y?.historyEnabled!==!1),g(Y?.storageAvailable!==!1)}catch(Y){if(A.current!==N)return;y(Y instanceof Error?Y.message:"Could not load activity history.")}finally{A.current===N&&(h(!1),w(!1))}},[t.projectId,t.query,t.source,t.starredOnly,t.type,e]);return{entries:o,setEntries:r,total:i,setTotal:a,hasMore:p,historyEnabled:d,storageAvailable:u,loading:v,loadingMore:E,error:R,fetchEntries:te}}function Us({entriesRef:e,starredOnly:t,setEntries:o,setTotal:r,fetchEntries:i,loadProjects:a}){pt(po,p=>{let s=p&&typeof p=="object"?p:{},d=Math.max(or,e.current.length);if(s.action==="deleted"&&typeof s.id=="string"){if(!e.current.some(m=>m.id===s.id))return;o(m=>m.filter(u=>u.id!==s.id)),r(m=>Math.max(0,m-1));return}if(s.action==="starred"&&typeof s.id=="string"&&typeof s.starred=="boolean"){let m=e.current.some(u=>u.id===s.id);t&&s.starred&&!m?i({offset:0,limit:d,append:!1}):m&&t&&!s.starred?(o(u=>u.filter(g=>g.id!==s.id)),r(u=>Math.max(0,u-1))):m&&o(u=>u.map(g=>g.id===s.id?{...g,starred:s.starred}:g));return}if(s.action==="settingsChanged"){i({offset:0,limit:d,append:!1});return}i({offset:0,limit:d,append:!1}),(!s.action||s.action==="recorded"||s.action==="cleared"||s.action==="pruned")&&a()})}function rr({rpc:e,projectId:t,onStatusNotice:o}){let r=S(e);r.current=e;let i=Ls(t),{projects:a,projectNameById:p,loadProjects:s}=Os(r),[d,m]=b(null),u=Fs(r,{query:i.debouncedQuery,type:i.typeFilter,source:i.sourceFilter,projectId:i.effectiveProjectId,starredOnly:i.starredOnly}),g=S(u.entries);g.current=u.entries;let v=C(()=>u.fetchEntries({offset:0,append:!1}),[u.fetchEntries]);D(()=>{v()},[v]),Us({entriesRef:g,starredOnly:i.starredOnly,setEntries:u.setEntries,setTotal:u.setTotal,fetchEntries:u.fetchEntries,loadProjects:s});let h=Hs(r,i.starredOnly,u.setEntries,u.setTotal,o),E=Vs(r,u.setEntries,u.setTotal,o),{clearing:w,clearHistory:R}=js(r,i.effectiveProjectId,v,o),y=j(()=>u.entries.length===0?null:u.entries.find(A=>A.id===d)??u.entries[0],[u.entries,d]);return{...i,...u,clearing:w,toggleStar:h,deleteEntry:E,clearHistory:R,projects:a,projectNameById:p,selectedEntry:y,setSelectedId:m}}var zs=`
  .ps-history-shell {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .ps-history-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 16px;
    background: rgba(234, 179, 8, 0.1);
    border-bottom: 1px solid rgba(234, 179, 8, 0.25);
    color: #fde047;
    font-size: 12px;
    flex-shrink: 0;
  }

  .ps-history-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--ps-border);
    background: var(--ps-panel-bg);
    flex-shrink: 0;
  }

  .ps-history-search-wrap {
    position: relative;
    flex: 1 1 200px;
    min-width: 160px;
    max-width: 340px;
    display: flex;
    align-items: center;
  }

  .ps-history-search {
    width: 100%;
    padding: 6px 26px 6px 10px;
    border-radius: 6px;
    border: 1px solid var(--ps-border);
    background: var(--ps-input-bg);
    color: var(--text-primary, #e2e8f0);
    font-size: 12px;
    outline: none;
  }
  .ps-history-search:focus {
    border-color: var(--ps-accent);
    box-shadow: 0 0 0 1px var(--ps-accent);
  }

  .ps-history-search-clear {
    position: absolute;
    right: 6px;
    border: none;
    background: transparent;
    color: var(--ps-text-muted);
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    padding: 2px 4px;
  }
  .ps-history-search-clear:hover {
    color: var(--text-primary, #e2e8f0);
  }

  .ps-segmented {
    display: inline-flex;
    align-items: center;
    background: var(--ps-input-bg);
    border: 1px solid var(--ps-border);
    border-radius: 6px;
    padding: 2px;
    gap: 2px;
  }

  .ps-segmented-btn {
    border: none;
    background: transparent;
    color: var(--ps-text-muted);
    font-size: 11.5px;
    font-weight: 500;
    padding: 4px 9px;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.12s, color 0.12s;
  }
  .ps-segmented-btn:hover {
    color: var(--text-primary, #e2e8f0);
  }
  .ps-segmented-btn.active {
    background: rgba(59, 130, 246, 0.2);
    color: var(--text-primary, #e2e8f0);
  }

  .ps-history-confirm-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 16px;
    background: rgba(239, 68, 68, 0.1);
    border-bottom: 1px solid rgba(239, 68, 68, 0.35);
    font-size: 12px;
    flex-shrink: 0;
  }

  .ps-history-split {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .ps-history-list-pane {
    width: 340px;
    border-right: 1px solid var(--ps-border);
    background: var(--ps-panel-bg);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    flex-shrink: 0;
  }

  .ps-history-group-header {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 6px 12px;
    font-size: 10.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--ps-text-subtle);
    background: var(--ps-panel-bg);
    border-bottom: 1px solid var(--ps-border);
  }

  .ps-history-row {
    width: 100%;
    text-align: left;
    border: none;
    border-bottom: 1px solid var(--ps-border);
    background: transparent;
    color: var(--text-primary, #e2e8f0);
    padding: 10px 12px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 5px;
    transition: background 0.12s;
  }
  .ps-history-row:hover {
    background: rgba(255, 255, 255, 0.04);
  }
  .ps-history-row.selected {
    background: rgba(59, 130, 246, 0.14);
    box-shadow: inset 3px 0 0 var(--ps-accent);
  }

  .ps-history-row-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  .ps-history-row-badges {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    flex-wrap: wrap;
  }

  .ps-history-snippet {
    font-size: 12.5px;
    line-height: 1.4;
    color: var(--text-primary, #e2e8f0);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
  }

  .ps-history-row-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    font-size: 10.5px;
    color: var(--ps-text-subtle);
  }

  .ps-history-detail-pane {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 16px;
    gap: 14px;
    background: var(--bg-base, #121417);
  }

  .ps-history-detail-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--ps-border);
  }

  .ps-history-meta-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--ps-text-muted);
  }

  .ps-history-actions-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .ps-history-text-card {
    border: 1px solid var(--ps-border);
    border-radius: 8px;
    background: var(--ps-panel-bg);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .ps-history-text-body {
    padding: 12px 14px;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--text-primary, #e2e8f0);
    user-select: text;
    background: var(--ps-input-bg);
  }

  .ps-kind-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    white-space: nowrap;
  }
  .ps-kind-dictation {
    background: rgba(59, 130, 246, 0.16);
    color: #93c5fd;
  }
  .ps-kind-dictation_cleanup {
    background: rgba(168, 85, 247, 0.16);
    color: #d8b4fe;
  }
  .ps-kind-refinement {
    background: rgba(34, 197, 94, 0.16);
    color: #86efac;
  }

  .ps-source-badge {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.07);
    color: var(--ps-text-muted);
    white-space: nowrap;
  }

  .ps-star-active {
    color: #facc15;
  }

  @media (max-width: 780px) {
    .ps-history-split {
      flex-direction: column;
    }
    .ps-history-list-pane {
      width: 100%;
      max-height: 40%;
      border-right: none;
      border-bottom: 1px solid var(--ps-border);
    }
  }
`;function $s({projectId:e,scopeMode:t,onScopeModeChange:o,selectedProjectFilter:r,onSelectedProjectFilterChange:i,projects:a}){return e?l("div",{className:"ps-segmented",role:"group","aria-label":"Project scope",children:[n("button",{type:"button",className:`ps-segmented-btn ${t==="project"?"active":""}`,"aria-pressed":t==="project",onClick:()=>o("project"),children:"This project"}),n("button",{type:"button",className:`ps-segmented-btn ${t==="all"?"active":""}`,"aria-pressed":t==="all",onClick:()=>o("all"),children:"All activity"})]}):a.length===0?null:l("select",{className:"ps-select",style:{width:"auto",minWidth:130},"aria-label":"Filter by project",value:r,onChange:p=>i(p.target.value),children:[n("option",{value:"",children:"All projects"}),a.map(p=>n("option",{value:p.id,children:p.name},p.id))]})}function Bs({search:e,onSearchChange:t,typeFilter:o,onTypeFilterChange:r,sourceFilter:i,onSourceFilterChange:a,starredOnly:p,onStarredToggle:s,projectId:d,scopeMode:m,onScopeModeChange:u,selectedProjectFilter:g,onSelectedProjectFilterChange:v,effectiveProjectId:h,projects:E,total:w,onRequestClear:R}){let y=h?"Clear project history":"Clear all";return l("div",{className:"ps-history-toolbar",children:[l("div",{className:"ps-history-search-wrap",children:[n("input",{type:"search",className:"ps-history-search","aria-label":"Search history",placeholder:"Search dictations & refinements\u2026",value:e,onChange:A=>t(A.target.value)}),e?n("button",{type:"button",className:"ps-history-search-clear","aria-label":"Clear search",onClick:()=>t(""),children:"\xD7"}):null]}),n("div",{className:"ps-segmented",role:"group","aria-label":"Activity type filter",children:[{id:"all",label:"All"},{id:"dictation",label:"Dictations"},{id:"refinement",label:"Refinements"}].map(A=>n("button",{type:"button",className:`ps-segmented-btn ${o===A.id?"active":""}`,"aria-pressed":o===A.id,onClick:()=>r(A.id),children:A.label},A.id))}),l("select",{className:"ps-select",style:{width:"auto",minWidth:120},"aria-label":"Filter by source",value:i,onChange:A=>a(A.target.value),children:[n("option",{value:"all",children:"All sources"}),n("option",{value:"composer",children:"Composer"}),n("option",{value:"home",children:"Home"}),n("option",{value:"studio",children:"Prompt Studio"})]}),n($s,{projectId:d,scopeMode:m,onScopeModeChange:u,selectedProjectFilter:g,onSelectedProjectFilterChange:v,projects:E}),l("button",{type:"button",className:`ps-btn ${p?"ps-btn-primary":""}`,"aria-pressed":p,onClick:s,children:[n("span",{children:p?"\u2605":"\u2606"}),n("span",{children:"Starred"})]}),l("div",{style:{marginLeft:"auto",display:"flex",alignItems:"center",gap:8},children:[n("span",{style:{fontSize:11,color:"var(--ps-text-subtle)"},children:w===1?"1 entry":`${w} entries`}),n("button",{type:"button",className:"ps-btn ps-btn-danger",disabled:w===0,onClick:R,children:y})]})]})}function Gs({onOpenSettings:e}){return l("div",{className:"ps-history-banner",role:"status",children:[n("span",{children:"History recording is paused. New dictations and refinements will not be saved."}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 9px",fontSize:11},onClick:e,children:"Open Settings"})]})}function Ws({heading:e,includeStarred:t,clearing:o,onIncludeStarredChange:r,onCancel:i,onConfirm:a}){return l("div",{className:"ps-history-confirm-bar",role:"alertdialog","aria-label":"Confirm clear history",children:[l("div",{style:{display:"flex",flexDirection:"column",gap:4},children:[n("strong",{children:e}),l("label",{style:{display:"inline-flex",alignItems:"center",gap:6,fontSize:11.5,cursor:"pointer"},children:[n("input",{type:"checkbox",checked:t,onChange:p=>r(p.target.checked)}),n("span",{children:"Also delete starred entries"})]})]}),l("div",{style:{display:"flex",gap:6},children:[n("button",{type:"button",className:"ps-btn",disabled:o,onClick:i,children:"Cancel"}),n("button",{type:"button",className:"ps-btn ps-btn-danger",disabled:o,onClick:a,children:o?"Clearing\u2026":"Confirm Clear"})]})]})}function Ys({storageAvailable:e,error:t,loading:o,hasActiveFilters:r,onRetry:i,onResetFilters:a}){return e?t?n("div",{className:"ps-empty-state",children:l("div",{className:"ps-empty-card",role:"alert",children:[n("div",{style:{fontSize:14,fontWeight:600},children:"Could not load history"}),n("div",{style:{fontSize:12,color:"var(--ps-text-muted)"},children:t}),n("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:i,children:"Retry"})]})}):o?n("div",{className:"ps-empty-state",children:n("span",{style:{fontSize:12,color:"var(--ps-text-muted)"},children:"Loading activity history\u2026"})}):n("div",{className:"ps-empty-state",children:l("div",{className:"ps-empty-card",children:[n("div",{style:{fontSize:14,fontWeight:600},children:r?"No matching history entries":"No activity recorded yet"}),n("div",{style:{fontSize:12,color:"var(--ps-text-muted)",lineHeight:1.45},children:r?"Try clearing your search or adjusting filters to see more entries.":"Dictate from any composer, the Home card, or Prompt Studio \u2014 or refine text in Studio \u2014 and it will appear here automatically."}),r?n("button",{type:"button",className:"ps-btn",onClick:a,children:"Reset filters"}):null]})}):n("div",{className:"ps-empty-state",children:l("div",{className:"ps-empty-card",children:[n("div",{style:{fontSize:14,fontWeight:600},children:"History storage is unavailable"}),n("div",{style:{fontSize:12,color:"var(--ps-text-muted)"},children:"Prompt Voice needs host database storage to save and browse dictation history."})]})})}function qs({entry:e,isSelected:t,projectName:o,onSelect:r}){let i=(e.outputText||e.rawText).trim();return l("button",{type:"button",className:`ps-history-row ${t?"selected":""}`,"aria-current":t?"true":void 0,onClick:r,children:[l("div",{className:"ps-history-row-top",children:[l("div",{className:"ps-history-row-badges",children:[n("span",{className:`ps-kind-badge ps-kind-${e.kind}`,children:Vt(e)}),n("span",{className:"ps-source-badge",children:Ht[e.source]??e.source})]}),e.starred?n("span",{className:"ps-star-active","aria-label":"Starred",children:"\u2605"}):null]}),n("div",{className:"ps-history-snippet",children:i}),l("div",{className:"ps-history-row-meta",children:[n("span",{children:Xo(e.createdAt)}),o?n("span",{children:o}):null]})]})}function Zs({entries:e,selectedId:t,projectNameById:o,scopeMode:r,hasMore:i,loadingMore:a,onSelect:p,onLoadMore:s}){let d=j(()=>Qo(e),[e]);return l("aside",{className:"ps-history-list-pane","aria-label":"Activity history list",children:[d.map(m=>l("div",{children:[n("div",{className:"ps-history-group-header",children:m.label}),m.entries.map(u=>{let g=r==="all"&&u.projectId?o.get(u.projectId)??u.projectId:null;return n(qs,{entry:u,isSelected:t===u.id,projectName:g,onSelect:()=>p(u.id)},u.id)})]},m.label)),i?n("div",{style:{padding:12,textAlign:"center"},children:n("button",{type:"button",className:"ps-btn",disabled:a,onClick:s,children:a?"Loading\u2026":"Load more"})}):null]})}function ir({rpc:e,projectId:t,onLoadIntoStudio:o,onInsertIntoComposer:r,onOpenSettings:i,onStatusNotice:a}){let p=Be(),s=rr({rpc:e,projectId:t,onStatusNotice:a}),[d,m]=b(!1),[u,g]=b(null),[v,h]=b(!1),[E,w]=b(!1);D(()=>{m(!1),g(null)},[s.selectedEntry?.id]);let R=async(N,F)=>{if(!await Ke(N)){a?.("Failed to copy to clipboard.");return}g(F),setTimeout(()=>g(I=>I===F?null:I),2e3),a?.(F==="raw"?"Raw text copied to clipboard.":"Text copied to clipboard.")},y=async()=>{let N=E;h(!1),w(!1),await s.clearHistory(N)},A=!s.storageAvailable||!!s.error||s.loading||s.entries.length===0,te=s.selectedEntry?.projectId?s.projectNameById.get(s.selectedEntry.projectId)??s.selectedEntry.projectId:null,W=s.effectiveProjectId?t&&s.scopeMode==="project"?"Clear history for this project?":`Clear history for ${s.projectNameById.get(s.effectiveProjectId)??s.effectiveProjectId}?`:"Clear all activity history?";return l("div",{className:"ps-history-shell","data-testid":"ps-history-view",children:[n("style",{children:zs}),s.historyEnabled?null:n(Gs,{onOpenSettings:i}),n(Bs,{search:s.searchInput,onSearchChange:s.setSearchInput,typeFilter:s.typeFilter,onTypeFilterChange:s.setTypeFilter,sourceFilter:s.sourceFilter,onSourceFilterChange:s.setSourceFilter,starredOnly:s.starredOnly,onStarredToggle:()=>s.setStarredOnly(N=>!N),projectId:t,scopeMode:s.scopeMode,onScopeModeChange:s.setScopeMode,selectedProjectFilter:s.selectedProjectFilter,onSelectedProjectFilterChange:s.setSelectedProjectFilter,effectiveProjectId:s.effectiveProjectId,projects:s.projects,total:s.total,onRequestClear:()=>{w(!1),h(!0)}}),v?n(Ws,{heading:W,includeStarred:E,clearing:s.clearing,onIncludeStarredChange:w,onCancel:()=>h(!1),onConfirm:()=>void y()}):null,A?n(Ys,{storageAvailable:s.storageAvailable,error:s.error,loading:s.loading,hasActiveFilters:s.hasActiveFilters,onRetry:()=>void s.fetchEntries(),onResetFilters:s.resetFilters}):l("div",{className:"ps-history-split",children:[n(Zs,{entries:s.entries,selectedId:s.selectedEntry?.id??null,projectNameById:s.projectNameById,scopeMode:s.scopeMode,hasMore:s.hasMore,loadingMore:s.loadingMore,onSelect:s.setSelectedId,onLoadMore:()=>void s.fetchEntries({offset:s.entries.length,append:!0})}),s.selectedEntry?n(nr,{entry:s.selectedEntry,projectName:te,showDiff:d,onToggleDiff:()=>m(N=>!N),onCopyText:(N,F)=>void R(N,F),onLoadIntoStudio:o,onInsertIntoComposer:r,onToggleStar:N=>void s.toggleStar(N),onDelete:N=>void s.deleteEntry(N),onOpenThread:typeof p?.toThread=="function"?N=>p.toThread(N):void 0,copiedTarget:u}):null]})]})}var G={FREE_OR_LOCAL:0,NANO:10,FLASH_LITE:12,MINI:20,SPARK:22,FLASH:25,LIGHTWEIGHT:28,OPEN_WEIGHT:32,HAIKU:35,REASONING_MINI:42,NEUTRAL_DEFAULT:50,STANDARD_GPT:60,CODEX:62,PRO:65,SONNET:70,REASONING_FULL:75,FLAGSHIP_PRO:85,OPUS:95},Ks=[{pattern:/(?:^|[:\s-])free(?=$|[\s)\]])|\bollama\b|\b:local\b/,rank:G.FREE_OR_LOCAL},{pattern:/\bnano\b/,rank:G.NANO},{pattern:/\bflash[- ]?lite\b/,rank:G.FLASH_LITE},{pattern:/\bo[134][- ]mini\b/,rank:G.REASONING_MINI},{pattern:/\bmini\b/,rank:G.MINI},{pattern:/\bspark\b/,rank:G.SPARK},{pattern:/\bflash\b/,rank:G.FLASH},{pattern:/\b(?:lite|light|micro|tiny|small|instant)\b/,rank:G.LIGHTWEIGHT},{pattern:/\bhaiku\b/,rank:G.HAIKU},{pattern:/\bopus\b/,rank:G.OPUS},{pattern:/\b(?:codex[- ]max|ultra|heavy|max)\b/,rank:G.FLAGSHIP_PRO},{pattern:/\b(?:gpt|o[134])[a-z0-9.-]*[- ]pro\b/,rank:G.FLAGSHIP_PRO},{pattern:/\bsonnet\b/,rank:G.SONNET},{pattern:/\b(?:o1|o3|o4)\b/,rank:G.REASONING_FULL},{pattern:/\bpro\b/,rank:G.PRO},{pattern:/\bcodex\b/,rank:G.CODEX},{pattern:/\bgpt[- ]?\d/,rank:G.STANDARD_GPT},{pattern:/\bdeepseek[- ]?(?:r1|reasoner)\b/,rank:G.REASONING_MINI},{pattern:/\b(?:deepseek|llama|qwen|gemma|mistral)\b/,rank:G.OPEN_WEIGHT}];function sr(e){let o=`${e.id} ${e.label??""}`.toLowerCase().replace(/[_/]+/g," ");for(let r of Ks)if(r.pattern.test(o))return r.rank;return G.NEUTRAL_DEFAULT}function Xs(e,t){let o=sr(e)-sr(t);return o!==0?o:(e.label||e.id).localeCompare(t.label||t.id,void 0,{sensitivity:"base",numeric:!0})}function Cn(e){return[...e].sort(Xs)}var Rn=`
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
    gap: 12px;
  }

  .ps-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .ps-header-nav {
    display: inline-flex;
    align-items: center;
    background: var(--ps-input-bg);
    border: 1px solid var(--ps-border);
    border-radius: 6px;
    padding: 2px;
    gap: 2px;
  }

  .ps-header-tab {
    border: none;
    background: transparent;
    color: var(--ps-text-muted);
    font-size: 12px;
    font-weight: 500;
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .ps-header-tab:hover {
    color: var(--text-primary, #e2e8f0);
  }
  .ps-header-tab.active {
    background: rgba(59, 130, 246, 0.22);
    color: var(--text-primary, #e2e8f0);
    font-weight: 600;
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

  .ps-overwrite-banner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 16px;
    background: rgba(59, 130, 246, 0.12);
    border-bottom: 1px solid rgba(59, 130, 246, 0.35);
    font-size: 12px;
    flex-shrink: 0;
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
`,ar="zcc:prompt-voice:studio-draft:v1";function Js(e){return e?`${ar}:project:${e}`:ar}var ut=[{id:"standard",label:"Standard",desc:"Fix grammar & clarity while keeping your natural tone and length."},{id:"casual",label:"Casual",desc:"Relaxed, everyday phrasing \u2014 natural without sounding stiff."},{id:"conversational",label:"Conversational",desc:"Warm, natural, and easy to read \u2014 like speaking clearly."},{id:"formal",label:"Professional",desc:"Polished, respectful phrasing for emails, PRs, or stakeholders."},{id:"technical",label:"Technical",desc:"Precise, unambiguous engineering phrasing without fluff."}],k={improve:"improve",executive:"executive",spec:"spec",custom:"custom",translate:"translate"},lr=new Set(Object.values(k)),An=[{id:k.improve,title:"Improve writing",icon:"\u2728",desc:"Fix grammar, phrasing & punctuation without extending length.",tone:"standard"},{id:k.executive,title:"Summarize",icon:"\u26A1",desc:"Condense into punchy bullet points.",instruction:"Summarize the core request into crisp, high-level executive bullet points.",tone:"formal"},{id:k.spec,title:"Create a technical spec",icon:"\u{1F4D0}",desc:"Format with Goals, Context, Steps.",instruction:"Transform into a structured technical spec with ## Goal, ## Architecture, and ## Implementation Steps.",tone:"technical"}];function Qs(e,t){switch(e){case k.improve:return t?"Improving...":"Improve text";case k.executive:return t?"Summarizing...":"Summarize";case k.spec:return t?"Creating spec...":"Create spec";case k.custom:return t?"Running...":"Run instructions";case k.translate:return t?"Translating...":"Translate";default:return t?"Transforming...":"Transform text"}}function ea(e,t,o){switch(e){case k.improve:return`\u2B07 Improve writing \xB7 ${t}`;case k.translate:return`\u2B07 Translate \xB7 ${Ze(o)?.label??o}`;case k.custom:return"\u2B07 Custom instructions";default:return`\u2B07 ${An.find(r=>r.id===e)?.title??"Refine pipeline"}`}}var ta={system:"Host STT",openai:"OpenAI","google-gemini":"Google Gemini","local-whisper":"Local Whisper"};function cr(e){return e==="openai"||e==="google-gemini"}var na=[{id:"google-gemini",label:"Google Gemini"},{id:"local-whisper",label:"Local Whisper (on this device)"},{id:"openai",label:"OpenAI (Whisper)"},{id:"system",label:"System (Zana Voice)"}],oa=[{id:"assistant",displayName:"Zana Assistant",models:[{id:"assistant",key:"assistant",label:"Default Assistant (Host Agent)",providerId:"assistant"}]}],pr=[1500,3e3];function dr({focusWindow:e,bringBack:t}){return oe(),l("div",{className:"ps-container","data-testid":"ps-detached-placeholder",children:[n("style",{children:Rn}),n("div",{className:"ps-empty-state",children:l("div",{className:"ps-empty-card",children:[n("span",{style:{fontSize:22},"aria-hidden":"true",children:"\u{1F399}\uFE0F"}),n("div",{style:{fontSize:14,fontWeight:600},children:"Prompt Studio is open in its own window"}),n("div",{style:{fontSize:12,color:"var(--ps-text-muted)"},children:"Focus the floating window or bring Prompt Studio back to this project tab."}),l("div",{style:{display:"flex",gap:8,marginTop:4},children:[n("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:e,children:"Focus Window"}),n("button",{type:"button",className:"ps-btn",onClick:t,children:"Bring Back"})]})]})})]})}function ra(e){let t=fo();return t||(e&&e.replace(/^\/+/,"").toLowerCase()===we?"history":"studio")}function Pn({pluginId:e,projectId:t,subPath:o,headerActions:r,startSession:i=ge}){oe();let[a,p]=b(()=>ra(o)),[s,d]=b(!1),[m,u]=b(null),g=Nt(e),v=wo(),h=ze(),E=$e(),w=Be(),R=vn(h?.scope,E).threadId,y=Ie(),A=h?.providerId,te=h?.familyId,W=Js(t),N=S(!1),[F,Y]=b(null),[I,K]=b(""),[O,ne]=b(""),[Ne,Ut]=b(null),z=S(null),q=C(c=>{z.current=c,Ut(c)},[]),[be,Xe]=b(!1),[Je,mt]=b(!1),[se,kn]=b(!1),[Nn,ft]=b(null),[Dn,_n]=b(!1),[Mn,Ln]=b(null),[De,On]=b(null),[gt,bt]=b(!0),[Hn,zt]=b(null),[_e,Me]=b("assistant"),[Qe,Le]=b("assistant"),[Ee,Vn]=b(null),[ia,vt]=b(null),[et,jn]=b(!0),[Fn,ur]=b(null),[tt,ht]=b(!1),[$,ae]=b(k.improve),[nt,ve]=b("standard"),[ot,rt]=b(qe),[yt,$t]=b(""),[le,Un]=b(!1),[zn,P]=b(null),[Q,it]=b("system"),[Bt,xt]=b(""),[Gt,$n]=b(!0),[Wt,Ce]=b(null),[ue,Yt]=b(!1),[mr,Bn]=b(0),[fr,qt]=b(null),[Gn,gr]=b(()=>me()),Wn=S(Gn);Wn.current=Gn;let he=S(null),St=S(null),Oe=S(null),He=S(null),Yn=S(null);D(()=>{o&&o.replace(/^\/+/,"").toLowerCase()===we&&(d(!1),p("history"))},[o]),D(()=>go(c=>{d(!1),p(c)}),[]),D(()=>{try{let c=localStorage.getItem(W);if(c){let f=JSON.parse(c),x=typeof f.inputText=="string"?f.inputText:"",_=typeof f.outputText=="string"?f.outputText:"",T=(x.trim()||_.trim())&&typeof f.historyEntryId=="string"&&f.historyEntryId.trim()?f.historyEntryId.trim():null;K(x),ne(_),q(T),Me(f.selectedProviderId||"assistant"),Le(f.selectedModelId||"assistant"),N.current=f.userManuallySelected===!0,it(f.sttProvider||"system"),xt(f.sttModel||""),f.selectedPresetId==="polish"?(ae(k.improve),ve("standard")):f.selectedPresetId==="chat"?(ae(k.improve),ve("conversational")):typeof f.selectedPresetId=="string"&&lr.has(f.selectedPresetId)?ae(f.selectedPresetId):ae(k.improve),typeof f.selectedToneId=="string"&&ut.some(M=>M.id===f.selectedToneId)?ve(f.selectedToneId):f.selectedPresetId!=="chat"&&ve("standard"),rt(Ze(f.targetLanguage)?.code??qe)}else K(""),ne(""),q(null),Me("assistant"),Le("assistant"),it("system"),xt(""),ae(k.improve),ve("standard"),rt(qe),N.current=!1}catch{}Y(W)},[W,q]);let st=S(g);st.current=g;let ie=S(!0),Zt=S(0),wt=S(0),It=S(0),Tt=S(null),Et=C(c=>{c&&(c.llmProvider&&(vt(c.llmProvider),jn(c.llmProvider!=="none")),c.sttProvider&&it(c.sttProvider),typeof c.sttKeyConfigured=="boolean"&&$n(c.sttKeyConfigured))},[]),Kt=C(()=>{st.current.call(Pe).then(c=>{ie.current&&Et(c)}).catch(()=>{})},[Et]);D(()=>{let c=!0;return st.current.call(Pe).then(f=>{c&&Et(f)}).catch(()=>{}),()=>{c=!1}},[Et]);let Ct=C(c=>{gr(f=>f.micDeviceId===c.micDeviceId&&f.micLabel===c.micLabel&&f.soundCuesEnabled===c.soundCuesEnabled&&f.soundCuesVolume===c.soundCuesVolume?f:c)},[]),Rt=C(()=>{let c=++Zt.current;st.current.call(xe).then(f=>{if(!ie.current||Zt.current!==c)return;let x=f||{};typeof x.sttProvider=="string"&&x.sttProvider&&it(x.sttProvider),typeof x.sttModel=="string"&&x.sttModel&&xt(x.sttModel),typeof x.llmProvider=="string"&&x.llmProvider&&x.llmProvider!=="none"?Vn({providerId:x.llmProvider,modelId:typeof x.llmModel=="string"&&x.llmModel?x.llmModel:void 0}):x.llmProvider==="none"&&Vn(null),f&&typeof f=="object"&&Ct(fe(x))}).catch(()=>{})},[Ct]),at=C(()=>{Tt.current&&(clearTimeout(Tt.current),Tt.current=null)},[]),Ve=C((c={})=>{let f=c.refresh===!0,x=c.retryAttempt??0;at();let _=++It.current;bt(!0),(f||x===0)&&zt(null);let T=()=>{if(!ie.current||x>=pr.length)return;let M=pr[x];Tt.current=setTimeout(()=>{ie.current&&Ve({retryAttempt:x+1})},M)};st.current.call(oo,f?{refresh:!0}:void 0).then(M=>{if(!ie.current||It.current!==_)return;let V=Array.isArray(M)?M:[];On(V),bt(!1),!V.some(B=>B.providerId!=="assistant"&&Array.isArray(B.models)&&B.models.length>0)&&!f&&T()}).catch(()=>{!ie.current||It.current!==_||(bt(!1),zt("Could not load Composer models. Using Zana Assistant."),T())})},[at]);pt(co,c=>{!ie.current||!Array.isArray(c)||(On(c),bt(!1),zt(null),at())}),D(()=>(ie.current=!0,Rt(),Ve(),()=>{ie.current=!1,Zt.current++,wt.current++,It.current++,at()}),[at,Ve,Rt]);let br=j(()=>(De??[]).some(c=>c.providerId!=="assistant"&&Array.isArray(c.models)&&c.models.length>0),[De]),ce=j(()=>{let c=(T,M)=>[...T].sort((V,ee)=>M(V).localeCompare(M(ee),void 0,{sensitivity:"base",numeric:!0})),f=(De??[]).filter(T=>Array.isArray(T.models)&&T.models.length>0);if(f.length===0){let T=oa.map(M=>{let V=!!(A&&M.id.toLowerCase()===A.toLowerCase()||te&&M.id.toLowerCase().includes(te.toLowerCase())),ee=Cn(M.models).map(B=>({...B,isComposerMatch:V}));return{...M,isComposerMatch:V,models:ee}});return c(T,M=>M.displayName||M.id)}let x={"assistant:assistant":"assistant"},_=f.map(T=>{let M=!!(A&&T.providerId.toLowerCase()===A.toLowerCase()||te&&T.providerId.toLowerCase().includes(te.toLowerCase())),V=Cn(T.models).map(ee=>{let B=`${T.providerId}:${ee.id}`,Vr=x[B]??ee.id;return{id:ee.id,key:Vr,label:ee.label||ee.id,providerId:T.providerId,isComposerMatch:M}});return{id:T.providerId,displayName:T.displayName||T.providerId,isComposerMatch:M,error:T.error??null,models:V}});return c(_,T=>T.displayName||T.id)},[De,A,te]),X=j(()=>ce.find(c=>c.id===_e)??ce[0],[ce,_e]),Re=j(()=>X?.models??[],[X]),J=j(()=>Re.find(f=>f.id===Qe||f.key===Qe)??Re[0],[Re,Qe]);D(()=>{if(De===null||N.current||ce.length===0)return;let c=ce.find(f=>f.isComposerMatch&&f.models.length>0)??ce.find(f=>f.isComposerMatch);if(c){Me(c.id),c.models.length>0&&Le(c.models[0].key||c.models[0].id);return}if(Ee&&Ee.providerId!=="assistant"){let f=ce.find(x=>x.id===Ee.providerId&&x.models.length>0);if(f){Me(f.id);let _=(Ee.modelId?f.models.find(T=>T.id===Ee.modelId||T.key===Ee.modelId):void 0)??f.models[0];_&&Le(_.key||_.id)}}},[De,ce,Ee]),D(()=>{F===W&&!I.trim()&&!O.trim()&&!ue&&!se&&!le&&z.current!==null&&q(null)},[F,W,I,O,ue,se,le,q]),D(()=>{if(F===W)try{localStorage.setItem(W,JSON.stringify({inputText:I,outputText:O,historyEntryId:Ne,selectedProviderId:_e,selectedModelId:Qe,userManuallySelected:N.current,sttProvider:Q,sttModel:Bt,selectedPresetId:$,selectedToneId:nt,targetLanguage:ot}))}catch{}},[F,W,I,O,Ne,_e,Qe,Q,Bt,$,nt,ot]);let vr=c=>{jn(c);let f=c?X?.id??"assistant":"none",x=c?J?.id??"assistant":"";vt(f),g.call(Se,{llmProvider:f,llmModel:x}).catch(()=>{P("Could not update cleanup setting.")})},Xt=c=>{it(c),Ce(null),g.call(Se,{sttProvider:c}).then(()=>Kt()).catch(()=>{P("Could not update speech provider setting.")})},hr=c=>{xt(c),g.call(Se,{sttModel:c}).catch(()=>{})},yr=c=>{N.current=!0,Me(c);let f=ce.find(_=>_.id===c),x="";if(f&&f.models.length>0){let _=f.models[0].key||f.models[0].id;x=f.models[0].id,Le(_)}et&&(vt(c),g.call(Se,{llmProvider:c,llmModel:x}).catch(()=>{}))},xr=c=>{N.current=!0;let f=_e,x=c;for(let _ of ce){let T=_.models.find(M=>M.id===c||M.key===c);if(T){_.id!==_e&&(Me(_.id),f=_.id),Le(T.key||T.id),x=T.id;break}}et&&(vt(f),g.call(Se,{llmProvider:f,llmModel:x}).catch(()=>{}))};D(()=>()=>{Oe.current&&clearInterval(Oe.current),He.current&&clearInterval(He.current),he.current&&he.current.cancel()},[]);let Sr=j(()=>{let c=I.trim();return`${c?c.split(/\s+/).length:0} words \xB7 ${I.length} chars`},[I]),wr=j(()=>{let c=O.trim();return`${c?c.split(/\s+/).length:0} words \xB7 ${O.length} chars`},[O]),Ir=j(()=>!O||!tt?[]:Ft(I,O),[I,O,tt]),Jt=()=>{Oe.current&&(clearInterval(Oe.current),Oe.current=null),He.current&&(clearInterval(He.current),He.current=null)},Tr=()=>{Jt(),Oe.current=setInterval(()=>Bn(c=>c+1),1e3),He.current=setInterval(()=>{he.current&&qt(he.current.getAudioLevel?.()??null)},100)},Er=async c=>{Yt(!1),qt(null),Jt();let f=he.current;he.current=null;let x=St.current;St.current=null;let _=x!==null?Math.max(0,Date.now()-x):void 0;if(f){kn(!0);try{let T=await f.stop();if(!ie.current)return;H("stop",c);let M=await Ge(g,T),V=await g.call(je,{audio:M.base64,mimeType:M.mimeType,transcriptionOnly:!0,source:"studio",...t?{projectId:t}:{},...R?{threadId:R}:{},...typeof _=="number"?{audioDurationMs:_}:{},...z.current?{historyEntryId:z.current}:{}});V.ok&&V.status==="ok"?(H("complete",c),typeof V.historyEntryId=="string"&&V.historyEntryId&&q(V.historyEntryId),K(ee=>We(ee,V.text)),Ce(null)):V.ok&&V.status==="no-speech"?(P("No speech detected. Try speaking closer to the microphone."),setTimeout(()=>P(null),4e3)):V.ok||(H("error",c),P(V.message),Ce(V.message),V.code==="MISSING_KEY"&&$n(!1))}catch(T){H("error",c),P(T instanceof Error?T.message:"Transcription failed.")}finally{kn(!1)}}},Cr=async(c,f)=>{if(Ce(null),P(null),Q!=="system"&&!Gt){H("error",f);let _=Q==="openai"?"OpenAI":"Google Gemini";Ce(`API key required for direct ${_} speech-to-text. Switch to System (Zana Voice) below to dictate using host voice.`),P(`API key required for ${_}. Switch to System (Zana Voice) to dictate thoughts.`);return}let x=++wt.current;try{let _=H("start",f);if(_&&(await _,!ie.current||wt.current!==x))return;let T=await(c.micDeviceId!==U?i({deviceId:c.micDeviceId}):i());if(!ie.current||wt.current!==x){T.cancel();return}T.onError=M=>{he.current=null,St.current=null,Yt(!1),qt(null),Jt(),H("error",f),Ce(M.message),P(M.message)},he.current=T,St.current=Date.now(),Yt(!0),Bn(0),Tr()}catch(_){H("error",f),P(_ instanceof Error?_.message:"Microphone access denied.")}},Qt=C(()=>{d(!1),Ct(me()),Rt(),Kt(),Ve()},[Ve,Rt,Kt,Ct]),Rr=async()=>{let c=Wn.current,f={enabled:c.soundCuesEnabled,volume:c.soundCuesVolume};ue?await Er(f):await Cr(c,f)},Ar=async()=>{let c=I.trim();if(!c||le||!J||$===k.custom&&!yt.trim())return;let f=An.find(B=>B.id===$),x=$===k.custom,_=$===k.improve,T=$===k.translate,M=T?"standard":x?"custom":_?nt:f?.tone||"technical",V=X?.id??"assistant",ee=J?.id??"assistant";P(null),Un(!0);try{let B=await g.call(no,{text:c,tone:M,...T?{targetLanguage:ot}:{},...x?{customPrompt:yt.trim()}:{},...!x&&!T&&f?.instruction?{instruction:f.instruction}:{},llmProvider:V,llmModel:ee,source:"studio",presetId:$,...t?{projectId:t}:{},...R?{threadId:R}:{},...z.current?{historyEntryId:z.current}:{}});B.ok?(typeof B.historyEntryId=="string"&&B.historyEntryId&&q(B.historyEntryId),ne(B.text),ur(`${X?.displayName||V}: ${B.llmModel||ee}`)):P(B.message)}catch(B){P(B instanceof Error?B.message:"Refinement request failed.")}finally{Un(!1)}},Pr=async()=>{try{let c=await navigator.clipboard.readText();if(!c||!c.trim()){P("Clipboard is empty."),setTimeout(()=>P(null),2500);return}K(f=>We(f,c)),P("Pasted from clipboard into input draft!"),setTimeout(()=>P(null),2500)}catch{P("Clipboard access denied or unavailable."),setTimeout(()=>P(null),2500)}},kr=async()=>{if(!I)return;await Ke(I)?(mt(!0),setTimeout(()=>mt(!1),2e3),P("Input draft copied to clipboard!"),setTimeout(()=>P(null),2500)):(P("Failed to copy to clipboard."),setTimeout(()=>P(null),3e3))},Nr=async()=>{if(!O)return;await Ke(O)?(Xe(!0),setTimeout(()=>Xe(!1),2e3),P("Refined output copied to clipboard!"),setTimeout(()=>P(null),2500)):(P("Failed to copy to clipboard."),setTimeout(()=>P(null),3e3))},Dr=()=>{!I&&!O||(q(null),K(""),ne(""),ae(k.improve),ve("standard"),rt(qe),$t(""),ht(!1),P("Studio canvas cleared."),setTimeout(()=>P(null),2500))},_r=()=>{O&&(K(O),ne(""),ht(!1),P("Refined output moved to input draft."),setTimeout(()=>P(null),2500))},qn=C(c=>{if(c){if(v&&typeof v.updateText=="function")try{v.updateText(f=>We(f,c)),v.focus?.(),ft("Inserted into Composer!"),P("Inserted into Composer!"),setTimeout(()=>ft(null),2500),setTimeout(()=>P(null),2500);return}catch{}if(w&&typeof w.toCompose=="function"){w.toCompose({initialPrompt:c,focusPrompt:!0}),ft("Opened in New Thread Composer!"),P("Opened in New Thread Composer!"),setTimeout(()=>ft(null),2500),setTimeout(()=>P(null),2500);return}Ke(c).then(f=>{P(f?"No active composer \u2014 copied prompt to clipboard.":"Composer focus unavailable.")})}},[v,w]),Mr=()=>{qn(O||I)},en=C(c=>{if(q(null),K(c.rawText),ne(c.kind==="refinement"||c.outputText!==c.rawText?c.outputText:""),c.kind==="refinement"||c.presetId||c.targetLanguage||c.customPrompt){let f=c.presetId&&lr.has(c.presetId)?c.presetId:c.targetLanguage?k.translate:c.tone==="custom"?k.custom:k.improve;ae(f),c.tone&&ut.some(x=>x.id===c.tone)&&ve(c.tone),c.targetLanguage&&rt(Ze(c.targetLanguage)?.code??qe),$t(c.customPrompt??"")}ht(!1),u(null),d(!1),p("studio"),P("Loaded entry into Studio."),setTimeout(()=>P(null),2500)},[q]),Lr=C(c=>{if(I.trim()||O.trim()){u(c);return}en(c)},[en,I,O]),Or=async()=>{if(e){_n(!0),Ln(null);try{await Dt(e,{showInProjects:!0})}catch(c){Ln(c instanceof Error?c.message:"Could not update plugin settings.")}finally{_n(!1)}}},Hr=C(c=>{(c.ctrlKey||c.metaKey)&&c.key.toLowerCase()==="k"&&(c.preventDefault(),d(!1),p("studio"),ae(k.custom),setTimeout(()=>Yn.current?.focus(),0))},[]);if(t&&!y.showInProjects)return l("div",{className:"ps-container",children:[n("style",{children:Rn}),l("header",{className:"ps-header",children:[l("div",{className:"ps-header-left",children:[n("span",{style:{fontSize:18},children:"\u{1F399}\uFE0F"}),n("span",{className:"ps-header-title",children:"Prompt Studio"}),n("span",{className:"ps-badge ps-badge-project",children:"Project"})]}),r?n("div",{className:"ps-header-actions",children:r}):null]}),n("div",{className:"ps-empty-state","data-testid":"ps-project-hidden-notice",children:l("div",{className:"ps-empty-card",children:[n("span",{style:{fontSize:22},"aria-hidden":"true",children:"\u{1F507}"}),n("div",{style:{fontSize:14,fontWeight:600},children:"Prompt Studio is hidden in projects"}),n("div",{style:{fontSize:12,color:"var(--ps-text-muted)",lineHeight:1.45},children:"You disabled the project tab in Prompt Voice plugin settings. Re-enable it anytime to use project-scoped drafts here."}),Mn?n("div",{role:"alert",style:{fontSize:11,color:"#fca5a5"},children:Mn}):null,e?n("button",{type:"button",className:"ps-btn ps-btn-primary",disabled:Dn,onClick:()=>void Or(),children:Dn?"Enabling\u2026":"Enable Prompt Studio in Projects"}):null]})})]});let Zn=ut.find(c=>c.id===nt)??ut[0],Kn=c=>{u(null),s&&Qt(),p(c)};return l("div",{className:"ps-container",onKeyDown:Hr,children:[n("style",{children:Rn}),l("header",{className:"ps-header",children:[l("div",{className:"ps-header-left",children:[n("span",{style:{fontSize:18},children:"\u{1F399}\uFE0F"}),n("span",{className:"ps-header-title",children:"Prompt Studio"}),n("span",{className:"ps-badge",children:"Voice & AI Refinement"}),t?n("span",{className:"ps-badge ps-badge-project",children:"Project"}):null]}),l("div",{className:"ps-header-actions",children:[l("nav",{className:"ps-header-nav",role:"tablist","aria-label":"Prompt Studio views",children:[n("button",{type:"button",role:"tab","aria-selected":!s&&a==="studio",className:`ps-header-tab ${!s&&a==="studio"?"active":""}`,onClick:()=>Kn("studio"),children:"Studio"}),n("button",{type:"button",role:"tab","aria-selected":!s&&a==="history",className:`ps-header-tab ${!s&&a==="history"?"active":""}`,onClick:()=>Kn("history"),children:"History"})]}),n("button",{type:"button",className:`ps-btn ${s?"ps-btn-primary":""}`,"aria-pressed":s,onClick:()=>{u(null),s?Qt():d(!0)},children:"Settings"}),r]})]}),m?l("div",{className:"ps-overwrite-banner",role:"alertdialog","aria-label":"Confirm overwrite studio draft",children:[n("span",{children:"Replace your current Studio draft with this history entry?"}),l("div",{style:{display:"flex",gap:6},children:[n("button",{type:"button",className:"ps-btn",onClick:()=>u(null),children:"Cancel"}),n("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:()=>en(m),children:"Replace Draft"})]})]}):null,s?n(Zo,{rpc:g,pluginId:e,onBack:Qt}):a==="history"?n(ir,{rpc:g,projectId:t,onLoadIntoStudio:Lr,onInsertIntoComposer:qn,onOpenSettings:()=>d(!0),onStatusNotice:c=>{P(c),setTimeout(()=>P(f=>f===c?null:f),2500)}}):l("div",{className:"ps-workspace",children:[l("aside",{className:"ps-sidebar",children:[l("section",{className:"ps-section",children:[l("div",{className:"ps-section-title",children:[n("span",{children:"Voice Dictation"}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:ta[Q]??Q})]}),l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-stt-provider-select",className:"ps-field-label",children:"Speech Provider"}),n("select",{id:"ps-stt-provider-select",className:"ps-select","aria-label":"Speech-to-text provider",value:Q,onChange:c=>{Ce(null),Xt(c.target.value)},disabled:ue||se,children:na.map(c=>n("option",{value:c.id,children:c.label},c.id))})]}),cr(Q)&&l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-stt-model-input",className:"ps-field-label",children:"Speech Model (Optional)"}),n("input",{id:"ps-stt-model-input",className:"ps-select","aria-label":"Speech-to-text model",placeholder:"Provider default",value:Bt,onChange:c=>hr(c.target.value),disabled:ue||se})]}),Wt&&l("div",{role:"alert",style:{padding:"8px 10px",borderRadius:6,background:"rgba(239, 68, 68, 0.12)",border:"1px solid rgba(239, 68, 68, 0.35)",color:"#fca5a5",fontSize:11,textAlign:"left",lineHeight:1.4,display:"flex",flexDirection:"column",gap:6},children:[l("div",{children:["\u26A0\uFE0F ",Wt]}),cr(Q)&&n("button",{type:"button",className:"ps-btn ps-btn-primary",style:{alignSelf:"flex-start",fontSize:11,padding:"4px 8px"},onClick:()=>Xt("system"),children:"Switch to System (Zana Voice)"})]}),Q!=="system"&&!Gt&&!Wt&&l("div",{style:{padding:"8px 10px",borderRadius:6,background:"rgba(234, 179, 8, 0.1)",border:"1px solid rgba(234, 179, 8, 0.3)",color:"#fde047",fontSize:11,textAlign:"left",lineHeight:1.4,display:"flex",flexDirection:"column",gap:6},children:[l("div",{children:["\u2139\uFE0F ",n("strong",{children:"API key required:"})," Direct ",Q==="openai"?"OpenAI Whisper":"Google Gemini"," speech-to-text requires an API key in Zana Settings."]}),n("button",{type:"button",className:"ps-btn ps-btn-primary",style:{alignSelf:"flex-start",fontSize:11,padding:"4px 8px"},onClick:()=>Xt("system"),children:"Switch to System (Zana Voice)"})]}),l("div",{className:"ps-dictation-card",children:[l("button",{type:"button",className:`ps-btn ${ue?"ps-btn-danger":se?"":"ps-btn-primary"}`,style:{width:"100%",justifyContent:"center",padding:"10px 0",opacity:se?.8:1},onClick:Rr,disabled:se,"aria-label":se?"Transcribing audio":ue?"Stop dictation":"Start dictation",children:[n("span",{className:se?"ps-spin":void 0,children:se?"\u23F3":ue?"\u23F9\uFE0F":"\u{1F399}\uFE0F"}),n("span",{children:se?"Transcribing...":ue?`Stop Dictation (${mr}s)`:"Dictate Thoughts"})]}),ue&&l("div",{style:{width:"100%",display:"flex",flexDirection:"column",gap:4},children:[n("div",{className:"ps-meter-bar",children:n("div",{className:"ps-meter-fill",style:{width:`${Math.min(100,(fr??.1)*100)}%`}})}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:"Listening live..."})]})]}),n("div",{style:{fontSize:10,color:"var(--ps-text-subtle)",lineHeight:1.3},children:Q==="system"?"Uses host Zana voice transcription without requiring external API keys.":Q==="local-whisper"?"Transcribes on this device. Install the runtime and a model in Settings.":Gt?`Using direct ${Q==="openai"?"OpenAI Whisper":"Google Gemini"} speech-to-text.`:`\u26A0\uFE0F ${Q==="openai"?"OpenAI":"Google Gemini"} requires an API key in Zana Settings. Choose System (Zana Voice) for built-in free dictation.`})]}),l("section",{className:"ps-section",children:[l("div",{className:"ps-section-title",children:[n("span",{children:"Refinement Engine"}),l("span",{style:{display:"inline-flex",alignItems:"center",gap:6},children:[n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:gt&&!br?"Loading\u2026":gt?"Refreshing\u2026":X?.isComposerMatch?"\u2605 Composer Active":"AI Model"}),n("button",{type:"button",className:"ps-btn",style:{padding:"2px 6px",fontSize:10},onClick:()=>Ve({refresh:!0}),disabled:gt||le,"aria-label":"Refresh models",title:"Reload models from Composer",children:gt?"\u2026":"\u21BB"})]})]}),l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-provider-select",className:"ps-field-label",children:"Provider"}),n("select",{id:"ps-provider-select",className:"ps-select","aria-label":"Refinement provider",value:X?.id??"",onChange:c=>yr(c.target.value),disabled:le,children:ce.map(c=>l("option",{value:c.id,children:[c.displayName,c.isComposerMatch?" \u2605 (Composer)":""]},c.id))})]}),l("div",{className:"ps-field-group",children:[l("label",{htmlFor:"ps-model-select",className:"ps-field-label",children:["Model (",Re.length,")"]}),n("select",{id:"ps-model-select",className:"ps-select","aria-label":"Refinement model",value:J?.key||J?.id||"",onChange:c=>xr(c.target.value),disabled:le||Re.length===0,children:Re.length===0?n("option",{value:"",children:"No models available"}):Re.map(c=>l("option",{value:c.key||c.id,children:[c.label,c.isComposerMatch?" \u2605 (Composer)":""]},c.key||c.id))})]}),(X?.error||Hn)&&n("div",{role:"status",style:{fontSize:10.5,color:"#fde047",lineHeight:1.35,padding:"6px 8px",borderRadius:6,background:"rgba(234, 179, 8, 0.1)",border:"1px solid rgba(234, 179, 8, 0.25)"},children:X?.error||Hn}),l("div",{style:{marginTop:8,paddingTop:8,borderTop:"1px solid var(--ps-border)",display:"flex",flexDirection:"column",gap:4},children:[l("label",{style:{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:11,fontWeight:500,userSelect:"none"},children:[n("input",{type:"checkbox","aria-label":"Auto-cleanup mic dictations",checked:et,onChange:c=>vr(c.target.checked)}),n("span",{children:"Auto-cleanup mic dictations"})]}),n("span",{style:{fontSize:10,color:"var(--ps-text-subtle)",lineHeight:1.3},children:et?`Composer mic cleans up using ${X?.displayName}${J?` (${J.label||J.id})`:""}.`:"Composer mic inserts raw transcript without AI cleanup."})]}),l("div",{style:{marginTop:4,fontSize:11,color:"var(--ps-text-muted)",lineHeight:1.35},children:[X?.isComposerMatch?l("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:600},children:["\u2605 Synced to Composer: ",X.displayName,J?` (${J.label})`:""]}):X?.id==="assistant"?"Uses the active Zana assistant agent with no extra API key required.":J?l(Z,{children:["Using ",n("strong",{children:X?.displayName})," \xB7 ",n("code",{children:J.id})]}):null,Fn?l("div",{style:{marginTop:3,color:"var(--ps-text-subtle)",fontSize:10},children:["Last refined: ",Fn]}):null]})]}),l("section",{className:"ps-section",children:[n("div",{className:"ps-section-title",children:"How should we improve it?"}),l("div",{className:"ps-presets-list",role:"radiogroup","aria-label":"How should we improve it?",children:[An.map(c=>l("div",{style:{display:"flex",flexDirection:"column",gap:6},children:[l("label",{className:`ps-preset-btn ${$===c.id?"active":""}`,children:[l("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:c.id,checked:$===c.id,onChange:()=>ae(c.id)}),c.title]}),n("span",{className:"preset-desc",children:c.desc})]}),c.id===k.improve&&$===k.improve&&l("div",{className:"ps-tone-panel",children:[l("div",{className:"ps-tone-header",children:[n("label",{htmlFor:"ps-improve-tone-select",children:n("strong",{style:{color:"var(--text-primary, #e2e8f0)"},children:"Tone"})}),n("span",{style:{color:"var(--ps-text-subtle)"},children:"Same length"})]}),n("select",{id:"ps-improve-tone-select",className:"ps-select","aria-label":"Improvement tone",value:nt,onChange:f=>ve(f.target.value),disabled:le,children:ut.map(f=>n("option",{value:f.id,children:f.label},f.id))}),n("div",{className:"ps-tone-hint",children:Zn.desc})]})]},c.id)),l("label",{className:`ps-preset-btn ${$===k.custom?"active":""}`,children:[l("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:k.custom,checked:$===k.custom,onChange:()=>ae(k.custom)}),"Custom instructions"]}),n("span",{className:"preset-desc",children:"Describe your own transformation."})]}),$===k.custom&&n("textarea",{ref:Yn,className:"ps-custom-prompt-input","aria-label":"Custom instructions",placeholder:"e.g. Turn into user stories with acceptance criteria...",value:yt,onChange:c=>$t(c.target.value)}),l("div",{style:{display:"flex",flexDirection:"column",gap:6},children:[l("label",{className:`ps-preset-btn ${$===k.translate?"active":""}`,children:[l("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:k.translate,checked:$===k.translate,onChange:()=>ae(k.translate)}),"Translate"]}),n("span",{className:"preset-desc",children:"Translate into another language while keeping meaning."})]}),$===k.translate&&l("div",{className:"ps-tone-panel",children:[l("div",{className:"ps-tone-header",children:[n("label",{htmlFor:"ps-translate-lang-select",children:n("strong",{style:{color:"var(--text-primary, #e2e8f0)"},children:"Target language"})}),n("span",{style:{color:"var(--ps-text-subtle)"},children:"Same meaning"})]}),n("select",{id:"ps-translate-lang-select",className:"ps-select","aria-label":"Target language",value:ot,onChange:c=>rt(c.target.value),disabled:le,children:wn.map(c=>n("option",{value:c.code,children:c.label},c.code))})]})]})]})]})]}),l("main",{className:"ps-editor-canvas",children:[l("section",{className:"ps-pane",children:[l("div",{className:"ps-pane-header",children:[l("div",{className:"ps-pane-title",children:[n("span",{children:"\u{1F4DD}"}),n("span",{children:"Raw Input Draft"})]}),l("div",{style:{display:"flex",gap:6},children:[n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Pr,title:"Paste from clipboard into input draft","aria-label":"Paste into input draft",children:"\u{1F4CB} Paste"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:kr,disabled:!I,title:"Copy raw input","aria-label":"Copy raw input",children:Je?"\u2705 Copied":"\u{1F4CB} Copy"})]})]}),n("textarea",{className:"ps-textarea",placeholder:"Type your raw thoughts or click Dictate in the left sidebar to speak...",value:I,onChange:c=>K(c.target.value),"aria-label":"Raw Input Text"})]}),l("div",{className:"ps-action-bar",children:[l("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12},children:[n("span",{className:"ps-pill",children:ea($,Zn.label,ot)}),n("span",{style:{color:"var(--ps-text-muted)"},children:I.trim()?`${I.trim().split(/\s+/).length} words ready`:"Add text to get started"})]}),n("div",{style:{display:"flex",alignItems:"center",gap:6},children:l("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:()=>Ar(),disabled:le||!I.trim()||!J||$===k.custom&&!yt.trim(),title:$===k.translate?"Translate raw draft into the selected language":"Transform raw draft into output",children:[n("span",{children:le?"\u23F3":"\u26A1"}),n("span",{children:Qs($,le)})]})})]}),l("section",{className:"ps-pane",children:[l("div",{className:"ps-pane-header",children:[l("div",{className:"ps-pane-title",children:[n("span",{children:"\u2728"}),n("span",{children:"Result"})]}),l("div",{style:{display:"flex",gap:6},children:[O&&l("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>ht(c=>!c),title:"Toggle inline diff against input draft",children:[n("span",{children:tt?"\u{1F441}\uFE0F":"\u{1F50D}"}),n("span",{children:tt?"View Clean":"View Diff"})]}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:_r,disabled:!O,title:"Move output to input draft for iterative re-refinement",children:"\u2B06 Replace Input"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Nr,disabled:!O,title:"Copy refined text to clipboard","aria-label":"Copy refined output",children:be?"\u2705 Copied":"\u{1F4CB} Copy"})]})]}),tt&&O?n("div",{className:"ps-output-view",children:Ir.map((c,f)=>c.type==="added"?n("span",{className:"ps-diff-added",children:c.text},f):c.type==="removed"?n("span",{className:"ps-diff-removed",children:c.text},f):n("span",{className:"ps-diff-unchanged",children:c.text},f))}):n("textarea",{className:"ps-textarea",placeholder:"Your improved, structured, or translated text will appear here...",value:O,onChange:c=>ne(c.target.value),"aria-label":"Refined output"})]}),l("div",{className:"ps-action-bar",children:[n("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12},children:Nn?n("span",{className:"ps-badge",style:{background:"rgba(34, 197, 94, 0.2)",color:"#86efac"},children:Nn}):n("span",{style:{color:"var(--ps-text-muted)"},children:O?"Ready to insert refined result into Composer":I?"Ready to insert raw draft into Composer":"Draft or refine a prompt to insert into Composer"})}),l("div",{style:{display:"flex",alignItems:"center",gap:8},children:[l("button",{type:"button",className:"ps-btn",onClick:Dr,title:"Clear current input and output",disabled:!I&&!O,children:[n("span",{children:"\u{1F5D1}\uFE0F"}),n("span",{children:"Clear"})]}),l("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:Mr,disabled:!I&&!O,title:"Append current text directly into Zana Composer",children:[n("span",{children:"\u{1F4AC}"}),n("span",{children:"Insert into Composer"})]})]})]})]})]}),l("footer",{className:"ps-status-bar",children:[l("div",{style:{display:"flex",gap:12},children:[l("span",{children:["Input: ",Sr]}),l("span",{children:["Output: ",wr]}),zn&&n("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:500},children:zn})]}),l("div",{style:{display:"flex",gap:12,alignItems:"center"},children:[l("span",{children:["Engine: ",X?.displayName," \xB7 ",J?.label??"No model"]}),l("span",{className:"ps-pill",children:["Mic cleanup: ",et?`${X?.displayName}${J?` (${J.label||J.id})`:""}`:"Off (Raw)"]}),X?.isComposerMatch&&n("span",{className:"ps-pill",style:{color:"var(--accent, #3b82f6)"},children:"\u2605 Composer Synced"}),n("span",{children:"Zana Prompt Studio"})]})]})]})}var cp=Qn(e=>{oe(),e.composer.customize({id:"prompt-voice-mic",actions:[{id:"prompt-voice-mic",component:Do}]}),e.slots.navPanel?.({id:de,title:"Prompt Studio",icon:"Sparkles",path:de,component:Pn}),e.slots.projectTab?.({id:ke,label:"Prompt Studio",icon:"Sparkles",order:50,global:!1,header:"custom",detachable:!0,component:Pn,detachedPlaceholder:dr}),e.slots.homepageSection?.({id:"prompt-voice-home",title:"Prompt Voice",component:Ro}),e.slots.settingsSection?.({id:"prompt-voice-visibility",title:"Where Prompt Voice Appears",description:"Choose whether Prompt Voice appears on the main Home screen, inside projects, and in composers.",component:Lt}),e.slots.commandPaletteAction?.({id:"open-prompt-studio",title:"Prompt Studio: Open Canvas",isAvailable:()=>!0,run:t=>{if(Fe("studio"),typeof t.toPluginPanel=="function"){t.toPluginPanel(de);return}t.navigate?.(`/${de}`)}}),e.slots.commandPaletteAction?.({id:"open-prompt-studio-history",title:"Prompt Studio: Open History",isAvailable:()=>!0,run:t=>{if(Fe("history"),typeof t.toPluginPanel=="function"){t.toPluginPanel(de,{subPath:we});return}t.navigate?.(`/${de}/${we}`)}}),e.slots.commandPaletteAction?.({id:"open-prompt-studio-project",title:"Prompt Studio: Open in This Project",isAvailable:t=>!!t.projectId,run:t=>{t.projectId&&typeof t.toProject=="function"&&t.toProject(t.projectId,{tabId:ke})}})});export{de as PROMPT_STUDIO_PANEL_PATH,ke as PROMPT_STUDIO_PROJECT_TAB_ID,cp as default};
//# sourceMappingURL=app.js.map
