function Te(){return globalThis.__ZCC_PLUGIN_RUNTIME__??{}}function Ie(e){throw new Error(`${e} is not available until the host plugin runtime is installed`)}function Ze(e){return{__zccPluginApp:!0,setup:e}}function be(){return Te().useRpc?.()??Ie("useRpc")}function he(){return Te().useComposer?.()??Ie("useComposer")}function Ke(){return Te().useComposerView?.()??Ie("useComposerView")}var Ut=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4"];var L=class extends Error{code;constructor(t,r){super(r),this.name="RecordingError",this.code=t}};function Bt(e){return Ut.find(t=>e(t))??null}var Wt="audio/webm";function jt(){return{getUserMedia:e=>navigator.mediaDevices.getUserMedia(e),createRecorder:(e,t)=>new MediaRecorder(e,t?{mimeType:t}:void 0),isTypeSupported:e=>typeof MediaRecorder<"u"&&MediaRecorder.isTypeSupported(e)}}async function Ht(e){try{return await e.getUserMedia({audio:!0})}catch(t){let r=t instanceof Error?t.name:"";throw r==="NotAllowedError"||r==="SecurityError"?new L("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again."):new L("MIC_UNAVAILABLE","No microphone is available. Connect one and try again.")}}function Pe(e){return new Promise((t,r)=>{let i=new FileReader;i.onload=()=>{let s=typeof i.result=="string"?i.result:"";t(s.slice(s.indexOf(",")+1))},i.onerror=()=>r(new L("RECORDING_FAILED","The recording could not be read.")),i.readAsDataURL(e)})}async function Gt(e,t){let r=new Blob(e,{type:t});return{base64:await Pe(r),mimeType:r.type||t}}function qt(e,t){if(!(e>0&&Number.isFinite(e)))return()=>{};let r=setTimeout(t,e);return()=>clearTimeout(r)}var Zt="That recording is too large to transcribe. Keep dictation shorter and try again.";function Kt(e,t){let r=Math.max(t,e),i=[],s=0,c=!1;return{chunks:i,get overflowed(){return c},add(d){return d.size===0||c?"ignored":s+d.size>r?(c=!0,"overflow"):(i.push(d),s+=d.size,s>=e?"limit-reached":"accepted")}}}function Yt(e,t){let r=new Promise((i,s)=>{e.onstop=()=>i(),e.onerror=()=>{let c=new L("RECORDING_FAILED","Recording stopped unexpectedly. Try again.");t(c),s(c)}});return r.catch(()=>{}),r}function Xt(e,t,r,i){let s=Yt(e,i);return e.ondataavailable=c=>{let d=t.add(c.data);(d==="limit-reached"||d==="overflow")&&r()},e.start(1e3),s}async function Jt(e,t,r,i){try{await e}finally{t()}if(r.overflowed)throw new L("RECORDING_FAILED",Zt);return Gt(r.chunks,i)}function Qt(e){let t=()=>{};return{stopRecorder(){t(),e.state!=="inactive"&&e.stop()},armTimer(r,i){t=qt(r,i)}}}function en(e,t){let r=null;return{attach(i){r=i},detach(){r=null},autoStop(){e();let i=r?.onAutoStop;r&&(r.onAutoStop=void 0),i?.()},fail(i){e(),t();let s=r?.onError;r=null,s?.(i)}}}function tn(e,t,r,i){let s=Kt(i.maxBytes??9437184,i.hardMaxBytes??10485760),{stopRecorder:c,armTimer:d}=Qt(e),p=en(c,t);d(i.maxDurationMs??12e4,p.autoStop);let f=Xt(e,s,p.autoStop,p.fail),l={onError:i.onError,onAutoStop:i.onAutoStop,async stop(){c();try{return await Jt(f,t,s,e.mimeType||r)}finally{p.detach()}},cancel(){c(),t(),p.detach()}};return p.attach(l),l}var ee=()=>nn();async function nn(e=jt(),t={}){let r=await Ht(e),i=on(r),s=r.getTracks(),c,d=()=>{for(let p of s)c&&p.removeEventListener?.("ended",c);i?.close(),s.forEach(p=>p.stop())};try{let p=Bt(e.isTypeSupported)??Wt,f=e.createRecorder(r,p),l=tn(f,d,p,t);return l.getAudioLevel=()=>i?.level()??null,c=()=>{let g=l.onError;l.cancel(),g?.(new L("MIC_UNAVAILABLE","Microphone disconnected. Check your device and try again."))},s.forEach(g=>g.addEventListener?.("ended",c)),l}catch(p){throw d(),p instanceof L?p:new L("RECORDING_FAILED",p instanceof Error?p.message:"The recording could not be started.")}}function on(e){let t;try{t=new AudioContext;let r=t.createMediaStreamSource(e),i=t.createAnalyser();i.fftSize=256,r.connect(i);let s=new Uint8Array(i.fftSize),c=t,d=!1;return{level(){if(c.state&&c.state!=="running")return null;i.getByteTimeDomainData(s);let p=s.reduce((f,l)=>f+((l-128)/128)**2,0)/s.length;return Math.min(1,Math.sqrt(p)*5)},close(){d||(d=!0,r.disconnect(),c.close().catch(p=>console.error("Prompt Voice audio meter cleanup failed",p)))}}}catch(r){return t&&t.close().catch(i=>console.error("Prompt Voice audio meter cleanup failed",i)),console.warn("Prompt Voice audio meter unavailable",r),null}}var y=globalThis.__ZCC_HOST_REACT__,Ye=y,Wn=y.Children,jn=y.Component,Hn=y.Fragment,Gn=y.StrictMode,qn=y.Suspense,Zn=y.cloneElement,Kn=y.createContext,Yn=y.createElement,Xn=y.createRef,Jn=y.forwardRef,Qn=y.isValidElement,eo=y.lazy,to=y.memo,no=y.startTransition,C=y.useCallback,oo=y.useContext,ro=y.useDebugValue,io=y.useDeferredValue,E=y.useEffect,ao=y.useId,so=y.useImperativeHandle,po=y.useInsertionEffect,lo=y.useLayoutEffect,H=y.useMemo,Xe=y.useReducer,T=y.useRef,v=y.useState,co=y.useSyncExternalStore,uo=y.useTransition,mo=y.version;var ve="promptVoice.transcribe",se="promptVoice.status",Je="promptVoice.rephrase",Qe="promptVoice.availableModels",z={state:"promptVoice.localWhisper.state",installRuntime:"promptVoice.localWhisper.installRuntime",cancelRuntimeInstall:"promptVoice.localWhisper.cancelRuntimeInstall",downloadModel:"promptVoice.localWhisper.downloadModel",cancelModelDownload:"promptVoice.localWhisper.cancelModelDownload",removeModel:"promptVoice.localWhisper.removeModel",selectModel:"promptVoice.localWhisper.selectModel",start:"promptVoice.localWhisper.start",stop:"promptVoice.localWhisper.stop"};function te(e,t){let r=t.trim();return r?e?/\s$/.test(e)?`${e}${r}`:`${e} ${r}`:r:e}var rn="No speech detected.",Ne={phase:"idle",notice:null,error:null};function et(e,t){switch(t.type){case"START":return e.phase==="idle"||e.phase==="error"?{phase:"starting",notice:null,error:null}:e;case"STARTED":return e.phase==="starting"?{...e,phase:"recording"}:e;case"STOP":return e.phase==="recording"||e.phase==="starting"?{phase:"processing",notice:null,error:null}:e;case"CANCEL":return e.phase==="recording"||e.phase==="starting"?{...Ne}:e;case"SUCCESS":case"NO_SPEECH":return e.phase!=="processing"?e:{phase:"idle",notice:t.type==="NO_SPEECH"?rn:t.notice,error:null};case"CLEAR_NOTICE":return e.notice?{...e,notice:null}:e;case"FAILURE":return{phase:"error",notice:null,error:t.message}}}var _e=16e3,tt=44,pe=2,an="This recording couldn't be prepared for Local Whisper. Try again.",sn=async(e,t)=>{let i=await new OfflineAudioContext(1,1,t).decodeAudioData(e),s=Array.from({length:i.numberOfChannels},(c,d)=>i.getChannelData(d));return{sampleRate:i.sampleRate,channels:s}};function pn(e){if(e.length===0)return new Float32Array(0);if(e.length===1)return e[0];let t=Math.min(...e.map(i=>i.length)),r=new Float32Array(t);for(let i=0;i<t;i+=1){let s=0;for(let c of e)s+=c[i];r[i]=s/e.length}return r}function ln(e,t){let r=e.length*pe,i=new Uint8Array(tt+r),s=new DataView(i.buffer),c=(d,p)=>{for(let f=0;f<p.length;f+=1)s.setUint8(d+f,p.charCodeAt(f))};c(0,"RIFF"),s.setUint32(4,36+r,!0),c(8,"WAVE"),c(12,"fmt "),s.setUint32(16,16,!0),s.setUint16(20,1,!0),s.setUint16(22,1,!0),s.setUint32(24,t,!0),s.setUint32(28,t*pe,!0),s.setUint16(32,pe,!0),s.setUint16(34,8*pe,!0),c(36,"data"),s.setUint32(40,r,!0);for(let d=0;d<e.length;d+=1){let p=Math.max(-1,Math.min(1,e[d]));s.setInt16(tt+d*pe,p<0?p*32768:p*32767,!0)}return i}function cn(e){let t=atob(e),r=new Uint8Array(t.length);for(let i=0;i<t.length;i+=1)r[i]=t.charCodeAt(i);return r.buffer}async function dn(e,t=sn){let r;try{let i=await t(cn(e.base64),_e);if(i.sampleRate!==_e)throw new Error("decoder ignored the requested sample rate");r=ln(pn(i.channels),_e)}catch{throw new L("RECORDING_FAILED",an)}return{base64:await Pe(new Blob([r],{type:"audio/wav"})),mimeType:"audio/wav"}}async function xe(e,t,r=dn){return(await e.call(se).catch(()=>null))?.audioFormat==="wav"?r(t):t}var un="Prompt Voice returned an unexpected response. Try again.",mn="Dictation failed. Try again.",fn=4e3;function gn(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}async function bn(e,t){let r=await xe(e,t),i=await e.call(ve,{audio:r.base64,mimeType:r.mimeType});if(!gn(i))throw new Error(un);return i}function nt(e){return e instanceof Error&&e.message?e.message:mn}function hn(e,t,r){if(!e.ok){r({type:"FAILURE",message:e.message});return}if(e.status==="no-speech"){r({type:"NO_SPEECH"});return}t.updateText(s=>te(s,e.text)),t.focus();let i=e.refineNotice?`Inserted the raw transcript. ${e.refineNotice.message}`:"Added to draft.";r({type:"SUCCESS",notice:i})}function vn(e,t,r,i){return t()?(e.onError=s=>{t()&&i(s)},e.onAutoStop=()=>{t()&&r()},e):(e.cancel(),null)}function xn(e,t,r,i,s){let c=d=>s({type:"FAILURE",message:nt(d)});return e.then(d=>{let p=vn(d,r,i,f=>{t.current=null,c(f)});return p&&(t.current=p),p},d=>(r()&&c(d),null))}function yn(e,t){let r=T(null),i=T(null),s=T(0),c=T(!0),d=C(()=>{s.current++,i.current=null,r.current&&(r.current.cancel(),r.current=null),t({type:"CANCEL"})},[t]);E(()=>(c.current=!0,()=>{c.current=!1,d()}),[d]);let p=C(async()=>{let m=i.current?await i.current:r.current;return r.current=null,m},[]),f=C(async m=>{let b=++s.current,h=()=>c.current&&s.current===b,R=xn(e(),r,h,m,t);i.current=R,await R&&h()&&t({type:"STARTED"}),i.current===R&&(i.current=null)},[t,e]),l=C(()=>c.current,[]),g=C(()=>r.current?.getAudioLevel?.()??null,[]);return{start:f,takeSession:p,cancel:d,isMounted:l,getAudioLevel:g}}function ot({startSession:e=ee,noticeDurationMs:t=fn}={}){let r=he(),i=be(),[s,c]=Xe(et,Ne),{start:d,takeSession:p,cancel:f,isMounted:l,getAudioLevel:g}=yn(e,c),[m,b]=v(null),[h,R]=v(0),[Z,N]=v(!1);E(()=>{if(s.phase!=="recording"){b(null),R(0);return}let O=Date.now(),W=()=>{b(g()),R(Math.floor((Date.now()-O)/1e3))};W();let V=setInterval(W,100);return()=>clearInterval(V)},[g,s.phase]),E(()=>{if(!s.notice)return;let O=setTimeout(()=>{c({type:"CLEAR_NOTICE"})},t);return()=>clearTimeout(O)},[t,s.notice]);let _=C(()=>{c({type:"CLEAR_NOTICE"})},[]),D=C(async()=>{c({type:"STOP"});let O=await p();if(!(!l()||!O))try{let W=await O.stop();if(!l())return;let V=await bn(i,W);if(!l())return;hn(V,r,c)}catch(W){if(!l())return;c({type:"FAILURE",message:nt(W)})}},[r,l,i,p]),K=C(async()=>{N(!1),c({type:"START"}),await d(()=>{N(!0),D()})},[D,d]),le=C(()=>{s.phase==="recording"||s.phase==="starting"?D():s.phase!=="processing"&&K()},[K,D,s.phase]);return{phase:s.phase,error:s.error,notice:s.notice,level:m,seconds:h,autoStopped:Z,onClick:le,cancel:f,clearNotice:_,beginDictation:K,finishDictation:D}}var Me=`/* Base Container */\r
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
`;var rt=globalThis.__ZCC_HOST_REACT__,F=rt.Fragment;function n(e,t,r){return rt.createElement(e,r===void 0?t:{...t,key:r})}var a=n;var Sn="Dictation",it="zcc-ext-prompt-voice-styles";function Le(){if(typeof document>"u")return;let e=document.getElementById(it);e||(e=document.createElement("style"),e.id=it,document.head.appendChild(e)),e.textContent!==Me&&(e.textContent=Me)}var Rn={idle:"Start dictation",starting:"Stop dictation",recording:"Stop dictation",processing:"Transcribing",error:"Start dictation"},at={position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",border:0};function st({startSession:e=ee}){Le();let{phase:t,error:r,notice:i,onClick:s,cancel:c,clearNotice:d,level:p,seconds:f,autoStopped:l}=ot({startSession:e}),g=t==="starting"||t==="recording"||t==="processing",m=t==="idle"&&!!i,b=`${Math.floor(f/60)}:${String(f%60).padStart(2,"0")}`;return a("div",{className:`pv-mic pv-dictation-pill pv-phase-${t} ${m?"pv-has-notice":""}`,onClick:m?d:void 0,title:m?"Click to dismiss":void 0,children:[n("button",{type:"button",className:`pv-mic-button pv-mic-${t} ${g?"pv-pill-btn-stop":"pv-idle-icon"}`,"aria-label":Sn,"aria-pressed":t==="recording"||t==="starting",title:Rn[t],disabled:t==="processing",onClick:s,style:m?{display:"none"}:void 0,children:t==="idle"||t==="error"?n("svg",{viewBox:"0 0 24 24",width:"16",height:"16","aria-hidden":"true",focusable:"false",children:n("path",{d:"M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5Zm6 9h2v-3h-2v3Z",fill:"currentColor"})}):t==="processing"?n("span",{className:"pv-mic-spinner","aria-hidden":"true"}):n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("rect",{x:"6",y:"6",width:"12",height:"12",rx:"2.5",fill:"currentColor"})})}),m?a("span",{role:"status",className:"pv-notice-content",children:[n("span",{className:"pv-notice-check",children:"\u2713"}),n("span",{className:"pv-pill-status",children:i})]}):null,t==="starting"?a(F,{children:[a("div",{className:"pv-pill-timer-badge",children:[n("div",{className:"pv-pill-dot pv-pill-dot-starting"}),n("span",{className:"pv-pill-timer-text",children:"0:00"})]}),a("div",{className:"pv-pill-center",role:"status",children:[n("span",{className:"pv-mic-spinner","aria-hidden":"true"}),n("span",{className:"pv-pill-status",children:"Requesting microphone\u2026"})]})]}):null,t==="recording"?a(F,{children:[a("div",{className:"pv-pill-timer-badge",children:[n("div",{className:"pv-pill-dot"}),a("span",{className:"pv-pill-timer-text",children:[n("span",{className:"pv-sr-only",style:at,children:"Recording "}),b]})]}),a("div",{className:"pv-pill-center",role:"status",children:[p===null?n("span",{className:"pv-sr-only",style:at,children:"Audio meter unavailable"}):null,n("span",{className:`pv-pill-waveform ${p===null?"animated":""}`,"aria-label":"Microphone audio activity",role:"meter","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":Math.round((p??.3)*100),children:[.4,.7,1,.7,.4].map((h,R)=>n("span",{className:"pv-pill-waveform-bar",style:p!==null?{height:`${Math.max(3,p*h*20)}px`}:void 0},R))}),n("span",{className:"pv-pill-status",children:"Listening..."}),p!==null&&p<.015&&f>=5?n("span",{className:"pv-mic-quiet-warning",children:"No audio detected \u2014 check your microphone."}):null]})]}):null,t==="processing"?a(F,{children:[n("div",{className:"pv-pill-timer-badge",children:n("span",{className:"pv-pill-timer-text",children:b})}),n("div",{className:"pv-pill-center",role:"status",children:a("span",{className:"pv-pill-status",children:[n("span",{className:"pv-mic-spinner","aria-hidden":"true"})," ",l?"Recording limit reached. ":"","Transcribing and refining\u2026"]})})]}):null,t==="starting"||t==="recording"?n("button",{type:"button",className:"pv-mic-cancel pv-pill-btn-cancel",onClick:c,"aria-label":"Cancel recording",title:"Cancel recording",children:n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("path",{d:"M18 6L6 18M6 6l12 12",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round"})})}):null,t==="error"&&r?n("span",{role:"alert",className:"pv-pill-status pv-mic-error",children:r}):null]})}var An=500,kn=5e3;function De(e){return e>=1e3**3?`${(e/1e3**3).toFixed(1)} GB`:`${Math.round(e/1e3**2)} MB`}function Cn(e){return e.runtime.status==="installing"||e.server.state==="starting"||e.models.some(t=>t.status==="downloading")}function En(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}function Tn(e){let[t,r]=v(null),[i,s]=v(null),[c,d]=v(null),p=T(!0),f=C(b=>{if(p.current){if(!En(b)){s("Local Whisper returned an unexpected response.");return}b.state&&r(b.state),s(b.ok?null:b.message)}},[]),l=C(()=>e.call(z.state).then(f,()=>p.current&&s("Could not load Local Whisper status.")),[e,f]),g=C(async(b,h,R)=>{d(b);try{f(await e.call(h,R))}catch{p.current&&s("Local Whisper request failed. Try again.")}finally{p.current&&d(null)}},[e,f]);E(()=>(p.current=!0,l(),()=>{p.current=!1}),[l]);let m=t?Cn(t):!1;return E(()=>{let b=setInterval(()=>void l(),m?An:kn);return()=>clearInterval(b)},[m,l]),{state:t,error:i,pending:c,run:g}}function Oe({tone:e}){return n("span",{"aria-hidden":"true",style:{width:9,height:9,borderRadius:"50%",marginTop:4,flex:"none",background:{ok:"var(--ps-success)",warn:"var(--ps-warn)",err:"var(--ps-danger)",busy:"var(--ps-accent)",idle:"var(--ps-text-muted)"}[e]}})}function pt({value:e,label:t}){let r=Math.round(e*100);return n("div",{role:"progressbar","aria-label":t,"aria-valuenow":r,"aria-valuemin":0,"aria-valuemax":100,style:{height:5,minWidth:80,background:"var(--ps-bg-hover)",borderRadius:3,overflow:"hidden"},children:n("div",{style:{width:`${r}%`,height:"100%",background:"var(--ps-accent)"}})})}var ye={display:"flex",gap:10,alignItems:"flex-start",padding:"10px 12px",borderRadius:6,border:"1px solid var(--ps-border)"},G={color:"var(--ps-text-muted)",fontSize:11};function In(e){let{runtime:t,server:r,activeModelId:i}=e;return t.status==="not-installed"?{tone:"idle",title:"Runtime not installed",detail:`whisper.cpp ${t.version} \xB7 requires ${t.requirements.join(", ")||"no extra components"}`,action:{label:"Install runtime",method:z.installRuntime,primary:!0}}:t.status==="installing"?{tone:"busy",title:`Installing runtime\u2026 ${Math.round((t.progress??0)*100)}%`,detail:"Verifying the download as it arrives.",action:{label:"Cancel",method:z.cancelRuntimeInstall}}:r.state==="running"?{tone:"ok",title:"Running",detail:`Model ${r.modelId} \xB7 on this device (127.0.0.1) \xB7 managed by Prompt Voice`,action:{label:"Stop",method:z.stop}}:r.state==="starting"?{tone:"busy",title:"Starting\u2026",detail:`Loading model ${r.modelId}.`}:r.state==="crashed"?{tone:"err",title:"Stopped unexpectedly",detail:`Exit code ${r.exitCode??"unknown"}. Logs contain no audio or transcripts.`,action:{label:"Restart",method:z.start,primary:!0}}:i?{tone:"warn",title:"Stopped",detail:"Starts automatically when you dictate.",action:{label:"Start",method:z.start}}:{tone:"warn",title:"Runtime installed",detail:"Download a model below and choose Use to start."}}function Pn({model:e,state:t,pending:r,onRun:i}){let s=t.activeModelId===e.id,c=t.runtime.status==="installed"&&!s,d=g=>`${g}:${e.id}`,p={modelId:e.id},f=null,l;return e.status==="downloading"?(f=a(F,{children:[n(pt,{value:e.progress??0,label:`Downloading ${e.label}`}),a("span",{style:G,children:[Math.round((e.progress??0)*100),"% of ",De(e.sizeBytes)]})]}),l=n("button",{type:"button",className:"ps-btn",onClick:()=>i(d("cancel"),z.cancelModelDownload,p),children:"Cancel"})):e.status==="available"?l=a("button",{type:"button",className:"ps-btn",disabled:r===d("download"),onClick:()=>i(d("download"),z.downloadModel,p),children:["Download ",De(e.sizeBytes)]}):(f=s?n("span",{className:"ps-tag",children:"Active"}):r===d("use")?n("span",{className:"ps-tag",children:"Loading\u2026"}):n("span",{className:"ps-tag",children:"Installed"}),l=a(F,{children:[c&&n("button",{type:"button",className:"ps-btn",disabled:r!==null,onClick:()=>i(d("use"),z.selectModel,p),children:"Use"}),n("button",{type:"button",className:"ps-btn ps-btn-danger",disabled:s||r!==null,title:s?"Choose another model before removing this one":void 0,"aria-label":`Remove ${e.label}`,onClick:()=>i(d("remove"),z.removeModel,p),children:"Remove"})]})),a("tr",{style:s?{background:"color-mix(in srgb, var(--ps-accent) 10%, transparent)"}:void 0,children:[a("td",{style:{padding:"8px 6px"},children:[n("strong",{children:e.label})," ",e.recommended&&n("span",{className:"ps-tag",children:"Recommended"})]}),a("td",{style:{padding:"8px 6px",...G},children:[De(e.sizeBytes)," disk",e.memoryEstimate?a(F,{children:[n("br",{}),e.memoryEstimate," RAM"]}):null]}),n("td",{style:{padding:"8px 6px"},children:n("div",{style:{display:"flex",flexDirection:"column",gap:4},children:f})}),n("td",{style:{padding:"8px 6px",textAlign:"right",whiteSpace:"nowrap"},children:n("div",{style:{display:"inline-flex",gap:6},children:l})})]})}function Nn(e,t){let r=e==="local-whisper";return r&&t==="none"?{offline:!0,text:"Audio and text stay on this device."}:r?{offline:!1,text:"Audio stays on this device. Cleanup sends the transcript to your selected cleanup model."}:{offline:!1,text:"Audio leaves this device for transcription."}}function lt({rpc:e,sttProvider:t,llmProvider:r,onApplyPreset:i}){let{state:s,error:c,pending:d,run:p}=Tn(e),f=Nn(t,r),l=s?.runtime.status==="installed"&&s.activeModelId!==null;return a("section",{className:"ps-pane",style:{flex:"none"},"aria-labelledby":"ps-lw-title",children:[a("div",{className:"ps-pane-header",children:[n("h2",{id:"ps-lw-title",className:"ps-pane-title",style:{margin:0},children:"Local Whisper"}),n("span",{className:"ps-tag",children:s?s.platform.supported?l?"Ready":"Not set up":"Unavailable":"Loading\u2026"})]}),a("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[n("p",{style:{...G,margin:0},children:"Transcribe on this device. Audio is never sent anywhere when Local Whisper is the speech provider."}),(c||s?.lastError)&&n("div",{role:"alert",style:{...ye,borderColor:"var(--ps-danger)",color:"var(--ps-danger)",fontSize:12},children:c??s?.lastError?.message}),s&&!s.platform.supported&&a("div",{style:ye,children:[n(Oe,{tone:"err"}),a("div",{children:[n("strong",{children:"Not available on this computer"}),n("div",{style:G,children:s.platform.message})]})]}),s?.platform.supported&&n(_n,{state:s,pending:d,onRun:p}),s?.platform.supported&&a("div",{children:[a("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"baseline"},children:[n("span",{className:"ps-field-label",children:"Models \xB7 multilingual"}),n("span",{style:G,children:"Stored in this computer's app data"})]}),a("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:12},children:[n("thead",{children:n("tr",{children:["Model","Size","Status",""].map(g=>n("th",{style:{textAlign:"left",...G,fontWeight:600,padding:"4px 6px"},children:g},g))})}),n("tbody",{children:s.models.map(g=>n(Pn,{model:g,state:s,pending:d,onRun:p},g.id))})]})]}),a("div",{style:ye,children:[n(Oe,{tone:f.offline?"ok":"warn"}),a("div",{style:{flex:1},children:[n("strong",{children:f.offline?"Fully offline":"Not fully offline"}),n("div",{style:G,children:f.text})]}),!f.offline&&n("button",{type:"button",className:"ps-btn",onClick:()=>i({sttProvider:"local-whisper",llmProvider:"none"}),children:"Use offline preset"})]})]})]})}function _n({state:e,pending:t,onRun:r}){let i=In(e);return a("div",{style:ye,"aria-live":"polite",children:[n(Oe,{tone:i.tone}),a("div",{style:{flex:1,minWidth:0},children:[n("strong",{children:i.title}),n("div",{style:G,children:i.detail}),e.runtime.status==="installing"&&n("div",{style:{marginTop:6},children:n(pt,{value:e.runtime.progress??0,label:"Installing runtime"})})]}),i.action&&n("button",{type:"button",className:i.action.primary?"ps-btn ps-btn-primary":"ps-btn",disabled:t==="runtime",onClick:()=>r("runtime",i.action.method),children:i.action.label})]})}var Mn={"Voice & transcription":[{key:"sttProvider",label:"Speech-to-text provider",options:["system","google-gemini","openai","local-whisper"]},{key:"inputLanguage",label:"Input language",options:["auto","en","he","de","fr","es","ja"]},{key:"dictionary",label:"Personal dictionary",multiline:!0,help:"Names and terms, one per line."}],"Prompt Voice":[{key:"tone",label:"Cleanup tone",options:["conversational","formal","casual","technical","custom"]},{key:"customPrompt",label:"Custom cleanup instructions",multiline:!0}],Connections:[]},$e={sttProvider:"system",inputLanguage:"auto",tone:"conversational"},Ln={auto:"Detect automatically",system:"Zana voice",none:"Off",assistant:"Zana assistant",openai:"OpenAI",anthropic:"Anthropic",google:"Google AI","google-gemini":"Google Gemini","local-whisper":"Local Whisper (on this device)",en:"English",he:"Hebrew",de:"German",fr:"French",es:"Spanish",ja:"Japanese"};function ct({rpc:e,onBack:t}){let[r,i]=v({}),[s,c]=v("Loading\u2026"),[d,p]=v(null),f=T(0),l=T({});E(()=>{let m=!0;return e.call("promptVoice.settings.get").then(b=>{m&&(l.current=b||{},i(l.current),c("Saved"))}).catch(()=>{m&&c("Could not load settings")}),()=>{m=!1}},[]);let g=m=>{let b=++f.current;l.current={...l.current,...m};let h=l.current;i(h),c("Saving\u2026"),e.call("promptVoice.settings.update",h).then(()=>{b===f.current&&(p(null),c("Saved"))}).catch(()=>{b===f.current&&(p(h),c("Could not save settings."))})};return n("div",{className:"ps-workspace",children:n("main",{className:"ps-editor-canvas",style:{overflowY:"auto"},children:a("div",{style:{width:"100%",maxWidth:760,margin:"0 auto",display:"flex",flexDirection:"column",gap:12},children:[a("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12},children:[a("div",{children:[n("h1",{style:{fontSize:18,margin:"4px 0"},children:"Settings"}),n("span",{style:{color:"var(--ps-text-muted)",fontSize:12},children:"Configure voice and cleanup defaults"})]}),n("button",{className:"ps-btn",onClick:t,children:"\u2190 Back to Studio"})]}),a("div",{style:{color:"var(--ps-text-muted)",fontSize:11},children:[n("span",{role:"status",children:s}),d&&n("button",{className:"ps-btn",onClick:()=>g(d),children:"Retry"})]}),Object.entries(Mn).map(([m,b])=>a(Ye.Fragment,{children:[a("section",{className:"ps-pane",style:{flex:"none"},children:[a("div",{className:"ps-pane-header",children:[n("h2",{className:"ps-pane-title",style:{margin:0},children:m}),m!=="Connections"&&n("button",{className:"ps-btn",onClick:()=>g(Object.fromEntries(b.map(h=>[h.key,$e[h.key]??""]))),children:"Reset"})]}),a("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[m==="Connections"&&n("p",{children:"Manage API keys in Zana\u2019s Prompt Voice plugin settings."}),b.filter(h=>!(h.key==="customPrompt"&&r.tone!=="custom")).map(h=>a("label",{className:"ps-field-group",children:[n("span",{className:"ps-field-label",children:h.label}),h.options?n("select",{className:"ps-select",value:r[h.key]??$e[h.key]??"",onChange:R=>g({[h.key]:R.target.value}),children:h.options.map(R=>n("option",{value:R,children:Ln[R]??R},R))}):h.multiline?n("textarea",{className:"ps-custom-prompt-input",value:r[h.key]??"",onChange:R=>g({[h.key]:R.target.value})}):n("input",{type:h.secret?"password":"text",className:"ps-select",value:r[h.key]??"",onChange:R=>g({[h.key]:R.target.value}),placeholder:h.secret?"Enter API key\u2026":void 0}),h.help&&n("small",{style:{color:"var(--ps-text-muted)"},children:h.help})]},h.key))]})]}),m==="Voice & transcription"&&n(lt,{rpc:e,sttProvider:r.sttProvider??$e.sttProvider,llmProvider:r.llmProvider,onApplyPreset:g})]},m))]})})})}function dt(e){return e?e.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]+/gu)||[]:[]}var ut=1200;function mt(e,t){if(!e&&!t)return[];if(e===t)return[{type:"unchanged",text:e}];if(!e)return[{type:"added",text:t}];if(!t)return[{type:"removed",text:e}];let r=dt(e),i=dt(t),s=r.length,c=i.length;if(s>ut||c>ut)return[{type:"removed",text:e},{type:"added",text:t}];let d=c+1,p=new Uint32Array((s+1)*d);for(let b=1;b<=s;b++){let h=b*d,R=(b-1)*d,Z=r[b-1];for(let N=1;N<=c;N++)if(Z===i[N-1])p[h+N]=p[R+(N-1)]+1;else{let _=p[h+(N-1)],D=p[R+N];p[h+N]=_>D?_:D}}let f=[],l=s,g=c;for(;l>0||g>0;){let b=l*d,h=(l-1)*d;l>0&&g>0&&r[l-1]===i[g-1]?(f.push({type:"unchanged",text:r[l-1]}),l--,g--):g>0&&(l===0||p[b+(g-1)]>=p[h+g])?(f.push({type:"added",text:i[g-1]}),g--):l>0&&(g===0||p[b+(g-1)]<p[h+g])&&(f.push({type:"removed",text:r[l-1]}),l--)}f.reverse();let m=[];for(let b of f)m.length>0&&m[m.length-1].type===b.type?m[m.length-1].text+=b.text:m.push({...b});return m}var Dn=`
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
`;async function ft(e){if(!e)return!1;if(typeof navigator<"u"&&navigator.clipboard&&typeof navigator.clipboard.writeText=="function")try{return await navigator.clipboard.writeText(e),!0}catch{}if(typeof document<"u")try{let t=document.createElement("textarea");t.value=e,t.setAttribute("readonly",""),t.style.position="fixed",t.style.top="-9999px",t.style.left="-9999px",t.style.opacity="0",document.body.appendChild(t),t.focus(),t.select();let r=document.execCommand("copy");if(document.body.removeChild(t),r)return!0}catch{}return!1}var gt="zcc:prompt-voice:studio-draft:v1",bt=[{id:"polish",title:"Clean up writing",icon:"\u2728",desc:"Fix punctuation, grammar, and stuttering.",prompt:"Clean up disfluencies, typos, and improve sentence flow without altering intent.",tone:"technical"},{id:"executive",title:"Summarize",icon:"\u26A1",desc:"Condense into punchy bullet points.",prompt:"Summarize the core request into crisp, high-level executive bullet points.",tone:"formal"},{id:"spec",title:"Create a technical spec",icon:"\u{1F4D0}",desc:"Format with Goals, Context, Steps.",prompt:"Transform into a structured technical spec with ## Goal, ## Architecture, and ## Implementation Steps.",tone:"technical"},{id:"chat",title:"Make it conversational",icon:"\u{1F4AC}",desc:"Natural, conversational tone.",prompt:"Rephrase in a warm, polite, and helpful conversational tone.",tone:"conversational"}],On={system:"Host STT",openai:"OpenAI","google-gemini":"Google Gemini","local-whisper":"Local Whisper"};function ht(e){return e==="openai"||e==="google-gemini"}var $n=[{id:"google-gemini",label:"Google Gemini"},{id:"local-whisper",label:"Local Whisper (on this device)"},{id:"openai",label:"OpenAI (Whisper)"},{id:"system",label:"System (Zana Voice)"}],zn=[{id:"anthropic",displayName:"Anthropic",models:[{id:"claude-haiku-4-5-20251001",key:"anthropic-haiku",label:"Claude 4.5 Haiku",providerId:"anthropic"},{id:"claude-sonnet-5-20260201",key:"anthropic-sonnet",label:"Claude 5 Sonnet",providerId:"anthropic"}]},{id:"google",displayName:"Google Gemini",models:[{id:"gemini-2.5-flash",key:"google-flash",label:"Gemini 2.5 Flash",providerId:"google"}]},{id:"openai",displayName:"OpenAI",models:[{id:"gpt-5.4-nano",key:"openai-fast",label:"GPT-5.4 Nano (Fast)",providerId:"openai"},{id:"gpt-5.6-luna",key:"openai-smart",label:"GPT-5.6 Luna (Smart)",providerId:"openai"}]},{id:"assistant",displayName:"Zana Assistant",models:[{id:"assistant",key:"assistant",label:"Local / Active Thread Agent",providerId:"assistant"}]}];function Vn(){try{return Ke()}catch{return null}}function vt({startSession:e=ee}){let[t,r]=v(!1),i=be(),s=he(),c=Vn(),d=c?.providerId,p=c?.familyId,f=T(!1),[l,g]=v(""),[m,b]=v(""),[h,R]=v(!1),[Z,N]=v(!1),[_,D]=v(!1),[K,le]=v(null),[O,W]=v(null),[V,ce]=v("assistant"),[ne,de]=v("assistant"),[Fn,ue]=v(null),[oe,ze]=v(!0),[Ve,yt]=v(null),[re,we]=v(!1),[U,me]=v("polish"),[fe,Fe]=v(""),[Y,Ue]=v(!1),[Be,x]=v(null),[I,ge]=v("system"),[Se,Re]=v(""),[Ae,We]=v(!0),[ke,X]=v(null),[j,je]=v(!1),[wt,He]=v(0),[St,Ge]=v(null),q=T(null),ie=T(null),ae=T(null),qe=T(null);E(()=>{try{let o=localStorage.getItem(gt);if(o){let u=JSON.parse(o);u.inputText&&g(u.inputText),u.outputText&&b(u.outputText),u.selectedProviderId&&ce(u.selectedProviderId),u.selectedModelId&&(f.current=!0,de(u.selectedModelId)),u.sttProvider&&ge(u.sttProvider),u.sttModel&&Re(u.sttModel)}}catch{}},[]);let Ce=C(o=>{o&&(o.llmProvider&&(ue(o.llmProvider),ze(o.llmProvider!=="none")),o.sttProvider&&ge(o.sttProvider),typeof o.sttKeyConfigured=="boolean"&&We(o.sttKeyConfigured))},[]),Rt=C(()=>{i.call(se).then(o=>Ce(o)).catch(()=>{})},[i,Ce]);E(()=>{let o=!0;return i.call(se).then(u=>{o&&Ce(u)}).catch(()=>{}),()=>{o=!1}},[i]),E(()=>{let o=!0;return i.call("promptVoice.settings.get").then(u=>{if(!o)return;let w=u||{};w.sttProvider&&ge(w.sttProvider),w.sttModel&&Re(w.sttModel)}).catch(()=>{}),()=>{o=!1}},[i]),E(()=>{let o=!0;return i.call(Qe).then(u=>{if(!o)return;let w=u;Array.isArray(w)&&w.length>0&&W(w)}).catch(()=>{}),()=>{o=!1}},[i]);let B=H(()=>{let o=(S,k)=>[...S].sort((M,A)=>k(M).localeCompare(k(A),void 0,{sensitivity:"base",numeric:!0}));if(!O||O.length===0){let S=zn.map(k=>{let M=!!(d&&k.id.toLowerCase()===d.toLowerCase()||p&&k.id.toLowerCase().includes(p.toLowerCase())),A=o(k.models,Q=>Q.label||Q.id).map(Q=>({...Q,isComposerMatch:M}));return{...k,isComposerMatch:M,models:A}});return o(S,k=>k.displayName||k.id)}let u={"assistant:assistant":"assistant","openai:gpt-5.4-nano":"openai-fast","openai:gpt-5.6-luna":"openai-smart","anthropic:claude-haiku-4-5-20251001":"anthropic-haiku","anthropic:claude-sonnet-5-20260201":"anthropic-sonnet","google:gemini-2.5-flash":"google-flash"},w=O.map(S=>{let k=!!(d&&S.providerId.toLowerCase()===d.toLowerCase()||p&&S.providerId.toLowerCase().includes(p.toLowerCase())),M=o(S.models,A=>A.label||A.id).map(A=>{let Q=`${S.providerId}:${A.id}`,Ft=u[Q]??A.id;return{id:A.id,key:Ft,label:A.label||A.id,providerId:S.providerId,isComposerMatch:k}});return{id:S.providerId,displayName:S.displayName||S.providerId,isComposerMatch:k,models:M}});return o(w,S=>S.displayName||S.id)},[O,d,p]),P=H(()=>B.find(o=>o.id===V)??B[0],[B,V]),J=H(()=>P?.models??[],[P]),$=H(()=>J.find(u=>u.id===ne||u.key===ne)??J[0],[J,ne]);E(()=>{if(!f.current&&B.length>0){let o=B.find(u=>u.isComposerMatch);o&&(ce(o.id),o.models.length>0&&de(o.models[0].key||o.models[0].id))}},[B]),E(()=>{try{localStorage.setItem(gt,JSON.stringify({inputText:l,outputText:m,selectedProviderId:V,selectedModelId:ne,sttProvider:I,sttModel:Se}))}catch{}},[l,m,V,ne,I,Se]);let At=o=>{ze(o);let u=o?P?.id??"assistant":"none",w=o?$?.id??"assistant":"";ue(u),i.call("promptVoice.settings.update",{llmProvider:u,llmModel:w}).catch(()=>{x("Could not update cleanup setting.")})},Ee=o=>{ge(o),X(null),i.call("promptVoice.settings.update",{sttProvider:o}).then(()=>Rt()).catch(()=>{x("Could not update speech provider setting.")})},kt=o=>{Re(o),i.call("promptVoice.settings.update",{sttModel:o}).catch(()=>{})},Ct=o=>{f.current=!0,ce(o);let u=B.find(S=>S.id===o),w="";if(u&&u.models.length>0){let S=u.models[0].key||u.models[0].id;w=u.models[0].id,de(S)}oe&&(ue(o),i.call("promptVoice.settings.update",{llmProvider:o,llmModel:w}).catch(()=>{}))},Et=o=>{f.current=!0;let u=V,w=o;for(let S of B){let k=S.models.find(M=>M.id===o||M.key===o);if(k){S.id!==V&&(ce(S.id),u=S.id),de(k.key||k.id),w=k.id;break}}oe&&(ue(u),i.call("promptVoice.settings.update",{llmProvider:u,llmModel:w}).catch(()=>{}))};E(()=>()=>{ie.current&&clearInterval(ie.current),ae.current&&clearInterval(ae.current),q.current&&q.current.cancel()},[]);let Tt=H(()=>{let o=l.trim();return`${o?o.split(/\s+/).length:0} words \xB7 ${l.length} chars`},[l]),It=H(()=>{let o=m.trim();return`${o?o.split(/\s+/).length:0} words \xB7 ${m.length} chars`},[m]),Pt=H(()=>!m||!re?[]:mt(l,m),[l,m,re]),Nt=async()=>{if(j){je(!1),Ge(null),ie.current&&clearInterval(ie.current),ae.current&&clearInterval(ae.current);let o=q.current;if(q.current=null,!o)return;D(!0);try{let u=await xe(i,await o.stop()),w=await i.call(ve,{audio:u.base64,mimeType:u.mimeType,transcriptionOnly:!0});w.ok&&w.status==="ok"?(g(S=>te(S,w.text)),X(null)):w.ok&&w.status==="no-speech"?(x("No speech detected. Try speaking closer to the microphone."),setTimeout(()=>x(null),4e3)):w.ok||(x(w.message),X(w.message),w.code==="MISSING_KEY"&&We(!1))}catch(u){x(u instanceof Error?u.message:"Transcription failed.")}finally{D(!1)}}else{if(X(null),x(null),I!=="system"&&!Ae){let o=I==="openai"?"OpenAI":"Google Gemini";X(`API key required for direct ${o} speech-to-text. Switch to System (Zana Voice) below to dictate using host voice.`),x(`API key required for ${o}. Switch to System (Zana Voice) to dictate thoughts.`);return}try{let o=await e();q.current=o,je(!0),He(0),ie.current=setInterval(()=>{He(u=>u+1)},1e3),ae.current=setInterval(()=>{if(q.current){let u=q.current.getAudioLevel?.()??null;Ge(u)}},100)}catch(o){x(o instanceof Error?o.message:"Microphone access denied.")}}},_t=async()=>{let o=l.trim();if(!o||Y||U==="custom"&&!fe.trim())return;let u=bt.find(A=>A.id===U),w=U==="custom"?fe.trim():u?.prompt||"Polish and format for clarity.",S=u?.tone||"technical",k=P?.id??"assistant",M=$?.id??"assistant";x(null),Ue(!0);try{let A=await i.call(Je,{text:o,tone:S,customPrompt:w,llmProvider:k,llmModel:M});A.ok?(b(A.text),yt(`${P?.displayName||k}: ${A.llmModel||M}`)):x(A.message)}catch(A){x(A instanceof Error?A.message:"Refinement request failed.")}finally{Ue(!1)}},Mt=async()=>{try{let o=await navigator.clipboard.readText();if(!o||!o.trim()){x("Clipboard is empty."),setTimeout(()=>x(null),2500);return}g(u=>te(u,o)),x("Pasted from clipboard into input draft!"),setTimeout(()=>x(null),2500)}catch{x("Clipboard access denied or unavailable."),setTimeout(()=>x(null),2500)}},Lt=async()=>{if(!l)return;await ft(l)?(N(!0),setTimeout(()=>N(!1),2e3),x("Input draft copied to clipboard!"),setTimeout(()=>x(null),2500)):(x("Failed to copy to clipboard."),setTimeout(()=>x(null),3e3))},Dt=async()=>{if(!m)return;await ft(m)?(R(!0),setTimeout(()=>R(!1),2e3),x("Refined output copied to clipboard!"),setTimeout(()=>x(null),2500)):(x("Failed to copy to clipboard."),setTimeout(()=>x(null),3e3))},Ot=()=>{!l&&!m||(g(""),b(""),me("polish"),Fe(""),we(!1),x("Studio canvas cleared."),setTimeout(()=>x(null),2500))},$t=()=>{m&&(g(m),b(""),we(!1),x("Refined output moved to input draft."),setTimeout(()=>x(null),2500))},zt=()=>{let o=m||l;if(o)try{s.updateText(u=>te(u,o)),s.focus(),le("Inserted into Composer!"),setTimeout(()=>le(null),2500)}catch{x("Composer focus unavailable.")}},Vt=C(o=>{(o.ctrlKey||o.metaKey)&&o.key.toLowerCase()==="k"&&(o.preventDefault(),me("custom"),setTimeout(()=>qe.current?.focus(),0))},[]);return a("div",{className:"ps-container",onKeyDown:Vt,children:[n("style",{children:Dn}),a("header",{className:"ps-header",children:[a("div",{className:"ps-header-left",children:[n("span",{style:{fontSize:18},children:"\u{1F399}\uFE0F"}),n("span",{className:"ps-header-title",children:"Prompt Studio"}),n("span",{className:"ps-badge",children:"Voice & AI Refinement"}),K&&n("span",{className:"ps-badge",style:{background:"rgba(34, 197, 94, 0.2)",color:"#86efac"},children:K})]}),a("div",{className:"ps-header-actions",children:[a("button",{type:"button",className:"ps-btn",onClick:Ot,title:"Clear current input and output",disabled:!l&&!m,children:[n("span",{children:"\u{1F5D1}\uFE0F"}),n("span",{children:"Clear"})]}),a("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:zt,disabled:!l&&!m,title:"Append current text directly into Zana Composer",children:[n("span",{children:"\u{1F4AC}"}),n("span",{children:"Insert into Composer"})]})]})]}),t?n(ct,{rpc:i,onBack:()=>r(!1)}):a("div",{className:"ps-workspace",children:[a("aside",{className:"ps-sidebar",children:[a("section",{className:"ps-section",children:[a("div",{className:"ps-section-title",children:[n("span",{children:"Refinement Engine"}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:P?.isComposerMatch?"\u2605 Composer Active":"AI Model"})]}),a("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-provider-select",className:"ps-field-label",children:"Provider"}),n("select",{id:"ps-provider-select",className:"ps-select","aria-label":"Refinement provider",value:P?.id??"",onChange:o=>Ct(o.target.value),disabled:Y,children:B.map(o=>a("option",{value:o.id,children:[o.displayName,o.isComposerMatch?" \u2605 (Composer)":""]},o.id))})]}),a("div",{className:"ps-field-group",children:[a("label",{htmlFor:"ps-model-select",className:"ps-field-label",children:["Model (",J.length,")"]}),n("select",{id:"ps-model-select",className:"ps-select","aria-label":"Refinement model",value:$?.key||$?.id||"",onChange:o=>Et(o.target.value),disabled:Y||J.length===0,children:J.map(o=>a("option",{value:o.key||o.id,children:[o.label,o.isComposerMatch?" \u2605 (Composer)":""]},o.key||o.id))})]}),a("div",{style:{marginTop:8,paddingTop:8,borderTop:"1px solid var(--ps-border)",display:"flex",flexDirection:"column",gap:4},children:[a("label",{style:{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:11,fontWeight:500,userSelect:"none"},children:[n("input",{type:"checkbox","aria-label":"Auto-cleanup mic dictations",checked:oe,onChange:o=>At(o.target.checked)}),n("span",{children:"Auto-cleanup mic dictations"})]}),n("span",{style:{fontSize:10,color:"var(--ps-text-subtle)",lineHeight:1.3},children:oe?`Composer mic cleans up using ${P?.displayName} (${$?.label||$?.id}).`:"Composer mic inserts raw transcript without AI cleanup."})]}),a("div",{style:{marginTop:4,fontSize:11,color:"var(--ps-text-muted)",lineHeight:1.35},children:[P?.isComposerMatch?a("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:600},children:["\u2605 Synced to Composer: ",P.displayName," (",$?.label,")"]}):P?.id==="assistant"?"Uses the active Zana assistant agent with no extra API key required.":a(F,{children:["Using ",n("strong",{children:P?.displayName})," \xB7 ",n("code",{children:$?.id})]}),Ve?a("div",{style:{marginTop:3,color:"var(--ps-text-subtle)",fontSize:10},children:["Last refined: ",Ve]}):null]})]}),a("section",{className:"ps-section",children:[a("div",{className:"ps-section-title",children:[n("span",{children:"Voice Dictation"}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:On[I]??I})]}),a("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-stt-provider-select",className:"ps-field-label",children:"Speech Provider"}),n("select",{id:"ps-stt-provider-select",className:"ps-select","aria-label":"Speech-to-text provider",value:I,onChange:o=>{X(null),Ee(o.target.value)},disabled:j||_,children:$n.map(o=>n("option",{value:o.id,children:o.label},o.id))})]}),ht(I)&&a("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-stt-model-input",className:"ps-field-label",children:"Speech Model (Optional)"}),n("input",{id:"ps-stt-model-input",className:"ps-select","aria-label":"Speech-to-text model",placeholder:"Provider default",value:Se,onChange:o=>kt(o.target.value),disabled:j||_})]}),ke&&a("div",{role:"alert",style:{padding:"8px 10px",borderRadius:6,background:"rgba(239, 68, 68, 0.12)",border:"1px solid rgba(239, 68, 68, 0.35)",color:"#fca5a5",fontSize:11,textAlign:"left",lineHeight:1.4,display:"flex",flexDirection:"column",gap:6},children:[a("div",{children:["\u26A0\uFE0F ",ke]}),ht(I)&&n("button",{type:"button",className:"ps-btn ps-btn-primary",style:{alignSelf:"flex-start",fontSize:11,padding:"4px 8px"},onClick:()=>Ee("system"),children:"Switch to System (Zana Voice)"})]}),I!=="system"&&!Ae&&!ke&&a("div",{style:{padding:"8px 10px",borderRadius:6,background:"rgba(234, 179, 8, 0.1)",border:"1px solid rgba(234, 179, 8, 0.3)",color:"#fde047",fontSize:11,textAlign:"left",lineHeight:1.4,display:"flex",flexDirection:"column",gap:6},children:[a("div",{children:["\u2139\uFE0F ",n("strong",{children:"API key required:"})," Direct ",I==="openai"?"OpenAI Whisper":"Google Gemini"," speech-to-text requires an API key in Zana Settings."]}),n("button",{type:"button",className:"ps-btn ps-btn-primary",style:{alignSelf:"flex-start",fontSize:11,padding:"4px 8px"},onClick:()=>Ee("system"),children:"Switch to System (Zana Voice)"})]}),a("div",{className:"ps-dictation-card",children:[a("button",{type:"button",className:`ps-btn ${j?"ps-btn-danger":_?"":"ps-btn-primary"}`,style:{width:"100%",justifyContent:"center",padding:"10px 0",opacity:_?.8:1},onClick:Nt,disabled:_,"aria-label":_?"Transcribing audio":j?"Stop dictation":"Start dictation",children:[n("span",{className:_?"ps-spin":void 0,children:_?"\u23F3":j?"\u23F9\uFE0F":"\u{1F399}\uFE0F"}),n("span",{children:_?"Transcribing...":j?`Stop Dictation (${wt}s)`:"Dictate Thoughts"})]}),j&&a("div",{style:{width:"100%",display:"flex",flexDirection:"column",gap:4},children:[n("div",{className:"ps-meter-bar",children:n("div",{className:"ps-meter-fill",style:{width:`${Math.min(100,(St??.1)*100)}%`}})}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:"Listening live..."})]})]}),n("div",{style:{fontSize:10,color:"var(--ps-text-subtle)",lineHeight:1.3},children:I==="system"?"Uses host Zana voice transcription without requiring external API keys.":I==="local-whisper"?"Transcribes on this device. Install the runtime and a model in Settings.":Ae?`Using direct ${I==="openai"?"OpenAI Whisper":"Google Gemini"} speech-to-text.`:`\u26A0\uFE0F ${I==="openai"?"OpenAI":"Google Gemini"} requires an API key in Zana Settings. Choose System (Zana Voice) for built-in free dictation.`})]}),a("section",{className:"ps-section",children:[n("div",{className:"ps-section-title",children:"How should we improve it?"}),a("div",{className:"ps-presets-list",role:"radiogroup","aria-label":"How should we improve it?",children:[bt.map(o=>a("label",{className:`ps-preset-btn ${U===o.id?"active":""}`,children:[a("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:o.id,checked:U===o.id,onChange:()=>me(o.id)}),o.title]}),n("span",{className:"preset-desc",children:o.desc})]},o.id)),a("label",{className:`ps-preset-btn ${U==="custom"?"active":""}`,children:[a("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:"custom",checked:U==="custom",onChange:()=>me("custom")}),"Custom instructions"]}),n("span",{className:"preset-desc",children:"Describe your own transformation."})]})]}),U==="custom"&&n("textarea",{ref:qe,className:"ps-custom-prompt-input","aria-label":"Custom instructions",placeholder:"e.g. Turn into user stories with acceptance criteria...",value:fe,onChange:o=>Fe(o.target.value)})]}),n("button",{type:"button",className:"ps-btn",style:{marginTop:"auto"},onClick:()=>r(!0),children:"Settings"})]}),a("main",{className:"ps-editor-canvas",children:[a("section",{className:"ps-pane",children:[a("div",{className:"ps-pane-header",children:[a("div",{className:"ps-pane-title",children:[n("span",{children:"\u{1F4DD}"}),n("span",{children:"Raw Input Draft"})]}),a("div",{style:{display:"flex",gap:6},children:[n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Mt,title:"Paste from clipboard into input draft","aria-label":"Paste into input draft",children:"\u{1F4CB} Paste"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Lt,disabled:!l,title:"Copy raw input","aria-label":"Copy raw input",children:Z?"\u2705 Copied":"\u{1F4CB} Copy"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>g(""),disabled:!l,title:"Clear input",children:"Clear"})]})]}),n("textarea",{className:"ps-textarea",placeholder:"Type your raw thoughts or click Dictate in the left sidebar to speak...",value:l,onChange:o=>g(o.target.value),"aria-label":"Raw Input Text"})]}),a("div",{className:"ps-action-bar",children:[a("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12},children:[n("span",{className:"ps-pill",children:"\u2B07 Refine pipeline"}),n("span",{style:{color:"var(--ps-text-muted)"},children:l.trim()?`${l.trim().split(/\s+/).length} words ready`:"Add text to get started"})]}),n("div",{style:{display:"flex",alignItems:"center",gap:6},children:a("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:()=>_t(),disabled:Y||!l.trim()||U==="custom"&&!fe.trim(),title:"Transform raw draft into polished output",children:[n("span",{children:Y?"\u23F3":"\u26A1"}),n("span",{children:Y?"Refining...":"Refine text"})]})})]}),a("section",{className:"ps-pane",children:[a("div",{className:"ps-pane-header",children:[a("div",{className:"ps-pane-title",children:[n("span",{children:"\u2728"}),n("span",{children:"Result"})]}),a("div",{style:{display:"flex",gap:6},children:[m&&a("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>we(o=>!o),title:"Toggle inline diff against input draft",children:[n("span",{children:re?"\u{1F441}\uFE0F":"\u{1F50D}"}),n("span",{children:re?"View Clean":"View Diff"})]}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:$t,disabled:!m,title:"Move output to input draft for iterative re-refinement",children:"\u2B06 Replace Input"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Dt,disabled:!m,title:"Copy refined text to clipboard","aria-label":"Copy refined output",children:h?"\u2705 Copied":"\u{1F4CB} Copy"})]})]}),re&&m?n("div",{className:"ps-output-view",children:Pt.map((o,u)=>o.type==="added"?n("span",{className:"ps-diff-added",children:o.text},u):o.type==="removed"?n("span",{className:"ps-diff-removed",children:o.text},u):n("span",{className:"ps-diff-unchanged",children:o.text},u))}):n("textarea",{className:"ps-textarea",placeholder:"Polished, structured output will appear here after clicking Refine...",value:m,onChange:o=>b(o.target.value),"aria-label":"Refined output"})]})]})]}),a("footer",{className:"ps-status-bar",children:[a("div",{style:{display:"flex",gap:12},children:[a("span",{children:["Input: ",Tt]}),a("span",{children:["Output: ",It]}),Be&&n("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:500},children:Be})]}),a("div",{style:{display:"flex",gap:12,alignItems:"center"},children:[a("span",{children:["Engine: ",P?.displayName," \xB7 ",$?.label]}),a("span",{className:"ps-pill",children:["Mic cleanup: ",oe?`${P?.displayName} (${$?.label||$?.id})`:"Off (Raw)"]}),P?.isComposerMatch&&n("span",{className:"ps-pill",style:{color:"var(--accent, #3b82f6)"},children:"\u2605 Composer Synced"}),n("span",{children:"Zana Prompt Studio"})]})]})]})}var xt="prompt-studio",ar=Ze(e=>{Le(),e.composer.customize({id:"prompt-voice-mic",actions:[{id:"prompt-voice-mic",component:st}]}),e.slots.navPanel?.({id:"prompt-studio",title:"Prompt Studio",icon:"Sparkles",path:xt,component:vt}),e.slots.commandPaletteAction?.({id:"open-prompt-studio",title:"Prompt Studio: Open Canvas",run:t=>{t.navigate?.(`/${xt}`)}})});export{xt as PROMPT_STUDIO_PANEL_PATH,ar as default};
//# sourceMappingURL=app.js.map
