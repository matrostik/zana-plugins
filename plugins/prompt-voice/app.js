function it(){return globalThis.__ZCC_PLUGIN_RUNTIME__??{}}function at(t){throw new Error(`${t} is not available until the host plugin runtime is installed`)}function pt(t){return{__zccPluginApp:!0,setup:t}}function H(){return it().useRpc?.()??at("useRpc")}function V(){return it().useComposer?.()??at("useComposer")}var Dt=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4"];var k=class extends Error{code;constructor(e,n){super(n),this.name="RecordingError",this.code=e}};function Nt(t){return Dt.find(e=>t(e))??null}var Lt="audio/webm";function Mt(){return{getUserMedia:t=>navigator.mediaDevices.getUserMedia(t),createRecorder:(t,e)=>new MediaRecorder(t,e?{mimeType:e}:void 0),isTypeSupported:t=>typeof MediaRecorder<"u"&&MediaRecorder.isTypeSupported(t)}}async function Ot(t){try{return await t.getUserMedia({audio:!0})}catch(e){let n=e instanceof Error?e.name:"";throw n==="NotAllowedError"||n==="SecurityError"?new k("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again."):new k("MIC_UNAVAILABLE","No microphone is available. Connect one and try again.")}}function zt(t){return new Promise((e,n)=>{let o=new FileReader;o.onload=()=>{let p=typeof o.result=="string"?o.result:"";e(p.slice(p.indexOf(",")+1))},o.onerror=()=>n(new k("RECORDING_FAILED","The recording could not be read.")),o.readAsDataURL(t)})}async function Bt(t,e){let n=new Blob(t,{type:e});return{base64:await zt(n),mimeType:n.type||e}}function $t(t,e){if(!(t>0&&Number.isFinite(t)))return()=>{};let n=setTimeout(e,t);return()=>clearTimeout(n)}var jt="That recording is too large to transcribe. Keep dictation shorter and try again.";function Ut(t,e){let n=Math.max(e,t),o=[],p=0,r=!1;return{chunks:o,get overflowed(){return r},add(c){return c.size===0||r?"ignored":p+c.size>n?(r=!0,"overflow"):(o.push(c),p+=c.size,p>=t?"limit-reached":"accepted")}}}function Ht(t,e){let n=new Promise((o,p)=>{t.onstop=()=>o(),t.onerror=()=>{let r=new k("RECORDING_FAILED","Recording stopped unexpectedly. Try again.");e(r),p(r)}});return n.catch(()=>{}),n}function Vt(t,e,n,o){let p=Ht(t,o);return t.ondataavailable=r=>{let c=e.add(r.data);(c==="limit-reached"||c==="overflow")&&n()},t.start(1e3),p}async function qt(t,e,n,o){try{await t}finally{e()}if(n.overflowed)throw new k("RECORDING_FAILED",jt);return Bt(n.chunks,o)}function Gt(t){let e=()=>{};return{stopRecorder(){e(),t.state!=="inactive"&&t.stop()},armTimer(n,o){e=$t(n,o)}}}function Wt(t,e){let n=null;return{attach(o){n=o},detach(){n=null},autoStop(){t();let o=n?.onAutoStop;n&&(n.onAutoStop=void 0),o?.()},fail(o){t(),e();let p=n?.onError;n=null,p?.(o)}}}function Kt(t,e,n,o){let p=Ut(o.maxBytes??9437184,o.hardMaxBytes??10485760),{stopRecorder:r,armTimer:c}=Gt(t),s=Wt(r,e);c(o.maxDurationMs??12e4,s.autoStop);let g=Vt(t,p,s.autoStop,s.fail),l={onError:o.onError,onAutoStop:o.onAutoStop,async stop(){r();try{return await qt(g,e,p,t.mimeType||n)}finally{s.detach()}},cancel(){r(),e(),s.detach()}};return s.attach(l),l}var O=()=>Yt();async function Yt(t=Mt(),e={}){let n=await Ot(t),o=Zt(n),p=n.getTracks(),r,c=()=>{for(let s of p)r&&s.removeEventListener?.("ended",r);o?.close(),p.forEach(s=>s.stop())};try{let s=Nt(t.isTypeSupported)??Lt,g=t.createRecorder(n,s),l=Kt(g,c,s,e);return l.getAudioLevel=()=>o?.level()??null,r=()=>{let u=l.onError;l.cancel(),u?.(new k("MIC_UNAVAILABLE","Microphone disconnected. Check your device and try again."))},p.forEach(u=>u.addEventListener?.("ended",r)),l}catch(s){throw c(),s instanceof k?s:new k("RECORDING_FAILED",s instanceof Error?s.message:"The recording could not be started.")}}function Zt(t){let e;try{e=new AudioContext;let n=e.createMediaStreamSource(t),o=e.createAnalyser();o.fftSize=256,n.connect(o);let p=new Uint8Array(o.fftSize),r=e,c=!1;return{level(){if(r.state&&r.state!=="running")return null;o.getByteTimeDomainData(p);let s=p.reduce((g,l)=>g+((l-128)/128)**2,0)/p.length;return Math.min(1,Math.sqrt(s)*5)},close(){c||(c=!0,n.disconnect(),r.close().catch(s=>console.error("Prompt Voice audio meter cleanup failed",s)))}}}catch(n){return e&&e.close().catch(o=>console.error("Prompt Voice audio meter cleanup failed",o)),console.warn("Prompt Voice audio meter unavailable",n),null}}var m=globalThis.__ZCC_HOST_REACT__;var me=m.Children,ue=m.Component,fe=m.Fragment,ge=m.StrictMode,be=m.Suspense,xe=m.cloneElement,he=m.createContext,ve=m.createElement,ye=m.createRef,we=m.forwardRef,Se=m.isValidElement,Ee=m.lazy,Re=m.memo,Ae=m.startTransition,A=m.useCallback,Ce=m.useContext,Fe=m.useDebugValue,ke=m.useDeferredValue,N=m.useEffect,Te=m.useId,_e=m.useImperativeHandle,Ie=m.useInsertionEffect,Pe=m.useLayoutEffect,Z=m.useMemo,st=m.useReducer,I=m.useRef,h=m.useState,De=m.useSyncExternalStore,Ne=m.useTransition,Le=m.version;var q="promptVoice.transcribe";var ct="promptVoice.rephrase";function j(t,e){let n=e.trim();return n?t?/\s$/.test(t)?`${t}${n}`:`${t} ${n}`:n:t}var Xt="No speech detected.",X={phase:"idle",notice:null,error:null};function lt(t,e){switch(e.type){case"START":return t.phase==="idle"||t.phase==="error"?{phase:"starting",notice:null,error:null}:t;case"STARTED":return t.phase==="starting"?{...t,phase:"recording"}:t;case"STOP":return t.phase==="recording"||t.phase==="starting"?{phase:"processing",notice:null,error:null}:t;case"CANCEL":return t.phase==="recording"||t.phase==="starting"?{...X}:t;case"SUCCESS":case"NO_SPEECH":return t.phase!=="processing"?t:{phase:"idle",notice:e.type==="NO_SPEECH"?Xt:e.notice,error:null};case"CLEAR_NOTICE":return t.notice?{...t,notice:null}:t;case"FAILURE":return{phase:"error",notice:null,error:e.message}}}var Jt="Prompt Voice returned an unexpected response. Try again.",Qt="Dictation failed. Try again.",te=4e3;function ee(t){return typeof t=="object"&&t!==null&&typeof t.ok=="boolean"}async function ne(t,e){let n=await t.call(q,{audio:e.base64,mimeType:e.mimeType});if(!ee(n))throw new Error(Jt);return n}function dt(t){return t instanceof Error&&t.message?t.message:Qt}function oe(t,e,n){if(!t.ok){n({type:"FAILURE",message:t.message});return}if(t.status==="no-speech"){n({type:"NO_SPEECH"});return}e.updateText(p=>j(p,t.text)),e.focus();let o=t.refineNotice?`Inserted the raw transcript. ${t.refineNotice.message}`:"Added to draft.";n({type:"SUCCESS",notice:o})}function re(t,e,n,o){return e()?(t.onError=p=>{e()&&o(p)},t.onAutoStop=()=>{e()&&n()},t):(t.cancel(),null)}function ie(t,e,n,o,p){let r=c=>p({type:"FAILURE",message:dt(c)});return t.then(c=>{let s=re(c,n,o,g=>{e.current=null,r(g)});return s&&(e.current=s),s},c=>(n()&&r(c),null))}function ae(t,e){let n=I(null),o=I(null),p=I(0),r=I(!0),c=A(()=>{p.current++,o.current=null,n.current&&(n.current.cancel(),n.current=null),e({type:"CANCEL"})},[e]);N(()=>(r.current=!0,()=>{r.current=!1,c()}),[c]);let s=A(async()=>{let d=o.current?await o.current:n.current;return n.current=null,d},[]),g=A(async d=>{let b=++p.current,y=()=>r.current&&p.current===b,w=ie(t(),n,y,d,e);o.current=w,await w&&y()&&e({type:"STARTED"}),o.current===w&&(o.current=null)},[e,t]),l=A(()=>r.current,[]),u=A(()=>n.current?.getAudioLevel?.()??null,[]);return{start:g,takeSession:s,cancel:c,isMounted:l,getAudioLevel:u}}function mt({startSession:t=O,noticeDurationMs:e=te}={}){let n=V(),o=H(),[p,r]=st(lt,X),{start:c,takeSession:s,cancel:g,isMounted:l,getAudioLevel:u}=ae(t,r),[d,b]=h(null),[y,w]=h(0),[v,S]=h(!1);N(()=>{if(p.phase!=="recording"){b(null),w(0);return}let T=Date.now(),P=()=>{b(u()),w(Math.floor((Date.now()-T)/1e3))};P();let E=setInterval(P,100);return()=>clearInterval(E)},[u,p.phase]),N(()=>{if(!p.notice)return;let T=setTimeout(()=>{r({type:"CLEAR_NOTICE"})},e);return()=>clearTimeout(T)},[e,p.notice]);let L=A(()=>{r({type:"CLEAR_NOTICE"})},[]),C=A(async()=>{r({type:"STOP"});let T=await s();if(!(!l()||!T))try{let P=await T.stop();if(!l())return;let E=await ne(o,P);if(!l())return;oe(E,n,r)}catch(P){if(!l())return;r({type:"FAILURE",message:dt(P)})}},[n,l,o,s]),F=A(async()=>{S(!1),r({type:"START"}),await c(()=>{S(!0),C()})},[C,c]),G=A(()=>{p.phase==="recording"||p.phase==="starting"?C():p.phase!=="processing"&&F()},[F,C,p.phase]);return{phase:p.phase,error:p.error,notice:p.notice,level:d,seconds:y,autoStopped:v,onClick:G,cancel:g,clearNotice:L,beginDictation:F,finishDictation:C}}var J=`/* Base Container */
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
   Prompt Studio - Inline Document Canvas (Option 3)
   ========================================================================== */

