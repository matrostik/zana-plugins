function nt(){return globalThis.__ZCC_PLUGIN_RUNTIME__??{}}function ot(t){throw new Error(`${t} is not available until the host plugin runtime is installed`)}function rt(t){return{__zccPluginApp:!0,setup:t}}function U(){return nt().useRpc?.()??ot("useRpc")}function V(){return nt().useComposer?.()??ot("useComposer")}var Lt=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4"];var C=class extends Error{code;constructor(e,o){super(o),this.name="RecordingError",this.code=e}};function Ot(t){return Lt.find(e=>t(e))??null}var Mt="audio/webm";function zt(){return{getUserMedia:t=>navigator.mediaDevices.getUserMedia(t),createRecorder:(t,e)=>new MediaRecorder(t,e?{mimeType:e}:void 0),isTypeSupported:t=>typeof MediaRecorder<"u"&&MediaRecorder.isTypeSupported(t)}}async function $t(t){try{return await t.getUserMedia({audio:!0})}catch(e){let o=e instanceof Error?e.name:"";throw o==="NotAllowedError"||o==="SecurityError"?new C("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again."):new C("MIC_UNAVAILABLE","No microphone is available. Connect one and try again.")}}function Bt(t){return new Promise((e,o)=>{let i=new FileReader;i.onload=()=>{let s=typeof i.result=="string"?i.result:"";e(s.slice(s.indexOf(",")+1))},i.onerror=()=>o(new C("RECORDING_FAILED","The recording could not be read.")),i.readAsDataURL(t)})}async function Ft(t,e){let o=new Blob(t,{type:e});return{base64:await Bt(o),mimeType:o.type||e}}function jt(t,e){if(!(t>0&&Number.isFinite(t)))return()=>{};let o=setTimeout(e,t);return()=>clearTimeout(o)}var Ut="That recording is too large to transcribe. Keep dictation shorter and try again.";function Vt(t,e){let o=Math.max(e,t),i=[],s=0,a=!1;return{chunks:i,get overflowed(){return a},add(l){return l.size===0||a?"ignored":s+l.size>o?(a=!0,"overflow"):(i.push(l),s+=l.size,s>=t?"limit-reached":"accepted")}}}function Ht(t,e){let o=new Promise((i,s)=>{t.onstop=()=>i(),t.onerror=()=>{let a=new C("RECORDING_FAILED","Recording stopped unexpectedly. Try again.");e(a),s(a)}});return o.catch(()=>{}),o}function qt(t,e,o,i){let s=Ht(t,i);return t.ondataavailable=a=>{let l=e.add(a.data);(l==="limit-reached"||l==="overflow")&&o()},t.start(1e3),s}async function Gt(t,e,o,i){try{await t}finally{e()}if(o.overflowed)throw new C("RECORDING_FAILED",Ut);return Ft(o.chunks,i)}function Zt(t){let e=()=>{};return{stopRecorder(){e(),t.state!=="inactive"&&t.stop()},armTimer(o,i){e=jt(o,i)}}}function Kt(t,e){let o=null;return{attach(i){o=i},detach(){o=null},autoStop(){t();let i=o?.onAutoStop;o&&(o.onAutoStop=void 0),i?.()},fail(i){t(),e();let s=o?.onError;o=null,s?.(i)}}}function Yt(t,e,o,i){let s=Vt(i.maxBytes??9437184,i.hardMaxBytes??10485760),{stopRecorder:a,armTimer:l}=Zt(t),r=Kt(a,e);l(i.maxDurationMs??12e4,r.autoStop);let b=qt(t,s,r.autoStop,r.fail),d={onError:i.onError,onAutoStop:i.onAutoStop,async stop(){a();try{return await Gt(b,e,s,t.mimeType||o)}finally{r.detach()}},cancel(){a(),e(),r.detach()}};return r.attach(d),d}var O=()=>Wt();async function Wt(t=zt(),e={}){let o=await $t(t),i=Xt(o),s=o.getTracks(),a,l=()=>{for(let r of s)a&&r.removeEventListener?.("ended",a);i?.close(),s.forEach(r=>r.stop())};try{let r=Ot(t.isTypeSupported)??Mt,b=t.createRecorder(o,r),d=Yt(b,l,r,e);return d.getAudioLevel=()=>i?.level()??null,a=()=>{let f=d.onError;d.cancel(),f?.(new C("MIC_UNAVAILABLE","Microphone disconnected. Check your device and try again."))},s.forEach(f=>f.addEventListener?.("ended",a)),d}catch(r){throw l(),r instanceof C?r:new C("RECORDING_FAILED",r instanceof Error?r.message:"The recording could not be started.")}}function Xt(t){let e;try{e=new AudioContext;let o=e.createMediaStreamSource(t),i=e.createAnalyser();i.fftSize=256,o.connect(i);let s=new Uint8Array(i.fftSize),a=e,l=!1;return{level(){if(a.state&&a.state!=="running")return null;i.getByteTimeDomainData(s);let r=s.reduce((b,d)=>b+((d-128)/128)**2,0)/s.length;return Math.min(1,Math.sqrt(r)*5)},close(){l||(l=!0,o.disconnect(),a.close().catch(r=>console.error("Prompt Voice audio meter cleanup failed",r)))}}}catch(o){return e&&e.close().catch(i=>console.error("Prompt Voice audio meter cleanup failed",i)),console.warn("Prompt Voice audio meter unavailable",o),null}}var u=globalThis.__ZCC_HOST_REACT__;var ue=u.Children,fe=u.Component,be=u.Fragment,ge=u.StrictMode,he=u.Suspense,xe=u.cloneElement,ve=u.createContext,ye=u.createElement,we=u.createRef,Se=u.forwardRef,Re=u.isValidElement,Ee=u.lazy,Te=u.memo,ke=u.startTransition,E=u.useCallback,Ae=u.useContext,Ce=u.useDebugValue,Ne=u.useDeferredValue,L=u.useEffect,Ie=u.useId,_e=u.useImperativeHandle,Pe=u.useInsertionEffect,De=u.useLayoutEffect,H=u.useMemo,it=u.useReducer,N=u.useRef,y=u.useState,Le=u.useSyncExternalStore,Oe=u.useTransition,Me=u.version;var q="promptVoice.transcribe";var at="promptVoice.rephrase";function F(t,e){let o=e.trim();return o?t?/\s$/.test(t)?`${t}${o}`:`${t} ${o}`:o:t}var Jt="No speech detected.",Y={phase:"idle",notice:null,error:null};function st(t,e){switch(e.type){case"START":return t.phase==="idle"||t.phase==="error"?{phase:"starting",notice:null,error:null}:t;case"STARTED":return t.phase==="starting"?{...t,phase:"recording"}:t;case"STOP":return t.phase==="recording"||t.phase==="starting"?{phase:"processing",notice:null,error:null}:t;case"CANCEL":return t.phase==="recording"||t.phase==="starting"?{...Y}:t;case"SUCCESS":case"NO_SPEECH":return t.phase!=="processing"?t:{phase:"idle",notice:e.type==="NO_SPEECH"?Jt:e.notice,error:null};case"CLEAR_NOTICE":return t.notice?{...t,notice:null}:t;case"FAILURE":return{phase:"error",notice:null,error:e.message}}}var Qt="Prompt Voice returned an unexpected response. Try again.",te="Dictation failed. Try again.",ee=4e3;function ne(t){return typeof t=="object"&&t!==null&&typeof t.ok=="boolean"}async function oe(t,e){let o=await t.call(q,{audio:e.base64,mimeType:e.mimeType});if(!ne(o))throw new Error(Qt);return o}function pt(t){return t instanceof Error&&t.message?t.message:te}function re(t,e,o){if(!t.ok){o({type:"FAILURE",message:t.message});return}if(t.status==="no-speech"){o({type:"NO_SPEECH"});return}e.updateText(s=>F(s,t.text)),e.focus();let i=t.refineNotice?`Inserted the raw transcript. ${t.refineNotice.message}`:"Added to draft.";o({type:"SUCCESS",notice:i})}function ie(t,e,o,i){return e()?(t.onError=s=>{e()&&i(s)},t.onAutoStop=()=>{e()&&o()},t):(t.cancel(),null)}function ae(t,e,o,i,s){let a=l=>s({type:"FAILURE",message:pt(l)});return t.then(l=>{let r=ie(l,o,i,b=>{e.current=null,a(b)});return r&&(e.current=r),r},l=>(o()&&a(l),null))}function se(t,e){let o=N(null),i=N(null),s=N(0),a=N(!0),l=E(()=>{s.current++,i.current=null,o.current&&(o.current.cancel(),o.current=null),e({type:"CANCEL"})},[e]);L(()=>(a.current=!0,()=>{a.current=!1,l()}),[l]);let r=E(async()=>{let h=i.current?await i.current:o.current;return o.current=null,h},[]),b=E(async h=>{let g=++s.current,v=()=>a.current&&s.current===g,w=ae(t(),o,v,h,e);i.current=w,await w&&v()&&e({type:"STARTED"}),i.current===w&&(i.current=null)},[e,t]),d=E(()=>a.current,[]),f=E(()=>o.current?.getAudioLevel?.()??null,[]);return{start:b,takeSession:r,cancel:l,isMounted:d,getAudioLevel:f}}function ct({startSession:t=O,noticeDurationMs:e=ee}={}){let o=V(),i=U(),[s,a]=it(st,Y),{start:l,takeSession:r,cancel:b,isMounted:d,getAudioLevel:f}=se(t,a),[h,g]=y(null),[v,w]=y(0),[_,S]=y(!1);L(()=>{if(s.phase!=="recording"){g(null),w(0);return}let I=Date.now(),x=()=>{g(f()),w(Math.floor((Date.now()-I)/1e3))};x();let T=setInterval(x,100);return()=>clearInterval(T)},[f,s.phase]),L(()=>{if(!s.notice)return;let I=setTimeout(()=>{a({type:"CLEAR_NOTICE"})},e);return()=>clearTimeout(I)},[e,s.notice]);let P=E(()=>{a({type:"CLEAR_NOTICE"})},[]),k=E(async()=>{a({type:"STOP"});let I=await r();if(!(!d()||!I))try{let x=await I.stop();if(!d())return;let T=await oe(i,x);if(!d())return;re(T,o,a)}catch(x){if(!d())return;a({type:"FAILURE",message:pt(x)})}},[o,d,i,r]),R=E(async()=>{S(!1),a({type:"START"}),await l(()=>{S(!0),k()})},[k,l]),j=E(()=>{s.phase==="recording"||s.phase==="starting"?k():s.phase!=="processing"&&R()},[R,k,s.phase]);return{phase:s.phase,error:s.error,notice:s.notice,level:h,seconds:v,autoStopped:_,onClick:j,cancel:b,clearNotice:P,beginDictation:R,finishDictation:k}}var W=`/* Base Container */\r
.pv-mic {\r
  display: inline-flex;\r
  align-items: center;\r
  height: 36px;\r
  box-sizing: border-box;\r
  vertical-align: middle;\r
  background: transparent;\r
  border: none;\r
  user-select: none;\r
  position: relative;\r
}\r
\r
.pv-sr-only {\r
  position: absolute;\r
  width: 1px;\r
  height: 1px;\r
  padding: 0;\r
  margin: -1px;\r
  overflow: hidden;\r
  clip: rect(0, 0, 0, 0);\r
  white-space: nowrap;\r
  border: 0;\r
}\r
\r
/* Base button reset */\r
.pv-mic-button {\r
  box-sizing: border-box;\r
  font: inherit;\r
}\r
\r
.pv-mic-button:focus-visible {\r
  outline: 2px solid var(--focus-ring, #4a90e2);\r
  outline-offset: 2px;\r
}\r
\r
.pv-mic-button:disabled {\r
  opacity: 0.6;\r
  cursor: progress;\r
}\r
\r
/* Dictation Pill Container: shared morphing capsule across all phases */\r
.pv-dictation-pill {\r
  display: inline-flex;\r
  align-items: center;\r
  height: 36px;\r
  border-radius: 9999px;\r
  background: var(--pv-pill-bg, #181920);\r
  border: 1px solid var(--pv-pill-border, rgba(239, 68, 68, 0.35));\r
  transition: width 0.28s cubic-bezier(0.16, 1, 0.3, 1),\r
              border-color 0.25s ease,\r
              box-shadow 0.25s ease,\r
              background 0.25s ease,\r
              padding 0.25s cubic-bezier(0.16, 1, 0.3, 1),\r
              transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);\r
  box-sizing: border-box;\r
}\r
\r
/* 1. Idle: Oval Capsule Pill with Signature Crimson Border containing only the mic icon */\r
.pv-mic.pv-phase-idle {\r
  width: 58px;\r
  height: 36px;\r
  border-radius: 9999px;\r
  background: var(--pv-pill-bg, #181920);\r
  border: 1px solid rgba(239, 68, 68, 0.35);\r
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.12);\r
  padding: 0;\r
  justify-content: center;\r
  cursor: pointer;\r
}\r
\r
.pv-mic.pv-phase-idle:hover {\r
  background: #20222c;\r
  border-color: rgba(239, 68, 68, 0.75);\r
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.28);\r
  transform: scale(1.04);\r
}\r
\r
.pv-mic.pv-phase-idle:active {\r
  transform: scale(0.97);\r
}\r
\r
.pv-mic.pv-phase-idle .pv-idle-icon {\r
  display: inline-flex;\r
  align-items: center;\r
  justify-content: center;\r
  width: 100%;\r
  height: 100%;\r
  border-radius: 9999px;\r
  background: transparent;\r
  border: none;\r
  box-shadow: none;\r
  color: var(--text-secondary, #cbd5e1);\r
  cursor: pointer;\r
  padding: 0;\r
  transition: color 0.15s ease;\r
}\r
\r
.pv-mic.pv-phase-idle:hover .pv-idle-icon {\r
  color: #ffffff;\r
}\r
\r
/* 2. Starting Oval: extends smoothly */\r
.pv-mic.pv-phase-starting {\r
  width: auto;\r
  border-radius: 9999px;\r
  border-color: rgba(234, 179, 8, 0.45);\r
  box-shadow: 0 0 14px rgba(234, 179, 8, 0.15);\r
  padding: 0 4px 0 10px;\r
  gap: 10px;\r
}\r
\r
/* 3. Recording / Listening Oval: extends with red glow */\r
.pv-mic.pv-phase-recording {\r
  width: auto;\r
  border-radius: 9999px;\r
  border-color: rgba(239, 68, 68, 0.45);\r
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.18), 0 4px 16px rgba(0, 0, 0, 0.4);\r
  padding: 0 4px 0 10px;\r
  gap: 10px;\r
}\r
\r
/* 4. Processing Oval */\r
.pv-mic.pv-phase-processing {\r
  width: auto;\r
  border-radius: 9999px;\r
  border-color: rgba(56, 189, 248, 0.4);\r
  box-shadow: 0 0 14px rgba(56, 189, 248, 0.15);\r
  padding: 0 6px 0 10px;\r
  gap: 10px;\r
}\r
\r
/* 5. Notice Oval: same control showing completion */\r
.pv-mic.pv-has-notice {\r
  width: auto;\r
  border-radius: 9999px;\r
  border-color: rgba(34, 197, 94, 0.45);\r
  box-shadow: 0 0 16px rgba(34, 197, 94, 0.15);\r
  padding: 0 14px 0 12px;\r
  gap: 8px;\r
  cursor: pointer;\r
}\r
\r
.pv-mic.pv-has-notice:hover {\r
  border-color: rgba(34, 197, 94, 0.75);\r
  background: rgba(34, 197, 94, 0.08);\r
}\r
\r
.pv-notice-content {\r
  display: inline-flex;\r
  align-items: center;\r
  gap: 8px;\r
  animation: pv-notice-enter 0.2s cubic-bezier(0.16, 1, 0.3, 1);\r
}\r
\r
.pv-notice-check {\r
  color: #4ade80;\r
  font-weight: 700;\r
  font-size: 13px;\r
}\r
\r
@keyframes pv-notice-enter {\r
  from { opacity: 0; transform: scale(0.96) translateX(-3px); }\r
  to { opacity: 1; transform: scale(1) translateX(0); }\r
}\r
\r
/* Flex ordering for active pill children */\r
.pv-mic-active .pv-pill-timer-badge {\r
  order: 1;\r
}\r
\r
.pv-mic-active .pv-pill-center {\r
  order: 2;\r
}\r
\r
.pv-mic-active .pv-mic-button.pv-pill-btn-stop {\r
  order: 3;\r
}\r
\r
.pv-mic-active .pv-pill-btn-cancel {\r
  order: 4;\r
}\r
\r
/* Timer Badge */\r
.pv-pill-timer-badge {\r
  display: inline-flex;\r
  align-items: center;\r
  gap: 6px;\r
  background: rgba(255, 255, 255, 0.08);\r
  border: 1px solid rgba(255, 255, 255, 0.04);\r
  border-radius: 9999px;\r
  padding: 2px 8px 2px 6px;\r
}\r
\r
.pv-pill-dot {\r
  width: 7px;\r
  height: 7px;\r
  border-radius: 50%;\r
  background: var(--danger-color, #ef4444);\r
  box-shadow: 0 0 8px var(--danger-color, #ef4444);\r
  animation: pv-pulse-dot 1.4s ease-in-out infinite;\r
}\r
\r
.pv-pill-dot-starting {\r
  background: #eab308;\r
  box-shadow: 0 0 8px #eab308;\r
}\r
\r
@keyframes pv-pulse-dot {\r
  0%, 100% { opacity: 1; transform: scale(1); }\r
  50% { opacity: 0.4; transform: scale(0.85); }\r
}\r
\r
.pv-pill-timer-text {\r
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;\r
  font-size: 12px;\r
  font-weight: 600;\r
  color: #f8fafc;\r
  letter-spacing: 0.02em;\r
}\r
\r
/* Center area */\r
.pv-pill-center {\r
  display: inline-flex;\r
  align-items: center;\r
  gap: 8px;\r
}\r
\r
.pv-pill-waveform {\r
  display: inline-flex;\r
  align-items: center;\r
  gap: 2.5px;\r
  height: 16px;\r
}\r
\r
.pv-pill-waveform-bar {\r
  width: 3px;\r
  background: #38bdf8;\r
  border-radius: 9999px;\r
  box-shadow: 0 0 6px rgba(56, 189, 248, 0.4);\r
  transition: height 0.08s ease;\r
  min-height: 3px;\r
  height: 5px;\r
}\r
\r
.pv-pill-waveform.animated .pv-pill-waveform-bar:nth-child(1) { animation: pv-wave 0.8s ease-in-out infinite alternate; }\r
.pv-pill-waveform.animated .pv-pill-waveform-bar:nth-child(2) { animation: pv-wave 0.6s ease-in-out infinite alternate 0.15s; }\r
.pv-pill-waveform.animated .pv-pill-waveform-bar:nth-child(3) { animation: pv-wave 0.7s ease-in-out infinite alternate 0.3s; }\r
.pv-pill-waveform.animated .pv-pill-waveform-bar:nth-child(4) { animation: pv-wave 0.5s ease-in-out infinite alternate 0.2s; }\r
.pv-pill-waveform.animated .pv-pill-waveform-bar:nth-child(5) { animation: pv-wave 0.9s ease-in-out infinite alternate 0.05s; }\r
\r
@keyframes pv-wave {\r
  0% { height: 4px; }\r
  100% { height: 14px; }\r
}\r
\r
.pv-pill-status {\r
  font-size: 13px;\r
  font-weight: 500;\r
  color: #e2e8f0;\r
  white-space: nowrap;\r
}\r
\r
.pv-mic-quiet-warning {\r
  font-size: 11px;\r
  color: #fbbf24;\r
}\r
\r
/* Stop button inside active pill */\r
.pv-mic-button.pv-pill-btn-stop {\r
  width: 28px;\r
  height: 28px;\r
  border-radius: 50%;\r
  background: rgba(239, 68, 68, 0.22);\r
  border: 1px solid rgba(239, 68, 68, 0.55);\r
  display: inline-flex;\r
  align-items: center;\r
  justify-content: center;\r
  cursor: pointer;\r
  color: #f87171;\r
  padding: 0;\r
  transition: all 0.15s ease;\r
}\r
\r
.pv-mic-button.pv-pill-btn-stop:hover {\r
  background: rgba(239, 68, 68, 0.38);\r
  border-color: rgba(239, 68, 68, 0.8);\r
  color: #ffffff;\r
  transform: scale(1.05);\r
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);\r
}\r
\r
/* Cancel button inside active pill */\r
.pv-pill-btn-cancel {\r
  width: 28px;\r
  height: 28px;\r
  border-radius: 50%;\r
  background: rgba(255, 255, 255, 0.08);\r
  border: 1px solid rgba(255, 255, 255, 0.06);\r
  display: inline-flex;\r
  align-items: center;\r
  justify-content: center;\r
  cursor: pointer;\r
  color: #94a3b8;\r
  padding: 0;\r
  transition: all 0.15s ease;\r
}\r
\r
.pv-pill-btn-cancel:hover {\r
  background: rgba(255, 255, 255, 0.16);\r
  color: #f1f5f9;\r
  transform: scale(1.05);\r
}\r
\r
/* Spinner */\r
.pv-mic-spinner {\r
  display: inline-block;\r
  width: 12px;\r
  height: 12px;\r
  border: 2px solid currentColor;\r
  border-right-color: transparent;\r
  border-radius: 50%;\r
  animation: pv-spin 0.8s linear infinite;\r
  vertical-align: middle;\r
}\r
\r
@keyframes pv-spin {\r
  to { transform: rotate(360deg); }\r
}\r
\r
/* Error styles */\r
.pv-mic.pv-phase-error {\r
  width: auto;\r
  border-radius: 9999px;\r
  border-color: rgba(239, 68, 68, 0.7);\r
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.25);\r
  padding: 0 10px;\r
}\r
\r
.pv-mic-error {\r
  color: var(--danger-color, #ef4444);\r
}\r
\r
@media (prefers-reduced-motion: reduce) {\r
  .pv-pill-waveform.animated .pv-pill-waveform-bar { animation: none; height: 8px; }\r
  .pv-pill-waveform-bar { transition: none; }\r
  .pv-mic-spinner { animation: none; }\r
}

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
`;var lt=globalThis.__ZCC_HOST_REACT__,G=lt.Fragment;function n(t,e,o){return lt.createElement(t,o===void 0?e:{...e,key:o})}var p=n;var ce="Dictation",dt="zcc-ext-prompt-voice-styles";function X(){if(typeof document>"u")return;let t=document.getElementById(dt);t||(t=document.createElement("style"),t.id=dt,document.head.appendChild(t)),t.textContent!==W&&(t.textContent=W)}var le={idle:"Start dictation",starting:"Stop dictation",recording:"Stop dictation",processing:"Transcribing",error:"Start dictation"},mt={position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",border:0};function ut({startSession:t=O}){X();let{phase:e,error:o,notice:i,onClick:s,cancel:a,clearNotice:l,level:r,seconds:b,autoStopped:d}=ct({startSession:t}),f=e==="starting"||e==="recording"||e==="processing",h=e==="idle"&&!!i,g=`${Math.floor(b/60)}:${String(b%60).padStart(2,"0")}`;return p("div",{className:`pv-mic pv-dictation-pill pv-phase-${e} ${h?"pv-has-notice":""}`,onClick:h?l:void 0,title:h?"Click to dismiss":void 0,children:[n("button",{type:"button",className:`pv-mic-button pv-mic-${e} ${f?"pv-pill-btn-stop":"pv-idle-icon"}`,"aria-label":ce,"aria-pressed":e==="recording"||e==="starting",title:le[e],disabled:e==="processing",onClick:s,style:h?{display:"none"}:void 0,children:e==="idle"||e==="error"?n("svg",{viewBox:"0 0 24 24",width:"16",height:"16","aria-hidden":"true",focusable:"false",children:n("path",{d:"M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5Zm6 9h2v-3h-2v3Z",fill:"currentColor"})}):e==="processing"?n("span",{className:"pv-mic-spinner","aria-hidden":"true"}):n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("rect",{x:"6",y:"6",width:"12",height:"12",rx:"2.5",fill:"currentColor"})})}),h?p("span",{role:"status",className:"pv-notice-content",children:[n("span",{className:"pv-notice-check",children:"\u2713"}),n("span",{className:"pv-pill-status",children:i})]}):null,e==="starting"?p(G,{children:[p("div",{className:"pv-pill-timer-badge",children:[n("div",{className:"pv-pill-dot pv-pill-dot-starting"}),n("span",{className:"pv-pill-timer-text",children:"0:00"})]}),p("div",{className:"pv-pill-center",role:"status",children:[n("span",{className:"pv-mic-spinner","aria-hidden":"true"}),n("span",{className:"pv-pill-status",children:"Requesting microphone\u2026"})]})]}):null,e==="recording"?p(G,{children:[p("div",{className:"pv-pill-timer-badge",children:[n("div",{className:"pv-pill-dot"}),p("span",{className:"pv-pill-timer-text",children:[n("span",{className:"pv-sr-only",style:mt,children:"Recording "}),g]})]}),p("div",{className:"pv-pill-center",role:"status",children:[r===null?n("span",{className:"pv-sr-only",style:mt,children:"Audio meter unavailable"}):null,n("span",{className:`pv-pill-waveform ${r===null?"animated":""}`,"aria-label":"Microphone audio activity",role:"meter","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":Math.round((r??.3)*100),children:[.4,.7,1,.7,.4].map((v,w)=>n("span",{className:"pv-pill-waveform-bar",style:r!==null?{height:`${Math.max(3,r*v*20)}px`}:void 0},w))}),n("span",{className:"pv-pill-status",children:"Listening..."}),r!==null&&r<.015&&b>=5?n("span",{className:"pv-mic-quiet-warning",children:"No audio detected \u2014 check your microphone."}):null]})]}):null,e==="processing"?p(G,{children:[n("div",{className:"pv-pill-timer-badge",children:n("span",{className:"pv-pill-timer-text",children:g})}),n("div",{className:"pv-pill-center",role:"status",children:p("span",{className:"pv-pill-status",children:[n("span",{className:"pv-mic-spinner","aria-hidden":"true"})," ",d?"Recording limit reached. ":"","Transcribing and refining\u2026"]})})]}):null,e==="starting"||e==="recording"?n("button",{type:"button",className:"pv-mic-cancel pv-pill-btn-cancel",onClick:a,"aria-label":"Cancel recording",title:"Cancel recording",children:n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("path",{d:"M18 6L6 18M6 6l12 12",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round"})})}):null,e==="error"&&o?n("span",{role:"alert",className:"pv-pill-status pv-mic-error",children:o}):null]})}function ft(t){return t?t.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]+/gu)||[]:[]}var bt=1200;function gt(t,e){if(!t&&!e)return[];if(t===e)return[{type:"unchanged",text:t}];if(!t)return[{type:"added",text:e}];if(!e)return[{type:"removed",text:t}];let o=ft(t),i=ft(e),s=o.length,a=i.length;if(s>bt||a>bt)return[{type:"removed",text:t},{type:"added",text:e}];let l=a+1,r=new Uint32Array((s+1)*l);for(let g=1;g<=s;g++){let v=g*l,w=(g-1)*l,_=o[g-1];for(let S=1;S<=a;S++)if(_===i[S-1])r[v+S]=r[w+(S-1)]+1;else{let P=r[v+(S-1)],k=r[w+S];r[v+S]=P>k?P:k}}let b=[],d=s,f=a;for(;d>0||f>0;){let g=d*l,v=(d-1)*l;d>0&&f>0&&o[d-1]===i[f-1]?(b.push({type:"unchanged",text:o[d-1]}),d--,f--):f>0&&(d===0||r[g+(f-1)]>=r[v+f])?(b.push({type:"added",text:i[f-1]}),f--):d>0&&(f===0||r[g+(f-1)]<r[v+f])&&(b.push({type:"removed",text:o[d-1]}),d--)}b.reverse();let h=[];for(let g of b)h.length>0&&h[h.length-1].type===g.type?h[h.length-1].text+=g.text:h.push({...g});return h}var ht=`
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
`;var xt="zcc-prompt-voice:studio-vertical-draft",vt=[{id:"clarity",label:"\u2728 Polish Clarity",tone:"formal",prompt:"Fix grammar, remove filler words (um, uh, like), and polish for maximum clarity."},{id:"brief",label:"\u26A1 Executive Brief",tone:"technical",prompt:"Convert this into a concise 3-bullet executive brief followed by immediate next actions."},{id:"spec",label:"\u{1F4D0} Tech Spec RFC",tone:"technical",prompt:"Format into an engineering RFC with sections: Overview, Architecture, Data Flow, and Tradeoffs."},{id:"friendly",label:"\u{1F4AC} Friendly Chat",tone:"conversational",prompt:"Rephrase to sound natural, warm, and friendly for team chat."}];function yt({startSession:t=O}){let e=U(),o=V(),[i,s]=y("Prompt Spec"),[a,l]=y(""),[r,b]=y(""),[d,f]=y(!1),[h,g]=y(null),[v,w]=y(!1),[_,S]=y(null),[P,k]=y(""),[R,j]=y(!1),[I,x]=y(null),[T,Z]=y(!1),[St,J]=y(0),[Rt,Q]=y(null),M=N(null),z=N(null),$=N(null),tt=N(null);L(()=>{try{let c=localStorage.getItem(xt);if(c){let m=JSON.parse(c);m.title&&s(m.title),m.inputText&&l(m.inputText),m.outputText&&b(m.outputText)}}catch{}},[]),L(()=>{try{localStorage.setItem(xt,JSON.stringify({title:i,inputText:a,outputText:r}))}catch{}},[i,a,r]),L(()=>()=>{z.current&&clearInterval(z.current),$.current&&clearInterval($.current),M.current&&M.current.cancel()},[]);let et=H(()=>{let c=a.trim();return`${c?c.split(/\s+/).length:0} words \xB7 ${a.length} chars`},[a]),Et=H(()=>{let c=r.trim();return`${c?c.split(/\s+/).length:0} words \xB7 ${r.length} chars`},[r]),Tt=H(()=>!r||!v?[]:gt(a,r),[a,r,v]),kt=async()=>{if(T){Z(!1),Q(null),z.current&&clearInterval(z.current),$.current&&clearInterval($.current);let c=M.current;if(M.current=null,!c)return;try{let m=await c.stop(),A=await e.call(q,{audio:m.base64,mimeType:m.mimeType});A.ok&&A.status==="ok"?l(K=>F(K,A.text)):A.ok&&A.status==="no-speech"?(x("No speech detected. Try speaking closer to the microphone."),setTimeout(()=>x(null),4e3)):A.ok||x(A.message)}catch(m){x(m instanceof Error?m.message:"Transcription failed.")}}else{x(null),J(0);try{let c=await t();M.current=c,Z(!0),z.current=setInterval(()=>{J(m=>m+1)},1e3),c.getAudioLevel&&($.current=setInterval(()=>{let m=c.getAudioLevel?.();m!=null&&Q(m)},100))}catch(c){Z(!1),x(c instanceof Error?c.message:"Microphone access denied.")}}},B=async c=>{let m=a.trim();if(!m||R)return;let A=vt.find(D=>D.id===(c||_)),K=P.trim()||A?.prompt||"Polish and format for clarity.",Dt=A?.tone||"technical";x(null),j(!0);try{let D=await e.call(at,{text:m,tone:Dt,customPrompt:K});D.ok?b(D.text):x(D.message)}catch(D){x(D instanceof Error?D.message:"Refinement request failed.")}finally{j(!1)}},At=async()=>{if(a)try{await navigator.clipboard.writeText(a),x("Input draft copied to clipboard!"),setTimeout(()=>x(null),2500)}catch{}},Ct=async()=>{if(r)try{await navigator.clipboard.writeText(r),f(!0),setTimeout(()=>f(!1),2e3)}catch{}},Nt=()=>{confirm("Clear both raw input and refined output?")&&(l(""),b(""),w(!1))},It=()=>{r&&(l(r),x("Replaced top input with refined output for further iteration."),setTimeout(()=>x(null),3e3))},_t=()=>{let c=r||a;c&&(o.updateText(m=>F(m,c)),o.focus(),g("Inserted output into thread composer!"),setTimeout(()=>g(null),3e3))},Pt=E(c=>{(c.ctrlKey||c.metaKey)&&c.key==="k"?(c.preventDefault(),tt.current?.focus()):(c.ctrlKey||c.metaKey)&&c.key==="Enter"&&(c.preventDefault(),B())},[a,_,P,R]);return p("div",{className:"ps-root",onKeyDown:Pt,children:[n("style",{dangerouslySetInnerHTML:{__html:ht}}),p("header",{className:"ps-toolbar",children:[p("div",{className:"ps-brand",children:[n("span",{children:"\u2728"}),n("span",{children:"Prompt Studio"}),n("span",{className:"ps-brand-badge",children:"Vertical Workflow"})]}),h&&p("span",{style:{fontSize:12,color:"#3fb950",fontWeight:500},children:["\u2713 ",h]}),I&&n("span",{style:{fontSize:12,color:"#fca5a5",fontWeight:500},children:I}),n("div",{className:"ps-spacer"}),p("button",{type:"button",className:"ps-btn ps-btn-sm",onClick:Nt,disabled:!a&&!r,title:"Clear all text",children:[n("span",{children:"\u{1F5D1}\uFE0F"})," Clear All"]}),p("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:_t,disabled:!a&&!r,title:"Insert refined output into active composer",children:[n("span",{children:"\u{1F4AC}"})," Insert Output into Composer"]})]}),p("div",{className:"ps-workspace",children:[p("aside",{className:"ps-sidebar",children:[p("section",{className:"ps-section",children:[p("div",{className:"ps-section-title",children:[n("span",{children:"Voice Dictation"}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:"Host STT"})]}),p("div",{className:"ps-dictation-card",children:[p("button",{type:"button",className:`ps-mic-btn${T?" recording":""}`,onClick:kt,title:T?"Stop dictation":"Start dictation into input",children:[n("span",{children:T?"\u23F9\uFE0F":"\u{1F399}\uFE0F"}),n("span",{children:T?`Listening (${St}s)...`:"Dictate into Top Input"})]}),n("div",{className:"ps-audio-meter",children:n("div",{className:"ps-audio-bar",style:{width:`${T?Math.min(100,(Rt??.3)*100):0}%`}})}),n("span",{style:{fontSize:11,color:"var(--ps-text-muted)"},children:T?"Recording active. Transcribing into Input above...":"Speaks into Raw Input above. Transcribed with Zana host voice."})]})]}),p("section",{className:"ps-section",children:[p("div",{className:"ps-section-title",children:[n("span",{children:"Refinement Presets"}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:"Instant apply"})]}),n("div",{className:"ps-presets-list",children:vt.map(c=>{let m=_===c.id;return p("button",{type:"button",className:`ps-preset-item${m?" active":""}`,onClick:()=>{S(c.id),B(c.id)},disabled:!a.trim()||R,children:[n("div",{className:"ps-preset-header",children:n("span",{className:"ps-preset-name",children:c.label})}),n("span",{className:"ps-preset-desc",children:c.prompt})]},c.id)})})]}),p("section",{className:"ps-section",style:{borderBottom:"none"},children:[p("div",{className:"ps-section-title",children:[n("span",{children:"Custom Instructions"}),n("span",{className:"ps-kbd",children:"Ctrl+K"})]}),n("textarea",{ref:tt,className:"ps-instructions-input",value:P,onChange:c=>k(c.target.value),placeholder:"E.g., Format as markdown with code examples, or restrict response to 150 words...",disabled:R}),n("div",{style:{marginTop:10},children:p("button",{type:"button",className:"ps-btn ps-btn-primary",style:{width:"100%",height:32},onClick:()=>B(),disabled:!a.trim()||R,children:[n("span",{children:"\u2728"})," ",R?"Refining\u2026":"Refine Prompt (Ctrl+Enter)"]})})]})]}),p("main",{className:"ps-stack-workspace",children:[p("div",{className:"ps-stack-header",children:[n("input",{type:"text",className:"ps-title-field",value:i,onChange:c=>s(c.target.value),placeholder:"Untitled Prompt Spec..."}),p("span",{style:{fontSize:11,color:"var(--ps-text-muted)"},children:["Input: ",et," \xB7 Output: ",Et]})]}),p("div",{className:"ps-vertical-panes",children:[p("section",{className:"ps-section-input",children:[p("div",{className:"ps-pane-header",children:[p("div",{className:"ps-pane-title",children:[n("span",{className:"ps-badge ps-badge-input",children:"Input"}),n("span",{children:"Raw Draft / Speech"})]}),p("div",{className:"ps-pane-actions",children:[n("span",{style:{fontSize:11,color:"var(--ps-text-muted)"},children:et}),n("button",{type:"button",className:"ps-btn ps-btn-sm",onClick:At,disabled:!a,title:"Copy input text",children:"\u{1F4CB} Copy"}),n("button",{type:"button",className:"ps-btn ps-btn-sm",onClick:()=>l(""),disabled:!a,title:"Clear raw input",children:"Clear"})]})]}),n("textarea",{className:"ps-input-textarea",value:a,onChange:c=>l(c.target.value),placeholder:"Type your raw thoughts or click Dictate in the toolbar below to capture speech..."})]}),p("div",{className:"ps-mid-action-bar",children:[n("div",{className:"ps-mid-info",children:n("span",{children:"\u2B07 Transform Input into Prompt Spec"})}),n("div",{className:"ps-mid-actions",children:n("button",{type:"button",className:"ps-btn ps-btn-sm ps-btn-primary",onClick:()=>B(),disabled:!a.trim()||R,title:"Refine raw input (Ctrl+Enter)",children:p("span",{children:["\u2728 ",R?"Refining\u2026":"Refine Now (Ctrl+Enter)"]})})})]}),p("section",{className:"ps-section-output",children:[p("div",{className:"ps-pane-header",children:[p("div",{className:"ps-pane-title",children:[n("span",{className:"ps-badge ps-badge-output",children:"Output"}),n("span",{children:r?"Refined Spec (Ready)":"Refined Spec"})]}),p("div",{className:"ps-pane-actions",children:[r&&p("button",{type:"button",className:"ps-btn ps-btn-sm",onClick:()=>w(c=>!c),title:"Toggle difference view",children:[n("span",{children:v?"\u{1F441}\uFE0F":"\u{1F50D}"}),n("span",{children:v?"View Clean":"View Diff"})]}),p("button",{type:"button",className:"ps-btn ps-btn-sm",onClick:Ct,disabled:!r,title:"Copy refined output",children:[n("span",{children:d?"\u2713":"\u{1F4CB}"}),n("span",{children:d?"Copied!":"Copy Output"})]}),n("button",{type:"button",className:"ps-btn ps-btn-sm ps-btn-success",onClick:It,disabled:!r,title:"Copy refined text back up to input for further iteration",children:n("span",{children:"\u2B06 Replace Input"})})]})]}),n("div",{style:{flex:1,overflowY:"auto",position:"relative"},children:r?n("div",{className:"ps-output-scroll",children:v?Tt.map((c,m)=>c.type==="added"?n("span",{className:"ps-diff-added",children:c.text},m):c.type==="removed"?n("span",{className:"ps-diff-removed",children:c.text},m):n("span",{className:"ps-diff-unchanged",children:c.text},m)):r}):p("div",{className:"ps-output-empty",children:[n("span",{style:{fontSize:26,opacity:.5},children:"\u2728"}),n("div",{style:{fontWeight:500,fontSize:13,color:"var(--ps-text)"},children:"No Refined Output Yet"}),p("div",{style:{fontSize:12,maxWidth:320,lineHeight:1.4,color:"var(--ps-text-muted)"},children:["Type your raw thoughts above or speak, then click ",n("strong",{children:"Refine Now"})," or select a preset on the left."]}),p("button",{type:"button",className:"ps-btn ps-btn-primary",style:{marginTop:4},onClick:()=>B(),disabled:!a.trim()||R,children:[n("span",{children:"\u2728"})," Refine Prompt Now"]})]})})]})]})]})]}),p("footer",{className:"ps-statusbar",children:[p("div",{className:"ps-status-item",children:[n("span",{children:"\u25CF"}),n("span",{children:"Auto-saved locally"})]}),p("div",{className:"ps-status-item",children:[n("span",{children:"Model:"}),n("span",{style:{color:"var(--ps-text)"},children:"Active Thread Agent"})]}),n("div",{className:"ps-spacer"}),p("div",{className:"ps-status-item",children:[n("span",{children:"Shortcuts:"}),n("span",{className:"ps-kbd",children:"Ctrl+K"})," Focus Prompt",n("span",{className:"ps-kbd",children:"Ctrl+Enter"})," Refine"]})]})]})}var wt="prompt-studio",gn=rt(t=>{X(),t.composer.customize({id:"prompt-voice-mic",actions:[{id:"prompt-voice-mic",component:ut}]}),t.slots.navPanel?.({id:"prompt-studio",title:"Prompt Studio",icon:"Sparkles",path:wt,component:yt}),t.slots.commandPaletteAction?.({id:"open-prompt-studio",title:"Prompt Studio: Open Canvas",run:e=>{e.navigate?.(`/${wt}`)}})});export{wt as PROMPT_STUDIO_PANEL_PATH,gn as default};
//# sourceMappingURL=app.js.map
