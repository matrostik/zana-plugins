function ct(){return globalThis.__ZCC_PLUGIN_RUNTIME__??{}}function lt(t){throw new Error(`${t} is not available until the host plugin runtime is installed`)}function dt(t){return{__zccPluginApp:!0,setup:t}}function Z(){return ct().useRpc?.()??lt("useRpc")}function K(){return ct().useComposer?.()??lt("useComposer")}var Ht=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4"];var C=class extends Error{code;constructor(e,o){super(o),this.name="RecordingError",this.code=e}};function Vt(t){return Ht.find(e=>t(e))??null}var Gt="audio/webm";function qt(){return{getUserMedia:t=>navigator.mediaDevices.getUserMedia(t),createRecorder:(t,e)=>new MediaRecorder(t,e?{mimeType:e}:void 0),isTypeSupported:t=>typeof MediaRecorder<"u"&&MediaRecorder.isTypeSupported(t)}}async function Zt(t){try{return await t.getUserMedia({audio:!0})}catch(e){let o=e instanceof Error?e.name:"";throw o==="NotAllowedError"||o==="SecurityError"?new C("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again."):new C("MIC_UNAVAILABLE","No microphone is available. Connect one and try again.")}}function Kt(t){return new Promise((e,o)=>{let i=new FileReader;i.onload=()=>{let c=typeof i.result=="string"?i.result:"";e(c.slice(c.indexOf(",")+1))},i.onerror=()=>o(new C("RECORDING_FAILED","The recording could not be read.")),i.readAsDataURL(t)})}async function Yt(t,e){let o=new Blob(t,{type:e});return{base64:await Kt(o),mimeType:o.type||e}}function Wt(t,e){if(!(t>0&&Number.isFinite(t)))return()=>{};let o=setTimeout(e,t);return()=>clearTimeout(o)}var Xt="That recording is too large to transcribe. Keep dictation shorter and try again.";function Jt(t,e){let o=Math.max(e,t),i=[],c=0,a=!1;return{chunks:i,get overflowed(){return a},add(l){return l.size===0||a?"ignored":c+l.size>o?(a=!0,"overflow"):(i.push(l),c+=l.size,c>=t?"limit-reached":"accepted")}}}function Qt(t,e){let o=new Promise((i,c)=>{t.onstop=()=>i(),t.onerror=()=>{let a=new C("RECORDING_FAILED","Recording stopped unexpectedly. Try again.");e(a),c(a)}});return o.catch(()=>{}),o}function te(t,e,o,i){let c=Qt(t,i);return t.ondataavailable=a=>{let l=e.add(a.data);(l==="limit-reached"||l==="overflow")&&o()},t.start(1e3),c}async function ee(t,e,o,i){try{await t}finally{e()}if(o.overflowed)throw new C("RECORDING_FAILED",Xt);return Yt(o.chunks,i)}function ne(t){let e=()=>{};return{stopRecorder(){e(),t.state!=="inactive"&&t.stop()},armTimer(o,i){e=Wt(o,i)}}}function oe(t,e){let o=null;return{attach(i){o=i},detach(){o=null},autoStop(){t();let i=o?.onAutoStop;o&&(o.onAutoStop=void 0),i?.()},fail(i){t(),e();let c=o?.onError;o=null,c?.(i)}}}function re(t,e,o,i){let c=Jt(i.maxBytes??9437184,i.hardMaxBytes??10485760),{stopRecorder:a,armTimer:l}=ne(t),r=oe(a,e);l(i.maxDurationMs??12e4,r.autoStop);let b=te(t,c,r.autoStop,r.fail),m={onError:i.onError,onAutoStop:i.onAutoStop,async stop(){a();try{return await ee(b,e,c,t.mimeType||o)}finally{r.detach()}},cancel(){a(),e(),r.detach()}};return r.attach(m),m}var $=()=>ie();async function ie(t=qt(),e={}){let o=await Zt(t),i=ae(o),c=o.getTracks(),a,l=()=>{for(let r of c)a&&r.removeEventListener?.("ended",a);i?.close(),c.forEach(r=>r.stop())};try{let r=Vt(t.isTypeSupported)??Gt,b=t.createRecorder(o,r),m=re(b,l,r,e);return m.getAudioLevel=()=>i?.level()??null,a=()=>{let f=m.onError;m.cancel(),f?.(new C("MIC_UNAVAILABLE","Microphone disconnected. Check your device and try again."))},c.forEach(f=>f.addEventListener?.("ended",a)),m}catch(r){throw l(),r instanceof C?r:new C("RECORDING_FAILED",r instanceof Error?r.message:"The recording could not be started.")}}function ae(t){let e;try{e=new AudioContext;let o=e.createMediaStreamSource(t),i=e.createAnalyser();i.fftSize=256,o.connect(i);let c=new Uint8Array(i.fftSize),a=e,l=!1;return{level(){if(a.state&&a.state!=="running")return null;i.getByteTimeDomainData(c);let r=c.reduce((b,m)=>b+((m-128)/128)**2,0)/c.length;return Math.min(1,Math.sqrt(r)*5)},close(){l||(l=!0,o.disconnect(),a.close().catch(r=>console.error("Prompt Voice audio meter cleanup failed",r)))}}}catch(o){return e&&e.close().catch(i=>console.error("Prompt Voice audio meter cleanup failed",i)),console.warn("Prompt Voice audio meter unavailable",o),null}}var u=globalThis.__ZCC_HOST_REACT__;var Se=u.Children,Re=u.Component,Ee=u.Fragment,ke=u.StrictMode,Te=u.Suspense,Ae=u.cloneElement,Ce=u.createContext,Ne=u.createElement,Ie=u.createRef,Pe=u.forwardRef,_e=u.isValidElement,De=u.lazy,Le=u.memo,Oe=u.startTransition,E=u.useCallback,Me=u.useContext,ze=u.useDebugValue,$e=u.useDeferredValue,_=u.useEffect,Be=u.useId,Fe=u.useImperativeHandle,je=u.useInsertionEffect,Ue=u.useLayoutEffect,V=u.useMemo,mt=u.useReducer,N=u.useRef,v=u.useState,He=u.useSyncExternalStore,Ve=u.useTransition,Ge=u.version;var Y="promptVoice.transcribe",ut="promptVoice.status",ft="promptVoice.rephrase";function G(t,e){let o=e.trim();return o?t?/\s$/.test(t)?`${t}${o}`:`${t} ${o}`:o:t}var se="No speech detected.",Q={phase:"idle",notice:null,error:null};function bt(t,e){switch(e.type){case"START":return t.phase==="idle"||t.phase==="error"?{phase:"starting",notice:null,error:null}:t;case"STARTED":return t.phase==="starting"?{...t,phase:"recording"}:t;case"STOP":return t.phase==="recording"||t.phase==="starting"?{phase:"processing",notice:null,error:null}:t;case"CANCEL":return t.phase==="recording"||t.phase==="starting"?{...Q}:t;case"SUCCESS":case"NO_SPEECH":return t.phase!=="processing"?t:{phase:"idle",notice:e.type==="NO_SPEECH"?se:e.notice,error:null};case"CLEAR_NOTICE":return t.notice?{...t,notice:null}:t;case"FAILURE":return{phase:"error",notice:null,error:e.message}}}var pe="Prompt Voice returned an unexpected response. Try again.",ce="Dictation failed. Try again.",le=4e3;function de(t){return typeof t=="object"&&t!==null&&typeof t.ok=="boolean"}async function me(t,e){let o=await t.call(Y,{audio:e.base64,mimeType:e.mimeType});if(!de(o))throw new Error(pe);return o}function gt(t){return t instanceof Error&&t.message?t.message:ce}function ue(t,e,o){if(!t.ok){o({type:"FAILURE",message:t.message});return}if(t.status==="no-speech"){o({type:"NO_SPEECH"});return}e.updateText(c=>G(c,t.text)),e.focus();let i=t.refineNotice?`Inserted the raw transcript. ${t.refineNotice.message}`:"Added to draft.";o({type:"SUCCESS",notice:i})}function fe(t,e,o,i){return e()?(t.onError=c=>{e()&&i(c)},t.onAutoStop=()=>{e()&&o()},t):(t.cancel(),null)}function be(t,e,o,i,c){let a=l=>c({type:"FAILURE",message:gt(l)});return t.then(l=>{let r=fe(l,o,i,b=>{e.current=null,a(b)});return r&&(e.current=r),r},l=>(o()&&a(l),null))}function ge(t,e){let o=N(null),i=N(null),c=N(0),a=N(!0),l=E(()=>{c.current++,i.current=null,o.current&&(o.current.cancel(),o.current=null),e({type:"CANCEL"})},[e]);_(()=>(a.current=!0,()=>{a.current=!1,l()}),[l]);let r=E(async()=>{let h=i.current?await i.current:o.current;return o.current=null,h},[]),b=E(async h=>{let g=++c.current,x=()=>a.current&&c.current===g,y=be(t(),o,x,h,e);i.current=y,await y&&x()&&e({type:"STARTED"}),i.current===y&&(i.current=null)},[e,t]),m=E(()=>a.current,[]),f=E(()=>o.current?.getAudioLevel?.()??null,[]);return{start:b,takeSession:r,cancel:l,isMounted:m,getAudioLevel:f}}function ht({startSession:t=$,noticeDurationMs:e=le}={}){let o=K(),i=Z(),[c,a]=mt(bt,Q),{start:l,takeSession:r,cancel:b,isMounted:m,getAudioLevel:f}=ge(t,a),[h,g]=v(null),[x,y]=v(0),[B,S]=v(!1);_(()=>{if(c.phase!=="recording"){g(null),y(0);return}let T=Date.now(),D=()=>{g(f()),y(Math.floor((Date.now()-T)/1e3))};D();let O=setInterval(D,100);return()=>clearInterval(O)},[f,c.phase]),_(()=>{if(!c.notice)return;let T=setTimeout(()=>{a({type:"CLEAR_NOTICE"})},e);return()=>clearTimeout(T)},[e,c.notice]);let z=E(()=>{a({type:"CLEAR_NOTICE"})},[]),k=E(async()=>{a({type:"STOP"});let T=await r();if(!(!m()||!T))try{let D=await T.stop();if(!m())return;let O=await me(i,D);if(!m())return;ue(O,o,a)}catch(D){if(!m())return;a({type:"FAILURE",message:gt(D)})}},[o,m,i,r]),I=E(async()=>{S(!1),a({type:"START"}),await l(()=>{S(!0),k()})},[k,l]),q=E(()=>{c.phase==="recording"||c.phase==="starting"?k():c.phase!=="processing"&&I()},[I,k,c.phase]);return{phase:c.phase,error:c.error,notice:c.notice,level:h,seconds:x,autoStopped:B,onClick:q,cancel:b,clearNotice:z,beginDictation:I,finishDictation:k}}var tt=`/* Base Container */
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