.ps-root {
  display: flex !important;
  flex-direction: column !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 100vh !important;
  background: #090D16 !important;
  color: #F8FAFC !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
  overflow: hidden !important;
  position: relative !important;
  box-sizing: border-box !important;
}

.ps-root *, .ps-root *::before, .ps-root *::after {
  box-sizing: border-box !important;
}

/* Header */
.ps-header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  height: 52px !important;
  padding: 0 24px !important;
  background: #0D111D !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  flex-shrink: 0 !important;
  z-index: 20 !important;
}

.ps-header-left {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
}

.ps-logo-badge {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 28px !important;
  height: 28px !important;
  border-radius: 7px !important;
  background: linear-gradient(135deg, #6366F1, #8B5CF6) !important;
  color: #FFFFFF !important;
  font-size: 14px !important;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35) !important;
}

.ps-title {
  font-size: 15px !important;
  font-weight: 600 !important;
  color: #F8FAFC !important;
  letter-spacing: -0.01em !important;
}

.ps-badge {
  font-size: 11px !important;
  font-weight: 500 !important;
  padding: 2px 8px !important;
  border-radius: 999px !important;
  background: rgba(99, 102, 241, 0.12) !important;
  color: #A5B4FC !important;
  border: 1px solid rgba(99, 102, 241, 0.25) !important;
}

.ps-header-right {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
}

.ps-telemetry-tag {
  font-size: 12px !important;
  color: #94A3B8 !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
}

.ps-btn-ghost {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 6px 12px !important;
  border-radius: 6px !important;
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  color: #CBD5E1 !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

.ps-btn-ghost:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #FFFFFF !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
}

.ps-btn-ghost:disabled {
  opacity: 0.4 !important;
  cursor: not-allowed !important;
}

