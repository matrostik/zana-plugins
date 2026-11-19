function Yn(){let e=globalThis.__ZCC_PLUGIN_HOST__;if(!e)throw new Error("plugin host is not available");return e}function Ae(){return globalThis.__ZCC_PLUGIN_RUNTIME__??{}}function Et(e){throw new Error(`${e} is not available until the host plugin runtime is installed`)}async function qn(e,t,o){return Yn().callRpc(e,t,o)}async function tn(e,t){return Yn().setSettings(e,t)}function Zn(e){return{__zccPluginApp:!0,setup:e}}function st(){return Ae().useRpc?.()??Et("useRpc")}function nn(e,t){Ae().useRealtime?.(e,t)}function on(){return Ae().useSettings?.()??{values:void 0,isLoading:!0}}function rn(){return Ae().useZccContext?.()??{projectId:null,threadId:null}}function sn(){return Ae().useZccNavigate?.()??Et("useZccNavigate")}function at(){return Ae().useComposer?.()??Et("useComposer")}function an(){return Ae().useComposerView?.()??Et("useComposerView")}var L=globalThis.__ZCC_HOST_REACT__,Kn=L,Xs=L.Children,Js=L.Component,Qs=L.Fragment,ea=L.StrictMode,ta=L.Suspense,na=L.cloneElement,oa=L.createContext,ra=L.createElement,ia=L.createRef,sa=L.forwardRef,aa=L.isValidElement,la=L.lazy,ca=L.memo,pa=L.startTransition,R=L.useCallback,da=L.useContext,ua=L.useDebugValue,ma=L.useDeferredValue,N=L.useEffect,fa=L.useId,ga=L.useImperativeHandle,ba=L.useInsertionEffect,va=L.useLayoutEffect,F=L.useMemo,Xn=L.useReducer,I=L.useRef,g=L.useState,ha=L.useSyncExternalStore,ya=L.useTransition,xa=L.version;var z="default";function Lr(e){if(typeof e!="string")return z;let t=e.trim().slice(0,256);return!t||t===z?z:t}function Or(e){return typeof e!="string"?"":e.trim().slice(0,200)}function Hr(e){return!(e===!1||typeof e=="string"&&e.trim().toLowerCase()==="false")}function Vr(e){let t=typeof e=="number"?e:typeof e=="string"&&e.trim()!==""?Number(e):Number.NaN;return Number.isFinite(t)?Math.round(Math.min(100,Math.max(0,t))):75}function he(e){let t=e??{},o=Lr(t.micDeviceId);return{micDeviceId:o,micLabel:o===z?"":Or(t.micLabel),soundCuesEnabled:Hr(t.soundCuesEnabled),soundCuesVolume:Vr(t.soundCuesVolume)}}var je="promptVoice.transcribe",Pe="promptVoice.status",Jn="promptVoice.rephrase",Qn="promptVoice.availableModels",ye="promptVoice.settings.get",xe="promptVoice.settings.update",eo="promptVoice.history.list",to="promptVoice.history.star",no="promptVoice.history.delete",Rt="promptVoice.history.clear",oo="promptVoice.history.projects",ro="promptVoice:settingsChanged",io="promptVoice:modelsUpdated",so="promptVoice:historyChanged",ae={state:"promptVoice.localWhisper.state",installRuntime:"promptVoice.localWhisper.installRuntime",cancelRuntimeInstall:"promptVoice.localWhisper.cancelRuntimeInstall",downloadModel:"promptVoice.localWhisper.downloadModel",cancelModelDownload:"promptVoice.localWhisper.cancelModelDownload",removeModel:"promptVoice.localWhisper.removeModel",selectModel:"promptVoice.localWhisper.selectModel",start:"promptVoice.localWhisper.start",stop:"promptVoice.localWhisper.stop"};var ao=["standard","casual","conversational","formal","technical","custom"];var le="prompt-studio",ke="prompt-studio",Se="history";var lo="zcc:prompt-voice:audio-prefs:v1";function ln(){try{if(typeof localStorage>"u")return null;let e=localStorage.getItem(lo);if(!e)return null;let t=JSON.parse(e);return!t||typeof t!="object"||Array.isArray(t)?null:he(t)}catch{return null}}function ue(){return ln()??he({})}function me(e){let t=he(e);try{typeof localStorage<"u"&&localStorage.setItem(lo,JSON.stringify({micDeviceId:t.micDeviceId,micLabel:t.micDeviceId===z?"":t.micLabel,soundCuesEnabled:String(t.soundCuesEnabled),soundCuesVolume:String(t.soundCuesVolume)}))}catch{}return t}var cn="zcc:prompt-voice:switch-studio-tab",At=null;function Fe(e){if(At=e,typeof window<"u"&&typeof window.dispatchEvent=="function")try{window.dispatchEvent(new CustomEvent(cn,{detail:{tab:e}}))}catch{}}function co(){let e=At;return At=null,e}function po(e){if(typeof window>"u"||typeof window.addEventListener!="function")return()=>{};let t=o=>{let r=o.detail;(r?.tab==="studio"||r?.tab==="history")&&(At=null,e(r.tab))};return window.addEventListener(cn,t),()=>window.removeEventListener(cn,t)}var pn=`/* Base Container */
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
`;var uo="zcc-ext-prompt-voice-styles";function ee(){if(typeof document>"u")return;let e=document.getElementById(uo);e||(e=document.createElement("style"),e.id=uo,document.head.appendChild(e)),e.textContent!==pn&&(e.textContent=pn)}var Fr=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4"];var te=class extends Error{code;constructor(t,o){super(o),this.name="RecordingError",this.code=t}};function zr(e){return Fr.find(t=>e(t))??null}var Ur="audio/webm";function mo(){return{getUserMedia:e=>navigator.mediaDevices.getUserMedia(e),createRecorder:(e,t)=>new MediaRecorder(e,t?{mimeType:t}:void 0),isTypeSupported:e=>typeof MediaRecorder<"u"&&MediaRecorder.isTypeSupported(e)}}async function $r(e,t){let o=t&&t!=="default"?t:void 0,r=o?{audio:{deviceId:{exact:o}}}:{audio:!0};try{return await e.getUserMedia(r)}catch(i){let l=i instanceof Error?i.name:"";if(l==="NotAllowedError"||l==="SecurityError")throw new te("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again.");if(o&&(l==="OverconstrainedError"||l==="NotFoundError"))try{return await e.getUserMedia({audio:!0})}catch(p){let s=p instanceof Error?p.name:"";if(s==="NotAllowedError"||s==="SecurityError")throw new te("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again.")}throw new te("MIC_UNAVAILABLE","No microphone is available. Connect one and try again.")}}function dn(e){return new Promise((t,o)=>{let r=new FileReader;r.onload=()=>{let i=typeof r.result=="string"?r.result:"";t(i.slice(i.indexOf(",")+1))},r.onerror=()=>o(new te("RECORDING_FAILED","The recording could not be read.")),r.readAsDataURL(e)})}async function Br(e,t){let o=new Blob(e,{type:t});return{base64:await dn(o),mimeType:o.type||t}}function Gr(e,t){if(!(e>0&&Number.isFinite(e)))return()=>{};let o=setTimeout(t,e);return()=>clearTimeout(o)}var Wr="That recording is too large to transcribe. Keep dictation shorter and try again.";function Yr(e,t){let o=Math.max(t,e),r=[],i=0,l=!1;return{chunks:r,get overflowed(){return l},add(p){return p.size===0||l?"ignored":i+p.size>o?(l=!0,"overflow"):(r.push(p),i+=p.size,i>=e?"limit-reached":"accepted")}}}function qr(e,t){let o=new Promise((r,i)=>{e.onstop=()=>r(),e.onerror=()=>{let l=new te("RECORDING_FAILED","Recording stopped unexpectedly. Try again.");t(l),i(l)}});return o.catch(()=>{}),o}function Zr(e,t,o,r){let i=qr(e,r);return e.ondataavailable=l=>{let p=t.add(l.data);(p==="limit-reached"||p==="overflow")&&o()},e.start(1e3),i}async function Kr(e,t,o,r){try{await e}finally{t()}if(o.overflowed)throw new te("RECORDING_FAILED",Wr);return Br(o.chunks,r)}function Xr(e){let t=()=>{};return{stopRecorder(){t(),e.state!=="inactive"&&e.stop()},armTimer(o,r){t=Gr(o,r)}}}function Jr(e,t){let o=null;return{attach(r){o=r},detach(){o=null},autoStop(){e();let r=o?.onAutoStop;o&&(o.onAutoStop=void 0),r?.()},fail(r){e(),t();let i=o?.onError;o=null,i?.(r)}}}function Qr(e,t,o,r){let i=Yr(r.maxBytes??9437184,r.hardMaxBytes??10485760),{stopRecorder:l,armTimer:p}=Xr(e),s=Jr(l,t);p(r.maxDurationMs??12e4,s.autoStop);let d=Zr(e,i,s.autoStop,s.fail),u={onError:r.onError,onAutoStop:r.onAutoStop,async stop(){l();try{return await Kr(d,t,i,e.mimeType||o)}finally{s.detach()}},cancel(){l(),t(),s.detach()}};return s.attach(u),u}var fe=e=>ei(mo(),e);async function ei(e=mo(),t={}){let o=await $r(e,t.deviceId),r=ti(o),i=o.getTracks(),l,p=()=>{for(let s of i)l&&s.removeEventListener?.("ended",l);r?.close(),i.forEach(s=>s.stop())};try{let s=zr(e.isTypeSupported)??Ur,d=e.createRecorder(o,s),u=Qr(d,p,s,t);return u.getAudioLevel=()=>r?.level()??null,l=()=>{let m=u.onError;u.cancel(),m?.(new te("MIC_UNAVAILABLE","Microphone disconnected. Check your device and try again."))},i.forEach(m=>m.addEventListener?.("ended",l)),u}catch(s){throw p(),s instanceof te?s:new te("RECORDING_FAILED",s instanceof Error?s.message:"The recording could not be started.")}}function ti(e){let t;try{t=new AudioContext;let o=t.createMediaStreamSource(e),r=t.createAnalyser();r.fftSize=256,o.connect(r);let i=new Uint8Array(r.fftSize),l=t,p=!1;return{level(){if(l.state&&l.state!=="running")return null;r.getByteTimeDomainData(i);let s=i.reduce((d,u)=>d+((u-128)/128)**2,0)/i.length;return Math.min(1,Math.sqrt(s)*5)},close(){p||(p=!0,o.disconnect(),l.close().catch(s=>console.error("Prompt Voice audio meter cleanup failed",s)))}}}catch(o){return t&&t.close().catch(r=>console.error("Prompt Voice audio meter cleanup failed",r)),console.warn("Prompt Voice audio meter unavailable",o),null}}var un=["both","main","projects","off"];var ni="both",mn=[{id:"all",label:"Main Screen & Projects",description:"Show on Zana Home, inside Projects, and in all composers.",settings:{showHomeWidget:!0,showInProjects:!0,micVisibility:"both"}},{id:"projects",label:"Projects Only",description:"Show the Prompt Studio tab and mic button only inside projects.",settings:{showHomeWidget:!1,showInProjects:!0,micVisibility:"projects"}},{id:"main",label:"Main Screen Only",description:"Show on Zana Home and global composers; hide project tabs and project mics.",settings:{showHomeWidget:!0,showInProjects:!1,micVisibility:"main"}},{id:"mic-only",label:"Composer Mic Only",description:"Hide the Home widget and project tabs; keep only the composer mic.",settings:{showHomeWidget:!1,showInProjects:!1,micVisibility:"both"}}],go={both:"Everywhere (Main & Projects)",main:"Main screen composers only",projects:"Project composers only",off:"Hidden"};function fo(e,t){if(typeof e=="boolean")return e;if(typeof e=="string"){let o=e.trim().toLowerCase();if(o==="true")return!0;if(o==="false")return!1}return t}function oi(e){return typeof e=="string"&&un.includes(e)?e:ni}function fn(e){let t=e??{};return{showHomeWidget:fo(t.showHomeWidget,!0),showInProjects:fo(t.showInProjects,!0),micVisibility:oi(t.micVisibility)}}function bo(e){for(let t of mn)if(t.settings.showHomeWidget===e.showHomeWidget&&t.settings.showInProjects===e.showInProjects&&t.settings.micVisibility===e.micVisibility)return t.id;return"custom"}function vo(e,t,o){if(e==="off")return!1;if(e==="both")return!0;let r=t&&typeof t=="object"&&"projectId"in t?t.projectId:void 0,i=r!==void 0?r:o,l=typeof i=="string"&&i.length>0;return e==="projects"?l:!l}var ze="prompt-voice";function ri(e){return ze}function ii(){try{let e=qn;return typeof e=="function"?e:void 0}catch{return}}function si(){try{return typeof on=="function"?on():null}catch{return null}}function Ue(){try{return typeof an=="function"?an():null}catch{return null}}function Pt(){try{return typeof rn=="function"?rn():null}catch{return null}}function $e(){try{return typeof sn=="function"?sn():null}catch{return null}}function ho(){try{return typeof at=="function"?at():null}catch{return null}}function ai(){try{return typeof st=="function"?st():null}catch{return null}}function kt(e){let t=ai(),o=I(t);o.current=t;let r=I(e);return r.current=e,F(()=>({async call(i,l){let p=ii(),s=l!==void 0,d=async()=>{if(!p)throw new Error("Prompt Voice RPC is unavailable in this environment.");return s?await p(ze,i,l):await p(ze,i)};if(r.current&&r.current!==ze&&p)return d();let u=o.current;if(u)try{return s?await u.call(i,l):await u.call(i)}catch(m){if(p&&m instanceof Error&&/unknown rpc/i.test(m.message))return d();throw m}return d()}}),[])}function lt(e,t){try{typeof nn=="function"&&nn(e,t)}catch{}}function we(){let t=si()?.values,o=fn(t),[r,i]=g(null);return N(()=>{i(null)},[o.showHomeWidget,o.showInProjects,o.micVisibility]),lt(ro,l=>{l&&typeof l=="object"&&i(fn(l))}),r??o}async function Nt(e,t){if(typeof tn!="function")throw new Error("Plugin settings API is unavailable in this environment.");await tn(ri(e),t)}var li={start:[{frequency:523.25,offsetSec:0,durationSec:.11,type:"sine",peakFactor:.9},{frequency:659.25,offsetSec:.075,durationSec:.14,type:"sine",peakFactor:1}],stop:[{frequency:493.88,offsetSec:0,durationSec:.1,type:"sine",peakFactor:.85}],complete:[{frequency:659.25,offsetSec:0,durationSec:.1,type:"sine",peakFactor:.85},{frequency:783.99,offsetSec:.075,durationSec:.16,type:"sine",peakFactor:1}],error:[{frequency:329.63,offsetSec:0,durationSec:.12,type:"triangle",peakFactor:.9},{frequency:246.94,offsetSec:.095,durationSec:.16,type:"triangle",peakFactor:.9}]},Dt=null;function ci(){if(typeof window>"u")return null;let e=window.AudioContext??window.webkitAudioContext;return e?((!Dt||Dt.state==="closed")&&(Dt=new e),Dt):null}function yo(e,t,o){let r=e.currentTime,i=li[t],l=null,p=0;for(let s of i){let d=e.createOscillator(),u=e.createGain(),m=r+s.offsetSec,b=m+s.durationSec,v=s.offsetSec+s.durationSec+.02,y=o*(s.peakFactor??1);v>=p&&(p=v,l=d),d.type=s.type??"sine",d.frequency.setValueAtTime(s.frequency,m),u.gain.setValueAtTime(1e-4,m),u.gain.exponentialRampToValueAtTime(Math.max(2e-4,y),m+.015),u.gain.exponentialRampToValueAtTime(1e-4,b),d.connect(u),u.connect(e.destination),d.start(m),d.stop(b+.02)}return{finalOsc:l,totalDurationSec:p}}function xo(e,t){let o=Math.ceil(t*1e3)+40;return new Promise(r=>{let i=!1,l=null,p=()=>{i||(i=!0,l!==null&&clearTimeout(l),e&&typeof e.removeEventListener=="function"&&e.removeEventListener("ended",p),r())};if(e&&typeof e.addEventListener=="function")e.addEventListener("ended",p,{once:!0});else if(e&&"onended"in e){let s=e.onended;e.onended=function(d){typeof s=="function"&&s.call(this,d),p()}}l=setTimeout(p,o)})}async function pi(e){if(e.state!=="suspended")return e.state==="running";let t=null;try{return await Promise.race([e.resume(),new Promise(o=>{t=setTimeout(o,750)})]),e.state!=="suspended"}catch{return!1}finally{t!==null&&clearTimeout(t)}}function V(e,t){if(!t.enabled)return null;let o=Math.min(100,Math.max(0,t.volume));if(!Number.isFinite(o)||o<=0)return null;try{let r=ci();if(!r)return null;let i=o/100*.2;if(r.state==="suspended")return(async()=>{if(!await pi(r))return;let{finalOsc:d,totalDurationSec:u}=yo(r,e,i);await xo(d,u)})().catch(()=>{});let{finalOsc:l,totalDurationSec:p}=yo(r,e,i);return xo(l,p)}catch{return null}}var gn=16e3,So=44,ct=2,di="This recording couldn't be prepared for Local Whisper. Try again.",ui=async(e,t)=>{let r=await new OfflineAudioContext(1,1,t).decodeAudioData(e),i=Array.from({length:r.numberOfChannels},(l,p)=>r.getChannelData(p));return{sampleRate:r.sampleRate,channels:i}};function mi(e){if(e.length===0)return new Float32Array(0);if(e.length===1)return e[0];let t=Math.min(...e.map(r=>r.length)),o=new Float32Array(t);for(let r=0;r<t;r+=1){let i=0;for(let l of e)i+=l[r];o[r]=i/e.length}return o}function fi(e,t){let o=e.length*ct,r=new Uint8Array(So+o),i=new DataView(r.buffer),l=(p,s)=>{for(let d=0;d<s.length;d+=1)i.setUint8(p+d,s.charCodeAt(d))};l(0,"RIFF"),i.setUint32(4,36+o,!0),l(8,"WAVE"),l(12,"fmt "),i.setUint32(16,16,!0),i.setUint16(20,1,!0),i.setUint16(22,1,!0),i.setUint32(24,t,!0),i.setUint32(28,t*ct,!0),i.setUint16(32,ct,!0),i.setUint16(34,8*ct,!0),l(36,"data"),i.setUint32(40,o,!0);for(let p=0;p<e.length;p+=1){let s=Math.max(-1,Math.min(1,e[p]));i.setInt16(So+p*ct,s<0?s*32768:s*32767,!0)}return r}function gi(e){let t=atob(e),o=new Uint8Array(t.length);for(let r=0;r<t.length;r+=1)o[r]=t.charCodeAt(r);return o.buffer}async function bi(e,t=ui){let o;try{let r=await t(gi(e.base64),gn);if(r.sampleRate!==gn)throw new Error("decoder ignored the requested sample rate");o=fi(mi(r.channels),gn)}catch{throw new te("RECORDING_FAILED",di)}return{base64:await dn(new Blob([o],{type:"audio/wav"})),mimeType:"audio/wav"}}async function Be(e,t,o=bi){return(await e.call(Pe).catch(()=>null))?.audioFormat==="wav"?o(t):t}var wo=globalThis.__ZCC_HOST_REACT__,Y=wo.Fragment;function n(e,t,o){return wo.createElement(e,o===void 0?t:{...t,key:o})}var a=n;var vi={system:"Zana Voice",openai:"OpenAI Whisper","google-gemini":"Google Gemini","local-whisper":"Local Whisper"};function hi(e,t){let[o,r]=g("system"),[i,l]=g("assistant");return N(()=>{let p=!0;return e.call(Pe).then(s=>{if(!p||!s||typeof s!="object")return;let d=s;d.sttProvider&&r(d.sttProvider),d.llmProvider&&l(d.llmProvider)}).catch(()=>{}),e.call(ye).then(s=>{!p||!s||typeof s!="object"||(t.current=me(s))}).catch(()=>{}),()=>{p=!1}},[t,e]),{sttProvider:o,llmProvider:i}}function yi(e){let[t,o]=g(0);return N(()=>{if(e!=="recording"){o(0);return}let r=Date.now(),i=setInterval(()=>{o(Math.floor((Date.now()-r)/1e3))},250);return()=>clearInterval(i)},[e]),t}async function xi(e,t,o,r,i,l,p){let s={enabled:o.soundCuesEnabled,volume:o.soundCuesVolume},d=await e.stop();if(!i.current)return;V("stop",s);let u=await Be(t,d),m=await t.call(je,{audio:u.base64,mimeType:u.mimeType,source:"home",...l.projectId?{projectId:l.projectId}:{},...typeof l.audioDurationMs=="number"?{audioDurationMs:l.audioDurationMs}:{}});if(i.current){if(m.ok&&m.status==="ok"){V("complete",s),typeof r?.toCompose=="function"?(r.toCompose({initialPrompt:m.text,focusPrompt:!0}),p.setNotice("Draft opened in new thread composer.")):p.setNotice(m.text);return}if(m.ok&&m.status==="no-speech"){p.setNotice("No speech detected. Try again.");return}m.ok||(V("error",s),p.setError(m.message))}}async function Si(e,t,o){let r={enabled:e.soundCuesEnabled,volume:e.soundCuesVolume},i=V("start",r);if(i&&(await i,!o()))return null;let l=await(e.micDeviceId!==z?t({deviceId:e.micDeviceId}):t());return o()?l:(l.cancel(),null)}function wi(e,t,o,r){let[i,l]=g("idle"),[p,s]=g(null),[d,u]=g(null),m=I(!0),b=I(null),v=I(null),y=I(0),S=I(ue()),{sttProvider:h,llmProvider:T}=hi(e,S),x=yi(i);N(()=>(m.current=!0,()=>{m.current=!1,y.current++,b.current?.cancel(),b.current=null}),[]);let _=R(async()=>{let U=b.current;b.current=null;let k=v.current;v.current=null;let H=k!==null?Math.max(0,Date.now()-k):void 0;if(!U){l("idle");return}let C=S.current;l("transcribing");try{await xi(U,e,C,t,m,{projectId:r,audioDurationMs:H},{setNotice:s,setError:u})}catch($){if(!m.current)return;V("error",{enabled:C.soundCuesEnabled,volume:C.soundCuesVolume}),u($ instanceof Error?$.message:"Quick dictation failed.")}finally{m.current&&l("idle")}},[t,r,e]),X=R(async()=>{u(null),s(null);let U=ue();S.current=U;let k={enabled:U.soundCuesEnabled,volume:U.soundCuesVolume},H=++y.current;l("starting");try{let C=await Si(U,o,()=>m.current&&y.current===H);if(!C)return;C.onError=$=>{b.current=null,v.current=null,m.current&&(V("error",k),u($.message),l("idle"))},C.onAutoStop=()=>{m.current&&_()},b.current=C,v.current=Date.now(),l("recording")}catch(C){if(!m.current)return;V("error",k),u(C instanceof Error?C.message:"Microphone access denied."),l("idle")}},[o,_]),O=R(()=>{y.current++,v.current=null,b.current?.cancel(),b.current=null,l("idle")},[]);return{sttProvider:h,llmProvider:T,phase:i,seconds:x,notice:p,error:d,start:X,stopAndTranscribe:_,cancel:O}}function Ti({phase:e,formattedTime:t,onToggleDictate:o,onCancel:r,onOpenStudio:i,onOpenHistory:l}){let p=e==="starting"?"Starting mic\u2026":e==="recording"?`Stop & Compose (${t})`:e==="transcribing"?"Transcribing\u2026":"Dictate to New Thread";return a("div",{className:"ps-home-actions",children:[n("button",{type:"button",className:`ps-btn ${e==="recording"?"ps-btn-danger":"ps-btn-primary"}`,disabled:e==="starting"||e==="transcribing",onClick:o,children:p}),e==="starting"||e==="recording"?n("button",{type:"button",className:"ps-btn",onClick:r,children:"Cancel"}):a(Y,{children:[n("button",{type:"button",className:"ps-btn",onClick:i,children:"Open Prompt Studio"}),n("button",{type:"button",className:"ps-btn",onClick:l,children:"History"})]})]})}function To(e){return we().showHomeWidget?n(Ii,{...e}):null}function Ii({pluginId:e,projectId:t,startSession:o=fe}){ee();let r=kt(e),i=$e(),l=wi(r,i,o,t),p=R(()=>{if(Fe("studio"),t&&typeof i?.toProject=="function"){i.toProject(t,{tabId:ke});return}i?.toPluginPanel?.(le)},[i,t]),s=R(()=>{if(Fe("history"),t&&typeof i?.toProject=="function"){i.toProject(t,{tabId:ke});return}i?.toPluginPanel?.(le,{subPath:Se})},[i,t]),d=()=>{l.phase==="recording"?l.stopAndTranscribe():l.phase==="idle"&&l.start()},u=`${Math.floor(l.seconds/60)}:${String(l.seconds%60).padStart(2,"0")}`,m=vi[l.sttProvider]??l.sttProvider,b=l.llmProvider==="none"?"Raw transcript":"AI cleanup on";return a("div",{className:"ps-home-card","data-testid":"pv-home-widget",children:[a("div",{className:"ps-home-card-top",children:[a("div",{className:"ps-home-copy",children:[a("div",{className:"ps-home-heading",children:[n("span",{"aria-hidden":"true",children:"\u{1F399}\uFE0F"}),n("span",{children:"Dictate a new thread or refine in Prompt Studio"})]}),a("div",{className:"ps-home-meta",children:[n("span",{children:m}),n("span",{"aria-hidden":"true",children:"\xB7"}),n("span",{children:b})]})]}),n(Ti,{phase:l.phase,formattedTime:u,onToggleDictate:d,onCancel:l.cancel,onOpenStudio:p,onOpenHistory:s})]}),l.notice?n("div",{role:"status",className:"ps-home-status",children:l.notice}):null,l.error?n("div",{role:"alert",className:"ps-home-error",children:l.error}):null]})}function Ge(e,t){let o=t.trim();return o?e?/\s$/.test(e)?`${e}${o}`:`${e} ${o}`:o:e}var Ci="No speech detected.",bn={phase:"idle",notice:null,error:null};function Io(e,t){switch(t.type){case"START":return e.phase==="idle"||e.phase==="error"?{phase:"starting",notice:null,error:null}:e;case"STARTED":return e.phase==="starting"?{...e,phase:"recording"}:e;case"STOP":return e.phase==="recording"||e.phase==="starting"?{phase:"processing",notice:null,error:null}:e;case"CANCEL":return e.phase==="recording"||e.phase==="starting"?{...bn}:e;case"SUCCESS":case"NO_SPEECH":return e.phase!=="processing"?e:{phase:"idle",notice:t.type==="NO_SPEECH"?Ci:t.notice,error:null};case"CLEAR_NOTICE":return e.notice?{...e,notice:null}:e;case"FAILURE":return{phase:"error",notice:null,error:t.message}}}var Ei="Prompt Voice returned an unexpected response. Try again.",Ri="Dictation failed. Try again.",Ai=4e3;function Pi(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}function ki(e){return typeof e=="object"&&e!==null&&!("ok"in e&&"status"in e)}async function Ni(e,t,o){let r=await Be(e,t),i=await e.call(je,{audio:r.base64,mimeType:r.mimeType,source:"composer",...o.projectId?{projectId:o.projectId}:{},...o.threadId?{threadId:o.threadId}:{},...typeof o.audioDurationMs=="number"?{audioDurationMs:o.audioDurationMs}:{}});if(!Pi(i))throw new Error(Ei);return i}function Co(e){return e instanceof Error&&e.message?e.message:Ri}function We(e){return{enabled:e.soundCuesEnabled,volume:e.soundCuesVolume}}function Di(e,t,o,r=ue()){if(!e.ok){V("error",We(r)),o({type:"FAILURE",message:e.message});return}if(e.status==="no-speech"){o({type:"NO_SPEECH"});return}V("complete",We(r)),t.updateText(l=>Ge(l,e.text)),t.focus();let i=e.refineNotice?`Inserted the raw transcript. ${e.refineNotice.message}`:"Added to draft.";o({type:"SUCCESS",notice:i})}function _i(e,t,o,r){return t()?(e.onError=i=>{t()&&r(i)},e.onAutoStop=()=>{t()&&o()},e):(e.cancel(),null)}function Mi(e,t,o,r,i,l){let p=s=>{V("error",We(l())),i({type:"FAILURE",message:Co(s)})};return e.then(s=>{if(!s)return null;let d=_i(s,o,r,u=>{t.current=null,p(u)});return d&&(t.current=d),d},s=>(o()&&p(s),null))}function Li(e,t,o){let r=I(null),i=I(null),l=I(0),p=I(!0),s=R(()=>{l.current++,i.current=null,r.current&&(r.current.cancel(),r.current=null),t({type:"CANCEL"})},[t]);N(()=>(p.current=!0,()=>{p.current=!1,s()}),[s]);let d=R(async()=>{let v=i.current?await i.current:r.current;return r.current=null,v},[]),u=R(async(v,y)=>{let S=++l.current,h=()=>p.current&&l.current===S,T=V("start",We(y)),_=Mi((async()=>T&&(await T,!h())?null:await(y.micDeviceId!==z?e({deviceId:y.micDeviceId}):e()))(),r,h,v,t,o);i.current=_,await _&&h()&&t({type:"STARTED"}),i.current===_&&(i.current=null)},[t,o,e]),m=R(()=>p.current,[]),b=R(()=>r.current?.getAudioLevel?.()??null,[]);return{start:u,takeSession:d,cancel:s,isMounted:m,getAudioLevel:b}}function Eo({startSession:e=fe,noticeDurationMs:t=Ai}={}){let o=at(),r=Ue(),i=Pt(),l=st(),p=I(l);p.current=l;let[s,d]=Xn(Io,bn),u=I(s.phase);u.current=s.phase;let m=I(null),b=I(ue()),v=I(null),y=R(()=>b.current,[]),{start:S,takeSession:h,cancel:T,isMounted:x,getAudioLevel:_}=Li(e,d,y),[X,O]=g(null),[U,k]=g(0),[H,C]=g(!1),$=r?.scope,dt=$&&typeof $=="object"?$.projectId:void 0,Ft=$&&typeof $=="object"?$.threadId:void 0,pe=I({});pe.current={projectId:dt||i?.projectId||void 0,threadId:Ft||i?.threadId||void 0},N(()=>{let q=!0;return p.current.call(ye).then(G=>{if(!q||!ki(G))return;let de=me(G);m.current=de,(u.current==="idle"||u.current==="error")&&(b.current=de)}).catch(()=>{}),()=>{q=!1}},[]),N(()=>{if(s.phase!=="recording"){O(null),k(0);return}let q=Date.now();v.current=q;let G=()=>{O(_()),k(Math.floor((Date.now()-q)/1e3))};G();let de=setInterval(G,100);return()=>clearInterval(de)},[_,s.phase]),N(()=>{if(!s.notice)return;let q=setTimeout(()=>{d({type:"CLEAR_NOTICE"})},t);return()=>clearTimeout(q)},[t,s.notice]);let ne=R(()=>{d({type:"CLEAR_NOTICE"})},[]),Ie=R(async()=>{let q=b.current,G=v.current;v.current=null;let de=G!==null?Math.max(0,Date.now()-G):void 0;d({type:"STOP"});let Ke=await h();if(!(!x()||!Ke))try{let ge=await Ke.stop();if(!x())return;V("stop",We(q));let ut=await Ni(l,ge,{...pe.current,audioDurationMs:de});if(!x())return;Di(ut,o,d,q)}catch(ge){if(!x())return;V("error",We(q)),d({type:"FAILURE",message:Co(ge)})}},[o,x,l,h]),Ne=R(async()=>{let q=ln()??m.current??he({});b.current=q,C(!1),d({type:"START"}),await S(()=>{C(!0),Ie()},q)},[Ie,S]),zt=R(()=>{s.phase==="recording"||s.phase==="starting"?Ie():s.phase!=="processing"&&Ne()},[Ne,Ie,s.phase]);return{phase:s.phase,error:s.error,notice:s.notice,level:X,seconds:U,autoStopped:H,onClick:zt,cancel:T,clearNotice:ne,beginDictation:Ne,finishDictation:Ie}}var Oi="Dictation",Hi={idle:"Start dictation",starting:"Stop dictation",recording:"Stop dictation",processing:"Transcribing",error:"Start dictation"},Ro={position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",border:0};function Ao({startSession:e=fe}){let t=we(),o=Ue(),r=Pt();return vo(t.micVisibility,o?.scope,r?.projectId)?n(Vi,{startSession:e}):null}function Vi({startSession:e=fe}){ee();let{phase:t,error:o,notice:r,onClick:i,cancel:l,clearNotice:p,level:s,seconds:d,autoStopped:u}=Eo({startSession:e}),m=t==="starting"||t==="recording"||t==="processing",b=t==="idle"&&!!r,v=`${Math.floor(d/60)}:${String(d%60).padStart(2,"0")}`;return a("div",{className:`pv-mic pv-dictation-pill pv-phase-${t} ${b?"pv-has-notice":""}`,onClick:b?p:void 0,title:b?"Click to dismiss":void 0,children:[n("button",{type:"button",className:`pv-mic-button pv-mic-${t} ${m?"pv-pill-btn-stop":"pv-idle-icon"}`,"aria-label":Oi,"aria-pressed":t==="recording"||t==="starting",title:Hi[t],disabled:t==="processing",onClick:i,style:b?{display:"none"}:void 0,children:t==="idle"||t==="error"?n("svg",{viewBox:"0 0 24 24",width:"16",height:"16","aria-hidden":"true",focusable:"false",children:n("path",{d:"M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5Zm6 9h2v-3h-2v3Z",fill:"currentColor"})}):t==="processing"?n("span",{className:"pv-mic-spinner","aria-hidden":"true"}):n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("rect",{x:"6",y:"6",width:"12",height:"12",rx:"2.5",fill:"currentColor"})})}),b?a("span",{role:"status",className:"pv-notice-content",children:[n("span",{className:"pv-notice-check",children:"\u2713"}),n("span",{className:"pv-pill-status",children:r})]}):null,t==="starting"?a(Y,{children:[a("div",{className:"pv-pill-timer-badge",children:[n("div",{className:"pv-pill-dot pv-pill-dot-starting"}),n("span",{className:"pv-pill-timer-text",children:"0:00"})]}),a("div",{className:"pv-pill-center",role:"status",children:[n("span",{className:"pv-mic-spinner","aria-hidden":"true"}),n("span",{className:"pv-pill-status",children:"Requesting microphone\u2026"})]})]}):null,t==="recording"?a(Y,{children:[a("div",{className:"pv-pill-timer-badge",children:[n("div",{className:"pv-pill-dot"}),a("span",{className:"pv-pill-timer-text",children:[n("span",{className:"pv-sr-only",style:Ro,children:"Recording "}),v]})]}),a("div",{className:"pv-pill-center",role:"status",children:[s===null?n("span",{className:"pv-sr-only",style:Ro,children:"Audio meter unavailable"}):null,n("span",{className:`pv-pill-waveform ${s===null?"animated":""}`,"aria-label":"Microphone audio activity",role:"meter","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":Math.round((s??.3)*100),children:[.4,.7,1,.7,.4].map((y,S)=>n("span",{className:"pv-pill-waveform-bar",style:s!==null?{height:`${Math.max(3,s*y*20)}px`}:void 0},S))}),n("span",{className:"pv-pill-status",children:"Listening..."}),s!==null&&s<.015&&d>=5?n("span",{className:"pv-mic-quiet-warning",children:"No audio detected \u2014 check your microphone."}):null]})]}):null,t==="processing"?a(Y,{children:[n("div",{className:"pv-pill-timer-badge",children:n("span",{className:"pv-pill-timer-text",children:v})}),n("div",{className:"pv-pill-center",role:"status",children:a("span",{className:"pv-pill-status",children:[n("span",{className:"pv-mic-spinner","aria-hidden":"true"})," ",u?"Recording limit reached. ":"","Transcribing and refining\u2026"]})})]}):null,t==="starting"||t==="recording"?n("button",{type:"button",className:"pv-mic-cancel pv-pill-btn-cancel",onClick:l,"aria-label":"Cancel recording",title:"Cancel recording",children:n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("path",{d:"M18 6L6 18M6 6l12 12",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round"})})}):null,t==="error"&&o?n("span",{role:"alert",className:"pv-pill-status pv-mic-error",children:o}):null]})}var ji=500,Fi=5e3;function vn(e){return e>=1e3**3?`${(e/1e3**3).toFixed(1)} GB`:`${Math.round(e/1e3**2)} MB`}function zi(e){return e.runtime.status==="installing"||e.server.state==="starting"||e.models.some(t=>t.status==="downloading")}function Ui(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}function $i(e){let[t,o]=g(null),[r,i]=g(null),[l,p]=g(null),s=I(!0),d=R(v=>{if(s.current){if(!Ui(v)){i("Local Whisper returned an unexpected response.");return}v.state&&o(v.state),i(v.ok?null:v.message)}},[]),u=R(()=>e.call(ae.state).then(d,()=>s.current&&i("Could not load Local Whisper status.")),[e,d]),m=R(async(v,y,S)=>{p(v);try{d(await e.call(y,S))}catch{s.current&&i("Local Whisper request failed. Try again.")}finally{s.current&&p(null)}},[e,d]);N(()=>(s.current=!0,u(),()=>{s.current=!1}),[u]);let b=t?zi(t):!1;return N(()=>{let v=setInterval(()=>void u(),b?ji:Fi);return()=>clearInterval(v)},[b,u]),{state:t,error:r,pending:l,run:m}}function hn({tone:e}){return n("span",{"aria-hidden":"true",style:{width:9,height:9,borderRadius:"50%",marginTop:4,flex:"none",background:{ok:"var(--ps-success)",warn:"var(--ps-warn)",err:"var(--ps-danger)",busy:"var(--ps-accent)",idle:"var(--ps-text-muted)"}[e]}})}function Po({value:e,label:t}){let o=Math.round(e*100);return n("div",{role:"progressbar","aria-label":t,"aria-valuenow":o,"aria-valuemin":0,"aria-valuemax":100,style:{height:5,minWidth:80,background:"var(--ps-bg-hover)",borderRadius:3,overflow:"hidden"},children:n("div",{style:{width:`${o}%`,height:"100%",background:"var(--ps-accent)"}})})}var _t={display:"flex",gap:10,alignItems:"flex-start",padding:"10px 12px",borderRadius:6,border:"1px solid var(--ps-border)"},Te={color:"var(--ps-text-muted)",fontSize:11};function Bi(e){let{runtime:t,server:o,activeModelId:r}=e;return t.status==="not-installed"?{tone:"idle",title:"Runtime not installed",detail:`whisper.cpp ${t.version} \xB7 requires ${t.requirements.join(", ")||"no extra components"}`,action:{label:"Install runtime",method:ae.installRuntime,primary:!0}}:t.status==="installing"?{tone:"busy",title:`Installing runtime\u2026 ${Math.round((t.progress??0)*100)}%`,detail:"Verifying the download as it arrives.",action:{label:"Cancel",method:ae.cancelRuntimeInstall}}:o.state==="running"?{tone:"ok",title:"Running",detail:`Model ${o.modelId} \xB7 on this device (127.0.0.1) \xB7 managed by Prompt Voice`,action:{label:"Stop",method:ae.stop}}:o.state==="starting"?{tone:"busy",title:"Starting\u2026",detail:`Loading model ${o.modelId}.`}:o.state==="crashed"?{tone:"err",title:"Stopped unexpectedly",detail:`Exit code ${o.exitCode??"unknown"}. Logs contain no audio or transcripts.`,action:{label:"Restart",method:ae.start,primary:!0}}:r?{tone:"warn",title:"Stopped",detail:"Starts automatically when you dictate.",action:{label:"Start",method:ae.start}}:{tone:"warn",title:"Runtime installed",detail:"Download a model below and choose Use to start."}}function Gi({model:e,state:t,pending:o,onRun:r}){let i=t.activeModelId===e.id,l=t.runtime.status==="installed"&&!i,p=m=>`${m}:${e.id}`,s={modelId:e.id},d=null,u;return e.status==="downloading"?(d=a(Y,{children:[n(Po,{value:e.progress??0,label:`Downloading ${e.label}`}),a("span",{style:Te,children:[Math.round((e.progress??0)*100),"% of ",vn(e.sizeBytes)]})]}),u=n("button",{type:"button",className:"ps-btn",onClick:()=>r(p("cancel"),ae.cancelModelDownload,s),children:"Cancel"})):e.status==="available"?u=a("button",{type:"button",className:"ps-btn",disabled:o===p("download"),onClick:()=>r(p("download"),ae.downloadModel,s),children:["Download ",vn(e.sizeBytes)]}):(d=i?n("span",{className:"ps-tag",children:"Active"}):o===p("use")?n("span",{className:"ps-tag",children:"Loading\u2026"}):n("span",{className:"ps-tag",children:"Installed"}),u=a(Y,{children:[l&&n("button",{type:"button",className:"ps-btn",disabled:o!==null,onClick:()=>r(p("use"),ae.selectModel,s),children:"Use"}),n("button",{type:"button",className:"ps-btn ps-btn-danger",disabled:i||o!==null,title:i?"Choose another model before removing this one":void 0,"aria-label":`Remove ${e.label}`,onClick:()=>r(p("remove"),ae.removeModel,s),children:"Remove"})]})),a("tr",{style:i?{background:"color-mix(in srgb, var(--ps-accent) 10%, transparent)"}:void 0,children:[a("td",{style:{padding:"8px 6px"},children:[n("strong",{children:e.label})," ",e.recommended&&n("span",{className:"ps-tag",children:"Recommended"})]}),a("td",{style:{padding:"8px 6px",...Te},children:[vn(e.sizeBytes)," disk",e.memoryEstimate?a(Y,{children:[n("br",{}),e.memoryEstimate," RAM"]}):null]}),n("td",{style:{padding:"8px 6px"},children:n("div",{style:{display:"flex",flexDirection:"column",gap:4},children:d})}),n("td",{style:{padding:"8px 6px",textAlign:"right",whiteSpace:"nowrap"},children:n("div",{style:{display:"inline-flex",gap:6},children:u})})]})}function Wi(e,t){let o=e==="local-whisper";return o&&t==="none"?{offline:!0,text:"Audio and text stay on this device."}:o?{offline:!1,text:"Audio stays on this device. Cleanup sends the transcript to your selected cleanup model."}:{offline:!1,text:"Audio leaves this device for transcription."}}function ko({rpc:e,sttProvider:t,llmProvider:o,onApplyPreset:r}){let{state:i,error:l,pending:p,run:s}=$i(e),d=Wi(t,o),u=i?.runtime.status==="installed"&&i.activeModelId!==null;return a("section",{className:"ps-pane",style:{flex:"none"},"aria-labelledby":"ps-lw-title",children:[a("div",{className:"ps-pane-header",children:[n("h2",{id:"ps-lw-title",className:"ps-pane-title",style:{margin:0},children:"Local Whisper"}),n("span",{className:"ps-tag",children:i?i.platform.supported?u?"Ready":"Not set up":"Unavailable":"Loading\u2026"})]}),a("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[n("p",{style:{...Te,margin:0},children:"Transcribe on this device. Audio is never sent anywhere when Local Whisper is the speech provider."}),(l||i?.lastError)&&n("div",{role:"alert",style:{..._t,borderColor:"var(--ps-danger)",color:"var(--ps-danger)",fontSize:12},children:l??i?.lastError?.message}),i&&!i.platform.supported&&a("div",{style:_t,children:[n(hn,{tone:"err"}),a("div",{children:[n("strong",{children:"Not available on this computer"}),n("div",{style:Te,children:i.platform.message})]})]}),i?.platform.supported&&n(Yi,{state:i,pending:p,onRun:s}),i?.platform.supported&&a("div",{children:[a("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"baseline"},children:[n("span",{className:"ps-field-label",children:"Models \xB7 multilingual"}),n("span",{style:Te,children:"Stored in this computer's app data"})]}),a("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:12},children:[n("thead",{children:n("tr",{children:["Model","Size","Status",""].map(m=>n("th",{style:{textAlign:"left",...Te,fontWeight:600,padding:"4px 6px"},children:m},m))})}),n("tbody",{children:i.models.map(m=>n(Gi,{model:m,state:i,pending:p,onRun:s},m.id))})]})]}),a("div",{style:_t,children:[n(hn,{tone:d.offline?"ok":"warn"}),a("div",{style:{flex:1},children:[n("strong",{children:d.offline?"Fully offline":"Not fully offline"}),n("div",{style:Te,children:d.text})]}),!d.offline&&n("button",{type:"button",className:"ps-btn",onClick:()=>r({sttProvider:"local-whisper",llmProvider:"none"}),children:"Use offline preset"})]})]})]})}function Yi({state:e,pending:t,onRun:o}){let r=Bi(e);return a("div",{style:_t,"aria-live":"polite",children:[n(hn,{tone:r.tone}),a("div",{style:{flex:1,minWidth:0},children:[n("strong",{children:r.title}),n("div",{style:Te,children:r.detail}),e.runtime.status==="installing"&&n("div",{style:{marginTop:6},children:n(Po,{value:e.runtime.progress??0,label:"Installing runtime"})})]}),r.action&&n("button",{type:"button",className:r.action.primary?"ps-btn ps-btn-primary":"ps-btn",disabled:t==="runtime",onClick:()=>o("runtime",r.action.method),children:r.action.label})]})}function qi({statusMessage:e}){return a("div",{className:"ps-vis-header",children:[a("div",{children:[n("h3",{id:"ps-visibility-heading",className:"ps-vis-title",children:"Where Prompt Voice Appears"}),n("p",{className:"ps-vis-subtitle",children:"Control whether Prompt Voice surfaces on the main Home screen, inside Projects, and in thread composers."})]}),n("div",{className:"ps-vis-status-slot",children:e?n("span",{role:"status",className:"ps-vis-status",children:e}):null})]})}function Zi({activePreset:e,disabled:t,onSelect:o}){return n("div",{className:"ps-vis-presets",role:"group","aria-label":"Surface visibility presets",children:mn.map(r=>{let i=e===r.id;return a("button",{type:"button",className:`ps-vis-preset-card ${i?"active":""}`,"aria-pressed":i,disabled:t,onClick:()=>o(r.settings),children:[n("span",{className:"ps-vis-preset-label",children:r.label}),n("span",{className:"ps-vis-preset-desc",children:r.description})]},r.id)})})}function No({labelId:e,title:t,helpText:o,checked:r,disabled:i,onToggle:l}){return a("div",{className:"ps-toggle-card",children:[a("div",{className:"ps-toggle-copy",children:[n("span",{id:e,className:"ps-toggle-title",children:t}),n("small",{className:"ps-vis-help",children:o})]}),n("button",{type:"button",className:"ps-switch",role:"switch","aria-checked":r,"aria-labelledby":e,disabled:i,onClick:l})]})}function Ki({value:e,disabled:t,onChange:o}){return a("div",{className:"ps-toggle-card ps-vis-select-row",children:[a("div",{className:"ps-toggle-copy",children:[n("label",{htmlFor:"ps-vis-mic-select",className:"ps-toggle-title",children:"Composer mic button placement"}),n("small",{className:"ps-vis-help",children:"Choose which chat composers display the voice dictation mic pill."})]}),n("select",{id:"ps-vis-mic-select","aria-label":"Composer mic button placement",className:"ps-select ps-vis-select",value:e,disabled:t,onChange:r=>o(r.target.value),children:un.map(r=>n("option",{value:r,children:go[r]},r))})]})}function Mt(e){ee();let t=we(),o=bo(t),[r,i]=g(!1),[l,p]=g(null),[s,d]=g(null),u=async m=>{i(!0),d(null),p("Saving\u2026");try{await Nt(ze,m),p("Saved")}catch(b){p(null),d(b instanceof Error?b.message:"Could not update visibility settings.")}finally{i(!1)}};return a("section",{className:"ps-vis-section","aria-labelledby":"ps-visibility-heading",children:[n(qi,{statusMessage:l}),s?n("div",{role:"alert",className:"ps-vis-error",children:s}):null,n(Zi,{activePreset:o,disabled:r,onSelect:m=>void u(m)}),a("div",{className:"ps-vis-controls",children:[n(No,{labelId:"ps-vis-home-label",title:"Main Home screen widget",helpText:"Show a quick-dictate & Prompt Studio card on Zana\u2019s main Home screen.",checked:t.showHomeWidget,disabled:r,onToggle:()=>void u({showHomeWidget:!t.showHomeWidget})}),n(No,{labelId:"ps-vis-projects-label",title:"Prompt Studio tab in projects",helpText:"Display a dedicated Prompt Studio tab inside each project with project-scoped drafts.",checked:t.showInProjects,disabled:r,onToggle:()=>void u({showInProjects:!t.showInProjects})}),n(Ki,{value:t.micVisibility,disabled:r,onChange:m=>void u({micVisibility:m})})]}),a("p",{className:"ps-vis-note",children:["Tip: You can hide or reorder the global ",n("strong",{children:"Prompt Studio"})," item in Zana\u2019s left sidebar using Zana\u2019s sidebar customize menu."]})]})}function yn(e){if(typeof e!="string")return[];let t=new Set,o=/[,\n]/;for(let r of e.split(o)){let i=r.trim().slice(0,80);if(i&&t.add(i),t.size>=200)break}return[...t]}function Do(e,t){let o=yn(t);if(o.length===0)return[...e];let r=new Set(e),i=[...e];for(let l of o){if(i.length>=200)break;r.has(l)||(r.add(l),i.push(l))}return i}function xn(e){return e.join(`
`)}var _o=[100,500,2e3,0],Mo=[30,90,365,0];function Xi(e){return!(e===!1||typeof e=="string"&&e.trim().toLowerCase()==="false")}function Lo(e,t,o){let r=typeof e=="number"?e:typeof e=="string"&&e.trim()!==""?Number(e):Number.NaN;if(!Number.isFinite(r)||r<0)return t;let i=Math.round(r);return Math.min(o,i)}function Ji(e){return Lo(e,500,5e4)}function Qi(e){return Lo(e,90,3650)}function Oo(e){let t=e??{};return{historyEnabled:Xi(t.historyEnabled),historyMaxEntries:Ji(t.historyMaxEntries),historyMaxDays:Qi(t.historyMaxDays)}}var Lt=[{code:"auto",label:"Detect automatically"},{code:"af",label:"Afrikaans"},{code:"ar",label:"Arabic"},{code:"hy",label:"Armenian"},{code:"az",label:"Azerbaijani"},{code:"eu",label:"Basque"},{code:"be",label:"Belarusian"},{code:"bn",label:"Bengali"},{code:"bs",label:"Bosnian"},{code:"bg",label:"Bulgarian"},{code:"ca",label:"Catalan"},{code:"zh",label:"Chinese"},{code:"hr",label:"Croatian"},{code:"cs",label:"Czech"},{code:"da",label:"Danish"},{code:"nl",label:"Dutch"},{code:"en",label:"English"},{code:"et",label:"Estonian"},{code:"fi",label:"Finnish"},{code:"fr",label:"French"},{code:"gl",label:"Galician"},{code:"ka",label:"Georgian"},{code:"de",label:"German"},{code:"el",label:"Greek"},{code:"gu",label:"Gujarati"},{code:"he",label:"Hebrew"},{code:"hi",label:"Hindi"},{code:"hu",label:"Hungarian"},{code:"is",label:"Icelandic"},{code:"id",label:"Indonesian"},{code:"ga",label:"Irish"},{code:"it",label:"Italian"},{code:"ja",label:"Japanese"},{code:"kn",label:"Kannada"},{code:"kk",label:"Kazakh"},{code:"ko",label:"Korean"},{code:"lv",label:"Latvian"},{code:"lt",label:"Lithuanian"},{code:"mk",label:"Macedonian"},{code:"ms",label:"Malay"},{code:"ml",label:"Malayalam"},{code:"mt",label:"Maltese"},{code:"mr",label:"Marathi"},{code:"ne",label:"Nepali"},{code:"no",label:"Norwegian"},{code:"fa",label:"Persian"},{code:"pl",label:"Polish"},{code:"pt",label:"Portuguese"},{code:"pa",label:"Punjabi"},{code:"ro",label:"Romanian"},{code:"ru",label:"Russian"},{code:"sr",label:"Serbian"},{code:"sk",label:"Slovak"},{code:"sl",label:"Slovenian"},{code:"es",label:"Spanish"},{code:"sw",label:"Swahili"},{code:"sv",label:"Swedish"},{code:"tl",label:"Tagalog"},{code:"ta",label:"Tamil"},{code:"te",label:"Telugu"},{code:"th",label:"Thai"},{code:"tr",label:"Turkish"},{code:"uk",label:"Ukrainian"},{code:"ur",label:"Urdu"},{code:"vi",label:"Vietnamese"},{code:"cy",label:"Welsh"}],Ye="en",Sn=Lt.filter(e=>e.code!=="auto");function qe(e){if(typeof e!="string")return;let t=e.trim().toLowerCase();if(t)return Sn.find(o=>o.code.toLowerCase()===t||o.label.toLowerCase()===t)}function Vo(){if(!(typeof navigator>"u"))return navigator.mediaDevices}function es(e){return e.replace(/^default\s*[-–:]\s*/i,"").trim()}function jo(e){let t=e instanceof Error?e.name:"";return t==="NotAllowedError"||t==="SecurityError"}function Ho(e){let t=e.filter(s=>s.kind==="audioinput"),o=t.some(s=>!!s.label?.trim()),r=null,i=[],l=new Set,p=1;for(let s of t){let d=s.label?.trim()??"";if(s.deviceId===z){d&&(r=es(d)||d);continue}!s.deviceId||l.has(s.deviceId)||(l.add(s.deviceId),i.push({deviceId:s.deviceId,label:d||`Microphone ${p}`,isDefault:!1}),p++)}return{devices:i,defaultDeviceLabel:r,labelsAvailable:o}}async function ts(e){if(!e.getUserMedia||!e.enumerateDevices)return{ok:!1,permissionDenied:!1};try{return(await e.getUserMedia({audio:!0})).getTracks().forEach(o=>o.stop()),{ok:!0,rawDevices:await e.enumerateDevices()}}catch(t){return jo(t)?{ok:!1,permissionDenied:!0}:(console.warn("Prompt Voice failed to refresh audio input devices",t),{ok:!1,permissionDenied:!1})}}async function Fo(e={}){let t=e.mediaDevices??Vo();if(!t?.enumerateDevices)return{devices:[],defaultDeviceLabel:null,labelsAvailable:!1,permissionDenied:!1,supported:!1,error:null};let o;try{o=await t.enumerateDevices()}catch(l){return console.warn("Prompt Voice failed to enumerate audio input devices",l),{devices:[],defaultDeviceLabel:null,labelsAvailable:!1,permissionDenied:jo(l),supported:!0,error:"Could not list microphones. Using System default."}}let r=Ho(o),i=!1;if(e.requestPermissionIfUnlabeled&&!r.labelsAvailable){let l=await ts(t);l.ok?r=Ho(l.rawDevices):i=l.permissionDenied}return{...r,permissionDenied:i,supported:!0,error:null}}function zo(e,t=Vo()){if(!t?.addEventListener||!t?.removeEventListener)return()=>{};let o=()=>e();return t.addEventListener("devicechange",o),()=>t.removeEventListener?.("devicechange",o)}function Uo(){let[e,t]=g([]),[o,r]=g(null),[i,l]=g(!0),[p,s]=g(!1),[d,u]=g(null),[m,b]=g(!1),v=I(!0),y=I(0),S=R(async(h=!1)=>{let T=++y.current;v.current&&b(!0);try{let x=await Fo({requestPermissionIfUnlabeled:h});if(!v.current||y.current!==T)return;t(x.devices),r(x.defaultDeviceLabel),l(x.labelsAvailable),s(x.permissionDenied),u(x.error)}catch(x){if(console.warn("Prompt Voice audio device lookup failed",x),!v.current||y.current!==T)return;t([]),u("Could not list microphones. Using System default.")}finally{v.current&&y.current===T&&b(!1)}},[]);return N(()=>{v.current=!0,S(!1);let h=zo(()=>{S(!1)});return()=>{v.current=!1,y.current++,h()}},[S]),{devices:e,defaultDeviceLabel:o,labelsAvailable:i,permissionDenied:p,error:d,isRefreshing:m,refresh:S}}var as={"Voice & transcription":[{key:"sttProvider",label:"Speech-to-text provider",options:["system","google-gemini","openai","local-whisper"]},{key:"inputLanguage",label:"Input language",options:Lt.map(e=>e.code),help:"Spoken language for transcription, or Detect automatically."},{key:"dictionary",label:"Personal dictionary",help:"Add specific names, acronyms, or technical terms to guarantee accurate spelling."}],"Prompt Voice":[{key:"tone",label:"Cleanup tone",options:[...ao],help:"Fixes grammar and clarity in the original language without extending text length."},{key:"customPrompt",label:"Custom cleanup instructions",multiline:!0}],Connections:[]},wn={sttProvider:"system",inputLanguage:"auto",tone:"standard"},ls={...Object.fromEntries(Lt.map(e=>[e.code,e.label])),standard:"Standard (Fix & clarify)",casual:"Casual",conversational:"Conversational",formal:"Professional",technical:"Technical",custom:"Custom",system:"Zana voice",none:"Off",assistant:"Zana assistant",openai:"OpenAI",anthropic:"Anthropic",google:"Google AI","google-gemini":"Google Gemini","local-whisper":"Local Whisper (on this device)"};function cs(e,t,o){return e.error?{warn:!0,text:e.error}:e.permissionDenied?{warn:!0,text:"Microphone permission denied. Allow microphone access in system settings to see device names."}:t.micDeviceId!==z&&!o?{warn:!0,text:"Selected microphone is currently disconnected. Recording will fall back to System default until reconnected."}:!e.labelsAvailable&&e.devices.length>0?{warn:!1,text:"Device names are hidden until microphone access is granted. Click Refresh to detect names."}:t.micDeviceId===z?{warn:!1,text:"Uses your OS default input device. Saved selection applies to Prompt Studio and Composer dictation."}:{warn:!1,text:`Using ${o?.label??(t.micLabel||t.micDeviceId)}. Saved until you choose another mic.`}}function ps({prefs:e,audio:t,onSelect:o}){let r=t.devices.find(d=>d.deviceId===e.micDeviceId),i=e.micDeviceId!==z&&!r,l=cs(t,e,r),p=t.defaultDeviceLabel?`System default (${t.defaultDeviceLabel})`:"System default",s=d=>{if(d===z){o(z,"");return}let u=t.devices.find(m=>m.deviceId===d);o(d,u?.label??e.micLabel)};return a("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-mic-select",className:"ps-field-label",children:"Input microphone"}),a("div",{className:"ps-mic-row",children:[a("select",{id:"ps-mic-select","aria-label":"Input microphone",className:"ps-select",value:e.micDeviceId,onChange:d=>s(d.target.value),children:[n("option",{value:z,children:p}),t.devices.map(d=>n("option",{value:d.deviceId,children:d.label},d.deviceId)),i&&n("option",{value:e.micDeviceId,children:`${e.micLabel||e.micDeviceId} (Disconnected)`})]}),n("button",{type:"button",className:"ps-btn",onClick:()=>void t.refresh(!0),disabled:t.isRefreshing,"aria-label":"Refresh microphones",title:"Refresh connected audio input devices",children:t.isRefreshing?"Refreshing\u2026":"\u21BB Refresh"})]}),a("div",{className:"ps-audio-status",role:t.error?"alert":void 0,children:[n("span",{className:`ps-audio-dot ${l.warn?"warn":""}`,"aria-hidden":"true"}),n("span",{children:l.text})]})]})}function ds({prefs:e,onToggle:t,onVolumeChange:o}){let r=()=>{e.soundCuesEnabled&&V("start",{enabled:!0,volume:e.soundCuesVolume})};return a(Y,{children:[a("div",{className:"ps-toggle-card",children:[a("div",{className:"ps-toggle-copy",children:[n("span",{id:"ps-sound-cues-label",className:"ps-toggle-title",children:"Sound cues & chimes"}),n("small",{style:{color:"var(--ps-text-muted)"},children:"Play a subtle chime when dictation starts, finishes, or encounters an error."})]}),n("button",{type:"button",className:"ps-switch",role:"switch","aria-checked":e.soundCuesEnabled,"aria-labelledby":"ps-sound-cues-label",onClick:t})]}),a("div",{className:`ps-volume-card ${e.soundCuesEnabled?"":"disabled"}`,children:[a("div",{className:"ps-volume-header",children:[n("label",{htmlFor:"ps-chime-volume",className:"ps-field-label",children:"Chime volume"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 9px",fontSize:11},disabled:!e.soundCuesEnabled,onClick:r,children:"Test chime"})]}),a("div",{className:"ps-volume-controls",children:[n("input",{id:"ps-chime-volume",type:"range",className:"ps-volume-slider","aria-label":"Chime volume",min:0,max:100,step:5,value:e.soundCuesVolume,disabled:!e.soundCuesEnabled,onChange:i=>o(Number(i.target.value)),onPointerUp:r,onKeyUp:i=>{["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(i.key)&&r()}}),a("span",{className:"ps-volume-pct",children:[e.soundCuesVolume,"%"]})]})]})]})}function us({values:e,onSave:t}){let o=F(()=>he(e),[e]),r=Uo();return a("section",{className:"ps-pane",style:{flex:"none"},"aria-labelledby":"ps-audio-feedback-title",children:[a("div",{className:"ps-pane-header",children:[n("h2",{id:"ps-audio-feedback-title",className:"ps-pane-title",style:{margin:0},children:"Audio & Feedback"}),n("button",{type:"button",className:"ps-btn",onClick:()=>t({micDeviceId:z,micLabel:"",soundCuesEnabled:String(!0),soundCuesVolume:String(75)}),children:"Reset"})]}),a("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[n(ps,{prefs:o,audio:r,onSelect:(p,s)=>t({micDeviceId:p,micLabel:s})}),n(ds,{prefs:o,onToggle:()=>{let p=!o.soundCuesEnabled;t({soundCuesEnabled:String(p)}),p&&V("start",{enabled:!0,volume:o.soundCuesVolume})},onVolumeChange:p=>t({soundCuesVolume:String(p)})})]})]})}function ms(e){return e===0?"Unlimited":`${e.toLocaleString()} entries`}function fs(e){return e===0?"Forever":e===365?"1 year":`${e} days`}function $o(e,t){return e.includes(t)?[...e]:[...e,t]}function gs({enabled:e,onToggle:t}){return a("div",{className:"ps-toggle-card",children:[a("div",{className:"ps-toggle-copy",children:[n("span",{id:"ps-history-enabled-label",className:"ps-toggle-title",children:"Save activity history"}),n("small",{style:{color:"var(--ps-text-muted)"},children:"Store text and metadata from dictations and Prompt Studio refinements locally. Audio recordings are never saved."})]}),n("button",{type:"button",className:"ps-switch",role:"switch","aria-checked":e,"aria-labelledby":"ps-history-enabled-label",onClick:t})]})}function bs({prefs:e,onSave:t}){let o=F(()=>$o(_o,e.historyMaxEntries),[e.historyMaxEntries]),r=F(()=>$o(Mo,e.historyMaxDays),[e.historyMaxDays]);return a("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:12},children:[a("label",{className:"ps-field-group",children:[n("span",{className:"ps-field-label",children:"Maximum entries"}),n("select",{className:"ps-select","aria-label":"Maximum history entries",value:String(e.historyMaxEntries),onChange:i=>t({historyMaxEntries:i.target.value}),children:o.map(i=>n("option",{value:String(i),children:ms(i)},i))}),n("small",{style:{color:"var(--ps-text-muted)"},children:"Starred entries are exempt from automatic pruning."})]}),a("label",{className:"ps-field-group",children:[n("span",{className:"ps-field-label",children:"Retention period"}),n("select",{className:"ps-select","aria-label":"History retention period",value:String(e.historyMaxDays),onChange:i=>t({historyMaxDays:i.target.value}),children:r.map(i=>n("option",{value:String(i),children:fs(i)},i))}),n("small",{style:{color:"var(--ps-text-muted)"},children:"Older non-starred entries are pruned automatically."})]})]})}function vs({includeStarred:e,clearing:t,onIncludeStarredChange:o,onCancel:r,onConfirm:i}){return a("div",{role:"alertdialog","aria-label":"Confirm clear activity history",style:{display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:10,padding:"10px 12px",borderRadius:6,background:"rgba(239, 68, 68, 0.1)",border:"1px solid rgba(239, 68, 68, 0.35)"},children:[a("div",{style:{display:"flex",flexDirection:"column",gap:4},children:[n("strong",{style:{fontSize:12},children:"Clear all activity history?"}),a("label",{style:{display:"inline-flex",alignItems:"center",gap:6,fontSize:11.5,cursor:"pointer"},children:[n("input",{type:"checkbox",checked:e,onChange:l=>o(l.target.checked)}),n("span",{children:"Also delete starred entries"})]})]}),a("div",{style:{display:"flex",gap:6},children:[n("button",{type:"button",className:"ps-btn",disabled:t,onClick:r,children:"Cancel"}),n("button",{type:"button",className:"ps-btn ps-btn-danger",disabled:t,onClick:i,children:t?"Clearing\u2026":"Confirm clear"})]})]})}function hs({rpc:e}){let[t,o]=g(!1),[r,i]=g(!1),[l,p]=g(!1),[s,d]=g(null),u=async()=>{p(!0),d(null);try{let m=await e.call(Rt,{includeStarred:r});o(!1),i(!1),m?.ok?d(m.deletedCount===0?"No matching history entries to clear.":`Cleared ${m.deletedCount} history ${m.deletedCount===1?"entry":"entries"}.`):d("History storage is unavailable.")}catch{d("Could not clear history.")}finally{p(!1)}};return a("div",{style:{display:"flex",flexDirection:"column",gap:8,paddingTop:4,borderTop:"1px solid var(--ps-border)"},children:[t?n(vs,{includeStarred:r,clearing:l,onIncludeStarredChange:i,onCancel:()=>o(!1),onConfirm:()=>void u()}):a("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10},children:[n("small",{style:{color:"var(--ps-text-muted)"},children:"Remove stored dictation and refinement history from this machine."}),n("button",{type:"button",className:"ps-btn ps-btn-danger",onClick:()=>{i(!1),o(!0)},children:"Clear history"})]}),s?n("div",{role:"status",style:{fontSize:11.5,color:"var(--ps-text-muted)"},children:s}):null]})}function ys({rpc:e,values:t,onSave:o}){let r=F(()=>Oo(t),[t]);return a("section",{className:"ps-pane",style:{flex:"none"},"aria-labelledby":"ps-history-privacy-title",children:[a("div",{className:"ps-pane-header",children:[n("h2",{id:"ps-history-privacy-title",className:"ps-pane-title",style:{margin:0},children:"History & Privacy"}),n("button",{type:"button",className:"ps-btn",onClick:()=>o({historyEnabled:String(!0),historyMaxEntries:String(500),historyMaxDays:String(90)}),children:"Reset"})]}),a("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[n(gs,{enabled:r.historyEnabled,onToggle:()=>o({historyEnabled:String(!r.historyEnabled)})}),n(bs,{prefs:r,onSave:o}),n(hs,{rpc:e})]})]})}function xs({terms:e,atLimit:t,onRemove:o,onClearAll:r}){return a(Y,{children:[n("div",{className:"ps-dict-well",children:e.length>0?n("ul",{className:"ps-dict-pills","aria-label":"Dictionary terms",children:e.map(i=>a("li",{className:"ps-dict-pill",children:[n("span",{className:"ps-dict-pill-text",children:i}),n("button",{type:"button",className:"ps-dict-pill-remove",onClick:()=>o(i),"aria-label":`Remove ${i}`,title:`Remove ${i}`,children:"\xD7"})]},i))}):n("span",{className:"ps-dict-empty",children:"No terms added yet. Type a term above or paste a comma-separated list."})}),a("div",{className:"ps-dict-footer",children:[a("span",{className:"ps-dict-count",children:[e.length===1?"1 term active":`${e.length} terms active`,t?` (max ${200})`:""]}),n("button",{type:"button",className:"ps-btn ps-dict-clear-btn",onClick:r,disabled:e.length===0,children:"Clear all"})]})]})}function Ss({label:e,help:t,value:o,resetSignal:r,onChange:i}){let[l,p]=g(""),s=F(()=>yn(o),[o]),d=s.length>=200;N(()=>{r>0&&p("")},[r]);let u=()=>{let b=l.trim();if(!b||d)return;let v=Do(s,b);p(""),v.length!==s.length&&i(xn(v))};return a("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-dictionary-input",className:"ps-field-label",children:e}),t&&n("small",{style:{color:"var(--ps-text-muted)"},children:t}),a("div",{className:"ps-dict-container",children:[a("div",{className:"ps-dict-input-row",children:[n("input",{id:"ps-dictionary-input",type:"text",className:"ps-dict-input",value:l,onChange:b=>p(b.target.value),onKeyDown:b=>{b.key==="Enter"&&(b.preventDefault(),u())},onPaste:b=>{let v=b.clipboardData?.getData("text");if(!v||!/[\r\n]/.test(v))return;b.preventDefault();let y=b.currentTarget.selectionStart??l.length,S=b.currentTarget.selectionEnd??l.length;p(l.slice(0,y)+v.replace(/[\r\n]+/g,", ")+l.slice(S))},placeholder:"Type a term and press Enter (or paste comma-separated)...",disabled:d}),n("button",{type:"button",className:"ps-btn ps-btn-primary ps-dict-add-btn",onClick:u,disabled:!l.trim()||d,children:"+ Add"})]}),n(xs,{terms:s,atLimit:d,onRemove:b=>i(xn(s.filter(v=>v!==b))),onClearAll:()=>{p(""),i("")}})]})]})}function ws({field:e,values:t,resetSignal:o,onSave:r}){if(e.key==="dictionary")return n(Ss,{label:e.label,help:e.help,value:t.dictionary??"",resetSignal:o,onChange:p=>r({dictionary:p})});let i=t[e.key]??wn[e.key]??"",l=e.options&&e.key==="inputLanguage"&&i&&!e.options.includes(i)?[...e.options,i]:e.options;return a("label",{className:"ps-field-group",children:[n("span",{className:"ps-field-label",children:e.label}),l?n("select",{className:"ps-select",value:i,onChange:p=>r({[e.key]:p.target.value}),children:l.map(p=>n("option",{value:p,children:ls[p]??p},p))}):e.multiline?n("textarea",{className:"ps-custom-prompt-input",value:t[e.key]??"",onChange:p=>r({[e.key]:p.target.value})}):n("input",{type:e.secret?"password":"text",className:"ps-select",value:t[e.key]??"",onChange:p=>r({[e.key]:p.target.value}),placeholder:e.secret?"Enter API key\u2026":void 0}),e.help&&n("small",{style:{color:"var(--ps-text-muted)"},children:e.help})]})}function Go({rpc:e,onBack:t,pluginId:o}){ee();let[r,i]=g({}),[l,p]=g("Loading\u2026"),[s,d]=g(null),[u,m]=g(0),b=I(0),v=I({}),y=I(e);y.current=e,N(()=>{let h=!0;return y.current.call(ye).then(T=>{if(!h)return;let x=T||{};v.current=x,i(x),me(x),p("Saved")}).catch(()=>{h&&p("Could not load settings")}),()=>{h=!1}},[]);let S=h=>{let T=++b.current,x=v.current={...v.current,...h};i(x),me(x),p("Saving\u2026"),y.current.call(xe,x).then(()=>{T===b.current&&(d(null),p("Saved"))}).catch(()=>{T===b.current&&(d(x),p("Could not save settings."))})};return n("div",{className:"ps-workspace",children:n("main",{className:"ps-editor-canvas",style:{overflowY:"auto"},children:a("div",{style:{width:"100%",maxWidth:760,margin:"0 auto",display:"flex",flexDirection:"column",gap:12},children:[a("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12},children:[a("div",{children:[n("h1",{style:{fontSize:18,margin:"4px 0"},children:"Settings"}),n("span",{style:{color:"var(--ps-text-muted)",fontSize:12},children:"Configure voice and cleanup defaults"})]}),n("button",{className:"ps-btn",onClick:t,children:"\u2190 Back to Studio"})]}),a("div",{style:{color:"var(--ps-text-muted)",fontSize:11},children:[n("span",{role:"status",children:l}),s&&n("button",{className:"ps-btn",onClick:()=>S(s),children:"Retry"})]}),n(us,{values:r,onSave:S}),n(ys,{rpc:e,values:r,onSave:S}),Object.entries(as).map(([h,T])=>a(Kn.Fragment,{children:[a("section",{className:"ps-pane",style:{flex:"none"},children:[a("div",{className:"ps-pane-header",children:[n("h2",{className:"ps-pane-title",style:{margin:0},children:h}),h!=="Connections"&&n("button",{className:"ps-btn",onClick:()=>{h==="Voice & transcription"&&m(x=>x+1),S(Object.fromEntries(T.map(x=>[x.key,wn[x.key]??""])))},children:"Reset"})]}),a("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[h==="Connections"&&n("p",{children:"Manage API keys in Zana\u2019s Prompt Voice plugin settings."}),T.filter(x=>!(x.key==="customPrompt"&&r.tone!=="custom")).map(x=>n(ws,{field:x,values:r,resetSignal:u,onSave:S},x.key))]})]}),h==="Voice & transcription"&&n(ko,{rpc:e,sttProvider:r.sttProvider??wn.sttProvider,llmProvider:r.llmProvider,onApplyPreset:S})]},h)),o?n("section",{className:"ps-pane",style:{flex:"none",padding:14},children:n(Mt,{pluginId:o})}):null]})})})}async function Ze(e){if(!e)return!1;if(typeof navigator<"u"&&navigator.clipboard&&typeof navigator.clipboard.writeText=="function")try{return await navigator.clipboard.writeText(e),!0}catch{}if(typeof document<"u"){let t=document.createElement("textarea");t.value=e,t.setAttribute("readonly",""),t.style.position="fixed",t.style.top="-9999px",t.style.left="-9999px",t.style.opacity="0";try{if(document.body.appendChild(t),t.focus(),t.select(),document.execCommand("copy"))return!0}catch{}finally{t.parentNode&&t.parentNode.removeChild(t)}}return!1}var Ts={improve:"Improve writing",executive:"Summarize",spec:"Technical spec",custom:"Custom",translate:"Translate"},Is={standard:"Standard",casual:"Casual",conversational:"Conversational",formal:"Professional",technical:"Technical",custom:"Custom"},Ot={composer:"Composer",home:"Home",studio:"Prompt Studio"},Tn={system:"Zana Voice","local-whisper":"Local Whisper","google-gemini":"Google Gemini",google:"Google Gemini",openai:"OpenAI",anthropic:"Anthropic",assistant:"Zana Assistant"};function Wo(e){if(e.presetId==="translate"||e.targetLanguage){let r=e.targetLanguage?qe(e.targetLanguage)?.label??e.targetLanguage:null;return r?`Translate \xB7 ${r}`:"Translate"}let t=e.presetId?Ts[e.presetId]:null,o=e.tone?Is[e.tone]??e.tone:null;return t==="Improve writing"&&o?`Improve \xB7 ${o}`:t||(o?`Refinement \xB7 ${o}`:"Refinement")}function Ht(e){return e.kind==="dictation"?"Dictation":e.kind==="dictation_cleanup"?e.presetId||e.targetLanguage?`Dictation + ${Wo(e)}`:"Dictation + Cleanup":Wo(e)}function Vt(e){if(e===null||!Number.isFinite(e)||e<0)return null;if(e<1e3)return`${Math.round(e)}ms`;let t=Math.round(e/1e3);if(t<60)return`${t}s`;let o=Math.floor(t/60),r=t%60;return`${o}m ${String(r).padStart(2,"0")}s`}function Yo(e,t=Date.now()){let o=Math.max(0,Math.floor((t-e)/1e3));if(o<60)return"Just now";let r=Math.floor(o/60);if(r<60)return`${r}m ago`;let i=Math.floor(r/60);if(i<24)return`${i}h ago`;try{return new Date(e).toLocaleDateString(void 0,{month:"short",day:"numeric"})}catch{return`${Math.floor(i/24)}d ago`}}function qo(e){try{return new Date(e).toLocaleString(void 0,{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}catch{return String(e)}}function Zo(e,t=Date.now()){let o=new Date(t);o.setHours(0,0,0,0);let r=new Date(o.getTime()-864e5),i={Today:[],Yesterday:[],Earlier:[]};for(let l of e)l.createdAt>=o.getTime()?i.Today.push(l):l.createdAt>=r.getTime()?i.Yesterday.push(l):i.Earlier.push(l);return["Today","Yesterday","Earlier"].filter(l=>i[l].length>0).map(l=>({label:l,entries:i[l]}))}function In(e){let t=e.trim();return`${t?t.split(/\s+/).length:0} words \xB7 ${e.length} chars`}function Ko(e){return e?e.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]+/gu)||[]:[]}var Xo=1200;function jt(e,t){if(!e&&!t)return[];if(e===t)return[{type:"unchanged",text:e}];if(!e)return[{type:"added",text:t}];if(!t)return[{type:"removed",text:e}];let o=Ko(e),r=Ko(t),i=o.length,l=r.length;if(i>Xo||l>Xo)return[{type:"removed",text:e},{type:"added",text:t}];let p=l+1,s=new Uint32Array((i+1)*p);for(let v=1;v<=i;v++){let y=v*p,S=(v-1)*p,h=o[v-1];for(let T=1;T<=l;T++)if(h===r[T-1])s[y+T]=s[S+(T-1)]+1;else{let x=s[y+(T-1)],_=s[S+T];s[y+T]=x>_?x:_}}let d=[],u=i,m=l;for(;u>0||m>0;){let v=u*p,y=(u-1)*p;u>0&&m>0&&o[u-1]===r[m-1]?(d.push({type:"unchanged",text:o[u-1]}),u--,m--):m>0&&(u===0||s[v+(m-1)]>=s[y+m])?(d.push({type:"added",text:r[m-1]}),m--):u>0&&(m===0||s[v+(m-1)]<s[y+m])&&(d.push({type:"removed",text:o[u-1]}),u--)}d.reverse();let b=[];for(let v of d)b.length>0&&b[b.length-1].type===v.type?b[b.length-1].text+=v.text:b.push({...v});return b}function Cs({entry:e,projectName:t,onOpenThread:o}){let r=Vt(e.audioDurationMs),i=Vt(e.processingDurationMs);return a(Y,{children:[a("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"},children:[a("div",{className:"ps-history-meta-row",children:[n("span",{className:`ps-kind-badge ps-kind-${e.kind}`,children:Ht(e)}),n("span",{className:"ps-source-badge",children:Ot[e.source]??e.source}),t?n("span",{className:"ps-badge ps-badge-project",children:t}):null,n("span",{children:qo(e.createdAt)})]}),e.threadId&&o?n("button",{type:"button",className:"ps-btn",style:{padding:"4px 9px",fontSize:11},onClick:()=>o(e.threadId),children:"Open thread"}):null]}),a("div",{className:"ps-history-meta-row",children:[e.sttProvider?a("span",{className:"ps-pill",children:["STT: ",Tn[e.sttProvider]??e.sttProvider,e.sttModel?` (${e.sttModel})`:""]}):null,e.llmProvider?a("span",{className:"ps-pill",children:["LLM: ",Tn[e.llmProvider]??e.llmProvider,e.llmModel?` (${e.llmModel})`:""]}):null,r?a("span",{className:"ps-pill",children:["Recorded: ",r]}):null,i?a("span",{className:"ps-pill",children:["Processed: ",i]}):null]})]})}function Es({entry:e,primaryText:t,hasDistinctOutput:o,showDiff:r,copiedTarget:i,onToggleDiff:l,onCopyText:p,onLoadIntoStudio:s,onInsertIntoComposer:d,onToggleStar:u,onDelete:m}){return a("div",{className:"ps-history-actions-bar",children:[n("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:()=>s(e),children:"Load into Studio"}),n("button",{type:"button",className:"ps-btn",onClick:()=>d(t),children:"Insert into Composer"}),n("button",{type:"button",className:"ps-btn",onClick:()=>p(t,"output"),children:i==="output"?"Copied":o?"Copy Output":"Copy"}),o?a(Y,{children:[n("button",{type:"button",className:"ps-btn",onClick:()=>p(e.rawText,"raw"),children:i==="raw"?"Copied Raw":"Copy Raw"}),n("button",{type:"button",className:"ps-btn","aria-pressed":r,onClick:l,children:r?"View Clean":"View Diff"})]}):null,a("button",{type:"button",className:"ps-btn","aria-pressed":e.starred,onClick:()=>u(e),children:[n("span",{className:e.starred?"ps-star-active":void 0,children:e.starred?"\u2605":"\u2606"}),n("span",{children:e.starred?"Starred":"Star"})]}),n("button",{type:"button",className:"ps-btn ps-btn-danger",style:{marginLeft:"auto"},onClick:()=>m(e),children:"Delete"})]})}function Rs({rawText:e,outputText:t}){let o=F(()=>jt(e,t),[t,e]);return a("div",{className:"ps-history-text-card",children:[n("div",{className:"ps-pane-header",children:n("span",{className:"ps-pane-title",children:"Word Diff (Raw \u2192 Refined)"})}),n("div",{className:"ps-history-text-body","data-testid":"history-diff-view",children:o.map((r,i)=>n("span",{className:r.type==="added"?"ps-diff-added":r.type==="removed"?"ps-diff-removed":"ps-diff-unchanged",children:r.text},i))})]})}function As({entry:e,hasDistinctOutput:t}){let o=e.kind==="refinement"?"Original Input":t?"Raw Transcript":"Transcript";return a(Y,{children:[t?a("div",{className:"ps-history-text-card",children:[a("div",{className:"ps-pane-header",children:[n("span",{className:"ps-pane-title",children:"Refined Output"}),n("span",{style:{fontSize:11,color:"var(--ps-text-subtle)"},children:In(e.outputText)})]}),n("div",{className:"ps-history-text-body",children:e.outputText})]}):null,a("div",{className:"ps-history-text-card",children:[a("div",{className:"ps-pane-header",children:[n("span",{className:"ps-pane-title",children:o}),n("span",{style:{fontSize:11,color:"var(--ps-text-subtle)"},children:In(e.rawText)})]}),n("div",{className:"ps-history-text-body",children:e.rawText})]})]})}function Jo({entry:e,projectName:t,showDiff:o,onToggleDiff:r,onCopyText:i,onLoadIntoStudio:l,onInsertIntoComposer:p,onToggleStar:s,onDelete:d,onOpenThread:u,copiedTarget:m}){let b=e.rawText!==e.outputText,v=e.outputText||e.rawText;return a("section",{className:"ps-history-detail-pane","aria-label":"Activity details",children:[a("div",{className:"ps-history-detail-header",children:[n(Cs,{entry:e,projectName:t,onOpenThread:u}),n(Es,{entry:e,primaryText:v,hasDistinctOutput:b,showDiff:o,copiedTarget:m,onToggleDiff:r,onCopyText:i,onLoadIntoStudio:l,onInsertIntoComposer:p,onToggleStar:s,onDelete:d})]}),e.refineNotice?a("div",{role:"status",style:{padding:"8px 12px",borderRadius:6,background:"rgba(234, 179, 8, 0.1)",border:"1px solid rgba(234, 179, 8, 0.3)",color:"#fde047",fontSize:12},children:["Cleanup fallback: ",e.refineNotice.message]}):null,e.customPrompt?a("div",{className:"ps-history-text-card",children:[n("div",{className:"ps-pane-header",children:n("span",{className:"ps-pane-title",children:"Custom Instructions"})}),n("div",{className:"ps-history-text-body",style:{fontSize:12,color:"var(--ps-text-muted)"},children:e.customPrompt})]}):null,o&&b?n(Rs,{rawText:e.rawText,outputText:e.outputText}):n(As,{entry:e,hasDistinctOutput:b})]})}var Ps=50,ks=180;function Ns(e){let[t,o]=g(""),[r,i]=g(""),[l,p]=g("all"),[s,d]=g("all"),[u,m]=g(!1),[b,v]=g(e?"project":"all"),[y,S]=g("");N(()=>{v(e?"project":"all"),S("")},[e]),N(()=>{let _=setTimeout(()=>i(t.trim()),ks);return()=>clearTimeout(_)},[t]);let h=e?b==="project"?e:null:y||null,T=!!(r||l!=="all"||s!=="all"||u||y),x=R(()=>{o(""),i(""),p("all"),d("all"),m(!1),S("")},[]);return{searchInput:t,setSearchInput:o,debouncedQuery:r,typeFilter:l,setTypeFilter:p,sourceFilter:s,setSourceFilter:d,starredOnly:u,setStarredOnly:m,scopeMode:b,setScopeMode:v,selectedProjectFilter:y,setSelectedProjectFilter:S,effectiveProjectId:h,hasActiveFilters:T,resetFilters:x}}function Ds({rpcRef:e,starredOnly:t,projectId:o,scopeMode:r,setEntries:i,setTotal:l,refresh:p,onStatusNotice:s}){let[d,u]=g(!1),m=R(async y=>{try{let S=await e.current.call(to,{id:y.id,starred:!y.starred});if(!S?.ok||!S.entry)return;t&&!S.entry.starred?(i(h=>h.filter(T=>T.id!==y.id)),l(h=>Math.max(0,h-1))):i(h=>h.map(T=>T.id===y.id?S.entry:T))}catch{s?.("Could not update star status.")}},[s,e,i,l,t]),b=R(async y=>{try{let S=await e.current.call(no,{id:y.id});S?.ok&&S.deleted&&(i(h=>h.filter(T=>T.id!==y.id)),l(h=>Math.max(0,h-1)),s?.("History entry deleted."))}catch{s?.("Could not delete history entry.")}},[s,e,i,l]),v=R(async y=>{u(!0);try{let S=o&&r==="project"?o:null,h=await e.current.call(Rt,{projectId:S,includeStarred:y});h?.ok&&(s?.(h.deletedCount===0?"No matching entries were cleared.":`Cleared ${h.deletedCount} history ${h.deletedCount===1?"entry":"entries"}.`),await p())}catch{s?.("Could not clear history.")}finally{u(!1)}},[s,o,p,e,r]);return{clearing:d,toggleStar:m,deleteEntry:b,clearHistory:v}}function _s(e,t){let[o,r]=g([]),[i,l]=g(0),[p,s]=g(!1),[d,u]=g(!0),[m,b]=g(!0),[v,y]=g(!0),[S,h]=g(!1),[T,x]=g(null),_=I(0),X=R(async(O={})=>{let U=++_.current,k=O.append===!0;k?h(!0):y(!0),x(null);try{let H=await e.current.call(eo,{query:t.query||void 0,type:t.type,source:t.source,projectId:t.projectId,starredOnly:t.starredOnly,limit:Ps,offset:O.offset??0});if(_.current!==U)return;let C=Array.isArray(H?.entries)?H.entries:[];r($=>k?[...$,...C]:C),l(typeof H?.total=="number"?H.total:C.length),s(!!H?.hasMore),u(H?.historyEnabled!==!1),b(H?.storageAvailable!==!1)}catch(H){if(_.current!==U)return;x(H instanceof Error?H.message:"Could not load activity history.")}finally{_.current===U&&(y(!1),h(!1))}},[t.projectId,t.query,t.source,t.starredOnly,t.type,e]);return{entries:o,setEntries:r,total:i,setTotal:l,hasMore:p,historyEnabled:d,storageAvailable:m,loading:v,loadingMore:S,error:T,fetchEntries:X}}function Qo({rpc:e,projectId:t,onStatusNotice:o}){let r=I(e);r.current=e;let i=Ns(t),[l,p]=g([]),[s,d]=g(null),u=_s(r,{query:i.debouncedQuery,type:i.typeFilter,source:i.sourceFilter,projectId:i.effectiveProjectId,starredOnly:i.starredOnly}),m=R(()=>{r.current.call(oo).then(h=>{h&&Array.isArray(h.projects)&&p(h.projects)}).catch(()=>{})},[]),b=R(()=>u.fetchEntries({offset:0,append:!1}),[u.fetchEntries]);N(()=>{b()},[b]),N(()=>{m()},[m]),lt(so,()=>{b(),m()});let v=Ds({rpcRef:r,starredOnly:i.starredOnly,projectId:t,scopeMode:i.scopeMode,setEntries:u.setEntries,setTotal:u.setTotal,refresh:b,onStatusNotice:o}),y=F(()=>u.entries.length===0?null:u.entries.find(h=>h.id===s)??u.entries[0],[u.entries,s]),S=F(()=>new Map(l.map(h=>[h.id,h.name])),[l]);return{...i,...u,...v,projects:l,projectNameById:S,selectedEntry:y,setSelectedId:d}}var Ms=`
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
`;function Ls({projectId:e,scopeMode:t,onScopeModeChange:o,selectedProjectFilter:r,onSelectedProjectFilterChange:i,projects:l}){return e?a("div",{className:"ps-segmented",role:"group","aria-label":"Project scope",children:[n("button",{type:"button",className:`ps-segmented-btn ${t==="project"?"active":""}`,"aria-pressed":t==="project",onClick:()=>o("project"),children:"This project"}),n("button",{type:"button",className:`ps-segmented-btn ${t==="all"?"active":""}`,"aria-pressed":t==="all",onClick:()=>o("all"),children:"All activity"})]}):l.length===0?null:a("select",{className:"ps-select",style:{width:"auto",minWidth:130},"aria-label":"Filter by project",value:r,onChange:p=>i(p.target.value),children:[n("option",{value:"",children:"All projects"}),l.map(p=>n("option",{value:p.id,children:p.name},p.id))]})}function Os({search:e,onSearchChange:t,typeFilter:o,onTypeFilterChange:r,sourceFilter:i,onSourceFilterChange:l,starredOnly:p,onStarredToggle:s,projectId:d,scopeMode:u,onScopeModeChange:m,selectedProjectFilter:b,onSelectedProjectFilterChange:v,projects:y,total:S,onRequestClear:h}){let T=d&&u==="project"?"Clear project history":"Clear all";return a("div",{className:"ps-history-toolbar",children:[a("div",{className:"ps-history-search-wrap",children:[n("input",{type:"search",className:"ps-history-search","aria-label":"Search history",placeholder:"Search dictations & refinements\u2026",value:e,onChange:x=>t(x.target.value)}),e?n("button",{type:"button",className:"ps-history-search-clear","aria-label":"Clear search",onClick:()=>t(""),children:"\xD7"}):null]}),n("div",{className:"ps-segmented",role:"group","aria-label":"Activity type filter",children:[{id:"all",label:"All"},{id:"dictation",label:"Dictations"},{id:"refinement",label:"Refinements"}].map(x=>n("button",{type:"button",className:`ps-segmented-btn ${o===x.id?"active":""}`,"aria-pressed":o===x.id,onClick:()=>r(x.id),children:x.label},x.id))}),a("select",{className:"ps-select",style:{width:"auto",minWidth:120},"aria-label":"Filter by source",value:i,onChange:x=>l(x.target.value),children:[n("option",{value:"all",children:"All sources"}),n("option",{value:"composer",children:"Composer"}),n("option",{value:"home",children:"Home"}),n("option",{value:"studio",children:"Prompt Studio"})]}),n(Ls,{projectId:d,scopeMode:u,onScopeModeChange:m,selectedProjectFilter:b,onSelectedProjectFilterChange:v,projects:y}),a("button",{type:"button",className:`ps-btn ${p?"ps-btn-primary":""}`,"aria-pressed":p,onClick:s,children:[n("span",{children:p?"\u2605":"\u2606"}),n("span",{children:"Starred"})]}),a("div",{style:{marginLeft:"auto",display:"flex",alignItems:"center",gap:8},children:[n("span",{style:{fontSize:11,color:"var(--ps-text-subtle)"},children:S===1?"1 entry":`${S} entries`}),n("button",{type:"button",className:"ps-btn ps-btn-danger",disabled:S===0,onClick:h,children:T})]})]})}function Hs({onOpenSettings:e}){return a("div",{className:"ps-history-banner",role:"status",children:[n("span",{children:"History recording is paused. New dictations and refinements will not be saved."}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 9px",fontSize:11},onClick:e,children:"Open Settings"})]})}function Vs({projectScoped:e,includeStarred:t,clearing:o,onIncludeStarredChange:r,onCancel:i,onConfirm:l}){return a("div",{className:"ps-history-confirm-bar",role:"alertdialog","aria-label":"Confirm clear history",children:[a("div",{style:{display:"flex",flexDirection:"column",gap:4},children:[n("strong",{children:e?"Clear history for this project?":"Clear all activity history?"}),a("label",{style:{display:"inline-flex",alignItems:"center",gap:6,fontSize:11.5,cursor:"pointer"},children:[n("input",{type:"checkbox",checked:t,onChange:p=>r(p.target.checked)}),n("span",{children:"Also delete starred entries"})]})]}),a("div",{style:{display:"flex",gap:6},children:[n("button",{type:"button",className:"ps-btn",disabled:o,onClick:i,children:"Cancel"}),n("button",{type:"button",className:"ps-btn ps-btn-danger",disabled:o,onClick:l,children:o?"Clearing\u2026":"Confirm Clear"})]})]})}function js({storageAvailable:e,error:t,loading:o,hasActiveFilters:r,onRetry:i,onResetFilters:l}){return e?t?n("div",{className:"ps-empty-state",children:a("div",{className:"ps-empty-card",role:"alert",children:[n("div",{style:{fontSize:14,fontWeight:600},children:"Could not load history"}),n("div",{style:{fontSize:12,color:"var(--ps-text-muted)"},children:t}),n("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:i,children:"Retry"})]})}):o?n("div",{className:"ps-empty-state",children:n("span",{style:{fontSize:12,color:"var(--ps-text-muted)"},children:"Loading activity history\u2026"})}):n("div",{className:"ps-empty-state",children:a("div",{className:"ps-empty-card",children:[n("div",{style:{fontSize:14,fontWeight:600},children:r?"No matching history entries":"No activity recorded yet"}),n("div",{style:{fontSize:12,color:"var(--ps-text-muted)",lineHeight:1.45},children:r?"Try clearing your search or adjusting filters to see more entries.":"Dictate from any composer, the Home card, or Prompt Studio \u2014 or refine text in Studio \u2014 and it will appear here automatically."}),r?n("button",{type:"button",className:"ps-btn",onClick:l,children:"Reset filters"}):null]})}):n("div",{className:"ps-empty-state",children:a("div",{className:"ps-empty-card",children:[n("div",{style:{fontSize:14,fontWeight:600},children:"History storage is unavailable"}),n("div",{style:{fontSize:12,color:"var(--ps-text-muted)"},children:"Prompt Voice needs host database storage to save and browse dictation history."})]})})}function Fs({entry:e,isSelected:t,projectName:o,onSelect:r}){let i=(e.outputText||e.rawText).trim();return a("button",{type:"button",className:`ps-history-row ${t?"selected":""}`,"aria-current":t?"true":void 0,onClick:r,children:[a("div",{className:"ps-history-row-top",children:[a("div",{className:"ps-history-row-badges",children:[n("span",{className:`ps-kind-badge ps-kind-${e.kind}`,children:Ht(e)}),n("span",{className:"ps-source-badge",children:Ot[e.source]??e.source})]}),e.starred?n("span",{className:"ps-star-active","aria-label":"Starred",children:"\u2605"}):null]}),n("div",{className:"ps-history-snippet",children:i}),a("div",{className:"ps-history-row-meta",children:[n("span",{children:Yo(e.createdAt)}),o?n("span",{children:o}):null]})]})}function zs({entries:e,selectedId:t,projectNameById:o,scopeMode:r,hasMore:i,loadingMore:l,onSelect:p,onLoadMore:s}){let d=F(()=>Zo(e),[e]);return a("aside",{className:"ps-history-list-pane","aria-label":"Activity history list",children:[d.map(u=>a("div",{children:[n("div",{className:"ps-history-group-header",children:u.label}),u.entries.map(m=>{let b=r==="all"&&m.projectId?o.get(m.projectId)??m.projectId:null;return n(Fs,{entry:m,isSelected:t===m.id,projectName:b,onSelect:()=>p(m.id)},m.id)})]},u.label)),i?n("div",{style:{padding:12,textAlign:"center"},children:n("button",{type:"button",className:"ps-btn",disabled:l,onClick:s,children:l?"Loading\u2026":"Load more"})}):null]})}function er({rpc:e,projectId:t,onLoadIntoStudio:o,onInsertIntoComposer:r,onOpenSettings:i,onStatusNotice:l}){let p=$e(),s=Qo({rpc:e,projectId:t,onStatusNotice:l}),[d,u]=g(!1),[m,b]=g(null),[v,y]=g(!1),[S,h]=g(!1);N(()=>{u(!1),b(null)},[s.selectedEntry?.id]);let T=async(O,U)=>{if(!await Ze(O)){l?.("Failed to copy to clipboard.");return}b(U),setTimeout(()=>b(H=>H===U?null:H),2e3),l?.(U==="raw"?"Raw text copied to clipboard.":"Text copied to clipboard.")},x=async()=>{let O=S;y(!1),h(!1),await s.clearHistory(O)},_=!s.storageAvailable||!!s.error||s.loading||s.entries.length===0,X=s.selectedEntry?.projectId?s.projectNameById.get(s.selectedEntry.projectId)??s.selectedEntry.projectId:null;return a("div",{className:"ps-history-shell","data-testid":"ps-history-view",children:[n("style",{children:Ms}),s.historyEnabled?null:n(Hs,{onOpenSettings:i}),n(Os,{search:s.searchInput,onSearchChange:s.setSearchInput,typeFilter:s.typeFilter,onTypeFilterChange:s.setTypeFilter,sourceFilter:s.sourceFilter,onSourceFilterChange:s.setSourceFilter,starredOnly:s.starredOnly,onStarredToggle:()=>s.setStarredOnly(O=>!O),projectId:t,scopeMode:s.scopeMode,onScopeModeChange:s.setScopeMode,selectedProjectFilter:s.selectedProjectFilter,onSelectedProjectFilterChange:s.setSelectedProjectFilter,projects:s.projects,total:s.total,onRequestClear:()=>{h(!1),y(!0)}}),v?n(Vs,{projectScoped:!!(t&&s.scopeMode==="project"),includeStarred:S,clearing:s.clearing,onIncludeStarredChange:h,onCancel:()=>y(!1),onConfirm:()=>void x()}):null,_?n(js,{storageAvailable:s.storageAvailable,error:s.error,loading:s.loading,hasActiveFilters:s.hasActiveFilters,onRetry:()=>void s.fetchEntries(),onResetFilters:s.resetFilters}):a("div",{className:"ps-history-split",children:[n(zs,{entries:s.entries,selectedId:s.selectedEntry?.id??null,projectNameById:s.projectNameById,scopeMode:s.scopeMode,hasMore:s.hasMore,loadingMore:s.loadingMore,onSelect:s.setSelectedId,onLoadMore:()=>void s.fetchEntries({offset:s.entries.length,append:!0})}),s.selectedEntry?n(Jo,{entry:s.selectedEntry,projectName:X,showDiff:d,onToggleDiff:()=>u(O=>!O),onCopyText:(O,U)=>void T(O,U),onLoadIntoStudio:o,onInsertIntoComposer:r,onToggleStar:O=>void s.toggleStar(O),onDelete:O=>void s.deleteEntry(O),onOpenThread:typeof p?.toThread=="function"?O=>p.toThread(O):void 0,copiedTarget:m}):null]})]})}function tr(e){let o=`${e.id} ${e.label??""}`.toLowerCase().replace(/[_/]+/g," ");return/(?:^|[:\s-])free(?=$|[\s)\]])/.test(o)||/\bollama\b|\b:local\b/.test(o)?0:/\bnano\b/.test(o)?10:/\bflash[- ]?lite\b/.test(o)?12:/\bo[134][- ]mini\b/.test(o)?42:/\bmini\b/.test(o)?20:/\bspark\b/.test(o)?22:/\bflash\b/.test(o)?25:/\b(?:lite|light|micro|tiny|small|instant)\b/.test(o)?28:/\bhaiku\b/.test(o)?35:/\bopus\b/.test(o)?95:/\b(?:codex[- ]max|ultra|heavy|max)\b/.test(o)||/\b(?:gpt|o[134])[a-z0-9.-]*[- ]pro\b/.test(o)?85:/\bsonnet\b/.test(o)?70:/\b(?:o1|o3|o4)\b/.test(o)?75:/\bpro\b/.test(o)?65:/\bcodex\b/.test(o)?62:/\bgpt[- ]?\d/.test(o)?60:/\bdeepseek[- ]?(?:r1|reasoner)\b/.test(o)?42:/\b(?:deepseek|llama|qwen|gemma|mistral)\b/.test(o)?32:50}function Us(e,t){let o=tr(e)-tr(t);return o!==0?o:(e.label||e.id).localeCompare(t.label||t.id,void 0,{sensitivity:"base",numeric:!0})}function Cn(e){return[...e].sort(Us)}var En=`
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
`,nr="zcc:prompt-voice:studio-draft:v1";function $s(e){return e?`${nr}:project:${e}`:nr}var pt=[{id:"standard",label:"Standard",desc:"Fix grammar & clarity while keeping your natural tone and length."},{id:"casual",label:"Casual",desc:"Relaxed, everyday phrasing \u2014 natural without sounding stiff."},{id:"conversational",label:"Conversational",desc:"Warm, natural, and easy to read \u2014 like speaking clearly."},{id:"formal",label:"Professional",desc:"Polished, respectful phrasing for emails, PRs, or stakeholders."},{id:"technical",label:"Technical",desc:"Precise, unambiguous engineering phrasing without fluff."}],P={improve:"improve",executive:"executive",spec:"spec",custom:"custom",translate:"translate"},or=new Set(Object.values(P)),Rn=[{id:P.improve,title:"Improve writing",icon:"\u2728",desc:"Fix grammar, phrasing & punctuation without extending length.",tone:"standard"},{id:P.executive,title:"Summarize",icon:"\u26A1",desc:"Condense into punchy bullet points.",instruction:"Summarize the core request into crisp, high-level executive bullet points.",tone:"formal"},{id:P.spec,title:"Create a technical spec",icon:"\u{1F4D0}",desc:"Format with Goals, Context, Steps.",instruction:"Transform into a structured technical spec with ## Goal, ## Architecture, and ## Implementation Steps.",tone:"technical"}];function Bs(e,t){switch(e){case P.improve:return t?"Improving...":"Improve text";case P.executive:return t?"Summarizing...":"Summarize";case P.spec:return t?"Creating spec...":"Create spec";case P.custom:return t?"Running...":"Run instructions";case P.translate:return t?"Translating...":"Translate";default:return t?"Transforming...":"Transform text"}}function Gs(e,t,o){switch(e){case P.improve:return`\u2B07 Improve writing \xB7 ${t}`;case P.translate:return`\u2B07 Translate \xB7 ${qe(o)?.label??o}`;case P.custom:return"\u2B07 Custom instructions";default:return`\u2B07 ${Rn.find(r=>r.id===e)?.title??"Refine pipeline"}`}}var Ws={system:"Host STT",openai:"OpenAI","google-gemini":"Google Gemini","local-whisper":"Local Whisper"};function rr(e){return e==="openai"||e==="google-gemini"}var Ys=[{id:"google-gemini",label:"Google Gemini"},{id:"local-whisper",label:"Local Whisper (on this device)"},{id:"openai",label:"OpenAI (Whisper)"},{id:"system",label:"System (Zana Voice)"}],qs=[{id:"assistant",displayName:"Zana Assistant",models:[{id:"assistant",key:"assistant",label:"Default Assistant (Host Agent)",providerId:"assistant"}]}],ir=[1500,3e3];function sr({focusWindow:e,bringBack:t}){return ee(),a("div",{className:"ps-container","data-testid":"ps-detached-placeholder",children:[n("style",{children:En}),n("div",{className:"ps-empty-state",children:a("div",{className:"ps-empty-card",children:[n("span",{style:{fontSize:22},"aria-hidden":"true",children:"\u{1F399}\uFE0F"}),n("div",{style:{fontSize:14,fontWeight:600},children:"Prompt Studio is open in its own window"}),n("div",{style:{fontSize:12,color:"var(--ps-text-muted)"},children:"Focus the floating window or bring Prompt Studio back to this project tab."}),a("div",{style:{display:"flex",gap:8,marginTop:4},children:[n("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:e,children:"Focus Window"}),n("button",{type:"button",className:"ps-btn",onClick:t,children:"Bring Back"})]})]})})]})}function Zs(e){let t=co();return t||(e&&e.replace(/^\/+/,"").toLowerCase()===Se?"history":"studio")}function An({pluginId:e,projectId:t,subPath:o,headerActions:r,startSession:i=fe}){ee();let[l,p]=g(()=>Zs(o)),[s,d]=g(!1),[u,m]=g(null),b=kt(e),v=ho(),y=Ue(),S=$e(),h=we(),T=y?.providerId,x=y?.familyId,_=$s(t),X=I(!1),[O,U]=g(null),[k,H]=g(""),[C,$]=g(""),[dt,Ft]=g(null),pe=I(null),ne=R(c=>{pe.current=c,Ft(c)},[]),[Ie,Ne]=g(!1),[zt,q]=g(!1),[G,de]=g(!1),[Ke,ge]=g(null),[ut,Pn]=g(!1),[kn,Nn]=g(null),[De,Dn]=g(null),[mt,ft]=g(!0),[_n,Ut]=g(null),[_e,Me]=g("assistant"),[Xe,Le]=g("assistant"),[Ce,Mn]=g(null),[Ks,gt]=g(null),[Je,Ln]=g(!0),[On,ar]=g(null),[Qe,bt]=g(!1),[B,re]=g(P.improve),[et,be]=g("standard"),[tt,nt]=g(Ye),[vt,$t]=g(""),[ie,Hn]=g(!1),[Vn,A]=g(null),[J,ot]=g("system"),[Bt,ht]=g(""),[Gt,jn]=g(!0),[Wt,Ee]=g(null),[ce,Yt]=g(!1),[lr,Fn]=g(0),[cr,qt]=g(null),[zn,pr]=g(()=>ue()),Un=I(zn);Un.current=zn;let ve=I(null),yt=I(null),Oe=I(null),He=I(null),$n=I(null);N(()=>{o&&o.replace(/^\/+/,"").toLowerCase()===Se&&(d(!1),p("history"))},[o]),N(()=>po(c=>{d(!1),p(c)}),[]),N(()=>{try{let c=localStorage.getItem(_);if(c){let f=JSON.parse(c),w=typeof f.inputText=="string"?f.inputText:"",D=typeof f.outputText=="string"?f.outputText:"",E=(w.trim()||D.trim())&&typeof f.historyEntryId=="string"&&f.historyEntryId.trim()?f.historyEntryId.trim():null;H(w),$(D),ne(E),Me(f.selectedProviderId||"assistant"),Le(f.selectedModelId||"assistant"),X.current=f.userManuallySelected===!0,ot(f.sttProvider||"system"),ht(f.sttModel||""),f.selectedPresetId==="polish"?(re(P.improve),be("standard")):f.selectedPresetId==="chat"?(re(P.improve),be("conversational")):typeof f.selectedPresetId=="string"&&or.has(f.selectedPresetId)?re(f.selectedPresetId):re(P.improve),typeof f.selectedToneId=="string"&&pt.some(M=>M.id===f.selectedToneId)?be(f.selectedToneId):f.selectedPresetId!=="chat"&&be("standard"),nt(qe(f.targetLanguage)?.code??Ye)}else H(""),$(""),ne(null),Me("assistant"),Le("assistant"),ot("system"),ht(""),re(P.improve),be("standard"),nt(Ye),X.current=!1}catch{}U(_)},[_,ne]);let rt=I(b);rt.current=b;let oe=I(!0),Zt=I(0),xt=I(0),St=I(0),wt=I(null),Tt=R(c=>{c&&(c.llmProvider&&(gt(c.llmProvider),Ln(c.llmProvider!=="none")),c.sttProvider&&ot(c.sttProvider),typeof c.sttKeyConfigured=="boolean"&&jn(c.sttKeyConfigured))},[]),Kt=R(()=>{rt.current.call(Pe).then(c=>{oe.current&&Tt(c)}).catch(()=>{})},[Tt]);N(()=>{let c=!0;return rt.current.call(Pe).then(f=>{c&&Tt(f)}).catch(()=>{}),()=>{c=!1}},[Tt]);let It=R(c=>{pr(f=>f.micDeviceId===c.micDeviceId&&f.micLabel===c.micLabel&&f.soundCuesEnabled===c.soundCuesEnabled&&f.soundCuesVolume===c.soundCuesVolume?f:c)},[]),Ct=R(()=>{let c=++Zt.current;rt.current.call(ye).then(f=>{if(!oe.current||Zt.current!==c)return;let w=f||{};typeof w.sttProvider=="string"&&w.sttProvider&&ot(w.sttProvider),typeof w.sttModel=="string"&&w.sttModel&&ht(w.sttModel),typeof w.llmProvider=="string"&&w.llmProvider&&w.llmProvider!=="none"?Mn({providerId:w.llmProvider,modelId:typeof w.llmModel=="string"&&w.llmModel?w.llmModel:void 0}):w.llmProvider==="none"&&Mn(null),f&&typeof f=="object"&&It(me(w))}).catch(()=>{})},[It]),it=R(()=>{wt.current&&(clearTimeout(wt.current),wt.current=null)},[]),Ve=R((c={})=>{let f=c.refresh===!0,w=c.retryAttempt??0;it();let D=++St.current;ft(!0),(f||w===0)&&Ut(null);let E=()=>{if(!oe.current||w>=ir.length)return;let M=ir[w];wt.current=setTimeout(()=>{oe.current&&Ve({retryAttempt:w+1})},M)};rt.current.call(Qn,f?{refresh:!0}:void 0).then(M=>{if(!oe.current||St.current!==D)return;let j=Array.isArray(M)?M:[];Dn(j),ft(!1),!j.some(W=>W.providerId!=="assistant"&&Array.isArray(W.models)&&W.models.length>0)&&!f&&E()}).catch(()=>{!oe.current||St.current!==D||(ft(!1),Ut("Could not load Composer models. Using Zana Assistant."),E())})},[it]);lt(io,c=>{!oe.current||!Array.isArray(c)||(Dn(c),ft(!1),Ut(null),it())}),N(()=>(oe.current=!0,Ct(),Ve(),()=>{oe.current=!1,Zt.current++,xt.current++,St.current++,it()}),[it,Ve,Ct]);let dr=F(()=>(De??[]).some(c=>c.providerId!=="assistant"&&Array.isArray(c.models)&&c.models.length>0),[De]),se=F(()=>{let c=(E,M)=>[...E].sort((j,Q)=>M(j).localeCompare(M(Q),void 0,{sensitivity:"base",numeric:!0})),f=(De??[]).filter(E=>Array.isArray(E.models)&&E.models.length>0);if(f.length===0){let E=qs.map(M=>{let j=!!(T&&M.id.toLowerCase()===T.toLowerCase()||x&&M.id.toLowerCase().includes(x.toLowerCase())),Q=Cn(M.models).map(W=>({...W,isComposerMatch:j}));return{...M,isComposerMatch:j,models:Q}});return c(E,M=>M.displayName||M.id)}let w={"assistant:assistant":"assistant"},D=f.map(E=>{let M=!!(T&&E.providerId.toLowerCase()===T.toLowerCase()||x&&E.providerId.toLowerCase().includes(x.toLowerCase())),j=Cn(E.models).map(Q=>{let W=`${E.providerId}:${Q.id}`,_r=w[W]??Q.id;return{id:Q.id,key:_r,label:Q.label||Q.id,providerId:E.providerId,isComposerMatch:M}});return{id:E.providerId,displayName:E.displayName||E.providerId,isComposerMatch:M,error:E.error??null,models:j}});return c(D,E=>E.displayName||E.id)},[De,T,x]),Z=F(()=>se.find(c=>c.id===_e)??se[0],[se,_e]),Re=F(()=>Z?.models??[],[Z]),K=F(()=>Re.find(f=>f.id===Xe||f.key===Xe)??Re[0],[Re,Xe]);N(()=>{if(De===null||X.current||se.length===0)return;let c=se.find(f=>f.isComposerMatch&&f.models.length>0)??se.find(f=>f.isComposerMatch);if(c){Me(c.id),c.models.length>0&&Le(c.models[0].key||c.models[0].id);return}if(Ce&&Ce.providerId!=="assistant"){let f=se.find(w=>w.id===Ce.providerId&&w.models.length>0);if(f){Me(f.id);let D=(Ce.modelId?f.models.find(E=>E.id===Ce.modelId||E.key===Ce.modelId):void 0)??f.models[0];D&&Le(D.key||D.id)}}},[De,se,Ce]),N(()=>{O===_&&!k.trim()&&!C.trim()&&!ce&&!G&&!ie&&pe.current!==null&&ne(null)},[O,_,k,C,ce,G,ie,ne]),N(()=>{if(O===_)try{localStorage.setItem(_,JSON.stringify({inputText:k,outputText:C,historyEntryId:dt,selectedProviderId:_e,selectedModelId:Xe,userManuallySelected:X.current,sttProvider:J,sttModel:Bt,selectedPresetId:B,selectedToneId:et,targetLanguage:tt}))}catch{}},[O,_,k,C,dt,_e,Xe,J,Bt,B,et,tt]);let ur=c=>{Ln(c);let f=c?Z?.id??"assistant":"none",w=c?K?.id??"assistant":"";gt(f),b.call(xe,{llmProvider:f,llmModel:w}).catch(()=>{A("Could not update cleanup setting.")})},Xt=c=>{ot(c),Ee(null),b.call(xe,{sttProvider:c}).then(()=>Kt()).catch(()=>{A("Could not update speech provider setting.")})},mr=c=>{ht(c),b.call(xe,{sttModel:c}).catch(()=>{})},fr=c=>{X.current=!0,Me(c);let f=se.find(D=>D.id===c),w="";if(f&&f.models.length>0){let D=f.models[0].key||f.models[0].id;w=f.models[0].id,Le(D)}Je&&(gt(c),b.call(xe,{llmProvider:c,llmModel:w}).catch(()=>{}))},gr=c=>{X.current=!0;let f=_e,w=c;for(let D of se){let E=D.models.find(M=>M.id===c||M.key===c);if(E){D.id!==_e&&(Me(D.id),f=D.id),Le(E.key||E.id),w=E.id;break}}Je&&(gt(f),b.call(xe,{llmProvider:f,llmModel:w}).catch(()=>{}))};N(()=>()=>{Oe.current&&clearInterval(Oe.current),He.current&&clearInterval(He.current),ve.current&&ve.current.cancel()},[]);let br=F(()=>{let c=k.trim();return`${c?c.split(/\s+/).length:0} words \xB7 ${k.length} chars`},[k]),vr=F(()=>{let c=C.trim();return`${c?c.split(/\s+/).length:0} words \xB7 ${C.length} chars`},[C]),hr=F(()=>!C||!Qe?[]:jt(k,C),[k,C,Qe]),Jt=()=>{Oe.current&&(clearInterval(Oe.current),Oe.current=null),He.current&&(clearInterval(He.current),He.current=null)},yr=()=>{Jt(),Oe.current=setInterval(()=>Fn(c=>c+1),1e3),He.current=setInterval(()=>{ve.current&&qt(ve.current.getAudioLevel?.()??null)},100)},xr=async c=>{Yt(!1),qt(null),Jt();let f=ve.current;ve.current=null;let w=yt.current;yt.current=null;let D=w!==null?Math.max(0,Date.now()-w):void 0;if(f){de(!0);try{let E=await f.stop();if(!oe.current)return;V("stop",c);let M=await Be(b,E),j=await b.call(je,{audio:M.base64,mimeType:M.mimeType,transcriptionOnly:!0,source:"studio",...t?{projectId:t}:{},...typeof D=="number"?{audioDurationMs:D}:{},...pe.current?{historyEntryId:pe.current}:{}});j.ok&&j.status==="ok"?(V("complete",c),typeof j.historyEntryId=="string"&&j.historyEntryId&&ne(j.historyEntryId),H(Q=>Ge(Q,j.text)),Ee(null)):j.ok&&j.status==="no-speech"?(A("No speech detected. Try speaking closer to the microphone."),setTimeout(()=>A(null),4e3)):j.ok||(V("error",c),A(j.message),Ee(j.message),j.code==="MISSING_KEY"&&jn(!1))}catch(E){V("error",c),A(E instanceof Error?E.message:"Transcription failed.")}finally{de(!1)}}},Sr=async(c,f)=>{if(Ee(null),A(null),J!=="system"&&!Gt){V("error",f);let D=J==="openai"?"OpenAI":"Google Gemini";Ee(`API key required for direct ${D} speech-to-text. Switch to System (Zana Voice) below to dictate using host voice.`),A(`API key required for ${D}. Switch to System (Zana Voice) to dictate thoughts.`);return}let w=++xt.current;try{let D=V("start",f);if(D&&(await D,!oe.current||xt.current!==w))return;let E=await(c.micDeviceId!==z?i({deviceId:c.micDeviceId}):i());if(!oe.current||xt.current!==w){E.cancel();return}E.onError=M=>{ve.current=null,yt.current=null,Yt(!1),qt(null),Jt(),V("error",f),Ee(M.message),A(M.message)},ve.current=E,yt.current=Date.now(),Yt(!0),Fn(0),yr()}catch(D){V("error",f),A(D instanceof Error?D.message:"Microphone access denied.")}},Qt=R(()=>{d(!1),It(ue()),Ct(),Kt(),Ve()},[Ve,Ct,Kt,It]),wr=async()=>{let c=Un.current,f={enabled:c.soundCuesEnabled,volume:c.soundCuesVolume};ce?await xr(f):await Sr(c,f)},Tr=async()=>{let c=k.trim();if(!c||ie||!K||B===P.custom&&!vt.trim())return;let f=Rn.find(W=>W.id===B),w=B===P.custom,D=B===P.improve,E=B===P.translate,M=E?"standard":w?"custom":D?et:f?.tone||"technical",j=Z?.id??"assistant",Q=K?.id??"assistant";A(null),Hn(!0);try{let W=await b.call(Jn,{text:c,tone:M,...E?{targetLanguage:tt}:{},...w?{customPrompt:vt.trim()}:{},...!w&&!E&&f?.instruction?{instruction:f.instruction}:{},llmProvider:j,llmModel:Q,source:"studio",presetId:B,...t?{projectId:t}:{},...pe.current?{historyEntryId:pe.current}:{}});W.ok?(typeof W.historyEntryId=="string"&&W.historyEntryId&&ne(W.historyEntryId),$(W.text),ar(`${Z?.displayName||j}: ${W.llmModel||Q}`)):A(W.message)}catch(W){A(W instanceof Error?W.message:"Refinement request failed.")}finally{Hn(!1)}},Ir=async()=>{try{let c=await navigator.clipboard.readText();if(!c||!c.trim()){A("Clipboard is empty."),setTimeout(()=>A(null),2500);return}H(f=>Ge(f,c)),A("Pasted from clipboard into input draft!"),setTimeout(()=>A(null),2500)}catch{A("Clipboard access denied or unavailable."),setTimeout(()=>A(null),2500)}},Cr=async()=>{if(!k)return;await Ze(k)?(q(!0),setTimeout(()=>q(!1),2e3),A("Input draft copied to clipboard!"),setTimeout(()=>A(null),2500)):(A("Failed to copy to clipboard."),setTimeout(()=>A(null),3e3))},Er=async()=>{if(!C)return;await Ze(C)?(Ne(!0),setTimeout(()=>Ne(!1),2e3),A("Refined output copied to clipboard!"),setTimeout(()=>A(null),2500)):(A("Failed to copy to clipboard."),setTimeout(()=>A(null),3e3))},Rr=()=>{!k&&!C||(ne(null),H(""),$(""),re(P.improve),be("standard"),nt(Ye),$t(""),bt(!1),A("Studio canvas cleared."),setTimeout(()=>A(null),2500))},Ar=()=>{C&&(H(C),$(""),bt(!1),A("Refined output moved to input draft."),setTimeout(()=>A(null),2500))},Bn=R(c=>{if(c){if(v&&typeof v.updateText=="function")try{v.updateText(f=>Ge(f,c)),v.focus?.(),ge("Inserted into Composer!"),A("Inserted into Composer!"),setTimeout(()=>ge(null),2500),setTimeout(()=>A(null),2500);return}catch{}if(S&&typeof S.toCompose=="function"){S.toCompose({initialPrompt:c,focusPrompt:!0}),ge("Opened in New Thread Composer!"),A("Opened in New Thread Composer!"),setTimeout(()=>ge(null),2500),setTimeout(()=>A(null),2500);return}Ze(c).then(f=>{A(f?"No active composer \u2014 copied prompt to clipboard.":"Composer focus unavailable.")})}},[v,S]),Pr=()=>{Bn(C||k)},en=R(c=>{if(ne(null),H(c.rawText),$(c.kind==="refinement"||c.outputText!==c.rawText?c.outputText:""),c.kind==="refinement"||c.presetId||c.targetLanguage||c.customPrompt){let f=c.presetId&&or.has(c.presetId)?c.presetId:c.targetLanguage?P.translate:c.tone==="custom"?P.custom:P.improve;re(f),c.tone&&pt.some(w=>w.id===c.tone)&&be(c.tone),c.targetLanguage&&nt(qe(c.targetLanguage)?.code??Ye),$t(c.customPrompt??"")}bt(!1),m(null),d(!1),p("studio"),A("Loaded entry into Studio."),setTimeout(()=>A(null),2500)},[ne]),kr=R(c=>{if(k.trim()||C.trim()){m(c);return}en(c)},[en,k,C]),Nr=async()=>{if(e){Pn(!0),Nn(null);try{await Nt(e,{showInProjects:!0})}catch(c){Nn(c instanceof Error?c.message:"Could not update plugin settings.")}finally{Pn(!1)}}},Dr=R(c=>{(c.ctrlKey||c.metaKey)&&c.key.toLowerCase()==="k"&&(c.preventDefault(),d(!1),p("studio"),re(P.custom),setTimeout(()=>$n.current?.focus(),0))},[]);if(t&&!h.showInProjects)return a("div",{className:"ps-container",children:[n("style",{children:En}),a("header",{className:"ps-header",children:[a("div",{className:"ps-header-left",children:[n("span",{style:{fontSize:18},children:"\u{1F399}\uFE0F"}),n("span",{className:"ps-header-title",children:"Prompt Studio"}),n("span",{className:"ps-badge ps-badge-project",children:"Project"})]}),r?n("div",{className:"ps-header-actions",children:r}):null]}),n("div",{className:"ps-empty-state","data-testid":"ps-project-hidden-notice",children:a("div",{className:"ps-empty-card",children:[n("span",{style:{fontSize:22},"aria-hidden":"true",children:"\u{1F507}"}),n("div",{style:{fontSize:14,fontWeight:600},children:"Prompt Studio is hidden in projects"}),n("div",{style:{fontSize:12,color:"var(--ps-text-muted)",lineHeight:1.45},children:"You disabled the project tab in Prompt Voice plugin settings. Re-enable it anytime to use project-scoped drafts here."}),kn?n("div",{role:"alert",style:{fontSize:11,color:"#fca5a5"},children:kn}):null,e?n("button",{type:"button",className:"ps-btn ps-btn-primary",disabled:ut,onClick:()=>void Nr(),children:ut?"Enabling\u2026":"Enable Prompt Studio in Projects"}):null]})})]});let Gn=pt.find(c=>c.id===et)??pt[0],Wn=c=>{m(null),s&&Qt(),p(c)};return a("div",{className:"ps-container",onKeyDown:Dr,children:[n("style",{children:En}),a("header",{className:"ps-header",children:[a("div",{className:"ps-header-left",children:[n("span",{style:{fontSize:18},children:"\u{1F399}\uFE0F"}),n("span",{className:"ps-header-title",children:"Prompt Studio"}),n("span",{className:"ps-badge",children:"Voice & AI Refinement"}),t?n("span",{className:"ps-badge ps-badge-project",children:"Project"}):null]}),a("div",{className:"ps-header-actions",children:[a("nav",{className:"ps-header-nav",role:"tablist","aria-label":"Prompt Studio views",children:[n("button",{type:"button",role:"tab","aria-selected":!s&&l==="studio",className:`ps-header-tab ${!s&&l==="studio"?"active":""}`,onClick:()=>Wn("studio"),children:"Studio"}),n("button",{type:"button",role:"tab","aria-selected":!s&&l==="history",className:`ps-header-tab ${!s&&l==="history"?"active":""}`,onClick:()=>Wn("history"),children:"History"})]}),n("button",{type:"button",className:`ps-btn ${s?"ps-btn-primary":""}`,"aria-pressed":s,onClick:()=>{m(null),s?Qt():d(!0)},children:"Settings"}),r]})]}),u?a("div",{className:"ps-overwrite-banner",role:"alertdialog","aria-label":"Confirm overwrite studio draft",children:[n("span",{children:"Replace your current Studio draft with this history entry?"}),a("div",{style:{display:"flex",gap:6},children:[n("button",{type:"button",className:"ps-btn",onClick:()=>m(null),children:"Cancel"}),n("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:()=>en(u),children:"Replace Draft"})]})]}):null,s?n(Go,{rpc:b,pluginId:e,onBack:Qt}):l==="history"?n(er,{rpc:b,projectId:t,onLoadIntoStudio:kr,onInsertIntoComposer:Bn,onOpenSettings:()=>d(!0),onStatusNotice:c=>{A(c),setTimeout(()=>A(f=>f===c?null:f),2500)}}):a("div",{className:"ps-workspace",children:[a("aside",{className:"ps-sidebar",children:[a("section",{className:"ps-section",children:[a("div",{className:"ps-section-title",children:[n("span",{children:"Voice Dictation"}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:Ws[J]??J})]}),a("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-stt-provider-select",className:"ps-field-label",children:"Speech Provider"}),n("select",{id:"ps-stt-provider-select",className:"ps-select","aria-label":"Speech-to-text provider",value:J,onChange:c=>{Ee(null),Xt(c.target.value)},disabled:ce||G,children:Ys.map(c=>n("option",{value:c.id,children:c.label},c.id))})]}),rr(J)&&a("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-stt-model-input",className:"ps-field-label",children:"Speech Model (Optional)"}),n("input",{id:"ps-stt-model-input",className:"ps-select","aria-label":"Speech-to-text model",placeholder:"Provider default",value:Bt,onChange:c=>mr(c.target.value),disabled:ce||G})]}),Wt&&a("div",{role:"alert",style:{padding:"8px 10px",borderRadius:6,background:"rgba(239, 68, 68, 0.12)",border:"1px solid rgba(239, 68, 68, 0.35)",color:"#fca5a5",fontSize:11,textAlign:"left",lineHeight:1.4,display:"flex",flexDirection:"column",gap:6},children:[a("div",{children:["\u26A0\uFE0F ",Wt]}),rr(J)&&n("button",{type:"button",className:"ps-btn ps-btn-primary",style:{alignSelf:"flex-start",fontSize:11,padding:"4px 8px"},onClick:()=>Xt("system"),children:"Switch to System (Zana Voice)"})]}),J!=="system"&&!Gt&&!Wt&&a("div",{style:{padding:"8px 10px",borderRadius:6,background:"rgba(234, 179, 8, 0.1)",border:"1px solid rgba(234, 179, 8, 0.3)",color:"#fde047",fontSize:11,textAlign:"left",lineHeight:1.4,display:"flex",flexDirection:"column",gap:6},children:[a("div",{children:["\u2139\uFE0F ",n("strong",{children:"API key required:"})," Direct ",J==="openai"?"OpenAI Whisper":"Google Gemini"," speech-to-text requires an API key in Zana Settings."]}),n("button",{type:"button",className:"ps-btn ps-btn-primary",style:{alignSelf:"flex-start",fontSize:11,padding:"4px 8px"},onClick:()=>Xt("system"),children:"Switch to System (Zana Voice)"})]}),a("div",{className:"ps-dictation-card",children:[a("button",{type:"button",className:`ps-btn ${ce?"ps-btn-danger":G?"":"ps-btn-primary"}`,style:{width:"100%",justifyContent:"center",padding:"10px 0",opacity:G?.8:1},onClick:wr,disabled:G,"aria-label":G?"Transcribing audio":ce?"Stop dictation":"Start dictation",children:[n("span",{className:G?"ps-spin":void 0,children:G?"\u23F3":ce?"\u23F9\uFE0F":"\u{1F399}\uFE0F"}),n("span",{children:G?"Transcribing...":ce?`Stop Dictation (${lr}s)`:"Dictate Thoughts"})]}),ce&&a("div",{style:{width:"100%",display:"flex",flexDirection:"column",gap:4},children:[n("div",{className:"ps-meter-bar",children:n("div",{className:"ps-meter-fill",style:{width:`${Math.min(100,(cr??.1)*100)}%`}})}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:"Listening live..."})]})]}),n("div",{style:{fontSize:10,color:"var(--ps-text-subtle)",lineHeight:1.3},children:J==="system"?"Uses host Zana voice transcription without requiring external API keys.":J==="local-whisper"?"Transcribes on this device. Install the runtime and a model in Settings.":Gt?`Using direct ${J==="openai"?"OpenAI Whisper":"Google Gemini"} speech-to-text.`:`\u26A0\uFE0F ${J==="openai"?"OpenAI":"Google Gemini"} requires an API key in Zana Settings. Choose System (Zana Voice) for built-in free dictation.`})]}),a("section",{className:"ps-section",children:[a("div",{className:"ps-section-title",children:[n("span",{children:"Refinement Engine"}),a("span",{style:{display:"inline-flex",alignItems:"center",gap:6},children:[n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:mt&&!dr?"Loading\u2026":mt?"Refreshing\u2026":Z?.isComposerMatch?"\u2605 Composer Active":"AI Model"}),n("button",{type:"button",className:"ps-btn",style:{padding:"2px 6px",fontSize:10},onClick:()=>Ve({refresh:!0}),disabled:mt||ie,"aria-label":"Refresh models",title:"Reload models from Composer",children:mt?"\u2026":"\u21BB"})]})]}),a("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-provider-select",className:"ps-field-label",children:"Provider"}),n("select",{id:"ps-provider-select",className:"ps-select","aria-label":"Refinement provider",value:Z?.id??"",onChange:c=>fr(c.target.value),disabled:ie,children:se.map(c=>a("option",{value:c.id,children:[c.displayName,c.isComposerMatch?" \u2605 (Composer)":""]},c.id))})]}),a("div",{className:"ps-field-group",children:[a("label",{htmlFor:"ps-model-select",className:"ps-field-label",children:["Model (",Re.length,")"]}),n("select",{id:"ps-model-select",className:"ps-select","aria-label":"Refinement model",value:K?.key||K?.id||"",onChange:c=>gr(c.target.value),disabled:ie||Re.length===0,children:Re.length===0?n("option",{value:"",children:"No models available"}):Re.map(c=>a("option",{value:c.key||c.id,children:[c.label,c.isComposerMatch?" \u2605 (Composer)":""]},c.key||c.id))})]}),(Z?.error||_n)&&n("div",{role:"status",style:{fontSize:10.5,color:"#fde047",lineHeight:1.35,padding:"6px 8px",borderRadius:6,background:"rgba(234, 179, 8, 0.1)",border:"1px solid rgba(234, 179, 8, 0.25)"},children:Z?.error||_n}),a("div",{style:{marginTop:8,paddingTop:8,borderTop:"1px solid var(--ps-border)",display:"flex",flexDirection:"column",gap:4},children:[a("label",{style:{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:11,fontWeight:500,userSelect:"none"},children:[n("input",{type:"checkbox","aria-label":"Auto-cleanup mic dictations",checked:Je,onChange:c=>ur(c.target.checked)}),n("span",{children:"Auto-cleanup mic dictations"})]}),n("span",{style:{fontSize:10,color:"var(--ps-text-subtle)",lineHeight:1.3},children:Je?`Composer mic cleans up using ${Z?.displayName}${K?` (${K.label||K.id})`:""}.`:"Composer mic inserts raw transcript without AI cleanup."})]}),a("div",{style:{marginTop:4,fontSize:11,color:"var(--ps-text-muted)",lineHeight:1.35},children:[Z?.isComposerMatch?a("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:600},children:["\u2605 Synced to Composer: ",Z.displayName,K?` (${K.label})`:""]}):Z?.id==="assistant"?"Uses the active Zana assistant agent with no extra API key required.":K?a(Y,{children:["Using ",n("strong",{children:Z?.displayName})," \xB7 ",n("code",{children:K.id})]}):null,On?a("div",{style:{marginTop:3,color:"var(--ps-text-subtle)",fontSize:10},children:["Last refined: ",On]}):null]})]}),a("section",{className:"ps-section",children:[n("div",{className:"ps-section-title",children:"How should we improve it?"}),a("div",{className:"ps-presets-list",role:"radiogroup","aria-label":"How should we improve it?",children:[Rn.map(c=>a("div",{style:{display:"flex",flexDirection:"column",gap:6},children:[a("label",{className:`ps-preset-btn ${B===c.id?"active":""}`,children:[a("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:c.id,checked:B===c.id,onChange:()=>re(c.id)}),c.title]}),n("span",{className:"preset-desc",children:c.desc})]}),c.id===P.improve&&B===P.improve&&a("div",{className:"ps-tone-panel",children:[a("div",{className:"ps-tone-header",children:[n("label",{htmlFor:"ps-improve-tone-select",children:n("strong",{style:{color:"var(--text-primary, #e2e8f0)"},children:"Tone"})}),n("span",{style:{color:"var(--ps-text-subtle)"},children:"Same length"})]}),n("select",{id:"ps-improve-tone-select",className:"ps-select","aria-label":"Improvement tone",value:et,onChange:f=>be(f.target.value),disabled:ie,children:pt.map(f=>n("option",{value:f.id,children:f.label},f.id))}),n("div",{className:"ps-tone-hint",children:Gn.desc})]})]},c.id)),a("label",{className:`ps-preset-btn ${B===P.custom?"active":""}`,children:[a("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:P.custom,checked:B===P.custom,onChange:()=>re(P.custom)}),"Custom instructions"]}),n("span",{className:"preset-desc",children:"Describe your own transformation."})]}),B===P.custom&&n("textarea",{ref:$n,className:"ps-custom-prompt-input","aria-label":"Custom instructions",placeholder:"e.g. Turn into user stories with acceptance criteria...",value:vt,onChange:c=>$t(c.target.value)}),a("div",{style:{display:"flex",flexDirection:"column",gap:6},children:[a("label",{className:`ps-preset-btn ${B===P.translate?"active":""}`,children:[a("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:P.translate,checked:B===P.translate,onChange:()=>re(P.translate)}),"Translate"]}),n("span",{className:"preset-desc",children:"Translate into another language while keeping meaning."})]}),B===P.translate&&a("div",{className:"ps-tone-panel",children:[a("div",{className:"ps-tone-header",children:[n("label",{htmlFor:"ps-translate-lang-select",children:n("strong",{style:{color:"var(--text-primary, #e2e8f0)"},children:"Target language"})}),n("span",{style:{color:"var(--ps-text-subtle)"},children:"Same meaning"})]}),n("select",{id:"ps-translate-lang-select",className:"ps-select","aria-label":"Target language",value:tt,onChange:c=>nt(c.target.value),disabled:ie,children:Sn.map(c=>n("option",{value:c.code,children:c.label},c.code))})]})]})]})]})]}),a("main",{className:"ps-editor-canvas",children:[a("section",{className:"ps-pane",children:[a("div",{className:"ps-pane-header",children:[a("div",{className:"ps-pane-title",children:[n("span",{children:"\u{1F4DD}"}),n("span",{children:"Raw Input Draft"})]}),a("div",{style:{display:"flex",gap:6},children:[n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Ir,title:"Paste from clipboard into input draft","aria-label":"Paste into input draft",children:"\u{1F4CB} Paste"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Cr,disabled:!k,title:"Copy raw input","aria-label":"Copy raw input",children:zt?"\u2705 Copied":"\u{1F4CB} Copy"})]})]}),n("textarea",{className:"ps-textarea",placeholder:"Type your raw thoughts or click Dictate in the left sidebar to speak...",value:k,onChange:c=>H(c.target.value),"aria-label":"Raw Input Text"})]}),a("div",{className:"ps-action-bar",children:[a("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12},children:[n("span",{className:"ps-pill",children:Gs(B,Gn.label,tt)}),n("span",{style:{color:"var(--ps-text-muted)"},children:k.trim()?`${k.trim().split(/\s+/).length} words ready`:"Add text to get started"})]}),n("div",{style:{display:"flex",alignItems:"center",gap:6},children:a("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:()=>Tr(),disabled:ie||!k.trim()||!K||B===P.custom&&!vt.trim(),title:B===P.translate?"Translate raw draft into the selected language":"Transform raw draft into output",children:[n("span",{children:ie?"\u23F3":"\u26A1"}),n("span",{children:Bs(B,ie)})]})})]}),a("section",{className:"ps-pane",children:[a("div",{className:"ps-pane-header",children:[a("div",{className:"ps-pane-title",children:[n("span",{children:"\u2728"}),n("span",{children:"Result"})]}),a("div",{style:{display:"flex",gap:6},children:[C&&a("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>bt(c=>!c),title:"Toggle inline diff against input draft",children:[n("span",{children:Qe?"\u{1F441}\uFE0F":"\u{1F50D}"}),n("span",{children:Qe?"View Clean":"View Diff"})]}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Ar,disabled:!C,title:"Move output to input draft for iterative re-refinement",children:"\u2B06 Replace Input"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Er,disabled:!C,title:"Copy refined text to clipboard","aria-label":"Copy refined output",children:Ie?"\u2705 Copied":"\u{1F4CB} Copy"})]})]}),Qe&&C?n("div",{className:"ps-output-view",children:hr.map((c,f)=>c.type==="added"?n("span",{className:"ps-diff-added",children:c.text},f):c.type==="removed"?n("span",{className:"ps-diff-removed",children:c.text},f):n("span",{className:"ps-diff-unchanged",children:c.text},f))}):n("textarea",{className:"ps-textarea",placeholder:"Your improved, structured, or translated text will appear here...",value:C,onChange:c=>$(c.target.value),"aria-label":"Refined output"})]}),a("div",{className:"ps-action-bar",children:[n("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12},children:Ke?n("span",{className:"ps-badge",style:{background:"rgba(34, 197, 94, 0.2)",color:"#86efac"},children:Ke}):n("span",{style:{color:"var(--ps-text-muted)"},children:C?"Ready to insert refined result into Composer":k?"Ready to insert raw draft into Composer":"Draft or refine a prompt to insert into Composer"})}),a("div",{style:{display:"flex",alignItems:"center",gap:8},children:[a("button",{type:"button",className:"ps-btn",onClick:Rr,title:"Clear current input and output",disabled:!k&&!C,children:[n("span",{children:"\u{1F5D1}\uFE0F"}),n("span",{children:"Clear"})]}),a("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:Pr,disabled:!k&&!C,title:"Append current text directly into Zana Composer",children:[n("span",{children:"\u{1F4AC}"}),n("span",{children:"Insert into Composer"})]})]})]})]})]}),a("footer",{className:"ps-status-bar",children:[a("div",{style:{display:"flex",gap:12},children:[a("span",{children:["Input: ",br]}),a("span",{children:["Output: ",vr]}),Vn&&n("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:500},children:Vn})]}),a("div",{style:{display:"flex",gap:12,alignItems:"center"},children:[a("span",{children:["Engine: ",Z?.displayName," \xB7 ",K?.label??"No model"]}),a("span",{className:"ps-pill",children:["Mic cleanup: ",Je?`${Z?.displayName}${K?` (${K.label||K.id})`:""}`:"Off (Raw)"]}),Z?.isComposerMatch&&n("span",{className:"ps-pill",style:{color:"var(--accent, #3b82f6)"},children:"\u2605 Composer Synced"}),n("span",{children:"Zana Prompt Studio"})]})]})]})}var Qc=Zn(e=>{ee(),e.composer.customize({id:"prompt-voice-mic",actions:[{id:"prompt-voice-mic",component:Ao}]}),e.slots.navPanel?.({id:le,title:"Prompt Studio",icon:"Sparkles",path:le,component:An}),e.slots.projectTab?.({id:ke,label:"Prompt Studio",icon:"Sparkles",order:50,global:!1,header:"custom",detachable:!0,component:An,detachedPlaceholder:sr}),e.slots.homepageSection?.({id:"prompt-voice-home",title:"Prompt Voice",component:To}),e.slots.settingsSection?.({id:"prompt-voice-visibility",title:"Where Prompt Voice Appears",description:"Choose whether Prompt Voice appears on the main Home screen, inside projects, and in composers.",component:Mt}),e.slots.commandPaletteAction?.({id:"open-prompt-studio",title:"Prompt Studio: Open Canvas",isAvailable:()=>!0,run:t=>{if(Fe("studio"),typeof t.toPluginPanel=="function"){t.toPluginPanel(le);return}t.navigate?.(`/${le}`)}}),e.slots.commandPaletteAction?.({id:"open-prompt-studio-history",title:"Prompt Studio: Open History",isAvailable:()=>!0,run:t=>{if(Fe("history"),typeof t.toPluginPanel=="function"){t.toPluginPanel(le,{subPath:Se});return}t.navigate?.(`/${le}/${Se}`)}}),e.slots.commandPaletteAction?.({id:"open-prompt-studio-project",title:"Prompt Studio: Open in This Project",isAvailable:t=>!!t.projectId,run:t=>{t.projectId&&typeof t.toProject=="function"&&t.toProject(t.projectId,{tabId:ke})}})});export{le as PROMPT_STUDIO_PANEL_PATH,ke as PROMPT_STUDIO_PROJECT_TAB_ID,Qc as default};
//# sourceMappingURL=app.js.map
