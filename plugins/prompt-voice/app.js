function se(){return globalThis.__ZCC_PLUGIN_RUNTIME__??{}}function pe(e){throw new Error(`${e} is not available until the host plugin runtime is installed`)}function Re(e){return{__zccPluginApp:!0,setup:e}}function ne(){return se().useRpc?.()??pe("useRpc")}function oe(){return se().useComposer?.()??pe("useComposer")}function Ee(){return se().useComposerView?.()??pe("useComposerView")}var st=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4"];var D=class extends Error{code;constructor(t,r){super(r),this.name="RecordingError",this.code=t}};function pt(e){return st.find(t=>e(t))??null}var ct="audio/webm";function lt(){return{getUserMedia:e=>navigator.mediaDevices.getUserMedia(e),createRecorder:(e,t)=>new MediaRecorder(e,t?{mimeType:t}:void 0),isTypeSupported:e=>typeof MediaRecorder<"u"&&MediaRecorder.isTypeSupported(e)}}async function dt(e){try{return await e.getUserMedia({audio:!0})}catch(t){let r=t instanceof Error?t.name:"";throw r==="NotAllowedError"||r==="SecurityError"?new D("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again."):new D("MIC_UNAVAILABLE","No microphone is available. Connect one and try again.")}}function ut(e){return new Promise((t,r)=>{let s=new FileReader;s.onload=()=>{let c=typeof s.result=="string"?s.result:"";t(c.slice(c.indexOf(",")+1))},s.onerror=()=>r(new D("RECORDING_FAILED","The recording could not be read.")),s.readAsDataURL(e)})}async function mt(e,t){let r=new Blob(e,{type:t});return{base64:await ut(r),mimeType:r.type||t}}function ft(e,t){if(!(e>0&&Number.isFinite(e)))return()=>{};let r=setTimeout(t,e);return()=>clearTimeout(r)}var bt="That recording is too large to transcribe. Keep dictation shorter and try again.";function gt(e,t){let r=Math.max(t,e),s=[],c=0,d=!1;return{chunks:s,get overflowed(){return d},add(u){return u.size===0||d?"ignored":c+u.size>r?(d=!0,"overflow"):(s.push(u),c+=u.size,c>=e?"limit-reached":"accepted")}}}function ht(e,t){let r=new Promise((s,c)=>{e.onstop=()=>s(),e.onerror=()=>{let d=new D("RECORDING_FAILED","Recording stopped unexpectedly. Try again.");t(d),c(d)}});return r.catch(()=>{}),r}function vt(e,t,r,s){let c=ht(e,s);return e.ondataavailable=d=>{let u=t.add(d.data);(u==="limit-reached"||u==="overflow")&&r()},e.start(1e3),c}async function xt(e,t,r,s){try{await e}finally{t()}if(r.overflowed)throw new D("RECORDING_FAILED",bt);return mt(r.chunks,s)}function yt(e){let t=()=>{};return{stopRecorder(){t(),e.state!=="inactive"&&e.stop()},armTimer(r,s){t=ft(r,s)}}}function wt(e,t){let r=null;return{attach(s){r=s},detach(){r=null},autoStop(){e();let s=r?.onAutoStop;r&&(r.onAutoStop=void 0),s?.()},fail(s){e(),t();let c=r?.onError;r=null,c?.(s)}}}function St(e,t,r,s){let c=gt(s.maxBytes??9437184,s.hardMaxBytes??10485760),{stopRecorder:d,armTimer:u}=yt(e),i=wt(d,t);u(s.maxDurationMs??12e4,i.autoStop);let b=vt(e,c,i.autoStop,i.fail),l={onError:s.onError,onAutoStop:s.onAutoStop,async stop(){d();try{return await xt(b,t,c,e.mimeType||r)}finally{i.detach()}},cancel(){d(),t(),i.detach()}};return i.attach(l),l}var q=()=>Rt();async function Rt(e=lt(),t={}){let r=await dt(e),s=Et(r),c=r.getTracks(),d,u=()=>{for(let i of c)d&&i.removeEventListener?.("ended",d);s?.close(),c.forEach(i=>i.stop())};try{let i=pt(e.isTypeSupported)??ct,b=e.createRecorder(r,i),l=St(b,u,i,t);return l.getAudioLevel=()=>s?.level()??null,d=()=>{let g=l.onError;l.cancel(),g?.(new D("MIC_UNAVAILABLE","Microphone disconnected. Check your device and try again."))},c.forEach(g=>g.addEventListener?.("ended",d)),l}catch(i){throw u(),i instanceof D?i:new D("RECORDING_FAILED",i instanceof Error?i.message:"The recording could not be started.")}}function Et(e){let t;try{t=new AudioContext;let r=t.createMediaStreamSource(e),s=t.createAnalyser();s.fftSize=256,r.connect(s);let c=new Uint8Array(s.fftSize),d=t,u=!1;return{level(){if(d.state&&d.state!=="running")return null;s.getByteTimeDomainData(c);let i=c.reduce((b,l)=>b+((l-128)/128)**2,0)/c.length;return Math.min(1,Math.sqrt(i)*5)},close(){u||(u=!0,r.disconnect(),d.close().catch(i=>console.error("Prompt Voice audio meter cleanup failed",i)))}}}catch(r){return t&&t.close().catch(s=>console.error("Prompt Voice audio meter cleanup failed",s)),console.warn("Prompt Voice audio meter unavailable",r),null}}var f=globalThis.__ZCC_HOST_REACT__;var Ht=f.Children,Gt=f.Component,qt=f.Fragment,Zt=f.StrictMode,Kt=f.Suspense,Yt=f.cloneElement,Xt=f.createContext,Wt=f.createElement,Jt=f.createRef,Qt=f.forwardRef,en=f.isValidElement,tn=f.lazy,nn=f.memo,on=f.startTransition,T=f.useCallback,rn=f.useContext,an=f.useDebugValue,sn=f.useDeferredValue,N=f.useEffect,pn=f.useId,cn=f.useImperativeHandle,ln=f.useInsertionEffect,dn=f.useLayoutEffect,F=f.useMemo,Ce=f.useReducer,P=f.useRef,v=f.useState,un=f.useSyncExternalStore,mn=f.useTransition,fn=f.version;var re="promptVoice.transcribe",ke="promptVoice.status",Te="promptVoice.rephrase",Ae="promptVoice.availableModels";function Z(e,t){let r=t.trim();return r?e?/\s$/.test(e)?`${e}${r}`:`${e} ${r}`:r:e}var Ct="No speech detected.",ce={phase:"idle",notice:null,error:null};function Ie(e,t){switch(t.type){case"START":return e.phase==="idle"||e.phase==="error"?{phase:"starting",notice:null,error:null}:e;case"STARTED":return e.phase==="starting"?{...e,phase:"recording"}:e;case"STOP":return e.phase==="recording"||e.phase==="starting"?{phase:"processing",notice:null,error:null}:e;case"CANCEL":return e.phase==="recording"||e.phase==="starting"?{...ce}:e;case"SUCCESS":case"NO_SPEECH":return e.phase!=="processing"?e:{phase:"idle",notice:t.type==="NO_SPEECH"?Ct:t.notice,error:null};case"CLEAR_NOTICE":return e.notice?{...e,notice:null}:e;case"FAILURE":return{phase:"error",notice:null,error:t.message}}}var kt="Prompt Voice returned an unexpected response. Try again.",Tt="Dictation failed. Try again.",At=4e3;function It(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}async function Nt(e,t){let r=await e.call(re,{audio:t.base64,mimeType:t.mimeType});if(!It(r))throw new Error(kt);return r}function Ne(e){return e instanceof Error&&e.message?e.message:Tt}function Pt(e,t,r){if(!e.ok){r({type:"FAILURE",message:e.message});return}if(e.status==="no-speech"){r({type:"NO_SPEECH"});return}t.updateText(c=>Z(c,e.text)),t.focus();let s=e.refineNotice?`Inserted the raw transcript. ${e.refineNotice.message}`:"Added to draft.";r({type:"SUCCESS",notice:s})}function _t(e,t,r,s){return t()?(e.onError=c=>{t()&&s(c)},e.onAutoStop=()=>{t()&&r()},e):(e.cancel(),null)}function Dt(e,t,r,s,c){let d=u=>c({type:"FAILURE",message:Ne(u)});return e.then(u=>{let i=_t(u,r,s,b=>{t.current=null,d(b)});return i&&(t.current=i),i},u=>(r()&&d(u),null))}function Mt(e,t){let r=P(null),s=P(null),c=P(0),d=P(!0),u=T(()=>{c.current++,s.current=null,r.current&&(r.current.cancel(),r.current=null),t({type:"CANCEL"})},[t]);N(()=>(d.current=!0,()=>{d.current=!1,u()}),[u]);let i=T(async()=>{let y=s.current?await s.current:r.current;return r.current=null,y},[]),b=T(async y=>{let x=++c.current,w=()=>d.current&&c.current===x,S=Dt(e(),r,w,y,t);s.current=S,await S&&w()&&t({type:"STARTED"}),s.current===S&&(s.current=null)},[t,e]),l=T(()=>d.current,[]),g=T(()=>r.current?.getAudioLevel?.()??null,[]);return{start:b,takeSession:i,cancel:u,isMounted:l,getAudioLevel:g}}function Pe({startSession:e=q,noticeDurationMs:t=At}={}){let r=oe(),s=ne(),[c,d]=Ce(Ie,ce),{start:u,takeSession:i,cancel:b,isMounted:l,getAudioLevel:g}=Mt(e,d),[y,x]=v(null),[w,S]=v(0),[E,R]=v(!1);N(()=>{if(c.phase!=="recording"){x(null),S(0);return}let C=Date.now(),I=()=>{x(g()),S(Math.floor((Date.now()-C)/1e3))};I();let M=setInterval(I,100);return()=>clearInterval(M)},[g,c.phase]),N(()=>{if(!c.notice)return;let C=setTimeout(()=>{d({type:"CLEAR_NOTICE"})},t);return()=>clearTimeout(C)},[t,c.notice]);let B=T(()=>{d({type:"CLEAR_NOTICE"})},[]),A=T(async()=>{d({type:"STOP"});let C=await i();if(!(!l()||!C))try{let I=await C.stop();if(!l())return;let M=await Nt(s,I);if(!l())return;Pt(M,r,d)}catch(I){if(!l())return;d({type:"FAILURE",message:Ne(I)})}},[r,l,s,i]),$=T(async()=>{R(!1),d({type:"START"}),await u(()=>{R(!0),A()})},[A,u]),ie=T(()=>{c.phase==="recording"||c.phase==="starting"?A():c.phase!=="processing"&&$()},[$,A,c.phase]);return{phase:c.phase,error:c.error,notice:c.notice,level:y,seconds:w,autoStopped:E,onClick:ie,cancel:b,clearNotice:B,beginDictation:$,finishDictation:A}}var le=`/* Base Container */\r
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
`;var _e=globalThis.__ZCC_HOST_REACT__,K=_e.Fragment;function o(e,t,r){return _e.createElement(e,r===void 0?t:{...t,key:r})}var p=o;var Ot="Dictation",De="zcc-ext-prompt-voice-styles";function de(){if(typeof document>"u")return;let e=document.getElementById(De);e||(e=document.createElement("style"),e.id=De,document.head.appendChild(e)),e.textContent!==le&&(e.textContent=le)}var zt={idle:"Start dictation",starting:"Stop dictation",recording:"Stop dictation",processing:"Transcribing",error:"Start dictation"},Me={position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",border:0};function Le({startSession:e=q}){de();let{phase:t,error:r,notice:s,onClick:c,cancel:d,clearNotice:u,level:i,seconds:b,autoStopped:l}=Pe({startSession:e}),g=t==="starting"||t==="recording"||t==="processing",y=t==="idle"&&!!s,x=`${Math.floor(b/60)}:${String(b%60).padStart(2,"0")}`;return p("div",{className:`pv-mic pv-dictation-pill pv-phase-${t} ${y?"pv-has-notice":""}`,onClick:y?u:void 0,title:y?"Click to dismiss":void 0,children:[o("button",{type:"button",className:`pv-mic-button pv-mic-${t} ${g?"pv-pill-btn-stop":"pv-idle-icon"}`,"aria-label":Ot,"aria-pressed":t==="recording"||t==="starting",title:zt[t],disabled:t==="processing",onClick:c,style:y?{display:"none"}:void 0,children:t==="idle"||t==="error"?o("svg",{viewBox:"0 0 24 24",width:"16",height:"16","aria-hidden":"true",focusable:"false",children:o("path",{d:"M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5Zm6 9h2v-3h-2v3Z",fill:"currentColor"})}):t==="processing"?o("span",{className:"pv-mic-spinner","aria-hidden":"true"}):o("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:o("rect",{x:"6",y:"6",width:"12",height:"12",rx:"2.5",fill:"currentColor"})})}),y?p("span",{role:"status",className:"pv-notice-content",children:[o("span",{className:"pv-notice-check",children:"\u2713"}),o("span",{className:"pv-pill-status",children:s})]}):null,t==="starting"?p(K,{children:[p("div",{className:"pv-pill-timer-badge",children:[o("div",{className:"pv-pill-dot pv-pill-dot-starting"}),o("span",{className:"pv-pill-timer-text",children:"0:00"})]}),p("div",{className:"pv-pill-center",role:"status",children:[o("span",{className:"pv-mic-spinner","aria-hidden":"true"}),o("span",{className:"pv-pill-status",children:"Requesting microphone\u2026"})]})]}):null,t==="recording"?p(K,{children:[p("div",{className:"pv-pill-timer-badge",children:[o("div",{className:"pv-pill-dot"}),p("span",{className:"pv-pill-timer-text",children:[o("span",{className:"pv-sr-only",style:Me,children:"Recording "}),x]})]}),p("div",{className:"pv-pill-center",role:"status",children:[i===null?o("span",{className:"pv-sr-only",style:Me,children:"Audio meter unavailable"}):null,o("span",{className:`pv-pill-waveform ${i===null?"animated":""}`,"aria-label":"Microphone audio activity",role:"meter","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":Math.round((i??.3)*100),children:[.4,.7,1,.7,.4].map((w,S)=>o("span",{className:"pv-pill-waveform-bar",style:i!==null?{height:`${Math.max(3,i*w*20)}px`}:void 0},S))}),o("span",{className:"pv-pill-status",children:"Listening..."}),i!==null&&i<.015&&b>=5?o("span",{className:"pv-mic-quiet-warning",children:"No audio detected \u2014 check your microphone."}):null]})]}):null,t==="processing"?p(K,{children:[o("div",{className:"pv-pill-timer-badge",children:o("span",{className:"pv-pill-timer-text",children:x})}),o("div",{className:"pv-pill-center",role:"status",children:p("span",{className:"pv-pill-status",children:[o("span",{className:"pv-mic-spinner","aria-hidden":"true"})," ",l?"Recording limit reached. ":"","Transcribing and refining\u2026"]})})]}):null,t==="starting"||t==="recording"?o("button",{type:"button",className:"pv-mic-cancel pv-pill-btn-cancel",onClick:d,"aria-label":"Cancel recording",title:"Cancel recording",children:o("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:o("path",{d:"M18 6L6 18M6 6l12 12",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round"})})}):null,t==="error"&&r?o("span",{role:"alert",className:"pv-pill-status pv-mic-error",children:r}):null]})}function Oe(e){return e?e.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]+/gu)||[]:[]}var ze=1200;function $e(e,t){if(!e&&!t)return[];if(e===t)return[{type:"unchanged",text:e}];if(!e)return[{type:"added",text:t}];if(!t)return[{type:"removed",text:e}];let r=Oe(e),s=Oe(t),c=r.length,d=s.length;if(c>ze||d>ze)return[{type:"removed",text:e},{type:"added",text:t}];let u=d+1,i=new Uint32Array((c+1)*u);for(let x=1;x<=c;x++){let w=x*u,S=(x-1)*u,E=r[x-1];for(let R=1;R<=d;R++)if(E===s[R-1])i[w+R]=i[S+(R-1)]+1;else{let B=i[w+(R-1)],A=i[S+R];i[w+R]=B>A?B:A}}let b=[],l=c,g=d;for(;l>0||g>0;){let x=l*u,w=(l-1)*u;l>0&&g>0&&r[l-1]===s[g-1]?(b.push({type:"unchanged",text:r[l-1]}),l--,g--):g>0&&(l===0||i[x+(g-1)]>=i[w+g])?(b.push({type:"added",text:s[g-1]}),g--):l>0&&(g===0||i[x+(g-1)]<i[w+g])&&(b.push({type:"removed",text:r[l-1]}),l--)}b.reverse();let y=[];for(let x of b)y.length>0&&y[y.length-1].type===x.type?y[y.length-1].text+=x.text:y.push({...x});return y}var $t=`
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
`;async function Fe(e){if(!e)return!1;if(typeof navigator<"u"&&navigator.clipboard&&typeof navigator.clipboard.writeText=="function")try{return await navigator.clipboard.writeText(e),!0}catch{}if(typeof document<"u")try{let t=document.createElement("textarea");t.value=e,t.setAttribute("readonly",""),t.style.position="fixed",t.style.top="-9999px",t.style.left="-9999px",t.style.opacity="0",document.body.appendChild(t),t.focus(),t.select();let r=document.execCommand("copy");if(document.body.removeChild(t),r)return!0}catch{}return!1}var Be="zcc:prompt-voice:studio-draft:v1",Ue=[{id:"polish",title:"Polish Clarity",icon:"\u2728",desc:"Fix punctuation, grammar, and stuttering.",prompt:"Clean up disfluencies, typos, and improve sentence flow without altering intent.",tone:"technical"},{id:"executive",title:"Executive Brief",icon:"\u26A1",desc:"Condense into punchy bullet points.",prompt:"Summarize the core request into crisp, high-level executive bullet points.",tone:"formal"},{id:"spec",title:"Tech Spec RFC",icon:"\u{1F4D0}",desc:"Format with Goals, Context, Steps.",prompt:"Transform into a structured technical spec with ## Goal, ## Architecture, and ## Implementation Steps.",tone:"technical"},{id:"chat",title:"Friendly Chat",icon:"\u{1F4AC}",desc:"Natural, conversational tone.",prompt:"Rephrase in a warm, polite, and helpful conversational tone.",tone:"conversational"}],Ft=[{id:"assistant",displayName:"Zana Assistant",models:[{id:"assistant",key:"assistant",label:"Local / Active Thread Agent",providerId:"assistant"}]},{id:"openai",displayName:"OpenAI",models:[{id:"gpt-5.4-nano",key:"openai-fast",label:"GPT-5.4 Nano (Fast)",providerId:"openai"},{id:"gpt-5.6-luna",key:"openai-smart",label:"GPT-5.6 Luna (Smart)",providerId:"openai"}]},{id:"anthropic",displayName:"Anthropic",models:[{id:"claude-haiku-4-5-20251001",key:"anthropic-haiku",label:"Claude 4.5 Haiku",providerId:"anthropic"},{id:"claude-sonnet-5-20260201",key:"anthropic-sonnet",label:"Claude 5 Sonnet",providerId:"anthropic"}]},{id:"google",displayName:"Google Gemini",models:[{id:"gemini-2.5-flash",key:"google-flash",label:"Gemini 2.5 Flash",providerId:"google"}]}];function Bt(){try{return Ee()}catch{return null}}function je({startSession:e=q}){let t=ne(),r=oe(),s=Bt(),c=s?.providerId,d=s?.familyId,u=P(!1),[i,b]=v(""),[l,g]=v(""),[y,x]=v(!1),[w,S]=v(!1),[E,R]=v(!1),[B,A]=v(null),[$,ie]=v(null),[C,I]=v("assistant"),[M,Y]=v("assistant"),[Ut,He]=v(null),[ue,Ge]=v(null),[X,ae]=v(!1),[me,fe]=v(null),[be,ge]=v(""),[L,he]=v(!1),[ve,h]=v(null),[V,xe]=v(!1),[qe,ye]=v(0),[Ze,we]=v(null),U=P(null),W=P(null),J=P(null),Se=P(null);N(()=>{try{let n=localStorage.getItem(Be);if(n){let a=JSON.parse(n);a.inputText&&b(a.inputText),a.outputText&&g(a.outputText),a.selectedProviderId&&I(a.selectedProviderId),a.selectedModelId&&(u.current=!0,Y(a.selectedModelId))}}catch{}},[]),N(()=>{let n=!0;return t.call(ke).then(a=>{if(!n)return;let m=a;m&&m.llmProvider&&He(m.llmProvider)}).catch(()=>{}),()=>{n=!1}},[t]),N(()=>{let n=!0;return t.call(Ae).then(a=>{if(!n)return;let m=a;Array.isArray(m)&&m.length>0&&ie(m)}).catch(()=>{}),()=>{n=!1}},[t]);let O=F(()=>{if(!$||$.length===0)return Ft.map(a=>{let m=!!(c&&a.id.toLowerCase()===c.toLowerCase()||d&&a.id.toLowerCase().includes(d.toLowerCase()));return{...a,isComposerMatch:m,models:a.models.map(_=>({..._,isComposerMatch:m}))}});let n={"assistant:assistant":"assistant","openai:gpt-5.4-nano":"openai-fast","openai:gpt-5.6-luna":"openai-smart","anthropic:claude-haiku-4-5-20251001":"anthropic-haiku","anthropic:claude-sonnet-5-20260201":"anthropic-sonnet","google:gemini-2.5-flash":"google-flash"};return $.map(a=>{let m=!!(c&&a.providerId.toLowerCase()===c.toLowerCase()||d&&a.providerId.toLowerCase().includes(d.toLowerCase())),_=a.models.map(j=>{let ee=`${a.providerId}:${j.id}`,te=n[ee]??j.id;return{id:j.id,key:te,label:j.label||j.id,providerId:a.providerId,isComposerMatch:m}});return{id:a.providerId,displayName:a.displayName||a.providerId,isComposerMatch:m,models:_}})},[$,c,d]),k=F(()=>O.find(n=>n.id===C)??O[0],[O,C]),H=F(()=>k?.models??[],[k]),G=F(()=>H.find(a=>a.id===M||a.key===M)??H[0],[H,M]);N(()=>{if(!u.current&&O.length>0){let n=O.find(a=>a.isComposerMatch);n&&(I(n.id),n.models.length>0&&Y(n.models[0].key||n.models[0].id))}},[O]),N(()=>{try{localStorage.setItem(Be,JSON.stringify({inputText:i,outputText:l,selectedProviderId:C,selectedModelId:M}))}catch{}},[i,l,C,M]);let Ke=n=>{u.current=!0,I(n);let a=O.find(m=>m.id===n);a&&a.models.length>0&&Y(a.models[0].key||a.models[0].id)},Ye=n=>{u.current=!0;for(let a of O){let m=a.models.find(_=>_.id===n||_.key===n);if(m){a.id!==C&&I(a.id),Y(m.key||m.id);return}}Y(n)};N(()=>()=>{W.current&&clearInterval(W.current),J.current&&clearInterval(J.current),U.current&&U.current.cancel()},[]);let Xe=F(()=>{let n=i.trim();return`${n?n.split(/\s+/).length:0} words \xB7 ${i.length} chars`},[i]),We=F(()=>{let n=l.trim();return`${n?n.split(/\s+/).length:0} words \xB7 ${l.length} chars`},[l]),Je=F(()=>!l||!X?[]:$e(i,l),[i,l,X]),Qe=async()=>{if(V){xe(!1),we(null),W.current&&clearInterval(W.current),J.current&&clearInterval(J.current);let n=U.current;if(U.current=null,!n)return;R(!0);try{let a=await n.stop(),m=await t.call(re,{audio:a.base64,mimeType:a.mimeType});m.ok&&m.status==="ok"?b(_=>Z(_,m.text)):m.ok&&m.status==="no-speech"?(h("No speech detected. Try speaking closer to the microphone."),setTimeout(()=>h(null),4e3)):m.ok||h(m.message)}catch(a){h(a instanceof Error?a.message:"Transcription failed.")}finally{R(!1)}}else{h(null);try{let n=await e();U.current=n,xe(!0),ye(0),W.current=setInterval(()=>{ye(a=>a+1)},1e3),J.current=setInterval(()=>{if(U.current){let a=U.current.getAudioLevel?.()??null;we(a)}},100)}catch(n){h(n instanceof Error?n.message:"Microphone access denied.")}}},Q=async n=>{let a=i.trim();if(!a||L)return;let m=Ue.find(z=>z.id===(n||me)),_=be.trim()||m?.prompt||"Polish and format for clarity.",j=m?.tone||"technical",ee=k?.id??"assistant",te=G?.id??"assistant";h(null),he(!0);try{let z=await t.call(Te,{text:a,tone:j,customPrompt:_,llmProvider:ee,llmModel:te});z.ok?(g(z.text),Ge(`${k?.displayName||ee}: ${z.llmModel||te}`)):h(z.message)}catch(z){h(z instanceof Error?z.message:"Refinement request failed.")}finally{he(!1)}},et=async()=>{try{let n=await navigator.clipboard.readText();if(!n||!n.trim()){h("Clipboard is empty."),setTimeout(()=>h(null),2500);return}b(a=>Z(a,n)),h("Pasted from clipboard into input draft!"),setTimeout(()=>h(null),2500)}catch{h("Clipboard access denied or unavailable."),setTimeout(()=>h(null),2500)}},tt=async()=>{if(!i)return;await Fe(i)?(S(!0),setTimeout(()=>S(!1),2e3),h("Input draft copied to clipboard!"),setTimeout(()=>h(null),2500)):(h("Failed to copy to clipboard."),setTimeout(()=>h(null),3e3))},nt=async()=>{if(!l)return;await Fe(l)?(x(!0),setTimeout(()=>x(!1),2e3),h("Refined output copied to clipboard!"),setTimeout(()=>h(null),2500)):(h("Failed to copy to clipboard."),setTimeout(()=>h(null),3e3))},ot=()=>{!i&&!l||(b(""),g(""),fe(null),ge(""),ae(!1),h("Studio canvas cleared."),setTimeout(()=>h(null),2500))},rt=()=>{l&&(b(l),g(""),ae(!1),h("Refined output moved to input draft."),setTimeout(()=>h(null),2500))},it=()=>{let n=l||i;if(n)try{r.updateText(a=>Z(a,n)),r.focus(),A("Inserted into Composer!"),setTimeout(()=>A(null),2500)}catch{h("Composer focus unavailable.")}},at=T(n=>{(n.ctrlKey||n.metaKey)&&n.key.toLowerCase()==="k"&&(n.preventDefault(),Se.current?.focus())},[]);return p("div",{className:"ps-container",onKeyDown:at,children:[o("style",{children:$t}),p("header",{className:"ps-header",children:[p("div",{className:"ps-header-left",children:[o("span",{style:{fontSize:18},children:"\u{1F399}\uFE0F"}),o("span",{className:"ps-header-title",children:"Prompt Studio"}),o("span",{className:"ps-badge",children:"Voice & AI Refinement"}),B&&o("span",{className:"ps-badge",style:{background:"rgba(34, 197, 94, 0.2)",color:"#86efac"},children:B})]}),p("div",{className:"ps-header-actions",children:[p("button",{type:"button",className:"ps-btn",onClick:ot,title:"Clear current input and output",disabled:!i&&!l,children:[o("span",{children:"\u{1F5D1}\uFE0F"}),o("span",{children:"Clear"})]}),p("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:it,disabled:!i&&!l,title:"Append current text directly into Zana Composer",children:[o("span",{children:"\u{1F4AC}"}),o("span",{children:"Insert into Composer"})]})]})]}),p("div",{className:"ps-workspace",children:[p("aside",{className:"ps-sidebar",children:[p("section",{className:"ps-section",children:[p("div",{className:"ps-section-title",children:[o("span",{children:"Refinement Engine"}),o("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:k?.isComposerMatch?"\u2605 Composer Active":"AI Model"})]}),p("div",{className:"ps-field-group",children:[o("label",{htmlFor:"ps-provider-select",className:"ps-field-label",children:"Provider"}),o("select",{id:"ps-provider-select",className:"ps-select","aria-label":"Refinement provider",value:k?.id??"",onChange:n=>Ke(n.target.value),disabled:L,children:O.map(n=>p("option",{value:n.id,children:[n.displayName,n.isComposerMatch?" \u2605 (Composer)":""]},n.id))})]}),p("div",{className:"ps-field-group",children:[p("label",{htmlFor:"ps-model-select",className:"ps-field-label",children:["Model (",H.length,")"]}),o("select",{id:"ps-model-select",className:"ps-select","aria-label":"Refinement model",value:G?.key||G?.id||"",onChange:n=>Ye(n.target.value),disabled:L||H.length===0,children:H.map(n=>p("option",{value:n.key||n.id,children:[n.label,n.isComposerMatch?" \u2605 (Composer)":""]},n.key||n.id))})]}),p("div",{style:{marginTop:4,fontSize:11,color:"var(--ps-text-muted)",lineHeight:1.35},children:[k?.isComposerMatch?p("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:600},children:["\u2605 Synced to Composer: ",k.displayName," (",G?.label,")"]}):k?.id==="assistant"?"Uses the active Zana assistant agent with no extra API key required.":p(K,{children:["Using ",o("strong",{children:k?.displayName})," \xB7 ",o("code",{children:G?.id})]}),ue?p("div",{style:{marginTop:3,color:"var(--ps-text-subtle)",fontSize:10},children:["Last refined: ",ue]}):null]})]}),p("section",{className:"ps-section",children:[p("div",{className:"ps-section-title",children:[o("span",{children:"Voice Dictation"}),o("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:"Host STT"})]}),p("div",{className:"ps-dictation-card",children:[p("button",{type:"button",className:`ps-btn ${V?"ps-btn-danger":E?"":"ps-btn-primary"}`,style:{width:"100%",justifyContent:"center",padding:"10px 0",opacity:E?.8:1},onClick:Qe,disabled:E,"aria-label":E?"Transcribing audio":V?"Stop dictation":"Start dictation",children:[o("span",{className:E?"ps-spin":void 0,children:E?"\u23F3":V?"\u23F9\uFE0F":"\u{1F399}\uFE0F"}),o("span",{children:E?"Transcribing...":V?`Stop Dictation (${qe}s)`:"Dictate Thoughts"})]}),V&&p("div",{style:{width:"100%",display:"flex",flexDirection:"column",gap:4},children:[o("div",{className:"ps-meter-bar",children:o("div",{className:"ps-meter-fill",style:{width:`${Math.min(100,(Ze??.1)*100)}%`}})}),o("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:"Listening live..."})]})]})]}),p("section",{className:"ps-section",children:[p("div",{className:"ps-section-title",children:[o("span",{children:"Refinement Presets"}),o("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:"Quick AI"})]}),o("div",{className:"ps-presets-list",children:Ue.map(n=>{let a=me===n.id;return p("button",{type:"button",className:`ps-preset-btn ${a?"active":""}`,onClick:()=>{fe(a?null:n.id),a||Q(n.id)},title:n.prompt,children:[p("span",{className:"preset-title",children:[o("span",{children:n.icon}),o("span",{children:n.title})]}),o("span",{className:"preset-desc",children:n.desc})]},n.id)})})]}),p("section",{className:"ps-section",children:[p("div",{className:"ps-section-title",children:[o("span",{children:"Custom Instruction"}),o("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:"Ctrl+K"})]}),o("textarea",{ref:Se,className:"ps-custom-prompt-input",placeholder:"e.g. Turn into user stories with acceptance criteria...",value:be,onChange:n=>ge(n.target.value),onKeyDown:n=>{n.key==="Enter"&&(n.ctrlKey||n.metaKey)&&(n.preventDefault(),Q())}}),p("button",{type:"button",className:"ps-btn ps-btn-primary",style:{width:"100%",justifyContent:"center"},onClick:()=>Q(),disabled:L||!i.trim(),children:[o("span",{children:L?"\u23F3":"\u2728"}),o("span",{children:L?"Refining Spec...":"Refine Now"})]})]})]}),p("main",{className:"ps-editor-canvas",children:[p("section",{className:"ps-pane",children:[p("div",{className:"ps-pane-header",children:[p("div",{className:"ps-pane-title",children:[o("span",{children:"\u{1F4DD}"}),o("span",{children:"Raw Input Draft"})]}),p("div",{style:{display:"flex",gap:6},children:[o("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:et,title:"Paste from clipboard into input draft","aria-label":"Paste into input draft",children:"\u{1F4CB} Paste"}),o("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:tt,disabled:!i,title:"Copy raw input","aria-label":"Copy raw input",children:w?"\u2705 Copied":"\u{1F4CB} Copy"}),o("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>b(""),disabled:!i,title:"Clear input",children:"Clear"})]})]}),o("textarea",{className:"ps-textarea",placeholder:"Type your raw thoughts or click Dictate in the left sidebar to speak...",value:i,onChange:n=>b(n.target.value),"aria-label":"Raw Input Text"})]}),p("div",{className:"ps-action-bar",children:[p("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12},children:[o("span",{className:"ps-pill",children:"\u2B07 Refine pipeline"}),o("span",{style:{color:"var(--ps-text-muted)"},children:i.trim()?`${i.trim().split(/\s+/).length} words ready`:"Waiting for draft"})]}),o("div",{style:{display:"flex",alignItems:"center",gap:6},children:p("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:()=>Q(),disabled:L||!i.trim(),title:"Transform raw draft into polished output",children:[o("span",{children:L?"\u23F3":"\u26A1"}),o("span",{children:L?"Refining...":"Refine Draft"})]})})]}),p("section",{className:"ps-pane",children:[p("div",{className:"ps-pane-header",children:[p("div",{className:"ps-pane-title",children:[o("span",{children:"\u2728"}),o("span",{children:"Refined Spec Output"})]}),p("div",{style:{display:"flex",gap:6},children:[l&&p("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>ae(n=>!n),title:"Toggle inline diff against input draft",children:[o("span",{children:X?"\u{1F441}\uFE0F":"\u{1F50D}"}),o("span",{children:X?"View Clean":"View Diff"})]}),o("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:rt,disabled:!l,title:"Move output to input draft for iterative re-refinement",children:"\u2B06 Replace Input"}),o("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:nt,disabled:!l,title:"Copy refined text to clipboard","aria-label":"Copy refined output",children:y?"\u2705 Copied":"\u{1F4CB} Copy"})]})]}),X&&l?o("div",{className:"ps-output-view",children:Je.map((n,a)=>n.type==="added"?o("span",{className:"ps-diff-added",children:n.text},a):n.type==="removed"?o("span",{className:"ps-diff-removed",children:n.text},a):o("span",{className:"ps-diff-unchanged",children:n.text},a))}):o("textarea",{className:"ps-textarea",placeholder:"Polished, structured output will appear here after clicking Refine...",value:l,onChange:n=>g(n.target.value),"aria-label":"Refined Output Spec"})]})]})]}),p("footer",{className:"ps-status-bar",children:[p("div",{style:{display:"flex",gap:12},children:[p("span",{children:["Input: ",Xe]}),p("span",{children:["Output: ",We]}),ve&&o("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:500},children:ve})]}),p("div",{style:{display:"flex",gap:12,alignItems:"center"},children:[p("span",{children:["Engine: ",k?.displayName," \xB7 ",G?.label]}),k?.isComposerMatch&&o("span",{className:"ps-pill",style:{color:"var(--accent, #3b82f6)"},children:"\u2605 Composer Synced"}),o("span",{children:"Zana Prompt Studio"})]})]})]})}var Ve="prompt-studio",qn=Re(e=>{de(),e.composer.customize({id:"prompt-voice-mic",actions:[{id:"prompt-voice-mic",component:Le}]}),e.slots.navPanel?.({id:"prompt-studio",title:"Prompt Studio",icon:"Sparkles",path:Ve,component:je}),e.slots.commandPaletteAction?.({id:"open-prompt-studio",title:"Prompt Studio: Open Canvas",run:t=>{t.navigate?.(`/${Ve}`)}})});export{Ve as PROMPT_STUDIO_PANEL_PATH,qn as default};
//# sourceMappingURL=app.js.map