.ps-btn-primary {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 6px 14px !important;
  border-radius: 6px !important;
  background: linear-gradient(135deg, #6366F1, #8B5CF6) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: #FFFFFF !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35) !important;
}

.ps-btn-primary:hover:not(:disabled) {
  filter: brightness(1.1) !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.45) !important;
}

.ps-btn-primary:disabled {
  opacity: 0.4 !important;
  cursor: not-allowed !important;
  transform: none !important;
}

/* Document Canvas Container */
.ps-canvas-scroll {
  flex: 1 !important;
  overflow-y: auto !important;
  padding: 40px 24px 160px 24px !important;
  display: flex !important;
  justify-content: center !important;
  background: #090D16 !important;
}

.ps-canvas {
  width: 100% !important;
  max-width: 800px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 20px !important;
}

/* Canvas Title Field */
.ps-doc-title {
  width: 100% !important;
  background: transparent !important;
  border: none !important;
  font-size: 26px !important;
  font-weight: 700 !important;
  color: #F8FAFC !important;
  outline: none !important;
  padding: 0 !important;
  margin: 0 !important;
  letter-spacing: -0.02em !important;
}

.ps-doc-title::placeholder {
  color: #475569 !important;
}

.ps-doc-divider {
  width: 100% !important;
  height: 1px !important;
  background: rgba(255, 255, 255, 0.08) !important;
}

/* Text Editor & Diff Presentation */
.ps-doc-editor {
  width: 100% !important;
  min-height: 280px !important;
  background: transparent !important;
  border: none !important;
  outline: none !important;
  color: #E2E8F0 !important;
  font-size: 15px !important;
  line-height: 1.7 !important;
  resize: vertical !important;
  font-family: inherit !important;
  padding: 0 !important;
}

.ps-doc-editor::placeholder {
  color: #475569 !important;
}

.ps-diff-container {
  width: 100% !important;
  min-height: 240px !important;
  font-size: 15px !important;
  line-height: 1.75 !important;
  white-space: pre-wrap !important;
  word-break: break-word !important;
}

.ps-diff-added {
  background: rgba(16, 185, 129, 0.16) !important;
  color: #6EE7B7 !important;
  border-bottom: 2px solid #10B981 !important;
  border-radius: 2px !important;
  padding: 1px 2px !important;
  font-weight: 500 !important;
}

.ps-diff-removed {
  background: rgba(239, 68, 68, 0.15) !important;
  color: #FCA5A5 !important;
  text-decoration: line-through !important;
  opacity: 0.75 !important;
  border-radius: 2px !important;
  padding: 1px 2px !important;
}

.ps-diff-unchanged {
  color: #E2E8F0 !important;
}

/* Floating AI Refinement Bar */
.ps-floating-bar {
  position: absolute !important;
  bottom: 24px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  width: calc(100% - 48px) !important;
  max-width: 800px !important;
  background: rgba(13, 17, 29, 0.95) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(99, 102, 241, 0.35) !important;
  border-radius: 14px !important;
  box-shadow: 0 16px 40px -4px rgba(0, 0, 0, 0.8), 0 0 20px -2px rgba(99, 102, 241, 0.25) !important;
  padding: 12px 16px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
  z-index: 50 !important;
  transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
}

.ps-floating-bar:focus-within {
  border-color: rgba(99, 102, 241, 0.6) !important;
  box-shadow: 0 16px 44px -4px rgba(0, 0, 0, 0.9), 0 0 24px -2px rgba(99, 102, 241, 0.35) !important;
}

/* Preset Pills Row */
.ps-pills-row {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  overflow-x: auto !important;
  padding-bottom: 2px !important;
}

.ps-pills-label {
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #64748B !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  margin-right: 4px !important;
  flex-shrink: 0 !important;
}

.ps-preset-pill {
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  color: #CBD5E1 !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  padding: 4px 11px !important;
  border-radius: 999px !important;
  cursor: pointer !important;
  white-space: nowrap !important;
  transition: all 0.15s ease !important;
}

.ps-preset-pill:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.16) !important;
  border-color: rgba(99, 102, 241, 0.35) !important;
  color: #FFFFFF !important;
}

.ps-preset-pill.active {
  background: rgba(99, 102, 241, 0.28) !important;
  border-color: #6366F1 !important;
  color: #A5B4FC !important;
  font-weight: 600 !important;
}

.ps-preset-pill:disabled {
  opacity: 0.4 !important;
  cursor: not-allowed !important;
}

/* Action Controls Input Row */
.ps-action-row {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  width: 100% !important;
}

.ps-input-field {
  flex: 1 !important;
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 8px !important;
  color: #F8FAFC !important;
  font-size: 13px !important;
  padding: 8px 12px !important;
  outline: none !important;
  transition: border-color 0.15s ease, background 0.15s ease !important;
}

.ps-input-field:focus {
  border-color: rgba(99, 102, 241, 0.5) !important;
  background: rgba(255, 255, 255, 0.08) !important;
}

.ps-input-field::placeholder {
  color: #64748B !important;
}

/* Mic Action Button */
.ps-mic-toggle {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  background: rgba(239, 68, 68, 0.14) !important;
  border: 1px solid rgba(239, 68, 68, 0.35) !important;
  color: #FCA5A5 !important;
  padding: 8px 14px !important;
  border-radius: 8px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
  flex-shrink: 0 !important;
}

.ps-mic-toggle:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.24) !important;
  border-color: rgba(239, 68, 68, 0.6) !important;
  color: #FFFFFF !important;
}

.ps-mic-toggle.recording {
  background: rgba(239, 68, 68, 0.35) !important;
  border-color: #EF4444 !important;
  color: #FFFFFF !important;
  box-shadow: 0 0 14px rgba(239, 68, 68, 0.5) !important;
  animation: ps-pulse-red 1.2s infinite ease-in-out !important;
}

@keyframes ps-pulse-red {
  0%, 100% { box-shadow: 0 0 8px rgba(239, 68, 68, 0.3); }
  50% { box-shadow: 0 0 18px rgba(239, 68, 68, 0.65); }
}

/* In-Place Review Banner & Controls */
.ps-review-banner {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  background: rgba(16, 185, 129, 0.1) !important;
  border: 1px solid rgba(16, 185, 129, 0.25) !important;
  border-radius: 8px !important;
  padding: 8px 12px !important;
  width: 100% !important;
}

.ps-review-info {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  color: #6EE7B7 !important;
}

