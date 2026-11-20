function io(){let e=globalThis.__ZCC_PLUGIN_HOST__;if(!e)throw new Error("plugin host is not available");return e}function ke(){return globalThis.__ZCC_PLUGIN_RUNTIME__??{}}function Pt(e){throw new Error(`${e} is not available until the host plugin runtime is installed`)}async function so(e,t,o){return io().callRpc(e,t,o)}async function an(e,t){return io().setSettings(e,t)}function ao(e){return{__zccPluginApp:!0,setup:e}}function pt(){return ke().useRpc?.()??Pt("useRpc")}function ln(e,t){ke().useRealtime?.(e,t)}function cn(){return ke().useSettings?.()??{values:void 0,isLoading:!0}}function pn(){return ke().useZccContext?.()??{projectId:null,threadId:null}}function dn(){return ke().useZccNavigate?.()??Pt("useZccNavigate")}function dt(){return ke().useComposer?.()??Pt("useComposer")}function un(){return ke().useComposerView?.()??Pt("useComposerView")}var L=globalThis.__ZCC_HOST_REACT__,lo=L,da=L.Children,ua=L.Component,ma=L.Fragment,fa=L.StrictMode,ga=L.Suspense,ba=L.cloneElement,va=L.createContext,ya=L.createElement,ha=L.createRef,xa=L.forwardRef,Sa=L.isValidElement,wa=L.lazy,Ia=L.memo,Ta=L.startTransition,E=L.useCallback,Ea=L.useContext,Ca=L.useDebugValue,Ra=L.useDeferredValue,D=L.useEffect,Aa=L.useId,Pa=L.useImperativeHandle,ka=L.useInsertionEffect,Na=L.useLayoutEffect,U=L.useMemo,co=L.useReducer,x=L.useRef,b=L.useState,Da=L.useSyncExternalStore,_a=L.useTransition,Ma=L.version;var $="default";function Yr(e){if(typeof e!="string")return $;let t=e.trim().slice(0,256);return!t||t===$?$:t}function qr(e){return typeof e!="string"?"":e.trim().slice(0,200)}function Zr(e){return!(e===!1||typeof e=="string"&&e.trim().toLowerCase()==="false")}function Kr(e){let t=typeof e=="number"?e:typeof e=="string"&&e.trim()!==""?Number(e):Number.NaN;return Number.isFinite(t)?Math.round(Math.min(100,Math.max(0,t))):75}function xe(e){let t=e??{},o=Yr(t.micDeviceId);return{micDeviceId:o,micLabel:o===$?"":qr(t.micLabel),soundCuesEnabled:Zr(t.soundCuesEnabled),soundCuesVolume:Kr(t.soundCuesVolume)}}var Fe="promptVoice.transcribe",me="promptVoice.status",po="promptVoice.rephrase",uo="promptVoice.availableModels",Se="promptVoice.settings.get",we="promptVoice.settings.update",mo="promptVoice.history.list",fo="promptVoice.history.star",go="promptVoice.history.delete",kt="promptVoice.history.clear",bo="promptVoice.history.projects",Nt="promptVoice:settingsChanged",Dt="promptVoice:modelsUpdated",vo="promptVoice:historyChanged",pe={state:"promptVoice.localWhisper.state",installRuntime:"promptVoice.localWhisper.installRuntime",cancelRuntimeInstall:"promptVoice.localWhisper.cancelRuntimeInstall",downloadModel:"promptVoice.localWhisper.downloadModel",cancelModelDownload:"promptVoice.localWhisper.cancelModelDownload",removeModel:"promptVoice.localWhisper.removeModel",selectModel:"promptVoice.localWhisper.selectModel",start:"promptVoice.localWhisper.start",stop:"promptVoice.localWhisper.stop"};var yo=["standard","casual","conversational","formal","technical","custom"];function _t(e){if(Array.isArray(e?.availableSttProviders)){let o=new Set(e.availableSttProviders.filter(r=>typeof r=="string"&&r.length>0));return o.add("system"),Array.from(o)}let t=["system"];return typeof e?.sttProvider=="string"&&e.sttProvider.length>0&&e.sttProvider!=="system"&&e.sttKeyConfigured===!0&&t.push(e.sttProvider),t}var de="prompt-studio",Ne="prompt-studio",Ie="history";var ho="zcc:prompt-voice:audio-prefs:v1";function mn(){try{if(typeof localStorage>"u")return null;let e=localStorage.getItem(ho);if(!e)return null;let t=JSON.parse(e);return!t||typeof t!="object"||Array.isArray(t)?null:xe(t)}catch{return null}}function fe(){return mn()??xe({})}function ge(e){let t=xe(e);try{typeof localStorage<"u"&&localStorage.setItem(ho,JSON.stringify({micDeviceId:t.micDeviceId,micLabel:t.micDeviceId===$?"":t.micLabel,soundCuesEnabled:String(t.soundCuesEnabled),soundCuesVolume:String(t.soundCuesVolume)}))}catch{}return t}var fn="zcc:prompt-voice:switch-studio-tab",Mt=null;function Ue(e){if(Mt=e,typeof window<"u"&&typeof window.dispatchEvent=="function")try{window.dispatchEvent(new CustomEvent(fn,{detail:{tab:e}}))}catch{}}function xo(){let e=Mt;return Mt=null,e}function So(e){if(typeof window>"u"||typeof window.addEventListener!="function")return()=>{};let t=o=>{let r=o.detail;(r?.tab==="studio"||r?.tab==="history")&&(Mt=null,e(r.tab))};return window.addEventListener(fn,t),()=>window.removeEventListener(fn,t)}var gn=`/* Base Container */
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
`;var wo="zcc-ext-prompt-voice-styles";function oe(){if(typeof document>"u")return;let e=document.getElementById(wo);e||(e=document.createElement("style"),e.id=wo,document.head.appendChild(e)),e.textContent!==gn&&(e.textContent=gn)}var Jr=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4"];var re=class extends Error{code;constructor(t,o){super(o),this.name="RecordingError",this.code=t}};function Qr(e){return Jr.find(t=>e(t))??null}var ei="audio/webm";function Io(){return{getUserMedia:e=>navigator.mediaDevices.getUserMedia(e),createRecorder:(e,t)=>new MediaRecorder(e,t?{mimeType:t}:void 0),isTypeSupported:e=>typeof MediaRecorder<"u"&&MediaRecorder.isTypeSupported(e)}}async function ti(e,t){let o=t&&t!=="default"?t:void 0,r=o?{audio:{deviceId:{exact:o}}}:{audio:!0};try{return await e.getUserMedia(r)}catch(i){let a=i instanceof Error?i.name:"";if(a==="NotAllowedError"||a==="SecurityError")throw new re("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again.");if(o&&(a==="OverconstrainedError"||a==="NotFoundError"))try{return await e.getUserMedia({audio:!0})}catch(p){let s=p instanceof Error?p.name:"";if(s==="NotAllowedError"||s==="SecurityError")throw new re("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again.")}throw new re("MIC_UNAVAILABLE","No microphone is available. Connect one and try again.")}}function bn(e){return new Promise((t,o)=>{let r=new FileReader;r.onload=()=>{let i=typeof r.result=="string"?r.result:"";t(i.slice(i.indexOf(",")+1))},r.onerror=()=>o(new re("RECORDING_FAILED","The recording could not be read.")),r.readAsDataURL(e)})}async function ni(e,t){let o=new Blob(e,{type:t});return{base64:await bn(o),mimeType:o.type||t}}function oi(e,t){if(!(e>0&&Number.isFinite(e)))return()=>{};let o=setTimeout(t,e);return()=>clearTimeout(o)}var ri="That recording is too large to transcribe. Keep dictation shorter and try again.";function ii(e,t){let o=Math.max(t,e),r=[],i=0,a=!1;return{chunks:r,get overflowed(){return a},add(p){return p.size===0||a?"ignored":i+p.size>o?(a=!0,"overflow"):(r.push(p),i+=p.size,i>=e?"limit-reached":"accepted")}}}function si(e,t){let o=new Promise((r,i)=>{e.onstop=()=>r(),e.onerror=()=>{let a=new re("RECORDING_FAILED","Recording stopped unexpectedly. Try again.");t(a),i(a)}});return o.catch(()=>{}),o}function ai(e,t,o,r){let i=si(e,r);return e.ondataavailable=a=>{let p=t.add(a.data);(p==="limit-reached"||p==="overflow")&&o()},e.start(1e3),i}async function li(e,t,o,r){try{await e}finally{t()}if(o.overflowed)throw new re("RECORDING_FAILED",ri);return ni(o.chunks,r)}function ci(e){let t=()=>{};return{stopRecorder(){t(),e.state!=="inactive"&&e.stop()},armTimer(o,r){t=oi(o,r)}}}function pi(e,t){let o=null;return{attach(r){o=r},detach(){o=null},autoStop(){e();let r=o?.onAutoStop;o&&(o.onAutoStop=void 0),r?.()},fail(r){e(),t();let i=o?.onError;o=null,i?.(r)}}}function di(e,t,o,r){let i=ii(r.maxBytes??9437184,r.hardMaxBytes??10485760),{stopRecorder:a,armTimer:p}=ci(e),s=pi(a,t);p(r.maxDurationMs??12e4,s.autoStop);let d=ai(e,i,s.autoStop,s.fail),m={onError:r.onError,onAutoStop:r.onAutoStop,async stop(){a();try{return await li(d,t,i,e.mimeType||o)}finally{s.detach()}},cancel(){a(),t(),s.detach()}};return s.attach(m),m}var be=e=>ui(Io(),e);async function ui(e=Io(),t={}){let o=await ti(e,t.deviceId),r=mi(o),i=o.getTracks(),a,p=()=>{for(let s of i)a&&s.removeEventListener?.("ended",a);r?.close(),i.forEach(s=>s.stop())};try{let s=Qr(e.isTypeSupported)??ei,d=e.createRecorder(o,s),m=di(d,p,s,t);return m.getAudioLevel=()=>r?.level()??null,a=()=>{let u=m.onError;m.cancel(),u?.(new re("MIC_UNAVAILABLE","Microphone disconnected. Check your device and try again."))},i.forEach(u=>u.addEventListener?.("ended",a)),m}catch(s){throw p(),s instanceof re?s:new re("RECORDING_FAILED",s instanceof Error?s.message:"The recording could not be started.")}}function mi(e){let t;try{t=new AudioContext;let o=t.createMediaStreamSource(e),r=t.createAnalyser();r.fftSize=256,o.connect(r);let i=new Uint8Array(r.fftSize),a=t,p=!1;return{level(){if(a.state&&a.state!=="running")return null;r.getByteTimeDomainData(i);let s=i.reduce((d,m)=>d+((m-128)/128)**2,0)/i.length;return Math.min(1,Math.sqrt(s)*5)},close(){p||(p=!0,o.disconnect(),a.close().catch(s=>console.error("Prompt Voice audio meter cleanup failed",s)))}}}catch(o){return t&&t.close().catch(r=>console.error("Prompt Voice audio meter cleanup failed",r)),console.warn("Prompt Voice audio meter unavailable",o),null}}var vn=["both","main","projects","off"];var fi="both",yn=[{id:"all",label:"Main Screen & Projects",description:"Show on Zana Home, inside Projects, and in all composers.",settings:{showHomeWidget:!0,showInProjects:!0,micVisibility:"both"}},{id:"projects",label:"Projects Only",description:"Show the Prompt Studio tab and mic button only inside projects.",settings:{showHomeWidget:!1,showInProjects:!0,micVisibility:"projects"}},{id:"main",label:"Main Screen Only",description:"Show on Zana Home and global composers; hide project tabs and project mics.",settings:{showHomeWidget:!0,showInProjects:!1,micVisibility:"main"}},{id:"mic-only",label:"Composer Mic Only",description:"Hide the Home widget and project tabs; keep only the composer mic.",settings:{showHomeWidget:!1,showInProjects:!1,micVisibility:"both"}}],Eo={both:"Everywhere (Main & Projects)",main:"Main screen composers only",projects:"Project composers only",off:"Hidden"};function To(e,t){if(typeof e=="boolean")return e;if(typeof e=="string"){let o=e.trim().toLowerCase();if(o==="true")return!0;if(o==="false")return!1}return t}function gi(e){return typeof e=="string"&&vn.includes(e)?e:fi}function hn(e){let t=e??{};return{showHomeWidget:To(t.showHomeWidget,!0),showInProjects:To(t.showInProjects,!0),micVisibility:gi(t.micVisibility)}}function Co(e){for(let t of yn)if(t.settings.showHomeWidget===e.showHomeWidget&&t.settings.showInProjects===e.showInProjects&&t.settings.micVisibility===e.micVisibility)return t.id;return"custom"}function Ro(e,t,o){if(e==="off")return!1;if(e==="both")return!0;let r=t&&typeof t=="object"&&"projectId"in t?t.projectId:void 0,i=r!==void 0?r:o,a=typeof i=="string"&&i.length>0;return e==="projects"?a:!a}var ze="prompt-voice";function bi(e){return ze}function vi(){try{let e=so;return typeof e=="function"?e:void 0}catch{return}}function yi(){try{return typeof cn=="function"?cn():null}catch{return null}}function $e(){try{return typeof un=="function"?un():null}catch{return null}}function Be(){try{return typeof pn=="function"?pn():null}catch{return null}}function Ge(){try{return typeof dn=="function"?dn():null}catch{return null}}function Ao(){try{return typeof dt=="function"?dt():null}catch{return null}}function hi(){try{return typeof pt=="function"?pt():null}catch{return null}}function Lt(e){let t=hi(),o=x(t);o.current=t;let r=x(e);return r.current=e,U(()=>({async call(i,a){let p=vi(),s=a!==void 0,d=async()=>{if(!p)throw new Error("Prompt Voice RPC is unavailable in this environment.");return s?await p(ze,i,a):await p(ze,i)};if(r.current&&r.current!==ze&&p)return d();let m=o.current;if(m)try{return s?await m.call(i,a):await m.call(i)}catch(u){if(p&&u instanceof Error&&/unknown rpc/i.test(u.message))return d();throw u}return d()}}),[])}function Te(e,t){try{typeof ln=="function"&&ln(e,t)}catch{}}function Ee(){let t=yi()?.values,o=hn(t),[r,i]=b(null);return D(()=>{i(null)},[o.showHomeWidget,o.showInProjects,o.micVisibility]),Te(Nt,a=>{a&&typeof a=="object"&&i(hn(a))}),r??o}async function Ot(e,t){if(typeof an!="function")throw new Error("Plugin settings API is unavailable in this environment.");await an(bi(e),t)}var xi={start:[{frequency:523.25,offsetSec:0,durationSec:.11,type:"sine",peakFactor:.9},{frequency:659.25,offsetSec:.075,durationSec:.14,type:"sine",peakFactor:1}],stop:[{frequency:493.88,offsetSec:0,durationSec:.1,type:"sine",peakFactor:.85}],complete:[{frequency:659.25,offsetSec:0,durationSec:.1,type:"sine",peakFactor:.85},{frequency:783.99,offsetSec:.075,durationSec:.16,type:"sine",peakFactor:1}],error:[{frequency:329.63,offsetSec:0,durationSec:.12,type:"triangle",peakFactor:.9},{frequency:246.94,offsetSec:.095,durationSec:.16,type:"triangle",peakFactor:.9}]},Ht=null;function Si(){if(typeof window>"u")return null;let e=window.AudioContext??window.webkitAudioContext;return e?((!Ht||Ht.state==="closed")&&(Ht=new e),Ht):null}function Po(e,t,o){let r=e.currentTime,i=xi[t],a=null,p=0;for(let s of i){let d=e.createOscillator(),m=e.createGain(),u=r+s.offsetSec,g=u+s.durationSec,v=s.offsetSec+s.durationSec+.02,y=o*(s.peakFactor??1);v>=p&&(p=v,a=d),d.type=s.type??"sine",d.frequency.setValueAtTime(s.frequency,u),m.gain.setValueAtTime(1e-4,u),m.gain.exponentialRampToValueAtTime(Math.max(2e-4,y),u+.015),m.gain.exponentialRampToValueAtTime(1e-4,g),d.connect(m),m.connect(e.destination),d.start(u),d.stop(g+.02)}return{finalOsc:a,totalDurationSec:p}}function ko(e,t){let o=Math.ceil(t*1e3)+40;return new Promise(r=>{let i=!1,a=null,p=()=>{i||(i=!0,a!==null&&clearTimeout(a),e&&typeof e.removeEventListener=="function"&&e.removeEventListener("ended",p),r())};if(e&&typeof e.addEventListener=="function")e.addEventListener("ended",p,{once:!0});else if(e&&"onended"in e){let s=e.onended;e.onended=function(d){typeof s=="function"&&s.call(this,d),p()}}a=setTimeout(p,o)})}async function wi(e){if(e.state!=="suspended")return e.state==="running";let t=null;try{return await Promise.race([e.resume(),new Promise(o=>{t=setTimeout(o,750)})]),e.state!=="suspended"}catch{return!1}finally{t!==null&&clearTimeout(t)}}function j(e,t){if(!t.enabled)return null;let o=Math.min(100,Math.max(0,t.volume));if(!Number.isFinite(o)||o<=0)return null;try{let r=Si();if(!r)return null;let i=o/100*.2;if(r.state==="suspended")return(async()=>{if(!await wi(r))return;let{finalOsc:d,totalDurationSec:m}=Po(r,e,i);await ko(d,m)})().catch(()=>{});let{finalOsc:a,totalDurationSec:p}=Po(r,e,i);return ko(a,p)}catch{return null}}var xn=16e3,No=44,ut=2,Ii="This recording couldn't be prepared for Local Whisper. Try again.",Ti=async(e,t)=>{let r=await new OfflineAudioContext(1,1,t).decodeAudioData(e),i=Array.from({length:r.numberOfChannels},(a,p)=>r.getChannelData(p));return{sampleRate:r.sampleRate,channels:i}};function Ei(e){if(e.length===0)return new Float32Array(0);if(e.length===1)return e[0];let t=Math.min(...e.map(r=>r.length)),o=new Float32Array(t);for(let r=0;r<t;r+=1){let i=0;for(let a of e)i+=a[r];o[r]=i/e.length}return o}function Ci(e,t){let o=e.length*ut,r=new Uint8Array(No+o),i=new DataView(r.buffer),a=(p,s)=>{for(let d=0;d<s.length;d+=1)i.setUint8(p+d,s.charCodeAt(d))};a(0,"RIFF"),i.setUint32(4,36+o,!0),a(8,"WAVE"),a(12,"fmt "),i.setUint32(16,16,!0),i.setUint16(20,1,!0),i.setUint16(22,1,!0),i.setUint32(24,t,!0),i.setUint32(28,t*ut,!0),i.setUint16(32,ut,!0),i.setUint16(34,8*ut,!0),a(36,"data"),i.setUint32(40,o,!0);for(let p=0;p<e.length;p+=1){let s=Math.max(-1,Math.min(1,e[p]));i.setInt16(No+p*ut,s<0?s*32768:s*32767,!0)}return r}function Ri(e){let t=atob(e),o=new Uint8Array(t.length);for(let r=0;r<t.length;r+=1)o[r]=t.charCodeAt(r);return o.buffer}async function Ai(e,t=Ti){let o;try{let r=await t(Ri(e.base64),xn);if(r.sampleRate!==xn)throw new Error("decoder ignored the requested sample rate");o=Ci(Ei(r.channels),xn)}catch{throw new re("RECORDING_FAILED",Ii)}return{base64:await bn(new Blob([o],{type:"audio/wav"})),mimeType:"audio/wav"}}async function We(e,t,o=Ai){return(await e.call(me).catch(()=>null))?.audioFormat==="wav"?o(t):t}var Do=globalThis.__ZCC_HOST_REACT__,K=Do.Fragment;function n(e,t,o){return Do.createElement(e,o===void 0?t:{...t,key:o})}var l=n;var Pi={system:"Zana Voice",openai:"OpenAI Whisper","google-gemini":"Google Gemini","local-whisper":"Local Whisper"};function ki(e,t){let[o,r]=b("system"),[i,a]=b("assistant");return D(()=>{let p=!0;return e.call(me).then(s=>{if(!p||!s||typeof s!="object")return;let d=s;d.sttProvider&&r(d.sttProvider),d.llmProvider&&a(d.llmProvider)}).catch(()=>{}),e.call(Se).then(s=>{!p||!s||typeof s!="object"||(t.current=ge(s))}).catch(()=>{}),()=>{p=!1}},[t,e]),{sttProvider:o,llmProvider:i}}function Ni(e){let[t,o]=b(0);return D(()=>{if(e!=="recording"){o(0);return}let r=Date.now(),i=setInterval(()=>{o(Math.floor((Date.now()-r)/1e3))},250);return()=>clearInterval(i)},[e]),t}async function Di(e,t,o,r,i,a,p){let s={enabled:o.soundCuesEnabled,volume:o.soundCuesVolume},d=await e.stop();if(!i.current)return;j("stop",s);let m=await We(t,d),u=await t.call(Fe,{audio:m.base64,mimeType:m.mimeType,source:"home",...a.projectId?{projectId:a.projectId}:{},...typeof a.audioDurationMs=="number"?{audioDurationMs:a.audioDurationMs}:{}});if(i.current){if(u.ok&&u.status==="ok"){j("complete",s),typeof r?.toCompose=="function"?(r.toCompose({initialPrompt:u.text,focusPrompt:!0}),p.setNotice("Draft opened in new thread composer.")):p.setNotice(u.text);return}if(u.ok&&u.status==="no-speech"){p.setNotice("No speech detected. Try again.");return}u.ok||(j("error",s),p.setError(u.message))}}async function _i(e,t,o){let r={enabled:e.soundCuesEnabled,volume:e.soundCuesVolume},i=j("start",r);if(i&&(await i,!o()))return null;let a=await(e.micDeviceId!==$?t({deviceId:e.micDeviceId}):t());return o()?a:(a.cancel(),null)}function Mi(e,t,o,r){let[i,a]=b("idle"),[p,s]=b(null),[d,m]=b(null),u=x(!0),g=x(null),v=x(null),y=x(0),C=x(fe()),{sttProvider:k,llmProvider:P}=ki(e,C),N=Ni(i);D(()=>(u.current=!0,()=>{u.current=!1,y.current++,g.current?.cancel(),g.current=null}),[]);let w=E(async()=>{let h=g.current;g.current=null;let z=v.current;v.current=null;let q=z!==null?Math.max(0,Date.now()-z):void 0;if(!h){a("idle");return}let I=C.current;a("transcribing");try{await Di(h,e,I,t,u,{projectId:r,audioDurationMs:q},{setNotice:s,setError:m})}catch(X){if(!u.current)return;j("error",{enabled:I.soundCuesEnabled,volume:I.soundCuesVolume}),m(X instanceof Error?X.message:"Quick dictation failed.")}finally{u.current&&a("idle")}},[t,r,e]),O=E(async()=>{m(null),s(null);let h=fe();C.current=h;let z={enabled:h.soundCuesEnabled,volume:h.soundCuesVolume},q=++y.current;a("starting");try{let I=await _i(h,o,()=>u.current&&y.current===q);if(!I)return;I.onError=X=>{g.current=null,v.current=null,u.current&&(j("error",z),m(X.message),a("idle"))},I.onAutoStop=()=>{u.current&&w()},g.current=I,v.current=Date.now(),a("recording")}catch(I){if(!u.current)return;j("error",z),m(I instanceof Error?I.message:"Microphone access denied."),a("idle")}},[o,w]),V=E(()=>{y.current++,v.current=null,g.current?.cancel(),g.current=null,a("idle")},[]);return{sttProvider:k,llmProvider:P,phase:i,seconds:N,notice:p,error:d,start:O,stopAndTranscribe:w,cancel:V}}function Li({phase:e,formattedTime:t,onToggleDictate:o,onCancel:r,onOpenStudio:i,onOpenHistory:a}){let p=e==="starting"?"Starting mic\u2026":e==="recording"?`Stop & Compose (${t})`:e==="transcribing"?"Transcribing\u2026":"Dictate to New Thread";return l("div",{className:"ps-home-actions",children:[n("button",{type:"button",className:`ps-btn ${e==="recording"?"ps-btn-danger":"ps-btn-primary"}`,disabled:e==="starting"||e==="transcribing",onClick:o,children:p}),e==="starting"||e==="recording"?n("button",{type:"button",className:"ps-btn",onClick:r,children:"Cancel"}):l(K,{children:[n("button",{type:"button",className:"ps-btn",onClick:i,children:"Open Prompt Studio"}),n("button",{type:"button",className:"ps-btn",onClick:a,children:"History"})]})]})}function _o(e){return Ee().showHomeWidget?n(Oi,{...e}):null}function Oi({pluginId:e,projectId:t,startSession:o=be}){oe();let r=Lt(e),i=Ge(),a=Mi(r,i,o,t),p=E(()=>{if(Ue("studio"),t&&typeof i?.toProject=="function"){i.toProject(t,{tabId:Ne});return}i?.toPluginPanel?.(de)},[i,t]),s=E(()=>{if(Ue("history"),t&&typeof i?.toProject=="function"){i.toProject(t,{tabId:Ne});return}i?.toPluginPanel?.(de,{subPath:Ie})},[i,t]),d=()=>{a.phase==="recording"?a.stopAndTranscribe():a.phase==="idle"&&a.start()},m=`${Math.floor(a.seconds/60)}:${String(a.seconds%60).padStart(2,"0")}`,u=Pi[a.sttProvider]??a.sttProvider,g=a.llmProvider==="none"?"Raw transcript":"AI cleanup on";return l("div",{className:"ps-home-card","data-testid":"pv-home-widget",children:[l("div",{className:"ps-home-card-top",children:[l("div",{className:"ps-home-copy",children:[l("div",{className:"ps-home-heading",children:[n("span",{"aria-hidden":"true",children:"\u{1F399}\uFE0F"}),n("span",{children:"Dictate a new thread or refine in Prompt Studio"})]}),l("div",{className:"ps-home-meta",children:[n("span",{children:u}),n("span",{"aria-hidden":"true",children:"\xB7"}),n("span",{children:g})]})]}),n(Li,{phase:a.phase,formattedTime:m,onToggleDictate:d,onCancel:a.cancel,onOpenStudio:p,onOpenHistory:s})]}),a.notice?n("div",{role:"status",className:"ps-home-status",children:a.notice}):null,a.error?n("div",{role:"alert",className:"ps-home-error",children:a.error}):null]})}function Ye(e,t){let o=t.trim();return o?e?/\s$/.test(e)?`${e}${o}`:`${e} ${o}`:o:e}var Hi="No speech detected.",Sn={phase:"idle",notice:null,error:null};function Mo(e,t){switch(t.type){case"START":return e.phase==="idle"||e.phase==="error"?{phase:"starting",notice:null,error:null}:e;case"STARTED":return e.phase==="starting"?{...e,phase:"recording"}:e;case"STOP":return e.phase==="recording"||e.phase==="starting"?{phase:"processing",notice:null,error:null}:e;case"CANCEL":return e.phase==="recording"||e.phase==="starting"?{...Sn}:e;case"SUCCESS":case"NO_SPEECH":return e.phase!=="processing"?e:{phase:"idle",notice:t.type==="NO_SPEECH"?Hi:t.notice,error:null};case"CLEAR_NOTICE":return e.notice?{...e,notice:null}:e;case"FAILURE":return{phase:"error",notice:null,error:t.message}}}var Vi="Prompt Voice returned an unexpected response. Try again.",ji="Dictation failed. Try again.",Fi=4e3;function Ui(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}function zi(e){return typeof e=="object"&&e!==null&&!("ok"in e&&"status"in e)}function wn(e,t){if(e==null)return{projectId:t?.projectId||void 0,threadId:t?.threadId||void 0};if(e==="global"||typeof e=="object"&&e.kind==="global"){let o=typeof e=="object"?e:null;return{projectId:o?.projectId||void 0,threadId:o?.threadId||void 0}}if(typeof e=="object"){let o="projectId"in e&&e.projectId!==void 0,r="threadId"in e&&e.threadId!==void 0;return{projectId:(o?e.projectId:t?.projectId)||void 0,threadId:(r?e.threadId:t?.threadId)||void 0}}return{projectId:t?.projectId||void 0,threadId:t?.threadId||void 0}}async function $i(e,t,o){let r=await We(e,t),i=await e.call(Fe,{audio:r.base64,mimeType:r.mimeType,source:"composer",...o.projectId?{projectId:o.projectId}:{},...o.threadId?{threadId:o.threadId}:{},...typeof o.audioDurationMs=="number"?{audioDurationMs:o.audioDurationMs}:{}});if(!Ui(i))throw new Error(Vi);return i}function Lo(e){return e instanceof Error&&e.message?e.message:ji}function qe(e){return{enabled:e.soundCuesEnabled,volume:e.soundCuesVolume}}function Bi(e,t,o,r=fe()){if(!e.ok){j("error",qe(r)),o({type:"FAILURE",message:e.message});return}if(e.status==="no-speech"){o({type:"NO_SPEECH"});return}j("complete",qe(r)),t.updateText(a=>Ye(a,e.text)),t.focus();let i=e.refineNotice?`Inserted the raw transcript. ${e.refineNotice.message}`:"Added to draft.";o({type:"SUCCESS",notice:i})}function Gi(e,t,o,r){return t()?(e.onError=i=>{t()&&r(i)},e.onAutoStop=()=>{t()&&o()},e):(e.cancel(),null)}function Wi(e,t,o,r,i,a){let p=s=>{j("error",qe(a())),i({type:"FAILURE",message:Lo(s)})};return e.then(s=>{if(!s)return null;let d=Gi(s,o,r,m=>{t.current=null,p(m)});return d&&(t.current=d),d},s=>(o()&&p(s),null))}function Yi(e,t,o){let r=x(null),i=x(null),a=x(0),p=x(!0),s=E(()=>{a.current++,i.current=null,r.current&&(r.current.cancel(),r.current=null),t({type:"CANCEL"})},[t]);D(()=>(p.current=!0,()=>{p.current=!1,s()}),[s]);let d=E(async()=>{let v=i.current?await i.current:r.current;return r.current=null,v},[]),m=E(async(v,y)=>{let C=++a.current,k=()=>p.current&&a.current===C,P=j("start",qe(y)),w=Wi((async()=>P&&(await P,!k())?null:await(y.micDeviceId!==$?e({deviceId:y.micDeviceId}):e()))(),r,k,v,t,o);i.current=w,await w&&k()&&t({type:"STARTED"}),i.current===w&&(i.current=null)},[t,o,e]),u=E(()=>p.current,[]),g=E(()=>r.current?.getAudioLevel?.()??null,[]);return{start:m,takeSession:d,cancel:s,isMounted:u,getAudioLevel:g}}function Oo({startSession:e=be,noticeDurationMs:t=Fi}={}){let o=dt(),r=$e(),i=Be(),a=pt(),p=x(a);p.current=a;let[s,d]=co(Mo,Sn),m=x(s.phase);m.current=s.phase;let u=x(null),g=x(fe()),v=x(null),y=E(()=>g.current,[]),{start:C,takeSession:k,cancel:P,isMounted:N,getAudioLevel:w}=Yi(e,d,y),[O,V]=b(null),[h,z]=b(0),[q,I]=b(!1),X=x({});X.current=wn(r?.scope,i),D(()=>{let B=!0;return p.current.call(Se).then(Z=>{if(!B||!zi(Z))return;let ve=ge(Z);u.current=ve,(m.current==="idle"||m.current==="error")&&(g.current=ve)}).catch(()=>{}),()=>{B=!1}},[]),D(()=>{if(s.phase!=="recording"){V(null),z(0);return}let B=Date.now();v.current=B;let Z=()=>{V(w()),z(Math.floor((Date.now()-B)/1e3))};Z();let ve=setInterval(Z,100);return()=>clearInterval(ve)},[w,s.phase]),D(()=>{if(!s.notice)return;let B=setTimeout(()=>{d({type:"CLEAR_NOTICE"})},t);return()=>clearTimeout(B)},[t,s.notice]);let H=E(()=>{d({type:"CLEAR_NOTICE"})},[]),ne=E(async()=>{let B=g.current,Z=v.current;v.current=null;let ve=Z!==null?Math.max(0,Date.now()-Z):void 0;d({type:"STOP"});let Je=await k();if(!(!N()||!Je))try{let Qe=await Je.stop();if(!N())return;j("stop",qe(B));let ft=await $i(a,Qe,{...X.current,audioDurationMs:ve});if(!N())return;Bi(ft,o,d,B)}catch(Qe){if(!N())return;j("error",qe(B)),d({type:"FAILURE",message:Lo(Qe)})}},[o,N,a,k]),De=E(async()=>{let B=mn()??u.current??xe({});g.current=B,I(!1),d({type:"START"}),await C(()=>{I(!0),ne()},B)},[ne,C]),Wt=E(()=>{s.phase==="recording"||s.phase==="starting"?ne():s.phase!=="processing"&&De()},[De,ne,s.phase]);return{phase:s.phase,error:s.error,notice:s.notice,level:O,seconds:h,autoStopped:q,onClick:Wt,cancel:P,clearNotice:H,beginDictation:De,finishDictation:ne}}var qi="Dictation",Zi={idle:"Start dictation",starting:"Stop dictation",recording:"Stop dictation",processing:"Transcribing",error:"Start dictation"},Ho={position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",border:0};function Vo({startSession:e=be}){let t=Ee(),o=$e(),r=Be();return Ro(t.micVisibility,o?.scope,r?.projectId)?n(Ki,{startSession:e}):null}function Ki({startSession:e=be}){oe();let{phase:t,error:o,notice:r,onClick:i,cancel:a,clearNotice:p,level:s,seconds:d,autoStopped:m}=Oo({startSession:e}),u=t==="starting"||t==="recording"||t==="processing",g=t==="idle"&&!!r,v=`${Math.floor(d/60)}:${String(d%60).padStart(2,"0")}`;return l("div",{className:`pv-mic pv-dictation-pill pv-phase-${t} ${g?"pv-has-notice":""}`,onClick:g?p:void 0,title:g?"Click to dismiss":void 0,children:[n("button",{type:"button",className:`pv-mic-button pv-mic-${t} ${u?"pv-pill-btn-stop":"pv-idle-icon"}`,"aria-label":qi,"aria-pressed":t==="recording"||t==="starting",title:Zi[t],disabled:t==="processing",onClick:i,style:g?{display:"none"}:void 0,children:t==="idle"||t==="error"?n("svg",{viewBox:"0 0 24 24",width:"16",height:"16","aria-hidden":"true",focusable:"false",children:n("path",{d:"M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5Zm6 9h2v-3h-2v3Z",fill:"currentColor"})}):t==="processing"?n("span",{className:"pv-mic-spinner","aria-hidden":"true"}):n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("rect",{x:"6",y:"6",width:"12",height:"12",rx:"2.5",fill:"currentColor"})})}),g?l("span",{role:"status",className:"pv-notice-content",children:[n("span",{className:"pv-notice-check",children:"\u2713"}),n("span",{className:"pv-pill-status",children:r})]}):null,t==="starting"?l(K,{children:[l("div",{className:"pv-pill-timer-badge",children:[n("div",{className:"pv-pill-dot pv-pill-dot-starting"}),n("span",{className:"pv-pill-timer-text",children:"0:00"})]}),l("div",{className:"pv-pill-center",role:"status",children:[n("span",{className:"pv-mic-spinner","aria-hidden":"true"}),n("span",{className:"pv-pill-status",children:"Requesting microphone\u2026"})]})]}):null,t==="recording"?l(K,{children:[l("div",{className:"pv-pill-timer-badge",children:[n("div",{className:"pv-pill-dot"}),l("span",{className:"pv-pill-timer-text",children:[n("span",{className:"pv-sr-only",style:Ho,children:"Recording "}),v]})]}),l("div",{className:"pv-pill-center",role:"status",children:[s===null?n("span",{className:"pv-sr-only",style:Ho,children:"Audio meter unavailable"}):null,n("span",{className:`pv-pill-waveform ${s===null?"animated":""}`,"aria-label":"Microphone audio activity",role:"meter","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":Math.round((s??.3)*100),children:[.4,.7,1,.7,.4].map((y,C)=>n("span",{className:"pv-pill-waveform-bar",style:s!==null?{height:`${Math.max(3,s*y*20)}px`}:void 0},C))}),n("span",{className:"pv-pill-status",children:"Listening..."}),s!==null&&s<.015&&d>=5?n("span",{className:"pv-mic-quiet-warning",children:"No audio detected \u2014 check your microphone."}):null]})]}):null,t==="processing"?l(K,{children:[n("div",{className:"pv-pill-timer-badge",children:n("span",{className:"pv-pill-timer-text",children:v})}),n("div",{className:"pv-pill-center",role:"status",children:l("span",{className:"pv-pill-status",children:[n("span",{className:"pv-mic-spinner","aria-hidden":"true"})," ",m?"Recording limit reached. ":"","Transcribing and refining\u2026"]})})]}):null,t==="starting"||t==="recording"?n("button",{type:"button",className:"pv-mic-cancel pv-pill-btn-cancel",onClick:a,"aria-label":"Cancel recording",title:"Cancel recording",children:n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("path",{d:"M18 6L6 18M6 6l12 12",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round"})})}):null,t==="error"&&o?n("span",{role:"alert",className:"pv-pill-status pv-mic-error",children:o}):null]})}var Xi=500,Ji=5e3;function In(e){return e>=1e3**3?`${(e/1e3**3).toFixed(1)} GB`:`${Math.round(e/1e3**2)} MB`}function Qi(e){return e.runtime.status==="installing"||e.server.state==="starting"||e.models.some(t=>t.status==="downloading")}function es(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}function ts(e){let[t,o]=b(null),[r,i]=b(null),[a,p]=b(null),s=x(!0),d=E(v=>{if(s.current){if(!es(v)){i("Local Whisper returned an unexpected response.");return}v.state&&o(v.state),i(v.ok?null:v.message)}},[]),m=E(()=>e.call(pe.state).then(d,()=>s.current&&i("Could not load Local Whisper status.")),[e,d]),u=E(async(v,y,C)=>{p(v);try{d(await e.call(y,C))}catch{s.current&&i("Local Whisper request failed. Try again.")}finally{s.current&&p(null)}},[e,d]);D(()=>(s.current=!0,m(),()=>{s.current=!1}),[m]);let g=t?Qi(t):!1;return D(()=>{let v=setInterval(()=>void m(),g?Xi:Ji);return()=>clearInterval(v)},[g,m]),{state:t,error:r,pending:a,run:u}}function Tn({tone:e}){return n("span",{"aria-hidden":"true",style:{width:9,height:9,borderRadius:"50%",marginTop:4,flex:"none",background:{ok:"var(--ps-success)",warn:"var(--ps-warn)",err:"var(--ps-danger)",busy:"var(--ps-accent)",idle:"var(--ps-text-muted)"}[e]}})}function jo({value:e,label:t}){let o=Math.round(e*100);return n("div",{role:"progressbar","aria-label":t,"aria-valuenow":o,"aria-valuemin":0,"aria-valuemax":100,style:{height:5,minWidth:80,background:"var(--ps-bg-hover)",borderRadius:3,overflow:"hidden"},children:n("div",{style:{width:`${o}%`,height:"100%",background:"var(--ps-accent)"}})})}var Vt={display:"flex",gap:10,alignItems:"flex-start",padding:"10px 12px",borderRadius:6,border:"1px solid var(--ps-border)"},Ce={color:"var(--ps-text-muted)",fontSize:11};function ns(e){let{runtime:t,server:o,activeModelId:r}=e;return t.status==="not-installed"?{tone:"idle",title:"Runtime not installed",detail:`whisper.cpp ${t.version} \xB7 requires ${t.requirements.join(", ")||"no extra components"}`,action:{label:"Install runtime",method:pe.installRuntime,primary:!0}}:t.status==="installing"?{tone:"busy",title:`Installing runtime\u2026 ${Math.round((t.progress??0)*100)}%`,detail:"Verifying the download as it arrives.",action:{label:"Cancel",method:pe.cancelRuntimeInstall}}:o.state==="running"?{tone:"ok",title:"Running",detail:`Model ${o.modelId} \xB7 on this device (127.0.0.1) \xB7 managed by Prompt Voice`,action:{label:"Stop",method:pe.stop}}:o.state==="starting"?{tone:"busy",title:"Starting\u2026",detail:`Loading model ${o.modelId}.`}:o.state==="crashed"?{tone:"err",title:"Stopped unexpectedly",detail:`Exit code ${o.exitCode??"unknown"}. Logs contain no audio or transcripts.`,action:{label:"Restart",method:pe.start,primary:!0}}:r?{tone:"warn",title:"Stopped",detail:"Starts automatically when you dictate.",action:{label:"Start",method:pe.start}}:{tone:"warn",title:"Runtime installed",detail:"Download a model below and choose Use to start."}}function os({model:e,state:t,pending:o,onRun:r}){let i=t.activeModelId===e.id,a=t.runtime.status==="installed"&&!i,p=u=>`${u}:${e.id}`,s={modelId:e.id},d=null,m;return e.status==="downloading"?(d=l(K,{children:[n(jo,{value:e.progress??0,label:`Downloading ${e.label}`}),l("span",{style:Ce,children:[Math.round((e.progress??0)*100),"% of ",In(e.sizeBytes)]})]}),m=n("button",{type:"button",className:"ps-btn",onClick:()=>r(p("cancel"),pe.cancelModelDownload,s),children:"Cancel"})):e.status==="available"?m=l("button",{type:"button",className:"ps-btn",disabled:o===p("download"),onClick:()=>r(p("download"),pe.downloadModel,s),children:["Download ",In(e.sizeBytes)]}):(d=i?n("span",{className:"ps-tag",children:"Active"}):o===p("use")?n("span",{className:"ps-tag",children:"Loading\u2026"}):n("span",{className:"ps-tag",children:"Installed"}),m=l(K,{children:[a&&n("button",{type:"button",className:"ps-btn",disabled:o!==null,onClick:()=>r(p("use"),pe.selectModel,s),children:"Use"}),n("button",{type:"button",className:"ps-btn ps-btn-danger",disabled:i||o!==null,title:i?"Choose another model before removing this one":void 0,"aria-label":`Remove ${e.label}`,onClick:()=>r(p("remove"),pe.removeModel,s),children:"Remove"})]})),l("tr",{style:i?{background:"color-mix(in srgb, var(--ps-accent) 10%, transparent)"}:void 0,children:[l("td",{style:{padding:"8px 6px"},children:[n("strong",{children:e.label})," ",e.recommended&&n("span",{className:"ps-tag",children:"Recommended"})]}),l("td",{style:{padding:"8px 6px",...Ce},children:[In(e.sizeBytes)," disk",e.memoryEstimate?l(K,{children:[n("br",{}),e.memoryEstimate," RAM"]}):null]}),n("td",{style:{padding:"8px 6px"},children:n("div",{style:{display:"flex",flexDirection:"column",gap:4},children:d})}),n("td",{style:{padding:"8px 6px",textAlign:"right",whiteSpace:"nowrap"},children:n("div",{style:{display:"inline-flex",gap:6},children:m})})]})}function rs(e,t){let o=e==="local-whisper";return o&&t==="none"?{offline:!0,text:"Audio and text stay on this device."}:o?{offline:!1,text:"Audio stays on this device. Cleanup sends the transcript to your selected cleanup model."}:{offline:!1,text:"Audio leaves this device for transcription."}}function Fo({rpc:e,sttProvider:t,llmProvider:o,onApplyPreset:r,onReadyChange:i}){let{state:a,error:p,pending:s,run:d}=ts(e),m=rs(t,o),u=!!(a?.platform.supported&&a.runtime.status==="installed"&&a.activeModelId!==null),g=x(null),v=x(i);return v.current=i,D(()=>{a&&(g.current!==null&&g.current!==u&&v.current?.(u),g.current=u)},[a,u]),l("section",{className:"ps-pane",style:{flex:"none"},"aria-labelledby":"ps-lw-title",children:[l("div",{className:"ps-pane-header",children:[n("h2",{id:"ps-lw-title",className:"ps-pane-title",style:{margin:0},children:"Local Whisper"}),n("span",{className:"ps-tag",children:a?a.platform.supported?u?"Ready":"Not set up":"Unavailable":"Loading\u2026"})]}),l("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[n("p",{style:{...Ce,margin:0},children:"Transcribe on this device. Audio is never sent anywhere when Local Whisper is the speech provider."}),(p||a?.lastError)&&n("div",{role:"alert",style:{...Vt,borderColor:"var(--ps-danger)",color:"var(--ps-danger)",fontSize:12},children:p??a?.lastError?.message}),a&&!a.platform.supported&&l("div",{style:Vt,children:[n(Tn,{tone:"err"}),l("div",{children:[n("strong",{children:"Not available on this computer"}),n("div",{style:Ce,children:a.platform.message})]})]}),a?.platform.supported&&n(is,{state:a,pending:s,onRun:d}),a?.platform.supported&&l("div",{children:[l("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"baseline"},children:[n("span",{className:"ps-field-label",children:"Models \xB7 multilingual"}),n("span",{style:Ce,children:"Stored in this computer's app data"})]}),l("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:12},children:[n("thead",{children:n("tr",{children:["Model","Size","Status",""].map(y=>n("th",{style:{textAlign:"left",...Ce,fontWeight:600,padding:"4px 6px"},children:y},y))})}),n("tbody",{children:a.models.map(y=>n(os,{model:y,state:a,pending:s,onRun:d},y.id))})]})]}),l("div",{style:Vt,children:[n(Tn,{tone:m.offline?"ok":"warn"}),l("div",{style:{flex:1},children:[n("strong",{children:m.offline?"Fully offline":"Not fully offline"}),n("div",{style:Ce,children:m.text})]}),!m.offline&&n("button",{type:"button",className:"ps-btn",onClick:()=>r({sttProvider:"local-whisper",llmProvider:"none"}),children:"Use offline preset"})]})]})]})}function is({state:e,pending:t,onRun:o}){let r=ns(e);return l("div",{style:Vt,"aria-live":"polite",children:[n(Tn,{tone:r.tone}),l("div",{style:{flex:1,minWidth:0},children:[n("strong",{children:r.title}),n("div",{style:Ce,children:r.detail}),e.runtime.status==="installing"&&n("div",{style:{marginTop:6},children:n(jo,{value:e.runtime.progress??0,label:"Installing runtime"})})]}),r.action&&n("button",{type:"button",className:r.action.primary?"ps-btn ps-btn-primary":"ps-btn",disabled:t==="runtime",onClick:()=>o("runtime",r.action.method),children:r.action.label})]})}function ss({statusMessage:e}){return l("div",{className:"ps-vis-header",children:[l("div",{children:[n("h3",{id:"ps-visibility-heading",className:"ps-vis-title",children:"Where Prompt Voice Appears"}),n("p",{className:"ps-vis-subtitle",children:"Control whether Prompt Voice surfaces on the main Home screen, inside Projects, and in thread composers."})]}),n("div",{className:"ps-vis-status-slot",children:e?n("span",{role:"status",className:"ps-vis-status",children:e}):null})]})}function as({activePreset:e,disabled:t,onSelect:o}){return n("div",{className:"ps-vis-presets",role:"group","aria-label":"Surface visibility presets",children:yn.map(r=>{let i=e===r.id;return l("button",{type:"button",className:`ps-vis-preset-card ${i?"active":""}`,"aria-pressed":i,disabled:t,onClick:()=>o(r.settings),children:[n("span",{className:"ps-vis-preset-label",children:r.label}),n("span",{className:"ps-vis-preset-desc",children:r.description})]},r.id)})})}function Uo({labelId:e,title:t,helpText:o,checked:r,disabled:i,onToggle:a}){return l("div",{className:"ps-toggle-card",children:[l("div",{className:"ps-toggle-copy",children:[n("span",{id:e,className:"ps-toggle-title",children:t}),n("small",{className:"ps-vis-help",children:o})]}),n("button",{type:"button",className:"ps-switch",role:"switch","aria-checked":r,"aria-labelledby":e,disabled:i,onClick:a})]})}function ls({value:e,disabled:t,onChange:o}){return l("div",{className:"ps-toggle-card ps-vis-select-row",children:[l("div",{className:"ps-toggle-copy",children:[n("label",{htmlFor:"ps-vis-mic-select",className:"ps-toggle-title",children:"Composer mic button placement"}),n("small",{className:"ps-vis-help",children:"Choose which chat composers display the voice dictation mic pill."})]}),n("select",{id:"ps-vis-mic-select","aria-label":"Composer mic button placement",className:"ps-select ps-vis-select",value:e,disabled:t,onChange:r=>o(r.target.value),children:vn.map(r=>n("option",{value:r,children:Eo[r]},r))})]})}function jt(e){oe();let t=Ee(),o=Co(t),[r,i]=b(!1),[a,p]=b(null),[s,d]=b(null),m=async u=>{i(!0),d(null),p("Saving\u2026");try{await Ot(ze,u),p("Saved")}catch(g){p(null),d(g instanceof Error?g.message:"Could not update visibility settings.")}finally{i(!1)}};return l("section",{className:"ps-vis-section","aria-labelledby":"ps-visibility-heading",children:[n(ss,{statusMessage:a}),s?n("div",{role:"alert",className:"ps-vis-error",children:s}):null,n(as,{activePreset:o,disabled:r,onSelect:u=>void m(u)}),l("div",{className:"ps-vis-controls",children:[n(Uo,{labelId:"ps-vis-home-label",title:"Main Home screen widget",helpText:"Show a quick-dictate & Prompt Studio card on Zana\u2019s main Home screen.",checked:t.showHomeWidget,disabled:r,onToggle:()=>void m({showHomeWidget:!t.showHomeWidget})}),n(Uo,{labelId:"ps-vis-projects-label",title:"Prompt Studio tab in projects",helpText:"Display a dedicated Prompt Studio tab inside each project with project-scoped drafts.",checked:t.showInProjects,disabled:r,onToggle:()=>void m({showInProjects:!t.showInProjects})}),n(ls,{value:t.micVisibility,disabled:r,onChange:u=>void m({micVisibility:u})})]}),l("p",{className:"ps-vis-note",children:["Tip: You can hide or reorder the global ",n("strong",{children:"Prompt Studio"})," item in Zana\u2019s left sidebar using Zana\u2019s sidebar customize menu."]})]})}function En(e){if(typeof e!="string")return[];let t=new Set,o=/[,\n]/;for(let r of e.split(o)){let i=r.trim().slice(0,80);if(i&&t.add(i),t.size>=200)break}return[...t]}function zo(e,t){let o=En(t);if(o.length===0)return[...e];let r=new Set(e),i=[...e];for(let a of o){if(i.length>=200)break;r.has(a)||(r.add(a),i.push(a))}return i}function Cn(e){return e.join(`
`)}var $o=[100,500,2e3,0],Bo=[30,90,365,0];function cs(e){return!(e===!1||typeof e=="string"&&e.trim().toLowerCase()==="false")}function Go(e,t,o){let r=typeof e=="number"?e:typeof e=="string"&&e.trim()!==""?Number(e):Number.NaN;if(!Number.isFinite(r)||r<0)return t;let i=Math.round(r);return Math.min(o,i)}function ps(e){return Go(e,500,5e4)}function ds(e){return Go(e,90,3650)}function Wo(e){let t=e??{};return{historyEnabled:cs(t.historyEnabled),historyMaxEntries:ps(t.historyMaxEntries),historyMaxDays:ds(t.historyMaxDays)}}var Ft=[{code:"auto",label:"Detect automatically"},{code:"af",label:"Afrikaans"},{code:"ar",label:"Arabic"},{code:"hy",label:"Armenian"},{code:"az",label:"Azerbaijani"},{code:"eu",label:"Basque"},{code:"be",label:"Belarusian"},{code:"bn",label:"Bengali"},{code:"bs",label:"Bosnian"},{code:"bg",label:"Bulgarian"},{code:"ca",label:"Catalan"},{code:"zh",label:"Chinese"},{code:"hr",label:"Croatian"},{code:"cs",label:"Czech"},{code:"da",label:"Danish"},{code:"nl",label:"Dutch"},{code:"en",label:"English"},{code:"et",label:"Estonian"},{code:"fi",label:"Finnish"},{code:"fr",label:"French"},{code:"gl",label:"Galician"},{code:"ka",label:"Georgian"},{code:"de",label:"German"},{code:"el",label:"Greek"},{code:"gu",label:"Gujarati"},{code:"he",label:"Hebrew"},{code:"hi",label:"Hindi"},{code:"hu",label:"Hungarian"},{code:"is",label:"Icelandic"},{code:"id",label:"Indonesian"},{code:"ga",label:"Irish"},{code:"it",label:"Italian"},{code:"ja",label:"Japanese"},{code:"kn",label:"Kannada"},{code:"kk",label:"Kazakh"},{code:"ko",label:"Korean"},{code:"lv",label:"Latvian"},{code:"lt",label:"Lithuanian"},{code:"mk",label:"Macedonian"},{code:"ms",label:"Malay"},{code:"ml",label:"Malayalam"},{code:"mt",label:"Maltese"},{code:"mr",label:"Marathi"},{code:"ne",label:"Nepali"},{code:"no",label:"Norwegian"},{code:"fa",label:"Persian"},{code:"pl",label:"Polish"},{code:"pt",label:"Portuguese"},{code:"pa",label:"Punjabi"},{code:"ro",label:"Romanian"},{code:"ru",label:"Russian"},{code:"sr",label:"Serbian"},{code:"sk",label:"Slovak"},{code:"sl",label:"Slovenian"},{code:"es",label:"Spanish"},{code:"sw",label:"Swahili"},{code:"sv",label:"Swedish"},{code:"tl",label:"Tagalog"},{code:"ta",label:"Tamil"},{code:"te",label:"Telugu"},{code:"th",label:"Thai"},{code:"tr",label:"Turkish"},{code:"uk",label:"Ukrainian"},{code:"ur",label:"Urdu"},{code:"vi",label:"Vietnamese"},{code:"cy",label:"Welsh"}],Ze="en",Rn=Ft.filter(e=>e.code!=="auto");function Ke(e){if(typeof e!="string")return;let t=e.trim().toLowerCase();if(t)return Rn.find(o=>o.code.toLowerCase()===t||o.label.toLowerCase()===t)}function qo(){if(!(typeof navigator>"u"))return navigator.mediaDevices}function us(e){return e.replace(/^default\s*[-–:]\s*/i,"").trim()}function Zo(e){let t=e instanceof Error?e.name:"";return t==="NotAllowedError"||t==="SecurityError"}function Yo(e){let t=e.filter(s=>s.kind==="audioinput"),o=t.some(s=>!!s.label?.trim()),r=null,i=[],a=new Set,p=1;for(let s of t){let d=s.label?.trim()??"";if(s.deviceId===$){d&&(r=us(d)||d);continue}!s.deviceId||a.has(s.deviceId)||(a.add(s.deviceId),i.push({deviceId:s.deviceId,label:d||`Microphone ${p}`,isDefault:!1}),p++)}return{devices:i,defaultDeviceLabel:r,labelsAvailable:o}}async function ms(e){if(!e.getUserMedia||!e.enumerateDevices)return{ok:!1,permissionDenied:!1};try{return(await e.getUserMedia({audio:!0})).getTracks().forEach(o=>o.stop()),{ok:!0,rawDevices:await e.enumerateDevices()}}catch(t){return Zo(t)?{ok:!1,permissionDenied:!0}:(console.warn("Prompt Voice failed to refresh audio input devices",t),{ok:!1,permissionDenied:!1})}}async function Ko(e={}){let t=e.mediaDevices??qo();if(!t?.enumerateDevices)return{devices:[],defaultDeviceLabel:null,labelsAvailable:!1,permissionDenied:!1,supported:!1,error:null};let o;try{o=await t.enumerateDevices()}catch(a){return console.warn("Prompt Voice failed to enumerate audio input devices",a),{devices:[],defaultDeviceLabel:null,labelsAvailable:!1,permissionDenied:Zo(a),supported:!0,error:"Could not list microphones. Using System default."}}let r=Yo(o),i=!1;if(e.requestPermissionIfUnlabeled&&!r.labelsAvailable){let a=await ms(t);a.ok?r=Yo(a.rawDevices):i=a.permissionDenied}return{...r,permissionDenied:i,supported:!0,error:null}}function Xo(e,t=qo()){if(!t?.addEventListener||!t?.removeEventListener)return()=>{};let o=()=>e();return t.addEventListener("devicechange",o),()=>t.removeEventListener?.("devicechange",o)}function Jo(){let[e,t]=b([]),[o,r]=b(null),[i,a]=b(!0),[p,s]=b(!1),[d,m]=b(null),[u,g]=b(!1),v=x(!0),y=x(0),C=E(async(k=!1)=>{let P=++y.current;v.current&&g(!0);try{let N=await Ko({requestPermissionIfUnlabeled:k});if(!v.current||y.current!==P)return;t(N.devices),r(N.defaultDeviceLabel),a(N.labelsAvailable),s(N.permissionDenied),m(N.error)}catch(N){if(console.warn("Prompt Voice audio device lookup failed",N),!v.current||y.current!==P)return;t([]),m("Could not list microphones. Using System default.")}finally{v.current&&y.current===P&&g(!1)}},[]);return D(()=>{v.current=!0,C(!1);let k=Xo(()=>{C(!1)});return()=>{v.current=!1,y.current++,k()}},[C]),{devices:e,defaultDeviceLabel:o,labelsAvailable:i,permissionDenied:p,error:d,isRefreshing:u,refresh:C}}var hs={"Voice & transcription":[{key:"sttProvider",label:"Speech-to-text provider",options:["system","google-gemini","openai","local-whisper"],help:"Only configured speech providers are shown. Add API keys in Zana\u2019s Prompt Voice plugin settings or set up Local Whisper below."},{key:"inputLanguage",label:"Input language",options:Ft.map(e=>e.code),help:"Spoken language for transcription, or Detect automatically."},{key:"dictionary",label:"Personal dictionary",help:"Add specific names, acronyms, or technical terms to guarantee accurate spelling."}],"Prompt Voice":[{key:"tone",label:"Cleanup tone",options:[...yo],help:"Fixes grammar and clarity in the original language without extending text length."},{key:"customPrompt",label:"Custom cleanup instructions",multiline:!0}],Connections:[]},An={sttProvider:"system",inputLanguage:"auto",tone:"standard"},Qo={...Object.fromEntries(Ft.map(e=>[e.code,e.label])),standard:"Standard (Fix & clarify)",casual:"Casual",conversational:"Conversational",formal:"Professional",technical:"Technical",custom:"Custom",system:"Zana voice",none:"Off",assistant:"Zana assistant",openai:"OpenAI",anthropic:"Anthropic",google:"Google AI","google-gemini":"Google Gemini","local-whisper":"Local Whisper (on this device)"};function xs(e,t,o){return e.error?{warn:!0,text:e.error}:e.permissionDenied?{warn:!0,text:"Microphone permission denied. Allow microphone access in system settings to see device names."}:t.micDeviceId!==$&&!o?{warn:!0,text:"Selected microphone is currently disconnected. Recording will fall back to System default until reconnected."}:!e.labelsAvailable&&e.devices.length>0?{warn:!1,text:"Device names are hidden until microphone access is granted. Click Refresh to detect names."}:t.micDeviceId===$?{warn:!1,text:"Uses your OS default input device. Saved selection applies to Prompt Studio and Composer dictation."}:{warn:!1,text:`Using ${o?.label??(t.micLabel||t.micDeviceId)}. Saved until you choose another mic.`}}function Ss({prefs:e,audio:t,onSelect:o}){let r=t.devices.find(d=>d.deviceId===e.micDeviceId),i=e.micDeviceId!==$&&!r,a=xs(t,e,r),p=t.defaultDeviceLabel?`System default (${t.defaultDeviceLabel})`:"System default",s=d=>{if(d===$){o($,"");return}let m=t.devices.find(u=>u.deviceId===d);o(d,m?.label??e.micLabel)};return l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-mic-select",className:"ps-field-label",children:"Input microphone"}),l("div",{className:"ps-mic-row",children:[l("select",{id:"ps-mic-select","aria-label":"Input microphone",className:"ps-select",value:e.micDeviceId,onChange:d=>s(d.target.value),children:[n("option",{value:$,children:p}),t.devices.map(d=>n("option",{value:d.deviceId,children:d.label},d.deviceId)),i&&n("option",{value:e.micDeviceId,children:`${e.micLabel||e.micDeviceId} (Disconnected)`})]}),n("button",{type:"button",className:"ps-btn",onClick:()=>void t.refresh(!0),disabled:t.isRefreshing,"aria-label":"Refresh microphones",title:"Refresh connected audio input devices",children:t.isRefreshing?"Refreshing\u2026":"\u21BB Refresh"})]}),l("div",{className:"ps-audio-status",role:t.error?"alert":void 0,children:[n("span",{className:`ps-audio-dot ${a.warn?"warn":""}`,"aria-hidden":"true"}),n("span",{children:a.text})]})]})}function ws({prefs:e,onToggle:t,onVolumeChange:o}){let r=()=>{e.soundCuesEnabled&&j("start",{enabled:!0,volume:e.soundCuesVolume})};return l(K,{children:[l("div",{className:"ps-toggle-card",children:[l("div",{className:"ps-toggle-copy",children:[n("span",{id:"ps-sound-cues-label",className:"ps-toggle-title",children:"Sound cues & chimes"}),n("small",{style:{color:"var(--ps-text-muted)"},children:"Play a subtle chime when dictation starts, finishes, or encounters an error."})]}),n("button",{type:"button",className:"ps-switch",role:"switch","aria-checked":e.soundCuesEnabled,"aria-labelledby":"ps-sound-cues-label",onClick:t})]}),l("div",{className:`ps-volume-card ${e.soundCuesEnabled?"":"disabled"}`,children:[l("div",{className:"ps-volume-header",children:[n("label",{htmlFor:"ps-chime-volume",className:"ps-field-label",children:"Chime volume"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 9px",fontSize:11},disabled:!e.soundCuesEnabled,onClick:r,children:"Test chime"})]}),l("div",{className:"ps-volume-controls",children:[n("input",{id:"ps-chime-volume",type:"range",className:"ps-volume-slider","aria-label":"Chime volume",min:0,max:100,step:5,value:e.soundCuesVolume,disabled:!e.soundCuesEnabled,onChange:i=>o(Number(i.target.value)),onPointerUp:r,onKeyUp:i=>{["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(i.key)&&r()}}),l("span",{className:"ps-volume-pct",children:[e.soundCuesVolume,"%"]})]})]})]})}function Is({values:e,onSave:t}){let o=U(()=>xe(e),[e]),r=Jo();return l("section",{className:"ps-pane",style:{flex:"none"},"aria-labelledby":"ps-audio-feedback-title",children:[l("div",{className:"ps-pane-header",children:[n("h2",{id:"ps-audio-feedback-title",className:"ps-pane-title",style:{margin:0},children:"Audio & Feedback"}),n("button",{type:"button",className:"ps-btn",onClick:()=>t({micDeviceId:$,micLabel:"",soundCuesEnabled:String(!0),soundCuesVolume:String(75)}),children:"Reset"})]}),l("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[n(Ss,{prefs:o,audio:r,onSelect:(p,s)=>t({micDeviceId:p,micLabel:s})}),n(ws,{prefs:o,onToggle:()=>{let p=!o.soundCuesEnabled;t({soundCuesEnabled:String(p)}),p&&j("start",{enabled:!0,volume:o.soundCuesVolume})},onVolumeChange:p=>t({soundCuesVolume:String(p)})})]})]})}function Ts(e){return e===0?"Unlimited":`${e.toLocaleString()} entries`}function Es(e){return e===0?"Forever":e===365?"1 year":`${e} days`}function er(e,t){return e.includes(t)?[...e]:[...e,t]}function Cs({enabled:e,onToggle:t}){return l("div",{className:"ps-toggle-card",children:[l("div",{className:"ps-toggle-copy",children:[n("span",{id:"ps-history-enabled-label",className:"ps-toggle-title",children:"Save activity history"}),n("small",{style:{color:"var(--ps-text-muted)"},children:"Store text and metadata from dictations and Prompt Studio refinements locally. Audio recordings are never saved."})]}),n("button",{type:"button",className:"ps-switch",role:"switch","aria-checked":e,"aria-labelledby":"ps-history-enabled-label",onClick:t})]})}function Rs({prefs:e,onSave:t}){let o=U(()=>er($o,e.historyMaxEntries),[e.historyMaxEntries]),r=U(()=>er(Bo,e.historyMaxDays),[e.historyMaxDays]);return l("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:12},children:[l("label",{className:"ps-field-group",children:[n("span",{className:"ps-field-label",children:"Maximum entries"}),n("select",{className:"ps-select","aria-label":"Maximum history entries",value:String(e.historyMaxEntries),onChange:i=>t({historyMaxEntries:i.target.value}),children:o.map(i=>n("option",{value:String(i),children:Ts(i)},i))}),n("small",{style:{color:"var(--ps-text-muted)"},children:"Starred entries are exempt from automatic pruning."})]}),l("label",{className:"ps-field-group",children:[n("span",{className:"ps-field-label",children:"Retention period"}),n("select",{className:"ps-select","aria-label":"History retention period",value:String(e.historyMaxDays),onChange:i=>t({historyMaxDays:i.target.value}),children:r.map(i=>n("option",{value:String(i),children:Es(i)},i))}),n("small",{style:{color:"var(--ps-text-muted)"},children:"Older non-starred entries are pruned automatically."})]})]})}function As({includeStarred:e,clearing:t,onIncludeStarredChange:o,onCancel:r,onConfirm:i}){return l("div",{role:"alertdialog","aria-label":"Confirm clear activity history",style:{display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:10,padding:"10px 12px",borderRadius:6,background:"rgba(239, 68, 68, 0.1)",border:"1px solid rgba(239, 68, 68, 0.35)"},children:[l("div",{style:{display:"flex",flexDirection:"column",gap:4},children:[n("strong",{style:{fontSize:12},children:"Clear all activity history?"}),l("label",{style:{display:"inline-flex",alignItems:"center",gap:6,fontSize:11.5,cursor:"pointer"},children:[n("input",{type:"checkbox",checked:e,onChange:a=>o(a.target.checked)}),n("span",{children:"Also delete starred entries"})]})]}),l("div",{style:{display:"flex",gap:6},children:[n("button",{type:"button",className:"ps-btn",disabled:t,onClick:r,children:"Cancel"}),n("button",{type:"button",className:"ps-btn ps-btn-danger",disabled:t,onClick:i,children:t?"Clearing\u2026":"Confirm clear"})]})]})}function Ps({rpc:e}){let[t,o]=b(!1),[r,i]=b(!1),[a,p]=b(!1),[s,d]=b(null),m=async()=>{p(!0),d(null);try{let u=await e.call(kt,{includeStarred:r});o(!1),i(!1),u?.ok?d(u.deletedCount===0?"No matching history entries to clear.":`Cleared ${u.deletedCount} history ${u.deletedCount===1?"entry":"entries"}.`):d("History storage is unavailable.")}catch{d("Could not clear history.")}finally{p(!1)}};return l("div",{style:{display:"flex",flexDirection:"column",gap:8,paddingTop:4,borderTop:"1px solid var(--ps-border)"},children:[t?n(As,{includeStarred:r,clearing:a,onIncludeStarredChange:i,onCancel:()=>o(!1),onConfirm:()=>void m()}):l("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10},children:[n("small",{style:{color:"var(--ps-text-muted)"},children:"Remove stored dictation and refinement history from this machine."}),n("button",{type:"button",className:"ps-btn ps-btn-danger",onClick:()=>{i(!1),o(!0)},children:"Clear history"})]}),s?n("div",{role:"status",style:{fontSize:11.5,color:"var(--ps-text-muted)"},children:s}):null]})}function ks({rpc:e,values:t,onSave:o}){let r=U(()=>Wo(t),[t]);return l("section",{className:"ps-pane",style:{flex:"none"},"aria-labelledby":"ps-history-privacy-title",children:[l("div",{className:"ps-pane-header",children:[n("h2",{id:"ps-history-privacy-title",className:"ps-pane-title",style:{margin:0},children:"History & Privacy"}),n("button",{type:"button",className:"ps-btn",onClick:()=>o({historyEnabled:String(!0),historyMaxEntries:String(500),historyMaxDays:String(90)}),children:"Reset"})]}),l("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[n(Cs,{enabled:r.historyEnabled,onToggle:()=>o({historyEnabled:String(!r.historyEnabled)})}),n(Rs,{prefs:r,onSave:o}),n(Ps,{rpc:e})]})]})}function Ns({terms:e,atLimit:t,onRemove:o,onClearAll:r}){return l(K,{children:[n("div",{className:"ps-dict-well",children:e.length>0?n("ul",{className:"ps-dict-pills","aria-label":"Dictionary terms",children:e.map(i=>l("li",{className:"ps-dict-pill",children:[n("span",{className:"ps-dict-pill-text",children:i}),n("button",{type:"button",className:"ps-dict-pill-remove",onClick:()=>o(i),"aria-label":`Remove ${i}`,title:`Remove ${i}`,children:"\xD7"})]},i))}):n("span",{className:"ps-dict-empty",children:"No terms added yet. Type a term above or paste a comma-separated list."})}),l("div",{className:"ps-dict-footer",children:[l("span",{className:"ps-dict-count",children:[e.length===1?"1 term active":`${e.length} terms active`,t?` (max ${200})`:""]}),n("button",{type:"button",className:"ps-btn ps-dict-clear-btn",onClick:r,disabled:e.length===0,children:"Clear all"})]})]})}function Ds({label:e,help:t,value:o,resetSignal:r,onChange:i}){let[a,p]=b(""),s=U(()=>En(o),[o]),d=s.length>=200;D(()=>{r>0&&p("")},[r]);let m=()=>{let g=a.trim();if(!g||d)return;let v=zo(s,g);p(""),v.length!==s.length&&i(Cn(v))};return l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-dictionary-input",className:"ps-field-label",children:e}),t&&n("small",{style:{color:"var(--ps-text-muted)"},children:t}),l("div",{className:"ps-dict-container",children:[l("div",{className:"ps-dict-input-row",children:[n("input",{id:"ps-dictionary-input",type:"text",className:"ps-dict-input",value:a,onChange:g=>p(g.target.value),onKeyDown:g=>{g.key==="Enter"&&(g.preventDefault(),m())},onPaste:g=>{let v=g.clipboardData?.getData("text");if(!v||!/[\r\n]/.test(v))return;g.preventDefault();let y=g.currentTarget.selectionStart??a.length,C=g.currentTarget.selectionEnd??a.length;p(a.slice(0,y)+v.replace(/[\r\n]+/g,", ")+a.slice(C))},placeholder:"Type a term and press Enter (or paste comma-separated)...",disabled:d}),n("button",{type:"button",className:"ps-btn ps-btn-primary ps-dict-add-btn",onClick:m,disabled:!a.trim()||d,children:"+ Add"})]}),n(Ns,{terms:s,atLimit:d,onRemove:g=>i(Cn(s.filter(v=>v!==g))),onClearAll:()=>{p(""),i("")}})]})]})}function _s({field:e,values:t,availableSttProviders:o,resetSignal:r,onSave:i}){if(e.key==="dictionary")return n(Ds,{label:e.label,help:e.help,value:t.dictionary??"",resetSignal:r,onChange:d=>i({dictionary:d})});let a=t[e.key]??An[e.key]??"",p=e.options;if(p&&e.key==="inputLanguage"&&a&&!p.includes(a))p=[...p,a];else if(p&&e.key==="sttProvider"){let d=new Set(o);d.add("system"),p=p.filter(m=>d.has(m))}let s=e.key==="sttProvider"&&!!a&&!!p&&!p.includes(a);return l("label",{className:"ps-field-group",children:[n("span",{className:"ps-field-label",children:e.label}),p?l("select",{className:"ps-select",value:s?"":a,onChange:d=>i({[e.key]:d.target.value}),children:[s&&n("option",{value:"",disabled:!0,hidden:!0,children:`${Qo[a]??a} (Not configured)`}),p.map(d=>n("option",{value:d,children:Qo[d]??d},d))]}):e.multiline?n("textarea",{className:"ps-custom-prompt-input",value:t[e.key]??"",onChange:d=>i({[e.key]:d.target.value})}):n("input",{type:e.secret?"password":"text",className:"ps-select",value:t[e.key]??"",onChange:d=>i({[e.key]:d.target.value}),placeholder:e.secret?"Enter API key\u2026":void 0}),e.help&&n("small",{style:{color:"var(--ps-text-muted)"},children:e.help})]})}function nr({rpc:e,onBack:t,pluginId:o}){oe();let[r,i]=b({}),[a,p]=b(["system"]),[s,d]=b("Loading\u2026"),[m,u]=b(null),[g,v]=b(0),y=x(0),C=x({}),k=x(!0),P=x(e);P.current=e;let N=E(()=>{P.current.call(me).then(O=>{k.current&&p(_t(O))}).catch(()=>{})},[]);Te(Nt,()=>{N()}),Te(Dt,()=>{N()}),D(()=>{k.current=!0;let O=!0;return P.current.call(Se).then(V=>{if(!O)return;let h=V||{};C.current=h,i(h),ge(h),d("Saved")}).catch(()=>{O&&d("Could not load settings")}),N(),()=>{O=!1,k.current=!1}},[N]);let w=O=>{let V=++y.current,h=C.current={...C.current,...O};i(h),ge(h),d("Saving\u2026"),P.current.call(we,h).then(()=>{V===y.current&&(u(null),d("Saved"))}).catch(()=>{V===y.current&&(u(h),d("Could not save settings."))})};return n("div",{className:"ps-workspace",children:n("main",{className:"ps-editor-canvas",style:{overflowY:"auto"},children:l("div",{style:{width:"100%",maxWidth:760,margin:"0 auto",display:"flex",flexDirection:"column",gap:12},children:[l("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12},children:[l("div",{children:[n("h1",{style:{fontSize:18,margin:"4px 0"},children:"Settings"}),n("span",{style:{color:"var(--ps-text-muted)",fontSize:12},children:"Configure voice and cleanup defaults"})]}),n("button",{className:"ps-btn",onClick:t,children:"\u2190 Back to Studio"})]}),l("div",{style:{color:"var(--ps-text-muted)",fontSize:11},children:[n("span",{role:"status",children:s}),m&&n("button",{className:"ps-btn",onClick:()=>w(m),children:"Retry"})]}),n(Is,{values:r,onSave:w}),n(ks,{rpc:e,values:r,onSave:w}),Object.entries(hs).map(([O,V])=>l(lo.Fragment,{children:[l("section",{className:"ps-pane",style:{flex:"none"},children:[l("div",{className:"ps-pane-header",children:[n("h2",{className:"ps-pane-title",style:{margin:0},children:O}),O!=="Connections"&&n("button",{className:"ps-btn",onClick:()=>{O==="Voice & transcription"&&v(h=>h+1),w(Object.fromEntries(V.map(h=>[h.key,An[h.key]??""])))},children:"Reset"})]}),l("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[O==="Connections"&&n("p",{children:"Manage API keys in Zana\u2019s Prompt Voice plugin settings."}),V.filter(h=>!(h.key==="customPrompt"&&r.tone!=="custom")).map(h=>n(_s,{field:h,values:r,availableSttProviders:a,resetSignal:g,onSave:w},h.key))]})]}),O==="Voice & transcription"&&n(Fo,{rpc:e,sttProvider:r.sttProvider??An.sttProvider,llmProvider:r.llmProvider,onApplyPreset:w,onReadyChange:N})]},O)),o?n("section",{className:"ps-pane",style:{flex:"none",padding:14},children:n(jt,{pluginId:o})}):null]})})})}async function Xe(e){if(!e)return!1;if(typeof navigator<"u"&&navigator.clipboard&&typeof navigator.clipboard.writeText=="function")try{return await navigator.clipboard.writeText(e),!0}catch{}if(typeof document<"u"){let t=document.createElement("textarea");t.value=e,t.setAttribute("readonly",""),t.style.position="fixed",t.style.top="-9999px",t.style.left="-9999px",t.style.opacity="0";try{if(document.body.appendChild(t),t.focus(),t.select(),document.execCommand("copy"))return!0}catch{}finally{t.parentNode&&t.parentNode.removeChild(t)}}return!1}var Ms={improve:"Improve writing",executive:"Summarize",spec:"Technical spec",custom:"Custom",translate:"Translate"},Ls={standard:"Standard",casual:"Casual",conversational:"Conversational",formal:"Professional",technical:"Technical",custom:"Custom"},Ut={composer:"Composer",home:"Home",studio:"Prompt Studio"},Pn={system:"Zana Voice","local-whisper":"Local Whisper","google-gemini":"Google Gemini",google:"Google Gemini",openai:"OpenAI",anthropic:"Anthropic",assistant:"Zana Assistant"};function or(e){if(e.presetId==="translate"||e.targetLanguage){let r=e.targetLanguage?Ke(e.targetLanguage)?.label??e.targetLanguage:null;return r?`Translate \xB7 ${r}`:"Translate"}let t=e.presetId?Ms[e.presetId]:null,o=e.tone?Ls[e.tone]??e.tone:null;return t==="Improve writing"&&o?`Improve \xB7 ${o}`:t||(o?`Refinement \xB7 ${o}`:"Refinement")}function zt(e){return e.kind==="dictation"?"Dictation":e.kind==="dictation_cleanup"?e.presetId||e.targetLanguage?`Dictation + ${or(e)}`:"Dictation + Cleanup":or(e)}function $t(e){if(e===null||!Number.isFinite(e)||e<0)return null;if(e<1e3)return`${Math.round(e)}ms`;let t=Math.round(e/1e3);if(t<60)return`${t}s`;let o=Math.floor(t/60),r=t%60;return`${o}m ${String(r).padStart(2,"0")}s`}function rr(e,t=Date.now()){let o=Math.max(0,Math.floor((t-e)/1e3));if(o<60)return"Just now";let r=Math.floor(o/60);if(r<60)return`${r}m ago`;let i=Math.floor(r/60);if(i<24)return`${i}h ago`;try{return new Date(e).toLocaleDateString(void 0,{month:"short",day:"numeric"})}catch{return`${Math.floor(i/24)}d ago`}}function ir(e){try{return new Date(e).toLocaleString(void 0,{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}catch{return String(e)}}function sr(e,t=Date.now()){let o=new Date(t);o.setHours(0,0,0,0);let r=new Date(o.getTime()-864e5),i={Today:[],Yesterday:[],Earlier:[]};for(let a of e)a.createdAt>=o.getTime()?i.Today.push(a):a.createdAt>=r.getTime()?i.Yesterday.push(a):i.Earlier.push(a);return["Today","Yesterday","Earlier"].filter(a=>i[a].length>0).map(a=>({label:a,entries:i[a]}))}function kn(e){let t=e.trim();return`${t?t.split(/\s+/).length:0} words \xB7 ${e.length} chars`}function ar(e){return e?e.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]+/gu)||[]:[]}var lr=1200;function Bt(e,t){if(!e&&!t)return[];if(e===t)return[{type:"unchanged",text:e}];if(!e)return[{type:"added",text:t}];if(!t)return[{type:"removed",text:e}];let o=ar(e),r=ar(t),i=o.length,a=r.length;if(i>lr||a>lr)return[{type:"removed",text:e},{type:"added",text:t}];let p=a+1,s=new Uint32Array((i+1)*p);for(let v=1;v<=i;v++){let y=v*p,C=(v-1)*p,k=o[v-1];for(let P=1;P<=a;P++)if(k===r[P-1])s[y+P]=s[C+(P-1)]+1;else{let N=s[y+(P-1)],w=s[C+P];s[y+P]=N>w?N:w}}let d=[],m=i,u=a;for(;m>0||u>0;){let v=m*p,y=(m-1)*p;m>0&&u>0&&o[m-1]===r[u-1]?(d.push({type:"unchanged",text:o[m-1]}),m--,u--):u>0&&(m===0||s[v+(u-1)]>=s[y+u])?(d.push({type:"added",text:r[u-1]}),u--):m>0&&(u===0||s[v+(u-1)]<s[y+u])&&(d.push({type:"removed",text:o[m-1]}),m--)}d.reverse();let g=[];for(let v of d)g.length>0&&g[g.length-1].type===v.type?g[g.length-1].text+=v.text:g.push({...v});return g}function Os({entry:e,projectName:t,onOpenThread:o}){let r=$t(e.audioDurationMs),i=$t(e.processingDurationMs);return l(K,{children:[l("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"},children:[l("div",{className:"ps-history-meta-row",children:[n("span",{className:`ps-kind-badge ps-kind-${e.kind}`,children:zt(e)}),n("span",{className:"ps-source-badge",children:Ut[e.source]??e.source}),t?n("span",{className:"ps-badge ps-badge-project",children:t}):null,n("span",{children:ir(e.createdAt)})]}),e.threadId&&o?n("button",{type:"button",className:"ps-btn",style:{padding:"4px 9px",fontSize:11},onClick:()=>o(e.threadId),children:"Open thread"}):null]}),l("div",{className:"ps-history-meta-row",children:[e.sttProvider?l("span",{className:"ps-pill",children:["STT: ",Pn[e.sttProvider]??e.sttProvider,e.sttModel?` (${e.sttModel})`:""]}):null,e.llmProvider?l("span",{className:"ps-pill",children:["LLM: ",Pn[e.llmProvider]??e.llmProvider,e.llmModel?` (${e.llmModel})`:""]}):null,r?l("span",{className:"ps-pill",children:["Recorded: ",r]}):null,i?l("span",{className:"ps-pill",children:["Processed: ",i]}):null]})]})}function Hs({entry:e,primaryText:t,hasDistinctOutput:o,showDiff:r,copiedTarget:i,onToggleDiff:a,onCopyText:p,onLoadIntoStudio:s,onInsertIntoComposer:d,onToggleStar:m,onDelete:u}){return l("div",{className:"ps-history-actions-bar",children:[n("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:()=>s(e),children:"Load into Studio"}),n("button",{type:"button",className:"ps-btn",onClick:()=>d(t),children:"Insert into Composer"}),n("button",{type:"button",className:"ps-btn",onClick:()=>p(t,"output"),children:i==="output"?"Copied":o?"Copy Output":"Copy"}),o?l(K,{children:[n("button",{type:"button",className:"ps-btn",onClick:()=>p(e.rawText,"raw"),children:i==="raw"?"Copied Raw":"Copy Raw"}),n("button",{type:"button",className:"ps-btn","aria-pressed":r,onClick:a,children:r?"View Clean":"View Diff"})]}):null,l("button",{type:"button",className:"ps-btn","aria-pressed":e.starred,onClick:()=>m(e),children:[n("span",{className:e.starred?"ps-star-active":void 0,children:e.starred?"\u2605":"\u2606"}),n("span",{children:e.starred?"Starred":"Star"})]}),n("button",{type:"button",className:"ps-btn ps-btn-danger",style:{marginLeft:"auto"},onClick:()=>u(e),children:"Delete"})]})}function Vs({rawText:e,outputText:t}){let o=U(()=>Bt(e,t),[t,e]);return l("div",{className:"ps-history-text-card",children:[n("div",{className:"ps-pane-header",children:n("span",{className:"ps-pane-title",children:"Word Diff (Raw \u2192 Refined)"})}),n("div",{className:"ps-history-text-body","data-testid":"history-diff-view",children:o.map((r,i)=>n("span",{className:r.type==="added"?"ps-diff-added":r.type==="removed"?"ps-diff-removed":"ps-diff-unchanged",children:r.text},i))})]})}function js({entry:e,hasDistinctOutput:t}){let o=e.kind==="refinement"?"Original Input":t?"Raw Transcript":"Transcript";return l(K,{children:[t?l("div",{className:"ps-history-text-card",children:[l("div",{className:"ps-pane-header",children:[n("span",{className:"ps-pane-title",children:"Refined Output"}),n("span",{style:{fontSize:11,color:"var(--ps-text-subtle)"},children:kn(e.outputText)})]}),n("div",{className:"ps-history-text-body",children:e.outputText})]}):null,l("div",{className:"ps-history-text-card",children:[l("div",{className:"ps-pane-header",children:[n("span",{className:"ps-pane-title",children:o}),n("span",{style:{fontSize:11,color:"var(--ps-text-subtle)"},children:kn(e.rawText)})]}),n("div",{className:"ps-history-text-body",children:e.rawText})]})]})}function cr({entry:e,projectName:t,showDiff:o,onToggleDiff:r,onCopyText:i,onLoadIntoStudio:a,onInsertIntoComposer:p,onToggleStar:s,onDelete:d,onOpenThread:m,copiedTarget:u}){let g=e.rawText!==e.outputText,v=e.outputText||e.rawText;return l("section",{className:"ps-history-detail-pane","aria-label":"Activity details",children:[l("div",{className:"ps-history-detail-header",children:[n(Os,{entry:e,projectName:t,onOpenThread:m}),n(Hs,{entry:e,primaryText:v,hasDistinctOutput:g,showDiff:o,copiedTarget:u,onToggleDiff:r,onCopyText:i,onLoadIntoStudio:a,onInsertIntoComposer:p,onToggleStar:s,onDelete:d})]}),e.refineNotice?l("div",{role:"status",style:{padding:"8px 12px",borderRadius:6,background:"rgba(234, 179, 8, 0.1)",border:"1px solid rgba(234, 179, 8, 0.3)",color:"#fde047",fontSize:12},children:["Cleanup fallback: ",e.refineNotice.message]}):null,e.customPrompt?l("div",{className:"ps-history-text-card",children:[n("div",{className:"ps-pane-header",children:n("span",{className:"ps-pane-title",children:"Custom Instructions"})}),n("div",{className:"ps-history-text-body",style:{fontSize:12,color:"var(--ps-text-muted)"},children:e.customPrompt})]}):null,o&&g?n(Vs,{rawText:e.rawText,outputText:e.outputText}):n(js,{entry:e,hasDistinctOutput:g})]})}var pr=50,Fs=180;function Us(e){let[t,o]=b(""),[r,i]=b(""),[a,p]=b("all"),[s,d]=b("all"),[m,u]=b(!1),[g,v]=b(e?"project":"all"),[y,C]=b("");D(()=>{v(e?"project":"all"),C("")},[e]),D(()=>{let w=setTimeout(()=>i(t.trim()),Fs);return()=>clearTimeout(w)},[t]);let k=e?g==="project"?e:null:y||null,P=!!(r||a!=="all"||s!=="all"||m||y),N=E(()=>{o(""),i(""),p("all"),d("all"),u(!1),C("")},[]);return{searchInput:t,setSearchInput:o,debouncedQuery:r,typeFilter:a,setTypeFilter:p,sourceFilter:s,setSourceFilter:d,starredOnly:m,setStarredOnly:u,scopeMode:g,setScopeMode:v,selectedProjectFilter:y,setSelectedProjectFilter:C,effectiveProjectId:k,hasActiveFilters:P,resetFilters:N}}function zs(e){let[t,o]=b([]),r=E(()=>{e.current.call(bo).then(a=>{a&&Array.isArray(a.projects)&&o(a.projects)}).catch(()=>{})},[e]);D(()=>{r()},[r]);let i=U(()=>new Map(t.map(a=>[a.id,a.name])),[t]);return{projects:t,projectNameById:i,loadProjects:r}}function $s(e,t,o,r,i){return E(async a=>{try{let p=await e.current.call(fo,{id:a.id,starred:!a.starred});if(!p?.ok||!p.entry){i?.("Could not update star status.");return}t&&!p.entry.starred?(o(s=>s.filter(d=>d.id!==a.id)),r(s=>Math.max(0,s-1))):o(s=>s.map(d=>d.id===a.id?p.entry:d))}catch{i?.("Could not update star status.")}},[i,e,o,r,t])}function Bs(e,t,o,r){return E(async i=>{try{let a=await e.current.call(go,{id:i.id});if(!a?.ok||!a.deleted){r?.("Could not delete history entry.");return}t(p=>p.filter(s=>s.id!==i.id)),o(p=>Math.max(0,p-1)),r?.("History entry deleted.")}catch{r?.("Could not delete history entry.")}},[r,e,t,o])}function Gs(e,t,o,r){let[i,a]=b(!1),p=E(async s=>{a(!0);try{let d=await e.current.call(kt,{projectId:t,includeStarred:s});if(!d?.ok){r?.("Could not clear history.");return}r?.(d.deletedCount===0?"No matching entries were cleared.":`Cleared ${d.deletedCount} history ${d.deletedCount===1?"entry":"entries"}.`),await o()}catch{r?.("Could not clear history.")}finally{a(!1)}},[t,r,o,e]);return{clearing:i,clearHistory:p}}function Ws(e,t){let[o,r]=b([]),[i,a]=b(0),[p,s]=b(!1),[d,m]=b(!0),[u,g]=b(!0),[v,y]=b(!0),[C,k]=b(!1),[P,N]=b(null),w=x(0),O=E(async(V={})=>{let h=++w.current,z=V.append===!0;z?k(!0):y(!0),N(null);try{let q=await e.current.call(mo,{query:t.query||void 0,type:t.type,source:t.source,projectId:t.projectId,starredOnly:t.starredOnly,limit:V.limit??pr,offset:V.offset??0});if(w.current!==h)return;let I=Array.isArray(q?.entries)?q.entries:[];r(X=>z?[...X,...I]:I),a(typeof q?.total=="number"?q.total:I.length),s(!!q?.hasMore),m(q?.historyEnabled!==!1),g(q?.storageAvailable!==!1)}catch(q){if(w.current!==h)return;N(q instanceof Error?q.message:"Could not load activity history.")}finally{w.current===h&&(y(!1),k(!1))}},[t.projectId,t.query,t.source,t.starredOnly,t.type,e]);return{entries:o,setEntries:r,total:i,setTotal:a,hasMore:p,historyEnabled:d,storageAvailable:u,loading:v,loadingMore:C,error:P,fetchEntries:O}}function Ys({entriesRef:e,starredOnly:t,setEntries:o,setTotal:r,fetchEntries:i,loadProjects:a}){Te(vo,p=>{let s=p&&typeof p=="object"?p:{},d=Math.max(pr,e.current.length);if(s.action==="deleted"&&typeof s.id=="string"){if(!e.current.some(m=>m.id===s.id))return;o(m=>m.filter(u=>u.id!==s.id)),r(m=>Math.max(0,m-1));return}if(s.action==="starred"&&typeof s.id=="string"&&typeof s.starred=="boolean"){let m=e.current.some(u=>u.id===s.id);t&&s.starred&&!m?i({offset:0,limit:d,append:!1}):m&&t&&!s.starred?(o(u=>u.filter(g=>g.id!==s.id)),r(u=>Math.max(0,u-1))):m&&o(u=>u.map(g=>g.id===s.id?{...g,starred:s.starred}:g));return}if(s.action==="settingsChanged"){i({offset:0,limit:d,append:!1});return}i({offset:0,limit:d,append:!1}),(!s.action||s.action==="recorded"||s.action==="cleared"||s.action==="pruned")&&a()})}function dr({rpc:e,projectId:t,onStatusNotice:o}){let r=x(e);r.current=e;let i=Us(t),{projects:a,projectNameById:p,loadProjects:s}=zs(r),[d,m]=b(null),u=Ws(r,{query:i.debouncedQuery,type:i.typeFilter,source:i.sourceFilter,projectId:i.effectiveProjectId,starredOnly:i.starredOnly}),g=x(u.entries);g.current=u.entries;let v=E(()=>u.fetchEntries({offset:0,append:!1}),[u.fetchEntries]);D(()=>{v()},[v]),Ys({entriesRef:g,starredOnly:i.starredOnly,setEntries:u.setEntries,setTotal:u.setTotal,fetchEntries:u.fetchEntries,loadProjects:s});let y=$s(r,i.starredOnly,u.setEntries,u.setTotal,o),C=Bs(r,u.setEntries,u.setTotal,o),{clearing:k,clearHistory:P}=Gs(r,i.effectiveProjectId,v,o),N=U(()=>u.entries.length===0?null:u.entries.find(w=>w.id===d)??u.entries[0],[u.entries,d]);return{...i,...u,clearing:k,toggleStar:y,deleteEntry:C,clearHistory:P,projects:a,projectNameById:p,selectedEntry:N,setSelectedId:m}}var qs=`
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
`;function Zs({projectId:e,scopeMode:t,onScopeModeChange:o,selectedProjectFilter:r,onSelectedProjectFilterChange:i,projects:a}){return e?l("div",{className:"ps-segmented",role:"group","aria-label":"Project scope",children:[n("button",{type:"button",className:`ps-segmented-btn ${t==="project"?"active":""}`,"aria-pressed":t==="project",onClick:()=>o("project"),children:"This project"}),n("button",{type:"button",className:`ps-segmented-btn ${t==="all"?"active":""}`,"aria-pressed":t==="all",onClick:()=>o("all"),children:"All activity"})]}):a.length===0?null:l("select",{className:"ps-select",style:{width:"auto",minWidth:130},"aria-label":"Filter by project",value:r,onChange:p=>i(p.target.value),children:[n("option",{value:"",children:"All projects"}),a.map(p=>n("option",{value:p.id,children:p.name},p.id))]})}function Ks({search:e,onSearchChange:t,typeFilter:o,onTypeFilterChange:r,sourceFilter:i,onSourceFilterChange:a,starredOnly:p,onStarredToggle:s,projectId:d,scopeMode:m,onScopeModeChange:u,selectedProjectFilter:g,onSelectedProjectFilterChange:v,effectiveProjectId:y,projects:C,total:k,onRequestClear:P}){let N=y?"Clear project history":"Clear all";return l("div",{className:"ps-history-toolbar",children:[l("div",{className:"ps-history-search-wrap",children:[n("input",{type:"search",className:"ps-history-search","aria-label":"Search history",placeholder:"Search dictations & refinements\u2026",value:e,onChange:w=>t(w.target.value)}),e?n("button",{type:"button",className:"ps-history-search-clear","aria-label":"Clear search",onClick:()=>t(""),children:"\xD7"}):null]}),n("div",{className:"ps-segmented",role:"group","aria-label":"Activity type filter",children:[{id:"all",label:"All"},{id:"dictation",label:"Dictations"},{id:"refinement",label:"Refinements"}].map(w=>n("button",{type:"button",className:`ps-segmented-btn ${o===w.id?"active":""}`,"aria-pressed":o===w.id,onClick:()=>r(w.id),children:w.label},w.id))}),l("select",{className:"ps-select",style:{width:"auto",minWidth:120},"aria-label":"Filter by source",value:i,onChange:w=>a(w.target.value),children:[n("option",{value:"all",children:"All sources"}),n("option",{value:"composer",children:"Composer"}),n("option",{value:"home",children:"Home"}),n("option",{value:"studio",children:"Prompt Studio"})]}),n(Zs,{projectId:d,scopeMode:m,onScopeModeChange:u,selectedProjectFilter:g,onSelectedProjectFilterChange:v,projects:C}),l("button",{type:"button",className:`ps-btn ${p?"ps-btn-primary":""}`,"aria-pressed":p,onClick:s,children:[n("span",{children:p?"\u2605":"\u2606"}),n("span",{children:"Starred"})]}),l("div",{style:{marginLeft:"auto",display:"flex",alignItems:"center",gap:8},children:[n("span",{style:{fontSize:11,color:"var(--ps-text-subtle)"},children:k===1?"1 entry":`${k} entries`}),n("button",{type:"button",className:"ps-btn ps-btn-danger",disabled:k===0,onClick:P,children:N})]})]})}function Xs({onOpenSettings:e}){return l("div",{className:"ps-history-banner",role:"status",children:[n("span",{children:"History recording is paused. New dictations and refinements will not be saved."}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 9px",fontSize:11},onClick:e,children:"Open Settings"})]})}function Js({heading:e,includeStarred:t,clearing:o,onIncludeStarredChange:r,onCancel:i,onConfirm:a}){return l("div",{className:"ps-history-confirm-bar",role:"alertdialog","aria-label":"Confirm clear history",children:[l("div",{style:{display:"flex",flexDirection:"column",gap:4},children:[n("strong",{children:e}),l("label",{style:{display:"inline-flex",alignItems:"center",gap:6,fontSize:11.5,cursor:"pointer"},children:[n("input",{type:"checkbox",checked:t,onChange:p=>r(p.target.checked)}),n("span",{children:"Also delete starred entries"})]})]}),l("div",{style:{display:"flex",gap:6},children:[n("button",{type:"button",className:"ps-btn",disabled:o,onClick:i,children:"Cancel"}),n("button",{type:"button",className:"ps-btn ps-btn-danger",disabled:o,onClick:a,children:o?"Clearing\u2026":"Confirm Clear"})]})]})}function Qs({storageAvailable:e,error:t,loading:o,hasActiveFilters:r,onRetry:i,onResetFilters:a}){return e?t?n("div",{className:"ps-empty-state",children:l("div",{className:"ps-empty-card",role:"alert",children:[n("div",{style:{fontSize:14,fontWeight:600},children:"Could not load history"}),n("div",{style:{fontSize:12,color:"var(--ps-text-muted)"},children:t}),n("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:i,children:"Retry"})]})}):o?n("div",{className:"ps-empty-state",children:n("span",{style:{fontSize:12,color:"var(--ps-text-muted)"},children:"Loading activity history\u2026"})}):n("div",{className:"ps-empty-state",children:l("div",{className:"ps-empty-card",children:[n("div",{style:{fontSize:14,fontWeight:600},children:r?"No matching history entries":"No activity recorded yet"}),n("div",{style:{fontSize:12,color:"var(--ps-text-muted)",lineHeight:1.45},children:r?"Try clearing your search or adjusting filters to see more entries.":"Dictate from any composer, the Home card, or Prompt Studio \u2014 or refine text in Studio \u2014 and it will appear here automatically."}),r?n("button",{type:"button",className:"ps-btn",onClick:a,children:"Reset filters"}):null]})}):n("div",{className:"ps-empty-state",children:l("div",{className:"ps-empty-card",children:[n("div",{style:{fontSize:14,fontWeight:600},children:"History storage is unavailable"}),n("div",{style:{fontSize:12,color:"var(--ps-text-muted)"},children:"Prompt Voice needs host database storage to save and browse dictation history."})]})})}function ea({entry:e,isSelected:t,projectName:o,onSelect:r}){let i=(e.outputText||e.rawText).trim();return l("button",{type:"button",className:`ps-history-row ${t?"selected":""}`,"aria-current":t?"true":void 0,onClick:r,children:[l("div",{className:"ps-history-row-top",children:[l("div",{className:"ps-history-row-badges",children:[n("span",{className:`ps-kind-badge ps-kind-${e.kind}`,children:zt(e)}),n("span",{className:"ps-source-badge",children:Ut[e.source]??e.source})]}),e.starred?n("span",{className:"ps-star-active","aria-label":"Starred",children:"\u2605"}):null]}),n("div",{className:"ps-history-snippet",children:i}),l("div",{className:"ps-history-row-meta",children:[n("span",{children:rr(e.createdAt)}),o?n("span",{children:o}):null]})]})}function ta({entries:e,selectedId:t,projectNameById:o,scopeMode:r,hasMore:i,loadingMore:a,onSelect:p,onLoadMore:s}){let d=U(()=>sr(e),[e]);return l("aside",{className:"ps-history-list-pane","aria-label":"Activity history list",children:[d.map(m=>l("div",{children:[n("div",{className:"ps-history-group-header",children:m.label}),m.entries.map(u=>{let g=r==="all"&&u.projectId?o.get(u.projectId)??u.projectId:null;return n(ea,{entry:u,isSelected:t===u.id,projectName:g,onSelect:()=>p(u.id)},u.id)})]},m.label)),i?n("div",{style:{padding:12,textAlign:"center"},children:n("button",{type:"button",className:"ps-btn",disabled:a,onClick:s,children:a?"Loading\u2026":"Load more"})}):null]})}function ur({rpc:e,projectId:t,onLoadIntoStudio:o,onInsertIntoComposer:r,onOpenSettings:i,onStatusNotice:a}){let p=Ge(),s=dr({rpc:e,projectId:t,onStatusNotice:a}),[d,m]=b(!1),[u,g]=b(null),[v,y]=b(!1),[C,k]=b(!1);D(()=>{m(!1),g(null)},[s.selectedEntry?.id]);let P=async(h,z)=>{if(!await Xe(h)){a?.("Failed to copy to clipboard.");return}g(z),setTimeout(()=>g(I=>I===z?null:I),2e3),a?.(z==="raw"?"Raw text copied to clipboard.":"Text copied to clipboard.")},N=async()=>{let h=C;y(!1),k(!1),await s.clearHistory(h)},w=!s.storageAvailable||!!s.error||s.loading||s.entries.length===0,O=s.selectedEntry?.projectId?s.projectNameById.get(s.selectedEntry.projectId)??s.selectedEntry.projectId:null,V=s.effectiveProjectId?t&&s.scopeMode==="project"?"Clear history for this project?":`Clear history for ${s.projectNameById.get(s.effectiveProjectId)??s.effectiveProjectId}?`:"Clear all activity history?";return l("div",{className:"ps-history-shell","data-testid":"ps-history-view",children:[n("style",{children:qs}),s.historyEnabled?null:n(Xs,{onOpenSettings:i}),n(Ks,{search:s.searchInput,onSearchChange:s.setSearchInput,typeFilter:s.typeFilter,onTypeFilterChange:s.setTypeFilter,sourceFilter:s.sourceFilter,onSourceFilterChange:s.setSourceFilter,starredOnly:s.starredOnly,onStarredToggle:()=>s.setStarredOnly(h=>!h),projectId:t,scopeMode:s.scopeMode,onScopeModeChange:s.setScopeMode,selectedProjectFilter:s.selectedProjectFilter,onSelectedProjectFilterChange:s.setSelectedProjectFilter,effectiveProjectId:s.effectiveProjectId,projects:s.projects,total:s.total,onRequestClear:()=>{k(!1),y(!0)}}),v?n(Js,{heading:V,includeStarred:C,clearing:s.clearing,onIncludeStarredChange:k,onCancel:()=>y(!1),onConfirm:()=>void N()}):null,w?n(Qs,{storageAvailable:s.storageAvailable,error:s.error,loading:s.loading,hasActiveFilters:s.hasActiveFilters,onRetry:()=>void s.fetchEntries(),onResetFilters:s.resetFilters}):l("div",{className:"ps-history-split",children:[n(ta,{entries:s.entries,selectedId:s.selectedEntry?.id??null,projectNameById:s.projectNameById,scopeMode:s.scopeMode,hasMore:s.hasMore,loadingMore:s.loadingMore,onSelect:s.setSelectedId,onLoadMore:()=>void s.fetchEntries({offset:s.entries.length,append:!0})}),s.selectedEntry?n(cr,{entry:s.selectedEntry,projectName:O,showDiff:d,onToggleDiff:()=>m(h=>!h),onCopyText:(h,z)=>void P(h,z),onLoadIntoStudio:o,onInsertIntoComposer:r,onToggleStar:h=>void s.toggleStar(h),onDelete:h=>void s.deleteEntry(h),onOpenThread:typeof p?.toThread=="function"?h=>p.toThread(h):void 0,copiedTarget:u}):null]})]})}var Y={FREE_OR_LOCAL:0,NANO:10,FLASH_LITE:12,MINI:20,SPARK:22,FLASH:25,LIGHTWEIGHT:28,OPEN_WEIGHT:32,HAIKU:35,REASONING_MINI:42,NEUTRAL_DEFAULT:50,STANDARD_GPT:60,CODEX:62,PRO:65,SONNET:70,REASONING_FULL:75,FLAGSHIP_PRO:85,OPUS:95},na=[{pattern:/(?:^|[:\s-])free(?=$|[\s)\]])|\bollama\b|\b:local\b/,rank:Y.FREE_OR_LOCAL},{pattern:/\bnano\b/,rank:Y.NANO},{pattern:/\bflash[- ]?lite\b/,rank:Y.FLASH_LITE},{pattern:/\bo[134][- ]mini\b/,rank:Y.REASONING_MINI},{pattern:/\bmini\b/,rank:Y.MINI},{pattern:/\bspark\b/,rank:Y.SPARK},{pattern:/\bflash\b/,rank:Y.FLASH},{pattern:/\b(?:lite|light|micro|tiny|small|instant)\b/,rank:Y.LIGHTWEIGHT},{pattern:/\bhaiku\b/,rank:Y.HAIKU},{pattern:/\bopus\b/,rank:Y.OPUS},{pattern:/\b(?:codex[- ]max|ultra|heavy|max)\b/,rank:Y.FLAGSHIP_PRO},{pattern:/\b(?:gpt|o[134])[a-z0-9.-]*[- ]pro\b/,rank:Y.FLAGSHIP_PRO},{pattern:/\bsonnet\b/,rank:Y.SONNET},{pattern:/\b(?:o1|o3|o4)\b/,rank:Y.REASONING_FULL},{pattern:/\bpro\b/,rank:Y.PRO},{pattern:/\bcodex\b/,rank:Y.CODEX},{pattern:/\bgpt[- ]?\d/,rank:Y.STANDARD_GPT},{pattern:/\bdeepseek[- ]?(?:r1|reasoner)\b/,rank:Y.REASONING_MINI},{pattern:/\b(?:deepseek|llama|qwen|gemma|mistral)\b/,rank:Y.OPEN_WEIGHT}];function mr(e){let o=`${e.id} ${e.label??""}`.toLowerCase().replace(/[_/]+/g," ");for(let r of na)if(r.pattern.test(o))return r.rank;return Y.NEUTRAL_DEFAULT}function oa(e,t){let o=mr(e)-mr(t);return o!==0?o:(e.label||e.id).localeCompare(t.label||t.id,void 0,{sensitivity:"base",numeric:!0})}function Nn(e){return[...e].sort(oa)}var Dn=`
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
`,fr="zcc:prompt-voice:studio-draft:v1";function ra(e){return e?`${fr}:project:${e}`:fr}var mt=[{id:"standard",label:"Standard",desc:"Fix grammar & clarity while keeping your natural tone and length."},{id:"casual",label:"Casual",desc:"Relaxed, everyday phrasing \u2014 natural without sounding stiff."},{id:"conversational",label:"Conversational",desc:"Warm, natural, and easy to read \u2014 like speaking clearly."},{id:"formal",label:"Professional",desc:"Polished, respectful phrasing for emails, PRs, or stakeholders."},{id:"technical",label:"Technical",desc:"Precise, unambiguous engineering phrasing without fluff."}],A={improve:"improve",executive:"executive",spec:"spec",custom:"custom",translate:"translate"},gr=new Set(Object.values(A)),_n=[{id:A.improve,title:"Improve writing",icon:"\u2728",desc:"Fix grammar, phrasing & punctuation without extending length.",tone:"standard"},{id:A.executive,title:"Summarize",icon:"\u26A1",desc:"Condense into punchy bullet points.",instruction:"Summarize the core request into crisp, high-level executive bullet points.",tone:"formal"},{id:A.spec,title:"Create a technical spec",icon:"\u{1F4D0}",desc:"Format with Goals, Context, Steps.",instruction:"Transform into a structured technical spec with ## Goal, ## Architecture, and ## Implementation Steps.",tone:"technical"}];function ia(e,t){switch(e){case A.improve:return t?"Improving...":"Improve text";case A.executive:return t?"Summarizing...":"Summarize";case A.spec:return t?"Creating spec...":"Create spec";case A.custom:return t?"Running...":"Run instructions";case A.translate:return t?"Translating...":"Translate";default:return t?"Transforming...":"Transform text"}}function sa(e,t,o){switch(e){case A.improve:return`\u2B07 Improve writing \xB7 ${t}`;case A.translate:return`\u2B07 Translate \xB7 ${Ke(o)?.label??o}`;case A.custom:return"\u2B07 Custom instructions";default:return`\u2B07 ${_n.find(r=>r.id===e)?.title??"Refine pipeline"}`}}var br={system:"Host STT",openai:"OpenAI","google-gemini":"Google Gemini","local-whisper":"Local Whisper"};function Gt(e){return e==="openai"||e==="google-gemini"}var aa=[{id:"google-gemini",label:"Google Gemini"},{id:"local-whisper",label:"Local Whisper (on this device)"},{id:"openai",label:"OpenAI (Whisper)"},{id:"system",label:"System (Zana Voice)"}],la=[{id:"assistant",displayName:"Zana Assistant",models:[{id:"assistant",key:"assistant",label:"Default Assistant (Host Agent)",providerId:"assistant"}]}],vr=[1500,3e3];function yr({focusWindow:e,bringBack:t}){return oe(),l("div",{className:"ps-container","data-testid":"ps-detached-placeholder",children:[n("style",{children:Dn}),n("div",{className:"ps-empty-state",children:l("div",{className:"ps-empty-card",children:[n("span",{style:{fontSize:22},"aria-hidden":"true",children:"\u{1F399}\uFE0F"}),n("div",{style:{fontSize:14,fontWeight:600},children:"Prompt Studio is open in its own window"}),n("div",{style:{fontSize:12,color:"var(--ps-text-muted)"},children:"Focus the floating window or bring Prompt Studio back to this project tab."}),l("div",{style:{display:"flex",gap:8,marginTop:4},children:[n("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:e,children:"Focus Window"}),n("button",{type:"button",className:"ps-btn",onClick:t,children:"Bring Back"})]})]})})]})}function ca(e){let t=xo();return t||(e&&e.replace(/^\/+/,"").toLowerCase()===Ie?"history":"studio")}function Mn({pluginId:e,projectId:t,subPath:o,headerActions:r,startSession:i=be}){oe();let[a,p]=b(()=>ca(o)),[s,d]=b(!1),[m,u]=b(null),g=Lt(e),v=Ao(),y=$e(),C=Be(),k=Ge(),P=wn(y?.scope,C).threadId,N=Ee(),w=y?.providerId,O=y?.familyId,V=ra(t),h=x(!1),[z,q]=b(null),[I,X]=b(""),[H,ne]=b(""),[De,Wt]=b(null),B=x(null),Z=E(c=>{B.current=c,Wt(c)},[]),[ve,Je]=b(!1),[Qe,ft]=b(!1),[se,Ln]=b(!1),[On,gt]=b(null),[Hn,Vn]=b(!1),[jn,Fn]=b(null),[_e,Un]=b(null),[bt,vt]=b(!0),[zn,Yt]=b(null),[Me,Le]=b("assistant"),[et,Oe]=b("assistant"),[Re,$n]=b(null),[pa,yt]=b(null),[tt,Bn]=b(!0),[Gn,hr]=b(null),[nt,ht]=b(!1),[G,ae]=b(A.improve),[ot,ye]=b("standard"),[rt,it]=b(Ze),[xt,qt]=b(""),[le,Wn]=b(!1),[Yn,R]=b(null),[J,st]=b("system"),[Zt,St]=b(""),[Kt,qn]=b(!0),[Zn,xr]=b(["system"]),[Xt,Ae]=b(null),[ue,Jt]=b(!1),[Sr,Kn]=b(0),[wr,Qt]=b(null),[Xn,Ir]=b(()=>fe()),Jn=x(Xn);Jn.current=Xn;let he=x(null),wt=x(null),He=x(null),Ve=x(null),Qn=x(null);D(()=>{o&&o.replace(/^\/+/,"").toLowerCase()===Ie&&(d(!1),p("history"))},[o]),D(()=>So(c=>{d(!1),p(c)}),[]),D(()=>{try{let c=localStorage.getItem(V);if(c){let f=JSON.parse(c),S=typeof f.inputText=="string"?f.inputText:"",_=typeof f.outputText=="string"?f.outputText:"",T=(S.trim()||_.trim())&&typeof f.historyEntryId=="string"&&f.historyEntryId.trim()?f.historyEntryId.trim():null;X(S),ne(_),Z(T),Le(f.selectedProviderId||"assistant"),Oe(f.selectedModelId||"assistant"),h.current=f.userManuallySelected===!0,st(f.sttProvider||"system"),St(f.sttModel||""),f.selectedPresetId==="polish"?(ae(A.improve),ye("standard")):f.selectedPresetId==="chat"?(ae(A.improve),ye("conversational")):typeof f.selectedPresetId=="string"&&gr.has(f.selectedPresetId)?ae(f.selectedPresetId):ae(A.improve),typeof f.selectedToneId=="string"&&mt.some(M=>M.id===f.selectedToneId)?ye(f.selectedToneId):f.selectedPresetId!=="chat"&&ye("standard"),it(Ke(f.targetLanguage)?.code??Ze)}else X(""),ne(""),Z(null),Le("assistant"),Oe("assistant"),st("system"),St(""),ae(A.improve),ye("standard"),it(Ze),h.current=!1}catch{}q(V)},[V,Z]);let at=x(g);at.current=g;let ie=x(!0),en=x(0),It=x(0),Tt=x(0),Et=x(null),Ct=E(c=>{c&&(c.llmProvider&&(yt(c.llmProvider),Bn(c.llmProvider!=="none")),c.sttProvider&&st(c.sttProvider),typeof c.sttKeyConfigured=="boolean"&&qn(c.sttKeyConfigured),xr(_t(c)))},[]),lt=E(()=>{at.current.call(me).then(c=>{ie.current&&Ct(c)}).catch(()=>{})},[Ct]);D(()=>{let c=!0;return at.current.call(me).then(f=>{c&&Ct(f)}).catch(()=>{}),()=>{c=!1}},[Ct]);let Rt=E(c=>{Ir(f=>f.micDeviceId===c.micDeviceId&&f.micLabel===c.micLabel&&f.soundCuesEnabled===c.soundCuesEnabled&&f.soundCuesVolume===c.soundCuesVolume?f:c)},[]),At=E(()=>{let c=++en.current;at.current.call(Se).then(f=>{if(!ie.current||en.current!==c)return;let S=f||{};typeof S.sttProvider=="string"&&S.sttProvider&&st(S.sttProvider),typeof S.sttModel=="string"&&S.sttModel&&St(S.sttModel),typeof S.llmProvider=="string"&&S.llmProvider&&S.llmProvider!=="none"?$n({providerId:S.llmProvider,modelId:typeof S.llmModel=="string"&&S.llmModel?S.llmModel:void 0}):S.llmProvider==="none"&&$n(null),f&&typeof f=="object"&&Rt(ge(S))}).catch(()=>{})},[Rt]),ct=E(()=>{Et.current&&(clearTimeout(Et.current),Et.current=null)},[]),je=E((c={})=>{let f=c.refresh===!0,S=c.retryAttempt??0;ct();let _=++Tt.current;vt(!0),(f||S===0)&&Yt(null);let T=()=>{if(!ie.current||S>=vr.length)return;let M=vr[S];Et.current=setTimeout(()=>{ie.current&&je({retryAttempt:S+1})},M)};at.current.call(uo,f?{refresh:!0}:void 0).then(M=>{if(!ie.current||Tt.current!==_)return;let F=Array.isArray(M)?M:[];Un(F),vt(!1),!F.some(W=>W.providerId!=="assistant"&&Array.isArray(W.models)&&W.models.length>0)&&!f&&T()}).catch(()=>{!ie.current||Tt.current!==_||(vt(!1),Yt("Could not load Composer models. Using Zana Assistant."),T())})},[ct]);Te(Dt,c=>{!ie.current||!Array.isArray(c)||(Un(c),vt(!1),Yt(null),ct(),lt())}),D(()=>(ie.current=!0,At(),je(),()=>{ie.current=!1,en.current++,It.current++,Tt.current++,ct()}),[ct,je,At]);let eo=U(()=>{let c=new Set(Zn);return c.add("system"),aa.filter(f=>c.has(f.id))},[Zn]),tn=eo.some(c=>c.id===J),Tr=U(()=>(_e??[]).some(c=>c.providerId!=="assistant"&&Array.isArray(c.models)&&c.models.length>0),[_e]),ce=U(()=>{let c=(T,M)=>[...T].sort((F,te)=>M(F).localeCompare(M(te),void 0,{sensitivity:"base",numeric:!0})),f=(_e??[]).filter(T=>Array.isArray(T.models)&&T.models.length>0);if(f.length===0){let T=la.map(M=>{let F=!!(w&&M.id.toLowerCase()===w.toLowerCase()||O&&M.id.toLowerCase().includes(O.toLowerCase())),te=Nn(M.models).map(W=>({...W,isComposerMatch:F}));return{...M,isComposerMatch:F,models:te}});return c(T,M=>M.displayName||M.id)}let S={"assistant:assistant":"assistant"},_=f.map(T=>{let M=!!(w&&T.providerId.toLowerCase()===w.toLowerCase()||O&&T.providerId.toLowerCase().includes(O.toLowerCase())),F=Nn(T.models).map(te=>{let W=`${T.providerId}:${te.id}`,Gr=S[W]??te.id;return{id:te.id,key:Gr,label:te.label||te.id,providerId:T.providerId,isComposerMatch:M}});return{id:T.providerId,displayName:T.displayName||T.providerId,isComposerMatch:M,error:T.error??null,models:F}});return c(_,T=>T.displayName||T.id)},[_e,w,O]),Q=U(()=>ce.find(c=>c.id===Me)??ce[0],[ce,Me]),Pe=U(()=>Q?.models??[],[Q]),ee=U(()=>Pe.find(f=>f.id===et||f.key===et)??Pe[0],[Pe,et]);D(()=>{if(_e===null||h.current||ce.length===0)return;let c=ce.find(f=>f.isComposerMatch&&f.models.length>0)??ce.find(f=>f.isComposerMatch);if(c){Le(c.id),c.models.length>0&&Oe(c.models[0].key||c.models[0].id);return}if(Re&&Re.providerId!=="assistant"){let f=ce.find(S=>S.id===Re.providerId&&S.models.length>0);if(f){Le(f.id);let _=(Re.modelId?f.models.find(T=>T.id===Re.modelId||T.key===Re.modelId):void 0)??f.models[0];_&&Oe(_.key||_.id)}}},[_e,ce,Re]),D(()=>{z===V&&!I.trim()&&!H.trim()&&!ue&&!se&&!le&&B.current!==null&&Z(null)},[z,V,I,H,ue,se,le,Z]),D(()=>{if(z===V)try{localStorage.setItem(V,JSON.stringify({inputText:I,outputText:H,historyEntryId:De,selectedProviderId:Me,selectedModelId:et,userManuallySelected:h.current,sttProvider:J,sttModel:Zt,selectedPresetId:G,selectedToneId:ot,targetLanguage:rt}))}catch{}},[z,V,I,H,De,Me,et,J,Zt,G,ot,rt]);let Er=c=>{Bn(c);let f=c?Q?.id??"assistant":"none",S=c?ee?.id??"assistant":"";yt(f),g.call(we,{llmProvider:f,llmModel:S}).catch(()=>{R("Could not update cleanup setting.")})},nn=c=>{st(c),Ae(null),g.call(we,{sttProvider:c}).then(()=>lt()).catch(()=>{R("Could not update speech provider setting.")})},Cr=c=>{St(c),g.call(we,{sttModel:c}).catch(()=>{})},Rr=c=>{h.current=!0,Le(c);let f=ce.find(_=>_.id===c),S="";if(f&&f.models.length>0){let _=f.models[0].key||f.models[0].id;S=f.models[0].id,Oe(_)}tt&&(yt(c),g.call(we,{llmProvider:c,llmModel:S}).catch(()=>{}))},Ar=c=>{h.current=!0;let f=Me,S=c;for(let _ of ce){let T=_.models.find(M=>M.id===c||M.key===c);if(T){_.id!==Me&&(Le(_.id),f=_.id),Oe(T.key||T.id),S=T.id;break}}tt&&(yt(f),g.call(we,{llmProvider:f,llmModel:S}).catch(()=>{}))};D(()=>()=>{He.current&&clearInterval(He.current),Ve.current&&clearInterval(Ve.current),he.current&&he.current.cancel()},[]);let Pr=U(()=>{let c=I.trim();return`${c?c.split(/\s+/).length:0} words \xB7 ${I.length} chars`},[I]),kr=U(()=>{let c=H.trim();return`${c?c.split(/\s+/).length:0} words \xB7 ${H.length} chars`},[H]),Nr=U(()=>!H||!nt?[]:Bt(I,H),[I,H,nt]),on=()=>{He.current&&(clearInterval(He.current),He.current=null),Ve.current&&(clearInterval(Ve.current),Ve.current=null)},Dr=()=>{on(),He.current=setInterval(()=>Kn(c=>c+1),1e3),Ve.current=setInterval(()=>{he.current&&Qt(he.current.getAudioLevel?.()??null)},100)},to=async c=>{Jt(!1),Qt(null),on();let f=he.current;he.current=null;let S=wt.current;wt.current=null;let _=S!==null?Math.max(0,Date.now()-S):void 0;if(f){Ln(!0);try{let T=await f.stop();if(!ie.current)return;j("stop",c);let M=await We(g,T),F=await g.call(Fe,{audio:M.base64,mimeType:M.mimeType,transcriptionOnly:!0,source:"studio",...t?{projectId:t}:{},...P?{threadId:P}:{},...typeof _=="number"?{audioDurationMs:_}:{},...B.current?{historyEntryId:B.current}:{}});F.ok&&F.status==="ok"?(j("complete",c),typeof F.historyEntryId=="string"&&F.historyEntryId&&Z(F.historyEntryId),X(te=>Ye(te,F.text)),Ae(null)):F.ok&&F.status==="no-speech"?(R("No speech detected. Try speaking closer to the microphone."),setTimeout(()=>R(null),4e3)):F.ok||(j("error",c),R(F.message),Ae(F.message),F.code==="MISSING_KEY"&&(qn(!1),lt()))}catch(T){j("error",c),R(T instanceof Error?T.message:"Transcription failed.")}finally{Ln(!1)}}},_r=async(c,f)=>{if(Ae(null),R(null),Gt(J)&&!Kt){j("error",f);let _=J==="openai"?"OpenAI":"Google Gemini";Ae(`API key required for direct ${_} speech-to-text. Switch to System (Zana Voice) below to dictate using host voice.`),R(`API key required for ${_}. Switch to System (Zana Voice) to dictate thoughts.`);return}let S=++It.current;try{let _=j("start",f);if(_&&(await _,!ie.current||It.current!==S))return;let T=await(c.micDeviceId!==$?i({deviceId:c.micDeviceId}):i());if(!ie.current||It.current!==S){T.cancel();return}T.onError=M=>{he.current=null,wt.current=null,Jt(!1),Qt(null),on(),j("error",f),Ae(M.message),R(M.message)},T.onAutoStop=()=>{R("Recording limit reached. Transcribing captured audio."),to(f)},he.current=T,wt.current=Date.now(),Jt(!0),Kn(0),Dr()}catch(_){j("error",f),R(_ instanceof Error?_.message:"Microphone access denied.")}},rn=E(()=>{d(!1),Rt(fe()),At(),lt(),je()},[je,At,lt,Rt]),Mr=async()=>{let c=Jn.current,f={enabled:c.soundCuesEnabled,volume:c.soundCuesVolume};ue?await to(f):await _r(c,f)},Lr=async()=>{let c=I.trim();if(!c||le||!ee||G===A.custom&&!xt.trim())return;let f=_n.find(W=>W.id===G),S=G===A.custom,_=G===A.improve,T=G===A.translate,M=T?"standard":S?"custom":_?ot:f?.tone||"technical",F=Q?.id??"assistant",te=ee?.id??"assistant";R(null),Wn(!0);try{let W=await g.call(po,{text:c,tone:M,...T?{targetLanguage:rt}:{},...S?{customPrompt:xt.trim()}:{},...!S&&!T&&f?.instruction?{instruction:f.instruction}:{},llmProvider:F,llmModel:te,source:"studio",presetId:G,...t?{projectId:t}:{},...P?{threadId:P}:{},...B.current?{historyEntryId:B.current}:{}});W.ok?(typeof W.historyEntryId=="string"&&W.historyEntryId&&Z(W.historyEntryId),ne(W.text),hr(`${Q?.displayName||F}: ${W.llmModel||te}`)):R(W.message)}catch(W){R(W instanceof Error?W.message:"Refinement request failed.")}finally{Wn(!1)}},Or=async()=>{try{let c=await navigator.clipboard.readText();if(!c||!c.trim()){R("Clipboard is empty."),setTimeout(()=>R(null),2500);return}X(f=>Ye(f,c)),R("Pasted from clipboard into input draft!"),setTimeout(()=>R(null),2500)}catch{R("Clipboard access denied or unavailable."),setTimeout(()=>R(null),2500)}},Hr=async()=>{if(!I)return;await Xe(I)?(ft(!0),setTimeout(()=>ft(!1),2e3),R("Input draft copied to clipboard!"),setTimeout(()=>R(null),2500)):(R("Failed to copy to clipboard."),setTimeout(()=>R(null),3e3))},Vr=async()=>{if(!H)return;await Xe(H)?(Je(!0),setTimeout(()=>Je(!1),2e3),R("Refined output copied to clipboard!"),setTimeout(()=>R(null),2500)):(R("Failed to copy to clipboard."),setTimeout(()=>R(null),3e3))},jr=()=>{!I&&!H||(Z(null),X(""),ne(""),ae(A.improve),ye("standard"),it(Ze),qt(""),ht(!1),R("Studio canvas cleared."),setTimeout(()=>R(null),2500))},Fr=()=>{H&&(X(H),ne(""),ht(!1),R("Refined output moved to input draft."),setTimeout(()=>R(null),2500))},no=E(c=>{if(c){if(v&&typeof v.updateText=="function")try{v.updateText(f=>Ye(f,c)),v.focus?.(),gt("Inserted into Composer!"),R("Inserted into Composer!"),setTimeout(()=>gt(null),2500),setTimeout(()=>R(null),2500);return}catch{}if(k&&typeof k.toCompose=="function"){k.toCompose({initialPrompt:c,focusPrompt:!0}),gt("Opened in New Thread Composer!"),R("Opened in New Thread Composer!"),setTimeout(()=>gt(null),2500),setTimeout(()=>R(null),2500);return}Xe(c).then(f=>{R(f?"No active composer \u2014 copied prompt to clipboard.":"Composer focus unavailable.")})}},[v,k]),Ur=()=>{no(H||I)},sn=E(c=>{if(Z(null),X(c.rawText),ne(c.kind==="refinement"||c.outputText!==c.rawText?c.outputText:""),c.kind==="refinement"||c.presetId||c.targetLanguage||c.customPrompt){let f=c.presetId&&gr.has(c.presetId)?c.presetId:c.targetLanguage?A.translate:c.tone==="custom"?A.custom:A.improve;ae(f),c.tone&&mt.some(S=>S.id===c.tone)&&ye(c.tone),c.targetLanguage&&it(Ke(c.targetLanguage)?.code??Ze),qt(c.customPrompt??"")}ht(!1),u(null),d(!1),p("studio"),R("Loaded entry into Studio."),setTimeout(()=>R(null),2500)},[Z]),zr=E(c=>{if(I.trim()||H.trim()){u(c);return}sn(c)},[sn,I,H]),$r=async()=>{if(e){Vn(!0),Fn(null);try{await Ot(e,{showInProjects:!0})}catch(c){Fn(c instanceof Error?c.message:"Could not update plugin settings.")}finally{Vn(!1)}}},Br=E(c=>{(c.ctrlKey||c.metaKey)&&c.key.toLowerCase()==="k"&&(c.preventDefault(),d(!1),p("studio"),ae(A.custom),setTimeout(()=>Qn.current?.focus(),0))},[]);if(t&&!N.showInProjects)return l("div",{className:"ps-container",children:[n("style",{children:Dn}),l("header",{className:"ps-header",children:[l("div",{className:"ps-header-left",children:[n("span",{style:{fontSize:18},children:"\u{1F399}\uFE0F"}),n("span",{className:"ps-header-title",children:"Prompt Studio"}),n("span",{className:"ps-badge ps-badge-project",children:"Project"})]}),r?n("div",{className:"ps-header-actions",children:r}):null]}),n("div",{className:"ps-empty-state","data-testid":"ps-project-hidden-notice",children:l("div",{className:"ps-empty-card",children:[n("span",{style:{fontSize:22},"aria-hidden":"true",children:"\u{1F507}"}),n("div",{style:{fontSize:14,fontWeight:600},children:"Prompt Studio is hidden in projects"}),n("div",{style:{fontSize:12,color:"var(--ps-text-muted)",lineHeight:1.45},children:"You disabled the project tab in Prompt Voice plugin settings. Re-enable it anytime to use project-scoped drafts here."}),jn?n("div",{role:"alert",style:{fontSize:11,color:"#fca5a5"},children:jn}):null,e?n("button",{type:"button",className:"ps-btn ps-btn-primary",disabled:Hn,onClick:()=>void $r(),children:Hn?"Enabling\u2026":"Enable Prompt Studio in Projects"}):null]})})]});let oo=mt.find(c=>c.id===ot)??mt[0],ro=c=>{u(null),s&&rn(),p(c)};return l("div",{className:"ps-container",onKeyDown:Br,children:[n("style",{children:Dn}),l("header",{className:"ps-header",children:[l("div",{className:"ps-header-left",children:[n("span",{style:{fontSize:18},children:"\u{1F399}\uFE0F"}),n("span",{className:"ps-header-title",children:"Prompt Studio"}),n("span",{className:"ps-badge",children:"Voice & AI Refinement"}),t?n("span",{className:"ps-badge ps-badge-project",children:"Project"}):null]}),l("div",{className:"ps-header-actions",children:[l("nav",{className:"ps-header-nav",role:"tablist","aria-label":"Prompt Studio views",children:[n("button",{type:"button",role:"tab","aria-selected":!s&&a==="studio",className:`ps-header-tab ${!s&&a==="studio"?"active":""}`,onClick:()=>ro("studio"),children:"Studio"}),n("button",{type:"button",role:"tab","aria-selected":!s&&a==="history",className:`ps-header-tab ${!s&&a==="history"?"active":""}`,onClick:()=>ro("history"),children:"History"})]}),n("button",{type:"button",className:`ps-btn ${s?"ps-btn-primary":""}`,"aria-pressed":s,onClick:()=>{u(null),s?rn():d(!0)},children:"Settings"}),r]})]}),m?l("div",{className:"ps-overwrite-banner",role:"alertdialog","aria-label":"Confirm overwrite studio draft",children:[n("span",{children:"Replace your current Studio draft with this history entry?"}),l("div",{style:{display:"flex",gap:6},children:[n("button",{type:"button",className:"ps-btn",onClick:()=>u(null),children:"Cancel"}),n("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:()=>sn(m),children:"Replace Draft"})]})]}):null,s?n(nr,{rpc:g,pluginId:e,onBack:rn}):a==="history"?n(ur,{rpc:g,projectId:t,onLoadIntoStudio:zr,onInsertIntoComposer:no,onOpenSettings:()=>d(!0),onStatusNotice:c=>{R(c),setTimeout(()=>R(f=>f===c?null:f),2500)}}):l("div",{className:"ps-workspace",children:[l("aside",{className:"ps-sidebar",children:[l("section",{className:"ps-section",children:[l("div",{className:"ps-section-title",children:[n("span",{children:"Voice Dictation"}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:br[J]??J})]}),l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-stt-provider-select",className:"ps-field-label",children:"Speech Provider"}),l("select",{id:"ps-stt-provider-select",className:"ps-select","aria-label":"Speech-to-text provider",value:tn?J:"",onChange:c=>{Ae(null),nn(c.target.value)},disabled:ue||se,children:[!tn&&n("option",{value:"",disabled:!0,hidden:!0,children:`${br[J]??J} (Not configured)`}),eo.map(c=>n("option",{value:c.id,children:c.label},c.id))]})]}),Gt(J)&&tn&&l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-stt-model-input",className:"ps-field-label",children:"Speech Model (Optional)"}),n("input",{id:"ps-stt-model-input",className:"ps-select","aria-label":"Speech-to-text model",placeholder:"Provider default",value:Zt,onChange:c=>Cr(c.target.value),disabled:ue||se})]}),Xt&&l("div",{role:"alert",style:{padding:"8px 10px",borderRadius:6,background:"rgba(239, 68, 68, 0.12)",border:"1px solid rgba(239, 68, 68, 0.35)",color:"#fca5a5",fontSize:11,textAlign:"left",lineHeight:1.4,display:"flex",flexDirection:"column",gap:6},children:[l("div",{children:["\u26A0\uFE0F ",Xt]}),Gt(J)&&n("button",{type:"button",className:"ps-btn ps-btn-primary",style:{alignSelf:"flex-start",fontSize:11,padding:"4px 8px"},onClick:()=>nn("system"),children:"Switch to System (Zana Voice)"})]}),Gt(J)&&!Kt&&!Xt&&l("div",{style:{padding:"8px 10px",borderRadius:6,background:"rgba(234, 179, 8, 0.1)",border:"1px solid rgba(234, 179, 8, 0.3)",color:"#fde047",fontSize:11,textAlign:"left",lineHeight:1.4,display:"flex",flexDirection:"column",gap:6},children:[l("div",{children:["\u2139\uFE0F ",n("strong",{children:"API key required:"})," Direct ",J==="openai"?"OpenAI Whisper":"Google Gemini"," speech-to-text requires an API key in Zana Settings."]}),n("button",{type:"button",className:"ps-btn ps-btn-primary",style:{alignSelf:"flex-start",fontSize:11,padding:"4px 8px"},onClick:()=>nn("system"),children:"Switch to System (Zana Voice)"})]}),l("div",{className:"ps-dictation-card",children:[l("button",{type:"button",className:`ps-btn ${ue?"ps-btn-danger":se?"":"ps-btn-primary"}`,style:{width:"100%",justifyContent:"center",padding:"10px 0",opacity:se?.8:1},onClick:Mr,disabled:se,"aria-label":se?"Transcribing audio":ue?"Stop dictation":"Start dictation",children:[n("span",{className:se?"ps-spin":void 0,children:se?"\u23F3":ue?"\u23F9\uFE0F":"\u{1F399}\uFE0F"}),n("span",{children:se?"Transcribing...":ue?`Stop Dictation (${Sr}s)`:"Dictate Thoughts"})]}),ue&&l("div",{style:{width:"100%",display:"flex",flexDirection:"column",gap:4},children:[n("div",{className:"ps-meter-bar",children:n("div",{className:"ps-meter-fill",style:{width:`${Math.min(100,(wr??.1)*100)}%`}})}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:"Listening live..."})]})]}),n("div",{style:{fontSize:10,color:"var(--ps-text-subtle)",lineHeight:1.3},children:J==="system"?"Uses host Zana voice transcription without requiring external API keys.":J==="local-whisper"?"Transcribes on this device. Install the runtime and a model in Settings.":Kt?`Using direct ${J==="openai"?"OpenAI Whisper":"Google Gemini"} speech-to-text.`:`\u26A0\uFE0F ${J==="openai"?"OpenAI":"Google Gemini"} requires an API key in Zana Settings. Choose System (Zana Voice) for built-in free dictation.`})]}),l("section",{className:"ps-section",children:[l("div",{className:"ps-section-title",children:[n("span",{children:"Refinement Engine"}),l("span",{style:{display:"inline-flex",alignItems:"center",gap:6},children:[n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:bt&&!Tr?"Loading\u2026":bt?"Refreshing\u2026":Q?.isComposerMatch?"\u2605 Composer Active":"AI Model"}),n("button",{type:"button",className:"ps-btn",style:{padding:"2px 6px",fontSize:10},onClick:()=>je({refresh:!0}),disabled:bt||le,"aria-label":"Refresh models",title:"Reload models from Composer",children:bt?"\u2026":"\u21BB"})]})]}),l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-provider-select",className:"ps-field-label",children:"Provider"}),n("select",{id:"ps-provider-select",className:"ps-select","aria-label":"Refinement provider",value:Q?.id??"",onChange:c=>Rr(c.target.value),disabled:le,children:ce.map(c=>l("option",{value:c.id,children:[c.displayName,c.isComposerMatch?" \u2605 (Composer)":""]},c.id))})]}),l("div",{className:"ps-field-group",children:[l("label",{htmlFor:"ps-model-select",className:"ps-field-label",children:["Model (",Pe.length,")"]}),n("select",{id:"ps-model-select",className:"ps-select","aria-label":"Refinement model",value:ee?.key||ee?.id||"",onChange:c=>Ar(c.target.value),disabled:le||Pe.length===0,children:Pe.length===0?n("option",{value:"",children:"No models available"}):Pe.map(c=>l("option",{value:c.key||c.id,children:[c.label,c.isComposerMatch?" \u2605 (Composer)":""]},c.key||c.id))})]}),(Q?.error||zn)&&n("div",{role:"status",style:{fontSize:10.5,color:"#fde047",lineHeight:1.35,padding:"6px 8px",borderRadius:6,background:"rgba(234, 179, 8, 0.1)",border:"1px solid rgba(234, 179, 8, 0.25)"},children:Q?.error||zn}),l("div",{style:{marginTop:8,paddingTop:8,borderTop:"1px solid var(--ps-border)",display:"flex",flexDirection:"column",gap:4},children:[l("label",{style:{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:11,fontWeight:500,userSelect:"none"},children:[n("input",{type:"checkbox","aria-label":"Auto-cleanup mic dictations",checked:tt,onChange:c=>Er(c.target.checked)}),n("span",{children:"Auto-cleanup mic dictations"})]}),n("span",{style:{fontSize:10,color:"var(--ps-text-subtle)",lineHeight:1.3},children:tt?`Composer mic cleans up using ${Q?.displayName}${ee?` (${ee.label||ee.id})`:""}.`:"Composer mic inserts raw transcript without AI cleanup."})]}),l("div",{style:{marginTop:4,fontSize:11,color:"var(--ps-text-muted)",lineHeight:1.35},children:[Q?.isComposerMatch?l("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:600},children:["\u2605 Synced to Composer: ",Q.displayName,ee?` (${ee.label})`:""]}):Q?.id==="assistant"?"Uses the active Zana assistant agent with no extra API key required.":ee?l(K,{children:["Using ",n("strong",{children:Q?.displayName})," \xB7 ",n("code",{children:ee.id})]}):null,Gn?l("div",{style:{marginTop:3,color:"var(--ps-text-subtle)",fontSize:10},children:["Last refined: ",Gn]}):null]})]}),l("section",{className:"ps-section",children:[n("div",{className:"ps-section-title",children:"How should we improve it?"}),l("div",{className:"ps-presets-list",role:"radiogroup","aria-label":"How should we improve it?",children:[_n.map(c=>l("div",{style:{display:"flex",flexDirection:"column",gap:6},children:[l("label",{className:`ps-preset-btn ${G===c.id?"active":""}`,children:[l("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:c.id,checked:G===c.id,onChange:()=>ae(c.id)}),c.title]}),n("span",{className:"preset-desc",children:c.desc})]}),c.id===A.improve&&G===A.improve&&l("div",{className:"ps-tone-panel",children:[l("div",{className:"ps-tone-header",children:[n("label",{htmlFor:"ps-improve-tone-select",children:n("strong",{style:{color:"var(--text-primary, #e2e8f0)"},children:"Tone"})}),n("span",{style:{color:"var(--ps-text-subtle)"},children:"Same length"})]}),n("select",{id:"ps-improve-tone-select",className:"ps-select","aria-label":"Improvement tone",value:ot,onChange:f=>ye(f.target.value),disabled:le,children:mt.map(f=>n("option",{value:f.id,children:f.label},f.id))}),n("div",{className:"ps-tone-hint",children:oo.desc})]})]},c.id)),l("label",{className:`ps-preset-btn ${G===A.custom?"active":""}`,children:[l("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:A.custom,checked:G===A.custom,onChange:()=>ae(A.custom)}),"Custom instructions"]}),n("span",{className:"preset-desc",children:"Describe your own transformation."})]}),G===A.custom&&n("textarea",{ref:Qn,className:"ps-custom-prompt-input","aria-label":"Custom instructions",placeholder:"e.g. Turn into user stories with acceptance criteria...",value:xt,onChange:c=>qt(c.target.value)}),l("div",{style:{display:"flex",flexDirection:"column",gap:6},children:[l("label",{className:`ps-preset-btn ${G===A.translate?"active":""}`,children:[l("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:A.translate,checked:G===A.translate,onChange:()=>ae(A.translate)}),"Translate"]}),n("span",{className:"preset-desc",children:"Translate into another language while keeping meaning."})]}),G===A.translate&&l("div",{className:"ps-tone-panel",children:[l("div",{className:"ps-tone-header",children:[n("label",{htmlFor:"ps-translate-lang-select",children:n("strong",{style:{color:"var(--text-primary, #e2e8f0)"},children:"Target language"})}),n("span",{style:{color:"var(--ps-text-subtle)"},children:"Same meaning"})]}),n("select",{id:"ps-translate-lang-select",className:"ps-select","aria-label":"Target language",value:rt,onChange:c=>it(c.target.value),disabled:le,children:Rn.map(c=>n("option",{value:c.code,children:c.label},c.code))})]})]})]})]})]}),l("main",{className:"ps-editor-canvas",children:[l("section",{className:"ps-pane",children:[l("div",{className:"ps-pane-header",children:[l("div",{className:"ps-pane-title",children:[n("span",{children:"\u{1F4DD}"}),n("span",{children:"Raw Input Draft"})]}),l("div",{style:{display:"flex",gap:6},children:[n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Or,title:"Paste from clipboard into input draft","aria-label":"Paste into input draft",children:"\u{1F4CB} Paste"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Hr,disabled:!I,title:"Copy raw input","aria-label":"Copy raw input",children:Qe?"\u2705 Copied":"\u{1F4CB} Copy"})]})]}),n("textarea",{className:"ps-textarea",placeholder:"Type your raw thoughts or click Dictate in the left sidebar to speak...",value:I,onChange:c=>X(c.target.value),"aria-label":"Raw Input Text"})]}),l("div",{className:"ps-action-bar",children:[l("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12},children:[n("span",{className:"ps-pill",children:sa(G,oo.label,rt)}),n("span",{style:{color:"var(--ps-text-muted)"},children:I.trim()?`${I.trim().split(/\s+/).length} words ready`:"Add text to get started"})]}),n("div",{style:{display:"flex",alignItems:"center",gap:6},children:l("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:()=>Lr(),disabled:le||!I.trim()||!ee||G===A.custom&&!xt.trim(),title:G===A.translate?"Translate raw draft into the selected language":"Transform raw draft into output",children:[n("span",{children:le?"\u23F3":"\u26A1"}),n("span",{children:ia(G,le)})]})})]}),l("section",{className:"ps-pane",children:[l("div",{className:"ps-pane-header",children:[l("div",{className:"ps-pane-title",children:[n("span",{children:"\u2728"}),n("span",{children:"Result"})]}),l("div",{style:{display:"flex",gap:6},children:[H&&l("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>ht(c=>!c),title:"Toggle inline diff against input draft",children:[n("span",{children:nt?"\u{1F441}\uFE0F":"\u{1F50D}"}),n("span",{children:nt?"View Clean":"View Diff"})]}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Fr,disabled:!H,title:"Move output to input draft for iterative re-refinement",children:"\u2B06 Replace Input"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Vr,disabled:!H,title:"Copy refined text to clipboard","aria-label":"Copy refined output",children:ve?"\u2705 Copied":"\u{1F4CB} Copy"})]})]}),nt&&H?n("div",{className:"ps-output-view",children:Nr.map((c,f)=>c.type==="added"?n("span",{className:"ps-diff-added",children:c.text},f):c.type==="removed"?n("span",{className:"ps-diff-removed",children:c.text},f):n("span",{className:"ps-diff-unchanged",children:c.text},f))}):n("textarea",{className:"ps-textarea",placeholder:"Your improved, structured, or translated text will appear here...",value:H,onChange:c=>ne(c.target.value),"aria-label":"Refined output"})]}),l("div",{className:"ps-action-bar",children:[n("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12},children:On?n("span",{className:"ps-badge",style:{background:"rgba(34, 197, 94, 0.2)",color:"#86efac"},children:On}):n("span",{style:{color:"var(--ps-text-muted)"},children:H?"Ready to insert refined result into Composer":I?"Ready to insert raw draft into Composer":"Draft or refine a prompt to insert into Composer"})}),l("div",{style:{display:"flex",alignItems:"center",gap:8},children:[l("button",{type:"button",className:"ps-btn",onClick:jr,title:"Clear current input and output",disabled:!I&&!H,children:[n("span",{children:"\u{1F5D1}\uFE0F"}),n("span",{children:"Clear"})]}),l("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:Ur,disabled:!I&&!H,title:"Append current text directly into Zana Composer",children:[n("span",{children:"\u{1F4AC}"}),n("span",{children:"Insert into Composer"})]})]})]})]})]}),l("footer",{className:"ps-status-bar",children:[l("div",{style:{display:"flex",gap:12},children:[l("span",{children:["Input: ",Pr]}),l("span",{children:["Output: ",kr]}),Yn&&n("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:500},children:Yn})]}),l("div",{style:{display:"flex",gap:12,alignItems:"center"},children:[l("span",{children:["Engine: ",Q?.displayName," \xB7 ",ee?.label??"No model"]}),l("span",{className:"ps-pill",children:["Mic cleanup: ",tt?`${Q?.displayName}${ee?` (${ee.label||ee.id})`:""}`:"Off (Raw)"]}),Q?.isComposerMatch&&n("span",{className:"ps-pill",style:{color:"var(--accent, #3b82f6)"},children:"\u2605 Composer Synced"}),n("span",{children:"Zana Prompt Studio"})]})]})]})}var gp=ao(e=>{oe(),e.composer.customize({id:"prompt-voice-mic",actions:[{id:"prompt-voice-mic",component:Vo}]}),e.slots.navPanel?.({id:de,title:"Prompt Studio",icon:"Sparkles",path:de,component:Mn}),e.slots.projectTab?.({id:Ne,label:"Prompt Studio",icon:"Sparkles",order:50,global:!1,header:"custom",detachable:!0,component:Mn,detachedPlaceholder:yr}),e.slots.homepageSection?.({id:"prompt-voice-home",title:"Prompt Voice",component:_o}),e.slots.settingsSection?.({id:"prompt-voice-visibility",title:"Where Prompt Voice Appears",description:"Choose whether Prompt Voice appears on the main Home screen, inside projects, and in composers.",component:jt}),e.slots.commandPaletteAction?.({id:"open-prompt-studio",title:"Prompt Studio: Open Canvas",isAvailable:()=>!0,run:t=>{if(Ue("studio"),typeof t.toPluginPanel=="function"){t.toPluginPanel(de);return}t.navigate?.(`/${de}`)}}),e.slots.commandPaletteAction?.({id:"open-prompt-studio-history",title:"Prompt Studio: Open History",isAvailable:()=>!0,run:t=>{if(Ue("history"),typeof t.toPluginPanel=="function"){t.toPluginPanel(de,{subPath:Ie});return}t.navigate?.(`/${de}/${Ie}`)}}),e.slots.commandPaletteAction?.({id:"open-prompt-studio-project",title:"Prompt Studio: Open in This Project",isAvailable:t=>!!t.projectId,run:t=>{t.projectId&&typeof t.toProject=="function"&&t.toProject(t.projectId,{tabId:Ne})}})});export{de as PROMPT_STUDIO_PANEL_PATH,Ne as PROMPT_STUDIO_PROJECT_TAB_ID,gp as default};
//# sourceMappingURL=app.js.map