\`

\`
/* ==========================================================================\\n   Prompt Studio - Zana Native Vertical Stack (Input Top, Output Bottom)\\n   ========================================================================== */

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
\`
`;var vt=globalThis.__ZCC_HOST_REACT__,W=vt.Fragment;function n(t,e,o){return vt.createElement(t,o===void 0?e:{...e,key:o})}var p=n;var ve="Dictation",xt="zcc-ext-prompt-voice-styles";function et(){if(typeof document>"u")return;let t=document.getElementById(xt);t||(t=document.createElement("style"),t.id=xt,document.head.appendChild(t)),t.textContent!==tt&&(t.textContent=tt)}var xe={idle:"Start dictation",starting:"Stop dictation",recording:"Stop dictation",processing:"Transcribing",error:"Start dictation"},yt={position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",border:0};function wt({startSession:t=$}){et();let{phase:e,error:o,notice:i,onClick:c,cancel:a,clearNotice:l,level:r,seconds:b,autoStopped:m}=ht({startSession:t}),f=e==="starting"||e==="recording"||e==="processing",h=e==="idle"&&!!i,g=`${Math.floor(b/60)}:${String(b%60).padStart(2,"0")}`;return p("div",{className:`pv-mic pv-dictation-pill pv-phase-${e} ${h?"pv-has-notice":""}`,onClick:h?l:void 0,title:h?"Click to dismiss":void 0,children:[n("button",{type:"button",className:`pv-mic-button pv-mic-${e} ${f?"pv-pill-btn-stop":"pv-idle-icon"}`,"aria-label":ve,"aria-pressed":e==="recording"||e==="starting",title:xe[e],disabled:e==="processing",onClick:c,style:h?{display:"none"}:void 0,children:e==="idle"||e==="error"?n("svg",{viewBox:"0 0 24 24",width:"16",height:"16","aria-hidden":"true",focusable:"false",children:n("path",{d:"M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5Zm6 9h2v-3h-2v3Z",fill:"currentColor"})}):e==="processing"?n("span",{className:"pv-mic-spinner","aria-hidden":"true"}):n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("rect",{x:"6",y:"6",width:"12",height:"12",rx:"2.5",fill:"currentColor"})})}),h?p("span",{role:"status",className:"pv-notice-content",children:[n("span",{className:"pv-notice-check",children:"\u2713"}),n("span",{className:"pv-pill-status",children:i})]}):null,e==="starting"?p(W,{children:[p("div",{className:"pv-pill-timer-badge",children:[n("div",{className:"pv-pill-dot pv-pill-dot-starting"}),n("span",{className:"pv-pill-timer-text",children:"0:00"})]}),p("div",{className:"pv-pill-center",role:"status",children:[n("span",{className:"pv-mic-spinner","aria-hidden":"true"}),n("span",{className:"pv-pill-status",children:"Requesting microphone\u2026"})]})]}):null,e==="recording"?p(W,{children:[p("div",{className:"pv-pill-timer-badge",children:[n("div",{className:"pv-pill-dot"}),p("span",{className:"pv-pill-timer-text",children:[n("span",{className:"pv-sr-only",style:yt,children:"Recording "}),g]})]}),p("div",{className:"pv-pill-center",role:"status",children:[r===null?n("span",{className:"pv-sr-only",style:yt,children:"Audio meter unavailable"}):null,n("span",{className:`pv-pill-waveform ${r===null?"animated":""}`,"aria-label":"Microphone audio activity",role:"meter","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":Math.round((r??.3)*100),children:[.4,.7,1,.7,.4].map((x,y)=>n("span",{className:"pv-pill-waveform-bar",style:r!==null?{height:`${Math.max(3,r*x*20)}px`}:void 0},y))}),n("span",{className:"pv-pill-status",children:"Listening..."}),r!==null&&r<.015&&b>=5?n("span",{className:"pv-mic-quiet-warning",children:"No audio detected \u2014 check your microphone."}):null]})]}):null,e==="processing"?p(W,{children:[n("div",{className:"pv-pill-timer-badge",children:n("span",{className:"pv-pill-timer-text",children:g})}),n("div",{className:"pv-pill-center",role:"status",children:p("span",{className:"pv-pill-status",children:[n("span",{className:"pv-mic-spinner","aria-hidden":"true"})," ",m?"Recording limit reached. ":"","Transcribing and refining\u2026"]})})]}):null,e==="starting"||e==="recording"?n("button",{type:"button",className:"pv-mic-cancel pv-pill-btn-cancel",onClick:a,"aria-label":"Cancel recording",title:"Cancel recording",children:n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("path",{d:"M18 6L6 18M6 6l12 12",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round"})})}):null,e==="error"&&o?n("span",{role:"alert",className:"pv-pill-status pv-mic-error",children:o}):null]})}function St(t){return t?t.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]+/gu)||[]:[]}var Rt=1200;function Et(t,e){if(!t&&!e)return[];if(t===e)return[{type:"unchanged",text:t}];if(!t)return[{type:"added",text:e}];if(!e)return[{type:"removed",text:t}];let o=St(t),i=St(e),c=o.length,a=i.length;if(c>Rt||a>Rt)return[{type:"removed",text:t},{type:"added",text:e}];let l=a+1,r=new Uint32Array((c+1)*l);for(let g=1;g<=c;g++){let x=g*l,y=(g-1)*l,B=o[g-1];for(let S=1;S<=a;S++)if(B===i[S-1])r[x+S]=r[y+(S-1)]+1;else{let z=r[x+(S-1)],k=r[y+S];r[x+S]=z>k?z:k}}let b=[],m=c,f=a;for(;m>0||f>0;){let g=m*l,x=(m-1)*l;m>0&&f>0&&o[m-1]===i[f-1]?(b.push({type:"unchanged",text:o[m-1]}),m--,f--):f>0&&(m===0||r[g+(f-1)]>=r[x+f])?(b.push({type:"added",text:i[f-1]}),f--):m>0&&(f===0||r[g+(f-1)]<r[x+f])&&(b.push({type:"removed",text:o[m-1]}),m--)}b.reverse();let h=[];for(let g of b)h.length>0&&h[h.length-1].type===g.type?h[h.length-1].text+=g.text:h.push({...g});return h}var kt=`
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
`;var Tt="zcc-prompt-voice:studio-vertical-draft",At=[{id:"clarity",label:"\u2728 Polish Clarity",tone:"formal",prompt:"Fix grammar, remove filler words (um, uh, like), and polish for maximum clarity."},{id:"brief",label:"\u26A1 Executive Brief",tone:"technical",prompt:"Convert this into a concise 3-bullet executive brief followed by immediate next actions."},{id:"spec",label:"\u{1F4D0} Tech Spec RFC",tone:"technical",prompt:"Format into an engineering RFC with sections: Overview, Architecture, Data Flow, and Tradeoffs."},{id:"friendly",label:"\u{1F4AC} Friendly Chat",tone:"conversational",prompt:"Rephrase to sound natural, warm, and friendly for team chat."}],nt=[{id:"assistant",provider:"assistant",label:"Zana Assistant (Local / Active Thread Agent)",model:"assistant"},{id:"openai-fast",provider:"openai",label:"OpenAI GPT-5.4 Nano (Fast)",model:"gpt-5.4-nano"},{id:"openai-smart",provider:"openai",label:"OpenAI GPT-5.6 Luna (Smart)",model:"gpt-5.6-luna"},{id:"anthropic-haiku",provider:"anthropic",label:"Anthropic Claude 4.5 Haiku",model:"claude-haiku-4-5-20251001"},{id:"anthropic-sonnet",provider:"anthropic",label:"Anthropic Claude 5 Sonnet",model:"claude-sonnet-5-20260201"},{id:"google-flash",provider:"google",label:"Google Gemini 2.5 Flash",model:"gemini-2.5-flash"}];function Ct({startSession:t=$}){let e=Z(),o=K(),[i,c]=v("Prompt Spec"),[a,l]=v(""),[r,b]=v(""),[m,f]=v(!1),[h,g]=v(null),[x,y]=v("assistant"),[B,S]=v(null),[z,k]=v(null),[I,q]=v(!1),[T,D]=v(null),[O,It]=v(""),[A,ot]=v(!1),[rt,R]=v(null),[M,X]=v(!1),[Pt,it]=v(0),[_t,at]=v(null),F=N(null),j=N(null),U=N(null),st=N(null);_(()=>{try{let s=localStorage.getItem(Tt);if(s){let d=JSON.parse(s);d.title&&c(d.title),d.inputText&&l(d.inputText),d.outputText&&b(d.outputText),d.selectedModelId&&y(d.selectedModelId)}}catch{}},[]),_(()=>{let s=!0;return e.call(ut).then(d=>{if(!s)return;let w=d;w&&w.llmProvider&&S(w.llmProvider)}).catch(()=>{}),()=>{s=!1}},[e]),_(()=>{try{localStorage.setItem(Tt,JSON.stringify({title:i,inputText:a,outputText:r,selectedModelId:x}))}catch{}},[i,a,r,x]),_(()=>()=>{j.current&&clearInterval(j.current),U.current&&clearInterval(U.current),F.current&&F.current.cancel()},[]);let pt=V(()=>{let s=a.trim();return`${s?s.split(/\s+/).length:0} words \xB7 ${a.length} chars`},[a]),Dt=V(()=>{let s=r.trim();return`${s?s.split(/\s+/).length:0} words \xB7 ${r.length} chars`},[r]),Lt=V(()=>!r||!I?[]:Et(a,r),[a,r,I]),L=V(()=>nt.find(s=>s.id===x)??nt[0],[x]),Ot=async()=>{if(M){X(!1),at(null),j.current&&clearInterval(j.current),U.current&&clearInterval(U.current);let s=F.current;if(F.current=null,!s)return;try{let d=await s.stop(),w=await e.call(Y,{audio:d.base64,mimeType:d.mimeType});w.ok&&w.status==="ok"?l(J=>G(J,w.text)):w.ok&&w.status==="no-speech"?(R("No speech detected. Try speaking closer to the microphone."),setTimeout(()=>R(null),4e3)):w.ok||R(w.message)}catch(d){R(d instanceof Error?d.message:"Transcription failed.")}}else{R(null),it(0);try{let s=await t();F.current=s,X(!0),j.current=setInterval(()=>{it(d=>d+1)},1e3),s.getAudioLevel&&(U.current=setInterval(()=>{let d=s.getAudioLevel?.();d!=null&&at(d)},100))}catch(s){X(!1),R(s instanceof Error?s.message:"Microphone access denied.")}}},H=async s=>{let d=a.trim();if(!d||A)return;let w=At.find(P=>P.id===(s||T)),J=O.trim()||w?.prompt||"Polish and format for clarity.",Ut=w?.tone||"technical";R(null),ot(!0);try{let P=await e.call(ft,{text:d,tone:Ut,customPrompt:J,llmProvider:L.provider,llmModel:L.model});P.ok?(b(P.text),k(P.llmModel||L.model)):R(P.message)}catch(P){R(P instanceof Error?P.message:"Refinement request failed.")}finally{ot(!1)}},Mt=async()=>{if(a)try{await navigator.clipboard.writeText(a),R("Input draft copied to clipboard!"),setTimeout(()=>R(null),2500)}catch{}},zt=async()=>{if(r)try{await navigator.clipboard.writeText(r),f(!0),setTimeout(()=>f(!1),2e3)}catch{}},$t=()=>{confirm("Clear both raw input and refined output?")&&(l(""),b(""),q(!1))},Bt=()=>{r&&(l(r),R("Replaced top input with refined output for further iteration."),setTimeout(()=>R(null),3e3))},Ft=()=>{let s=r||a;s&&(o.updateText(d=>G(d,s)),o.focus(),g("Inserted output into thread composer!"),setTimeout(()=>g(null),3e3))},jt=E(s=>{(s.ctrlKey||s.metaKey)&&s.key==="k"?(s.preventDefault(),st.current?.focus()):(s.ctrlKey||s.metaKey)&&s.key==="Enter"&&(s.preventDefault(),H())},[a,T,O,A,L]);return p("div",{className:"ps-root",onKeyDown:jt,children:[n("style",{dangerouslySetInnerHTML:{__html:kt}}),p("header",{className:"ps-toolbar",children:[p("div",{className:"ps-brand",children:[n("span",{children:"\u2728"}),n("span",{children:"Prompt Studio"}),n("span",{className:"ps-brand-badge",children:"Vertical Workflow"})]}),h&&p("span",{style:{fontSize:12,color:"#3fb950",fontWeight:500},children:["\u2713 ",h]}),rt&&n("span",{style:{fontSize:12,color:"#fca5a5",fontWeight:500},children:rt}),n("div",{className:"ps-spacer"}),p("button",{type:"button",className:"ps-btn ps-btn-sm",onClick:$t,disabled:!a&&!r,title:"Clear all text",children:[n("span",{children:"\u{1F5D1}\uFE0F"})," Clear All"]}),p("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:Ft,disabled:!a&&!r,title:"Insert refined output into active composer",children:[n("span",{children:"\u{1F4AC}"})," Insert Output into Composer"]})]}),p("div",{className:"ps-workspace",children:[p("aside",{className:"ps-sidebar",children:[p("section",{className:"ps-section",children:[p("div",{className:"ps-section-title",children:[n("span",{children:"Refinement Model"}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:"LLM Engine"})]}),n("select",{className:"ps-select","aria-label":"Refinement model",value:x,onChange:s=>y(s.target.value),disabled:A,children:nt.map(s=>n("option",{value:s.id,children:s.label},s.id))}),n("div",{style:{marginTop:6,fontSize:11,color:"var(--ps-text-muted)",lineHeight:1.35},children:L.provider==="assistant"?"Uses the active Zana assistant agent with no extra API key required.":`Calls ${L.provider.toUpperCase()} directly with your configured plugin key.`})]}),p("section",{className:"ps-section",children:[p("div",{className:"ps-section-title",children:[n("span",{children:"Voice Dictation"}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:"Host STT"})]}),p("div",{className:"ps-dictation-card",children:[p("button",{type:"button",className:`ps-mic-btn${M?" recording":""}`,onClick:Ot,title:M?"Stop dictation":"Start dictation into input",children:[n("span",{children:M?"\u23F9\uFE0F":"\u{1F399}\uFE0F"}),n("span",{children:M?`Listening (${Pt}s)...`:"Dictate into Top Input"})]}),n("div",{className:"ps-audio-meter",children:n("div",{className:"ps-audio-bar",style:{width:`${M?Math.min(100,(_t??.3)*100):0}%`}})}),n("span",{style:{fontSize:11,color:"var(--ps-text-muted)"},children:M?"Recording active. Transcribing into Input above...":"Speaks into Raw Input above. Transcribed with Zana host voice."})]})]}),p("section",{className:"ps-section",children:[p("div",{className:"ps-section-title",children:[n("span",{children:"Refinement Presets"}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:"Instant apply"})]}),n("div",{className:"ps-presets-list",children:At.map(s=>{let d=T===s.id;return p("button",{type:"button",className:`ps-preset-item${d?" active":""}`,onClick:()=>{D(s.id),H(s.id)},disabled:!a.trim()||A,children:[n("div",{className:"ps-preset-header",children:n("span",{className:"ps-preset-name",children:s.label})}),n("span",{className:"ps-preset-desc",children:s.prompt})]},s.id)})})]}),p("section",{className:"ps-section",style:{borderBottom:"none"},children:[p("div",{className:"ps-section-title",children:[n("span",{children:"Custom Instructions"}),n("span",{className:"ps-kbd",children:"Ctrl+K"})]}),n("textarea",{ref:st,className:"ps-instructions-input",value:O,onChange:s=>It(s.target.value),placeholder:"E.g., Format as markdown with code examples, or restrict response to 150 words...",disabled:A}),n("div",{style:{marginTop:10},children:p("button",{type:"button",className:"ps-btn ps-btn-primary",style:{width:"100%",height:32},onClick:()=>H(),disabled:!a.trim()||A,children:[n("span",{children:"\u2728"})," ",A?"Refining\u2026":"Refine Prompt (Ctrl+Enter)"]})})]})]}),p("main",{className:"ps-stack-workspace",children:[p("div",{className:"ps-stack-header",children:[n("input",{type:"text",className:"ps-title-field",value:i,onChange:s=>c(s.target.value),placeholder:"Untitled Prompt Spec..."}),p("span",{style:{fontSize:11,color:"var(--ps-text-muted)"},children:["Input: ",pt," \xB7 Output: ",Dt]})]}),p("div",{className:"ps-vertical-panes",children:[p("section",{className:"ps-section-input",children:[p("div",{className:"ps-pane-header",children:[p("div",{className:"ps-pane-title",children:[n("span",{className:"ps-badge ps-badge-input",children:"Input"}),n("span",{children:"Raw Draft / Speech"})]}),p("div",{className:"ps-pane-actions",children:[n("span",{style:{fontSize:11,color:"var(--ps-text-muted)"},children:pt}),n("button",{type:"button",className:"ps-btn ps-btn-sm",onClick:Mt,disabled:!a,title:"Copy input text",children:"\u{1F4CB} Copy"}),n("button",{type:"button",className:"ps-btn ps-btn-sm",onClick:()=>l(""),disabled:!a,title:"Clear raw input",children:"Clear"})]})]}),n("textarea",{className:"ps-input-textarea",value:a,onChange:s=>l(s.target.value),placeholder:"Type your raw thoughts or click Dictate in the toolbar below to capture speech..."})]}),p("div",{className:"ps-mid-action-bar",children:[n("div",{className:"ps-mid-info",children:p("span",{children:["\u2B07 Transform Input using ",n("strong",{children:L.label.split(" (")[0]})]})}),n("div",{className:"ps-mid-actions",children:n("button",{type:"button",className:"ps-btn ps-btn-sm ps-btn-primary",onClick:()=>H(),disabled:!a.trim()||A,title:"Refine raw input (Ctrl+Enter)",children:p("span",{children:["\u2728 ",A?"Refining\u2026":"Refine Now (Ctrl+Enter)"]})})})]}),p("section",{className:"ps-section-output",children:[p("div",{className:"ps-pane-header",children:[p("div",{className:"ps-pane-title",children:[n("span",{className:"ps-badge ps-badge-output",children:"Output"}),n("span",{children:r?"Refined Spec (Ready)":"Refined Spec"})]}),p("div",{className:"ps-pane-actions",children:[r&&p("button",{type:"button",className:"ps-btn ps-btn-sm",onClick:()=>q(s=>!s),title:"Toggle difference view",children:[n("span",{children:I?"\u{1F441}\uFE0F":"\u{1F50D}"}),n("span",{children:I?"View Clean":"View Diff"})]}),p("button",{type:"button",className:"ps-btn ps-btn-sm",onClick:zt,disabled:!r,title:"Copy refined output",children:[n("span",{children:m?"\u2713":"\u{1F4CB}"}),n("span",{children:m?"Copied!":"Copy Output"})]}),n("button",{type:"button",className:"ps-btn ps-btn-sm ps-btn-success",onClick:Bt,disabled:!r,title:"Copy refined text back up to input for further iteration",children:n("span",{children:"\u2B06 Replace Input"})})]})]}),n("div",{style:{flex:1,overflowY:"auto",position:"relative"},children:r?n("div",{className:"ps-output-scroll",children:I?Lt.map((s,d)=>s.type==="added"?n("span",{className:"ps-diff-added",children:s.text},d):s.type==="removed"?n("span",{className:"ps-diff-removed",children:s.text},d):n("span",{className:"ps-diff-unchanged",children:s.text},d)):r}):p("div",{className:"ps-output-empty",children:[n("span",{style:{fontSize:26,opacity:.5},children:"\u2728"}),n("div",{style:{fontWeight:500,fontSize:13,color:"var(--ps-text)"},children:"No Refined Output Yet"}),p("div",{style:{fontSize:12,maxWidth:320,lineHeight:1.4,color:"var(--ps-text-muted)"},children:["Type your raw thoughts above or speak, then click ",n("strong",{children:"Refine Now"})," or select a preset on the left."]}),p("button",{type:"button",className:"ps-btn ps-btn-primary",style:{marginTop:4},onClick:()=>H(),disabled:!a.trim()||A,children:[n("span",{children:"\u2728"})," Refine Prompt Now"]})]})})]})]})]})]}),p("footer",{className:"ps-statusbar",children:[p("div",{className:"ps-status-item",children:[n("span",{children:"\u25CF"}),n("span",{children:"Auto-saved locally"})]}),p("div",{className:"ps-status-item",children:[n("span",{children:"Model:"}),n("span",{style:{color:"var(--ps-text)",fontWeight:500},children:z||L.label})]}),n("div",{className:"ps-spacer"}),p("div",{className:"ps-status-item",children:[n("span",{children:"Shortcuts:"}),n("span",{className:"ps-kbd",children:"Ctrl+K"})," Focus Prompt",n("span",{className:"ps-kbd",children:"Ctrl+Enter"})," Refine"]})]})]})}var Nt="prompt-studio",kn=dt(t=>{et(),t.composer.customize({id:"prompt-voice-mic",actions:[{id:"prompt-voice-mic",component:wt}]}),t.slots.navPanel?.({id:"prompt-studio",title:"Prompt Studio",icon:"Sparkles",path:Nt,component:Ct}),t.slots.commandPaletteAction?.({id:"open-prompt-studio",title:"Prompt Studio: Open Canvas",run:e=>{e.navigate?.(`/${Nt}`)}})});export{Nt as PROMPT_STUDIO_PANEL_PATH,kn as default};
//# sourceMappingURL=app.js.map