.ps-review-actions {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.ps-btn-accept {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 6px 14px !important;
  border-radius: 6px !important;
  background: linear-gradient(135deg, #10B981, #059669) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: #FFFFFF !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3) !important;
}

.ps-btn-accept:hover {
  filter: brightness(1.1) !important;
  transform: translateY(-1px) !important;
}

.ps-btn-discard {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 6px 12px !important;
  border-radius: 6px !important;
  background: rgba(239, 68, 68, 0.12) !important;
  border: 1px solid rgba(239, 68, 68, 0.25) !important;
  color: #FCA5A5 !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

.ps-btn-discard:hover {
  background: rgba(239, 68, 68, 0.22) !important;
  color: #FFFFFF !important;
}

.ps-status-notice {
  font-size: 12px !important;
  color: #F87171 !important;
  padding: 6px 10px !important;
  border-radius: 6px !important;
  background: rgba(239, 68, 68, 0.12) !important;
  border: 1px solid rgba(239, 68, 68, 0.25) !important;
  margin-top: 4px !important;
}
`;var ut=globalThis.__ZCC_HOST_REACT__,z=ut.Fragment;function a(t,e,n){return ut.createElement(t,n===void 0?e:{...e,key:n})}var f=a;var se="Dictation",ft="zcc-ext-prompt-voice-styles";function Q(){if(typeof document>"u")return;let t=document.getElementById(ft);t||(t=document.createElement("style"),t.id=ft,document.head.appendChild(t)),t.textContent!==J&&(t.textContent=J)}var ce={idle:"Start dictation",starting:"Stop dictation",recording:"Stop dictation",processing:"Transcribing",error:"Start dictation"},gt={position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",border:0};function bt({startSession:t=O}){Q();let{phase:e,error:n,notice:o,onClick:p,cancel:r,clearNotice:c,level:s,seconds:g,autoStopped:l}=mt({startSession:t}),u=e==="starting"||e==="recording"||e==="processing",d=e==="idle"&&!!o,b=`${Math.floor(g/60)}:${String(g%60).padStart(2,"0")}`;return f("div",{className:`pv-mic pv-dictation-pill pv-phase-${e} ${d?"pv-has-notice":""}`,onClick:d?c:void 0,title:d?"Click to dismiss":void 0,children:[a("button",{type:"button",className:`pv-mic-button pv-mic-${e} ${u?"pv-pill-btn-stop":"pv-idle-icon"}`,"aria-label":se,"aria-pressed":e==="recording"||e==="starting",title:ce[e],disabled:e==="processing",onClick:p,style:d?{display:"none"}:void 0,children:e==="idle"||e==="error"?a("svg",{viewBox:"0 0 24 24",width:"16",height:"16","aria-hidden":"true",focusable:"false",children:a("path",{d:"M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5Zm6 9h2v-3h-2v3Z",fill:"currentColor"})}):e==="processing"?a("span",{className:"pv-mic-spinner","aria-hidden":"true"}):a("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:a("rect",{x:"6",y:"6",width:"12",height:"12",rx:"2.5",fill:"currentColor"})})}),d?f("span",{role:"status",className:"pv-notice-content",children:[a("span",{className:"pv-notice-check",children:"\u2713"}),a("span",{className:"pv-pill-status",children:o})]}):null,e==="starting"?f(z,{children:[f("div",{className:"pv-pill-timer-badge",children:[a("div",{className:"pv-pill-dot pv-pill-dot-starting"}),a("span",{className:"pv-pill-timer-text",children:"0:00"})]}),f("div",{className:"pv-pill-center",role:"status",children:[a("span",{className:"pv-mic-spinner","aria-hidden":"true"}),a("span",{className:"pv-pill-status",children:"Requesting microphone\u2026"})]})]}):null,e==="recording"?f(z,{children:[f("div",{className:"pv-pill-timer-badge",children:[a("div",{className:"pv-pill-dot"}),f("span",{className:"pv-pill-timer-text",children:[a("span",{className:"pv-sr-only",style:gt,children:"Recording "}),b]})]}),f("div",{className:"pv-pill-center",role:"status",children:[s===null?a("span",{className:"pv-sr-only",style:gt,children:"Audio meter unavailable"}):null,a("span",{className:`pv-pill-waveform ${s===null?"animated":""}`,"aria-label":"Microphone audio activity",role:"meter","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":Math.round((s??.3)*100),children:[.4,.7,1,.7,.4].map((y,w)=>a("span",{className:"pv-pill-waveform-bar",style:s!==null?{height:`${Math.max(3,s*y*20)}px`}:void 0},w))}),a("span",{className:"pv-pill-status",children:"Listening..."}),s!==null&&s<.015&&g>=5?a("span",{className:"pv-mic-quiet-warning",children:"No audio detected \u2014 check your microphone."}):null]})]}):null,e==="processing"?f(z,{children:[a("div",{className:"pv-pill-timer-badge",children:a("span",{className:"pv-pill-timer-text",children:b})}),a("div",{className:"pv-pill-center",role:"status",children:f("span",{className:"pv-pill-status",children:[a("span",{className:"pv-mic-spinner","aria-hidden":"true"})," ",l?"Recording limit reached. ":"","Transcribing and refining\u2026"]})})]}):null,e==="starting"||e==="recording"?a("button",{type:"button",className:"pv-mic-cancel pv-pill-btn-cancel",onClick:r,"aria-label":"Cancel recording",title:"Cancel recording",children:a("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:a("path",{d:"M18 6L6 18M6 6l12 12",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round"})})}):null,e==="error"&&n?a("span",{role:"alert",className:"pv-pill-status pv-mic-error",children:n}):null]})}function xt(t){return t?t.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]+/gu)||[]:[]}var ht=1200;function vt(t,e){if(!t&&!e)return[];if(t===e)return[{type:"unchanged",text:t}];if(!t)return[{type:"added",text:e}];if(!e)return[{type:"removed",text:t}];let n=xt(t),o=xt(e),p=n.length,r=o.length;if(p>ht||r>ht)return[{type:"removed",text:t},{type:"added",text:e}];let c=r+1,s=new Uint32Array((p+1)*c);for(let b=1;b<=p;b++){let y=b*c,w=(b-1)*c,v=n[b-1];for(let S=1;S<=r;S++)if(v===o[S-1])s[y+S]=s[w+(S-1)]+1;else{let L=s[y+(S-1)],C=s[w+S];s[y+S]=L>C?L:C}}let g=[],l=p,u=r;for(;l>0||u>0;){let b=l*c,y=(l-1)*c;l>0&&u>0&&n[l-1]===o[u-1]?(g.push({type:"unchanged",text:n[l-1]}),l--,u--):u>0&&(l===0||s[b+(u-1)]>=s[y+u])?(g.push({type:"added",text:o[u-1]}),u--):l>0&&(u===0||s[b+(u-1)]<s[y+u])&&(g.push({type:"removed",text:n[l-1]}),l--)}g.reverse();let d=[];for(let b of g)d.length>0&&d[d.length-1].type===b.type?d[d.length-1].text+=b.text:d.push({...b});return d}var yt=`
/* ==========================================================================
   Prompt Studio - Inline Document Canvas (Option 3)
   ========================================================================== */

.ps-root {
  display: flex !important;
  flex-direction: column !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 100vh !important;
  background: #090D16 !important;
  color: #F8FAFC !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
  overflow: hidden !important;
  position: relative !important;
  box-sizing: border-box !important;
}

.ps-root *, .ps-root *::before, .ps-root *::after {
  box-sizing: border-box !important;
}

/* Header */
.ps-header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  height: 52px !important;
  padding: 0 24px !important;
  background: #0D111D !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  flex-shrink: 0 !important;
  z-index: 20 !important;
}

.ps-header-left {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
}

.ps-logo-badge {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 28px !important;
  height: 28px !important;
  border-radius: 7px !important;
  background: linear-gradient(135deg, #6366F1, #8B5CF6) !important;
  color: #FFFFFF !important;
  font-size: 14px !important;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35) !important;
}

.ps-title {
  font-size: 15px !important;
  font-weight: 600 !important;
  color: #F8FAFC !important;
  letter-spacing: -0.01em !important;
}

.ps-badge {
  font-size: 11px !important;
  font-weight: 500 !important;
  padding: 2px 8px !important;
  border-radius: 999px !important;
  background: rgba(99, 102, 241, 0.12) !important;
  color: #A5B4FC !important;
  border: 1px solid rgba(99, 102, 241, 0.25) !important;
}

.ps-header-right {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
}

.ps-telemetry-tag {
  font-size: 12px !important;
  color: #94A3B8 !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
}

.ps-btn-ghost {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 6px 12px !important;
  border-radius: 6px !important;
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  color: #CBD5E1 !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

.ps-btn-ghost:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #FFFFFF !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
}

.ps-btn-ghost:disabled {
  opacity: 0.4 !important;
  cursor: not-allowed !important;
}

.ps-btn-primary {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 6px 14px !important;
  border-radius: 6px !important;
  background: linear-gradient(135deg, #6366F1, #8B5CF6) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: #FFFFFF !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35) !important;
}

.ps-btn-primary:hover:not(:disabled) {
  filter: brightness(1.1) !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.45) !important;
}

.ps-btn-primary:disabled {
  opacity: 0.4 !important;
  cursor: not-allowed !important;
  transform: none !important;
}

/* Document Canvas Container */
.ps-canvas-scroll {
  flex: 1 !important;
  overflow-y: auto !important;
  padding: 40px 24px 160px 24px !important;
  display: flex !important;
  justify-content: center !important;
  background: #090D16 !important;
}

.ps-canvas {
  width: 100% !important;
  max-width: 800px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 20px !important;
}

/* Canvas Title Field */
.ps-doc-title {
  width: 100% !important;
  background: transparent !important;
  border: none !important;
  font-size: 26px !important;
  font-weight: 700 !important;
  color: #F8FAFC !important;
  outline: none !important;
  padding: 0 !important;
  margin: 0 !important;
  letter-spacing: -0.02em !important;
}

.ps-doc-title::placeholder {
  color: #475569 !important;
}

.ps-doc-divider {
  width: 100% !important;
  height: 1px !important;
  background: rgba(255, 255, 255, 0.08) !important;
}

/* Text Editor & Diff Presentation */
.ps-doc-editor {
  width: 100% !important;
  min-height: 280px !important;
  background: transparent !important;
  border: none !important;
  outline: none !important;
  color: #E2E8F0 !important;
  font-size: 15px !important;
  line-height: 1.7 !important;
  resize: vertical !important;
  font-family: inherit !important;
  padding: 0 !important;
}

.ps-doc-editor::placeholder {
  color: #475569 !important;
}

.ps-diff-container {
  width: 100% !important;
  min-height: 240px !important;
  font-size: 15px !important;
  line-height: 1.75 !important;
  white-space: pre-wrap !important;
  word-break: break-word !important;
}

.ps-diff-added {
  background: rgba(16, 185, 129, 0.16) !important;
  color: #6EE7B7 !important;
  border-bottom: 2px solid #10B981 !important;
  border-radius: 2px !important;
  padding: 1px 2px !important;
  font-weight: 500 !important;
}

.ps-diff-removed {
  background: rgba(239, 68, 68, 0.15) !important;
  color: #FCA5A5 !important;
  text-decoration: line-through !important;
  opacity: 0.75 !important;
  border-radius: 2px !important;
  padding: 1px 2px !important;
}

.ps-diff-unchanged {
  color: #E2E8F0 !important;
}

/* Floating AI Refinement Bar */
.ps-floating-bar {
  position: absolute !important;
  bottom: 24px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  width: calc(100% - 48px) !important;
  max-width: 800px !important;
  background: rgba(13, 17, 29, 0.95) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(99, 102, 241, 0.35) !important;
  border-radius: 14px !important;
  box-shadow: 0 16px 40px -4px rgba(0, 0, 0, 0.8), 0 0 20px -2px rgba(99, 102, 241, 0.25) !important;
  padding: 12px 16px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
  z-index: 50 !important;
  transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
}

.ps-floating-bar:focus-within {
  border-color: rgba(99, 102, 241, 0.6) !important;
  box-shadow: 0 16px 44px -4px rgba(0, 0, 0, 0.9), 0 0 24px -2px rgba(99, 102, 241, 0.35) !important;
}

/* Preset Pills Row */
.ps-pills-row {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  overflow-x: auto !important;
  padding-bottom: 2px !important;
}

.ps-pills-label {
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #64748B !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  margin-right: 4px !important;
  flex-shrink: 0 !important;
}

.ps-preset-pill {
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  color: #CBD5E1 !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  padding: 4px 11px !important;
  border-radius: 999px !important;
  cursor: pointer !important;
  white-space: nowrap !important;
  transition: all 0.15s ease !important;
}

.ps-preset-pill:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.16) !important;
  border-color: rgba(99, 102, 241, 0.35) !important;
  color: #FFFFFF !important;
}

