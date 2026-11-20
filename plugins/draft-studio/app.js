function io(){let e=globalThis.__ZCC_PLUGIN_HOST__;if(!e)throw new Error("plugin host is not available");return e}function ke(){return globalThis.__ZCC_PLUGIN_RUNTIME__??{}}function Dt(e){throw new Error(`${e} is not available until the host plugin runtime is installed`)}async function so(e,t,o){return io().callRpc(e,t,o)}async function an(e,t){return io().setSettings(e,t)}function ao(e){return{__zccPluginApp:!0,setup:e}}function ct(){return ke().useRpc?.()??Dt("useRpc")}function dn(e,t){ke().useRealtime?.(e,t)}function ln(){return ke().useSettings?.()??{values:void 0,isLoading:!0}}function cn(){return ke().useZccContext?.()??{projectId:null,threadId:null}}function pn(){return ke().useZccNavigate?.()??Dt("useZccNavigate")}function pt(){return ke().useComposer?.()??Dt("useComposer")}function un(){return ke().useComposerView?.()??Dt("useComposerView")}var L=globalThis.__ZCC_HOST_REACT__,lo=L,pa=L.Children,ua=L.Component,ma=L.Fragment,fa=L.StrictMode,ga=L.Suspense,ba=L.cloneElement,ya=L.createContext,ha=L.createElement,va=L.createRef,xa=L.forwardRef,Sa=L.isValidElement,wa=L.lazy,Ia=L.memo,Ta=L.startTransition,E=L.useCallback,Ea=L.useContext,Ca=L.useDebugValue,Aa=L.useDeferredValue,N=L.useEffect,Ra=L.useId,Da=L.useImperativeHandle,ka=L.useInsertionEffect,Pa=L.useLayoutEffect,U=L.useMemo,co=L.useReducer,x=L.useRef,b=L.useState,Na=L.useSyncExternalStore,_a=L.useTransition,Ma=L.version;var $="default";function Yr(e){if(typeof e!="string")return $;let t=e.trim().slice(0,256);return!t||t===$?$:t}function qr(e){return typeof e!="string"?"":e.trim().slice(0,200)}function Zr(e){return!(e===!1||typeof e=="string"&&e.trim().toLowerCase()==="false")}function Kr(e){let t=typeof e=="number"?e:typeof e=="string"&&e.trim()!==""?Number(e):Number.NaN;return Number.isFinite(t)?Math.round(Math.min(100,Math.max(0,t))):75}function xe(e){let t=e??{},o=Yr(t.micDeviceId);return{micDeviceId:o,micLabel:o===$?"":qr(t.micLabel),soundCuesEnabled:Zr(t.soundCuesEnabled),soundCuesVolume:Kr(t.soundCuesVolume)}}var Ve="draftStudio.transcribe",me="draftStudio.status",po="draftStudio.rephrase",uo="draftStudio.availableModels",Se="draftStudio.settings.get",we="draftStudio.settings.update",mo="draftStudio.history.list",fo="draftStudio.history.star",go="draftStudio.history.delete",kt="draftStudio.history.clear",bo="draftStudio.history.projects",Pt="draftStudio:settingsChanged",Nt="draftStudio:modelsUpdated",yo="draftStudio:historyChanged",ce={state:"draftStudio.localWhisper.state",installRuntime:"draftStudio.localWhisper.installRuntime",cancelRuntimeInstall:"draftStudio.localWhisper.cancelRuntimeInstall",downloadModel:"draftStudio.localWhisper.downloadModel",cancelModelDownload:"draftStudio.localWhisper.cancelModelDownload",removeModel:"draftStudio.localWhisper.removeModel",selectModel:"draftStudio.localWhisper.selectModel",start:"draftStudio.localWhisper.start",stop:"draftStudio.localWhisper.stop"};var ho=["standard","casual","conversational","formal","technical","custom"];function _t(e){if(Array.isArray(e?.availableSttProviders)){let o=new Set(e.availableSttProviders.filter(r=>typeof r=="string"&&r.length>0));return o.add("system"),Array.from(o)}let t=["system"];return typeof e?.sttProvider=="string"&&e.sttProvider.length>0&&e.sttProvider!=="system"&&e.sttKeyConfigured===!0&&t.push(e.sttProvider),t}var pe="draft-studio",Pe="draft-studio",Ie="history";var vo="zcc:draft-studio:audio-prefs:v1";function mn(){try{if(typeof localStorage>"u")return null;let e=localStorage.getItem(vo);if(!e)return null;let t=JSON.parse(e);return!t||typeof t!="object"||Array.isArray(t)?null:xe(t)}catch{return null}}function fe(){return mn()??xe({})}function ge(e){let t=xe(e);try{typeof localStorage<"u"&&localStorage.setItem(vo,JSON.stringify({micDeviceId:t.micDeviceId,micLabel:t.micDeviceId===$?"":t.micLabel,soundCuesEnabled:String(t.soundCuesEnabled),soundCuesVolume:String(t.soundCuesVolume)}))}catch{}return t}var fn="zcc:draft-studio:switch-studio-tab",Mt=null;function Ue(e){if(Mt=e,typeof window<"u"&&typeof window.dispatchEvent=="function")try{window.dispatchEvent(new CustomEvent(fn,{detail:{tab:e}}))}catch{}}function xo(){let e=Mt;return Mt=null,e}function So(e){if(typeof window>"u"||typeof window.addEventListener!="function")return()=>{};let t=o=>{let r=o.detail;(r?.tab==="studio"||r?.tab==="history")&&(Mt=null,e(r.tab))};return window.addEventListener(fn,t),()=>window.removeEventListener(fn,t)}var gn=`/* Base Container */
.ds-mic {
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

.ds-sr-only {
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
.ds-mic-button {
  box-sizing: border-box;
  font: inherit;
}

.ds-mic-button:focus-visible {
  outline: 2px solid var(--focus-ring, #4a90e2);
  outline-offset: 2px;
}

.ds-mic-button:disabled {
  opacity: 0.6;
  cursor: progress;
}

/* Dictation Pill Container: shared morphing capsule across all phases */
.ds-dictation-pill {
  display: inline-flex;
  align-items: center;
  height: 36px;
  border-radius: 9999px;
  background: var(--ds-pill-bg, #181920);
  border: 1px solid var(--ds-pill-border, rgba(239, 68, 68, 0.35));
  transition: width 0.28s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.25s ease,
              box-shadow 0.25s ease,
              background 0.25s ease,
              padding 0.25s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  box-sizing: border-box;
}

/* 1. Idle: Oval Capsule Pill with Signature Crimson Border containing only the mic icon */
.ds-mic.ds-phase-idle {
  width: 58px;
  height: 36px;
  border-radius: 9999px;
  background: var(--ds-pill-bg, #181920);
  border: 1px solid rgba(239, 68, 68, 0.35);
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.12);
  padding: 0;
  justify-content: center;
  cursor: pointer;
}

.ds-mic.ds-phase-idle:hover {
  background: #20222c;
  border-color: rgba(239, 68, 68, 0.75);
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.28);
  transform: scale(1.04);
}

.ds-mic.ds-phase-idle:active {
  transform: scale(0.97);
}

.ds-mic.ds-phase-idle .ds-idle-icon {
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

.ds-mic.ds-phase-idle:hover .ds-idle-icon {
  color: #ffffff;
}

/* 2. Starting Oval: extends smoothly */
.ds-mic.ds-phase-starting {
  width: auto;
  border-radius: 9999px;
  border-color: rgba(234, 179, 8, 0.45);
  box-shadow: 0 0 14px rgba(234, 179, 8, 0.15);
  padding: 0 4px 0 10px;
  gap: 10px;
}

/* 3. Recording / Listening Oval: extends with red glow */
.ds-mic.ds-phase-recording {
  width: auto;
  border-radius: 9999px;
  border-color: rgba(239, 68, 68, 0.45);
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.18), 0 4px 16px rgba(0, 0, 0, 0.4);
  padding: 0 4px 0 10px;
  gap: 10px;
}

/* 4. Processing Oval */
.ds-mic.ds-phase-processing {
  width: auto;
  border-radius: 9999px;
  border-color: rgba(56, 189, 248, 0.4);
  box-shadow: 0 0 14px rgba(56, 189, 248, 0.15);
  padding: 0 6px 0 10px;
  gap: 10px;
}

/* 5. Notice Oval: same control showing completion */
.ds-mic.ds-has-notice {
  width: auto;
  border-radius: 9999px;
  border-color: rgba(34, 197, 94, 0.45);
  box-shadow: 0 0 16px rgba(34, 197, 94, 0.15);
  padding: 0 14px 0 12px;
  gap: 8px;
  cursor: pointer;
}

.ds-mic.ds-has-notice:hover {
  border-color: rgba(34, 197, 94, 0.75);
  background: rgba(34, 197, 94, 0.08);
}

.ds-notice-content {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  animation: ds-notice-enter 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.ds-notice-check {
  color: #4ade80;
  font-weight: 700;
  font-size: 13px;
}

@keyframes ds-notice-enter {
  from { opacity: 0; transform: scale(0.96) translateX(-3px); }
  to { opacity: 1; transform: scale(1) translateX(0); }
}

/* Flex ordering for active pill children */
.ds-mic-active .ds-pill-timer-badge {
  order: 1;
}

.ds-mic-active .ds-pill-center {
  order: 2;
}

.ds-mic-active .ds-mic-button.ds-pill-btn-stop {
  order: 3;
}

.ds-mic-active .ds-pill-btn-cancel {
  order: 4;
}

/* Timer Badge */
.ds-pill-timer-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 9999px;
  padding: 2px 8px 2px 6px;
}

.ds-pill-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--danger-color, #ef4444);
  box-shadow: 0 0 8px var(--danger-color, #ef4444);
  animation: ds-pulse-dot 1.4s ease-in-out infinite;
}

.ds-pill-dot-starting {
  background: #eab308;
  box-shadow: 0 0 8px #eab308;
}

@keyframes ds-pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

.ds-pill-timer-text {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  font-weight: 600;
  color: #f8fafc;
  letter-spacing: 0.02em;
}

/* Center area */
.ds-pill-center {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.ds-pill-waveform {
  display: inline-flex;
  align-items: center;
  gap: 2.5px;
  height: 16px;
}

.ds-pill-waveform-bar {
  width: 3px;
  background: #38bdf8;
  border-radius: 9999px;
  box-shadow: 0 0 6px rgba(56, 189, 248, 0.4);
  transition: height 0.08s ease;
  min-height: 3px;
  height: 5px;
}

.ds-pill-waveform.animated .ds-pill-waveform-bar:nth-child(1) { animation: ds-wave 0.8s ease-in-out infinite alternate; }
.ds-pill-waveform.animated .ds-pill-waveform-bar:nth-child(2) { animation: ds-wave 0.6s ease-in-out infinite alternate 0.15s; }
.ds-pill-waveform.animated .ds-pill-waveform-bar:nth-child(3) { animation: ds-wave 0.7s ease-in-out infinite alternate 0.3s; }
.ds-pill-waveform.animated .ds-pill-waveform-bar:nth-child(4) { animation: ds-wave 0.5s ease-in-out infinite alternate 0.2s; }
.ds-pill-waveform.animated .ds-pill-waveform-bar:nth-child(5) { animation: ds-wave 0.9s ease-in-out infinite alternate 0.05s; }

@keyframes ds-wave {
  0% { height: 4px; }
  100% { height: 14px; }
}

.ds-pill-status {
  font-size: 13px;
  font-weight: 500;
  color: #e2e8f0;
  white-space: nowrap;
}

.ds-mic-quiet-warning {
  font-size: 11px;
  color: #fbbf24;
}

/* Stop button inside active pill */
.ds-mic-button.ds-pill-btn-stop {
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

.ds-mic-button.ds-pill-btn-stop:hover {
  background: rgba(239, 68, 68, 0.38);
  border-color: rgba(239, 68, 68, 0.8);
  color: #ffffff;
  transform: scale(1.05);
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
}

/* Cancel button inside active pill */
.ds-pill-btn-cancel {
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

.ds-pill-btn-cancel:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #f1f5f9;
  transform: scale(1.05);
}

/* Spinner */
.ds-mic-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: ds-spin 0.8s linear infinite;
  vertical-align: middle;
}

@keyframes ds-spin {
  to { transform: rotate(360deg); }
}

/* Error styles */
.ds-mic.ds-phase-error {
  width: auto;
  border-radius: 9999px;
  border-color: rgba(239, 68, 68, 0.7);
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.25);
  padding: 0 10px;
}

.ds-mic-error {
  color: var(--danger-color, #ef4444);
}

@media (prefers-reduced-motion: reduce) {
  .ds-pill-waveform.animated .ds-pill-waveform-bar { animation: none; height: 8px; }
  .ds-pill-waveform-bar { transition: none; }
  .ds-mic-spinner { animation: none; }
}


/* ==========================================================================
   Draft Studio - Zana Native Vertical Stack (Input Top, Output Bottom)
   ========================================================================== */

:root {
  --ds-bg-base: var(--bg-base, #1e1e1e);
  --ds-bg-panel: var(--bg-panel, #252526);
  --ds-bg-header: var(--bg-header, #202021);
  --ds-bg-subtle: rgba(255, 255, 255, 0.04);
  --ds-bg-hover: var(--bg-hover, rgba(255, 255, 255, 0.06));
  --ds-bg-active: rgba(255, 255, 255, 0.1);
  --ds-border: var(--border, rgba(255, 255, 255, 0.08));
  --ds-border-strong: var(--border-strong, rgba(255, 255, 255, 0.16));
  --ds-text: var(--text-primary, #e6edf3);
  --ds-text-muted: var(--text-muted, #8a8a8a);
  --ds-accent: var(--accent, #007acc);
  --ds-accent-hover: #0098ff;
  --ds-danger: var(--danger, #e5534b);
  --ds-warn: #d29922;
  --ds-success: var(--success, #3fb950);
  --ds-font: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
  --ds-mono: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
}

.ds-root {
  display: flex !important;
  flex-direction: column !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  background: var(--ds-bg-base) !important;
  color: var(--ds-text) !important;
  font-family: var(--ds-font) !important;
  font-size: 13px !important;
  overflow: hidden !important;
  position: relative !important;
  box-sizing: border-box !important;
}

.ds-root *, .ds-root *::before, .ds-root *::after {
  box-sizing: border-box !important;
}

/* \u2500\u2500\u2500 Top Studio Toolbar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.ds-toolbar {
  height: 40px !important;
  background: var(--ds-bg-header) !important;
  border-bottom: 1px solid var(--ds-border) !important;
  display: flex !important;
  align-items: center !important;
  padding: 0 14px !important;
  gap: 12px !important;
  flex-shrink: 0 !important;
  z-index: 10 !important;
}

.ds-brand {
  font-size: 13px !important;
  font-weight: 600 !important;
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  color: var(--ds-text) !important;
}

.ds-brand-badge {
  font-size: 11px !important;
  background: var(--ds-bg-subtle) !important;
  border: 1px solid var(--ds-border) !important;
  padding: 1px 6px !important;
  border-radius: 4px !important;
  color: var(--ds-text-muted) !important;
}

.ds-spacer {
  flex: 1 !important;
}

/* \u2500\u2500\u2500 Zana Native Button Styles \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.ds-btn {
  appearance: none !important;
  border: 1px solid var(--ds-border-strong) !important;
  background: var(--ds-bg-panel) !important;
  color: var(--ds-text) !important;
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

.ds-btn:hover:not(:disabled) {
  background: var(--ds-bg-hover) !important;
  border-color: var(--ds-text-muted) !important;
}

.ds-btn:disabled {
  opacity: 0.45 !important;
  cursor: default !important;
}

.ds-btn-primary {
  background: var(--ds-accent) !important;
  border-color: var(--ds-accent) !important;
  color: #ffffff !important;
  font-weight: 600 !important;
}

.ds-btn-primary:hover:not(:disabled) {
  background: var(--ds-accent-hover) !important;
  border-color: var(--ds-accent-hover) !important;
}

.ds-btn-success {
  background: #238636 !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
  color: #ffffff !important;
  font-weight: 600 !important;
}

.ds-btn-success:hover:not(:disabled) {
  background: #2ea043 !important;
}

.ds-btn-danger {
  background: rgba(229, 83, 75, 0.15) !important;
  border-color: var(--ds-danger) !important;
  color: #fca5a5 !important;
}

.ds-btn-danger:hover:not(:disabled) {
  background: rgba(229, 83, 75, 0.25) !important;
}

.ds-btn-sm {
  height: 24px !important;
  padding: 2px 8px !important;
  font-size: 11px !important;
}

/* \u2500\u2500\u2500 Main Workspace Layout \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.ds-workspace {
  flex: 1 !important;
  display: flex !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

/* \u2500\u2500\u2500 Left Sidebar: Audio & Refinement Config \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.ds-sidebar {
  width: 290px !important;
  background: var(--ds-bg-panel) !important;
  border-right: 1px solid var(--ds-border) !important;
  display: flex !important;
  flex-direction: column !important;
  overflow-y: auto !important;
  flex-shrink: 0 !important;
}

.ds-section {
  padding: 12px 14px !important;
  border-bottom: 1px solid var(--ds-border) !important;
}

.ds-section-title {
  font-size: 11px !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  color: var(--ds-text-muted) !important;
  margin-bottom: 8px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
}

/* Model Select Dropdown */
.ds-select {
  appearance: none !important;
  -webkit-appearance: none !important;
  width: 100% !important;
  height: 30px !important;
  background: var(--ds-bg-base) !important;
  color: var(--ds-text) !important;
  border: 1px solid var(--ds-border-strong) !important;
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

.ds-select:hover:not(:disabled) {
  border-color: var(--ds-accent) !important;
}

.ds-select:focus-visible {
  border-color: var(--ds-accent) !important;
  box-shadow: 0 0 0 1px var(--ds-accent) !important;
}

/* Dictation Card */
.ds-dictation-card {
  background: var(--ds-bg-base) !important;
  border: 1px solid var(--ds-border) !important;
  border-radius: 5px !important;
  padding: 10px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
}

.ds-mic-btn {
  height: 32px !important;
  border-radius: 4px !important;
  border: 1px solid var(--ds-danger) !important;
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

.ds-mic-btn:hover {
  background: rgba(229, 83, 75, 0.22) !important;
}

.ds-mic-btn.recording {
  background: var(--ds-danger) !important;
  color: #fff !important;
  animation: ds-pulse 1.5s infinite !important;
}

@keyframes ds-pulse {
  0% { box-shadow: 0 0 0 0 rgba(229, 83, 75, 0.5); }
  70% { box-shadow: 0 0 0 6px rgba(229, 83, 75, 0); }
  100% { box-shadow: 0 0 0 0 rgba(229, 83, 75, 0); }
}

.ds-audio-meter {
  height: 6px !important;
  background: rgba(255, 255, 255, 0.06) !important;
  border-radius: 3px !important;
  overflow: hidden !important;
}

.ds-audio-bar {
  height: 100% !important;
  width: 0% !important;
  background: #3fb950 !important;
  border-radius: 3px !important;
  transition: width 0.1s linear !important;
}

/* Presets List */
.ds-presets-list {
  display: flex !important;
  flex-direction: column !important;
  gap: 5px !important;
}

.ds-preset-item {
  background: var(--ds-bg-base) !important;
  border: 1px solid var(--ds-border) !important;
  border-radius: 4px !important;
  padding: 7px 9px !important;
  cursor: pointer !important;
  transition: all 0.12s ease !important;
  text-align: left !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 2px !important;
}

.ds-preset-item:hover {
  border-color: var(--ds-border-strong) !important;
  background: var(--ds-bg-hover) !important;
}

.ds-preset-item.active {
  border-color: var(--ds-accent) !important;
  background: color-mix(in srgb, var(--ds-accent) 14%, transparent) !important;
}

.ds-preset-header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
}

.ds-preset-name {
  font-size: 12px !important;
  font-weight: 600 !important;
  color: var(--ds-text) !important;
}

.ds-preset-desc {
  font-size: 11px !important;
  color: var(--ds-text-muted) !important;
  line-height: 1.3 !important;
}

/* Custom Instructions Input */
.ds-instructions-input {
  width: 100% !important;
  background: var(--ds-bg-base) !important;
  border: 1px solid var(--ds-border-strong) !important;
  border-radius: 4px !important;
  color: var(--ds-text) !important;
  padding: 7px 9px !important;
  font-size: 12px !important;
  font-family: inherit !important;
  resize: vertical !important;
  min-height: 65px !important;
  outline: none !important;
  line-height: 1.4 !important;
}

.ds-instructions-input:focus {
  border-color: var(--ds-accent) !important;
  box-shadow: 0 0 0 1px var(--ds-accent) !important;
}

/* \u2500\u2500\u2500 Vertical Stack: Input (Top) & Output (Bottom) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.ds-stack-workspace {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  min-width: 0 !important;
  background: var(--ds-bg-base) !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

/* Spec Title Sub-header */
.ds-stack-header {
  padding: 7px 16px !important;
  background: var(--ds-bg-header) !important;
  border-bottom: 1px solid var(--ds-border) !important;
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  flex-shrink: 0 !important;
}

.ds-title-field {
  flex: 1 !important;
  background: transparent !important;
  border: none !important;
  outline: none !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  color: var(--ds-text) !important;
  font-family: inherit !important;
  padding: 2px 4px !important;
}

.ds-title-field:focus {
  background: var(--ds-bg-panel) !important;
  border-radius: 3px !important;
  box-shadow: 0 0 0 1px var(--ds-border-strong) !important;
}

/* Vertical Panes Container */
.ds-vertical-panes {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

/* TOP PANE: Raw Input */
.ds-section-input {
  flex: 0 0 42% !important;
  display: flex !important;
  flex-direction: column !important;
  min-height: 140px !important;
  background: var(--ds-bg-base) !important;
  border-bottom: 1px solid var(--ds-border) !important;
  position: relative !important;
}

/* MIDDLE ACTION BAR */
.ds-mid-action-bar {
  height: 36px !important;
  background: var(--ds-bg-header) !important;
  border-bottom: 1px solid var(--ds-border) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 0 14px !important;
  flex-shrink: 0 !important;
  z-index: 5 !important;
}

.ds-mid-info {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  font-size: 11px !important;
  color: var(--ds-text-muted) !important;
}

.ds-mid-actions {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

/* BOTTOM PANE: Refined Output */
.ds-section-output {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  min-height: 180px !important;
  background: var(--ds-bg-base) !important;
  position: relative !important;
  overflow: hidden !important;
}

/* Pane Headers */
.ds-pane-header {
  height: 32px !important;
  background: var(--ds-bg-panel) !important;
  border-bottom: 1px solid var(--ds-border) !important;
  padding: 0 14px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  font-size: 12px !important;
  flex-shrink: 0 !important;
}

.ds-pane-title {
  display: flex !important;
  align-items: center !important;
  gap: 7px !important;
  font-weight: 600 !important;
}

.ds-badge {
  font-size: 10px !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  padding: 1px 6px !important;
  border-radius: 3px !important;
  letter-spacing: 0.04em !important;
}

.ds-badge-input {
  background: rgba(255, 255, 255, 0.08) !important;
  color: var(--ds-text-muted) !important;
}

.ds-badge-output {
  background: rgba(63, 185, 80, 0.15) !important;
  color: #7ee787 !important;
  border: 1px solid rgba(63, 185, 80, 0.3) !important;
}

.ds-pane-actions {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
}

/* Textarea & Output Body */
.ds-input-textarea {
  width: 100% !important;
  height: 100% !important;
  background: transparent !important;
  color: var(--ds-text) !important;
  border: none !important;
  outline: none !important;
  padding: 12px 16px !important;
  font-size: 13.5px !important;
  line-height: 1.6 !important;
  font-family: var(--ds-font) !important;
  resize: none !important;
  overflow-y: auto !important;
}

.ds-input-textarea::placeholder {
  color: #64748b !important;
}

.ds-output-scroll {
  width: 100% !important;
  height: 100% !important;
  overflow-y: auto !important;
  padding: 14px 16px !important;
  font-size: 13.5px !important;
  line-height: 1.6 !important;
  white-space: pre-wrap !important;
  user-select: text !important;
  font-family: var(--ds-font) !important;
}

.ds-output-empty {
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 10px !important;
  color: var(--ds-text-muted) !important;
  text-align: center !important;
  padding: 24px !important;
}

/* Diff Tokens */
.ds-diff-added {
  background: rgba(46, 160, 67, 0.22) !important;
  color: #7ee787 !important;
  padding: 1px 3px !important;
  border-radius: 3px !important;
}

.ds-diff-removed {
  background: rgba(229, 83, 75, 0.22) !important;
  color: #fca5a5 !important;
  text-decoration: line-through !important;
  padding: 1px 3px !important;
  border-radius: 3px !important;
}

.ds-diff-unchanged {
  color: var(--ds-text) !important;
}

/* \u2500\u2500\u2500 Bottom Status Bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.ds-statusbar {
  height: 26px !important;
  background: var(--ds-bg-header) !important;
  border-top: 1px solid var(--ds-border) !important;
  display: flex !important;
  align-items: center !important;
  padding: 0 14px !important;
  font-size: 11px !important;
  color: var(--ds-text-muted) !important;
  gap: 16px !important;
  flex-shrink: 0 !important;
}

.ds-status-item {
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
}

.ds-kbd {
  background: var(--ds-bg-panel) !important;
  border: 1px solid var(--ds-border-strong) !important;
  padding: 1px 4px !important;
  border-radius: 3px !important;
  font-size: 10px !important;
  font-family: var(--ds-mono) !important;
}

/* \u2500\u2500\u2500 Studio Settings: Dictionary, Microphone & Sound Cues \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.ds-dict-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.ds-dict-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.ds-dict-input {
  flex: 1;
  min-width: 0;
  height: 34px;
  padding: 6px 12px;
  background-color: var(--ds-input-bg, #0f1115);
  border: 1px solid var(--ds-border, #2a2e37);
  border-radius: 8px;
  color: var(--text-primary, #e2e8f0);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  color-scheme: dark;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.ds-dict-input:hover:not(:disabled) {
  border-color: var(--ds-text-subtle, #64748b);
}
.ds-dict-input:focus {
  border-color: var(--ds-accent, #3b82f6);
  box-shadow: 0 0 0 1px var(--ds-accent, #3b82f6);
}
.ds-dict-input::placeholder {
  color: var(--ds-text-subtle, #64748b);
}
.ds-dict-input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.ds-dict-add-btn {
  height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  font-weight: 600;
  flex-shrink: 0;
}
.ds-dict-well {
  background-color: var(--ds-input-bg, #0f1115);
  border: 1px solid var(--ds-border, #2a2e37);
  border-radius: 8px;
  padding: 12px;
  min-height: 54px;
  display: flex;
  align-items: center;
}
.ds-dict-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  list-style: none;
  margin: 0;
  padding: 0;
}
.ds-dict-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 4px 12px;
  border-radius: 9999px;
  background: var(--ds-panel-bg, #181b20);
  border: 1px solid var(--ds-border, #2a2e37);
  color: var(--text-primary, #e2e8f0);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  max-width: 100%;
  transition: border-color 0.15s, background-color 0.15s;
}
.ds-dict-pill:hover {
  border-color: var(--ds-text-subtle, #64748b);
  background: rgba(255, 255, 255, 0.04);
}
.ds-dict-pill-text {
  overflow-wrap: anywhere;
  word-break: break-word;
}
.ds-dict-pill-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 9999px;
  background: transparent;
  color: var(--ds-text-muted, #94a3b8);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 0.15s, color 0.15s;
}
.ds-dict-pill-remove:hover {
  background: rgba(239, 68, 68, 0.18);
  color: #fca5a5;
}
.ds-dict-pill-remove:focus-visible {
  outline: 1px solid var(--ds-accent, #3b82f6);
  outline-offset: 1px;
}
.ds-dict-empty {
  font-size: 12px;
  color: var(--ds-text-subtle, #64748b);
}
.ds-dict-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 2px;
}
.ds-dict-count {
  font-size: 11px;
  color: var(--ds-text-muted, #94a3b8);
}
.ds-dict-clear-btn {
  border-radius: 9999px;
  padding: 4px 12px;
  font-size: 11px;
}
.ds-mic-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.ds-mic-row .ds-select {
  flex: 1;
  min-width: 0;
}
.ds-audio-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--ds-text-muted, #94a3b8);
  line-height: 1.4;
}
.ds-audio-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #3fb950;
  flex-shrink: 0;
}
.ds-audio-dot.warn {
  background: #d29922;
}
.ds-toggle-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background-color: var(--ds-input-bg, #0f1115);
  border: 1px solid var(--ds-border, #2a2e37);
}
.ds-toggle-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ds-toggle-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #e2e8f0);
}
.ds-switch {
  position: relative;
  width: 38px;
  height: 22px;
  border-radius: 9999px;
  background: #2d3340;
  border: 1px solid var(--ds-border, #2a2e37);
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  transition: background-color 0.16s, border-color 0.16s;
}
.ds-switch[aria-checked="true"] {
  background: var(--ds-accent, #3b82f6);
  border-color: var(--ds-accent, #3b82f6);
}
.ds-switch::after {
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
.ds-switch[aria-checked="true"]::after {
  transform: translateX(16px);
}
.ds-switch:focus-visible {
  outline: 2px solid var(--ds-accent, #3b82f6);
  outline-offset: 2px;
}
.ds-volume-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background-color: var(--ds-input-bg, #0f1115);
  border: 1px solid var(--ds-border, #2a2e37);
  transition: opacity 0.15s;
}
.ds-volume-card.disabled {
  opacity: 0.48;
}
.ds-volume-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ds-volume-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ds-volume-slider {
  flex: 1;
  accent-color: var(--ds-accent, #3b82f6);
  cursor: pointer;
  height: 4px;
}
.ds-volume-slider:disabled {
  cursor: not-allowed;
}
.ds-volume-pct {
  min-width: 38px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #e2e8f0);
}

/* \u2500\u2500\u2500 Home Screen Widget & Visibility Settings \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.ds-home-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 8px;
  background-color: var(--bg-panel, #181b20);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  color: var(--text-primary, #e2e8f0);
}
.ds-home-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.ds-home-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ds-home-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}
.ds-home-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-muted, #94a3b8);
}
.ds-home-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.ds-home-status {
  font-size: 12px;
  color: #86efac;
}
.ds-home-error {
  font-size: 12px;
  color: #fca5a5;
}
.ds-vis-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: var(--text-primary, #e2e8f0);
}
.ds-vis-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.ds-vis-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.ds-vis-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted, #94a3b8);
}
.ds-vis-status-slot {
  min-width: 56px;
  text-align: right;
}
.ds-vis-status {
  font-size: 11px;
  color: var(--text-muted, #94a3b8);
}
.ds-vis-error {
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #fca5a5;
  font-size: 12px;
}
.ds-vis-presets {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 8px;
}
.ds-vis-preset-card {
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
.ds-vis-preset-card:hover:not(:disabled) {
  border-color: var(--text-subtle, #64748b);
  background: rgba(255, 255, 255, 0.04);
}
.ds-vis-preset-card.active {
  border-color: var(--accent, #3b82f6);
  background: rgba(59, 130, 246, 0.14);
}
.ds-vis-preset-card:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.ds-vis-preset-label {
  font-size: 12px;
  font-weight: 600;
}
.ds-vis-preset-desc {
  font-size: 11px;
  line-height: 1.35;
  color: var(--text-muted, #94a3b8);
}
.ds-vis-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ds-vis-help {
  color: var(--text-muted, #94a3b8);
}
.ds-vis-select-row {
  flex-wrap: wrap;
}
.ds-vis-select {
  width: auto !important;
  min-width: 220px;
}
.ds-vis-note {
  margin: 0;
  font-size: 11px;
  color: var(--text-muted, #94a3b8);
}
`;var wo="zcc-ext-draft-studio-styles";function oe(){if(typeof document>"u")return;let e=document.getElementById(wo);e||(e=document.createElement("style"),e.id=wo,document.head.appendChild(e)),e.textContent!==gn&&(e.textContent=gn)}var Jr=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4"];var re=class extends Error{code;constructor(t,o){super(o),this.name="RecordingError",this.code=t}};function Qr(e){return Jr.find(t=>e(t))??null}var ei="audio/webm";function Io(){return{getUserMedia:e=>navigator.mediaDevices.getUserMedia(e),createRecorder:(e,t)=>new MediaRecorder(e,t?{mimeType:t}:void 0),isTypeSupported:e=>typeof MediaRecorder<"u"&&MediaRecorder.isTypeSupported(e)}}async function ti(e,t){let o=t&&t!=="default"?t:void 0,r=o?{audio:{deviceId:{exact:o}}}:{audio:!0};try{return await e.getUserMedia(r)}catch(i){let a=i instanceof Error?i.name:"";if(a==="NotAllowedError"||a==="SecurityError")throw new re("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again.");if(o&&(a==="OverconstrainedError"||a==="NotFoundError"))try{return await e.getUserMedia({audio:!0})}catch(c){let s=c instanceof Error?c.name:"";if(s==="NotAllowedError"||s==="SecurityError")throw new re("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again.")}throw new re("MIC_UNAVAILABLE","No microphone is available. Connect one and try again.")}}function bn(e){return new Promise((t,o)=>{let r=new FileReader;r.onload=()=>{let i=typeof r.result=="string"?r.result:"";t(i.slice(i.indexOf(",")+1))},r.onerror=()=>o(new re("RECORDING_FAILED","The recording could not be read.")),r.readAsDataURL(e)})}async function ni(e,t){let o=new Blob(e,{type:t});return{base64:await bn(o),mimeType:o.type||t}}function oi(e,t){if(!(e>0&&Number.isFinite(e)))return()=>{};let o=setTimeout(t,e);return()=>clearTimeout(o)}var ri="That recording is too large to transcribe. Keep dictation shorter and try again.";function ii(e,t){let o=Math.max(t,e),r=[],i=0,a=!1;return{chunks:r,get overflowed(){return a},add(c){return c.size===0||a?"ignored":i+c.size>o?(a=!0,"overflow"):(r.push(c),i+=c.size,i>=e?"limit-reached":"accepted")}}}function si(e,t){let o=new Promise((r,i)=>{e.onstop=()=>r(),e.onerror=()=>{let a=new re("RECORDING_FAILED","Recording stopped unexpectedly. Try again.");t(a),i(a)}});return o.catch(()=>{}),o}function ai(e,t,o,r){let i=si(e,r);return e.ondataavailable=a=>{let c=t.add(a.data);(c==="limit-reached"||c==="overflow")&&o()},e.start(1e3),i}async function di(e,t,o,r){try{await e}finally{t()}if(o.overflowed)throw new re("RECORDING_FAILED",ri);return ni(o.chunks,r)}function li(e){let t=()=>{};return{stopRecorder(){t(),e.state!=="inactive"&&e.stop()},armTimer(o,r){t=oi(o,r)}}}function ci(e,t){let o=null;return{attach(r){o=r},detach(){o=null},autoStop(){e();let r=o?.onAutoStop;o&&(o.onAutoStop=void 0),r?.()},fail(r){e(),t();let i=o?.onError;o=null,i?.(r)}}}function pi(e,t,o,r){let i=ii(r.maxBytes??9437184,r.hardMaxBytes??10485760),{stopRecorder:a,armTimer:c}=li(e),s=ci(a,t);c(r.maxDurationMs??12e4,s.autoStop);let p=ai(e,i,s.autoStop,s.fail),m={onError:r.onError,onAutoStop:r.onAutoStop,async stop(){a();try{return await di(p,t,i,e.mimeType||o)}finally{s.detach()}},cancel(){a(),t(),s.detach()}};return s.attach(m),m}var be=e=>ui(Io(),e);async function ui(e=Io(),t={}){let o=await ti(e,t.deviceId),r=mi(o),i=o.getTracks(),a,c=()=>{for(let s of i)a&&s.removeEventListener?.("ended",a);r?.close(),i.forEach(s=>s.stop())};try{let s=Qr(e.isTypeSupported)??ei,p=e.createRecorder(o,s),m=pi(p,c,s,t);return m.getAudioLevel=()=>r?.level()??null,a=()=>{let u=m.onError;m.cancel(),u?.(new re("MIC_UNAVAILABLE","Microphone disconnected. Check your device and try again."))},i.forEach(u=>u.addEventListener?.("ended",a)),m}catch(s){throw c(),s instanceof re?s:new re("RECORDING_FAILED",s instanceof Error?s.message:"The recording could not be started.")}}function mi(e){let t;try{t=new AudioContext;let o=t.createMediaStreamSource(e),r=t.createAnalyser();r.fftSize=256,o.connect(r);let i=new Uint8Array(r.fftSize),a=t,c=!1;return{level(){if(a.state&&a.state!=="running")return null;r.getByteTimeDomainData(i);let s=i.reduce((p,m)=>p+((m-128)/128)**2,0)/i.length;return Math.min(1,Math.sqrt(s)*5)},close(){c||(c=!0,o.disconnect(),a.close().catch(s=>console.error("Draft Studio audio meter cleanup failed",s)))}}}catch(o){return t&&t.close().catch(r=>console.error("Draft Studio audio meter cleanup failed",r)),console.warn("Draft Studio audio meter unavailable",o),null}}var yn=["both","main","projects","off"];var fi="both",hn=[{id:"all",label:"Main Screen & Projects",description:"Show on Zana Home, inside Projects, and in all composers.",settings:{showHomeWidget:!0,showInProjects:!0,micVisibility:"both"}},{id:"projects",label:"Projects Only",description:"Show the Draft Studio tab and mic button only inside projects.",settings:{showHomeWidget:!1,showInProjects:!0,micVisibility:"projects"}},{id:"main",label:"Main Screen Only",description:"Show on Zana Home and global composers; hide project tabs and project mics.",settings:{showHomeWidget:!0,showInProjects:!1,micVisibility:"main"}},{id:"mic-only",label:"Composer Mic Only",description:"Hide the Home widget and project tabs; keep only the composer mic.",settings:{showHomeWidget:!1,showInProjects:!1,micVisibility:"both"}}],Eo={both:"Everywhere (Main & Projects)",main:"Main screen composers only",projects:"Project composers only",off:"Hidden"};function To(e,t){if(typeof e=="boolean")return e;if(typeof e=="string"){let o=e.trim().toLowerCase();if(o==="true")return!0;if(o==="false")return!1}return t}function gi(e){return typeof e=="string"&&yn.includes(e)?e:fi}function vn(e){let t=e??{};return{showHomeWidget:To(t.showHomeWidget,!0),showInProjects:To(t.showInProjects,!0),micVisibility:gi(t.micVisibility)}}function Co(e){for(let t of hn)if(t.settings.showHomeWidget===e.showHomeWidget&&t.settings.showInProjects===e.showInProjects&&t.settings.micVisibility===e.micVisibility)return t.id;return"custom"}function Ao(e,t,o){if(e==="off")return!1;if(e==="both")return!0;let r=t&&typeof t=="object"&&"projectId"in t?t.projectId:void 0,i=r!==void 0?r:o,a=typeof i=="string"&&i.length>0;return e==="projects"?a:!a}var ze="draft-studio";function bi(e){return ze}function yi(){try{let e=so;return typeof e=="function"?e:void 0}catch{return}}function hi(){try{return typeof ln=="function"?ln():null}catch{return null}}function $e(){try{return typeof un=="function"?un():null}catch{return null}}function Be(){try{return typeof cn=="function"?cn():null}catch{return null}}function Ge(){try{return typeof pn=="function"?pn():null}catch{return null}}function Ro(){try{return typeof pt=="function"?pt():null}catch{return null}}function vi(){try{return typeof ct=="function"?ct():null}catch{return null}}function Lt(e){let t=vi(),o=x(t);o.current=t;let r=x(e);return r.current=e,U(()=>({async call(i,a){let c=yi(),s=a!==void 0,p=async()=>{if(!c)throw new Error("Draft Studio RPC is unavailable in this environment.");return s?await c(ze,i,a):await c(ze,i)};if(r.current&&r.current!==ze&&c)return p();let m=o.current;if(m)try{return s?await m.call(i,a):await m.call(i)}catch(u){if(c&&u instanceof Error&&/unknown rpc/i.test(u.message))return p();throw u}return p()}}),[])}function Te(e,t){try{typeof dn=="function"&&dn(e,t)}catch{}}function Ee(){let t=hi()?.values,o=vn(t),[r,i]=b(null);return N(()=>{i(null)},[o.showHomeWidget,o.showInProjects,o.micVisibility]),Te(Pt,a=>{a&&typeof a=="object"&&i(vn(a))}),r??o}async function Ot(e,t){if(typeof an!="function")throw new Error("Plugin settings API is unavailable in this environment.");await an(bi(e),t)}var xi={start:[{frequency:523.25,offsetSec:0,durationSec:.11,type:"sine",peakFactor:.9},{frequency:659.25,offsetSec:.075,durationSec:.14,type:"sine",peakFactor:1}],stop:[{frequency:493.88,offsetSec:0,durationSec:.1,type:"sine",peakFactor:.85}],complete:[{frequency:659.25,offsetSec:0,durationSec:.1,type:"sine",peakFactor:.85},{frequency:783.99,offsetSec:.075,durationSec:.16,type:"sine",peakFactor:1}],error:[{frequency:329.63,offsetSec:0,durationSec:.12,type:"triangle",peakFactor:.9},{frequency:246.94,offsetSec:.095,durationSec:.16,type:"triangle",peakFactor:.9}]},Ht=null;function Si(){if(typeof window>"u")return null;let e=window.AudioContext??window.webkitAudioContext;return e?((!Ht||Ht.state==="closed")&&(Ht=new e),Ht):null}function Do(e,t,o){let r=e.currentTime,i=xi[t],a=null,c=0;for(let s of i){let p=e.createOscillator(),m=e.createGain(),u=r+s.offsetSec,g=u+s.durationSec,y=s.offsetSec+s.durationSec+.02,h=o*(s.peakFactor??1);y>=c&&(c=y,a=p),p.type=s.type??"sine",p.frequency.setValueAtTime(s.frequency,u),m.gain.setValueAtTime(1e-4,u),m.gain.exponentialRampToValueAtTime(Math.max(2e-4,h),u+.015),m.gain.exponentialRampToValueAtTime(1e-4,g),p.connect(m),m.connect(e.destination),p.start(u),p.stop(g+.02)}return{finalOsc:a,totalDurationSec:c}}function ko(e,t){let o=Math.ceil(t*1e3)+40;return new Promise(r=>{let i=!1,a=null,c=()=>{i||(i=!0,a!==null&&clearTimeout(a),e&&typeof e.removeEventListener=="function"&&e.removeEventListener("ended",c),r())};if(e&&typeof e.addEventListener=="function")e.addEventListener("ended",c,{once:!0});else if(e&&"onended"in e){let s=e.onended;e.onended=function(p){typeof s=="function"&&s.call(this,p),c()}}a=setTimeout(c,o)})}async function wi(e){if(e.state!=="suspended")return e.state==="running";let t=null;try{return await Promise.race([e.resume(),new Promise(o=>{t=setTimeout(o,750)})]),e.state!=="suspended"}catch{return!1}finally{t!==null&&clearTimeout(t)}}function F(e,t){if(!t.enabled)return null;let o=Math.min(100,Math.max(0,t.volume));if(!Number.isFinite(o)||o<=0)return null;try{let r=Si();if(!r)return null;let i=o/100*.2;if(r.state==="suspended")return(async()=>{if(!await wi(r))return;let{finalOsc:p,totalDurationSec:m}=Do(r,e,i);await ko(p,m)})().catch(()=>{});let{finalOsc:a,totalDurationSec:c}=Do(r,e,i);return ko(a,c)}catch{return null}}var xn=16e3,Po=44,ut=2,Ii="This recording couldn't be prepared for Local Whisper. Try again.",Ti=async(e,t)=>{let r=await new OfflineAudioContext(1,1,t).decodeAudioData(e),i=Array.from({length:r.numberOfChannels},(a,c)=>r.getChannelData(c));return{sampleRate:r.sampleRate,channels:i}};function Ei(e){if(e.length===0)return new Float32Array(0);if(e.length===1)return e[0];let t=Math.min(...e.map(r=>r.length)),o=new Float32Array(t);for(let r=0;r<t;r+=1){let i=0;for(let a of e)i+=a[r];o[r]=i/e.length}return o}function Ci(e,t){let o=e.length*ut,r=new Uint8Array(Po+o),i=new DataView(r.buffer),a=(c,s)=>{for(let p=0;p<s.length;p+=1)i.setUint8(c+p,s.charCodeAt(p))};a(0,"RIFF"),i.setUint32(4,36+o,!0),a(8,"WAVE"),a(12,"fmt "),i.setUint32(16,16,!0),i.setUint16(20,1,!0),i.setUint16(22,1,!0),i.setUint32(24,t,!0),i.setUint32(28,t*ut,!0),i.setUint16(32,ut,!0),i.setUint16(34,8*ut,!0),a(36,"data"),i.setUint32(40,o,!0);for(let c=0;c<e.length;c+=1){let s=Math.max(-1,Math.min(1,e[c]));i.setInt16(Po+c*ut,s<0?s*32768:s*32767,!0)}return r}function Ai(e){let t=atob(e),o=new Uint8Array(t.length);for(let r=0;r<t.length;r+=1)o[r]=t.charCodeAt(r);return o.buffer}async function Ri(e,t=Ti){let o;try{let r=await t(Ai(e.base64),xn);if(r.sampleRate!==xn)throw new Error("decoder ignored the requested sample rate");o=Ci(Ei(r.channels),xn)}catch{throw new re("RECORDING_FAILED",Ii)}return{base64:await bn(new Blob([o],{type:"audio/wav"})),mimeType:"audio/wav"}}async function We(e,t,o=Ri){return(await e.call(me).catch(()=>null))?.audioFormat==="wav"?o(t):t}var No=globalThis.__ZCC_HOST_REACT__,K=No.Fragment;function n(e,t,o){return No.createElement(e,o===void 0?t:{...t,key:o})}var d=n;var Di={system:"Zana Voice",openai:"OpenAI Whisper","google-gemini":"Google Gemini","local-whisper":"Local Whisper"};function ki(e,t){let[o,r]=b("system"),[i,a]=b("assistant");return N(()=>{let c=!0;return e.call(me).then(s=>{if(!c||!s||typeof s!="object")return;let p=s;p.sttProvider&&r(p.sttProvider),p.llmProvider&&a(p.llmProvider)}).catch(()=>{}),e.call(Se).then(s=>{!c||!s||typeof s!="object"||(t.current=ge(s))}).catch(()=>{}),()=>{c=!1}},[t,e]),{sttProvider:o,llmProvider:i}}function Pi(e){let[t,o]=b(0);return N(()=>{if(e!=="recording"){o(0);return}let r=Date.now(),i=setInterval(()=>{o(Math.floor((Date.now()-r)/1e3))},250);return()=>clearInterval(i)},[e]),t}async function Ni(e,t,o,r,i,a,c){let s={enabled:o.soundCuesEnabled,volume:o.soundCuesVolume},p=await e.stop();if(!i.current)return;F("stop",s);let m=await We(t,p),u=await t.call(Ve,{audio:m.base64,mimeType:m.mimeType,source:"home",...a.projectId?{projectId:a.projectId}:{},...typeof a.audioDurationMs=="number"?{audioDurationMs:a.audioDurationMs}:{}});if(i.current){if(u.ok&&u.status==="ok"){F("complete",s),typeof r?.toCompose=="function"?(r.toCompose({initialPrompt:u.text,focusPrompt:!0}),c.setNotice("Draft opened in new thread composer.")):c.setNotice(u.text);return}if(u.ok&&u.status==="no-speech"){c.setNotice("No speech detected. Try again.");return}u.ok||(F("error",s),c.setError(u.message))}}async function _i(e,t,o){let r={enabled:e.soundCuesEnabled,volume:e.soundCuesVolume},i=F("start",r);if(i&&(await i,!o()))return null;let a=await(e.micDeviceId!==$?t({deviceId:e.micDeviceId}):t());return o()?a:(a.cancel(),null)}function Mi(e,t,o,r){let[i,a]=b("idle"),[c,s]=b(null),[p,m]=b(null),u=x(!0),g=x(null),y=x(null),h=x(0),C=x(fe()),{sttProvider:k,llmProvider:D}=ki(e,C),P=Pi(i);N(()=>(u.current=!0,()=>{u.current=!1,h.current++,g.current?.cancel(),g.current=null}),[]);let w=E(async()=>{let v=g.current;g.current=null;let z=y.current;y.current=null;let q=z!==null?Math.max(0,Date.now()-z):void 0;if(!v){a("idle");return}let I=C.current;a("transcribing");try{await Ni(v,e,I,t,u,{projectId:r,audioDurationMs:q},{setNotice:s,setError:m})}catch(X){if(!u.current)return;F("error",{enabled:I.soundCuesEnabled,volume:I.soundCuesVolume}),m(X instanceof Error?X.message:"Quick dictation failed.")}finally{u.current&&a("idle")}},[t,r,e]),O=E(async()=>{m(null),s(null);let v=fe();C.current=v;let z={enabled:v.soundCuesEnabled,volume:v.soundCuesVolume},q=++h.current;a("starting");try{let I=await _i(v,o,()=>u.current&&h.current===q);if(!I)return;I.onError=X=>{g.current=null,y.current=null,u.current&&(F("error",z),m(X.message),a("idle"))},I.onAutoStop=()=>{u.current&&w()},g.current=I,y.current=Date.now(),a("recording")}catch(I){if(!u.current)return;F("error",z),m(I instanceof Error?I.message:"Microphone access denied."),a("idle")}},[o,w]),j=E(()=>{h.current++,y.current=null,g.current?.cancel(),g.current=null,a("idle")},[]);return{sttProvider:k,llmProvider:D,phase:i,seconds:P,notice:c,error:p,start:O,stopAndTranscribe:w,cancel:j}}function Li({phase:e,formattedTime:t,onToggleDictate:o,onCancel:r,onOpenStudio:i,onOpenHistory:a}){let c=e==="starting"?"Starting mic\u2026":e==="recording"?`Stop & Compose (${t})`:e==="transcribing"?"Transcribing\u2026":"Dictate to New Thread";return d("div",{className:"ds-home-actions",children:[n("button",{type:"button",className:`ds-btn ${e==="recording"?"ds-btn-danger":"ds-btn-primary"}`,disabled:e==="starting"||e==="transcribing",onClick:o,children:c}),e==="starting"||e==="recording"?n("button",{type:"button",className:"ds-btn",onClick:r,children:"Cancel"}):d(K,{children:[n("button",{type:"button",className:"ds-btn",onClick:i,children:"Open Draft Studio"}),n("button",{type:"button",className:"ds-btn",onClick:a,children:"History"})]})]})}function _o(e){return Ee().showHomeWidget?n(Oi,{...e}):null}function Oi({pluginId:e,projectId:t,startSession:o=be}){oe();let r=Lt(e),i=Ge(),a=Mi(r,i,o,t),c=E(()=>{if(Ue("studio"),t&&typeof i?.toProject=="function"){i.toProject(t,{tabId:Pe});return}i?.toPluginPanel?.(pe)},[i,t]),s=E(()=>{if(Ue("history"),t&&typeof i?.toProject=="function"){i.toProject(t,{tabId:Pe});return}i?.toPluginPanel?.(pe,{subPath:Ie})},[i,t]),p=()=>{a.phase==="recording"?a.stopAndTranscribe():a.phase==="idle"&&a.start()},m=`${Math.floor(a.seconds/60)}:${String(a.seconds%60).padStart(2,"0")}`,u=Di[a.sttProvider]??a.sttProvider,g=a.llmProvider==="none"?"Raw transcript":"AI cleanup on";return d("div",{className:"ds-home-card","data-testid":"ds-home-widget",children:[d("div",{className:"ds-home-card-top",children:[d("div",{className:"ds-home-copy",children:[d("div",{className:"ds-home-heading",children:[n("span",{"aria-hidden":"true",children:"\u{1F399}\uFE0F"}),n("span",{children:"Dictate a new thread or refine in Draft Studio"})]}),d("div",{className:"ds-home-meta",children:[n("span",{children:u}),n("span",{"aria-hidden":"true",children:"\xB7"}),n("span",{children:g})]})]}),n(Li,{phase:a.phase,formattedTime:m,onToggleDictate:p,onCancel:a.cancel,onOpenStudio:c,onOpenHistory:s})]}),a.notice?n("div",{role:"status",className:"ds-home-status",children:a.notice}):null,a.error?n("div",{role:"alert",className:"ds-home-error",children:a.error}):null]})}function Ye(e,t){let o=t.trim();return o?e?/\s$/.test(e)?`${e}${o}`:`${e} ${o}`:o:e}var Hi="No speech detected.",Sn={phase:"idle",notice:null,error:null};function Mo(e,t){switch(t.type){case"START":return e.phase==="idle"||e.phase==="error"?{phase:"starting",notice:null,error:null}:e;case"STARTED":return e.phase==="starting"?{...e,phase:"recording"}:e;case"STOP":return e.phase==="recording"||e.phase==="starting"?{phase:"processing",notice:null,error:null}:e;case"CANCEL":return e.phase==="recording"||e.phase==="starting"?{...Sn}:e;case"SUCCESS":case"NO_SPEECH":return e.phase!=="processing"?e:{phase:"idle",notice:t.type==="NO_SPEECH"?Hi:t.notice,error:null};case"CLEAR_NOTICE":return e.notice?{...e,notice:null}:e;case"FAILURE":return{phase:"error",notice:null,error:t.message}}}var ji="Draft Studio returned an unexpected response. Try again.",Fi="Dictation failed. Try again.",Vi=4e3;function Ui(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}function zi(e){return typeof e=="object"&&e!==null&&!("ok"in e&&"status"in e)}function wn(e,t){if(e==null)return{projectId:t?.projectId||void 0,threadId:t?.threadId||void 0};if(e==="global"||typeof e=="object"&&e.kind==="global"){let o=typeof e=="object"?e:null;return{projectId:o?.projectId||void 0,threadId:o?.threadId||void 0}}if(typeof e=="object"){let o="projectId"in e&&e.projectId!==void 0,r="threadId"in e&&e.threadId!==void 0;return{projectId:(o?e.projectId:t?.projectId)||void 0,threadId:(r?e.threadId:t?.threadId)||void 0}}return{projectId:t?.projectId||void 0,threadId:t?.threadId||void 0}}async function $i(e,t,o){let r=await We(e,t),i=await e.call(Ve,{audio:r.base64,mimeType:r.mimeType,source:"composer",...o.projectId?{projectId:o.projectId}:{},...o.threadId?{threadId:o.threadId}:{},...typeof o.audioDurationMs=="number"?{audioDurationMs:o.audioDurationMs}:{}});if(!Ui(i))throw new Error(ji);return i}function Lo(e){return e instanceof Error&&e.message?e.message:Fi}function qe(e){return{enabled:e.soundCuesEnabled,volume:e.soundCuesVolume}}function Bi(e,t,o,r=fe()){if(!e.ok){F("error",qe(r)),o({type:"FAILURE",message:e.message});return}if(e.status==="no-speech"){o({type:"NO_SPEECH"});return}F("complete",qe(r)),t.updateText(a=>Ye(a,e.text)),t.focus();let i=e.refineNotice?`Inserted the raw transcript. ${e.refineNotice.message}`:"Added to draft.";o({type:"SUCCESS",notice:i})}function Gi(e,t,o,r){return t()?(e.onError=i=>{t()&&r(i)},e.onAutoStop=()=>{t()&&o()},e):(e.cancel(),null)}function Wi(e,t,o,r,i,a){let c=s=>{F("error",qe(a())),i({type:"FAILURE",message:Lo(s)})};return e.then(s=>{if(!s)return null;let p=Gi(s,o,r,m=>{t.current=null,c(m)});return p&&(t.current=p),p},s=>(o()&&c(s),null))}function Yi(e,t,o){let r=x(null),i=x(null),a=x(0),c=x(!0),s=E(()=>{a.current++,i.current=null,r.current&&(r.current.cancel(),r.current=null),t({type:"CANCEL"})},[t]);N(()=>(c.current=!0,()=>{c.current=!1,s()}),[s]);let p=E(async()=>{let y=i.current?await i.current:r.current;return r.current=null,y},[]),m=E(async(y,h)=>{let C=++a.current,k=()=>c.current&&a.current===C,D=F("start",qe(h)),w=Wi((async()=>D&&(await D,!k())?null:await(h.micDeviceId!==$?e({deviceId:h.micDeviceId}):e()))(),r,k,y,t,o);i.current=w,await w&&k()&&t({type:"STARTED"}),i.current===w&&(i.current=null)},[t,o,e]),u=E(()=>c.current,[]),g=E(()=>r.current?.getAudioLevel?.()??null,[]);return{start:m,takeSession:p,cancel:s,isMounted:u,getAudioLevel:g}}function Oo({startSession:e=be,noticeDurationMs:t=Vi}={}){let o=pt(),r=$e(),i=Be(),a=ct(),c=x(a);c.current=a;let[s,p]=co(Mo,Sn),m=x(s.phase);m.current=s.phase;let u=x(null),g=x(fe()),y=x(null),h=E(()=>g.current,[]),{start:C,takeSession:k,cancel:D,isMounted:P,getAudioLevel:w}=Yi(e,p,h),[O,j]=b(null),[v,z]=b(0),[q,I]=b(!1),X=x({});X.current=wn(r?.scope,i),N(()=>{let B=!0;return c.current.call(Se).then(Z=>{if(!B||!zi(Z))return;let ye=ge(Z);u.current=ye,(m.current==="idle"||m.current==="error")&&(g.current=ye)}).catch(()=>{}),()=>{B=!1}},[]),N(()=>{if(s.phase!=="recording"){j(null),z(0);return}let B=Date.now();y.current=B;let Z=()=>{j(w()),z(Math.floor((Date.now()-B)/1e3))};Z();let ye=setInterval(Z,100);return()=>clearInterval(ye)},[w,s.phase]),N(()=>{if(!s.notice)return;let B=setTimeout(()=>{p({type:"CLEAR_NOTICE"})},t);return()=>clearTimeout(B)},[t,s.notice]);let H=E(()=>{p({type:"CLEAR_NOTICE"})},[]),ne=E(async()=>{let B=g.current,Z=y.current;y.current=null;let ye=Z!==null?Math.max(0,Date.now()-Z):void 0;p({type:"STOP"});let Je=await k();if(!(!P()||!Je))try{let Qe=await Je.stop();if(!P())return;F("stop",qe(B));let ft=await $i(a,Qe,{...X.current,audioDurationMs:ye});if(!P())return;Bi(ft,o,p,B)}catch(Qe){if(!P())return;F("error",qe(B)),p({type:"FAILURE",message:Lo(Qe)})}},[o,P,a,k]),Ne=E(async()=>{let B=mn()??u.current??xe({});g.current=B,I(!1),p({type:"START"}),await C(()=>{I(!0),ne()},B)},[ne,C]),Wt=E(()=>{s.phase==="recording"||s.phase==="starting"?ne():s.phase!=="processing"&&Ne()},[Ne,ne,s.phase]);return{phase:s.phase,error:s.error,notice:s.notice,level:O,seconds:v,autoStopped:q,onClick:Wt,cancel:D,clearNotice:H,beginDictation:Ne,finishDictation:ne}}var qi="Dictation",Zi={idle:"Start dictation",starting:"Stop dictation",recording:"Stop dictation",processing:"Transcribing",error:"Start dictation"},Ho={position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",border:0};function jo({startSession:e=be}){let t=Ee(),o=$e(),r=Be();return Ao(t.micVisibility,o?.scope,r?.projectId)?n(Ki,{startSession:e}):null}function Ki({startSession:e=be}){oe();let{phase:t,error:o,notice:r,onClick:i,cancel:a,clearNotice:c,level:s,seconds:p,autoStopped:m}=Oo({startSession:e}),u=t==="starting"||t==="recording"||t==="processing",g=t==="idle"&&!!r,y=`${Math.floor(p/60)}:${String(p%60).padStart(2,"0")}`;return d("div",{className:`ds-mic ds-dictation-pill ds-phase-${t} ${g?"ds-has-notice":""}`,onClick:g?c:void 0,title:g?"Click to dismiss":void 0,children:[n("button",{type:"button",className:`ds-mic-button ds-mic-${t} ${u?"ds-pill-btn-stop":"ds-idle-icon"}`,"aria-label":qi,"aria-pressed":t==="recording"||t==="starting",title:Zi[t],disabled:t==="processing",onClick:i,style:g?{display:"none"}:void 0,children:t==="idle"||t==="error"?n("svg",{viewBox:"0 0 24 24",width:"16",height:"16","aria-hidden":"true",focusable:"false",children:n("path",{d:"M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5Zm6 9h2v-3h-2v3Z",fill:"currentColor"})}):t==="processing"?n("span",{className:"ds-mic-spinner","aria-hidden":"true"}):n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("rect",{x:"6",y:"6",width:"12",height:"12",rx:"2.5",fill:"currentColor"})})}),g?d("span",{role:"status",className:"ds-notice-content",children:[n("span",{className:"ds-notice-check",children:"\u2713"}),n("span",{className:"ds-pill-status",children:r})]}):null,t==="starting"?d(K,{children:[d("div",{className:"ds-pill-timer-badge",children:[n("div",{className:"ds-pill-dot ds-pill-dot-starting"}),n("span",{className:"ds-pill-timer-text",children:"0:00"})]}),d("div",{className:"ds-pill-center",role:"status",children:[n("span",{className:"ds-mic-spinner","aria-hidden":"true"}),n("span",{className:"ds-pill-status",children:"Requesting microphone\u2026"})]})]}):null,t==="recording"?d(K,{children:[d("div",{className:"ds-pill-timer-badge",children:[n("div",{className:"ds-pill-dot"}),d("span",{className:"ds-pill-timer-text",children:[n("span",{className:"ds-sr-only",style:Ho,children:"Recording "}),y]})]}),d("div",{className:"ds-pill-center",role:"status",children:[s===null?n("span",{className:"ds-sr-only",style:Ho,children:"Audio meter unavailable"}):null,n("span",{className:`ds-pill-waveform ${s===null?"animated":""}`,"aria-label":"Microphone audio activity",role:"meter","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":Math.round((s??.3)*100),children:[.4,.7,1,.7,.4].map((h,C)=>n("span",{className:"ds-pill-waveform-bar",style:s!==null?{height:`${Math.max(3,s*h*20)}px`}:void 0},C))}),n("span",{className:"ds-pill-status",children:"Listening..."}),s!==null&&s<.015&&p>=5?n("span",{className:"ds-mic-quiet-warning",children:"No audio detected \u2014 check your microphone."}):null]})]}):null,t==="processing"?d(K,{children:[n("div",{className:"ds-pill-timer-badge",children:n("span",{className:"ds-pill-timer-text",children:y})}),n("div",{className:"ds-pill-center",role:"status",children:d("span",{className:"ds-pill-status",children:[n("span",{className:"ds-mic-spinner","aria-hidden":"true"})," ",m?"Recording limit reached. ":"","Transcribing and refining\u2026"]})})]}):null,t==="starting"||t==="recording"?n("button",{type:"button",className:"ds-mic-cancel ds-pill-btn-cancel",onClick:a,"aria-label":"Cancel recording",title:"Cancel recording",children:n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("path",{d:"M18 6L6 18M6 6l12 12",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round"})})}):null,t==="error"&&o?n("span",{role:"alert",className:"ds-pill-status ds-mic-error",children:o}):null]})}var Xi=500,Ji=5e3;function In(e){return e>=1e3**3?`${(e/1e3**3).toFixed(1)} GB`:`${Math.round(e/1e3**2)} MB`}function Qi(e){return e.runtime.status==="installing"||e.server.state==="starting"||e.models.some(t=>t.status==="downloading")}function es(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}function ts(e){let[t,o]=b(null),[r,i]=b(null),[a,c]=b(null),s=x(!0),p=E(y=>{if(s.current){if(!es(y)){i("Local Whisper returned an unexpected response.");return}y.state&&o(y.state),i(y.ok?null:y.message)}},[]),m=E(()=>e.call(ce.state).then(p,()=>s.current&&i("Could not load Local Whisper status.")),[e,p]),u=E(async(y,h,C)=>{c(y);try{p(await e.call(h,C))}catch{s.current&&i("Local Whisper request failed. Try again.")}finally{s.current&&c(null)}},[e,p]);N(()=>(s.current=!0,m(),()=>{s.current=!1}),[m]);let g=t?Qi(t):!1;return N(()=>{let y=setInterval(()=>void m(),g?Xi:Ji);return()=>clearInterval(y)},[g,m]),{state:t,error:r,pending:a,run:u}}function Tn({tone:e}){return n("span",{"aria-hidden":"true",style:{width:9,height:9,borderRadius:"50%",marginTop:4,flex:"none",background:{ok:"var(--ds-success)",warn:"var(--ds-warn)",err:"var(--ds-danger)",busy:"var(--ds-accent)",idle:"var(--ds-text-muted)"}[e]}})}function Fo({value:e,label:t}){let o=Math.round(e*100);return n("div",{role:"progressbar","aria-label":t,"aria-valuenow":o,"aria-valuemin":0,"aria-valuemax":100,style:{height:5,minWidth:80,background:"var(--ds-bg-hover)",borderRadius:3,overflow:"hidden"},children:n("div",{style:{width:`${o}%`,height:"100%",background:"var(--ds-accent)"}})})}var jt={display:"flex",gap:10,alignItems:"flex-start",padding:"10px 12px",borderRadius:6,border:"1px solid var(--ds-border)"},Ce={color:"var(--ds-text-muted)",fontSize:11};function ns(e){let{runtime:t,server:o,activeModelId:r}=e;return t.status==="not-installed"?{tone:"idle",title:"Runtime not installed",detail:`whisper.cpp ${t.version} \xB7 requires ${t.requirements.join(", ")||"no extra components"}`,action:{label:"Install runtime",method:ce.installRuntime,primary:!0}}:t.status==="installing"?{tone:"busy",title:`Installing runtime\u2026 ${Math.round((t.progress??0)*100)}%`,detail:"Verifying the download as it arrives.",action:{label:"Cancel",method:ce.cancelRuntimeInstall}}:o.state==="running"?{tone:"ok",title:"Running",detail:`Model ${o.modelId} \xB7 on this device (127.0.0.1) \xB7 managed by Draft Studio`,action:{label:"Stop",method:ce.stop}}:o.state==="starting"?{tone:"busy",title:"Starting\u2026",detail:`Loading model ${o.modelId}.`}:o.state==="crashed"?{tone:"err",title:"Stopped unexpectedly",detail:`Exit code ${o.exitCode??"unknown"}. Logs contain no audio or transcripts.`,action:{label:"Restart",method:ce.start,primary:!0}}:r?{tone:"warn",title:"Stopped",detail:"Starts automatically when you dictate.",action:{label:"Start",method:ce.start}}:{tone:"warn",title:"Runtime installed",detail:"Download a model below and choose Use to start."}}function os({model:e,state:t,pending:o,onRun:r}){let i=t.activeModelId===e.id,a=t.runtime.status==="installed"&&!i,c=u=>`${u}:${e.id}`,s={modelId:e.id},p=null,m;return e.status==="downloading"?(p=d(K,{children:[n(Fo,{value:e.progress??0,label:`Downloading ${e.label}`}),d("span",{style:Ce,children:[Math.round((e.progress??0)*100),"% of ",In(e.sizeBytes)]})]}),m=n("button",{type:"button",className:"ds-btn",onClick:()=>r(c("cancel"),ce.cancelModelDownload,s),children:"Cancel"})):e.status==="available"?m=d("button",{type:"button",className:"ds-btn",disabled:o===c("download"),onClick:()=>r(c("download"),ce.downloadModel,s),children:["Download ",In(e.sizeBytes)]}):(p=i?n("span",{className:"ds-tag",children:"Active"}):o===c("use")?n("span",{className:"ds-tag",children:"Loading\u2026"}):n("span",{className:"ds-tag",children:"Installed"}),m=d(K,{children:[a&&n("button",{type:"button",className:"ds-btn",disabled:o!==null,onClick:()=>r(c("use"),ce.selectModel,s),children:"Use"}),n("button",{type:"button",className:"ds-btn ds-btn-danger",disabled:i||o!==null,title:i?"Choose another model before removing this one":void 0,"aria-label":`Remove ${e.label}`,onClick:()=>r(c("remove"),ce.removeModel,s),children:"Remove"})]})),d("tr",{style:i?{background:"color-mix(in srgb, var(--ds-accent) 10%, transparent)"}:void 0,children:[d("td",{style:{padding:"8px 6px"},children:[n("strong",{children:e.label})," ",e.recommended&&n("span",{className:"ds-tag",children:"Recommended"})]}),d("td",{style:{padding:"8px 6px",...Ce},children:[In(e.sizeBytes)," disk",e.memoryEstimate?d(K,{children:[n("br",{}),e.memoryEstimate," RAM"]}):null]}),n("td",{style:{padding:"8px 6px"},children:n("div",{style:{display:"flex",flexDirection:"column",gap:4},children:p})}),n("td",{style:{padding:"8px 6px",textAlign:"right",whiteSpace:"nowrap"},children:n("div",{style:{display:"inline-flex",gap:6},children:m})})]})}function rs(e,t){let o=e==="local-whisper";return o&&t==="none"?{offline:!0,text:"Audio and text stay on this device."}:o?{offline:!1,text:"Audio stays on this device. Cleanup sends the transcript to your selected cleanup model."}:{offline:!1,text:"Audio leaves this device for transcription."}}function Vo({rpc:e,sttProvider:t,llmProvider:o,onApplyPreset:r,onReadyChange:i}){let{state:a,error:c,pending:s,run:p}=ts(e),m=rs(t,o),u=!!(a?.platform.supported&&a.runtime.status==="installed"&&a.activeModelId!==null),g=x(null),y=x(i);return y.current=i,N(()=>{a&&(g.current!==null&&g.current!==u&&y.current?.(u),g.current=u)},[a,u]),d("section",{className:"ds-pane",style:{flex:"none"},"aria-labelledby":"ds-lw-title",children:[d("div",{className:"ds-pane-header",children:[n("h2",{id:"ds-lw-title",className:"ds-pane-title",style:{margin:0},children:"Local Whisper"}),n("span",{className:"ds-tag",children:a?a.platform.supported?u?"Ready":"Not set up":"Unavailable":"Loading\u2026"})]}),d("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[n("p",{style:{...Ce,margin:0},children:"Transcribe on this device. Audio is never sent anywhere when Local Whisper is the speech provider."}),(c||a?.lastError)&&n("div",{role:"alert",style:{...jt,borderColor:"var(--ds-danger)",color:"var(--ds-danger)",fontSize:12},children:c??a?.lastError?.message}),a&&!a.platform.supported&&d("div",{style:jt,children:[n(Tn,{tone:"err"}),d("div",{children:[n("strong",{children:"Not available on this computer"}),n("div",{style:Ce,children:a.platform.message})]})]}),a?.platform.supported&&n(is,{state:a,pending:s,onRun:p}),a?.platform.supported&&d("div",{children:[d("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"baseline"},children:[n("span",{className:"ds-field-label",children:"Models \xB7 multilingual"}),n("span",{style:Ce,children:"Stored in this computer's app data"})]}),d("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:12},children:[n("thead",{children:n("tr",{children:["Model","Size","Status",""].map(h=>n("th",{style:{textAlign:"left",...Ce,fontWeight:600,padding:"4px 6px"},children:h},h))})}),n("tbody",{children:a.models.map(h=>n(os,{model:h,state:a,pending:s,onRun:p},h.id))})]})]}),d("div",{style:jt,children:[n(Tn,{tone:m.offline?"ok":"warn"}),d("div",{style:{flex:1},children:[n("strong",{children:m.offline?"Fully offline":"Not fully offline"}),n("div",{style:Ce,children:m.text})]}),!m.offline&&n("button",{type:"button",className:"ds-btn",onClick:()=>r({sttProvider:"local-whisper",llmProvider:"none"}),children:"Use offline preset"})]})]})]})}function is({state:e,pending:t,onRun:o}){let r=ns(e);return d("div",{style:jt,"aria-live":"polite",children:[n(Tn,{tone:r.tone}),d("div",{style:{flex:1,minWidth:0},children:[n("strong",{children:r.title}),n("div",{style:Ce,children:r.detail}),e.runtime.status==="installing"&&n("div",{style:{marginTop:6},children:n(Fo,{value:e.runtime.progress??0,label:"Installing runtime"})})]}),r.action&&n("button",{type:"button",className:r.action.primary?"ds-btn ds-btn-primary":"ds-btn",disabled:t==="runtime",onClick:()=>o("runtime",r.action.method),children:r.action.label})]})}function ss({statusMessage:e}){return d("div",{className:"ds-vis-header",children:[d("div",{children:[n("h3",{id:"ds-visibility-heading",className:"ds-vis-title",children:"Where Draft Studio Appears"}),n("p",{className:"ds-vis-subtitle",children:"Control whether Draft Studio surfaces on the main Home screen, inside Projects, and in thread composers."})]}),n("div",{className:"ds-vis-status-slot",children:e?n("span",{role:"status",className:"ds-vis-status",children:e}):null})]})}function as({activePreset:e,disabled:t,onSelect:o}){return n("div",{className:"ds-vis-presets",role:"group","aria-label":"Surface visibility presets",children:hn.map(r=>{let i=e===r.id;return d("button",{type:"button",className:`ds-vis-preset-card ${i?"active":""}`,"aria-pressed":i,disabled:t,onClick:()=>o(r.settings),children:[n("span",{className:"ds-vis-preset-label",children:r.label}),n("span",{className:"ds-vis-preset-desc",children:r.description})]},r.id)})})}function Uo({labelId:e,title:t,helpText:o,checked:r,disabled:i,onToggle:a}){return d("div",{className:"ds-toggle-card",children:[d("div",{className:"ds-toggle-copy",children:[n("span",{id:e,className:"ds-toggle-title",children:t}),n("small",{className:"ds-vis-help",children:o})]}),n("button",{type:"button",className:"ds-switch",role:"switch","aria-checked":r,"aria-labelledby":e,disabled:i,onClick:a})]})}function ds({value:e,disabled:t,onChange:o}){return d("div",{className:"ds-toggle-card ds-vis-select-row",children:[d("div",{className:"ds-toggle-copy",children:[n("label",{htmlFor:"ds-vis-mic-select",className:"ds-toggle-title",children:"Composer mic button placement"}),n("small",{className:"ds-vis-help",children:"Choose which chat composers display the voice dictation mic pill."})]}),n("select",{id:"ds-vis-mic-select","aria-label":"Composer mic button placement",className:"ds-select ds-vis-select",value:e,disabled:t,onChange:r=>o(r.target.value),children:yn.map(r=>n("option",{value:r,children:Eo[r]},r))})]})}function Ft(e){oe();let t=Ee(),o=Co(t),[r,i]=b(!1),[a,c]=b(null),[s,p]=b(null),m=async u=>{i(!0),p(null),c("Saving\u2026");try{await Ot(ze,u),c("Saved")}catch(g){c(null),p(g instanceof Error?g.message:"Could not update visibility settings.")}finally{i(!1)}};return d("section",{className:"ds-vis-section","aria-labelledby":"ds-visibility-heading",children:[n(ss,{statusMessage:a}),s?n("div",{role:"alert",className:"ds-vis-error",children:s}):null,n(as,{activePreset:o,disabled:r,onSelect:u=>void m(u)}),d("div",{className:"ds-vis-controls",children:[n(Uo,{labelId:"ds-vis-home-label",title:"Main Home screen widget",helpText:"Show a quick-dictate & Draft Studio card on Zana\u2019s main Home screen.",checked:t.showHomeWidget,disabled:r,onToggle:()=>void m({showHomeWidget:!t.showHomeWidget})}),n(Uo,{labelId:"ds-vis-projects-label",title:"Draft Studio tab in projects",helpText:"Display a dedicated Draft Studio tab inside each project with project-scoped drafts.",checked:t.showInProjects,disabled:r,onToggle:()=>void m({showInProjects:!t.showInProjects})}),n(ds,{value:t.micVisibility,disabled:r,onChange:u=>void m({micVisibility:u})})]}),d("p",{className:"ds-vis-note",children:["Tip: You can hide or reorder the global ",n("strong",{children:"Draft Studio"})," item in Zana\u2019s left sidebar using Zana\u2019s sidebar customize menu."]})]})}function En(e){if(typeof e!="string")return[];let t=new Set,o=/[,\n]/;for(let r of e.split(o)){let i=r.trim().slice(0,80);if(i&&t.add(i),t.size>=200)break}return[...t]}function zo(e,t){let o=En(t);if(o.length===0)return[...e];let r=new Set(e),i=[...e];for(let a of o){if(i.length>=200)break;r.has(a)||(r.add(a),i.push(a))}return i}function Cn(e){return e.join(`
`)}var $o=[100,500,2e3,0],Bo=[30,90,365,0];function ls(e){return!(e===!1||typeof e=="string"&&e.trim().toLowerCase()==="false")}function Go(e,t,o){let r=typeof e=="number"?e:typeof e=="string"&&e.trim()!==""?Number(e):Number.NaN;if(!Number.isFinite(r)||r<0)return t;let i=Math.round(r);return Math.min(o,i)}function cs(e){return Go(e,500,5e4)}function ps(e){return Go(e,90,3650)}function Wo(e){let t=e??{};return{historyEnabled:ls(t.historyEnabled),historyMaxEntries:cs(t.historyMaxEntries),historyMaxDays:ps(t.historyMaxDays)}}var Vt=[{code:"auto",label:"Detect automatically"},{code:"af",label:"Afrikaans"},{code:"ar",label:"Arabic"},{code:"hy",label:"Armenian"},{code:"az",label:"Azerbaijani"},{code:"eu",label:"Basque"},{code:"be",label:"Belarusian"},{code:"bn",label:"Bengali"},{code:"bs",label:"Bosnian"},{code:"bg",label:"Bulgarian"},{code:"ca",label:"Catalan"},{code:"zh",label:"Chinese"},{code:"hr",label:"Croatian"},{code:"cs",label:"Czech"},{code:"da",label:"Danish"},{code:"nl",label:"Dutch"},{code:"en",label:"English"},{code:"et",label:"Estonian"},{code:"fi",label:"Finnish"},{code:"fr",label:"French"},{code:"gl",label:"Galician"},{code:"ka",label:"Georgian"},{code:"de",label:"German"},{code:"el",label:"Greek"},{code:"gu",label:"Gujarati"},{code:"he",label:"Hebrew"},{code:"hi",label:"Hindi"},{code:"hu",label:"Hungarian"},{code:"is",label:"Icelandic"},{code:"id",label:"Indonesian"},{code:"ga",label:"Irish"},{code:"it",label:"Italian"},{code:"ja",label:"Japanese"},{code:"kn",label:"Kannada"},{code:"kk",label:"Kazakh"},{code:"ko",label:"Korean"},{code:"lv",label:"Latvian"},{code:"lt",label:"Lithuanian"},{code:"mk",label:"Macedonian"},{code:"ms",label:"Malay"},{code:"ml",label:"Malayalam"},{code:"mt",label:"Maltese"},{code:"mr",label:"Marathi"},{code:"ne",label:"Nepali"},{code:"no",label:"Norwegian"},{code:"fa",label:"Persian"},{code:"pl",label:"Polish"},{code:"pt",label:"Portuguese"},{code:"pa",label:"Punjabi"},{code:"ro",label:"Romanian"},{code:"ru",label:"Russian"},{code:"sr",label:"Serbian"},{code:"sk",label:"Slovak"},{code:"sl",label:"Slovenian"},{code:"es",label:"Spanish"},{code:"sw",label:"Swahili"},{code:"sv",label:"Swedish"},{code:"tl",label:"Tagalog"},{code:"ta",label:"Tamil"},{code:"te",label:"Telugu"},{code:"th",label:"Thai"},{code:"tr",label:"Turkish"},{code:"uk",label:"Ukrainian"},{code:"ur",label:"Urdu"},{code:"vi",label:"Vietnamese"},{code:"cy",label:"Welsh"}],Ze="en",An=Vt.filter(e=>e.code!=="auto");function Ke(e){if(typeof e!="string")return;let t=e.trim().toLowerCase();if(t)return An.find(o=>o.code.toLowerCase()===t||o.label.toLowerCase()===t)}function qo(){if(!(typeof navigator>"u"))return navigator.mediaDevices}function us(e){return e.replace(/^default\s*[-–:]\s*/i,"").trim()}function Zo(e){let t=e instanceof Error?e.name:"";return t==="NotAllowedError"||t==="SecurityError"}function Yo(e){let t=e.filter(s=>s.kind==="audioinput"),o=t.some(s=>!!s.label?.trim()),r=null,i=[],a=new Set,c=1;for(let s of t){let p=s.label?.trim()??"";if(s.deviceId===$){p&&(r=us(p)||p);continue}!s.deviceId||a.has(s.deviceId)||(a.add(s.deviceId),i.push({deviceId:s.deviceId,label:p||`Microphone ${c}`,isDefault:!1}),c++)}return{devices:i,defaultDeviceLabel:r,labelsAvailable:o}}async function ms(e){if(!e.getUserMedia||!e.enumerateDevices)return{ok:!1,permissionDenied:!1};try{return(await e.getUserMedia({audio:!0})).getTracks().forEach(o=>o.stop()),{ok:!0,rawDevices:await e.enumerateDevices()}}catch(t){return Zo(t)?{ok:!1,permissionDenied:!0}:(console.warn("Draft Studio failed to refresh audio input devices",t),{ok:!1,permissionDenied:!1})}}async function Ko(e={}){let t=e.mediaDevices??qo();if(!t?.enumerateDevices)return{devices:[],defaultDeviceLabel:null,labelsAvailable:!1,permissionDenied:!1,supported:!1,error:null};let o;try{o=await t.enumerateDevices()}catch(a){return console.warn("Draft Studio failed to enumerate audio input devices",a),{devices:[],defaultDeviceLabel:null,labelsAvailable:!1,permissionDenied:Zo(a),supported:!0,error:"Could not list microphones. Using System default."}}let r=Yo(o),i=!1;if(e.requestPermissionIfUnlabeled&&!r.labelsAvailable){let a=await ms(t);a.ok?r=Yo(a.rawDevices):i=a.permissionDenied}return{...r,permissionDenied:i,supported:!0,error:null}}function Xo(e,t=qo()){if(!t?.addEventListener||!t?.removeEventListener)return()=>{};let o=()=>e();return t.addEventListener("devicechange",o),()=>t.removeEventListener?.("devicechange",o)}function Jo(){let[e,t]=b([]),[o,r]=b(null),[i,a]=b(!0),[c,s]=b(!1),[p,m]=b(null),[u,g]=b(!1),y=x(!0),h=x(0),C=E(async(k=!1)=>{let D=++h.current;y.current&&g(!0);try{let P=await Ko({requestPermissionIfUnlabeled:k});if(!y.current||h.current!==D)return;t(P.devices),r(P.defaultDeviceLabel),a(P.labelsAvailable),s(P.permissionDenied),m(P.error)}catch(P){if(console.warn("Draft Studio audio device lookup failed",P),!y.current||h.current!==D)return;t([]),m("Could not list microphones. Using System default.")}finally{y.current&&h.current===D&&g(!1)}},[]);return N(()=>{y.current=!0,C(!1);let k=Xo(()=>{C(!1)});return()=>{y.current=!1,h.current++,k()}},[C]),{devices:e,defaultDeviceLabel:o,labelsAvailable:i,permissionDenied:c,error:p,isRefreshing:u,refresh:C}}var vs={"Voice & transcription":[{key:"sttProvider",label:"Speech-to-text provider",options:["system","google-gemini","openai","local-whisper"],help:"Only configured speech providers are shown. Add API keys in Zana\u2019s Draft Studio plugin settings or set up Local Whisper below."},{key:"inputLanguage",label:"Input language",options:Vt.map(e=>e.code),help:"Spoken language for transcription, or Detect automatically."},{key:"dictionary",label:"Personal dictionary",help:"Add specific names, acronyms, or technical terms to guarantee accurate spelling."}],"Draft Studio":[{key:"tone",label:"Cleanup tone",options:[...ho],help:"Fixes grammar and clarity in the original language without extending text length."},{key:"customPrompt",label:"Custom cleanup instructions",multiline:!0}],Connections:[]},Rn={sttProvider:"system",inputLanguage:"auto",tone:"standard"},Qo={...Object.fromEntries(Vt.map(e=>[e.code,e.label])),standard:"Standard (Fix & clarify)",casual:"Casual",conversational:"Conversational",formal:"Professional",technical:"Technical",custom:"Custom",system:"Zana voice",none:"Off",assistant:"Zana assistant",openai:"OpenAI",anthropic:"Anthropic",google:"Google AI","google-gemini":"Google Gemini","local-whisper":"Local Whisper (on this device)"};function xs(e,t,o){return e.error?{warn:!0,text:e.error}:e.permissionDenied?{warn:!0,text:"Microphone permission denied. Allow microphone access in system settings to see device names."}:t.micDeviceId!==$&&!o?{warn:!0,text:"Selected microphone is currently disconnected. Recording will fall back to System default until reconnected."}:!e.labelsAvailable&&e.devices.length>0?{warn:!1,text:"Device names are hidden until microphone access is granted. Click Refresh to detect names."}:t.micDeviceId===$?{warn:!1,text:"Uses your OS default input device. Saved selection applies to Draft Studio and Composer dictation."}:{warn:!1,text:`Using ${o?.label??(t.micLabel||t.micDeviceId)}. Saved until you choose another mic.`}}function Ss({prefs:e,audio:t,onSelect:o}){let r=t.devices.find(p=>p.deviceId===e.micDeviceId),i=e.micDeviceId!==$&&!r,a=xs(t,e,r),c=t.defaultDeviceLabel?`System default (${t.defaultDeviceLabel})`:"System default",s=p=>{if(p===$){o($,"");return}let m=t.devices.find(u=>u.deviceId===p);o(p,m?.label??e.micLabel)};return d("div",{className:"ds-field-group",children:[n("label",{htmlFor:"ds-mic-select",className:"ds-field-label",children:"Input microphone"}),d("div",{className:"ds-mic-row",children:[d("select",{id:"ds-mic-select","aria-label":"Input microphone",className:"ds-select",value:e.micDeviceId,onChange:p=>s(p.target.value),children:[n("option",{value:$,children:c}),t.devices.map(p=>n("option",{value:p.deviceId,children:p.label},p.deviceId)),i&&n("option",{value:e.micDeviceId,children:`${e.micLabel||e.micDeviceId} (Disconnected)`})]}),n("button",{type:"button",className:"ds-btn",onClick:()=>void t.refresh(!0),disabled:t.isRefreshing,"aria-label":"Refresh microphones",title:"Refresh connected audio input devices",children:t.isRefreshing?"Refreshing\u2026":"\u21BB Refresh"})]}),d("div",{className:"ds-audio-status",role:t.error?"alert":void 0,children:[n("span",{className:`ds-audio-dot ${a.warn?"warn":""}`,"aria-hidden":"true"}),n("span",{children:a.text})]})]})}function ws({prefs:e,onToggle:t,onVolumeChange:o}){let r=()=>{e.soundCuesEnabled&&F("start",{enabled:!0,volume:e.soundCuesVolume})};return d(K,{children:[d("div",{className:"ds-toggle-card",children:[d("div",{className:"ds-toggle-copy",children:[n("span",{id:"ds-sound-cues-label",className:"ds-toggle-title",children:"Sound cues & chimes"}),n("small",{style:{color:"var(--ds-text-muted)"},children:"Play a subtle chime when dictation starts, finishes, or encounters an error."})]}),n("button",{type:"button",className:"ds-switch",role:"switch","aria-checked":e.soundCuesEnabled,"aria-labelledby":"ds-sound-cues-label",onClick:t})]}),d("div",{className:`ds-volume-card ${e.soundCuesEnabled?"":"disabled"}`,children:[d("div",{className:"ds-volume-header",children:[n("label",{htmlFor:"ds-chime-volume",className:"ds-field-label",children:"Chime volume"}),n("button",{type:"button",className:"ds-btn",style:{padding:"3px 9px",fontSize:11},disabled:!e.soundCuesEnabled,onClick:r,children:"Test chime"})]}),d("div",{className:"ds-volume-controls",children:[n("input",{id:"ds-chime-volume",type:"range",className:"ds-volume-slider","aria-label":"Chime volume",min:0,max:100,step:5,value:e.soundCuesVolume,disabled:!e.soundCuesEnabled,onChange:i=>o(Number(i.target.value)),onPointerUp:r,onKeyUp:i=>{["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(i.key)&&r()}}),d("span",{className:"ds-volume-pct",children:[e.soundCuesVolume,"%"]})]})]})]})}function Is({values:e,onSave:t}){let o=U(()=>xe(e),[e]),r=Jo();return d("section",{className:"ds-pane",style:{flex:"none"},"aria-labelledby":"ds-audio-feedback-title",children:[d("div",{className:"ds-pane-header",children:[n("h2",{id:"ds-audio-feedback-title",className:"ds-pane-title",style:{margin:0},children:"Audio & Feedback"}),n("button",{type:"button",className:"ds-btn",onClick:()=>t({micDeviceId:$,micLabel:"",soundCuesEnabled:String(!0),soundCuesVolume:String(75)}),children:"Reset"})]}),d("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[n(Ss,{prefs:o,audio:r,onSelect:(c,s)=>t({micDeviceId:c,micLabel:s})}),n(ws,{prefs:o,onToggle:()=>{let c=!o.soundCuesEnabled;t({soundCuesEnabled:String(c)}),c&&F("start",{enabled:!0,volume:o.soundCuesVolume})},onVolumeChange:c=>t({soundCuesVolume:String(c)})})]})]})}function Ts(e){return e===0?"Unlimited":`${e.toLocaleString()} entries`}function Es(e){return e===0?"Forever":e===365?"1 year":`${e} days`}function er(e,t){return e.includes(t)?[...e]:[...e,t]}function Cs({enabled:e,onToggle:t}){return d("div",{className:"ds-toggle-card",children:[d("div",{className:"ds-toggle-copy",children:[n("span",{id:"ds-history-enabled-label",className:"ds-toggle-title",children:"Save activity history"}),n("small",{style:{color:"var(--ds-text-muted)"},children:"Store text and metadata from dictations and Draft Studio refinements locally. Audio recordings are never saved."})]}),n("button",{type:"button",className:"ds-switch",role:"switch","aria-checked":e,"aria-labelledby":"ds-history-enabled-label",onClick:t})]})}function As({prefs:e,onSave:t}){let o=U(()=>er($o,e.historyMaxEntries),[e.historyMaxEntries]),r=U(()=>er(Bo,e.historyMaxDays),[e.historyMaxDays]);return d("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:12},children:[d("label",{className:"ds-field-group",children:[n("span",{className:"ds-field-label",children:"Maximum entries"}),n("select",{className:"ds-select","aria-label":"Maximum history entries",value:String(e.historyMaxEntries),onChange:i=>t({historyMaxEntries:i.target.value}),children:o.map(i=>n("option",{value:String(i),children:Ts(i)},i))}),n("small",{style:{color:"var(--ds-text-muted)"},children:"Starred entries are exempt from automatic pruning."})]}),d("label",{className:"ds-field-group",children:[n("span",{className:"ds-field-label",children:"Retention period"}),n("select",{className:"ds-select","aria-label":"History retention period",value:String(e.historyMaxDays),onChange:i=>t({historyMaxDays:i.target.value}),children:r.map(i=>n("option",{value:String(i),children:Es(i)},i))}),n("small",{style:{color:"var(--ds-text-muted)"},children:"Older non-starred entries are pruned automatically."})]})]})}function Rs({includeStarred:e,clearing:t,onIncludeStarredChange:o,onCancel:r,onConfirm:i}){return d("div",{role:"alertdialog","aria-label":"Confirm clear activity history",style:{display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:10,padding:"10px 12px",borderRadius:6,background:"rgba(239, 68, 68, 0.1)",border:"1px solid rgba(239, 68, 68, 0.35)"},children:[d("div",{style:{display:"flex",flexDirection:"column",gap:4},children:[n("strong",{style:{fontSize:12},children:"Clear all activity history?"}),d("label",{style:{display:"inline-flex",alignItems:"center",gap:6,fontSize:11.5,cursor:"pointer"},children:[n("input",{type:"checkbox",checked:e,onChange:a=>o(a.target.checked)}),n("span",{children:"Also delete starred entries"})]})]}),d("div",{style:{display:"flex",gap:6},children:[n("button",{type:"button",className:"ds-btn",disabled:t,onClick:r,children:"Cancel"}),n("button",{type:"button",className:"ds-btn ds-btn-danger",disabled:t,onClick:i,children:t?"Clearing\u2026":"Confirm clear"})]})]})}function Ds({rpc:e}){let[t,o]=b(!1),[r,i]=b(!1),[a,c]=b(!1),[s,p]=b(null),m=async()=>{c(!0),p(null);try{let u=await e.call(kt,{includeStarred:r});o(!1),i(!1),u?.ok?p(u.deletedCount===0?"No matching history entries to clear.":`Cleared ${u.deletedCount} history ${u.deletedCount===1?"entry":"entries"}.`):p("History storage is unavailable.")}catch{p("Could not clear history.")}finally{c(!1)}};return d("div",{style:{display:"flex",flexDirection:"column",gap:8,paddingTop:4,borderTop:"1px solid var(--ds-border)"},children:[t?n(Rs,{includeStarred:r,clearing:a,onIncludeStarredChange:i,onCancel:()=>o(!1),onConfirm:()=>void m()}):d("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10},children:[n("small",{style:{color:"var(--ds-text-muted)"},children:"Remove stored dictation and refinement history from this machine."}),n("button",{type:"button",className:"ds-btn ds-btn-danger",onClick:()=>{i(!1),o(!0)},children:"Clear history"})]}),s?n("div",{role:"status",style:{fontSize:11.5,color:"var(--ds-text-muted)"},children:s}):null]})}function ks({rpc:e,values:t,onSave:o}){let r=U(()=>Wo(t),[t]);return d("section",{className:"ds-pane",style:{flex:"none"},"aria-labelledby":"ds-history-privacy-title",children:[d("div",{className:"ds-pane-header",children:[n("h2",{id:"ds-history-privacy-title",className:"ds-pane-title",style:{margin:0},children:"History & Privacy"}),n("button",{type:"button",className:"ds-btn",onClick:()=>o({historyEnabled:String(!0),historyMaxEntries:String(500),historyMaxDays:String(90)}),children:"Reset"})]}),d("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[n(Cs,{enabled:r.historyEnabled,onToggle:()=>o({historyEnabled:String(!r.historyEnabled)})}),n(As,{prefs:r,onSave:o}),n(Ds,{rpc:e})]})]})}function Ps({terms:e,atLimit:t,onRemove:o,onClearAll:r}){return d(K,{children:[n("div",{className:"ds-dict-well",children:e.length>0?n("ul",{className:"ds-dict-pills","aria-label":"Dictionary terms",children:e.map(i=>d("li",{className:"ds-dict-pill",children:[n("span",{className:"ds-dict-pill-text",children:i}),n("button",{type:"button",className:"ds-dict-pill-remove",onClick:()=>o(i),"aria-label":`Remove ${i}`,title:`Remove ${i}`,children:"\xD7"})]},i))}):n("span",{className:"ds-dict-empty",children:"No terms added yet. Type a term above or paste a comma-separated list."})}),d("div",{className:"ds-dict-footer",children:[d("span",{className:"ds-dict-count",children:[e.length===1?"1 term active":`${e.length} terms active`,t?` (max ${200})`:""]}),n("button",{type:"button",className:"ds-btn ds-dict-clear-btn",onClick:r,disabled:e.length===0,children:"Clear all"})]})]})}function Ns({label:e,help:t,value:o,resetSignal:r,onChange:i}){let[a,c]=b(""),s=U(()=>En(o),[o]),p=s.length>=200;N(()=>{r>0&&c("")},[r]);let m=()=>{let g=a.trim();if(!g||p)return;let y=zo(s,g);c(""),y.length!==s.length&&i(Cn(y))};return d("div",{className:"ds-field-group",children:[n("label",{htmlFor:"ds-dictionary-input",className:"ds-field-label",children:e}),t&&n("small",{style:{color:"var(--ds-text-muted)"},children:t}),d("div",{className:"ds-dict-container",children:[d("div",{className:"ds-dict-input-row",children:[n("input",{id:"ds-dictionary-input",type:"text",className:"ds-dict-input",value:a,onChange:g=>c(g.target.value),onKeyDown:g=>{g.key==="Enter"&&(g.preventDefault(),m())},onPaste:g=>{let y=g.clipboardData?.getData("text");if(!y||!/[\r\n]/.test(y))return;g.preventDefault();let h=g.currentTarget.selectionStart??a.length,C=g.currentTarget.selectionEnd??a.length;c(a.slice(0,h)+y.replace(/[\r\n]+/g,", ")+a.slice(C))},placeholder:"Type a term and press Enter (or paste comma-separated)...",disabled:p}),n("button",{type:"button",className:"ds-btn ds-btn-primary ds-dict-add-btn",onClick:m,disabled:!a.trim()||p,children:"+ Add"})]}),n(Ps,{terms:s,atLimit:p,onRemove:g=>i(Cn(s.filter(y=>y!==g))),onClearAll:()=>{c(""),i("")}})]})]})}function _s({field:e,values:t,availableSttProviders:o,resetSignal:r,onSave:i}){if(e.key==="dictionary")return n(Ns,{label:e.label,help:e.help,value:t.dictionary??"",resetSignal:r,onChange:p=>i({dictionary:p})});let a=t[e.key]??Rn[e.key]??"",c=e.options;if(c&&e.key==="inputLanguage"&&a&&!c.includes(a))c=[...c,a];else if(c&&e.key==="sttProvider"){let p=new Set(o);p.add("system"),c=c.filter(m=>p.has(m))}let s=e.key==="sttProvider"&&!!a&&!!c&&!c.includes(a);return d("label",{className:"ds-field-group",children:[n("span",{className:"ds-field-label",children:e.label}),c?d("select",{className:"ds-select",value:s?"":a,onChange:p=>i({[e.key]:p.target.value}),children:[s&&n("option",{value:"",disabled:!0,hidden:!0,children:`${Qo[a]??a} (Not configured)`}),c.map(p=>n("option",{value:p,children:Qo[p]??p},p))]}):e.multiline?n("textarea",{className:"ds-custom-prompt-input",value:t[e.key]??"",onChange:p=>i({[e.key]:p.target.value})}):n("input",{type:e.secret?"password":"text",className:"ds-select",value:t[e.key]??"",onChange:p=>i({[e.key]:p.target.value}),placeholder:e.secret?"Enter API key\u2026":void 0}),e.help&&n("small",{style:{color:"var(--ds-text-muted)"},children:e.help})]})}function nr({rpc:e,onBack:t,pluginId:o}){oe();let[r,i]=b({}),[a,c]=b(["system"]),[s,p]=b("Loading\u2026"),[m,u]=b(null),[g,y]=b(0),h=x(0),C=x({}),k=x(!0),D=x(e);D.current=e;let P=E(()=>{D.current.call(me).then(O=>{k.current&&c(_t(O))}).catch(()=>{})},[]);Te(Pt,()=>{P()}),Te(Nt,()=>{P()}),N(()=>{k.current=!0;let O=!0;return D.current.call(Se).then(j=>{if(!O)return;let v=j||{};C.current=v,i(v),ge(v),p("Saved")}).catch(()=>{O&&p("Could not load settings")}),P(),()=>{O=!1,k.current=!1}},[P]);let w=O=>{let j=++h.current,v=C.current={...C.current,...O};i(v),ge(v),p("Saving\u2026"),D.current.call(we,v).then(()=>{j===h.current&&(u(null),p("Saved"))}).catch(()=>{j===h.current&&(u(v),p("Could not save settings."))})};return n("div",{className:"ds-workspace",children:n("main",{className:"ds-editor-canvas",style:{overflowY:"auto"},children:d("div",{style:{width:"100%",maxWidth:760,margin:"0 auto",display:"flex",flexDirection:"column",gap:12},children:[d("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12},children:[d("div",{children:[n("h1",{style:{fontSize:18,margin:"4px 0"},children:"Settings"}),n("span",{style:{color:"var(--ds-text-muted)",fontSize:12},children:"Configure voice and cleanup defaults"})]}),n("button",{className:"ds-btn",onClick:t,children:"\u2190 Back to Studio"})]}),d("div",{style:{color:"var(--ds-text-muted)",fontSize:11},children:[n("span",{role:"status",children:s}),m&&n("button",{className:"ds-btn",onClick:()=>w(m),children:"Retry"})]}),n(Is,{values:r,onSave:w}),n(ks,{rpc:e,values:r,onSave:w}),Object.entries(vs).map(([O,j])=>d(lo.Fragment,{children:[d("section",{className:"ds-pane",style:{flex:"none"},children:[d("div",{className:"ds-pane-header",children:[n("h2",{className:"ds-pane-title",style:{margin:0},children:O}),O!=="Connections"&&n("button",{className:"ds-btn",onClick:()=>{O==="Voice & transcription"&&y(v=>v+1),w(Object.fromEntries(j.map(v=>[v.key,Rn[v.key]??""])))},children:"Reset"})]}),d("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[O==="Connections"&&n("p",{children:"Manage API keys in Zana\u2019s Draft Studio plugin settings."}),j.filter(v=>!(v.key==="customPrompt"&&r.tone!=="custom")).map(v=>n(_s,{field:v,values:r,availableSttProviders:a,resetSignal:g,onSave:w},v.key))]})]}),O==="Voice & transcription"&&n(Vo,{rpc:e,sttProvider:r.sttProvider??Rn.sttProvider,llmProvider:r.llmProvider,onApplyPreset:w,onReadyChange:P})]},O)),o?n("section",{className:"ds-pane",style:{flex:"none",padding:14},children:n(Ft,{pluginId:o})}):null]})})})}async function Xe(e){if(!e)return!1;if(typeof navigator<"u"&&navigator.clipboard&&typeof navigator.clipboard.writeText=="function")try{return await navigator.clipboard.writeText(e),!0}catch{}if(typeof document<"u"){let t=document.createElement("textarea");t.value=e,t.setAttribute("readonly",""),t.style.position="fixed",t.style.top="-9999px",t.style.left="-9999px",t.style.opacity="0";try{if(document.body.appendChild(t),t.focus(),t.select(),document.execCommand("copy"))return!0}catch{}finally{t.parentNode&&t.parentNode.removeChild(t)}}return!1}var Ms={improve:"Improve writing",executive:"Summarize",spec:"Technical spec",custom:"Custom",translate:"Translate"},Ls={standard:"Standard",casual:"Casual",conversational:"Conversational",formal:"Professional",technical:"Technical",custom:"Custom"},Ut={composer:"Composer",home:"Home",studio:"Draft Studio"},Dn={system:"Zana Voice","local-whisper":"Local Whisper","google-gemini":"Google Gemini",google:"Google Gemini",openai:"OpenAI",anthropic:"Anthropic",assistant:"Zana Assistant"};function or(e){if(e.presetId==="translate"||e.targetLanguage){let r=e.targetLanguage?Ke(e.targetLanguage)?.label??e.targetLanguage:null;return r?`Translate \xB7 ${r}`:"Translate"}let t=e.presetId?Ms[e.presetId]:null,o=e.tone?Ls[e.tone]??e.tone:null;return t==="Improve writing"&&o?`Improve \xB7 ${o}`:t||(o?`Refinement \xB7 ${o}`:"Refinement")}function zt(e){return e.kind==="dictation"?"Dictation":e.kind==="dictation_cleanup"?e.presetId||e.targetLanguage?`Dictation + ${or(e)}`:"Dictation + Cleanup":or(e)}function $t(e){if(e===null||!Number.isFinite(e)||e<0)return null;if(e<1e3)return`${Math.round(e)}ms`;let t=Math.round(e/1e3);if(t<60)return`${t}s`;let o=Math.floor(t/60),r=t%60;return`${o}m ${String(r).padStart(2,"0")}s`}function rr(e,t=Date.now()){let o=Math.max(0,Math.floor((t-e)/1e3));if(o<60)return"Just now";let r=Math.floor(o/60);if(r<60)return`${r}m ago`;let i=Math.floor(r/60);if(i<24)return`${i}h ago`;try{return new Date(e).toLocaleDateString(void 0,{month:"short",day:"numeric"})}catch{return`${Math.floor(i/24)}d ago`}}function ir(e){try{return new Date(e).toLocaleString(void 0,{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}catch{return String(e)}}function sr(e,t=Date.now()){let o=new Date(t);o.setHours(0,0,0,0);let r=new Date(o.getTime()-864e5),i={Today:[],Yesterday:[],Earlier:[]};for(let a of e)a.createdAt>=o.getTime()?i.Today.push(a):a.createdAt>=r.getTime()?i.Yesterday.push(a):i.Earlier.push(a);return["Today","Yesterday","Earlier"].filter(a=>i[a].length>0).map(a=>({label:a,entries:i[a]}))}function kn(e){let t=e.trim();return`${t?t.split(/\s+/).length:0} words \xB7 ${e.length} chars`}function ar(e){return e?e.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]+/gu)||[]:[]}var dr=1200;function Bt(e,t){if(!e&&!t)return[];if(e===t)return[{type:"unchanged",text:e}];if(!e)return[{type:"added",text:t}];if(!t)return[{type:"removed",text:e}];let o=ar(e),r=ar(t),i=o.length,a=r.length;if(i>dr||a>dr)return[{type:"removed",text:e},{type:"added",text:t}];let c=a+1,s=new Uint32Array((i+1)*c);for(let y=1;y<=i;y++){let h=y*c,C=(y-1)*c,k=o[y-1];for(let D=1;D<=a;D++)if(k===r[D-1])s[h+D]=s[C+(D-1)]+1;else{let P=s[h+(D-1)],w=s[C+D];s[h+D]=P>w?P:w}}let p=[],m=i,u=a;for(;m>0||u>0;){let y=m*c,h=(m-1)*c;m>0&&u>0&&o[m-1]===r[u-1]?(p.push({type:"unchanged",text:o[m-1]}),m--,u--):u>0&&(m===0||s[y+(u-1)]>=s[h+u])?(p.push({type:"added",text:r[u-1]}),u--):m>0&&(u===0||s[y+(u-1)]<s[h+u])&&(p.push({type:"removed",text:o[m-1]}),m--)}p.reverse();let g=[];for(let y of p)g.length>0&&g[g.length-1].type===y.type?g[g.length-1].text+=y.text:g.push({...y});return g}function Os({entry:e,projectName:t,onOpenThread:o}){let r=$t(e.audioDurationMs),i=$t(e.processingDurationMs);return d(K,{children:[d("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"},children:[d("div",{className:"ds-history-meta-row",children:[n("span",{className:`ds-kind-badge ds-kind-${e.kind}`,children:zt(e)}),n("span",{className:"ds-source-badge",children:Ut[e.source]??e.source}),t?n("span",{className:"ds-badge ds-badge-project",children:t}):null,n("span",{children:ir(e.createdAt)})]}),e.threadId&&o?n("button",{type:"button",className:"ds-btn",style:{padding:"4px 9px",fontSize:11},onClick:()=>o(e.threadId),children:"Open thread"}):null]}),d("div",{className:"ds-history-meta-row",children:[e.sttProvider?d("span",{className:"ds-pill",children:["STT: ",Dn[e.sttProvider]??e.sttProvider,e.sttModel?` (${e.sttModel})`:""]}):null,e.llmProvider?d("span",{className:"ds-pill",children:["LLM: ",Dn[e.llmProvider]??e.llmProvider,e.llmModel?` (${e.llmModel})`:""]}):null,r?d("span",{className:"ds-pill",children:["Recorded: ",r]}):null,i?d("span",{className:"ds-pill",children:["Processed: ",i]}):null]})]})}function Hs({entry:e,primaryText:t,hasDistinctOutput:o,showDiff:r,copiedTarget:i,onToggleDiff:a,onCopyText:c,onLoadIntoStudio:s,onInsertIntoComposer:p,onToggleStar:m,onDelete:u}){return d("div",{className:"ds-history-actions-bar",children:[n("button",{type:"button",className:"ds-btn ds-btn-primary",onClick:()=>s(e),children:"Load into Studio"}),n("button",{type:"button",className:"ds-btn",onClick:()=>p(t),children:"Insert into Composer"}),n("button",{type:"button",className:"ds-btn",onClick:()=>c(t,"output"),children:i==="output"?"Copied":o?"Copy Output":"Copy"}),o?d(K,{children:[n("button",{type:"button",className:"ds-btn",onClick:()=>c(e.rawText,"raw"),children:i==="raw"?"Copied Raw":"Copy Raw"}),n("button",{type:"button",className:"ds-btn","aria-pressed":r,onClick:a,children:r?"View Clean":"View Diff"})]}):null,d("button",{type:"button",className:"ds-btn","aria-pressed":e.starred,onClick:()=>m(e),children:[n("span",{className:e.starred?"ds-star-active":void 0,children:e.starred?"\u2605":"\u2606"}),n("span",{children:e.starred?"Starred":"Star"})]}),n("button",{type:"button",className:"ds-btn ds-btn-danger",style:{marginLeft:"auto"},onClick:()=>u(e),children:"Delete"})]})}function js({rawText:e,outputText:t}){let o=U(()=>Bt(e,t),[t,e]);return d("div",{className:"ds-history-text-card",children:[n("div",{className:"ds-pane-header",children:n("span",{className:"ds-pane-title",children:"Word Diff (Raw \u2192 Refined)"})}),n("div",{className:"ds-history-text-body","data-testid":"history-diff-view",children:o.map((r,i)=>n("span",{className:r.type==="added"?"ds-diff-added":r.type==="removed"?"ds-diff-removed":"ds-diff-unchanged",children:r.text},i))})]})}function Fs({entry:e,hasDistinctOutput:t}){let o=e.kind==="refinement"?"Original Input":t?"Raw Transcript":"Transcript";return d(K,{children:[t?d("div",{className:"ds-history-text-card",children:[d("div",{className:"ds-pane-header",children:[n("span",{className:"ds-pane-title",children:"Refined Output"}),n("span",{style:{fontSize:11,color:"var(--ds-text-subtle)"},children:kn(e.outputText)})]}),n("div",{className:"ds-history-text-body",children:e.outputText})]}):null,d("div",{className:"ds-history-text-card",children:[d("div",{className:"ds-pane-header",children:[n("span",{className:"ds-pane-title",children:o}),n("span",{style:{fontSize:11,color:"var(--ds-text-subtle)"},children:kn(e.rawText)})]}),n("div",{className:"ds-history-text-body",children:e.rawText})]})]})}function lr({entry:e,projectName:t,showDiff:o,onToggleDiff:r,onCopyText:i,onLoadIntoStudio:a,onInsertIntoComposer:c,onToggleStar:s,onDelete:p,onOpenThread:m,copiedTarget:u}){let g=e.rawText!==e.outputText,y=e.outputText||e.rawText;return d("section",{className:"ds-history-detail-pane","aria-label":"Activity details",children:[d("div",{className:"ds-history-detail-header",children:[n(Os,{entry:e,projectName:t,onOpenThread:m}),n(Hs,{entry:e,primaryText:y,hasDistinctOutput:g,showDiff:o,copiedTarget:u,onToggleDiff:r,onCopyText:i,onLoadIntoStudio:a,onInsertIntoComposer:c,onToggleStar:s,onDelete:p})]}),e.refineNotice?d("div",{role:"status",style:{padding:"8px 12px",borderRadius:6,background:"rgba(234, 179, 8, 0.1)",border:"1px solid rgba(234, 179, 8, 0.3)",color:"#fde047",fontSize:12},children:["Cleanup fallback: ",e.refineNotice.message]}):null,e.customPrompt?d("div",{className:"ds-history-text-card",children:[n("div",{className:"ds-pane-header",children:n("span",{className:"ds-pane-title",children:"Custom Instructions"})}),n("div",{className:"ds-history-text-body",style:{fontSize:12,color:"var(--ds-text-muted)"},children:e.customPrompt})]}):null,o&&g?n(js,{rawText:e.rawText,outputText:e.outputText}):n(Fs,{entry:e,hasDistinctOutput:g})]})}var cr=50,Vs=180;function Us(e){let[t,o]=b(""),[r,i]=b(""),[a,c]=b("all"),[s,p]=b("all"),[m,u]=b(!1),[g,y]=b(e?"project":"all"),[h,C]=b("");N(()=>{y(e?"project":"all"),C("")},[e]),N(()=>{let w=setTimeout(()=>i(t.trim()),Vs);return()=>clearTimeout(w)},[t]);let k=e?g==="project"?e:null:h||null,D=!!(r||a!=="all"||s!=="all"||m||h),P=E(()=>{o(""),i(""),c("all"),p("all"),u(!1),C("")},[]);return{searchInput:t,setSearchInput:o,debouncedQuery:r,typeFilter:a,setTypeFilter:c,sourceFilter:s,setSourceFilter:p,starredOnly:m,setStarredOnly:u,scopeMode:g,setScopeMode:y,selectedProjectFilter:h,setSelectedProjectFilter:C,effectiveProjectId:k,hasActiveFilters:D,resetFilters:P}}function zs(e){let[t,o]=b([]),r=E(()=>{e.current.call(bo).then(a=>{a&&Array.isArray(a.projects)&&o(a.projects)}).catch(()=>{})},[e]);N(()=>{r()},[r]);let i=U(()=>new Map(t.map(a=>[a.id,a.name])),[t]);return{projects:t,projectNameById:i,loadProjects:r}}function $s(e,t,o,r,i){return E(async a=>{try{let c=await e.current.call(fo,{id:a.id,starred:!a.starred});if(!c?.ok||!c.entry){i?.("Could not update star status.");return}t&&!c.entry.starred?(o(s=>s.filter(p=>p.id!==a.id)),r(s=>Math.max(0,s-1))):o(s=>s.map(p=>p.id===a.id?c.entry:p))}catch{i?.("Could not update star status.")}},[i,e,o,r,t])}function Bs(e,t,o,r){return E(async i=>{try{let a=await e.current.call(go,{id:i.id});if(!a?.ok||!a.deleted){r?.("Could not delete history entry.");return}t(c=>c.filter(s=>s.id!==i.id)),o(c=>Math.max(0,c-1)),r?.("History entry deleted.")}catch{r?.("Could not delete history entry.")}},[r,e,t,o])}function Gs(e,t,o,r){let[i,a]=b(!1),c=E(async s=>{a(!0);try{let p=await e.current.call(kt,{projectId:t,includeStarred:s});if(!p?.ok){r?.("Could not clear history.");return}r?.(p.deletedCount===0?"No matching entries were cleared.":`Cleared ${p.deletedCount} history ${p.deletedCount===1?"entry":"entries"}.`),await o()}catch{r?.("Could not clear history.")}finally{a(!1)}},[t,r,o,e]);return{clearing:i,clearHistory:c}}function Ws(e,t){let[o,r]=b([]),[i,a]=b(0),[c,s]=b(!1),[p,m]=b(!0),[u,g]=b(!0),[y,h]=b(!0),[C,k]=b(!1),[D,P]=b(null),w=x(0),O=E(async(j={})=>{let v=++w.current,z=j.append===!0;z?k(!0):h(!0),P(null);try{let q=await e.current.call(mo,{query:t.query||void 0,type:t.type,source:t.source,projectId:t.projectId,starredOnly:t.starredOnly,limit:j.limit??cr,offset:j.offset??0});if(w.current!==v)return;let I=Array.isArray(q?.entries)?q.entries:[];r(X=>z?[...X,...I]:I),a(typeof q?.total=="number"?q.total:I.length),s(!!q?.hasMore),m(q?.historyEnabled!==!1),g(q?.storageAvailable!==!1)}catch(q){if(w.current!==v)return;P(q instanceof Error?q.message:"Could not load activity history.")}finally{w.current===v&&(h(!1),k(!1))}},[t.projectId,t.query,t.source,t.starredOnly,t.type,e]);return{entries:o,setEntries:r,total:i,setTotal:a,hasMore:c,historyEnabled:p,storageAvailable:u,loading:y,loadingMore:C,error:D,fetchEntries:O}}function Ys({entriesRef:e,starredOnly:t,setEntries:o,setTotal:r,fetchEntries:i,loadProjects:a}){Te(yo,c=>{let s=c&&typeof c=="object"?c:{},p=Math.max(cr,e.current.length);if(s.action==="deleted"&&typeof s.id=="string"){if(!e.current.some(m=>m.id===s.id))return;o(m=>m.filter(u=>u.id!==s.id)),r(m=>Math.max(0,m-1));return}if(s.action==="starred"&&typeof s.id=="string"&&typeof s.starred=="boolean"){let m=e.current.some(u=>u.id===s.id);t&&s.starred&&!m?i({offset:0,limit:p,append:!1}):m&&t&&!s.starred?(o(u=>u.filter(g=>g.id!==s.id)),r(u=>Math.max(0,u-1))):m&&o(u=>u.map(g=>g.id===s.id?{...g,starred:s.starred}:g));return}if(s.action==="settingsChanged"){i({offset:0,limit:p,append:!1});return}i({offset:0,limit:p,append:!1}),(!s.action||s.action==="recorded"||s.action==="cleared"||s.action==="pruned")&&a()})}function pr({rpc:e,projectId:t,onStatusNotice:o}){let r=x(e);r.current=e;let i=Us(t),{projects:a,projectNameById:c,loadProjects:s}=zs(r),[p,m]=b(null),u=Ws(r,{query:i.debouncedQuery,type:i.typeFilter,source:i.sourceFilter,projectId:i.effectiveProjectId,starredOnly:i.starredOnly}),g=x(u.entries);g.current=u.entries;let y=E(()=>u.fetchEntries({offset:0,append:!1}),[u.fetchEntries]);N(()=>{y()},[y]),Ys({entriesRef:g,starredOnly:i.starredOnly,setEntries:u.setEntries,setTotal:u.setTotal,fetchEntries:u.fetchEntries,loadProjects:s});let h=$s(r,i.starredOnly,u.setEntries,u.setTotal,o),C=Bs(r,u.setEntries,u.setTotal,o),{clearing:k,clearHistory:D}=Gs(r,i.effectiveProjectId,y,o),P=U(()=>u.entries.length===0?null:u.entries.find(w=>w.id===p)??u.entries[0],[u.entries,p]);return{...i,...u,clearing:k,toggleStar:h,deleteEntry:C,clearHistory:D,projects:a,projectNameById:c,selectedEntry:P,setSelectedId:m}}var qs=`
  .ds-history-shell {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .ds-history-banner {
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

  .ds-history-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--ds-border);
    background: var(--ds-panel-bg);
    flex-shrink: 0;
  }

  .ds-history-search-wrap {
    position: relative;
    flex: 1 1 200px;
    min-width: 160px;
    max-width: 340px;
    display: flex;
    align-items: center;
  }

  .ds-history-search {
    width: 100%;
    padding: 6px 26px 6px 10px;
    border-radius: 6px;
    border: 1px solid var(--ds-border);
    background: var(--ds-input-bg);
    color: var(--text-primary, #e2e8f0);
    font-size: 12px;
    outline: none;
  }
  .ds-history-search:focus {
    border-color: var(--ds-accent);
    box-shadow: 0 0 0 1px var(--ds-accent);
  }

  .ds-history-search-clear {
    position: absolute;
    right: 6px;
    border: none;
    background: transparent;
    color: var(--ds-text-muted);
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    padding: 2px 4px;
  }
  .ds-history-search-clear:hover {
    color: var(--text-primary, #e2e8f0);
  }

  .ds-segmented {
    display: inline-flex;
    align-items: center;
    background: var(--ds-input-bg);
    border: 1px solid var(--ds-border);
    border-radius: 6px;
    padding: 2px;
    gap: 2px;
  }

  .ds-segmented-btn {
    border: none;
    background: transparent;
    color: var(--ds-text-muted);
    font-size: 11.5px;
    font-weight: 500;
    padding: 4px 9px;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.12s, color 0.12s;
  }
  .ds-segmented-btn:hover {
    color: var(--text-primary, #e2e8f0);
  }
  .ds-segmented-btn.active {
    background: rgba(59, 130, 246, 0.2);
    color: var(--text-primary, #e2e8f0);
  }

  .ds-history-confirm-bar {
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

  .ds-history-split {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .ds-history-list-pane {
    width: 340px;
    border-right: 1px solid var(--ds-border);
    background: var(--ds-panel-bg);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    flex-shrink: 0;
  }

  .ds-history-group-header {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 6px 12px;
    font-size: 10.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--ds-text-subtle);
    background: var(--ds-panel-bg);
    border-bottom: 1px solid var(--ds-border);
  }

  .ds-history-row {
    width: 100%;
    text-align: left;
    border: none;
    border-bottom: 1px solid var(--ds-border);
    background: transparent;
    color: var(--text-primary, #e2e8f0);
    padding: 10px 12px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 5px;
    transition: background 0.12s;
  }
  .ds-history-row:hover {
    background: rgba(255, 255, 255, 0.04);
  }
  .ds-history-row.selected {
    background: rgba(59, 130, 246, 0.14);
    box-shadow: inset 3px 0 0 var(--ds-accent);
  }

  .ds-history-row-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  .ds-history-row-badges {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    flex-wrap: wrap;
  }

  .ds-history-snippet {
    font-size: 12.5px;
    line-height: 1.4;
    color: var(--text-primary, #e2e8f0);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
  }

  .ds-history-row-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    font-size: 10.5px;
    color: var(--ds-text-subtle);
  }

  .ds-history-detail-pane {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 16px;
    gap: 14px;
    background: var(--bg-base, #121417);
  }

  .ds-history-detail-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--ds-border);
  }

  .ds-history-meta-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--ds-text-muted);
  }

  .ds-history-actions-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .ds-history-text-card {
    border: 1px solid var(--ds-border);
    border-radius: 8px;
    background: var(--ds-panel-bg);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .ds-history-text-body {
    padding: 12px 14px;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--text-primary, #e2e8f0);
    user-select: text;
    background: var(--ds-input-bg);
  }

  .ds-kind-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    white-space: nowrap;
  }
  .ds-kind-dictation {
    background: rgba(59, 130, 246, 0.16);
    color: #93c5fd;
  }
  .ds-kind-dictation_cleanup {
    background: rgba(168, 85, 247, 0.16);
    color: #d8b4fe;
  }
  .ds-kind-refinement {
    background: rgba(34, 197, 94, 0.16);
    color: #86efac;
  }

  .ds-source-badge {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.07);
    color: var(--ds-text-muted);
    white-space: nowrap;
  }

  .ds-star-active {
    color: #facc15;
  }

  @media (max-width: 780px) {
    .ds-history-split {
      flex-direction: column;
    }
    .ds-history-list-pane {
      width: 100%;
      max-height: 40%;
      border-right: none;
      border-bottom: 1px solid var(--ds-border);
    }
  }
`;function Zs({projectId:e,scopeMode:t,onScopeModeChange:o,selectedProjectFilter:r,onSelectedProjectFilterChange:i,projects:a}){return e?d("div",{className:"ds-segmented",role:"group","aria-label":"Project scope",children:[n("button",{type:"button",className:`ds-segmented-btn ${t==="project"?"active":""}`,"aria-pressed":t==="project",onClick:()=>o("project"),children:"This project"}),n("button",{type:"button",className:`ds-segmented-btn ${t==="all"?"active":""}`,"aria-pressed":t==="all",onClick:()=>o("all"),children:"All activity"})]}):a.length===0?null:d("select",{className:"ds-select",style:{width:"auto",minWidth:130},"aria-label":"Filter by project",value:r,onChange:c=>i(c.target.value),children:[n("option",{value:"",children:"All projects"}),a.map(c=>n("option",{value:c.id,children:c.name},c.id))]})}function Ks({search:e,onSearchChange:t,typeFilter:o,onTypeFilterChange:r,sourceFilter:i,onSourceFilterChange:a,starredOnly:c,onStarredToggle:s,projectId:p,scopeMode:m,onScopeModeChange:u,selectedProjectFilter:g,onSelectedProjectFilterChange:y,effectiveProjectId:h,projects:C,total:k,onRequestClear:D}){let P=h?"Clear project history":"Clear all";return d("div",{className:"ds-history-toolbar",children:[d("div",{className:"ds-history-search-wrap",children:[n("input",{type:"search",className:"ds-history-search","aria-label":"Search history",placeholder:"Search dictations & refinements\u2026",value:e,onChange:w=>t(w.target.value)}),e?n("button",{type:"button",className:"ds-history-search-clear","aria-label":"Clear search",onClick:()=>t(""),children:"\xD7"}):null]}),n("div",{className:"ds-segmented",role:"group","aria-label":"Activity type filter",children:[{id:"all",label:"All"},{id:"dictation",label:"Dictations"},{id:"refinement",label:"Refinements"}].map(w=>n("button",{type:"button",className:`ds-segmented-btn ${o===w.id?"active":""}`,"aria-pressed":o===w.id,onClick:()=>r(w.id),children:w.label},w.id))}),d("select",{className:"ds-select",style:{width:"auto",minWidth:120},"aria-label":"Filter by source",value:i,onChange:w=>a(w.target.value),children:[n("option",{value:"all",children:"All sources"}),n("option",{value:"composer",children:"Composer"}),n("option",{value:"home",children:"Home"}),n("option",{value:"studio",children:"Draft Studio"})]}),n(Zs,{projectId:p,scopeMode:m,onScopeModeChange:u,selectedProjectFilter:g,onSelectedProjectFilterChange:y,projects:C}),d("button",{type:"button",className:`ds-btn ${c?"ds-btn-primary":""}`,"aria-pressed":c,onClick:s,children:[n("span",{children:c?"\u2605":"\u2606"}),n("span",{children:"Starred"})]}),d("div",{style:{marginLeft:"auto",display:"flex",alignItems:"center",gap:8},children:[n("span",{style:{fontSize:11,color:"var(--ds-text-subtle)"},children:k===1?"1 entry":`${k} entries`}),n("button",{type:"button",className:"ds-btn ds-btn-danger",disabled:k===0,onClick:D,children:P})]})]})}function Xs({onOpenSettings:e}){return d("div",{className:"ds-history-banner",role:"status",children:[n("span",{children:"History recording is paused. New dictations and refinements will not be saved."}),n("button",{type:"button",className:"ds-btn",style:{padding:"3px 9px",fontSize:11},onClick:e,children:"Open Settings"})]})}function Js({heading:e,includeStarred:t,clearing:o,onIncludeStarredChange:r,onCancel:i,onConfirm:a}){return d("div",{className:"ds-history-confirm-bar",role:"alertdialog","aria-label":"Confirm clear history",children:[d("div",{style:{display:"flex",flexDirection:"column",gap:4},children:[n("strong",{children:e}),d("label",{style:{display:"inline-flex",alignItems:"center",gap:6,fontSize:11.5,cursor:"pointer"},children:[n("input",{type:"checkbox",checked:t,onChange:c=>r(c.target.checked)}),n("span",{children:"Also delete starred entries"})]})]}),d("div",{style:{display:"flex",gap:6},children:[n("button",{type:"button",className:"ds-btn",disabled:o,onClick:i,children:"Cancel"}),n("button",{type:"button",className:"ds-btn ds-btn-danger",disabled:o,onClick:a,children:o?"Clearing\u2026":"Confirm Clear"})]})]})}function Qs({storageAvailable:e,error:t,loading:o,hasActiveFilters:r,onRetry:i,onResetFilters:a}){return e?t?n("div",{className:"ds-empty-state",children:d("div",{className:"ds-empty-card",role:"alert",children:[n("div",{style:{fontSize:14,fontWeight:600},children:"Could not load history"}),n("div",{style:{fontSize:12,color:"var(--ds-text-muted)"},children:t}),n("button",{type:"button",className:"ds-btn ds-btn-primary",onClick:i,children:"Retry"})]})}):o?n("div",{className:"ds-empty-state",children:n("span",{style:{fontSize:12,color:"var(--ds-text-muted)"},children:"Loading activity history\u2026"})}):n("div",{className:"ds-empty-state",children:d("div",{className:"ds-empty-card",children:[n("div",{style:{fontSize:14,fontWeight:600},children:r?"No matching history entries":"No activity recorded yet"}),n("div",{style:{fontSize:12,color:"var(--ds-text-muted)",lineHeight:1.45},children:r?"Try clearing your search or adjusting filters to see more entries.":"Dictate from any composer, the Home card, or Draft Studio \u2014 or refine text in Studio \u2014 and it will appear here automatically."}),r?n("button",{type:"button",className:"ds-btn",onClick:a,children:"Reset filters"}):null]})}):n("div",{className:"ds-empty-state",children:d("div",{className:"ds-empty-card",children:[n("div",{style:{fontSize:14,fontWeight:600},children:"History storage is unavailable"}),n("div",{style:{fontSize:12,color:"var(--ds-text-muted)"},children:"Draft Studio needs host database storage to save and browse dictation history."})]})})}function ea({entry:e,isSelected:t,projectName:o,onSelect:r}){let i=(e.outputText||e.rawText).trim();return d("button",{type:"button",className:`ds-history-row ${t?"selected":""}`,"aria-current":t?"true":void 0,onClick:r,children:[d("div",{className:"ds-history-row-top",children:[d("div",{className:"ds-history-row-badges",children:[n("span",{className:`ds-kind-badge ds-kind-${e.kind}`,children:zt(e)}),n("span",{className:"ds-source-badge",children:Ut[e.source]??e.source})]}),e.starred?n("span",{className:"ds-star-active","aria-label":"Starred",children:"\u2605"}):null]}),n("div",{className:"ds-history-snippet",children:i}),d("div",{className:"ds-history-row-meta",children:[n("span",{children:rr(e.createdAt)}),o?n("span",{children:o}):null]})]})}function ta({entries:e,selectedId:t,projectNameById:o,scopeMode:r,hasMore:i,loadingMore:a,onSelect:c,onLoadMore:s}){let p=U(()=>sr(e),[e]);return d("aside",{className:"ds-history-list-pane","aria-label":"Activity history list",children:[p.map(m=>d("div",{children:[n("div",{className:"ds-history-group-header",children:m.label}),m.entries.map(u=>{let g=r==="all"&&u.projectId?o.get(u.projectId)??u.projectId:null;return n(ea,{entry:u,isSelected:t===u.id,projectName:g,onSelect:()=>c(u.id)},u.id)})]},m.label)),i?n("div",{style:{padding:12,textAlign:"center"},children:n("button",{type:"button",className:"ds-btn",disabled:a,onClick:s,children:a?"Loading\u2026":"Load more"})}):null]})}function ur({rpc:e,projectId:t,onLoadIntoStudio:o,onInsertIntoComposer:r,onOpenSettings:i,onStatusNotice:a}){let c=Ge(),s=pr({rpc:e,projectId:t,onStatusNotice:a}),[p,m]=b(!1),[u,g]=b(null),[y,h]=b(!1),[C,k]=b(!1);N(()=>{m(!1),g(null)},[s.selectedEntry?.id]);let D=async(v,z)=>{if(!await Xe(v)){a?.("Failed to copy to clipboard.");return}g(z),setTimeout(()=>g(I=>I===z?null:I),2e3),a?.(z==="raw"?"Raw text copied to clipboard.":"Text copied to clipboard.")},P=async()=>{let v=C;h(!1),k(!1),await s.clearHistory(v)},w=!s.storageAvailable||!!s.error||s.loading||s.entries.length===0,O=s.selectedEntry?.projectId?s.projectNameById.get(s.selectedEntry.projectId)??s.selectedEntry.projectId:null,j=s.effectiveProjectId?t&&s.scopeMode==="project"?"Clear history for this project?":`Clear history for ${s.projectNameById.get(s.effectiveProjectId)??s.effectiveProjectId}?`:"Clear all activity history?";return d("div",{className:"ds-history-shell","data-testid":"ds-history-view",children:[n("style",{children:qs}),s.historyEnabled?null:n(Xs,{onOpenSettings:i}),n(Ks,{search:s.searchInput,onSearchChange:s.setSearchInput,typeFilter:s.typeFilter,onTypeFilterChange:s.setTypeFilter,sourceFilter:s.sourceFilter,onSourceFilterChange:s.setSourceFilter,starredOnly:s.starredOnly,onStarredToggle:()=>s.setStarredOnly(v=>!v),projectId:t,scopeMode:s.scopeMode,onScopeModeChange:s.setScopeMode,selectedProjectFilter:s.selectedProjectFilter,onSelectedProjectFilterChange:s.setSelectedProjectFilter,effectiveProjectId:s.effectiveProjectId,projects:s.projects,total:s.total,onRequestClear:()=>{k(!1),h(!0)}}),y?n(Js,{heading:j,includeStarred:C,clearing:s.clearing,onIncludeStarredChange:k,onCancel:()=>h(!1),onConfirm:()=>void P()}):null,w?n(Qs,{storageAvailable:s.storageAvailable,error:s.error,loading:s.loading,hasActiveFilters:s.hasActiveFilters,onRetry:()=>void s.fetchEntries(),onResetFilters:s.resetFilters}):d("div",{className:"ds-history-split",children:[n(ta,{entries:s.entries,selectedId:s.selectedEntry?.id??null,projectNameById:s.projectNameById,scopeMode:s.scopeMode,hasMore:s.hasMore,loadingMore:s.loadingMore,onSelect:s.setSelectedId,onLoadMore:()=>void s.fetchEntries({offset:s.entries.length,append:!0})}),s.selectedEntry?n(lr,{entry:s.selectedEntry,projectName:O,showDiff:p,onToggleDiff:()=>m(v=>!v),onCopyText:(v,z)=>void D(v,z),onLoadIntoStudio:o,onInsertIntoComposer:r,onToggleStar:v=>void s.toggleStar(v),onDelete:v=>void s.deleteEntry(v),onOpenThread:typeof c?.toThread=="function"?v=>c.toThread(v):void 0,copiedTarget:u}):null]})]})}var Y={FREE_OR_LOCAL:0,NANO:10,FLASH_LITE:12,MINI:20,SPARK:22,FLASH:25,LIGHTWEIGHT:28,OPEN_WEIGHT:32,HAIKU:35,REASONING_MINI:42,NEUTRAL_DEFAULT:50,STANDARD_GPT:60,CODEX:62,PRO:65,SONNET:70,REASONING_FULL:75,FLAGSHIP_PRO:85,OPUS:95},na=[{pattern:/(?:^|[:\s-])free(?=$|[\s)\]])|\bollama\b|\b:local\b/,rank:Y.FREE_OR_LOCAL},{pattern:/\bnano\b/,rank:Y.NANO},{pattern:/\bflash[- ]?lite\b/,rank:Y.FLASH_LITE},{pattern:/\bo[134][- ]mini\b/,rank:Y.REASONING_MINI},{pattern:/\bmini\b/,rank:Y.MINI},{pattern:/\bspark\b/,rank:Y.SPARK},{pattern:/\bflash\b/,rank:Y.FLASH},{pattern:/\b(?:lite|light|micro|tiny|small|instant)\b/,rank:Y.LIGHTWEIGHT},{pattern:/\bhaiku\b/,rank:Y.HAIKU},{pattern:/\bopus\b/,rank:Y.OPUS},{pattern:/\b(?:codex[- ]max|ultra|heavy|max)\b/,rank:Y.FLAGSHIP_PRO},{pattern:/\b(?:gpt|o[134])[a-z0-9.-]*[- ]pro\b/,rank:Y.FLAGSHIP_PRO},{pattern:/\bsonnet\b/,rank:Y.SONNET},{pattern:/\b(?:o1|o3|o4)\b/,rank:Y.REASONING_FULL},{pattern:/\bpro\b/,rank:Y.PRO},{pattern:/\bcodex\b/,rank:Y.CODEX},{pattern:/\bgpt[- ]?\d/,rank:Y.STANDARD_GPT},{pattern:/\bdeepseek[- ]?(?:r1|reasoner)\b/,rank:Y.REASONING_MINI},{pattern:/\b(?:deepseek|llama|qwen|gemma|mistral)\b/,rank:Y.OPEN_WEIGHT}];function mr(e){let o=`${e.id} ${e.label??""}`.toLowerCase().replace(/[_/]+/g," ");for(let r of na)if(r.pattern.test(o))return r.rank;return Y.NEUTRAL_DEFAULT}function oa(e,t){let o=mr(e)-mr(t);return o!==0?o:(e.label||e.id).localeCompare(t.label||t.id,void 0,{sensitivity:"base",numeric:!0})}function Pn(e){return[...e].sort(oa)}var Nn=`
  .ds-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background-color: var(--bg-base, #121417);
    color: var(--text-primary, #e2e8f0);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    overflow: hidden;
    box-sizing: border-box;
    --ds-border: var(--border, #2a2e37);
    --ds-panel-bg: var(--bg-panel, #181b20);
    --ds-input-bg: var(--bg-input, #0f1115);
    --ds-accent: var(--accent, #3b82f6);
    --ds-accent-hover: var(--accent-hover, #2563eb);
    --ds-text-muted: var(--text-muted, #94a3b8);
    --ds-text-subtle: var(--text-subtle, #64748b);
  }

  .ds-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-bottom: 1px solid var(--ds-border);
    background-color: var(--ds-panel-bg);
    flex-shrink: 0;
    gap: 12px;
  }

  .ds-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .ds-header-nav {
    display: inline-flex;
    align-items: center;
    background: var(--ds-input-bg);
    border: 1px solid var(--ds-border);
    border-radius: 6px;
    padding: 2px;
    gap: 2px;
  }

  .ds-header-tab {
    border: none;
    background: transparent;
    color: var(--ds-text-muted);
    font-size: 12px;
    font-weight: 500;
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .ds-header-tab:hover {
    color: var(--text-primary, #e2e8f0);
  }
  .ds-header-tab.active {
    background: rgba(59, 130, 246, 0.22);
    color: var(--text-primary, #e2e8f0);
    font-weight: 600;
  }

  .ds-header-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary, #e2e8f0);
    letter-spacing: -0.2px;
  }

  .ds-badge {
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 4px;
    background: rgba(59, 130, 246, 0.15);
    color: var(--ds-accent);
    font-weight: 500;
  }

  .ds-badge-project {
    background: rgba(34, 197, 94, 0.14);
    color: #86efac;
  }

  .ds-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ds-overwrite-banner {
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

  .ds-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid var(--ds-border);
    background: var(--ds-panel-bg);
    color: var(--text-primary, #e2e8f0);
    transition: background 0.15s, border-color 0.15s;
    user-select: none;
  }
  .ds-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--text-subtle, #64748b);
  }
  .ds-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .ds-btn-primary {
    background: var(--ds-accent);
    color: #ffffff;
    border-color: var(--ds-accent);
  }
  .ds-btn-primary:hover:not(:disabled) {
    background: var(--ds-accent-hover);
    border-color: var(--ds-accent-hover);
  }

  .ds-btn-danger {
    color: #f87171;
  }
  .ds-btn-danger:hover:not(:disabled) {
    background: rgba(248, 113, 113, 0.1);
    border-color: #f87171;
  }

  .ds-workspace {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .ds-sidebar {
    width: 280px;
    border-right: 1px solid var(--ds-border);
    background: var(--ds-panel-bg);
    display: flex;
    flex-direction: column;
    padding: 14px;
    gap: 16px;
    overflow-y: auto;
    flex-shrink: 0;
  }

  .ds-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ds-section-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--ds-text-subtle);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .ds-field-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
  }

  .ds-field-label {
    font-size: 11px;
    font-weight: 500;
    color: var(--ds-text-muted);
  }

  .ds-select {
    width: 100%;
    padding: 7px 10px;
    background-color: var(--ds-input-bg);
    border: 1px solid var(--ds-border);
    border-radius: 6px;
    color: var(--text-primary, #e2e8f0);
    font-size: 12px;
    outline: none;
    cursor: pointer;
    color-scheme: dark;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ds-select:hover:not(:disabled) {
    border-color: var(--text-subtle, #64748b);
  }
  .ds-select:focus {
    border-color: var(--ds-accent, #3b82f6);
    box-shadow: 0 0 0 1px var(--ds-accent, #3b82f6);
  }
  .ds-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .ds-select option {
    background-color: #181b20;
    color: #e2e8f0;
    padding: 6px 8px;
  }

  .ds-dictation-card {
    background: var(--ds-input-bg);
    border: 1px solid var(--ds-border);
    border-radius: 8px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    text-align: center;
  }

  .ds-meter-bar {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;
  }

  .ds-meter-fill {
    height: 100%;
    background: var(--ds-accent);
    transition: width 0.08s ease;
  }

  .ds-presets-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
  }

  .ds-preset-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid var(--ds-border);
    background: var(--ds-input-bg);
    color: var(--text-primary, #e2e8f0);
    cursor: pointer;
    font-size: 11px;
    text-align: left;
    transition: border-color 0.15s, background 0.15s;
    width: 100%;
    box-sizing: border-box;
  }
  .ds-preset-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--text-subtle);
  }
  .ds-preset-btn.active {
    border-color: var(--ds-accent);
    background: rgba(59, 130, 246, 0.12);
  }
  .ds-preset-btn .preset-title {
    font-weight: 600;
    margin-bottom: 2px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
  }
  .ds-preset-btn .preset-desc {
    font-size: 10.5px;
    color: var(--ds-text-muted);
    line-height: 1.3;
  }

  .ds-tone-panel {
    margin-top: 2px;
    padding: 8px 9px;
    border-radius: 6px;
    border: 1px solid rgba(59, 130, 246, 0.35);
    background: rgba(59, 130, 246, 0.06);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .ds-tone-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 10.5px;
    color: var(--ds-text-muted);
  }
  .ds-tone-hint {
    font-size: 10px;
    color: var(--ds-text-muted);
    line-height: 1.3;
  }

  .ds-custom-prompt-input {
    width: 100%;
    background: var(--ds-input-bg);
    border: 1px solid var(--ds-border);
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
  .ds-custom-prompt-input:focus {
    border-color: var(--ds-accent);
  }

  .ds-editor-canvas {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-base, #121417);
    padding: 12px 16px;
    gap: 12px;
  }

  .ds-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--ds-border);
    border-radius: 8px;
    background: var(--ds-panel-bg);
    overflow: hidden;
    min-height: 0;
  }

  .ds-pane-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid var(--ds-border);
    background: rgba(255, 255, 255, 0.02);
    flex-shrink: 0;
  }

  .ds-pane-title {
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .ds-textarea {
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

  .ds-output-view {
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

  .ds-diff-added {
    background-color: rgba(34, 197, 94, 0.25);
    color: #86efac;
    border-radius: 2px;
    padding: 0 2px;
  }

  .ds-diff-removed {
    background-color: rgba(239, 68, 68, 0.25);
    color: #fca5a5;
    text-decoration: line-through;
    border-radius: 2px;
    padding: 0 2px;
  }

  .ds-diff-unchanged {
    color: inherit;
  }

  .ds-action-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--ds-panel-bg);
    border: 1px solid var(--ds-border);
    border-radius: 8px;
    flex-shrink: 0;
    gap: 8px;
  }

  .ds-status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 16px;
    background: var(--ds-panel-bg);
    border-top: 1px solid var(--ds-border);
    font-size: 11px;
    color: var(--ds-text-subtle);
    flex-shrink: 0;
  }

  .ds-pill {
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.06);
    font-size: 10px;
  }

  .ds-empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 32px 24px;
    gap: 12px;
  }

  .ds-empty-card {
    max-width: 440px;
    padding: 20px 24px;
    border-radius: 10px;
    border: 1px solid var(--ds-border);
    background: var(--ds-panel-bg);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  @keyframes ds-spin-anim {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .ds-spin {
    display: inline-block;
    animation: ds-spin-anim 1.2s linear infinite;
  }
`,fr="zcc:draft-studio:studio-draft:v1";function ra(e){return e?`${fr}:project:${e}`:fr}var mt=[{id:"standard",label:"Standard",desc:"Fix grammar & clarity while keeping your natural tone and length."},{id:"casual",label:"Casual",desc:"Relaxed, everyday phrasing \u2014 natural without sounding stiff."},{id:"conversational",label:"Conversational",desc:"Warm, natural, and easy to read \u2014 like speaking clearly."},{id:"formal",label:"Professional",desc:"Polished, respectful phrasing for emails, PRs, or stakeholders."},{id:"technical",label:"Technical",desc:"Precise, unambiguous engineering phrasing without fluff."}],R={improve:"improve",executive:"executive",spec:"spec",custom:"custom",translate:"translate"},gr=new Set(Object.values(R)),_n=[{id:R.improve,title:"Improve writing",icon:"\u2728",desc:"Fix grammar, phrasing & punctuation without extending length.",tone:"standard"},{id:R.executive,title:"Summarize",icon:"\u26A1",desc:"Condense into punchy bullet points.",instruction:"Summarize the core request into crisp, high-level executive bullet points.",tone:"formal"},{id:R.spec,title:"Create a technical spec",icon:"\u{1F4D0}",desc:"Format with Goals, Context, Steps.",instruction:"Transform into a structured technical spec with ## Goal, ## Architecture, and ## Implementation Steps.",tone:"technical"}];function ia(e,t){switch(e){case R.improve:return t?"Improving...":"Improve text";case R.executive:return t?"Summarizing...":"Summarize";case R.spec:return t?"Creating spec...":"Create spec";case R.custom:return t?"Running...":"Run instructions";case R.translate:return t?"Translating...":"Translate";default:return t?"Transforming...":"Transform text"}}function sa(e,t,o){switch(e){case R.improve:return`\u2B07 Improve writing \xB7 ${t}`;case R.translate:return`\u2B07 Translate \xB7 ${Ke(o)?.label??o}`;case R.custom:return"\u2B07 Custom instructions";default:return`\u2B07 ${_n.find(r=>r.id===e)?.title??"Refine pipeline"}`}}var br={system:"Host STT",openai:"OpenAI","google-gemini":"Google Gemini","local-whisper":"Local Whisper"};function Gt(e){return e==="openai"||e==="google-gemini"}var aa=[{id:"google-gemini",label:"Google Gemini"},{id:"local-whisper",label:"Local Whisper (on this device)"},{id:"openai",label:"OpenAI (Whisper)"},{id:"system",label:"System (Zana Voice)"}],da=[{id:"assistant",displayName:"Zana Assistant",models:[{id:"assistant",key:"assistant",label:"Default Assistant (Host Agent)",providerId:"assistant"}]}],yr=[1500,3e3];function hr({focusWindow:e,bringBack:t}){return oe(),d("div",{className:"ds-container","data-testid":"ds-detached-placeholder",children:[n("style",{children:Nn}),n("div",{className:"ds-empty-state",children:d("div",{className:"ds-empty-card",children:[n("span",{style:{fontSize:22},"aria-hidden":"true",children:"\u{1F399}\uFE0F"}),n("div",{style:{fontSize:14,fontWeight:600},children:"Draft Studio is open in its own window"}),n("div",{style:{fontSize:12,color:"var(--ds-text-muted)"},children:"Focus the floating window or bring Draft Studio back to this project tab."}),d("div",{style:{display:"flex",gap:8,marginTop:4},children:[n("button",{type:"button",className:"ds-btn ds-btn-primary",onClick:e,children:"Focus Window"}),n("button",{type:"button",className:"ds-btn",onClick:t,children:"Bring Back"})]})]})})]})}function la(e){let t=xo();return t||(e&&e.replace(/^\/+/,"").toLowerCase()===Ie?"history":"studio")}function Mn({pluginId:e,projectId:t,subPath:o,headerActions:r,startSession:i=be}){oe();let[a,c]=b(()=>la(o)),[s,p]=b(!1),[m,u]=b(null),g=Lt(e),y=Ro(),h=$e(),C=Be(),k=Ge(),D=wn(h?.scope,C).threadId,P=Ee(),w=h?.providerId,O=h?.familyId,j=ra(t),v=x(!1),[z,q]=b(null),[I,X]=b(""),[H,ne]=b(""),[Ne,Wt]=b(null),B=x(null),Z=E(l=>{B.current=l,Wt(l)},[]),[ye,Je]=b(!1),[Qe,ft]=b(!1),[se,Ln]=b(!1),[On,gt]=b(null),[Hn,jn]=b(!1),[Fn,Vn]=b(null),[_e,Un]=b(null),[bt,yt]=b(!0),[zn,Yt]=b(null),[Me,Le]=b("assistant"),[et,Oe]=b("assistant"),[Ae,$n]=b(null),[ca,ht]=b(null),[tt,Bn]=b(!0),[Gn,vr]=b(null),[nt,vt]=b(!1),[G,ae]=b(R.improve),[ot,he]=b("standard"),[rt,it]=b(Ze),[xt,qt]=b(""),[de,Wn]=b(!1),[Yn,A]=b(null),[J,st]=b("system"),[Zt,St]=b(""),[Kt,qn]=b(!0),[Zn,xr]=b(["system"]),[Xt,Re]=b(null),[ue,Jt]=b(!1),[Sr,Kn]=b(0),[wr,Qt]=b(null),[Xn,Ir]=b(()=>fe()),Jn=x(Xn);Jn.current=Xn;let ve=x(null),wt=x(null),He=x(null),je=x(null),Qn=x(null);N(()=>{o&&o.replace(/^\/+/,"").toLowerCase()===Ie&&(p(!1),c("history"))},[o]),N(()=>So(l=>{p(!1),c(l)}),[]),N(()=>{try{let l=localStorage.getItem(j);if(l){let f=JSON.parse(l),S=typeof f.inputText=="string"?f.inputText:"",_=typeof f.outputText=="string"?f.outputText:"",T=(S.trim()||_.trim())&&typeof f.historyEntryId=="string"&&f.historyEntryId.trim()?f.historyEntryId.trim():null;X(S),ne(_),Z(T),Le(f.selectedProviderId||"assistant"),Oe(f.selectedModelId||"assistant"),v.current=f.userManuallySelected===!0,st(f.sttProvider||"system"),St(f.sttModel||""),f.selectedPresetId==="polish"?(ae(R.improve),he("standard")):f.selectedPresetId==="chat"?(ae(R.improve),he("conversational")):typeof f.selectedPresetId=="string"&&gr.has(f.selectedPresetId)?ae(f.selectedPresetId):ae(R.improve),typeof f.selectedToneId=="string"&&mt.some(M=>M.id===f.selectedToneId)?he(f.selectedToneId):f.selectedPresetId!=="chat"&&he("standard"),it(Ke(f.targetLanguage)?.code??Ze)}else X(""),ne(""),Z(null),Le("assistant"),Oe("assistant"),st("system"),St(""),ae(R.improve),he("standard"),it(Ze),v.current=!1}catch{}q(j)},[j,Z]);let at=x(g);at.current=g;let ie=x(!0),en=x(0),It=x(0),Tt=x(0),Et=x(null),Ct=E(l=>{l&&(l.llmProvider&&(ht(l.llmProvider),Bn(l.llmProvider!=="none")),l.sttProvider&&st(l.sttProvider),typeof l.sttKeyConfigured=="boolean"&&qn(l.sttKeyConfigured),xr(_t(l)))},[]),dt=E(()=>{at.current.call(me).then(l=>{ie.current&&Ct(l)}).catch(()=>{})},[Ct]);N(()=>{let l=!0;return at.current.call(me).then(f=>{l&&Ct(f)}).catch(()=>{}),()=>{l=!1}},[Ct]);let At=E(l=>{Ir(f=>f.micDeviceId===l.micDeviceId&&f.micLabel===l.micLabel&&f.soundCuesEnabled===l.soundCuesEnabled&&f.soundCuesVolume===l.soundCuesVolume?f:l)},[]),Rt=E(()=>{let l=++en.current;at.current.call(Se).then(f=>{if(!ie.current||en.current!==l)return;let S=f||{};typeof S.sttProvider=="string"&&S.sttProvider&&st(S.sttProvider),typeof S.sttModel=="string"&&S.sttModel&&St(S.sttModel),typeof S.llmProvider=="string"&&S.llmProvider&&S.llmProvider!=="none"?$n({providerId:S.llmProvider,modelId:typeof S.llmModel=="string"&&S.llmModel?S.llmModel:void 0}):S.llmProvider==="none"&&$n(null),f&&typeof f=="object"&&At(ge(S))}).catch(()=>{})},[At]),lt=E(()=>{Et.current&&(clearTimeout(Et.current),Et.current=null)},[]),Fe=E((l={})=>{let f=l.refresh===!0,S=l.retryAttempt??0;lt();let _=++Tt.current;yt(!0),(f||S===0)&&Yt(null);let T=()=>{if(!ie.current||S>=yr.length)return;let M=yr[S];Et.current=setTimeout(()=>{ie.current&&Fe({retryAttempt:S+1})},M)};at.current.call(uo,f?{refresh:!0}:void 0).then(M=>{if(!ie.current||Tt.current!==_)return;let V=Array.isArray(M)?M:[];Un(V),yt(!1),!V.some(W=>W.providerId!=="assistant"&&Array.isArray(W.models)&&W.models.length>0)&&!f&&T()}).catch(()=>{!ie.current||Tt.current!==_||(yt(!1),Yt("Could not load Composer models. Using Zana Assistant."),T())})},[lt]);Te(Nt,l=>{!ie.current||!Array.isArray(l)||(Un(l),yt(!1),Yt(null),lt(),dt())}),N(()=>(ie.current=!0,Rt(),Fe(),()=>{ie.current=!1,en.current++,It.current++,Tt.current++,lt()}),[lt,Fe,Rt]);let eo=U(()=>{let l=new Set(Zn);return l.add("system"),aa.filter(f=>l.has(f.id))},[Zn]),tn=eo.some(l=>l.id===J),Tr=U(()=>(_e??[]).some(l=>l.providerId!=="assistant"&&Array.isArray(l.models)&&l.models.length>0),[_e]),le=U(()=>{let l=(T,M)=>[...T].sort((V,te)=>M(V).localeCompare(M(te),void 0,{sensitivity:"base",numeric:!0})),f=(_e??[]).filter(T=>Array.isArray(T.models)&&T.models.length>0);if(f.length===0){let T=da.map(M=>{let V=!!(w&&M.id.toLowerCase()===w.toLowerCase()||O&&M.id.toLowerCase().includes(O.toLowerCase())),te=Pn(M.models).map(W=>({...W,isComposerMatch:V}));return{...M,isComposerMatch:V,models:te}});return l(T,M=>M.displayName||M.id)}let S={"assistant:assistant":"assistant"},_=f.map(T=>{let M=!!(w&&T.providerId.toLowerCase()===w.toLowerCase()||O&&T.providerId.toLowerCase().includes(O.toLowerCase())),V=Pn(T.models).map(te=>{let W=`${T.providerId}:${te.id}`,Gr=S[W]??te.id;return{id:te.id,key:Gr,label:te.label||te.id,providerId:T.providerId,isComposerMatch:M}});return{id:T.providerId,displayName:T.displayName||T.providerId,isComposerMatch:M,error:T.error??null,models:V}});return l(_,T=>T.displayName||T.id)},[_e,w,O]),Q=U(()=>le.find(l=>l.id===Me)??le[0],[le,Me]),De=U(()=>Q?.models??[],[Q]),ee=U(()=>De.find(f=>f.id===et||f.key===et)??De[0],[De,et]);N(()=>{if(_e===null||v.current||le.length===0)return;let l=le.find(f=>f.isComposerMatch&&f.models.length>0)??le.find(f=>f.isComposerMatch);if(l){Le(l.id),l.models.length>0&&Oe(l.models[0].key||l.models[0].id);return}if(Ae&&Ae.providerId!=="assistant"){let f=le.find(S=>S.id===Ae.providerId&&S.models.length>0);if(f){Le(f.id);let _=(Ae.modelId?f.models.find(T=>T.id===Ae.modelId||T.key===Ae.modelId):void 0)??f.models[0];_&&Oe(_.key||_.id)}}},[_e,le,Ae]),N(()=>{z===j&&!I.trim()&&!H.trim()&&!ue&&!se&&!de&&B.current!==null&&Z(null)},[z,j,I,H,ue,se,de,Z]),N(()=>{if(z===j)try{localStorage.setItem(j,JSON.stringify({inputText:I,outputText:H,historyEntryId:Ne,selectedProviderId:Me,selectedModelId:et,userManuallySelected:v.current,sttProvider:J,sttModel:Zt,selectedPresetId:G,selectedToneId:ot,targetLanguage:rt}))}catch{}},[z,j,I,H,Ne,Me,et,J,Zt,G,ot,rt]);let Er=l=>{Bn(l);let f=l?Q?.id??"assistant":"none",S=l?ee?.id??"assistant":"";ht(f),g.call(we,{llmProvider:f,llmModel:S}).catch(()=>{A("Could not update cleanup setting.")})},nn=l=>{st(l),Re(null),g.call(we,{sttProvider:l}).then(()=>dt()).catch(()=>{A("Could not update speech provider setting.")})},Cr=l=>{St(l),g.call(we,{sttModel:l}).catch(()=>{})},Ar=l=>{v.current=!0,Le(l);let f=le.find(_=>_.id===l),S="";if(f&&f.models.length>0){let _=f.models[0].key||f.models[0].id;S=f.models[0].id,Oe(_)}tt&&(ht(l),g.call(we,{llmProvider:l,llmModel:S}).catch(()=>{}))},Rr=l=>{v.current=!0;let f=Me,S=l;for(let _ of le){let T=_.models.find(M=>M.id===l||M.key===l);if(T){_.id!==Me&&(Le(_.id),f=_.id),Oe(T.key||T.id),S=T.id;break}}tt&&(ht(f),g.call(we,{llmProvider:f,llmModel:S}).catch(()=>{}))};N(()=>()=>{He.current&&clearInterval(He.current),je.current&&clearInterval(je.current),ve.current&&ve.current.cancel()},[]);let Dr=U(()=>{let l=I.trim();return`${l?l.split(/\s+/).length:0} words \xB7 ${I.length} chars`},[I]),kr=U(()=>{let l=H.trim();return`${l?l.split(/\s+/).length:0} words \xB7 ${H.length} chars`},[H]),Pr=U(()=>!H||!nt?[]:Bt(I,H),[I,H,nt]),on=()=>{He.current&&(clearInterval(He.current),He.current=null),je.current&&(clearInterval(je.current),je.current=null)},Nr=()=>{on(),He.current=setInterval(()=>Kn(l=>l+1),1e3),je.current=setInterval(()=>{ve.current&&Qt(ve.current.getAudioLevel?.()??null)},100)},to=async l=>{Jt(!1),Qt(null),on();let f=ve.current;ve.current=null;let S=wt.current;wt.current=null;let _=S!==null?Math.max(0,Date.now()-S):void 0;if(f){Ln(!0);try{let T=await f.stop();if(!ie.current)return;F("stop",l);let M=await We(g,T),V=await g.call(Ve,{audio:M.base64,mimeType:M.mimeType,transcriptionOnly:!0,source:"studio",...t?{projectId:t}:{},...D?{threadId:D}:{},...typeof _=="number"?{audioDurationMs:_}:{},...B.current?{historyEntryId:B.current}:{}});V.ok&&V.status==="ok"?(F("complete",l),typeof V.historyEntryId=="string"&&V.historyEntryId&&Z(V.historyEntryId),X(te=>Ye(te,V.text)),Re(null)):V.ok&&V.status==="no-speech"?(A("No speech detected. Try speaking closer to the microphone."),setTimeout(()=>A(null),4e3)):V.ok||(F("error",l),A(V.message),Re(V.message),V.code==="MISSING_KEY"&&(qn(!1),dt()))}catch(T){F("error",l),A(T instanceof Error?T.message:"Transcription failed.")}finally{Ln(!1)}}},_r=async(l,f)=>{if(Re(null),A(null),Gt(J)&&!Kt){F("error",f);let _=J==="openai"?"OpenAI":"Google Gemini";Re(`API key required for direct ${_} speech-to-text. Switch to System (Zana Voice) below to dictate using host voice.`),A(`API key required for ${_}. Switch to System (Zana Voice) to dictate thoughts.`);return}let S=++It.current;try{let _=F("start",f);if(_&&(await _,!ie.current||It.current!==S))return;let T=await(l.micDeviceId!==$?i({deviceId:l.micDeviceId}):i());if(!ie.current||It.current!==S){T.cancel();return}T.onError=M=>{ve.current=null,wt.current=null,Jt(!1),Qt(null),on(),F("error",f),Re(M.message),A(M.message)},T.onAutoStop=()=>{A("Recording limit reached. Transcribing captured audio."),to(f)},ve.current=T,wt.current=Date.now(),Jt(!0),Kn(0),Nr()}catch(_){F("error",f),A(_ instanceof Error?_.message:"Microphone access denied.")}},rn=E(()=>{p(!1),At(fe()),Rt(),dt(),Fe()},[Fe,Rt,dt,At]),Mr=async()=>{let l=Jn.current,f={enabled:l.soundCuesEnabled,volume:l.soundCuesVolume};ue?await to(f):await _r(l,f)},Lr=async()=>{let l=I.trim();if(!l||de||!ee||G===R.custom&&!xt.trim())return;let f=_n.find(W=>W.id===G),S=G===R.custom,_=G===R.improve,T=G===R.translate,M=T?"standard":S?"custom":_?ot:f?.tone||"technical",V=Q?.id??"assistant",te=ee?.id??"assistant";A(null),Wn(!0);try{let W=await g.call(po,{text:l,tone:M,...T?{targetLanguage:rt}:{},...S?{customPrompt:xt.trim()}:{},...!S&&!T&&f?.instruction?{instruction:f.instruction}:{},llmProvider:V,llmModel:te,source:"studio",presetId:G,...t?{projectId:t}:{},...D?{threadId:D}:{},...B.current?{historyEntryId:B.current}:{}});W.ok?(typeof W.historyEntryId=="string"&&W.historyEntryId&&Z(W.historyEntryId),ne(W.text),vr(`${Q?.displayName||V}: ${W.llmModel||te}`)):A(W.message)}catch(W){A(W instanceof Error?W.message:"Refinement request failed.")}finally{Wn(!1)}},Or=async()=>{try{let l=await navigator.clipboard.readText();if(!l||!l.trim()){A("Clipboard is empty."),setTimeout(()=>A(null),2500);return}X(f=>Ye(f,l)),A("Pasted from clipboard into input draft!"),setTimeout(()=>A(null),2500)}catch{A("Clipboard access denied or unavailable."),setTimeout(()=>A(null),2500)}},Hr=async()=>{if(!I)return;await Xe(I)?(ft(!0),setTimeout(()=>ft(!1),2e3),A("Input draft copied to clipboard!"),setTimeout(()=>A(null),2500)):(A("Failed to copy to clipboard."),setTimeout(()=>A(null),3e3))},jr=async()=>{if(!H)return;await Xe(H)?(Je(!0),setTimeout(()=>Je(!1),2e3),A("Refined output copied to clipboard!"),setTimeout(()=>A(null),2500)):(A("Failed to copy to clipboard."),setTimeout(()=>A(null),3e3))},Fr=()=>{!I&&!H||(Z(null),X(""),ne(""),ae(R.improve),he("standard"),it(Ze),qt(""),vt(!1),A("Studio canvas cleared."),setTimeout(()=>A(null),2500))},Vr=()=>{H&&(X(H),ne(""),vt(!1),A("Refined output moved to input draft."),setTimeout(()=>A(null),2500))},no=E(l=>{if(l){if(y&&typeof y.updateText=="function")try{y.updateText(f=>Ye(f,l)),y.focus?.(),gt("Inserted into Composer!"),A("Inserted into Composer!"),setTimeout(()=>gt(null),2500),setTimeout(()=>A(null),2500);return}catch{}if(k&&typeof k.toCompose=="function"){k.toCompose({initialPrompt:l,focusPrompt:!0}),gt("Opened in New Thread Composer!"),A("Opened in New Thread Composer!"),setTimeout(()=>gt(null),2500),setTimeout(()=>A(null),2500);return}Xe(l).then(f=>{A(f?"No active composer \u2014 copied prompt to clipboard.":"Composer focus unavailable.")})}},[y,k]),Ur=()=>{no(H||I)},sn=E(l=>{if(Z(null),X(l.rawText),ne(l.kind==="refinement"||l.outputText!==l.rawText?l.outputText:""),l.kind==="refinement"||l.presetId||l.targetLanguage||l.customPrompt){let f=l.presetId&&gr.has(l.presetId)?l.presetId:l.targetLanguage?R.translate:l.tone==="custom"?R.custom:R.improve;ae(f),l.tone&&mt.some(S=>S.id===l.tone)&&he(l.tone),l.targetLanguage&&it(Ke(l.targetLanguage)?.code??Ze),qt(l.customPrompt??"")}vt(!1),u(null),p(!1),c("studio"),A("Loaded entry into Studio."),setTimeout(()=>A(null),2500)},[Z]),zr=E(l=>{if(I.trim()||H.trim()){u(l);return}sn(l)},[sn,I,H]),$r=async()=>{if(e){jn(!0),Vn(null);try{await Ot(e,{showInProjects:!0})}catch(l){Vn(l instanceof Error?l.message:"Could not update plugin settings.")}finally{jn(!1)}}},Br=E(l=>{(l.ctrlKey||l.metaKey)&&l.key.toLowerCase()==="k"&&(l.preventDefault(),p(!1),c("studio"),ae(R.custom),setTimeout(()=>Qn.current?.focus(),0))},[]);if(t&&!P.showInProjects)return d("div",{className:"ds-container",children:[n("style",{children:Nn}),d("header",{className:"ds-header",children:[d("div",{className:"ds-header-left",children:[n("span",{style:{fontSize:18},children:"\u{1F399}\uFE0F"}),n("span",{className:"ds-header-title",children:"Draft Studio"}),n("span",{className:"ds-badge ds-badge-project",children:"Project"})]}),r?n("div",{className:"ds-header-actions",children:r}):null]}),n("div",{className:"ds-empty-state","data-testid":"ds-project-hidden-notice",children:d("div",{className:"ds-empty-card",children:[n("span",{style:{fontSize:22},"aria-hidden":"true",children:"\u{1F507}"}),n("div",{style:{fontSize:14,fontWeight:600},children:"Draft Studio is hidden in projects"}),n("div",{style:{fontSize:12,color:"var(--ds-text-muted)",lineHeight:1.45},children:"You disabled the project tab in Draft Studio plugin settings. Re-enable it anytime to use project-scoped drafts here."}),Fn?n("div",{role:"alert",style:{fontSize:11,color:"#fca5a5"},children:Fn}):null,e?n("button",{type:"button",className:"ds-btn ds-btn-primary",disabled:Hn,onClick:()=>void $r(),children:Hn?"Enabling\u2026":"Enable Draft Studio in Projects"}):null]})})]});let oo=mt.find(l=>l.id===ot)??mt[0],ro=l=>{u(null),s&&rn(),c(l)};return d("div",{className:"ds-container",onKeyDown:Br,children:[n("style",{children:Nn}),d("header",{className:"ds-header",children:[d("div",{className:"ds-header-left",children:[n("span",{style:{fontSize:18},children:"\u{1F399}\uFE0F"}),n("span",{className:"ds-header-title",children:"Draft Studio"}),n("span",{className:"ds-badge",children:"Voice & AI Refinement"}),t?n("span",{className:"ds-badge ds-badge-project",children:"Project"}):null]}),d("div",{className:"ds-header-actions",children:[d("nav",{className:"ds-header-nav",role:"tablist","aria-label":"Draft Studio views",children:[n("button",{type:"button",role:"tab","aria-selected":!s&&a==="studio",className:`ds-header-tab ${!s&&a==="studio"?"active":""}`,onClick:()=>ro("studio"),children:"Studio"}),n("button",{type:"button",role:"tab","aria-selected":!s&&a==="history",className:`ds-header-tab ${!s&&a==="history"?"active":""}`,onClick:()=>ro("history"),children:"History"})]}),n("button",{type:"button",className:`ds-btn ${s?"ds-btn-primary":""}`,"aria-pressed":s,onClick:()=>{u(null),s?rn():p(!0)},children:"Settings"}),r]})]}),m?d("div",{className:"ds-overwrite-banner",role:"alertdialog","aria-label":"Confirm overwrite studio draft",children:[n("span",{children:"Replace your current Studio draft with this history entry?"}),d("div",{style:{display:"flex",gap:6},children:[n("button",{type:"button",className:"ds-btn",onClick:()=>u(null),children:"Cancel"}),n("button",{type:"button",className:"ds-btn ds-btn-primary",onClick:()=>sn(m),children:"Replace Draft"})]})]}):null,s?n(nr,{rpc:g,pluginId:e,onBack:rn}):a==="history"?n(ur,{rpc:g,projectId:t,onLoadIntoStudio:zr,onInsertIntoComposer:no,onOpenSettings:()=>p(!0),onStatusNotice:l=>{A(l),setTimeout(()=>A(f=>f===l?null:f),2500)}}):d("div",{className:"ds-workspace",children:[d("aside",{className:"ds-sidebar",children:[d("section",{className:"ds-section",children:[d("div",{className:"ds-section-title",children:[n("span",{children:"Voice Dictation"}),n("span",{style:{fontSize:10,color:"var(--ds-text-muted)"},children:br[J]??J})]}),d("div",{className:"ds-field-group",children:[n("label",{htmlFor:"ds-stt-provider-select",className:"ds-field-label",children:"Speech Provider"}),d("select",{id:"ds-stt-provider-select",className:"ds-select","aria-label":"Speech-to-text provider",value:tn?J:"",onChange:l=>{Re(null),nn(l.target.value)},disabled:ue||se,children:[!tn&&n("option",{value:"",disabled:!0,hidden:!0,children:`${br[J]??J} (Not configured)`}),eo.map(l=>n("option",{value:l.id,children:l.label},l.id))]})]}),Gt(J)&&tn&&d("div",{className:"ds-field-group",children:[n("label",{htmlFor:"ds-stt-model-input",className:"ds-field-label",children:"Speech Model (Optional)"}),n("input",{id:"ds-stt-model-input",className:"ds-select","aria-label":"Speech-to-text model",placeholder:"Provider default",value:Zt,onChange:l=>Cr(l.target.value),disabled:ue||se})]}),Xt&&d("div",{role:"alert",style:{padding:"8px 10px",borderRadius:6,background:"rgba(239, 68, 68, 0.12)",border:"1px solid rgba(239, 68, 68, 0.35)",color:"#fca5a5",fontSize:11,textAlign:"left",lineHeight:1.4,display:"flex",flexDirection:"column",gap:6},children:[d("div",{children:["\u26A0\uFE0F ",Xt]}),Gt(J)&&n("button",{type:"button",className:"ds-btn ds-btn-primary",style:{alignSelf:"flex-start",fontSize:11,padding:"4px 8px"},onClick:()=>nn("system"),children:"Switch to System (Zana Voice)"})]}),Gt(J)&&!Kt&&!Xt&&d("div",{style:{padding:"8px 10px",borderRadius:6,background:"rgba(234, 179, 8, 0.1)",border:"1px solid rgba(234, 179, 8, 0.3)",color:"#fde047",fontSize:11,textAlign:"left",lineHeight:1.4,display:"flex",flexDirection:"column",gap:6},children:[d("div",{children:["\u2139\uFE0F ",n("strong",{children:"API key required:"})," Direct ",J==="openai"?"OpenAI Whisper":"Google Gemini"," speech-to-text requires an API key in Zana Settings."]}),n("button",{type:"button",className:"ds-btn ds-btn-primary",style:{alignSelf:"flex-start",fontSize:11,padding:"4px 8px"},onClick:()=>nn("system"),children:"Switch to System (Zana Voice)"})]}),d("div",{className:"ds-dictation-card",children:[d("button",{type:"button",className:`ds-btn ${ue?"ds-btn-danger":se?"":"ds-btn-primary"}`,style:{width:"100%",justifyContent:"center",padding:"10px 0",opacity:se?.8:1},onClick:Mr,disabled:se,"aria-label":se?"Transcribing audio":ue?"Stop dictation":"Start dictation",children:[n("span",{className:se?"ds-spin":void 0,children:se?"\u23F3":ue?"\u23F9\uFE0F":"\u{1F399}\uFE0F"}),n("span",{children:se?"Transcribing...":ue?`Stop Dictation (${Sr}s)`:"Dictate Thoughts"})]}),ue&&d("div",{style:{width:"100%",display:"flex",flexDirection:"column",gap:4},children:[n("div",{className:"ds-meter-bar",children:n("div",{className:"ds-meter-fill",style:{width:`${Math.min(100,(wr??.1)*100)}%`}})}),n("span",{style:{fontSize:10,color:"var(--ds-text-muted)"},children:"Listening live..."})]})]}),n("div",{style:{fontSize:10,color:"var(--ds-text-subtle)",lineHeight:1.3},children:J==="system"?"Uses host Zana voice transcription without requiring external API keys.":J==="local-whisper"?"Transcribes on this device. Install the runtime and a model in Settings.":Kt?`Using direct ${J==="openai"?"OpenAI Whisper":"Google Gemini"} speech-to-text.`:`\u26A0\uFE0F ${J==="openai"?"OpenAI":"Google Gemini"} requires an API key in Zana Settings. Choose System (Zana Voice) for built-in free dictation.`})]}),d("section",{className:"ds-section",children:[d("div",{className:"ds-section-title",children:[n("span",{children:"Refinement Engine"}),d("span",{style:{display:"inline-flex",alignItems:"center",gap:6},children:[n("span",{style:{fontSize:10,color:"var(--ds-text-muted)"},children:bt&&!Tr?"Loading\u2026":bt?"Refreshing\u2026":Q?.isComposerMatch?"\u2605 Composer Active":"AI Model"}),n("button",{type:"button",className:"ds-btn",style:{padding:"2px 6px",fontSize:10},onClick:()=>Fe({refresh:!0}),disabled:bt||de,"aria-label":"Refresh models",title:"Reload models from Composer",children:bt?"\u2026":"\u21BB"})]})]}),d("div",{className:"ds-field-group",children:[n("label",{htmlFor:"ds-provider-select",className:"ds-field-label",children:"Provider"}),n("select",{id:"ds-provider-select",className:"ds-select","aria-label":"Refinement provider",value:Q?.id??"",onChange:l=>Ar(l.target.value),disabled:de,children:le.map(l=>d("option",{value:l.id,children:[l.displayName,l.isComposerMatch?" \u2605 (Composer)":""]},l.id))})]}),d("div",{className:"ds-field-group",children:[d("label",{htmlFor:"ds-model-select",className:"ds-field-label",children:["Model (",De.length,")"]}),n("select",{id:"ds-model-select",className:"ds-select","aria-label":"Refinement model",value:ee?.key||ee?.id||"",onChange:l=>Rr(l.target.value),disabled:de||De.length===0,children:De.length===0?n("option",{value:"",children:"No models available"}):De.map(l=>d("option",{value:l.key||l.id,children:[l.label,l.isComposerMatch?" \u2605 (Composer)":""]},l.key||l.id))})]}),(Q?.error||zn)&&n("div",{role:"status",style:{fontSize:10.5,color:"#fde047",lineHeight:1.35,padding:"6px 8px",borderRadius:6,background:"rgba(234, 179, 8, 0.1)",border:"1px solid rgba(234, 179, 8, 0.25)"},children:Q?.error||zn}),d("div",{style:{marginTop:8,paddingTop:8,borderTop:"1px solid var(--ds-border)",display:"flex",flexDirection:"column",gap:4},children:[d("label",{style:{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:11,fontWeight:500,userSelect:"none"},children:[n("input",{type:"checkbox","aria-label":"Auto-cleanup mic dictations",checked:tt,onChange:l=>Er(l.target.checked)}),n("span",{children:"Auto-cleanup mic dictations"})]}),n("span",{style:{fontSize:10,color:"var(--ds-text-subtle)",lineHeight:1.3},children:tt?`Composer mic cleans up using ${Q?.displayName}${ee?` (${ee.label||ee.id})`:""}.`:"Composer mic inserts raw transcript without AI cleanup."})]}),d("div",{style:{marginTop:4,fontSize:11,color:"var(--ds-text-muted)",lineHeight:1.35},children:[Q?.isComposerMatch?d("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:600},children:["\u2605 Synced to Composer: ",Q.displayName,ee?` (${ee.label})`:""]}):Q?.id==="assistant"?"Uses the active Zana assistant agent with no extra API key required.":ee?d(K,{children:["Using ",n("strong",{children:Q?.displayName})," \xB7 ",n("code",{children:ee.id})]}):null,Gn?d("div",{style:{marginTop:3,color:"var(--ds-text-subtle)",fontSize:10},children:["Last refined: ",Gn]}):null]})]}),d("section",{className:"ds-section",children:[n("div",{className:"ds-section-title",children:"How should we improve it?"}),d("div",{className:"ds-presets-list",role:"radiogroup","aria-label":"How should we improve it?",children:[_n.map(l=>d("div",{style:{display:"flex",flexDirection:"column",gap:6},children:[d("label",{className:`ds-preset-btn ${G===l.id?"active":""}`,children:[d("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:l.id,checked:G===l.id,onChange:()=>ae(l.id)}),l.title]}),n("span",{className:"preset-desc",children:l.desc})]}),l.id===R.improve&&G===R.improve&&d("div",{className:"ds-tone-panel",children:[d("div",{className:"ds-tone-header",children:[n("label",{htmlFor:"ds-improve-tone-select",children:n("strong",{style:{color:"var(--text-primary, #e2e8f0)"},children:"Tone"})}),n("span",{style:{color:"var(--ds-text-subtle)"},children:"Same length"})]}),n("select",{id:"ds-improve-tone-select",className:"ds-select","aria-label":"Improvement tone",value:ot,onChange:f=>he(f.target.value),disabled:de,children:mt.map(f=>n("option",{value:f.id,children:f.label},f.id))}),n("div",{className:"ds-tone-hint",children:oo.desc})]})]},l.id)),d("label",{className:`ds-preset-btn ${G===R.custom?"active":""}`,children:[d("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:R.custom,checked:G===R.custom,onChange:()=>ae(R.custom)}),"Custom instructions"]}),n("span",{className:"preset-desc",children:"Describe your own transformation."})]}),G===R.custom&&n("textarea",{ref:Qn,className:"ds-custom-prompt-input","aria-label":"Custom instructions",placeholder:"e.g. Turn into user stories with acceptance criteria...",value:xt,onChange:l=>qt(l.target.value)}),d("div",{style:{display:"flex",flexDirection:"column",gap:6},children:[d("label",{className:`ds-preset-btn ${G===R.translate?"active":""}`,children:[d("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:R.translate,checked:G===R.translate,onChange:()=>ae(R.translate)}),"Translate"]}),n("span",{className:"preset-desc",children:"Translate into another language while keeping meaning."})]}),G===R.translate&&d("div",{className:"ds-tone-panel",children:[d("div",{className:"ds-tone-header",children:[n("label",{htmlFor:"ds-translate-lang-select",children:n("strong",{style:{color:"var(--text-primary, #e2e8f0)"},children:"Target language"})}),n("span",{style:{color:"var(--ds-text-subtle)"},children:"Same meaning"})]}),n("select",{id:"ds-translate-lang-select",className:"ds-select","aria-label":"Target language",value:rt,onChange:l=>it(l.target.value),disabled:de,children:An.map(l=>n("option",{value:l.code,children:l.label},l.code))})]})]})]})]})]}),d("main",{className:"ds-editor-canvas",children:[d("section",{className:"ds-pane",children:[d("div",{className:"ds-pane-header",children:[d("div",{className:"ds-pane-title",children:[n("span",{children:"\u{1F4DD}"}),n("span",{children:"Raw Input Draft"})]}),d("div",{style:{display:"flex",gap:6},children:[n("button",{type:"button",className:"ds-btn",style:{padding:"3px 8px",fontSize:11},onClick:Or,title:"Paste from clipboard into input draft","aria-label":"Paste into input draft",children:"\u{1F4CB} Paste"}),n("button",{type:"button",className:"ds-btn",style:{padding:"3px 8px",fontSize:11},onClick:Hr,disabled:!I,title:"Copy raw input","aria-label":"Copy raw input",children:Qe?"\u2705 Copied":"\u{1F4CB} Copy"})]})]}),n("textarea",{className:"ds-textarea",placeholder:"Type your raw thoughts or click Dictate in the left sidebar to speak...",value:I,onChange:l=>X(l.target.value),"aria-label":"Raw Input Text"})]}),d("div",{className:"ds-action-bar",children:[d("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12},children:[n("span",{className:"ds-pill",children:sa(G,oo.label,rt)}),n("span",{style:{color:"var(--ds-text-muted)"},children:I.trim()?`${I.trim().split(/\s+/).length} words ready`:"Add text to get started"})]}),n("div",{style:{display:"flex",alignItems:"center",gap:6},children:d("button",{type:"button",className:"ds-btn ds-btn-primary",onClick:()=>Lr(),disabled:de||!I.trim()||!ee||G===R.custom&&!xt.trim(),title:G===R.translate?"Translate raw draft into the selected language":"Transform raw draft into output",children:[n("span",{children:de?"\u23F3":"\u26A1"}),n("span",{children:ia(G,de)})]})})]}),d("section",{className:"ds-pane",children:[d("div",{className:"ds-pane-header",children:[d("div",{className:"ds-pane-title",children:[n("span",{children:"\u2728"}),n("span",{children:"Result"})]}),d("div",{style:{display:"flex",gap:6},children:[H&&d("button",{type:"button",className:"ds-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>vt(l=>!l),title:"Toggle inline diff against input draft",children:[n("span",{children:nt?"\u{1F441}\uFE0F":"\u{1F50D}"}),n("span",{children:nt?"View Clean":"View Diff"})]}),n("button",{type:"button",className:"ds-btn",style:{padding:"3px 8px",fontSize:11},onClick:Vr,disabled:!H,title:"Move output to input draft for iterative re-refinement",children:"\u2B06 Replace Input"}),n("button",{type:"button",className:"ds-btn",style:{padding:"3px 8px",fontSize:11},onClick:jr,disabled:!H,title:"Copy refined text to clipboard","aria-label":"Copy refined output",children:ye?"\u2705 Copied":"\u{1F4CB} Copy"})]})]}),nt&&H?n("div",{className:"ds-output-view",children:Pr.map((l,f)=>l.type==="added"?n("span",{className:"ds-diff-added",children:l.text},f):l.type==="removed"?n("span",{className:"ds-diff-removed",children:l.text},f):n("span",{className:"ds-diff-unchanged",children:l.text},f))}):n("textarea",{className:"ds-textarea",placeholder:"Your improved, structured, or translated text will appear here...",value:H,onChange:l=>ne(l.target.value),"aria-label":"Refined output"})]}),d("div",{className:"ds-action-bar",children:[n("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12},children:On?n("span",{className:"ds-badge",style:{background:"rgba(34, 197, 94, 0.2)",color:"#86efac"},children:On}):n("span",{style:{color:"var(--ds-text-muted)"},children:H?"Ready to insert refined result into Composer":I?"Ready to insert raw draft into Composer":"Draft or refine a prompt to insert into Composer"})}),d("div",{style:{display:"flex",alignItems:"center",gap:8},children:[d("button",{type:"button",className:"ds-btn",onClick:Fr,title:"Clear current input and output",disabled:!I&&!H,children:[n("span",{children:"\u{1F5D1}\uFE0F"}),n("span",{children:"Clear"})]}),d("button",{type:"button",className:"ds-btn ds-btn-primary",onClick:Ur,disabled:!I&&!H,title:"Append current text directly into Zana Composer",children:[n("span",{children:"\u{1F4AC}"}),n("span",{children:"Insert into Composer"})]})]})]})]})]}),d("footer",{className:"ds-status-bar",children:[d("div",{style:{display:"flex",gap:12},children:[d("span",{children:["Input: ",Dr]}),d("span",{children:["Output: ",kr]}),Yn&&n("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:500},children:Yn})]}),d("div",{style:{display:"flex",gap:12,alignItems:"center"},children:[d("span",{children:["Engine: ",Q?.displayName," \xB7 ",ee?.label??"No model"]}),d("span",{className:"ds-pill",children:["Mic cleanup: ",tt?`${Q?.displayName}${ee?` (${ee.label||ee.id})`:""}`:"Off (Raw)"]}),Q?.isComposerMatch&&n("span",{className:"ds-pill",style:{color:"var(--accent, #3b82f6)"},children:"\u2605 Composer Synced"}),n("span",{children:"Zana Draft Studio"})]})]})]})}var gc=ao(e=>{oe(),e.composer.customize({id:"draft-studio-mic",actions:[{id:"draft-studio-mic",component:jo}]}),e.slots.navPanel?.({id:pe,title:"Draft Studio",icon:"Sparkles",path:pe,component:Mn}),e.slots.projectTab?.({id:Pe,label:"Draft Studio",icon:"Sparkles",order:50,global:!1,header:"custom",detachable:!0,component:Mn,detachedPlaceholder:hr}),e.slots.homepageSection?.({id:"draft-studio-home",title:"Draft Studio",component:_o}),e.slots.settingsSection?.({id:"draft-studio-visibility",title:"Where Draft Studio Appears",description:"Choose whether Draft Studio appears on the main Home screen, inside projects, and in composers.",component:Ft}),e.slots.commandPaletteAction?.({id:"open-draft-studio",title:"Draft Studio: Open Canvas",isAvailable:()=>!0,run:t=>{if(Ue("studio"),typeof t.toPluginPanel=="function"){t.toPluginPanel(pe);return}t.navigate?.(`/${pe}`)}}),e.slots.commandPaletteAction?.({id:"open-draft-studio-history",title:"Draft Studio: Open History",isAvailable:()=>!0,run:t=>{if(Ue("history"),typeof t.toPluginPanel=="function"){t.toPluginPanel(pe,{subPath:Ie});return}t.navigate?.(`/${pe}/${Ie}`)}}),e.slots.commandPaletteAction?.({id:"open-draft-studio-project",title:"Draft Studio: Open in This Project",isAvailable:t=>!!t.projectId,run:t=>{t.projectId&&typeof t.toProject=="function"&&t.toProject(t.projectId,{tabId:Pe})}})});export{pe as DRAFT_STUDIO_PANEL_PATH,Pe as DRAFT_STUDIO_PROJECT_TAB_ID,gc as default};
//# sourceMappingURL=app.js.map
