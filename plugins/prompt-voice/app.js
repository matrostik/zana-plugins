function de(){return globalThis.__ZCC_PLUGIN_RUNTIME__??{}}function ue(e){throw new Error(`${e} is not available until the host plugin runtime is installed`)}function Ce(e){return{__zccPluginApp:!0,setup:e}}function se(){return de().useRpc?.()??ue("useRpc")}function pe(){return de().useComposer?.()??ue("useComposer")}function Ee(){return de().useComposerView?.()??ue("useComposerView")}var ut=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4"];var M=class extends Error{code;constructor(t,r){super(r),this.name="RecordingError",this.code=t}};function mt(e){return ut.find(t=>e(t))??null}var ft="audio/webm";function bt(){return{getUserMedia:e=>navigator.mediaDevices.getUserMedia(e),createRecorder:(e,t)=>new MediaRecorder(e,t?{mimeType:t}:void 0),isTypeSupported:e=>typeof MediaRecorder<"u"&&MediaRecorder.isTypeSupported(e)}}async function gt(e){try{return await e.getUserMedia({audio:!0})}catch(t){let r=t instanceof Error?t.name:"";throw r==="NotAllowedError"||r==="SecurityError"?new M("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again."):new M("MIC_UNAVAILABLE","No microphone is available. Connect one and try again.")}}function vt(e){return new Promise((t,r)=>{let i=new FileReader;i.onload=()=>{let l=typeof i.result=="string"?i.result:"";t(l.slice(l.indexOf(",")+1))},i.onerror=()=>r(new M("RECORDING_FAILED","The recording could not be read.")),i.readAsDataURL(e)})}async function ht(e,t){let r=new Blob(e,{type:t});return{base64:await vt(r),mimeType:r.type||t}}function xt(e,t){if(!(e>0&&Number.isFinite(e)))return()=>{};let r=setTimeout(t,e);return()=>clearTimeout(r)}var yt="That recording is too large to transcribe. Keep dictation shorter and try again.";function wt(e,t){let r=Math.max(t,e),i=[],l=0,d=!1;return{chunks:i,get overflowed(){return d},add(m){return m.size===0||d?"ignored":l+m.size>r?(d=!0,"overflow"):(i.push(m),l+=m.size,l>=e?"limit-reached":"accepted")}}}function St(e,t){let r=new Promise((i,l)=>{e.onstop=()=>i(),e.onerror=()=>{let d=new M("RECORDING_FAILED","Recording stopped unexpectedly. Try again.");t(d),l(d)}});return r.catch(()=>{}),r}function kt(e,t,r,i){let l=St(e,i);return e.ondataavailable=d=>{let m=t.add(d.data);(m==="limit-reached"||m==="overflow")&&r()},e.start(1e3),l}async function Rt(e,t,r,i){try{await e}finally{t()}if(r.overflowed)throw new M("RECORDING_FAILED",yt);return ht(r.chunks,i)}function Ct(e){let t=()=>{};return{stopRecorder(){t(),e.state!=="inactive"&&e.stop()},armTimer(r,i){t=xt(r,i)}}}function Et(e,t){let r=null;return{attach(i){r=i},detach(){r=null},autoStop(){e();let i=r?.onAutoStop;r&&(r.onAutoStop=void 0),i?.()},fail(i){e(),t();let l=r?.onError;r=null,l?.(i)}}}function At(e,t,r,i){let l=wt(i.maxBytes??9437184,i.hardMaxBytes??10485760),{stopRecorder:d,armTimer:m}=Ct(e),p=Et(d,t);m(i.maxDurationMs??12e4,p.autoStop);let h=kt(e,l,p.autoStop,p.fail),c={onError:i.onError,onAutoStop:i.onAutoStop,async stop(){d();try{return await Rt(h,t,l,e.mimeType||r)}finally{p.detach()}},cancel(){d(),t(),p.detach()}};return p.attach(c),c}var Y=()=>Tt();async function Tt(e=bt(),t={}){let r=await gt(e),i=Pt(r),l=r.getTracks(),d,m=()=>{for(let p of l)d&&p.removeEventListener?.("ended",d);i?.close(),l.forEach(p=>p.stop())};try{let p=mt(e.isTypeSupported)??ft,h=e.createRecorder(r,p),c=At(h,m,p,t);return c.getAudioLevel=()=>i?.level()??null,d=()=>{let b=c.onError;c.cancel(),b?.(new M("MIC_UNAVAILABLE","Microphone disconnected. Check your device and try again."))},l.forEach(b=>b.addEventListener?.("ended",d)),c}catch(p){throw m(),p instanceof M?p:new M("RECORDING_FAILED",p instanceof Error?p.message:"The recording could not be started.")}}function Pt(e){let t;try{t=new AudioContext;let r=t.createMediaStreamSource(e),i=t.createAnalyser();i.fftSize=256,r.connect(i);let l=new Uint8Array(i.fftSize),d=t,m=!1;return{level(){if(d.state&&d.state!=="running")return null;i.getByteTimeDomainData(l);let p=l.reduce((h,c)=>h+((c-128)/128)**2,0)/l.length;return Math.min(1,Math.sqrt(p)*5)},close(){m||(m=!0,r.disconnect(),d.close().catch(p=>console.error("Prompt Voice audio meter cleanup failed",p)))}}}catch(r){return t&&t.close().catch(i=>console.error("Prompt Voice audio meter cleanup failed",i)),console.warn("Prompt Voice audio meter unavailable",r),null}}var x=globalThis.__ZCC_HOST_REACT__;var Jt=x.Children,Wt=x.Component,Qt=x.Fragment,en=x.StrictMode,tn=x.Suspense,nn=x.cloneElement,on=x.createContext,rn=x.createElement,an=x.createRef,sn=x.forwardRef,pn=x.isValidElement,cn=x.lazy,ln=x.memo,dn=x.startTransition,T=x.useCallback,un=x.useContext,mn=x.useDebugValue,fn=x.useDeferredValue,R=x.useEffect,bn=x.useId,gn=x.useImperativeHandle,vn=x.useInsertionEffect,hn=x.useLayoutEffect,F=x.useMemo,Ae=x.useReducer,C=x.useRef,y=x.useState,xn=x.useSyncExternalStore,yn=x.useTransition,wn=x.version;var ce="promptVoice.transcribe",Te="promptVoice.status",Pe="promptVoice.rephrase",Ie="promptVoice.availableModels";function K(e,t){let r=t.trim();return r?e?/\s$/.test(e)?`${e}${r}`:`${e} ${r}`:r:e}var It="No speech detected.",me={phase:"idle",notice:null,error:null};function Ne(e,t){switch(t.type){case"START":return e.phase==="idle"||e.phase==="error"?{phase:"starting",notice:null,error:null}:e;case"STARTED":return e.phase==="starting"?{...e,phase:"recording"}:e;case"STOP":return e.phase==="recording"||e.phase==="starting"?{phase:"processing",notice:null,error:null}:e;case"CANCEL":return e.phase==="recording"||e.phase==="starting"?{...me}:e;case"SUCCESS":case"NO_SPEECH":return e.phase!=="processing"?e:{phase:"idle",notice:t.type==="NO_SPEECH"?It:t.notice,error:null};case"CLEAR_NOTICE":return e.notice?{...e,notice:null}:e;case"FAILURE":return{phase:"error",notice:null,error:t.message}}}var Nt="Prompt Voice returned an unexpected response. Try again.",_t="Dictation failed. Try again.",Dt=4e3;function Mt(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}async function Lt(e,t){let r=await e.call(ce,{audio:t.base64,mimeType:t.mimeType});if(!Mt(r))throw new Error(Nt);return r}function _e(e){return e instanceof Error&&e.message?e.message:_t}function Ot(e,t,r){if(!e.ok){r({type:"FAILURE",message:e.message});return}if(e.status==="no-speech"){r({type:"NO_SPEECH"});return}t.updateText(l=>K(l,e.text)),t.focus();let i=e.refineNotice?`Inserted the raw transcript. ${e.refineNotice.message}`:"Added to draft.";r({type:"SUCCESS",notice:i})}function zt(e,t,r,i){return t()?(e.onError=l=>{t()&&i(l)},e.onAutoStop=()=>{t()&&r()},e):(e.cancel(),null)}function $t(e,t,r,i,l){let d=m=>l({type:"FAILURE",message:_e(m)});return e.then(m=>{let p=zt(m,r,i,h=>{t.current=null,d(h)});return p&&(t.current=p),p},m=>(r()&&d(m),null))}function Ft(e,t){let r=C(null),i=C(null),l=C(0),d=C(!0),m=T(()=>{l.current++,i.current=null,r.current&&(r.current.cancel(),r.current=null),t({type:"CANCEL"})},[t]);R(()=>(d.current=!0,()=>{d.current=!1,m()}),[m]);let p=T(async()=>{let u=i.current?await i.current:r.current;return r.current=null,u},[]),h=T(async u=>{let g=++l.current,f=()=>d.current&&l.current===g,S=$t(e(),r,f,u,t);i.current=S,await S&&f()&&t({type:"STARTED"}),i.current===S&&(i.current=null)},[t,e]),c=T(()=>d.current,[]),b=T(()=>r.current?.getAudioLevel?.()??null,[]);return{start:h,takeSession:p,cancel:m,isMounted:c,getAudioLevel:b}}function De({startSession:e=Y,noticeDurationMs:t=Dt}={}){let r=pe(),i=se(),[l,d]=Ae(Ne,me),{start:m,takeSession:p,cancel:h,isMounted:c,getAudioLevel:b}=Ft(e,d),[u,g]=y(null),[f,S]=y(0),[j,k]=y(!1);R(()=>{if(l.phase!=="recording"){g(null),S(0);return}let I=Date.now(),z=()=>{g(b()),S(Math.floor((Date.now()-I)/1e3))};z();let L=setInterval(z,100);return()=>clearInterval(L)},[b,l.phase]),R(()=>{if(!l.notice)return;let I=setTimeout(()=>{d({type:"CLEAR_NOTICE"})},t);return()=>clearTimeout(I)},[t,l.notice]);let E=T(()=>{d({type:"CLEAR_NOTICE"})},[]),P=T(async()=>{d({type:"STOP"});let I=await p();if(!(!c()||!I))try{let z=await I.stop();if(!c())return;let L=await Lt(i,z);if(!c())return;Ot(L,r,d)}catch(z){if(!c())return;d({type:"FAILURE",message:_e(z)})}},[r,c,i,p]),V=T(async()=>{k(!1),d({type:"START"}),await m(()=>{k(!0),P()})},[P,m]),ne=T(()=>{l.phase==="recording"||l.phase==="starting"?P():l.phase!=="processing"&&V()},[V,P,l.phase]);return{phase:l.phase,error:l.error,notice:l.notice,level:u,seconds:f,autoStopped:j,onClick:ne,cancel:h,clearNotice:E,beginDictation:V,finishDictation:P}}var fe=`/* Base Container */\r
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
`;var Me=globalThis.__ZCC_HOST_REACT__,X=Me.Fragment;function n(e,t,r){return Me.createElement(e,r===void 0?t:{...t,key:r})}var s=n;var jt="Dictation",Le="zcc-ext-prompt-voice-styles";function be(){if(typeof document>"u")return;let e=document.getElementById(Le);e||(e=document.createElement("style"),e.id=Le,document.head.appendChild(e)),e.textContent!==fe&&(e.textContent=fe)}var Vt={idle:"Start dictation",starting:"Stop dictation",recording:"Stop dictation",processing:"Transcribing",error:"Start dictation"},Oe={position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",border:0};function ze({startSession:e=Y}){be();let{phase:t,error:r,notice:i,onClick:l,cancel:d,clearNotice:m,level:p,seconds:h,autoStopped:c}=De({startSession:e}),b=t==="starting"||t==="recording"||t==="processing",u=t==="idle"&&!!i,g=`${Math.floor(h/60)}:${String(h%60).padStart(2,"0")}`;return s("div",{className:`pv-mic pv-dictation-pill pv-phase-${t} ${u?"pv-has-notice":""}`,onClick:u?m:void 0,title:u?"Click to dismiss":void 0,children:[n("button",{type:"button",className:`pv-mic-button pv-mic-${t} ${b?"pv-pill-btn-stop":"pv-idle-icon"}`,"aria-label":jt,"aria-pressed":t==="recording"||t==="starting",title:Vt[t],disabled:t==="processing",onClick:l,style:u?{display:"none"}:void 0,children:t==="idle"||t==="error"?n("svg",{viewBox:"0 0 24 24",width:"16",height:"16","aria-hidden":"true",focusable:"false",children:n("path",{d:"M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5Zm6 9h2v-3h-2v3Z",fill:"currentColor"})}):t==="processing"?n("span",{className:"pv-mic-spinner","aria-hidden":"true"}):n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("rect",{x:"6",y:"6",width:"12",height:"12",rx:"2.5",fill:"currentColor"})})}),u?s("span",{role:"status",className:"pv-notice-content",children:[n("span",{className:"pv-notice-check",children:"\u2713"}),n("span",{className:"pv-pill-status",children:i})]}):null,t==="starting"?s(X,{children:[s("div",{className:"pv-pill-timer-badge",children:[n("div",{className:"pv-pill-dot pv-pill-dot-starting"}),n("span",{className:"pv-pill-timer-text",children:"0:00"})]}),s("div",{className:"pv-pill-center",role:"status",children:[n("span",{className:"pv-mic-spinner","aria-hidden":"true"}),n("span",{className:"pv-pill-status",children:"Requesting microphone\u2026"})]})]}):null,t==="recording"?s(X,{children:[s("div",{className:"pv-pill-timer-badge",children:[n("div",{className:"pv-pill-dot"}),s("span",{className:"pv-pill-timer-text",children:[n("span",{className:"pv-sr-only",style:Oe,children:"Recording "}),g]})]}),s("div",{className:"pv-pill-center",role:"status",children:[p===null?n("span",{className:"pv-sr-only",style:Oe,children:"Audio meter unavailable"}):null,n("span",{className:`pv-pill-waveform ${p===null?"animated":""}`,"aria-label":"Microphone audio activity",role:"meter","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":Math.round((p??.3)*100),children:[.4,.7,1,.7,.4].map((f,S)=>n("span",{className:"pv-pill-waveform-bar",style:p!==null?{height:`${Math.max(3,p*f*20)}px`}:void 0},S))}),n("span",{className:"pv-pill-status",children:"Listening..."}),p!==null&&p<.015&&h>=5?n("span",{className:"pv-mic-quiet-warning",children:"No audio detected \u2014 check your microphone."}):null]})]}):null,t==="processing"?s(X,{children:[n("div",{className:"pv-pill-timer-badge",children:n("span",{className:"pv-pill-timer-text",children:g})}),n("div",{className:"pv-pill-center",role:"status",children:s("span",{className:"pv-pill-status",children:[n("span",{className:"pv-mic-spinner","aria-hidden":"true"})," ",c?"Recording limit reached. ":"","Transcribing and refining\u2026"]})})]}):null,t==="starting"||t==="recording"?n("button",{type:"button",className:"pv-mic-cancel pv-pill-btn-cancel",onClick:d,"aria-label":"Cancel recording",title:"Cancel recording",children:n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("path",{d:"M18 6L6 18M6 6l12 12",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round"})})}):null,t==="error"&&r?n("span",{role:"alert",className:"pv-pill-status pv-mic-error",children:r}):null]})}var Ut={"Voice & transcription":[{key:"sttProvider",label:"Speech provider",options:["system","openai","google-gemini"],help:"System uses Zana voice transcription."},{key:"sttModel",label:"Speech model",help:"Leave empty for the provider default."},{key:"inputLanguage",label:"Input language",options:["auto","en","he","de","fr","es","ja"]},{key:"dictionary",label:"Personal dictionary",multiline:!0,help:"Names and terms, one per line."}],"Prompt Voice":[{key:"llmProvider",label:"Automatic cleanup",options:["none","assistant","openai","anthropic","google"]},{key:"llmModel",label:"Cleanup model",help:"Leave empty for the provider default."},{key:"tone",label:"Cleanup tone",options:["conversational","formal","casual","technical","custom"]},{key:"customPrompt",label:"Custom cleanup instructions",multiline:!0}],"Prompt Studio":[{key:"studioProvider",label:"Default refinement provider",options:["composer","assistant","openai","anthropic","google"]},{key:"studioModel",label:"Default refinement model",help:"Leave empty for the provider default."}],Connections:[]},$e={sttProvider:"system",inputLanguage:"auto",llmProvider:"assistant",tone:"conversational",studioProvider:"composer"},Ht={auto:"Detect automatically",system:"Zana voice",none:"Off",assistant:"Zana assistant",composer:"Follow Composer",openai:"OpenAI",anthropic:"Anthropic",google:"Google AI","google-gemini":"Google Gemini",en:"English",he:"Hebrew",de:"German",fr:"French",es:"Spanish",ja:"Japanese"};function Fe({rpc:e,onBack:t}){let[r,i]=y({}),[l,d]=y("Loading\u2026"),[m,p]=y(null),h=C(0),c=C({});R(()=>{let u=!0;return e.call("promptVoice.settings.get").then(g=>{u&&(c.current=g||{},i(c.current),d("Saved"))}).catch(()=>{u&&d("Could not load settings")}),()=>{u=!1}},[]);let b=u=>{let g=++h.current;c.current={...c.current,...u};let f=c.current;i(f),d("Saving\u2026"),e.call("promptVoice.settings.update",f).then(()=>{g===h.current&&(p(null),d("Saved"))}).catch(()=>{g===h.current&&(p(f),d("Could not save settings."))})};return n("div",{className:"ps-workspace",children:n("main",{className:"ps-editor-canvas",style:{overflowY:"auto"},children:s("div",{style:{width:"100%",maxWidth:760,margin:"0 auto",display:"flex",flexDirection:"column",gap:12},children:[s("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12},children:[s("div",{children:[n("h1",{style:{fontSize:18,margin:"4px 0"},children:"Settings"}),n("span",{style:{color:"var(--ps-text-muted)",fontSize:12},children:"Configure voice and refinement defaults"})]}),n("button",{className:"ps-btn",onClick:t,children:"\u2190 Back to Studio"})]}),s("div",{style:{color:"var(--ps-text-muted)",fontSize:11},children:[n("span",{role:"status",children:l}),m&&n("button",{className:"ps-btn",onClick:()=>b(m),children:"Retry"})]}),Object.entries(Ut).map(([u,g])=>s("section",{className:"ps-pane",style:{flex:"none"},children:[s("div",{className:"ps-pane-header",children:[n("h2",{className:"ps-pane-title",style:{margin:0},children:u}),u!=="Connections"&&n("button",{className:"ps-btn",onClick:()=>b(Object.fromEntries(g.map(f=>[f.key,$e[f.key]??""]))),children:"Reset"})]}),n("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:u==="Connections"?n("p",{style:{margin:0,color:"var(--ps-text-muted)",fontSize:12},children:"Manage OpenAI, Google AI and Anthropic API keys in Zana\u2019s Prompt Voice plugin settings. Keys remain protected by Zana."}):g.filter(f=>!(f.key==="sttModel"&&(r.sttProvider??"system")==="system")&&!(f.key==="llmModel"&&["none","assistant"].includes(r.llmProvider??"assistant"))&&!(f.key==="customPrompt"&&r.tone!=="custom")).map(f=>s("label",{className:"ps-field-group",children:[n("span",{className:"ps-field-label",children:f.label}),f.options?n("select",{className:"ps-select",value:r[f.key]??$e[f.key]??"",onChange:S=>b({[f.key]:S.target.value}),children:f.options.map(S=>n("option",{value:S,children:Ht[S]??S},S))}):f.multiline?n("textarea",{className:"ps-custom-prompt-input",value:r[f.key]??"",onChange:S=>b({[f.key]:S.target.value})}):n("input",{className:"ps-select",value:r[f.key]??"",onChange:S=>b({[f.key]:S.target.value})}),f.help&&n("small",{style:{color:"var(--ps-text-muted)"},children:f.help})]},f.key))})]},u))]})})})}function Be(e){return e?e.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]+/gu)||[]:[]}var je=1200;function Ve(e,t){if(!e&&!t)return[];if(e===t)return[{type:"unchanged",text:e}];if(!e)return[{type:"added",text:t}];if(!t)return[{type:"removed",text:e}];let r=Be(e),i=Be(t),l=r.length,d=i.length;if(l>je||d>je)return[{type:"removed",text:e},{type:"added",text:t}];let m=d+1,p=new Uint32Array((l+1)*m);for(let g=1;g<=l;g++){let f=g*m,S=(g-1)*m,j=r[g-1];for(let k=1;k<=d;k++)if(j===i[k-1])p[f+k]=p[S+(k-1)]+1;else{let E=p[f+(k-1)],P=p[S+k];p[f+k]=E>P?E:P}}let h=[],c=l,b=d;for(;c>0||b>0;){let g=c*m,f=(c-1)*m;c>0&&b>0&&r[c-1]===i[b-1]?(h.push({type:"unchanged",text:r[c-1]}),c--,b--):b>0&&(c===0||p[g+(b-1)]>=p[f+b])?(h.push({type:"added",text:i[b-1]}),b--):c>0&&(b===0||p[g+(b-1)]<p[f+b])&&(h.push({type:"removed",text:r[c-1]}),c--)}h.reverse();let u=[];for(let g of h)u.length>0&&u[u.length-1].type===g.type?u[u.length-1].text+=g.text:u.push({...g});return u}var Gt=`
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
`;async function Ue(e){if(!e)return!1;if(typeof navigator<"u"&&navigator.clipboard&&typeof navigator.clipboard.writeText=="function")try{return await navigator.clipboard.writeText(e),!0}catch{}if(typeof document<"u")try{let t=document.createElement("textarea");t.value=e,t.setAttribute("readonly",""),t.style.position="fixed",t.style.top="-9999px",t.style.left="-9999px",t.style.opacity="0",document.body.appendChild(t),t.focus(),t.select();let r=document.execCommand("copy");if(document.body.removeChild(t),r)return!0}catch{}return!1}var He="zcc:prompt-voice:studio-draft:v1",Ge=[{id:"polish",title:"Clean up writing",icon:"\u2728",desc:"Fix punctuation, grammar, and stuttering.",prompt:"Clean up disfluencies, typos, and improve sentence flow without altering intent.",tone:"technical"},{id:"executive",title:"Summarize",icon:"\u26A1",desc:"Condense into punchy bullet points.",prompt:"Summarize the core request into crisp, high-level executive bullet points.",tone:"formal"},{id:"spec",title:"Create a technical spec",icon:"\u{1F4D0}",desc:"Format with Goals, Context, Steps.",prompt:"Transform into a structured technical spec with ## Goal, ## Architecture, and ## Implementation Steps.",tone:"technical"},{id:"chat",title:"Make it conversational",icon:"\u{1F4AC}",desc:"Natural, conversational tone.",prompt:"Rephrase in a warm, polite, and helpful conversational tone.",tone:"conversational"}],qt=[{id:"assistant",displayName:"Zana Assistant",models:[{id:"assistant",key:"assistant",label:"Local / Active Thread Agent",providerId:"assistant"}]},{id:"openai",displayName:"OpenAI",models:[{id:"gpt-5.4-nano",key:"openai-fast",label:"GPT-5.4 Nano (Fast)",providerId:"openai"},{id:"gpt-5.6-luna",key:"openai-smart",label:"GPT-5.6 Luna (Smart)",providerId:"openai"}]},{id:"anthropic",displayName:"Anthropic",models:[{id:"claude-haiku-4-5-20251001",key:"anthropic-haiku",label:"Claude 4.5 Haiku",providerId:"anthropic"},{id:"claude-sonnet-5-20260201",key:"anthropic-sonnet",label:"Claude 5 Sonnet",providerId:"anthropic"}]},{id:"google",displayName:"Google Gemini",models:[{id:"gemini-2.5-flash",key:"google-flash",label:"Gemini 2.5 Flash",providerId:"google"}]}];function Zt(){try{return Ee()}catch{return null}}function qe({startSession:e=Y}){let[t,r]=y(!1),i=se(),l=pe(),d=Zt(),m=d?.providerId,p=d?.familyId,h=C(!1),[c,b]=y(""),[u,g]=y(""),[f,S]=y(!1),[j,k]=y(!1),[E,P]=y(!1),[V,ne]=y(null),[I,z]=y(null),[L,oe]=y("assistant"),[J,W]=y("assistant"),[Yt,Ye]=y(null),[ge,Ke]=y(null),[U,ve]=y({}),[Q,le]=y(!1),[O,re]=y("polish"),[ie,he]=y(""),[H,xe]=y(!1),[ye,w]=y(null),[G,we]=y(!1),[Xe,Se]=y(0),[Je,ke]=y(null),B=C(null),ee=C(null),te=C(null),Re=C(null);R(()=>{try{let o=localStorage.getItem(He);if(o){let a=JSON.parse(o);a.inputText&&b(a.inputText),a.outputText&&g(a.outputText),a.selectedProviderId&&oe(a.selectedProviderId),a.selectedModelId&&(h.current=!0,W(a.selectedModelId))}}catch{}},[]),R(()=>{let o=!0;return i.call("promptVoice.settings.get").then(a=>{o&&a&&typeof a=="object"&&ve(a)}).catch(()=>{o&&w("Could not load Studio defaults.")}),()=>{o=!1}},[t]),R(()=>{let o=!0;return i.call(Te).then(a=>{if(!o)return;let v=a;v&&v.llmProvider&&Ye(v.llmProvider)}).catch(()=>{}),()=>{o=!1}},[i]),R(()=>{let o=!0;return i.call(Ie).then(a=>{if(!o)return;let v=a;Array.isArray(v)&&v.length>0&&z(v)}).catch(()=>{}),()=>{o=!1}},[i]);let _=F(()=>{if(!I||I.length===0)return qt.map(a=>{let v=!!(m&&a.id.toLowerCase()===m.toLowerCase()||p&&a.id.toLowerCase().includes(p.toLowerCase()));return{...a,isComposerMatch:v,models:a.models.map(D=>({...D,isComposerMatch:v}))}});let o={"assistant:assistant":"assistant","openai:gpt-5.4-nano":"openai-fast","openai:gpt-5.6-luna":"openai-smart","anthropic:claude-haiku-4-5-20251001":"anthropic-haiku","anthropic:claude-sonnet-5-20260201":"anthropic-sonnet","google:gemini-2.5-flash":"google-flash"};return I.map(a=>{let v=!!(m&&a.providerId.toLowerCase()===m.toLowerCase()||p&&a.providerId.toLowerCase().includes(p.toLowerCase())),D=a.models.map($=>{let ae=`${a.providerId}:${$.id}`,N=o[ae]??$.id;return{id:$.id,key:N,label:$.label||$.id,providerId:a.providerId,isComposerMatch:v}});return{id:a.providerId,displayName:a.displayName||a.providerId,isComposerMatch:v,models:D}})},[I,m,p]),A=F(()=>_.find(o=>o.id===L)??_[0],[_,L]),q=F(()=>A?.models??[],[A]),Z=F(()=>q.find(a=>a.id===J||a.key===J)??q[0],[q,J]);R(()=>{if(!h.current&&_.length>0){let o=U.studioProvider&&U.studioProvider!=="composer"?_.find(a=>a.id===U.studioProvider):_.find(a=>a.isComposerMatch);if(o&&(oe(o.id),o.models.length>0)){let a=o.models.find(v=>v.id===U.studioModel||v.key===U.studioModel)??o.models[0];W(a.key||a.id)}}},[_,U]),R(()=>{try{localStorage.setItem(He,JSON.stringify({inputText:c,outputText:u,selectedProviderId:L,selectedModelId:J}))}catch{}},[c,u,L,J]);let We=o=>{h.current=!0,oe(o);let a=_.find(v=>v.id===o);a&&a.models.length>0&&W(a.models[0].key||a.models[0].id)},Qe=o=>{h.current=!0;for(let a of _){let v=a.models.find(D=>D.id===o||D.key===o);if(v){a.id!==L&&oe(a.id),W(v.key||v.id);return}}W(o)};R(()=>()=>{ee.current&&clearInterval(ee.current),te.current&&clearInterval(te.current),B.current&&B.current.cancel()},[]);let et=F(()=>{let o=c.trim();return`${o?o.split(/\s+/).length:0} words \xB7 ${c.length} chars`},[c]),tt=F(()=>{let o=u.trim();return`${o?o.split(/\s+/).length:0} words \xB7 ${u.length} chars`},[u]),nt=F(()=>!u||!Q?[]:Ve(c,u),[c,u,Q]),ot=async()=>{if(G){we(!1),ke(null),ee.current&&clearInterval(ee.current),te.current&&clearInterval(te.current);let o=B.current;if(B.current=null,!o)return;P(!0);try{let a=await o.stop(),v=await i.call(ce,{audio:a.base64,mimeType:a.mimeType,transcriptionOnly:!0});v.ok&&v.status==="ok"?b(D=>K(D,v.text)):v.ok&&v.status==="no-speech"?(w("No speech detected. Try speaking closer to the microphone."),setTimeout(()=>w(null),4e3)):v.ok||w(v.message)}catch(a){w(a instanceof Error?a.message:"Transcription failed.")}finally{P(!1)}}else{w(null);try{let o=await e();B.current=o,we(!0),Se(0),ee.current=setInterval(()=>{Se(a=>a+1)},1e3),te.current=setInterval(()=>{if(B.current){let a=B.current.getAudioLevel?.()??null;ke(a)}},100)}catch(o){w(o instanceof Error?o.message:"Microphone access denied.")}}},rt=async()=>{let o=c.trim();if(!o||H||O==="custom"&&!ie.trim())return;let a=Ge.find(N=>N.id===O),v=O==="custom"?ie.trim():a?.prompt||"Polish and format for clarity.",D=a?.tone||"technical",$=A?.id??"assistant",ae=Z?.id??"assistant";w(null),xe(!0);try{let N=await i.call(Pe,{text:o,tone:D,customPrompt:v,llmProvider:$,llmModel:ae});N.ok?(g(N.text),Ke(`${A?.displayName||$}: ${N.llmModel||ae}`)):w(N.message)}catch(N){w(N instanceof Error?N.message:"Refinement request failed.")}finally{xe(!1)}},it=async()=>{try{let o=await navigator.clipboard.readText();if(!o||!o.trim()){w("Clipboard is empty."),setTimeout(()=>w(null),2500);return}b(a=>K(a,o)),w("Pasted from clipboard into input draft!"),setTimeout(()=>w(null),2500)}catch{w("Clipboard access denied or unavailable."),setTimeout(()=>w(null),2500)}},at=async()=>{if(!c)return;await Ue(c)?(k(!0),setTimeout(()=>k(!1),2e3),w("Input draft copied to clipboard!"),setTimeout(()=>w(null),2500)):(w("Failed to copy to clipboard."),setTimeout(()=>w(null),3e3))},st=async()=>{if(!u)return;await Ue(u)?(S(!0),setTimeout(()=>S(!1),2e3),w("Refined output copied to clipboard!"),setTimeout(()=>w(null),2500)):(w("Failed to copy to clipboard."),setTimeout(()=>w(null),3e3))},pt=()=>{!c&&!u||(b(""),g(""),re("polish"),he(""),le(!1),w("Studio canvas cleared."),setTimeout(()=>w(null),2500))},ct=()=>{u&&(b(u),g(""),le(!1),w("Refined output moved to input draft."),setTimeout(()=>w(null),2500))},lt=()=>{let o=u||c;if(o)try{l.updateText(a=>K(a,o)),l.focus(),ne("Inserted into Composer!"),setTimeout(()=>ne(null),2500)}catch{w("Composer focus unavailable.")}},dt=T(o=>{(o.ctrlKey||o.metaKey)&&o.key.toLowerCase()==="k"&&(o.preventDefault(),re("custom"),setTimeout(()=>Re.current?.focus(),0))},[]);return s("div",{className:"ps-container",onKeyDown:dt,children:[n("style",{children:Gt}),s("header",{className:"ps-header",children:[s("div",{className:"ps-header-left",children:[n("span",{style:{fontSize:18},children:"\u{1F399}\uFE0F"}),n("span",{className:"ps-header-title",children:"Prompt Studio"}),n("span",{className:"ps-badge",children:"Voice & AI Refinement"}),V&&n("span",{className:"ps-badge",style:{background:"rgba(34, 197, 94, 0.2)",color:"#86efac"},children:V})]}),s("div",{className:"ps-header-actions",children:[s("button",{type:"button",className:"ps-btn",onClick:pt,title:"Clear current input and output",disabled:!c&&!u,children:[n("span",{children:"\u{1F5D1}\uFE0F"}),n("span",{children:"Clear"})]}),s("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:lt,disabled:!c&&!u,title:"Append current text directly into Zana Composer",children:[n("span",{children:"\u{1F4AC}"}),n("span",{children:"Insert into Composer"})]})]})]}),t?n(Fe,{rpc:i,onBack:()=>r(!1)}):s("div",{className:"ps-workspace",children:[s("aside",{className:"ps-sidebar",children:[s("section",{className:"ps-section",children:[s("div",{className:"ps-section-title",children:[n("span",{children:"Refinement Engine"}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:A?.isComposerMatch?"\u2605 Composer Active":"AI Model"})]}),n("button",{type:"button",className:"ps-btn",onClick:()=>{h.current=!1,ve(o=>({...o}))},children:"Reset to default"}),s("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-provider-select",className:"ps-field-label",children:"Provider"}),n("select",{id:"ps-provider-select",className:"ps-select","aria-label":"Refinement provider",value:A?.id??"",onChange:o=>We(o.target.value),disabled:H,children:_.map(o=>s("option",{value:o.id,children:[o.displayName,o.isComposerMatch?" \u2605 (Composer)":""]},o.id))})]}),s("div",{className:"ps-field-group",children:[s("label",{htmlFor:"ps-model-select",className:"ps-field-label",children:["Model (",q.length,")"]}),n("select",{id:"ps-model-select",className:"ps-select","aria-label":"Refinement model",value:Z?.key||Z?.id||"",onChange:o=>Qe(o.target.value),disabled:H||q.length===0,children:q.map(o=>s("option",{value:o.key||o.id,children:[o.label,o.isComposerMatch?" \u2605 (Composer)":""]},o.key||o.id))})]}),s("div",{style:{marginTop:4,fontSize:11,color:"var(--ps-text-muted)",lineHeight:1.35},children:[A?.isComposerMatch?s("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:600},children:["\u2605 Synced to Composer: ",A.displayName," (",Z?.label,")"]}):A?.id==="assistant"?"Uses the active Zana assistant agent with no extra API key required.":s(X,{children:["Using ",n("strong",{children:A?.displayName})," \xB7 ",n("code",{children:Z?.id})]}),ge?s("div",{style:{marginTop:3,color:"var(--ps-text-subtle)",fontSize:10},children:["Last refined: ",ge]}):null]})]}),s("section",{className:"ps-section",children:[s("div",{className:"ps-section-title",children:[n("span",{children:"Voice Dictation"}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:"Host STT"})]}),s("div",{className:"ps-dictation-card",children:[s("button",{type:"button",className:`ps-btn ${G?"ps-btn-danger":E?"":"ps-btn-primary"}`,style:{width:"100%",justifyContent:"center",padding:"10px 0",opacity:E?.8:1},onClick:ot,disabled:E,"aria-label":E?"Transcribing audio":G?"Stop dictation":"Start dictation",children:[n("span",{className:E?"ps-spin":void 0,children:E?"\u23F3":G?"\u23F9\uFE0F":"\u{1F399}\uFE0F"}),n("span",{children:E?"Transcribing...":G?`Stop Dictation (${Xe}s)`:"Dictate Thoughts"})]}),G&&s("div",{style:{width:"100%",display:"flex",flexDirection:"column",gap:4},children:[n("div",{className:"ps-meter-bar",children:n("div",{className:"ps-meter-fill",style:{width:`${Math.min(100,(Je??.1)*100)}%`}})}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:"Listening live..."})]})]})]}),s("section",{className:"ps-section",children:[n("div",{className:"ps-section-title",children:"How should we improve it?"}),s("div",{className:"ps-presets-list",role:"radiogroup","aria-label":"How should we improve it?",children:[Ge.map(o=>s("label",{className:`ps-preset-btn ${O===o.id?"active":""}`,children:[s("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:o.id,checked:O===o.id,onChange:()=>re(o.id)}),o.title]}),n("span",{className:"preset-desc",children:o.desc})]},o.id)),s("label",{className:`ps-preset-btn ${O==="custom"?"active":""}`,children:[s("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:"custom",checked:O==="custom",onChange:()=>re("custom")}),"Custom instructions"]}),n("span",{className:"preset-desc",children:"Describe your own transformation."})]})]}),O==="custom"&&n("textarea",{ref:Re,className:"ps-custom-prompt-input","aria-label":"Custom instructions",placeholder:"e.g. Turn into user stories with acceptance criteria...",value:ie,onChange:o=>he(o.target.value)})]}),n("button",{type:"button",className:"ps-btn",style:{marginTop:"auto"},onClick:()=>r(!0),children:"Settings"})]}),s("main",{className:"ps-editor-canvas",children:[s("section",{className:"ps-pane",children:[s("div",{className:"ps-pane-header",children:[s("div",{className:"ps-pane-title",children:[n("span",{children:"\u{1F4DD}"}),n("span",{children:"Raw Input Draft"})]}),s("div",{style:{display:"flex",gap:6},children:[n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:it,title:"Paste from clipboard into input draft","aria-label":"Paste into input draft",children:"\u{1F4CB} Paste"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:at,disabled:!c,title:"Copy raw input","aria-label":"Copy raw input",children:j?"\u2705 Copied":"\u{1F4CB} Copy"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>b(""),disabled:!c,title:"Clear input",children:"Clear"})]})]}),n("textarea",{className:"ps-textarea",placeholder:"Type your raw thoughts or click Dictate in the left sidebar to speak...",value:c,onChange:o=>b(o.target.value),"aria-label":"Raw Input Text"})]}),s("div",{className:"ps-action-bar",children:[s("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12},children:[n("span",{className:"ps-pill",children:"\u2B07 Refine pipeline"}),n("span",{style:{color:"var(--ps-text-muted)"},children:c.trim()?`${c.trim().split(/\s+/).length} words ready`:"Add text to get started"})]}),n("div",{style:{display:"flex",alignItems:"center",gap:6},children:s("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:()=>rt(),disabled:H||!c.trim()||O==="custom"&&!ie.trim(),title:"Transform raw draft into polished output",children:[n("span",{children:H?"\u23F3":"\u26A1"}),n("span",{children:H?"Refining...":"Refine text"})]})})]}),s("section",{className:"ps-pane",children:[s("div",{className:"ps-pane-header",children:[s("div",{className:"ps-pane-title",children:[n("span",{children:"\u2728"}),n("span",{children:"Result"})]}),s("div",{style:{display:"flex",gap:6},children:[u&&s("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>le(o=>!o),title:"Toggle inline diff against input draft",children:[n("span",{children:Q?"\u{1F441}\uFE0F":"\u{1F50D}"}),n("span",{children:Q?"View Clean":"View Diff"})]}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:ct,disabled:!u,title:"Move output to input draft for iterative re-refinement",children:"\u2B06 Replace Input"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:st,disabled:!u,title:"Copy refined text to clipboard","aria-label":"Copy refined output",children:f?"\u2705 Copied":"\u{1F4CB} Copy"})]})]}),Q&&u?n("div",{className:"ps-output-view",children:nt.map((o,a)=>o.type==="added"?n("span",{className:"ps-diff-added",children:o.text},a):o.type==="removed"?n("span",{className:"ps-diff-removed",children:o.text},a):n("span",{className:"ps-diff-unchanged",children:o.text},a))}):n("textarea",{className:"ps-textarea",placeholder:"Polished, structured output will appear here after clicking Refine...",value:u,onChange:o=>g(o.target.value),"aria-label":"Refined output"})]})]})]}),s("footer",{className:"ps-status-bar",children:[s("div",{style:{display:"flex",gap:12},children:[s("span",{children:["Input: ",et]}),s("span",{children:["Output: ",tt]}),ye&&n("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:500},children:ye})]}),s("div",{style:{display:"flex",gap:12,alignItems:"center"},children:[s("span",{children:["Engine: ",A?.displayName," \xB7 ",Z?.label]}),A?.isComposerMatch&&n("span",{className:"ps-pill",style:{color:"var(--accent, #3b82f6)"},children:"\u2605 Composer Synced"}),n("span",{children:"Zana Prompt Studio"})]})]})]})}var Ze="prompt-studio",ro=Ce(e=>{be(),e.composer.customize({id:"prompt-voice-mic",actions:[{id:"prompt-voice-mic",component:ze}]}),e.slots.navPanel?.({id:"prompt-studio",title:"Prompt Studio",icon:"Sparkles",path:Ze,component:qe}),e.slots.commandPaletteAction?.({id:"open-prompt-studio",title:"Prompt Studio: Open Canvas",run:t=>{t.navigate?.(`/${Ze}`)}})});export{Ze as PROMPT_STUDIO_PANEL_PATH,ro as default};
//# sourceMappingURL=app.js.map
