function ve(){return globalThis.__ZCC_PLUGIN_RUNTIME__??{}}function he(e){throw new Error(`${e} is not available until the host plugin runtime is installed`)}function Ne(e){return{__zccPluginApp:!0,setup:e}}function de(){return ve().useRpc?.()??he("useRpc")}function ue(){return ve().useComposer?.()??he("useComposer")}function _e(){return ve().useComposerView?.()??he("useComposerView")}var wt=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4"];var z=class extends Error{code;constructor(n,r){super(r),this.name="RecordingError",this.code=n}};function St(e){return wt.find(n=>e(n))??null}var Ct="audio/webm";function Rt(){return{getUserMedia:e=>navigator.mediaDevices.getUserMedia(e),createRecorder:(e,n)=>new MediaRecorder(e,n?{mimeType:n}:void 0),isTypeSupported:e=>typeof MediaRecorder<"u"&&MediaRecorder.isTypeSupported(e)}}async function kt(e){try{return await e.getUserMedia({audio:!0})}catch(n){let r=n instanceof Error?n.name:"";throw r==="NotAllowedError"||r==="SecurityError"?new z("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again."):new z("MIC_UNAVAILABLE","No microphone is available. Connect one and try again.")}}function Et(e){return new Promise((n,r)=>{let i=new FileReader;i.onload=()=>{let l=typeof i.result=="string"?i.result:"";n(l.slice(l.indexOf(",")+1))},i.onerror=()=>r(new z("RECORDING_FAILED","The recording could not be read.")),i.readAsDataURL(e)})}async function At(e,n){let r=new Blob(e,{type:n});return{base64:await Et(r),mimeType:r.type||n}}function Tt(e,n){if(!(e>0&&Number.isFinite(e)))return()=>{};let r=setTimeout(n,e);return()=>clearTimeout(r)}var It="That recording is too large to transcribe. Keep dictation shorter and try again.";function Pt(e,n){let r=Math.max(n,e),i=[],l=0,d=!1;return{chunks:i,get overflowed(){return d},add(m){return m.size===0||d?"ignored":l+m.size>r?(d=!0,"overflow"):(i.push(m),l+=m.size,l>=e?"limit-reached":"accepted")}}}function Nt(e,n){let r=new Promise((i,l)=>{e.onstop=()=>i(),e.onerror=()=>{let d=new z("RECORDING_FAILED","Recording stopped unexpectedly. Try again.");n(d),l(d)}});return r.catch(()=>{}),r}function _t(e,n,r,i){let l=Nt(e,i);return e.ondataavailable=d=>{let m=n.add(d.data);(m==="limit-reached"||m==="overflow")&&r()},e.start(1e3),l}async function Mt(e,n,r,i){try{await e}finally{n()}if(r.overflowed)throw new z("RECORDING_FAILED",It);return At(r.chunks,i)}function Dt(e){let n=()=>{};return{stopRecorder(){n(),e.state!=="inactive"&&e.stop()},armTimer(r,i){n=Tt(r,i)}}}function Lt(e,n){let r=null;return{attach(i){r=i},detach(){r=null},autoStop(){e();let i=r?.onAutoStop;r&&(r.onAutoStop=void 0),i?.()},fail(i){e(),n();let l=r?.onError;r=null,l?.(i)}}}function Ot(e,n,r,i){let l=Pt(i.maxBytes??9437184,i.hardMaxBytes??10485760),{stopRecorder:d,armTimer:m}=Dt(e),p=Lt(d,n);m(i.maxDurationMs??12e4,p.autoStop);let x=_t(e,l,p.autoStop,p.fail),c={onError:i.onError,onAutoStop:i.onAutoStop,async stop(){d();try{return await Mt(x,n,l,e.mimeType||r)}finally{p.detach()}},cancel(){d(),n(),p.detach()}};return p.attach(c),c}var W=()=>zt();async function zt(e=Rt(),n={}){let r=await kt(e),i=$t(r),l=r.getTracks(),d,m=()=>{for(let p of l)d&&p.removeEventListener?.("ended",d);i?.close(),l.forEach(p=>p.stop())};try{let p=St(e.isTypeSupported)??Ct,x=e.createRecorder(r,p),c=Ot(x,m,p,n);return c.getAudioLevel=()=>i?.level()??null,d=()=>{let g=c.onError;c.cancel(),g?.(new z("MIC_UNAVAILABLE","Microphone disconnected. Check your device and try again."))},l.forEach(g=>g.addEventListener?.("ended",d)),c}catch(p){throw m(),p instanceof z?p:new z("RECORDING_FAILED",p instanceof Error?p.message:"The recording could not be started.")}}function $t(e){let n;try{n=new AudioContext;let r=n.createMediaStreamSource(e),i=n.createAnalyser();i.fftSize=256,r.connect(i);let l=new Uint8Array(i.fftSize),d=n,m=!1;return{level(){if(d.state&&d.state!=="running")return null;i.getByteTimeDomainData(l);let p=l.reduce((x,c)=>x+((c-128)/128)**2,0)/l.length;return Math.min(1,Math.sqrt(p)*5)},close(){m||(m=!0,r.disconnect(),d.close().catch(p=>console.error("Prompt Voice audio meter cleanup failed",p)))}}}catch(r){return n&&n.close().catch(i=>console.error("Prompt Voice audio meter cleanup failed",i)),console.warn("Prompt Voice audio meter unavailable",r),null}}var w=globalThis.__ZCC_HOST_REACT__;var pn=w.Children,cn=w.Component,ln=w.Fragment,dn=w.StrictMode,un=w.Suspense,mn=w.cloneElement,fn=w.createContext,gn=w.createElement,bn=w.createRef,vn=w.forwardRef,hn=w.isValidElement,xn=w.lazy,yn=w.memo,wn=w.startTransition,_=w.useCallback,Sn=w.useContext,Cn=w.useDebugValue,Rn=w.useDeferredValue,I=w.useEffect,kn=w.useId,En=w.useImperativeHandle,An=w.useInsertionEffect,Tn=w.useLayoutEffect,j=w.useMemo,Me=w.useReducer,P=w.useRef,h=w.useState,In=w.useSyncExternalStore,Pn=w.useTransition,Nn=w.version;var me="promptVoice.transcribe",De="promptVoice.status",Le="promptVoice.rephrase",Oe="promptVoice.availableModels";function X(e,n){let r=n.trim();return r?e?/\s$/.test(e)?`${e}${r}`:`${e} ${r}`:r:e}var Ft="No speech detected.",xe={phase:"idle",notice:null,error:null};function ze(e,n){switch(n.type){case"START":return e.phase==="idle"||e.phase==="error"?{phase:"starting",notice:null,error:null}:e;case"STARTED":return e.phase==="starting"?{...e,phase:"recording"}:e;case"STOP":return e.phase==="recording"||e.phase==="starting"?{phase:"processing",notice:null,error:null}:e;case"CANCEL":return e.phase==="recording"||e.phase==="starting"?{...xe}:e;case"SUCCESS":case"NO_SPEECH":return e.phase!=="processing"?e:{phase:"idle",notice:n.type==="NO_SPEECH"?Ft:n.notice,error:null};case"CLEAR_NOTICE":return e.notice?{...e,notice:null}:e;case"FAILURE":return{phase:"error",notice:null,error:n.message}}}var Vt="Prompt Voice returned an unexpected response. Try again.",Bt="Dictation failed. Try again.",Ut=4e3;function jt(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}async function Ht(e,n){let r=await e.call(me,{audio:n.base64,mimeType:n.mimeType});if(!jt(r))throw new Error(Vt);return r}function $e(e){return e instanceof Error&&e.message?e.message:Bt}function Gt(e,n,r){if(!e.ok){r({type:"FAILURE",message:e.message});return}if(e.status==="no-speech"){r({type:"NO_SPEECH"});return}n.updateText(l=>X(l,e.text)),n.focus();let i=e.refineNotice?`Inserted the raw transcript. ${e.refineNotice.message}`:"Added to draft.";r({type:"SUCCESS",notice:i})}function qt(e,n,r,i){return n()?(e.onError=l=>{n()&&i(l)},e.onAutoStop=()=>{n()&&r()},e):(e.cancel(),null)}function Zt(e,n,r,i,l){let d=m=>l({type:"FAILURE",message:$e(m)});return e.then(m=>{let p=qt(m,r,i,x=>{n.current=null,d(x)});return p&&(n.current=p),p},m=>(r()&&d(m),null))}function Yt(e,n){let r=P(null),i=P(null),l=P(0),d=P(!0),m=_(()=>{l.current++,i.current=null,r.current&&(r.current.cancel(),r.current=null),n({type:"CANCEL"})},[n]);I(()=>(d.current=!0,()=>{d.current=!1,m()}),[m]);let p=_(async()=>{let u=i.current?await i.current:r.current;return r.current=null,u},[]),x=_(async u=>{let v=++l.current,f=()=>d.current&&l.current===v,C=Zt(e(),r,f,u,n);i.current=C,await C&&f()&&n({type:"STARTED"}),i.current===C&&(i.current=null)},[n,e]),c=_(()=>d.current,[]),g=_(()=>r.current?.getAudioLevel?.()??null,[]);return{start:x,takeSession:p,cancel:m,isMounted:c,getAudioLevel:g}}function Fe({startSession:e=W,noticeDurationMs:n=Ut}={}){let r=ue(),i=de(),[l,d]=Me(ze,xe),{start:m,takeSession:p,cancel:x,isMounted:c,getAudioLevel:g}=Yt(e,d),[u,v]=h(null),[f,C]=h(0),[G,A]=h(!1);I(()=>{if(l.phase!=="recording"){v(null),C(0);return}let D=Date.now(),V=()=>{v(g()),C(Math.floor((Date.now()-D)/1e3))};V();let O=setInterval(V,100);return()=>clearInterval(O)},[g,l.phase]),I(()=>{if(!l.notice)return;let D=setTimeout(()=>{d({type:"CLEAR_NOTICE"})},n);return()=>clearTimeout(D)},[n,l.notice]);let T=_(()=>{d({type:"CLEAR_NOTICE"})},[]),M=_(async()=>{d({type:"STOP"});let D=await p();if(!(!c()||!D))try{let V=await D.stop();if(!c())return;let O=await Ht(i,V);if(!c())return;Gt(O,r,d)}catch(V){if(!c())return;d({type:"FAILURE",message:$e(V)})}},[r,c,i,p]),q=_(async()=>{A(!1),d({type:"START"}),await m(()=>{A(!0),M()})},[M,m]),re=_(()=>{l.phase==="recording"||l.phase==="starting"?M():l.phase!=="processing"&&q()},[q,M,l.phase]);return{phase:l.phase,error:l.error,notice:l.notice,level:u,seconds:f,autoStopped:G,onClick:re,cancel:x,clearNotice:T,beginDictation:q,finishDictation:M}}var ye=`/* Base Container */\r
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
}\r
\r
\`\r
\r
\`\r
/* ==========================================================================\\n   Prompt Studio - Zana Native Vertical Stack (Input Top, Output Bottom)\\n   ========================================================================== */\r
\r
:root {\r
  --ps-bg-base: var(--bg-base, #1e1e1e);\r
  --ps-bg-panel: var(--bg-panel, #252526);\r
  --ps-bg-header: var(--bg-header, #202021);\r
  --ps-bg-subtle: rgba(255, 255, 255, 0.04);\r
  --ps-bg-hover: var(--bg-hover, rgba(255, 255, 255, 0.06));\r
  --ps-bg-active: rgba(255, 255, 255, 0.1);\r
  --ps-border: var(--border, rgba(255, 255, 255, 0.08));\r
  --ps-border-strong: var(--border-strong, rgba(255, 255, 255, 0.16));\r
  --ps-text: var(--text-primary, #e6edf3);\r
  --ps-text-muted: var(--text-muted, #8a8a8a);\r
  --ps-accent: var(--accent, #007acc);\r
  --ps-accent-hover: #0098ff;\r
  --ps-danger: var(--danger, #e5534b);\r
  --ps-warn: #d29922;\r
  --ps-success: var(--success, #3fb950);\r
  --ps-font: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);\r
  --ps-mono: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);\r
}\r
\r
.ps-root {\r
  display: flex !important;\r
  flex-direction: column !important;\r
  width: 100% !important;\r
  height: 100% !important;\r
  min-height: 0 !important;\r
  background: var(--ps-bg-base) !important;\r
  color: var(--ps-text) !important;\r
  font-family: var(--ps-font) !important;\r
  font-size: 13px !important;\r
  overflow: hidden !important;\r
  position: relative !important;\r
  box-sizing: border-box !important;\r
}\r
\r
.ps-root *, .ps-root *::before, .ps-root *::after {\r
  box-sizing: border-box !important;\r
}\r
\r
/* \u2500\u2500\u2500 Top Studio Toolbar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\r
.ps-toolbar {\r
  height: 40px !important;\r
  background: var(--ps-bg-header) !important;\r
  border-bottom: 1px solid var(--ps-border) !important;\r
  display: flex !important;\r
  align-items: center !important;\r
  padding: 0 14px !important;\r
  gap: 12px !important;\r
  flex-shrink: 0 !important;\r
  z-index: 10 !important;\r
}\r
\r
.ps-brand {\r
  font-size: 13px !important;\r
  font-weight: 600 !important;\r
  display: flex !important;\r
  align-items: center !important;\r
  gap: 6px !important;\r
  color: var(--ps-text) !important;\r
}\r
\r
.ps-brand-badge {\r
  font-size: 11px !important;\r
  background: var(--ps-bg-subtle) !important;\r
  border: 1px solid var(--ps-border) !important;\r
  padding: 1px 6px !important;\r
  border-radius: 4px !important;\r
  color: var(--ps-text-muted) !important;\r
}\r
\r
.ps-spacer {\r
  flex: 1 !important;\r
}\r
\r
/* \u2500\u2500\u2500 Zana Native Button Styles \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\r
.ps-btn {\r
  appearance: none !important;\r
  border: 1px solid var(--ps-border-strong) !important;\r
  background: var(--ps-bg-panel) !important;\r
  color: var(--ps-text) !important;\r
  border-radius: 4px !important;\r
  padding: 4px 10px !important;\r
  font-size: 12px !important;\r
  font-weight: 500 !important;\r
  cursor: pointer !important;\r
  display: inline-flex !important;\r
  align-items: center !important;\r
  justify-content: center !important;\r
  gap: 6px !important;\r
  height: 28px !important;\r
  font-family: inherit !important;\r
  transition: all 0.12s ease !important;\r
  white-space: nowrap !important;\r
}\r
\r
.ps-btn:hover:not(:disabled) {\r
  background: var(--ps-bg-hover) !important;\r
  border-color: var(--ps-text-muted) !important;\r
}\r
\r
.ps-btn:disabled {\r
  opacity: 0.45 !important;\r
  cursor: default !important;\r
}\r
\r
.ps-btn-primary {\r
  background: var(--ps-accent) !important;\r
  border-color: var(--ps-accent) !important;\r
  color: #ffffff !important;\r
  font-weight: 600 !important;\r
}\r
\r
.ps-btn-primary:hover:not(:disabled) {\r
  background: var(--ps-accent-hover) !important;\r
  border-color: var(--ps-accent-hover) !important;\r
}\r
\r
.ps-btn-success {\r
  background: #238636 !important;\r
  border-color: rgba(255, 255, 255, 0.2) !important;\r
  color: #ffffff !important;\r
  font-weight: 600 !important;\r
}\r
\r
.ps-btn-success:hover:not(:disabled) {\r
  background: #2ea043 !important;\r
}\r
\r
.ps-btn-danger {\r
  background: rgba(229, 83, 75, 0.15) !important;\r
  border-color: var(--ps-danger) !important;\r
  color: #fca5a5 !important;\r
}\r
\r
.ps-btn-danger:hover:not(:disabled) {\r
  background: rgba(229, 83, 75, 0.25) !important;\r
}\r
\r
.ps-btn-sm {\r
  height: 24px !important;\r
  padding: 2px 8px !important;\r
  font-size: 11px !important;\r
}\r
\r
/* \u2500\u2500\u2500 Main Workspace Layout \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\r
.ps-workspace {\r
  flex: 1 !important;\r
  display: flex !important;\r
  min-height: 0 !important;\r
  overflow: hidden !important;\r
}\r
\r
/* \u2500\u2500\u2500 Left Sidebar: Audio & Refinement Config \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\r
.ps-sidebar {\r
  width: 290px !important;\r
  background: var(--ps-bg-panel) !important;\r
  border-right: 1px solid var(--ps-border) !important;\r
  display: flex !important;\r
  flex-direction: column !important;\r
  overflow-y: auto !important;\r
  flex-shrink: 0 !important;\r
}\r
\r
.ps-section {\r
  padding: 12px 14px !important;\r
  border-bottom: 1px solid var(--ps-border) !important;\r
}\r
\r
.ps-section-title {\r
  font-size: 11px !important;\r
  font-weight: 600 !important;\r
  text-transform: uppercase !important;\r
  letter-spacing: 0.05em !important;\r
  color: var(--ps-text-muted) !important;\r
  margin-bottom: 8px !important;\r
  display: flex !important;\r
  align-items: center !important;\r
  justify-content: space-between !important;\r
}\r
\r
/* Model Select Dropdown */\r
.ps-select {\r
  appearance: none !important;\r
  -webkit-appearance: none !important;\r
  width: 100% !important;\r
  height: 30px !important;\r
  background: var(--ps-bg-base) !important;\r
  color: var(--ps-text) !important;\r
  border: 1px solid var(--ps-border-strong) !important;\r
  border-radius: 4px !important;\r
  padding: 4px 28px 4px 8px !important;\r
  font-size: 12px !important;\r
  font-family: inherit !important;\r
  cursor: pointer !important;\r
  outline: none !important;\r
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238a8a8a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;\r
  background-repeat: no-repeat !important;\r
  background-position: right 8px center !important;\r
  text-overflow: ellipsis !important;\r
  white-space: nowrap !important;\r
}\r
\r
.ps-select:hover:not(:disabled) {\r
  border-color: var(--ps-accent) !important;\r
}\r
\r
.ps-select:focus-visible {\r
  border-color: var(--ps-accent) !important;\r
  box-shadow: 0 0 0 1px var(--ps-accent) !important;\r
}\r
\r
/* Dictation Card */\r
.ps-dictation-card {\r
  background: var(--ps-bg-base) !important;\r
  border: 1px solid var(--ps-border) !important;\r
  border-radius: 5px !important;\r
  padding: 10px !important;\r
  display: flex !important;\r
  flex-direction: column !important;\r
  gap: 8px !important;\r
}\r
\r
.ps-mic-btn {\r
  height: 32px !important;\r
  border-radius: 4px !important;\r
  border: 1px solid var(--ps-danger) !important;\r
  background: rgba(229, 83, 75, 0.12) !important;\r
  color: #fca5a5 !important;\r
  font-size: 12px !important;\r
  font-weight: 600 !important;\r
  display: flex !important;\r
  align-items: center !important;\r
  justify-content: center !important;\r
  gap: 7px !important;\r
  cursor: pointer !important;\r
  transition: all 0.15s ease !important;\r
}\r
\r
.ps-mic-btn:hover {\r
  background: rgba(229, 83, 75, 0.22) !important;\r
}\r
\r
.ps-mic-btn.recording {\r
  background: var(--ps-danger) !important;\r
  color: #fff !important;\r
  animation: ps-pulse 1.5s infinite !important;\r
}\r
\r
@keyframes ps-pulse {\r
  0% { box-shadow: 0 0 0 0 rgba(229, 83, 75, 0.5); }\r
  70% { box-shadow: 0 0 0 6px rgba(229, 83, 75, 0); }\r
  100% { box-shadow: 0 0 0 0 rgba(229, 83, 75, 0); }\r
}\r
\r
.ps-audio-meter {\r
  height: 6px !important;\r
  background: rgba(255, 255, 255, 0.06) !important;\r
  border-radius: 3px !important;\r
  overflow: hidden !important;\r
}\r
\r
.ps-audio-bar {\r
  height: 100% !important;\r
  width: 0% !important;\r
  background: #3fb950 !important;\r
  border-radius: 3px !important;\r
  transition: width 0.1s linear !important;\r
}\r
\r
/* Presets List */\r
.ps-presets-list {\r
  display: flex !important;\r
  flex-direction: column !important;\r
  gap: 5px !important;\r
}\r
\r
.ps-preset-item {\r
  background: var(--ps-bg-base) !important;\r
  border: 1px solid var(--ps-border) !important;\r
  border-radius: 4px !important;\r
  padding: 7px 9px !important;\r
  cursor: pointer !important;\r
  transition: all 0.12s ease !important;\r
  text-align: left !important;\r
  display: flex !important;\r
  flex-direction: column !important;\r
  gap: 2px !important;\r
}\r
\r
.ps-preset-item:hover {\r
  border-color: var(--ps-border-strong) !important;\r
  background: var(--ps-bg-hover) !important;\r
}\r
\r
.ps-preset-item.active {\r
  border-color: var(--ps-accent) !important;\r
  background: color-mix(in srgb, var(--ps-accent) 14%, transparent) !important;\r
}\r
\r
.ps-preset-header {\r
  display: flex !important;\r
  align-items: center !important;\r
  justify-content: space-between !important;\r
}\r
\r
.ps-preset-name {\r
  font-size: 12px !important;\r
  font-weight: 600 !important;\r
  color: var(--ps-text) !important;\r
}\r
\r
.ps-preset-desc {\r
  font-size: 11px !important;\r
  color: var(--ps-text-muted) !important;\r
  line-height: 1.3 !important;\r
}\r
\r
/* Custom Instructions Input */\r
.ps-instructions-input {\r
  width: 100% !important;\r
  background: var(--ps-bg-base) !important;\r
  border: 1px solid var(--ps-border-strong) !important;\r
  border-radius: 4px !important;\r
  color: var(--ps-text) !important;\r
  padding: 7px 9px !important;\r
  font-size: 12px !important;\r
  font-family: inherit !important;\r
  resize: vertical !important;\r
  min-height: 65px !important;\r
  outline: none !important;\r
  line-height: 1.4 !important;\r
}\r
\r
.ps-instructions-input:focus {\r
  border-color: var(--ps-accent) !important;\r
  box-shadow: 0 0 0 1px var(--ps-accent) !important;\r
}\r
\r
/* \u2500\u2500\u2500 Vertical Stack: Input (Top) & Output (Bottom) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\r
.ps-stack-workspace {\r
  flex: 1 !important;\r
  display: flex !important;\r
  flex-direction: column !important;\r
  min-width: 0 !important;\r
  background: var(--ps-bg-base) !important;\r
  min-height: 0 !important;\r
  overflow: hidden !important;\r
}\r
\r
/* Spec Title Sub-header */\r
.ps-stack-header {\r
  padding: 7px 16px !important;\r
  background: var(--ps-bg-header) !important;\r
  border-bottom: 1px solid var(--ps-border) !important;\r
  display: flex !important;\r
  align-items: center !important;\r
  gap: 12px !important;\r
  flex-shrink: 0 !important;\r
}\r
\r
.ps-title-field {\r
  flex: 1 !important;\r
  background: transparent !important;\r
  border: none !important;\r
  outline: none !important;\r
  font-size: 14px !important;\r
  font-weight: 600 !important;\r
  color: var(--ps-text) !important;\r
  font-family: inherit !important;\r
  padding: 2px 4px !important;\r
}\r
\r
.ps-title-field:focus {\r
  background: var(--ps-bg-panel) !important;\r
  border-radius: 3px !important;\r
  box-shadow: 0 0 0 1px var(--ps-border-strong) !important;\r
}\r
\r
/* Vertical Panes Container */\r
.ps-vertical-panes {\r
  flex: 1 !important;\r
  display: flex !important;\r
  flex-direction: column !important;\r
  min-height: 0 !important;\r
  overflow: hidden !important;\r
}\r
\r
/* TOP PANE: Raw Input */\r
.ps-section-input {\r
  flex: 0 0 42% !important;\r
  display: flex !important;\r
  flex-direction: column !important;\r
  min-height: 140px !important;\r
  background: var(--ps-bg-base) !important;\r
  border-bottom: 1px solid var(--ps-border) !important;\r
  position: relative !important;\r
}\r
\r
/* MIDDLE ACTION BAR */\r
.ps-mid-action-bar {\r
  height: 36px !important;\r
  background: var(--ps-bg-header) !important;\r
  border-bottom: 1px solid var(--ps-border) !important;\r
  display: flex !important;\r
  align-items: center !important;\r
  justify-content: space-between !important;\r
  padding: 0 14px !important;\r
  flex-shrink: 0 !important;\r
  z-index: 5 !important;\r
}\r
\r
.ps-mid-info {\r
  display: flex !important;\r
  align-items: center !important;\r
  gap: 8px !important;\r
  font-size: 11px !important;\r
  color: var(--ps-text-muted) !important;\r
}\r
\r
.ps-mid-actions {\r
  display: flex !important;\r
  align-items: center !important;\r
  gap: 8px !important;\r
}\r
\r
/* BOTTOM PANE: Refined Output */\r
.ps-section-output {\r
  flex: 1 !important;\r
  display: flex !important;\r
  flex-direction: column !important;\r
  min-height: 180px !important;\r
  background: var(--ps-bg-base) !important;\r
  position: relative !important;\r
  overflow: hidden !important;\r
}\r
\r
/* Pane Headers */\r
.ps-pane-header {\r
  height: 32px !important;\r
  background: var(--ps-bg-panel) !important;\r
  border-bottom: 1px solid var(--ps-border) !important;\r
  padding: 0 14px !important;\r
  display: flex !important;\r
  align-items: center !important;\r
  justify-content: space-between !important;\r
  font-size: 12px !important;\r
  flex-shrink: 0 !important;\r
}\r
\r
.ps-pane-title {\r
  display: flex !important;\r
  align-items: center !important;\r
  gap: 7px !important;\r
  font-weight: 600 !important;\r
}\r
\r
.ps-badge {\r
  font-size: 10px !important;\r
  font-weight: 600 !important;\r
  text-transform: uppercase !important;\r
  padding: 1px 6px !important;\r
  border-radius: 3px !important;\r
  letter-spacing: 0.04em !important;\r
}\r
\r
.ps-badge-input {\r
  background: rgba(255, 255, 255, 0.08) !important;\r
  color: var(--ps-text-muted) !important;\r
}\r
\r
.ps-badge-output {\r
  background: rgba(63, 185, 80, 0.15) !important;\r
  color: #7ee787 !important;\r
  border: 1px solid rgba(63, 185, 80, 0.3) !important;\r
}\r
\r
.ps-pane-actions {\r
  display: flex !important;\r
  align-items: center !important;\r
  gap: 6px !important;\r
}\r
\r
/* Textarea & Output Body */\r
.ps-input-textarea {\r
  width: 100% !important;\r
  height: 100% !important;\r
  background: transparent !important;\r
  color: var(--ps-text) !important;\r
  border: none !important;\r
  outline: none !important;\r
  padding: 12px 16px !important;\r
  font-size: 13.5px !important;\r
  line-height: 1.6 !important;\r
  font-family: var(--ps-font) !important;\r
  resize: none !important;\r
  overflow-y: auto !important;\r
}\r
\r
.ps-input-textarea::placeholder {\r
  color: #64748b !important;\r
}\r
\r
.ps-output-scroll {\r
  width: 100% !important;\r
  height: 100% !important;\r
  overflow-y: auto !important;\r
  padding: 14px 16px !important;\r
  font-size: 13.5px !important;\r
  line-height: 1.6 !important;\r
  white-space: pre-wrap !important;\r
  user-select: text !important;\r
  font-family: var(--ps-font) !important;\r
}\r
\r
.ps-output-empty {\r
  height: 100% !important;\r
  display: flex !important;\r
  flex-direction: column !important;\r
  align-items: center !important;\r
  justify-content: center !important;\r
  gap: 10px !important;\r
  color: var(--ps-text-muted) !important;\r
  text-align: center !important;\r
  padding: 24px !important;\r
}\r
\r
/* Diff Tokens */\r
.ps-diff-added {\r
  background: rgba(46, 160, 67, 0.22) !important;\r
  color: #7ee787 !important;\r
  padding: 1px 3px !important;\r
  border-radius: 3px !important;\r
}\r
\r
.ps-diff-removed {\r
  background: rgba(229, 83, 75, 0.22) !important;\r
  color: #fca5a5 !important;\r
  text-decoration: line-through !important;\r
  padding: 1px 3px !important;\r
  border-radius: 3px !important;\r
}\r
\r
.ps-diff-unchanged {\r
  color: var(--ps-text) !important;\r
}\r
\r
/* \u2500\u2500\u2500 Bottom Status Bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\r
.ps-statusbar {\r
  height: 26px !important;\r
  background: var(--ps-bg-header) !important;\r
  border-top: 1px solid var(--ps-border) !important;\r
  display: flex !important;\r
  align-items: center !important;\r
  padding: 0 14px !important;\r
  font-size: 11px !important;\r
  color: var(--ps-text-muted) !important;\r
  gap: 16px !important;\r
  flex-shrink: 0 !important;\r
}\r
\r
.ps-status-item {\r
  display: flex !important;\r
  align-items: center !important;\r
  gap: 5px !important;\r
}\r
\r
.ps-kbd {\r
  background: var(--ps-bg-panel) !important;\r
  border: 1px solid var(--ps-border-strong) !important;\r
  padding: 1px 4px !important;\r
  border-radius: 3px !important;\r
  font-size: 10px !important;\r
  font-family: var(--ps-mono) !important;\r
}\r
\`\r
`;var Ve=globalThis.__ZCC_HOST_REACT__,J=Ve.Fragment;function o(e,n,r){return Ve.createElement(e,r===void 0?n:{...n,key:r})}var a=o;var Wt="Dictation",Be="zcc-ext-prompt-voice-styles";function we(){if(typeof document>"u")return;let e=document.getElementById(Be);e||(e=document.createElement("style"),e.id=Be,document.head.appendChild(e)),e.textContent!==ye&&(e.textContent=ye)}var Xt={idle:"Start dictation",starting:"Stop dictation",recording:"Stop dictation",processing:"Transcribing",error:"Start dictation"},Ue={position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",border:0};function je({startSession:e=W}){we();let{phase:n,error:r,notice:i,onClick:l,cancel:d,clearNotice:m,level:p,seconds:x,autoStopped:c}=Fe({startSession:e}),g=n==="starting"||n==="recording"||n==="processing",u=n==="idle"&&!!i,v=`${Math.floor(x/60)}:${String(x%60).padStart(2,"0")}`;return a("div",{className:`pv-mic pv-dictation-pill pv-phase-${n} ${u?"pv-has-notice":""}`,onClick:u?m:void 0,title:u?"Click to dismiss":void 0,children:[o("button",{type:"button",className:`pv-mic-button pv-mic-${n} ${g?"pv-pill-btn-stop":"pv-idle-icon"}`,"aria-label":Wt,"aria-pressed":n==="recording"||n==="starting",title:Xt[n],disabled:n==="processing",onClick:l,style:u?{display:"none"}:void 0,children:n==="idle"||n==="error"?o("svg",{viewBox:"0 0 24 24",width:"16",height:"16","aria-hidden":"true",focusable:"false",children:o("path",{d:"M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5Zm6 9h2v-3h-2v3Z",fill:"currentColor"})}):n==="processing"?o("span",{className:"pv-mic-spinner","aria-hidden":"true"}):o("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:o("rect",{x:"6",y:"6",width:"12",height:"12",rx:"2.5",fill:"currentColor"})})}),u?a("span",{role:"status",className:"pv-notice-content",children:[o("span",{className:"pv-notice-check",children:"\u2713"}),o("span",{className:"pv-pill-status",children:i})]}):null,n==="starting"?a(J,{children:[a("div",{className:"pv-pill-timer-badge",children:[o("div",{className:"pv-pill-dot pv-pill-dot-starting"}),o("span",{className:"pv-pill-timer-text",children:"0:00"})]}),a("div",{className:"pv-pill-center",role:"status",children:[o("span",{className:"pv-mic-spinner","aria-hidden":"true"}),o("span",{className:"pv-pill-status",children:"Requesting microphone\u2026"})]})]}):null,n==="recording"?a(J,{children:[a("div",{className:"pv-pill-timer-badge",children:[o("div",{className:"pv-pill-dot"}),a("span",{className:"pv-pill-timer-text",children:[o("span",{className:"pv-sr-only",style:Ue,children:"Recording "}),v]})]}),a("div",{className:"pv-pill-center",role:"status",children:[p===null?o("span",{className:"pv-sr-only",style:Ue,children:"Audio meter unavailable"}):null,o("span",{className:`pv-pill-waveform ${p===null?"animated":""}`,"aria-label":"Microphone audio activity",role:"meter","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":Math.round((p??.3)*100),children:[.4,.7,1,.7,.4].map((f,C)=>o("span",{className:"pv-pill-waveform-bar",style:p!==null?{height:`${Math.max(3,p*f*20)}px`}:void 0},C))}),o("span",{className:"pv-pill-status",children:"Listening..."}),p!==null&&p<.015&&x>=5?o("span",{className:"pv-mic-quiet-warning",children:"No audio detected \u2014 check your microphone."}):null]})]}):null,n==="processing"?a(J,{children:[o("div",{className:"pv-pill-timer-badge",children:o("span",{className:"pv-pill-timer-text",children:v})}),o("div",{className:"pv-pill-center",role:"status",children:a("span",{className:"pv-pill-status",children:[o("span",{className:"pv-mic-spinner","aria-hidden":"true"})," ",c?"Recording limit reached. ":"","Transcribing and refining\u2026"]})})]}):null,n==="starting"||n==="recording"?o("button",{type:"button",className:"pv-mic-cancel pv-pill-btn-cancel",onClick:d,"aria-label":"Cancel recording",title:"Cancel recording",children:o("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:o("path",{d:"M18 6L6 18M6 6l12 12",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round"})})}):null,n==="error"&&r?o("span",{role:"alert",className:"pv-pill-status pv-mic-error",children:r}):null]})}var Jt={"Voice & transcription":[{key:"inputLanguage",label:"Input language",options:["auto","en","he","de","fr","es","ja"]},{key:"dictionary",label:"Personal dictionary",multiline:!0,help:"Names and terms, one per line."}],"Prompt Voice":[{key:"tone",label:"Cleanup tone",options:["conversational","formal","casual","technical","custom"]},{key:"customPrompt",label:"Custom cleanup instructions",multiline:!0}],Connections:[]},He={inputLanguage:"auto",tone:"conversational"},Qt={auto:"Detect automatically",system:"Zana voice",none:"Off",assistant:"Zana assistant",openai:"OpenAI",anthropic:"Anthropic",google:"Google AI","google-gemini":"Google Gemini",en:"English",he:"Hebrew",de:"German",fr:"French",es:"Spanish",ja:"Japanese"};function Ge({rpc:e,onBack:n}){let[r,i]=h({}),[l,d]=h("Loading\u2026"),[m,p]=h(null),x=P(0),c=P({});I(()=>{let u=!0;return e.call("promptVoice.settings.get").then(v=>{u&&(c.current=v||{},i(c.current),d("Saved"))}).catch(()=>{u&&d("Could not load settings")}),()=>{u=!1}},[]);let g=u=>{let v=++x.current;c.current={...c.current,...u};let f=c.current;i(f),d("Saving\u2026"),e.call("promptVoice.settings.update",f).then(()=>{v===x.current&&(p(null),d("Saved"))}).catch(()=>{v===x.current&&(p(f),d("Could not save settings."))})};return o("div",{className:"ps-workspace",children:o("main",{className:"ps-editor-canvas",style:{overflowY:"auto"},children:a("div",{style:{width:"100%",maxWidth:760,margin:"0 auto",display:"flex",flexDirection:"column",gap:12},children:[a("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12},children:[a("div",{children:[o("h1",{style:{fontSize:18,margin:"4px 0"},children:"Settings"}),o("span",{style:{color:"var(--ps-text-muted)",fontSize:12},children:"Configure voice and cleanup defaults"})]}),o("button",{className:"ps-btn",onClick:n,children:"\u2190 Back to Studio"})]}),a("div",{style:{color:"var(--ps-text-muted)",fontSize:11},children:[o("span",{role:"status",children:l}),m&&o("button",{className:"ps-btn",onClick:()=>g(m),children:"Retry"})]}),Object.entries(Jt).map(([u,v])=>a("section",{className:"ps-pane",style:{flex:"none"},children:[a("div",{className:"ps-pane-header",children:[o("h2",{className:"ps-pane-title",style:{margin:0},children:u}),u!=="Connections"&&o("button",{className:"ps-btn",onClick:()=>g(Object.fromEntries(v.map(f=>[f.key,He[f.key]??""]))),children:"Reset"})]}),o("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:u==="Connections"?o("p",{style:{margin:0,color:"var(--ps-text-muted)",fontSize:12},children:"Manage OpenAI, Google AI and Anthropic API keys in Zana\u2019s Prompt Voice plugin settings. Keys remain protected by Zana."}):v.filter(f=>!(f.key==="customPrompt"&&r.tone!=="custom")).map(f=>a("label",{className:"ps-field-group",children:[o("span",{className:"ps-field-label",children:f.label}),f.options?o("select",{className:"ps-select",value:r[f.key]??He[f.key]??"",onChange:C=>g({[f.key]:C.target.value}),children:f.options.map(C=>o("option",{value:C,children:Qt[C]??C},C))}):f.multiline?o("textarea",{className:"ps-custom-prompt-input",value:r[f.key]??"",onChange:C=>g({[f.key]:C.target.value})}):o("input",{className:"ps-select",value:r[f.key]??"",onChange:C=>g({[f.key]:C.target.value})}),f.help&&o("small",{style:{color:"var(--ps-text-muted)"},children:f.help})]},f.key))})]},u))]})})})}function qe(e){return e?e.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]+/gu)||[]:[]}var Ze=1200;function Ye(e,n){if(!e&&!n)return[];if(e===n)return[{type:"unchanged",text:e}];if(!e)return[{type:"added",text:n}];if(!n)return[{type:"removed",text:e}];let r=qe(e),i=qe(n),l=r.length,d=i.length;if(l>Ze||d>Ze)return[{type:"removed",text:e},{type:"added",text:n}];let m=d+1,p=new Uint32Array((l+1)*m);for(let v=1;v<=l;v++){let f=v*m,C=(v-1)*m,G=r[v-1];for(let A=1;A<=d;A++)if(G===i[A-1])p[f+A]=p[C+(A-1)]+1;else{let T=p[f+(A-1)],M=p[C+A];p[f+A]=T>M?T:M}}let x=[],c=l,g=d;for(;c>0||g>0;){let v=c*m,f=(c-1)*m;c>0&&g>0&&r[c-1]===i[g-1]?(x.push({type:"unchanged",text:r[c-1]}),c--,g--):g>0&&(c===0||p[v+(g-1)]>=p[f+g])?(x.push({type:"added",text:i[g-1]}),g--):c>0&&(g===0||p[v+(g-1)]<p[f+g])&&(x.push({type:"removed",text:r[c-1]}),c--)}x.reverse();let u=[];for(let v of x)u.length>0&&u[u.length-1].type===v.type?u[u.length-1].text+=v.text:u.push({...v});return u}var en=`
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

  @keyframes ps-spin-anim {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .ps-spin {
    display: inline-block;
    animation: ps-spin-anim 1.2s linear infinite;
  }
`;async function Ke(e){if(!e)return!1;if(typeof navigator<"u"&&navigator.clipboard&&typeof navigator.clipboard.writeText=="function")try{return await navigator.clipboard.writeText(e),!0}catch{}if(typeof document<"u")try{let n=document.createElement("textarea");n.value=e,n.setAttribute("readonly",""),n.style.position="fixed",n.style.top="-9999px",n.style.left="-9999px",n.style.opacity="0",document.body.appendChild(n),n.focus(),n.select();let r=document.execCommand("copy");if(document.body.removeChild(n),r)return!0}catch{}return!1}var We="zcc:prompt-voice:studio-draft:v1",Xe=[{id:"polish",title:"Clean up writing",icon:"\u2728",desc:"Fix punctuation, grammar, and stuttering.",prompt:"Clean up disfluencies, typos, and improve sentence flow without altering intent.",tone:"technical"},{id:"executive",title:"Summarize",icon:"\u26A1",desc:"Condense into punchy bullet points.",prompt:"Summarize the core request into crisp, high-level executive bullet points.",tone:"formal"},{id:"spec",title:"Create a technical spec",icon:"\u{1F4D0}",desc:"Format with Goals, Context, Steps.",prompt:"Transform into a structured technical spec with ## Goal, ## Architecture, and ## Implementation Steps.",tone:"technical"},{id:"chat",title:"Make it conversational",icon:"\u{1F4AC}",desc:"Natural, conversational tone.",prompt:"Rephrase in a warm, polite, and helpful conversational tone.",tone:"conversational"}],tn=[{id:"google-gemini",label:"Google Gemini"},{id:"openai",label:"OpenAI (Whisper)"},{id:"system",label:"System (Zana Voice)"}],nn=[{id:"anthropic",displayName:"Anthropic",models:[{id:"claude-haiku-4-5-20251001",key:"anthropic-haiku",label:"Claude 4.5 Haiku",providerId:"anthropic"},{id:"claude-sonnet-5-20260201",key:"anthropic-sonnet",label:"Claude 5 Sonnet",providerId:"anthropic"}]},{id:"google",displayName:"Google Gemini",models:[{id:"gemini-2.5-flash",key:"google-flash",label:"Gemini 2.5 Flash",providerId:"google"}]},{id:"openai",displayName:"OpenAI",models:[{id:"gpt-5.4-nano",key:"openai-fast",label:"GPT-5.4 Nano (Fast)",providerId:"openai"},{id:"gpt-5.6-luna",key:"openai-smart",label:"GPT-5.6 Luna (Smart)",providerId:"openai"}]},{id:"assistant",displayName:"Zana Assistant",models:[{id:"assistant",key:"assistant",label:"Local / Active Thread Agent",providerId:"assistant"}]}];function on(){try{return _e()}catch{return null}}function Je({startSession:e=W}){let[n,r]=h(!1),i=de(),l=ue(),d=on(),m=d?.providerId,p=d?.familyId,x=P(!1),[c,g]=h(""),[u,v]=h(""),[f,C]=h(!1),[G,A]=h(!1),[T,M]=h(!1),[q,re]=h(null),[D,V]=h(null),[O,ie]=h("assistant"),[Q,ae]=h("assistant"),[rn,se]=h(null),[ee,Se]=h(!0),[Ce,et]=h(null),[te,fe]=h(!1),[$,pe]=h("polish"),[ce,Re]=h(""),[Z,ke]=h(!1),[Ee,y]=h(null),[B,le]=h("system"),[ge,be]=h(""),[U,Ae]=h(!1),[tt,Te]=h(0),[nt,Ie]=h(null),H=P(null),ne=P(null),oe=P(null),Pe=P(null);I(()=>{try{let t=localStorage.getItem(We);if(t){let s=JSON.parse(t);s.inputText&&g(s.inputText),s.outputText&&v(s.outputText),s.selectedProviderId&&ie(s.selectedProviderId),s.selectedModelId&&(x.current=!0,ae(s.selectedModelId)),s.sttProvider&&le(s.sttProvider),s.sttModel&&be(s.sttModel)}}catch{}},[]),I(()=>{let t=!0;return i.call(De).then(s=>{if(!t)return;let b=s;b&&b.llmProvider&&(se(b.llmProvider),Se(b.llmProvider!=="none")),b&&b.sttProvider&&le(b.sttProvider)}).catch(()=>{}),()=>{t=!1}},[i]),I(()=>{let t=!0;return i.call("promptVoice.settings.get").then(s=>{if(!t)return;let b=s||{};b.sttProvider&&le(b.sttProvider),b.sttModel&&be(b.sttModel)}).catch(()=>{}),()=>{t=!1}},[i]),I(()=>{let t=!0;return i.call(Oe).then(s=>{if(!t)return;let b=s;Array.isArray(b)&&b.length>0&&V(b)}).catch(()=>{}),()=>{t=!1}},[i]);let F=j(()=>{let t=(S,k)=>[...S].sort((N,R)=>k(N).localeCompare(k(R),void 0,{sensitivity:"base",numeric:!0}));if(!D||D.length===0){let S=nn.map(k=>{let N=!!(m&&k.id.toLowerCase()===m.toLowerCase()||p&&k.id.toLowerCase().includes(p.toLowerCase())),R=t(k.models,K=>K.label||K.id).map(K=>({...K,isComposerMatch:N}));return{...k,isComposerMatch:N,models:R}});return t(S,k=>k.displayName||k.id)}let s={"assistant:assistant":"assistant","openai:gpt-5.4-nano":"openai-fast","openai:gpt-5.6-luna":"openai-smart","anthropic:claude-haiku-4-5-20251001":"anthropic-haiku","anthropic:claude-sonnet-5-20260201":"anthropic-sonnet","google:gemini-2.5-flash":"google-flash"},b=D.map(S=>{let k=!!(m&&S.providerId.toLowerCase()===m.toLowerCase()||p&&S.providerId.toLowerCase().includes(p.toLowerCase())),N=t(S.models,R=>R.label||R.id).map(R=>{let K=`${S.providerId}:${R.id}`,yt=s[K]??R.id;return{id:R.id,key:yt,label:R.label||R.id,providerId:S.providerId,isComposerMatch:k}});return{id:S.providerId,displayName:S.displayName||S.providerId,isComposerMatch:k,models:N}});return t(b,S=>S.displayName||S.id)},[D,m,p]),E=j(()=>F.find(t=>t.id===O)??F[0],[F,O]),Y=j(()=>E?.models??[],[E]),L=j(()=>Y.find(s=>s.id===Q||s.key===Q)??Y[0],[Y,Q]);I(()=>{if(!x.current&&F.length>0){let t=F.find(s=>s.isComposerMatch);t&&(ie(t.id),t.models.length>0&&ae(t.models[0].key||t.models[0].id))}},[F]),I(()=>{try{localStorage.setItem(We,JSON.stringify({inputText:c,outputText:u,selectedProviderId:O,selectedModelId:Q,sttProvider:B,sttModel:ge}))}catch{}},[c,u,O,Q,B,ge]);let ot=t=>{Se(t);let s=t?E?.id??"assistant":"none",b=t?L?.id??"assistant":"";se(s),i.call("promptVoice.settings.update",{llmProvider:s,llmModel:b}).catch(()=>{y("Could not update cleanup setting.")})},rt=t=>{le(t),i.call("promptVoice.settings.update",{sttProvider:t}).catch(()=>{y("Could not update speech provider setting.")})},it=t=>{be(t),i.call("promptVoice.settings.update",{sttModel:t}).catch(()=>{})},at=t=>{x.current=!0,ie(t);let s=F.find(S=>S.id===t),b="";if(s&&s.models.length>0){let S=s.models[0].key||s.models[0].id;b=s.models[0].id,ae(S)}ee&&(se(t),i.call("promptVoice.settings.update",{llmProvider:t,llmModel:b}).catch(()=>{}))},st=t=>{x.current=!0;let s=O,b=t;for(let S of F){let k=S.models.find(N=>N.id===t||N.key===t);if(k){S.id!==O&&(ie(S.id),s=S.id),ae(k.key||k.id),b=k.id;break}}ee&&(se(s),i.call("promptVoice.settings.update",{llmProvider:s,llmModel:b}).catch(()=>{}))};I(()=>()=>{ne.current&&clearInterval(ne.current),oe.current&&clearInterval(oe.current),H.current&&H.current.cancel()},[]);let pt=j(()=>{let t=c.trim();return`${t?t.split(/\s+/).length:0} words \xB7 ${c.length} chars`},[c]),ct=j(()=>{let t=u.trim();return`${t?t.split(/\s+/).length:0} words \xB7 ${u.length} chars`},[u]),lt=j(()=>!u||!te?[]:Ye(c,u),[c,u,te]),dt=async()=>{if(U){Ae(!1),Ie(null),ne.current&&clearInterval(ne.current),oe.current&&clearInterval(oe.current);let t=H.current;if(H.current=null,!t)return;M(!0);try{let s=await t.stop(),b=await i.call(me,{audio:s.base64,mimeType:s.mimeType,transcriptionOnly:!0});b.ok&&b.status==="ok"?g(S=>X(S,b.text)):b.ok&&b.status==="no-speech"?(y("No speech detected. Try speaking closer to the microphone."),setTimeout(()=>y(null),4e3)):b.ok||y(b.message)}catch(s){y(s instanceof Error?s.message:"Transcription failed.")}finally{M(!1)}}else{y(null);try{let t=await e();H.current=t,Ae(!0),Te(0),ne.current=setInterval(()=>{Te(s=>s+1)},1e3),oe.current=setInterval(()=>{if(H.current){let s=H.current.getAudioLevel?.()??null;Ie(s)}},100)}catch(t){y(t instanceof Error?t.message:"Microphone access denied.")}}},ut=async()=>{let t=c.trim();if(!t||Z||$==="custom"&&!ce.trim())return;let s=Xe.find(R=>R.id===$),b=$==="custom"?ce.trim():s?.prompt||"Polish and format for clarity.",S=s?.tone||"technical",k=E?.id??"assistant",N=L?.id??"assistant";y(null),ke(!0);try{let R=await i.call(Le,{text:t,tone:S,customPrompt:b,llmProvider:k,llmModel:N});R.ok?(v(R.text),et(`${E?.displayName||k}: ${R.llmModel||N}`)):y(R.message)}catch(R){y(R instanceof Error?R.message:"Refinement request failed.")}finally{ke(!1)}},mt=async()=>{try{let t=await navigator.clipboard.readText();if(!t||!t.trim()){y("Clipboard is empty."),setTimeout(()=>y(null),2500);return}g(s=>X(s,t)),y("Pasted from clipboard into input draft!"),setTimeout(()=>y(null),2500)}catch{y("Clipboard access denied or unavailable."),setTimeout(()=>y(null),2500)}},ft=async()=>{if(!c)return;await Ke(c)?(A(!0),setTimeout(()=>A(!1),2e3),y("Input draft copied to clipboard!"),setTimeout(()=>y(null),2500)):(y("Failed to copy to clipboard."),setTimeout(()=>y(null),3e3))},gt=async()=>{if(!u)return;await Ke(u)?(C(!0),setTimeout(()=>C(!1),2e3),y("Refined output copied to clipboard!"),setTimeout(()=>y(null),2500)):(y("Failed to copy to clipboard."),setTimeout(()=>y(null),3e3))},bt=()=>{!c&&!u||(g(""),v(""),pe("polish"),Re(""),fe(!1),y("Studio canvas cleared."),setTimeout(()=>y(null),2500))},vt=()=>{u&&(g(u),v(""),fe(!1),y("Refined output moved to input draft."),setTimeout(()=>y(null),2500))},ht=()=>{let t=u||c;if(t)try{l.updateText(s=>X(s,t)),l.focus(),re("Inserted into Composer!"),setTimeout(()=>re(null),2500)}catch{y("Composer focus unavailable.")}},xt=_(t=>{(t.ctrlKey||t.metaKey)&&t.key.toLowerCase()==="k"&&(t.preventDefault(),pe("custom"),setTimeout(()=>Pe.current?.focus(),0))},[]);return a("div",{className:"ps-container",onKeyDown:xt,children:[o("style",{children:en}),a("header",{className:"ps-header",children:[a("div",{className:"ps-header-left",children:[o("span",{style:{fontSize:18},children:"\u{1F399}\uFE0F"}),o("span",{className:"ps-header-title",children:"Prompt Studio"}),o("span",{className:"ps-badge",children:"Voice & AI Refinement"}),q&&o("span",{className:"ps-badge",style:{background:"rgba(34, 197, 94, 0.2)",color:"#86efac"},children:q})]}),a("div",{className:"ps-header-actions",children:[a("button",{type:"button",className:"ps-btn",onClick:bt,title:"Clear current input and output",disabled:!c&&!u,children:[o("span",{children:"\u{1F5D1}\uFE0F"}),o("span",{children:"Clear"})]}),a("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:ht,disabled:!c&&!u,title:"Append current text directly into Zana Composer",children:[o("span",{children:"\u{1F4AC}"}),o("span",{children:"Insert into Composer"})]})]})]}),n?o(Ge,{rpc:i,onBack:()=>r(!1)}):a("div",{className:"ps-workspace",children:[a("aside",{className:"ps-sidebar",children:[a("section",{className:"ps-section",children:[a("div",{className:"ps-section-title",children:[o("span",{children:"Refinement Engine"}),o("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:E?.isComposerMatch?"\u2605 Composer Active":"AI Model"})]}),a("div",{className:"ps-field-group",children:[o("label",{htmlFor:"ps-provider-select",className:"ps-field-label",children:"Provider"}),o("select",{id:"ps-provider-select",className:"ps-select","aria-label":"Refinement provider",value:E?.id??"",onChange:t=>at(t.target.value),disabled:Z,children:F.map(t=>a("option",{value:t.id,children:[t.displayName,t.isComposerMatch?" \u2605 (Composer)":""]},t.id))})]}),a("div",{className:"ps-field-group",children:[a("label",{htmlFor:"ps-model-select",className:"ps-field-label",children:["Model (",Y.length,")"]}),o("select",{id:"ps-model-select",className:"ps-select","aria-label":"Refinement model",value:L?.key||L?.id||"",onChange:t=>st(t.target.value),disabled:Z||Y.length===0,children:Y.map(t=>a("option",{value:t.key||t.id,children:[t.label,t.isComposerMatch?" \u2605 (Composer)":""]},t.key||t.id))})]}),a("div",{style:{marginTop:8,paddingTop:8,borderTop:"1px solid var(--ps-border)",display:"flex",flexDirection:"column",gap:4},children:[a("label",{style:{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:11,fontWeight:500,userSelect:"none"},children:[o("input",{type:"checkbox","aria-label":"Auto-cleanup mic dictations",checked:ee,onChange:t=>ot(t.target.checked)}),o("span",{children:"Auto-cleanup mic dictations"})]}),o("span",{style:{fontSize:10,color:"var(--ps-text-subtle)",lineHeight:1.3},children:ee?`Composer mic cleans up using ${E?.displayName} (${L?.label||L?.id}).`:"Composer mic inserts raw transcript without AI cleanup."})]}),a("div",{style:{marginTop:4,fontSize:11,color:"var(--ps-text-muted)",lineHeight:1.35},children:[E?.isComposerMatch?a("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:600},children:["\u2605 Synced to Composer: ",E.displayName," (",L?.label,")"]}):E?.id==="assistant"?"Uses the active Zana assistant agent with no extra API key required.":a(J,{children:["Using ",o("strong",{children:E?.displayName})," \xB7 ",o("code",{children:L?.id})]}),Ce?a("div",{style:{marginTop:3,color:"var(--ps-text-subtle)",fontSize:10},children:["Last refined: ",Ce]}):null]})]}),a("section",{className:"ps-section",children:[a("div",{className:"ps-section-title",children:[o("span",{children:"Voice Dictation"}),o("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:B==="system"?"Host STT":B==="openai"?"OpenAI":"Google Gemini"})]}),a("div",{className:"ps-field-group",children:[o("label",{htmlFor:"ps-stt-provider-select",className:"ps-field-label",children:"Speech Provider"}),o("select",{id:"ps-stt-provider-select",className:"ps-select","aria-label":"Speech-to-text provider",value:B,onChange:t=>rt(t.target.value),disabled:U||T,children:tn.map(t=>o("option",{value:t.id,children:t.label},t.id))})]}),B!=="system"&&a("div",{className:"ps-field-group",children:[o("label",{htmlFor:"ps-stt-model-input",className:"ps-field-label",children:"Speech Model (Optional)"}),o("input",{id:"ps-stt-model-input",className:"ps-select","aria-label":"Speech-to-text model",placeholder:"Provider default",value:ge,onChange:t=>it(t.target.value),disabled:U||T})]}),a("div",{className:"ps-dictation-card",children:[a("button",{type:"button",className:`ps-btn ${U?"ps-btn-danger":T?"":"ps-btn-primary"}`,style:{width:"100%",justifyContent:"center",padding:"10px 0",opacity:T?.8:1},onClick:dt,disabled:T,"aria-label":T?"Transcribing audio":U?"Stop dictation":"Start dictation",children:[o("span",{className:T?"ps-spin":void 0,children:T?"\u23F3":U?"\u23F9\uFE0F":"\u{1F399}\uFE0F"}),o("span",{children:T?"Transcribing...":U?`Stop Dictation (${tt}s)`:"Dictate Thoughts"})]}),U&&a("div",{style:{width:"100%",display:"flex",flexDirection:"column",gap:4},children:[o("div",{className:"ps-meter-bar",children:o("div",{className:"ps-meter-fill",style:{width:`${Math.min(100,(nt??.1)*100)}%`}})}),o("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:"Listening live..."})]})]}),o("div",{style:{fontSize:10,color:"var(--ps-text-subtle)",lineHeight:1.3},children:B==="system"?"Uses host Zana voice transcription without requiring external API keys.":B==="openai"?"Uses OpenAI Whisper with the OpenAI API key configured in Zana.":"Uses Google Gemini with the Google AI API key configured in Zana."})]}),a("section",{className:"ps-section",children:[o("div",{className:"ps-section-title",children:"How should we improve it?"}),a("div",{className:"ps-presets-list",role:"radiogroup","aria-label":"How should we improve it?",children:[Xe.map(t=>a("label",{className:`ps-preset-btn ${$===t.id?"active":""}`,children:[a("span",{className:"preset-title",children:[o("input",{type:"radio",name:"refinement-style",value:t.id,checked:$===t.id,onChange:()=>pe(t.id)}),t.title]}),o("span",{className:"preset-desc",children:t.desc})]},t.id)),a("label",{className:`ps-preset-btn ${$==="custom"?"active":""}`,children:[a("span",{className:"preset-title",children:[o("input",{type:"radio",name:"refinement-style",value:"custom",checked:$==="custom",onChange:()=>pe("custom")}),"Custom instructions"]}),o("span",{className:"preset-desc",children:"Describe your own transformation."})]})]}),$==="custom"&&o("textarea",{ref:Pe,className:"ps-custom-prompt-input","aria-label":"Custom instructions",placeholder:"e.g. Turn into user stories with acceptance criteria...",value:ce,onChange:t=>Re(t.target.value)})]}),o("button",{type:"button",className:"ps-btn",style:{marginTop:"auto"},onClick:()=>r(!0),children:"Settings"})]}),a("main",{className:"ps-editor-canvas",children:[a("section",{className:"ps-pane",children:[a("div",{className:"ps-pane-header",children:[a("div",{className:"ps-pane-title",children:[o("span",{children:"\u{1F4DD}"}),o("span",{children:"Raw Input Draft"})]}),a("div",{style:{display:"flex",gap:6},children:[o("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:mt,title:"Paste from clipboard into input draft","aria-label":"Paste into input draft",children:"\u{1F4CB} Paste"}),o("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:ft,disabled:!c,title:"Copy raw input","aria-label":"Copy raw input",children:G?"\u2705 Copied":"\u{1F4CB} Copy"}),o("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>g(""),disabled:!c,title:"Clear input",children:"Clear"})]})]}),o("textarea",{className:"ps-textarea",placeholder:"Type your raw thoughts or click Dictate in the left sidebar to speak...",value:c,onChange:t=>g(t.target.value),"aria-label":"Raw Input Text"})]}),a("div",{className:"ps-action-bar",children:[a("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12},children:[o("span",{className:"ps-pill",children:"\u2B07 Refine pipeline"}),o("span",{style:{color:"var(--ps-text-muted)"},children:c.trim()?`${c.trim().split(/\s+/).length} words ready`:"Add text to get started"})]}),o("div",{style:{display:"flex",alignItems:"center",gap:6},children:a("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:()=>ut(),disabled:Z||!c.trim()||$==="custom"&&!ce.trim(),title:"Transform raw draft into polished output",children:[o("span",{children:Z?"\u23F3":"\u26A1"}),o("span",{children:Z?"Refining...":"Refine text"})]})})]}),a("section",{className:"ps-pane",children:[a("div",{className:"ps-pane-header",children:[a("div",{className:"ps-pane-title",children:[o("span",{children:"\u2728"}),o("span",{children:"Result"})]}),a("div",{style:{display:"flex",gap:6},children:[u&&a("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>fe(t=>!t),title:"Toggle inline diff against input draft",children:[o("span",{children:te?"\u{1F441}\uFE0F":"\u{1F50D}"}),o("span",{children:te?"View Clean":"View Diff"})]}),o("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:vt,disabled:!u,title:"Move output to input draft for iterative re-refinement",children:"\u2B06 Replace Input"}),o("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:gt,disabled:!u,title:"Copy refined text to clipboard","aria-label":"Copy refined output",children:f?"\u2705 Copied":"\u{1F4CB} Copy"})]})]}),te&&u?o("div",{className:"ps-output-view",children:lt.map((t,s)=>t.type==="added"?o("span",{className:"ps-diff-added",children:t.text},s):t.type==="removed"?o("span",{className:"ps-diff-removed",children:t.text},s):o("span",{className:"ps-diff-unchanged",children:t.text},s))}):o("textarea",{className:"ps-textarea",placeholder:"Polished, structured output will appear here after clicking Refine...",value:u,onChange:t=>v(t.target.value),"aria-label":"Refined output"})]})]})]}),a("footer",{className:"ps-status-bar",children:[a("div",{style:{display:"flex",gap:12},children:[a("span",{children:["Input: ",pt]}),a("span",{children:["Output: ",ct]}),Ee&&o("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:500},children:Ee})]}),a("div",{style:{display:"flex",gap:12,alignItems:"center"},children:[a("span",{children:["Engine: ",E?.displayName," \xB7 ",L?.label]}),a("span",{className:"ps-pill",children:["Mic cleanup: ",ee?`${E?.displayName} (${L?.label||L?.id})`:"Off (Raw)"]}),E?.isComposerMatch&&o("span",{className:"ps-pill",style:{color:"var(--accent, #3b82f6)"},children:"\u2605 Composer Synced"}),o("span",{children:"Zana Prompt Studio"})]})]})]})}var Qe="prompt-studio",go=Ne(e=>{we(),e.composer.customize({id:"prompt-voice-mic",actions:[{id:"prompt-voice-mic",component:je}]}),e.slots.navPanel?.({id:"prompt-studio",title:"Prompt Studio",icon:"Sparkles",path:Qe,component:Je}),e.slots.commandPaletteAction?.({id:"open-prompt-studio",title:"Prompt Studio: Open Canvas",run:n=>{n.navigate?.(`/${Qe}`)}})});export{Qe as PROMPT_STUDIO_PANEL_PATH,go as default};
//# sourceMappingURL=app.js.map