.ps-preset-pill.active {
  background: rgba(99, 102, 241, 0.28) !important;
  border-color: #6366F1 !important;
  color: #A5B4FC !important;
  font-weight: 600 !important;
}

.ps-preset-pill:disabled {
  opacity: 0.4 !important;
  cursor: not-allowed !important;
}

/* Action Controls Input Row */
.ps-action-row {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  width: 100% !important;
}

.ps-input-field {
  flex: 1 !important;
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 8px !important;
  color: #F8FAFC !important;
  font-size: 13px !important;
  padding: 8px 12px !important;
  outline: none !important;
  transition: border-color 0.15s ease, background 0.15s ease !important;
}

.ps-input-field:focus {
  border-color: rgba(99, 102, 241, 0.5) !important;
  background: rgba(255, 255, 255, 0.08) !important;
}

.ps-input-field::placeholder {
  color: #64748B !important;
}

/* Mic Action Button */
.ps-mic-toggle {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  background: rgba(239, 68, 68, 0.14) !important;
  border: 1px solid rgba(239, 68, 68, 0.35) !important;
  color: #FCA5A5 !important;
  padding: 8px 14px !important;
  border-radius: 8px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
  flex-shrink: 0 !important;
}

.ps-mic-toggle:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.24) !important;
  border-color: rgba(239, 68, 68, 0.6) !important;
  color: #FFFFFF !important;
}

