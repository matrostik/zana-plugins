function pe(){return globalThis.__ZCC_PLUGIN_RUNTIME__??{}}function ce(e){throw new Error(`${e} is not available until the host plugin runtime is installed`)}function we(e){return{__zccPluginApp:!0,setup:e}}function oe(){return pe().useRpc?.()??ce("useRpc")}function re(){return pe().useComposer?.()??ce("useComposer")}function Se(){return pe().useComposerView?.()??ce("useComposerView")}var at=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4"];var M=class extends Error{code;constructor(t,o){super(o),this.name="RecordingError",this.code=t}};function st(e){return at.find(t=>e(t))??null}var pt="audio/webm";function ct(){return{getUserMedia:e=>navigator.mediaDevices.getUserMedia(e),createRecorder:(e,t)=>new MediaRecorder(e,t?{mimeType:t}:void 0),isTypeSupported:e=>typeof MediaRecorder<"u"&&MediaRecorder.isTypeSupported(e)}}async function lt(e){try{return await e.getUserMedia({audio:!0})}catch(t){let o=t instanceof Error?t.name:"";throw o==="NotAllowedError"||o==="SecurityError"?new M("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again."):new M("MIC_UNAVAILABLE","No microphone is available. Connect one and try again.")}}function dt(e){return new Promise((t,o)=>{let a=new FileReader;a.onload=()=>{let c=typeof a.result=="string"?a.result:"";t(c.slice(c.indexOf(",")+1))},a.onerror=()=>o(new M("RECORDING_FAILED","The recording could not be read.")),a.readAsDataURL(e)})}async function ut(e,t){let o=new Blob(e,{type:t});return{base64:await dt(o),mimeType:o.type||t}}function mt(e,t){if(!(e>0&&Number.isFinite(e)))return()=>{};let o=setTimeout(t,e);return()=>clearTimeout(o)}var ft="That recording is too large to transcribe. Keep dictation shorter and try again.";function bt(e,t){let o=Math.max(t,e),a=[],c=0,d=!1;return{chunks:a,get overflowed(){return d},add(u){return u.size===0||d?"ignored":c+u.size>o?(d=!0,"overflow"):(a.push(u),c+=u.size,c>=e?"limit-reached":"accepted")}}}function gt(e,t){let o=new Promise((a,c)=>{e.onstop=()=>a(),e.onerror=()=>{let d=new M("RECORDING_FAILED","Recording stopped unexpectedly. Try again.");t(d),c(d)}});return o.catch(()=>{}),o}function ht(e,t,o,a){let c=gt(e,a);return e.ondataavailable=d=>{let u=t.add(d.data);(u==="limit-reached"||u==="overflow")&&o()},e.start(1e3),c}async function vt(e,t,o,a){try{await e}finally{t()}if(o.overflowed)throw new M("RECORDING_FAILED",ft);return ut(o.chunks,a)}function xt(e){let t=()=>{};return{stopRecorder(){t(),e.state!=="inactive"&&e.stop()},armTimer(o,a){t=mt(o,a)}}}function yt(e,t){let o=null;return{attach(a){o=a},detach(){o=null},autoStop(){e();let a=o?.onAutoStop;o&&(o.onAutoStop=void 0),a?.()},fail(a){e(),t();let c=o?.onError;o=null,c?.(a)}}}function wt(e,t,o,a){let c=bt(a.maxBytes??9437184,a.hardMaxBytes??10485760),{stopRecorder:d,armTimer:u}=xt(e),i=yt(d,t);u(a.maxDurationMs??12e4,i.autoStop);let f=ht(e,c,i.autoStop,i.fail),l={onError:a.onError,onAutoStop:a.onAutoStop,async stop(){d();try{return await vt(f,t,c,e.mimeType||o)}finally{i.detach()}},cancel(){d(),t(),i.detach()}};return i.attach(l),l}var Z=()=>St();async function St(e=ct(),t={}){let o=await lt(e),a=Rt(o),c=o.getTracks(),d,u=()=>{for(let i of c)d&&i.removeEventListener?.("ended",d);a?.close(),c.forEach(i=>i.stop())};try{let i=st(e.isTypeSupported)??pt,f=e.createRecorder(o,i),l=wt(f,u,i,t);return l.getAudioLevel=()=>a?.level()??null,d=()=>{let b=l.onError;l.cancel(),b?.(new M("MIC_UNAVAILABLE","Microphone disconnected. Check your device and try again."))},c.forEach(b=>b.addEventListener?.("ended",d)),l}catch(i){throw u(),i instanceof M?i:new M("RECORDING_FAILED",i instanceof Error?i.message:"The recording could not be started.")}}function Rt(e){let t;try{t=new AudioContext;let o=t.createMediaStreamSource(e),a=t.createAnalyser();a.fftSize=256,o.connect(a);let c=new Uint8Array(a.fftSize),d=t,u=!1;return{level(){if(d.state&&d.state!=="running")return null;a.getByteTimeDomainData(c);let i=c.reduce((f,l)=>f+((l-128)/128)**2,0)/c.length;return Math.min(1,Math.sqrt(i)*5)},close(){u||(u=!0,o.disconnect(),d.close().catch(i=>console.error("Prompt Voice audio meter cleanup failed",i)))}}}catch(o){return t&&t.close().catch(a=>console.error("Prompt Voice audio meter cleanup failed",a)),console.warn("Prompt Voice audio meter unavailable",o),null}}var m=globalThis.__ZCC_HOST_REACT__;var Vt=m.Children,Ht=m.Component,Gt=m.Fragment,qt=m.StrictMode,Zt=m.Suspense,Yt=m.cloneElement,Kt=m.createContext,Xt=m.createElement,Jt=m.createRef,Wt=m.forwardRef,Qt=m.isValidElement,en=m.lazy,tn=m.memo,nn=m.startTransition,T=m.useCallback,on=m.useContext,rn=m.useDebugValue,an=m.useDeferredValue,P=m.useEffect,sn=m.useId,pn=m.useImperativeHandle,cn=m.useInsertionEffect,ln=m.useLayoutEffect,F=m.useMemo,Re=m.useReducer,_=m.useRef,v=m.useState,dn=m.useSyncExternalStore,un=m.useTransition,mn=m.version;var ie="promptVoice.transcribe",Ee="promptVoice.status",Ce="promptVoice.rephrase",ke="promptVoice.availableModels";function Y(e,t){let o=t.trim();return o?e?/\s$/.test(e)?`${e}${o}`:`${e} ${o}`:o:e}var Et="No speech detected.",le={phase:"idle",notice:null,error:null};function Te(e,t){switch(t.type){case"START":return e.phase==="idle"||e.phase==="error"?{phase:"starting",notice:null,error:null}:e;case"STARTED":return e.phase==="starting"?{...e,phase:"recording"}:e;case"STOP":return e.phase==="recording"||e.phase==="starting"?{phase:"processing",notice:null,error:null}:e;case"CANCEL":return e.phase==="recording"||e.phase==="starting"?{...le}:e;case"SUCCESS":case"NO_SPEECH":return e.phase!=="processing"?e:{phase:"idle",notice:t.type==="NO_SPEECH"?Et:t.notice,error:null};case"CLEAR_NOTICE":return e.notice?{...e,notice:null}:e;case"FAILURE":return{phase:"error",notice:null,error:t.message}}}var Ct="Prompt Voice returned an unexpected response. Try again.",kt="Dictation failed. Try again.",Tt=4e3;function At(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}async function It(e,t){let o=await e.call(ie,{audio:t.base64,mimeType:t.mimeType});if(!At(o))throw new Error(Ct);return o}function Ae(e){return e instanceof Error&&e.message?e.message:kt}function Nt(e,t,o){if(!e.ok){o({type:"FAILURE",message:e.message});return}if(e.status==="no-speech"){o({type:"NO_SPEECH"});return}t.updateText(c=>Y(c,e.text)),t.focus();let a=e.refineNotice?`Inserted the raw transcript. ${e.refineNotice.message}`:"Added to draft.";o({type:"SUCCESS",notice:a})}function Pt(e,t,o,a){return t()?(e.onError=c=>{t()&&a(c)},e.onAutoStop=()=>{t()&&o()},e):(e.cancel(),null)}function _t(e,t,o,a,c){let d=u=>c({type:"FAILURE",message:Ae(u)});return e.then(u=>{let i=Pt(u,o,a,f=>{t.current=null,d(f)});return i&&(t.current=i),i},u=>(o()&&d(u),null))}function Dt(e,t){let o=_(null),a=_(null),c=_(0),d=_(!0),u=T(()=>{c.current++,a.current=null,o.current&&(o.current.cancel(),o.current=null),t({type:"CANCEL"})},[t]);P(()=>(d.current=!0,()=>{d.current=!1,u()}),[u]);let i=T(async()=>{let y=a.current?await a.current:o.current;return o.current=null,y},[]),f=T(async y=>{let x=++c.current,w=()=>d.current&&c.current===x,S=_t(e(),o,w,y,t);a.current=S,await S&&w()&&t({type:"STARTED"}),a.current===S&&(a.current=null)},[t,e]),l=T(()=>d.current,[]),b=T(()=>o.current?.getAudioLevel?.()??null,[]);return{start:f,takeSession:i,cancel:u,isMounted:l,getAudioLevel:b}}function Ie({startSession:e=Z,noticeDurationMs:t=Tt}={}){let o=re(),a=oe(),[c,d]=Re(Te,le),{start:u,takeSession:i,cancel:f,isMounted:l,getAudioLevel:b}=Dt(e,d),[y,x]=v(null),[w,S]=v(0),[E,R]=v(!1);P(()=>{if(c.phase!=="recording"){x(null),S(0);return}let C=Date.now(),I=()=>{x(b()),S(Math.floor((Date.now()-C)/1e3))};I();let L=setInterval(I,100);return()=>clearInterval(L)},[b,c.phase]),P(()=>{if(!c.notice)return;let C=setTimeout(()=>{d({type:"CLEAR_NOTICE"})},t);return()=>clearTimeout(C)},[t,c.notice]);let U=T(()=>{d({type:"CLEAR_NOTICE"})},[]),A=T(async()=>{d({type:"STOP"});let C=await i();if(!(!l()||!C))try{let I=await C.stop();if(!l())return;let L=await It(a,I);if(!l())return;Nt(L,o,d)}catch(I){if(!l())return;d({type:"FAILURE",message:Ae(I)})}},[o,l,a,i]),$=T(async()=>{R(!1),d({type:"START"}),await u(()=>{R(!0),A()})},[A,u]),ae=T(()=>{c.phase==="recording"||c.phase==="starting"?A():c.phase!=="processing"&&$()},[$,A,c.phase]);return{phase:c.phase,error:c.error,notice:c.notice,level:y,seconds:w,autoStopped:E,onClick:ae,cancel:f,clearNotice:U,beginDictation:$,finishDictation:A}}var de=`/* Base Container */\r
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
`;var Ne=globalThis.__ZCC_HOST_REACT__,K=Ne.Fragment;function r(e,t,o){return Ne.createElement(e,o===void 0?t:{...t,key:o})}var p=r;var Lt="Dictation",Pe="zcc-ext-prompt-voice-styles";function ue(){if(typeof document>"u")return;let e=document.getElementById(Pe);e||(e=document.createElement("style"),e.id=Pe,document.head.appendChild(e)),e.textContent!==de&&(e.textContent=de)}var Ot={idle:"Start dictation",starting:"Stop dictation",recording:"Stop dictation",processing:"Transcribing",error:"Start dictation"},_e={position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",border:0};function De({startSession:e=Z}){ue();let{phase:t,error:o,notice:a,onClick:c,cancel:d,clearNotice:u,level:i,seconds:f,autoStopped:l}=Ie({startSession:e}),b=t==="starting"||t==="recording"||t==="processing",y=t==="idle"&&!!a,x=`${Math.floor(f/60)}:${String(f%60).padStart(2,"0")}`;return p("div",{className:`pv-mic pv-dictation-pill pv-phase-${t} ${y?"pv-has-notice":""}`,onClick:y?u:void 0,title:y?"Click to dismiss":void 0,children:[r("button",{type:"button",className:`pv-mic-button pv-mic-${t} ${b?"pv-pill-btn-stop":"pv-idle-icon"}`,"aria-label":Lt,"aria-pressed":t==="recording"||t==="starting",title:Ot[t],disabled:t==="processing",onClick:c,style:y?{display:"none"}:void 0,children:t==="idle"||t==="error"?r("svg",{viewBox:"0 0 24 24",width:"16",height:"16","aria-hidden":"true",focusable:"false",children:r("path",{d:"M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5Zm6 9h2v-3h-2v3Z",fill:"currentColor"})}):t==="processing"?r("span",{className:"pv-mic-spinner","aria-hidden":"true"}):r("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:r("rect",{x:"6",y:"6",width:"12",height:"12",rx:"2.5",fill:"currentColor"})})}),y?p("span",{role:"status",className:"pv-notice-content",children:[r("span",{className:"pv-notice-check",children:"\u2713"}),r("span",{className:"pv-pill-status",children:a})]}):null,t==="starting"?p(K,{children:[p("div",{className:"pv-pill-timer-badge",children:[r("div",{className:"pv-pill-dot pv-pill-dot-starting"}),r("span",{className:"pv-pill-timer-text",children:"0:00"})]}),p("div",{className:"pv-pill-center",role:"status",children:[r("span",{className:"pv-mic-spinner","aria-hidden":"true"}),r("span",{className:"pv-pill-status",children:"Requesting microphone\u2026"})]})]}):null,t==="recording"?p(K,{children:[p("div",{className:"pv-pill-timer-badge",children:[r("div",{className:"pv-pill-dot"}),p("span",{className:"pv-pill-timer-text",children:[r("span",{className:"pv-sr-only",style:_e,children:"Recording "}),x]})]}),p("div",{className:"pv-pill-center",role:"status",children:[i===null?r("span",{className:"pv-sr-only",style:_e,children:"Audio meter unavailable"}):null,r("span",{className:`pv-pill-waveform ${i===null?"animated":""}`,"aria-label":"Microphone audio activity",role:"meter","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":Math.round((i??.3)*100),children:[.4,.7,1,.7,.4].map((w,S)=>r("span",{className:"pv-pill-waveform-bar",style:i!==null?{height:`${Math.max(3,i*w*20)}px`}:void 0},S))}),r("span",{className:"pv-pill-status",children:"Listening..."}),i!==null&&i<.015&&f>=5?r("span",{className:"pv-mic-quiet-warning",children:"No audio detected \u2014 check your microphone."}):null]})]}):null,t==="processing"?p(K,{children:[r("div",{className:"pv-pill-timer-badge",children:r("span",{className:"pv-pill-timer-text",children:x})}),r("div",{className:"pv-pill-center",role:"status",children:p("span",{className:"pv-pill-status",children:[r("span",{className:"pv-mic-spinner","aria-hidden":"true"})," ",l?"Recording limit reached. ":"","Transcribing and refining\u2026"]})})]}):null,t==="starting"||t==="recording"?r("button",{type:"button",className:"pv-mic-cancel pv-pill-btn-cancel",onClick:d,"aria-label":"Cancel recording",title:"Cancel recording",children:r("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:r("path",{d:"M18 6L6 18M6 6l12 12",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round"})})}):null,t==="error"&&o?r("span",{role:"alert",className:"pv-pill-status pv-mic-error",children:o}):null]})}function Me(e){return e?e.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]+/gu)||[]:[]}var Le=1200;function Oe(e,t){if(!e&&!t)return[];if(e===t)return[{type:"unchanged",text:e}];if(!e)return[{type:"added",text:t}];if(!t)return[{type:"removed",text:e}];let o=Me(e),a=Me(t),c=o.length,d=a.length;if(c>Le||d>Le)return[{type:"removed",text:e},{type:"added",text:t}];let u=d+1,i=new Uint32Array((c+1)*u);for(let x=1;x<=c;x++){let w=x*u,S=(x-1)*u,E=o[x-1];for(let R=1;R<=d;R++)if(E===a[R-1])i[w+R]=i[S+(R-1)]+1;else{let U=i[w+(R-1)],A=i[S+R];i[w+R]=U>A?U:A}}let f=[],l=c,b=d;for(;l>0||b>0;){let x=l*u,w=(l-1)*u;l>0&&b>0&&o[l-1]===a[b-1]?(f.push({type:"unchanged",text:o[l-1]}),l--,b--):b>0&&(l===0||i[x+(b-1)]>=i[w+b])?(f.push({type:"added",text:a[b-1]}),b--):l>0&&(b===0||i[x+(b-1)]<i[w+b])&&(f.push({type:"removed",text:o[l-1]}),l--)}f.reverse();let y=[];for(let x of f)y.length>0&&y[y.length-1].type===x.type?y[y.length-1].text+=x.text:y.push({...x});return y}var zt=`
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
`;async function ze(e){if(!e)return!1;if(typeof navigator<"u"&&navigator.clipboard&&typeof navigator.clipboard.writeText=="function")try{return await navigator.clipboard.writeText(e),!0}catch{}if(typeof document<"u")try{let t=document.createElement("textarea");t.value=e,t.setAttribute("readonly",""),t.style.position="fixed",t.style.top="-9999px",t.style.left="-9999px",t.style.opacity="0",document.body.appendChild(t),t.focus(),t.select();let o=document.execCommand("copy");if(document.body.removeChild(t),o)return!0}catch{}return!1}var $e="zcc:prompt-voice:studio-draft:v1",Be=[{id:"polish",title:"Clean up writing",icon:"\u2728",desc:"Fix punctuation, grammar, and stuttering.",prompt:"Clean up disfluencies, typos, and improve sentence flow without altering intent.",tone:"technical"},{id:"executive",title:"Summarize",icon:"\u26A1",desc:"Condense into punchy bullet points.",prompt:"Summarize the core request into crisp, high-level executive bullet points.",tone:"formal"},{id:"spec",title:"Create a technical spec",icon:"\u{1F4D0}",desc:"Format with Goals, Context, Steps.",prompt:"Transform into a structured technical spec with ## Goal, ## Architecture, and ## Implementation Steps.",tone:"technical"},{id:"chat",title:"Make it conversational",icon:"\u{1F4AC}",desc:"Natural, conversational tone.",prompt:"Rephrase in a warm, polite, and helpful conversational tone.",tone:"conversational"}],$t=[{id:"assistant",displayName:"Zana Assistant",models:[{id:"assistant",key:"assistant",label:"Local / Active Thread Agent",providerId:"assistant"}]},{id:"openai",displayName:"OpenAI",models:[{id:"gpt-5.4-nano",key:"openai-fast",label:"GPT-5.4 Nano (Fast)",providerId:"openai"},{id:"gpt-5.6-luna",key:"openai-smart",label:"GPT-5.6 Luna (Smart)",providerId:"openai"}]},{id:"anthropic",displayName:"Anthropic",models:[{id:"claude-haiku-4-5-20251001",key:"anthropic-haiku",label:"Claude 4.5 Haiku",providerId:"anthropic"},{id:"claude-sonnet-5-20260201",key:"anthropic-sonnet",label:"Claude 5 Sonnet",providerId:"anthropic"}]},{id:"google",displayName:"Google Gemini",models:[{id:"gemini-2.5-flash",key:"google-flash",label:"Gemini 2.5 Flash",providerId:"google"}]}];function Bt(){try{return Se()}catch{return null}}function Fe({startSession:e=Z}){let t=oe(),o=re(),a=Bt(),c=a?.providerId,d=a?.familyId,u=_(!1),[i,f]=v(""),[l,b]=v(""),[y,x]=v(!1),[w,S]=v(!1),[E,R]=v(!1),[U,A]=v(null),[$,ae]=v(null),[C,I]=v("assistant"),[L,X]=v("assistant"),[Ft,je]=v(null),[me,Ve]=v(null),[J,se]=v(!1),[O,ee]=v("polish"),[te,fe]=v(""),[V,be]=v(!1),[ge,h]=v(null),[H,he]=v(!1),[He,ve]=v(0),[Ge,xe]=v(null),j=_(null),W=_(null),Q=_(null),ye=_(null);P(()=>{try{let n=localStorage.getItem($e);if(n){let s=JSON.parse(n);s.inputText&&f(s.inputText),s.outputText&&b(s.outputText),s.selectedProviderId&&I(s.selectedProviderId),s.selectedModelId&&(u.current=!0,X(s.selectedModelId))}}catch{}},[]),P(()=>{let n=!0;return t.call(Ee).then(s=>{if(!n)return;let g=s;g&&g.llmProvider&&je(g.llmProvider)}).catch(()=>{}),()=>{n=!1}},[t]),P(()=>{let n=!0;return t.call(ke).then(s=>{if(!n)return;let g=s;Array.isArray(g)&&g.length>0&&ae(g)}).catch(()=>{}),()=>{n=!1}},[t]);let z=F(()=>{if(!$||$.length===0)return $t.map(s=>{let g=!!(c&&s.id.toLowerCase()===c.toLowerCase()||d&&s.id.toLowerCase().includes(d.toLowerCase()));return{...s,isComposerMatch:g,models:s.models.map(D=>({...D,isComposerMatch:g}))}});let n={"assistant:assistant":"assistant","openai:gpt-5.4-nano":"openai-fast","openai:gpt-5.6-luna":"openai-smart","anthropic:claude-haiku-4-5-20251001":"anthropic-haiku","anthropic:claude-sonnet-5-20260201":"anthropic-sonnet","google:gemini-2.5-flash":"google-flash"};return $.map(s=>{let g=!!(c&&s.providerId.toLowerCase()===c.toLowerCase()||d&&s.providerId.toLowerCase().includes(d.toLowerCase())),D=s.models.map(B=>{let ne=`${s.providerId}:${B.id}`,N=n[ne]??B.id;return{id:B.id,key:N,label:B.label||B.id,providerId:s.providerId,isComposerMatch:g}});return{id:s.providerId,displayName:s.displayName||s.providerId,isComposerMatch:g,models:D}})},[$,c,d]),k=F(()=>z.find(n=>n.id===C)??z[0],[z,C]),G=F(()=>k?.models??[],[k]),q=F(()=>G.find(s=>s.id===L||s.key===L)??G[0],[G,L]);P(()=>{if(!u.current&&z.length>0){let n=z.find(s=>s.isComposerMatch);n&&(I(n.id),n.models.length>0&&X(n.models[0].key||n.models[0].id))}},[z]),P(()=>{try{localStorage.setItem($e,JSON.stringify({inputText:i,outputText:l,selectedProviderId:C,selectedModelId:L}))}catch{}},[i,l,C,L]);let qe=n=>{u.current=!0,I(n);let s=z.find(g=>g.id===n);s&&s.models.length>0&&X(s.models[0].key||s.models[0].id)},Ze=n=>{u.current=!0;for(let s of z){let g=s.models.find(D=>D.id===n||D.key===n);if(g){s.id!==C&&I(s.id),X(g.key||g.id);return}}X(n)};P(()=>()=>{W.current&&clearInterval(W.current),Q.current&&clearInterval(Q.current),j.current&&j.current.cancel()},[]);let Ye=F(()=>{let n=i.trim();return`${n?n.split(/\s+/).length:0} words \xB7 ${i.length} chars`},[i]),Ke=F(()=>{let n=l.trim();return`${n?n.split(/\s+/).length:0} words \xB7 ${l.length} chars`},[l]),Xe=F(()=>!l||!J?[]:Oe(i,l),[i,l,J]),Je=async()=>{if(H){he(!1),xe(null),W.current&&clearInterval(W.current),Q.current&&clearInterval(Q.current);let n=j.current;if(j.current=null,!n)return;R(!0);try{let s=await n.stop(),g=await t.call(ie,{audio:s.base64,mimeType:s.mimeType,transcriptionOnly:!0});g.ok&&g.status==="ok"?f(D=>Y(D,g.text)):g.ok&&g.status==="no-speech"?(h("No speech detected. Try speaking closer to the microphone."),setTimeout(()=>h(null),4e3)):g.ok||h(g.message)}catch(s){h(s instanceof Error?s.message:"Transcription failed.")}finally{R(!1)}}else{h(null);try{let n=await e();j.current=n,he(!0),ve(0),W.current=setInterval(()=>{ve(s=>s+1)},1e3),Q.current=setInterval(()=>{if(j.current){let s=j.current.getAudioLevel?.()??null;xe(s)}},100)}catch(n){h(n instanceof Error?n.message:"Microphone access denied.")}}},We=async()=>{let n=i.trim();if(!n||V||O==="custom"&&!te.trim())return;let s=Be.find(N=>N.id===O),g=O==="custom"?te.trim():s?.prompt||"Polish and format for clarity.",D=s?.tone||"technical",B=k?.id??"assistant",ne=q?.id??"assistant";h(null),be(!0);try{let N=await t.call(Ce,{text:n,tone:D,customPrompt:g,llmProvider:B,llmModel:ne});N.ok?(b(N.text),Ve(`${k?.displayName||B}: ${N.llmModel||ne}`)):h(N.message)}catch(N){h(N instanceof Error?N.message:"Refinement request failed.")}finally{be(!1)}},Qe=async()=>{try{let n=await navigator.clipboard.readText();if(!n||!n.trim()){h("Clipboard is empty."),setTimeout(()=>h(null),2500);return}f(s=>Y(s,n)),h("Pasted from clipboard into input draft!"),setTimeout(()=>h(null),2500)}catch{h("Clipboard access denied or unavailable."),setTimeout(()=>h(null),2500)}},et=async()=>{if(!i)return;await ze(i)?(S(!0),setTimeout(()=>S(!1),2e3),h("Input draft copied to clipboard!"),setTimeout(()=>h(null),2500)):(h("Failed to copy to clipboard."),setTimeout(()=>h(null),3e3))},tt=async()=>{if(!l)return;await ze(l)?(x(!0),setTimeout(()=>x(!1),2e3),h("Refined output copied to clipboard!"),setTimeout(()=>h(null),2500)):(h("Failed to copy to clipboard."),setTimeout(()=>h(null),3e3))},nt=()=>{!i&&!l||(f(""),b(""),ee("polish"),fe(""),se(!1),h("Studio canvas cleared."),setTimeout(()=>h(null),2500))},ot=()=>{l&&(f(l),b(""),se(!1),h("Refined output moved to input draft."),setTimeout(()=>h(null),2500))},rt=()=>{let n=l||i;if(n)try{o.updateText(s=>Y(s,n)),o.focus(),A("Inserted into Composer!"),setTimeout(()=>A(null),2500)}catch{h("Composer focus unavailable.")}},it=T(n=>{(n.ctrlKey||n.metaKey)&&n.key.toLowerCase()==="k"&&(n.preventDefault(),ee("custom"),setTimeout(()=>ye.current?.focus(),0))},[]);return p("div",{className:"ps-container",onKeyDown:it,children:[r("style",{children:zt}),p("header",{className:"ps-header",children:[p("div",{className:"ps-header-left",children:[r("span",{style:{fontSize:18},children:"\u{1F399}\uFE0F"}),r("span",{className:"ps-header-title",children:"Prompt Studio"}),r("span",{className:"ps-badge",children:"Voice & AI Refinement"}),U&&r("span",{className:"ps-badge",style:{background:"rgba(34, 197, 94, 0.2)",color:"#86efac"},children:U})]}),p("div",{className:"ps-header-actions",children:[p("button",{type:"button",className:"ps-btn",onClick:nt,title:"Clear current input and output",disabled:!i&&!l,children:[r("span",{children:"\u{1F5D1}\uFE0F"}),r("span",{children:"Clear"})]}),p("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:rt,disabled:!i&&!l,title:"Append current text directly into Zana Composer",children:[r("span",{children:"\u{1F4AC}"}),r("span",{children:"Insert into Composer"})]})]})]}),p("div",{className:"ps-workspace",children:[p("aside",{className:"ps-sidebar",children:[p("section",{className:"ps-section",children:[p("div",{className:"ps-section-title",children:[r("span",{children:"Refinement Engine"}),r("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:k?.isComposerMatch?"\u2605 Composer Active":"AI Model"})]}),p("div",{className:"ps-field-group",children:[r("label",{htmlFor:"ps-provider-select",className:"ps-field-label",children:"Provider"}),r("select",{id:"ps-provider-select",className:"ps-select","aria-label":"Refinement provider",value:k?.id??"",onChange:n=>qe(n.target.value),disabled:V,children:z.map(n=>p("option",{value:n.id,children:[n.displayName,n.isComposerMatch?" \u2605 (Composer)":""]},n.id))})]}),p("div",{className:"ps-field-group",children:[p("label",{htmlFor:"ps-model-select",className:"ps-field-label",children:["Model (",G.length,")"]}),r("select",{id:"ps-model-select",className:"ps-select","aria-label":"Refinement model",value:q?.key||q?.id||"",onChange:n=>Ze(n.target.value),disabled:V||G.length===0,children:G.map(n=>p("option",{value:n.key||n.id,children:[n.label,n.isComposerMatch?" \u2605 (Composer)":""]},n.key||n.id))})]}),p("div",{style:{marginTop:4,fontSize:11,color:"var(--ps-text-muted)",lineHeight:1.35},children:[k?.isComposerMatch?p("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:600},children:["\u2605 Synced to Composer: ",k.displayName," (",q?.label,")"]}):k?.id==="assistant"?"Uses the active Zana assistant agent with no extra API key required.":p(K,{children:["Using ",r("strong",{children:k?.displayName})," \xB7 ",r("code",{children:q?.id})]}),me?p("div",{style:{marginTop:3,color:"var(--ps-text-subtle)",fontSize:10},children:["Last refined: ",me]}):null]})]}),p("section",{className:"ps-section",children:[p("div",{className:"ps-section-title",children:[r("span",{children:"Voice Dictation"}),r("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:"Host STT"})]}),p("div",{className:"ps-dictation-card",children:[p("button",{type:"button",className:`ps-btn ${H?"ps-btn-danger":E?"":"ps-btn-primary"}`,style:{width:"100%",justifyContent:"center",padding:"10px 0",opacity:E?.8:1},onClick:Je,disabled:E,"aria-label":E?"Transcribing audio":H?"Stop dictation":"Start dictation",children:[r("span",{className:E?"ps-spin":void 0,children:E?"\u23F3":H?"\u23F9\uFE0F":"\u{1F399}\uFE0F"}),r("span",{children:E?"Transcribing...":H?`Stop Dictation (${He}s)`:"Dictate Thoughts"})]}),H&&p("div",{style:{width:"100%",display:"flex",flexDirection:"column",gap:4},children:[r("div",{className:"ps-meter-bar",children:r("div",{className:"ps-meter-fill",style:{width:`${Math.min(100,(Ge??.1)*100)}%`}})}),r("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:"Listening live..."})]})]})]}),p("section",{className:"ps-section",children:[r("div",{className:"ps-section-title",children:"How should we improve it?"}),p("div",{className:"ps-presets-list",role:"radiogroup","aria-label":"How should we improve it?",children:[Be.map(n=>p("label",{className:`ps-preset-btn ${O===n.id?"active":""}`,children:[p("span",{className:"preset-title",children:[r("input",{type:"radio",name:"refinement-style",value:n.id,checked:O===n.id,onChange:()=>ee(n.id)}),n.title]}),r("span",{className:"preset-desc",children:n.desc})]},n.id)),p("label",{className:`ps-preset-btn ${O==="custom"?"active":""}`,children:[p("span",{className:"preset-title",children:[r("input",{type:"radio",name:"refinement-style",value:"custom",checked:O==="custom",onChange:()=>ee("custom")}),"Custom instructions"]}),r("span",{className:"preset-desc",children:"Describe your own transformation."})]})]}),O==="custom"&&r("textarea",{ref:ye,className:"ps-custom-prompt-input","aria-label":"Custom instructions",placeholder:"e.g. Turn into user stories with acceptance criteria...",value:te,onChange:n=>fe(n.target.value)})]})]}),p("main",{className:"ps-editor-canvas",children:[p("section",{className:"ps-pane",children:[p("div",{className:"ps-pane-header",children:[p("div",{className:"ps-pane-title",children:[r("span",{children:"\u{1F4DD}"}),r("span",{children:"Raw Input Draft"})]}),p("div",{style:{display:"flex",gap:6},children:[r("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Qe,title:"Paste from clipboard into input draft","aria-label":"Paste into input draft",children:"\u{1F4CB} Paste"}),r("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:et,disabled:!i,title:"Copy raw input","aria-label":"Copy raw input",children:w?"\u2705 Copied":"\u{1F4CB} Copy"}),r("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>f(""),disabled:!i,title:"Clear input",children:"Clear"})]})]}),r("textarea",{className:"ps-textarea",placeholder:"Type your raw thoughts or click Dictate in the left sidebar to speak...",value:i,onChange:n=>f(n.target.value),"aria-label":"Raw Input Text"})]}),p("div",{className:"ps-action-bar",children:[p("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12},children:[r("span",{className:"ps-pill",children:"\u2B07 Refine pipeline"}),r("span",{style:{color:"var(--ps-text-muted)"},children:i.trim()?`${i.trim().split(/\s+/).length} words ready`:"Add text to get started"})]}),r("div",{style:{display:"flex",alignItems:"center",gap:6},children:p("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:()=>We(),disabled:V||!i.trim()||O==="custom"&&!te.trim(),title:"Transform raw draft into polished output",children:[r("span",{children:V?"\u23F3":"\u26A1"}),r("span",{children:V?"Refining...":"Refine text"})]})})]}),p("section",{className:"ps-pane",children:[p("div",{className:"ps-pane-header",children:[p("div",{className:"ps-pane-title",children:[r("span",{children:"\u2728"}),r("span",{children:"Result"})]}),p("div",{style:{display:"flex",gap:6},children:[l&&p("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>se(n=>!n),title:"Toggle inline diff against input draft",children:[r("span",{children:J?"\u{1F441}\uFE0F":"\u{1F50D}"}),r("span",{children:J?"View Clean":"View Diff"})]}),r("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:ot,disabled:!l,title:"Move output to input draft for iterative re-refinement",children:"\u2B06 Replace Input"}),r("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:tt,disabled:!l,title:"Copy refined text to clipboard","aria-label":"Copy refined output",children:y?"\u2705 Copied":"\u{1F4CB} Copy"})]})]}),J&&l?r("div",{className:"ps-output-view",children:Xe.map((n,s)=>n.type==="added"?r("span",{className:"ps-diff-added",children:n.text},s):n.type==="removed"?r("span",{className:"ps-diff-removed",children:n.text},s):r("span",{className:"ps-diff-unchanged",children:n.text},s))}):r("textarea",{className:"ps-textarea",placeholder:"Polished, structured output will appear here after clicking Refine...",value:l,onChange:n=>b(n.target.value),"aria-label":"Refined output"})]})]})]}),p("footer",{className:"ps-status-bar",children:[p("div",{style:{display:"flex",gap:12},children:[p("span",{children:["Input: ",Ye]}),p("span",{children:["Output: ",Ke]}),ge&&r("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:500},children:ge})]}),p("div",{style:{display:"flex",gap:12,alignItems:"center"},children:[p("span",{children:["Engine: ",k?.displayName," \xB7 ",q?.label]}),k?.isComposerMatch&&r("span",{className:"ps-pill",style:{color:"var(--accent, #3b82f6)"},children:"\u2605 Composer Synced"}),r("span",{children:"Zana Prompt Studio"})]})]})]})}var Ue="prompt-studio",Gn=we(e=>{ue(),e.composer.customize({id:"prompt-voice-mic",actions:[{id:"prompt-voice-mic",component:De}]}),e.slots.navPanel?.({id:"prompt-studio",title:"Prompt Studio",icon:"Sparkles",path:Ue,component:Fe}),e.slots.commandPaletteAction?.({id:"open-prompt-studio",title:"Prompt Studio: Open Canvas",run:t=>{t.navigate?.(`/${Ue}`)}})});export{Ue as PROMPT_STUDIO_PANEL_PATH,Gn as default};
//# sourceMappingURL=app.js.map