.ps-mic-toggle.recording {
  background: rgba(239, 68, 68, 0.35) !important;
  border-color: #EF4444 !important;
  color: #FFFFFF !important;
  box-shadow: 0 0 14px rgba(239, 68, 68, 0.5) !important;
  animation: ps-pulse-red 1.2s infinite ease-in-out !important;
}

@keyframes ps-pulse-red {
  0%, 100% { box-shadow: 0 0 8px rgba(239, 68, 68, 0.3); }
  50% { box-shadow: 0 0 18px rgba(239, 68, 68, 0.65); }
}

/* In-Place Review Banner & Controls */
.ps-review-banner {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  background: rgba(16, 185, 129, 0.1) !important;
  border: 1px solid rgba(16, 185, 129, 0.25) !important;
  border-radius: 8px !important;
  padding: 8px 12px !important;
  width: 100% !important;
}

.ps-review-info {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  color: #6EE7B7 !important;
}

.ps-review-actions {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.ps-btn-accept {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 6px 14px !important;
  border-radius: 6px !important;
  background: linear-gradient(135deg, #10B981, #059669) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: #FFFFFF !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3) !important;
}

.ps-btn-accept:hover {
  filter: brightness(1.1) !important;
  transform: translateY(-1px) !important;
}

.ps-btn-discard {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 6px 12px !important;
  border-radius: 6px !important;
  background: rgba(239, 68, 68, 0.12) !important;
  border: 1px solid rgba(239, 68, 68, 0.25) !important;
  color: #FCA5A5 !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

.ps-btn-discard:hover {
  background: rgba(239, 68, 68, 0.22) !important;
  color: #FFFFFF !important;
}

.ps-status-notice {
  font-size: 12px !important;
  color: #F87171 !important;
  padding: 6px 10px !important;
  border-radius: 6px !important;
  background: rgba(239, 68, 68, 0.12) !important;
  border: 1px solid rgba(239, 68, 68, 0.25) !important;
  margin-top: 4px !important;
}
`;var wt="zcc-prompt-voice:studio-draft",St=[{id:"clarity",label:"\u2728 Polish Clarity",tone:"formal",prompt:"Fix grammar, remove filler words (um, uh, like), and polish for maximum clarity."},{id:"brief",label:"\u26A1 Executive Brief",tone:"technical",prompt:"Convert this into a concise 3-bullet executive brief followed by immediate next actions."},{id:"spec",label:"\u{1F4D0} Tech Spec RFC",tone:"technical",prompt:"Format into an engineering RFC with sections: Overview, Architecture, Data Flow, and Tradeoffs."},{id:"friendly",label:"\u{1F4AC} Friendly Chat",tone:"conversational",prompt:"Rephrase to sound natural, warm, and friendly for team chat."}];function Et({startSession:t=O}){let e=H(),n=V(),[o,p]=h("Prompt Spec"),[r,c]=h(""),[s,g]=h(!1),[l,u]=h(null),[d,b]=h(!1),[y,w]=h(""),[v,S]=h(""),[L,C]=h(!0),[F,G]=h(null),[T,P]=h(""),[E,tt]=h(!1),[et,_]=h(null),[M,W]=h(!1),[At,nt]=h(0),B=I(null),$=I(null),ot=I(null);N(()=>{try{let i=localStorage.getItem(wt);if(i){let x=JSON.parse(i);x.title&&p(x.title),x.content&&c(x.content)}}catch{}},[]),N(()=>{if(!d)try{localStorage.setItem(wt,JSON.stringify({title:o,content:r}))}catch{}},[o,r,d]),N(()=>()=>{$.current&&clearInterval($.current),B.current&&B.current.cancel()},[]);let Ct=Z(()=>{let i=d?v:r,x=i.trim()?i.trim().split(/\s+/).length:0,R=i.length;return`${x} words \xB7 ${R} chars`},[r,v,d]),Ft=Z(()=>d?vt(y,v):[],[d,y,v]),kt=async()=>{if(M){W(!1),$.current&&clearInterval($.current);let i=B.current;if(B.current=null,!i)return;try{let x=await i.stop(),R=await e.call(q,{audio:x.base64,mimeType:x.mimeType});R.ok&&R.status==="ok"?c(Y=>j(Y,R.text)):R.ok&&R.status==="no-speech"?(_("No speech detected. Try speaking closer to the microphone."),setTimeout(()=>_(null),4e3)):R.ok||_(R.message)}catch(x){_(x instanceof Error?x.message:"Transcription failed.")}}else{_(null),nt(0);try{let i=await t();B.current=i,W(!0),$.current=setInterval(()=>{nt(x=>x+1)},1e3)}catch(i){W(!1),_(i instanceof Error?i.message:"Microphone access denied.")}}},U=async i=>{let x=r.trim();if(!x||E)return;let R=St.find(D=>D.id===(i||F)),Y=T.trim()||R?.prompt||"Polish and format for clarity.";_(null),tt(!0);try{let D=await e.call(ct,{text:x,tone:R?.tone||"technical",customPrompt:Y});D.ok?(w(x),S(D.text),b(!0),C(!0)):_(D.message)}catch(D){_(D instanceof Error?D.message:"Refinement request failed.")}finally{tt(!1)}},rt=()=>{c(v),b(!1),w(""),S("")},K=()=>{b(!1),w(""),S("")},Tt=async()=>{let i=d?v:r;if(i)try{await navigator.clipboard.writeText(i),g(!0),setTimeout(()=>g(!1),2e3)}catch{}},_t=()=>{let i=d?v:r;i&&(n.updateText(x=>j(x,i)),n.focus(),u("Inserted into thread composer!"),setTimeout(()=>u(null),3e3))},It=()=>{d?K():r.trim()&&c("")},Pt=A(i=>{(i.ctrlKey||i.metaKey)&&i.key==="k"&&(i.preventDefault(),ot.current?.focus()),d&&((i.ctrlKey||i.metaKey)&&i.key==="Enter"?(i.preventDefault(),rt()):i.key==="Escape"&&(i.preventDefault(),K()))},[d,v]);return f("div",{className:"ps-root",onKeyDown:Pt,style:{display:"flex",flexDirection:"column",width:"100%",height:"100%",minHeight:"100vh",background:"#090D16",color:"#F8FAFC",position:"relative"},children:[a("style",{dangerouslySetInnerHTML:{__html:yt}}),f("header",{className:"ps-header",style:{display:"flex",alignItems:"center",justifyContent:"space-between",height:"52px",padding:"0 24px",background:"#0D111D",borderBottom:"1px solid rgba(255, 255, 255, 0.08)",flexShrink:0},children:[f("div",{className:"ps-header-left",style:{display:"flex",alignItems:"center",gap:"12px"},children:[a("div",{className:"ps-logo-badge",style:{display:"flex",alignItems:"center",justifyContent:"center",width:"28px",height:"28px",borderRadius:"7px",background:"linear-gradient(135deg, #6366F1, #8B5CF6)",color:"#FFFFFF",fontSize:"14px"},children:"\u2728"}),a("span",{className:"ps-title",style:{fontSize:"15px",fontWeight:600,color:"#F8FAFC"},children:"Prompt Studio"}),a("span",{className:"ps-badge",style:{fontSize:"11px",fontWeight:500,padding:"2px 8px",borderRadius:"999px",background:"rgba(99, 102, 241, 0.12)",color:"#A5B4FC",border:"1px solid rgba(99, 102, 241, 0.25)"},children:"Inline Canvas"}),a("span",{className:"ps-telemetry-tag",style:{fontSize:"12px",color:"#94A3B8",fontFamily:"ui-monospace, monospace"},children:Ct})]}),f("div",{className:"ps-header-right",style:{display:"flex",alignItems:"center",gap:"10px"},children:[l&&a("span",{style:{fontSize:12,color:"#34d399",fontWeight:500},children:l}),a("button",{type:"button",className:"ps-btn-ghost",onClick:Tt,disabled:!r&&!v,title:"Copy prompt to clipboard",style:{display:"inline-flex",alignItems:"center",gap:"6px",padding:"6px 12px",borderRadius:"6px",background:"rgba(255, 255, 255, 0.05)",border:"1px solid rgba(255, 255, 255, 0.08)",color:"#CBD5E1",fontSize:"12px",fontWeight:500,cursor:"pointer"},children:s?"\u2713 Copied":"\u{1F4CB} Copy"}),a("button",{type:"button",className:"ps-btn-ghost",onClick:It,disabled:!r&&!v,title:"Clear prompt canvas",style:{display:"inline-flex",alignItems:"center",gap:"6px",padding:"6px 12px",borderRadius:"6px",background:"rgba(255, 255, 255, 0.05)",border:"1px solid rgba(255, 255, 255, 0.08)",color:"#CBD5E1",fontSize:"12px",fontWeight:500,cursor:"pointer"},children:"\u{1F5D1}\uFE0F Clear"}),a("button",{type:"button",className:"ps-btn-primary",onClick:_t,disabled:!r&&!v,title:"Insert directly into the active chat composer",style:{display:"inline-flex",alignItems:"center",gap:"6px",padding:"6px 14px",borderRadius:"6px",background:"linear-gradient(135deg, #6366F1, #8B5CF6)",border:"1px solid rgba(255, 255, 255, 0.2)",color:"#FFFFFF",fontSize:"12px",fontWeight:600,cursor:"pointer"},children:"\u{1F4AC} Insert into Composer"})]})]}),a("main",{className:"ps-canvas-scroll",style:{flex:1,overflowY:"auto",padding:"40px 24px 160px 24px",display:"flex",justifyContent:"center",background:"#090D16"},children:f("div",{className:"ps-canvas",style:{width:"100%",maxWidth:"800px",display:"flex",flexDirection:"column",gap:"20px"},children:[a("input",{type:"text",className:"ps-doc-title",value:o,onChange:i=>p(i.target.value),placeholder:"Untitled Prompt Spec...",style:{width:"100%",background:"transparent",border:"none",fontSize:"26px",fontWeight:700,color:"#F8FAFC",outline:"none",padding:0,margin:0}}),a("div",{className:"ps-doc-divider",style:{width:"100%",height:"1px",background:"rgba(255, 255, 255, 0.08)"}}),et&&a("div",{className:"ps-status-notice",children:et}),d?a("div",{className:"ps-diff-container",children:L?Ft.map((i,x)=>i.type==="added"?a("span",{className:"ps-diff-added",children:i.text},x):i.type==="removed"?a("span",{className:"ps-diff-removed",children:i.text},x):a("span",{className:"ps-diff-unchanged",children:i.text},x)):a("div",{style:{color:"#E2E8F0",whiteSpace:"pre-wrap",lineHeight:1.75},children:v})}):a("textarea",{className:"ps-doc-editor",value:r,onChange:i=>c(i.target.value),placeholder:"Type your raw thoughts or click Dictate in the toolbar below to capture speech...",rows:12,style:{width:"100%",minHeight:"280px",background:"transparent",border:"none",outline:"none",color:"#E2E8F0",fontSize:"15px",lineHeight:1.7,resize:"vertical",fontFamily:"inherit",padding:0}})]})}),a("footer",{className:"ps-floating-bar",style:{position:"absolute",bottom:"24px",left:"50%",transform:"translateX(-50%)",width:"calc(100% - 48px)",maxWidth:"800px",background:"rgba(13, 17, 29, 0.95)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:"1px solid rgba(99, 102, 241, 0.35)",borderRadius:"14px",padding:"12px 16px",display:"flex",flexDirection:"column",gap:"10px",zIndex:50},children:d?f("div",{className:"ps-review-banner",style:{display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(16, 185, 129, 0.1)",border:"1px solid rgba(16, 185, 129, 0.25)",borderRadius:"8px",padding:"8px 12px",width:"100%"},children:[f("div",{className:"ps-review-info",style:{display:"flex",alignItems:"center",gap:"8px",color:"#6EE7B7"},children:[a("span",{children:"\u2728 Refinement Ready"}),a("button",{type:"button",className:"ps-preset-pill",onClick:()=>C(i=>!i),style:{fontSize:11,padding:"2px 8px",background:"rgba(255, 255, 255, 0.08)",border:"1px solid rgba(255, 255, 255, 0.15)",color:"#CBD5E1",borderRadius:"999px",cursor:"pointer"},children:L?"\u{1F441}\uFE0F View Clean":"\u{1F50D} View Diff"})]}),f("div",{className:"ps-review-actions",style:{display:"flex",alignItems:"center",gap:"8px"},children:[a("button",{type:"button",className:"ps-btn-ghost",onClick:()=>U(),disabled:E,style:{fontSize:11,background:"transparent",border:"1px solid rgba(255, 255, 255, 0.1)",color:"#CBD5E1",padding:"5px 10px",borderRadius:"6px",cursor:"pointer"},children:"\u{1F504} Try Again"}),a("button",{type:"button",className:"ps-btn-discard",onClick:K,title:"Discard refinement (Esc)",style:{display:"inline-flex",alignItems:"center",gap:"6px",padding:"6px 12px",borderRadius:"6px",background:"rgba(239, 68, 68, 0.12)",border:"1px solid rgba(239, 68, 68, 0.25)",color:"#FCA5A5",fontSize:"12px",fontWeight:500,cursor:"pointer"},children:"\u2715 Discard (Esc)"}),a("button",{type:"button",className:"ps-btn-accept",onClick:rt,title:"Accept refined text (Enter)",style:{display:"inline-flex",alignItems:"center",gap:"6px",padding:"6px 14px",borderRadius:"6px",background:"linear-gradient(135deg, #10B981, #059669)",border:"1px solid rgba(255, 255, 255, 0.2)",color:"#FFFFFF",fontSize:"12px",fontWeight:600,cursor:"pointer"},children:"\u2713 Accept (Enter)"})]})]}):f(z,{children:[f("div",{className:"ps-pills-row",style:{display:"flex",alignItems:"center",gap:"8px",overflowX:"auto"},children:[a("span",{className:"ps-pills-label",style:{fontSize:"11px",fontWeight:600,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.05em",marginRight:"4px",flexShrink:0},children:"Presets:"}),St.map(i=>a("button",{type:"button",className:`ps-preset-pill${F===i.id?" active":""}`,onClick:()=>{G(i.id),U(i.id)},disabled:!r.trim()||E,style:{display:"inline-flex",alignItems:"center",gap:"5px",background:F===i.id?"rgba(99, 102, 241, 0.28)":"rgba(255, 255, 255, 0.05)",border:F===i.id?"1px solid #6366F1":"1px solid rgba(255, 255, 255, 0.08)",color:F===i.id?"#A5B4FC":"#CBD5E1",fontSize:"12px",fontWeight:F===i.id?600:500,padding:"4px 11px",borderRadius:"999px",cursor:r.trim()&&!E?"pointer":"not-allowed",whiteSpace:"nowrap",opacity:r.trim()&&!E?1:.4},children:i.label},i.id))]}),f("div",{className:"ps-action-row",style:{display:"flex",alignItems:"center",gap:"8px",width:"100%"},children:[f("button",{type:"button",className:`ps-mic-toggle${M?" recording":""}`,onClick:kt,title:M?"Stop dictation":"Start dictation",style:{display:"inline-flex",alignItems:"center",gap:"6px",background:M?"rgba(239, 68, 68, 0.35)":"rgba(239, 68, 68, 0.14)",border:M?"1px solid #EF4444":"1px solid rgba(239, 68, 68, 0.35)",color:"#FCA5A5",padding:"8px 14px",borderRadius:"8px",fontSize:"12px",fontWeight:600,cursor:"pointer",flexShrink:0},children:[a("span",{children:"\u{1F399}\uFE0F"}),a("span",{children:M?`Listening (${At}s)...`:"Dictate"})]}),a("input",{ref:ot,type:"text",className:"ps-input-field",value:T,onChange:i=>P(i.target.value),onKeyDown:i=>{i.key==="Enter"&&(i.ctrlKey||i.metaKey||!i.shiftKey)&&(i.preventDefault(),U())},placeholder:"Ask AI to refine, transform tone, or add requirements (Ctrl+K)...",disabled:E,style:{flex:1,background:"rgba(255, 255, 255, 0.05)",border:"1px solid rgba(255, 255, 255, 0.1)",borderRadius:"8px",color:"#F8FAFC",fontSize:"13px",padding:"8px 12px",outline:"none"}}),a("button",{type:"button",className:"ps-btn-primary",onClick:()=>U(),disabled:!r.trim()||E,style:{display:"inline-flex",alignItems:"center",gap:"6px",padding:"8px 16px",borderRadius:"8px",background:"linear-gradient(135deg, #6366F1, #8B5CF6)",border:"1px solid rgba(255, 255, 255, 0.2)",color:"#FFFFFF",fontSize:"12px",fontWeight:600,cursor:r.trim()&&!E?"pointer":"not-allowed",opacity:r.trim()&&!E?1:.4,flexShrink:0},children:E?"Refining\u2026":"Refine"})]})]})})]})}var Rt="prompt-studio",gn=pt(t=>{Q(),t.composer.customize({id:"prompt-voice-mic",actions:[{id:"prompt-voice-mic",component:bt}]}),t.slots.navPanel?.({id:"prompt-studio",title:"Prompt Studio",icon:"Sparkles",path:Rt,component:Et}),t.slots.commandPaletteAction?.({id:"open-prompt-studio",title:"Prompt Studio: Open Canvas",run:e=>{e.navigate?.(`/${Rt}`)}})});export{Rt as PROMPT_STUDIO_PANEL_PATH,gn as default};
//# sourceMappingURL=app.js.map
