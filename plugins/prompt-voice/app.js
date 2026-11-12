function Ce(){return globalThis.__ZCC_PLUGIN_RUNTIME__??{}}function Ee(e){throw new Error(`${e} is not available until the host plugin runtime is installed`)}function Be(e){return{__zccPluginApp:!0,setup:e}}function fe(){return Ce().useRpc?.()??Ee("useRpc")}function ge(){return Ce().useComposer?.()??Ee("useComposer")}function je(){return Ce().useComposerView?.()??Ee("useComposerView")}var _t=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4"];var M=class extends Error{code;constructor(n,i){super(i),this.name="RecordingError",this.code=n}};function Dt(e){return _t.find(n=>e(n))??null}var Mt="audio/webm";function Lt(){return{getUserMedia:e=>navigator.mediaDevices.getUserMedia(e),createRecorder:(e,n)=>new MediaRecorder(e,n?{mimeType:n}:void 0),isTypeSupported:e=>typeof MediaRecorder<"u"&&MediaRecorder.isTypeSupported(e)}}async function Ot(e){try{return await e.getUserMedia({audio:!0})}catch(n){let i=n instanceof Error?n.name:"";throw i==="NotAllowedError"||i==="SecurityError"?new M("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again."):new M("MIC_UNAVAILABLE","No microphone is available. Connect one and try again.")}}function ke(e){return new Promise((n,i)=>{let r=new FileReader;r.onload=()=>{let s=typeof r.result=="string"?r.result:"";n(s.slice(s.indexOf(",")+1))},r.onerror=()=>i(new M("RECORDING_FAILED","The recording could not be read.")),r.readAsDataURL(e)})}async function zt(e,n){let i=new Blob(e,{type:n});return{base64:await ke(i),mimeType:i.type||n}}function $t(e,n){if(!(e>0&&Number.isFinite(e)))return()=>{};let i=setTimeout(n,e);return()=>clearTimeout(i)}var Ft="That recording is too large to transcribe. Keep dictation shorter and try again.";function Ut(e,n){let i=Math.max(n,e),r=[],s=0,c=!1;return{chunks:r,get overflowed(){return c},add(u){return u.size===0||c?"ignored":s+u.size>i?(c=!0,"overflow"):(r.push(u),s+=u.size,s>=e?"limit-reached":"accepted")}}}function Vt(e,n){let i=new Promise((r,s)=>{e.onstop=()=>r(),e.onerror=()=>{let c=new M("RECORDING_FAILED","Recording stopped unexpectedly. Try again.");n(c),s(c)}});return i.catch(()=>{}),i}function Bt(e,n,i,r){let s=Vt(e,r);return e.ondataavailable=c=>{let u=n.add(c.data);(u==="limit-reached"||u==="overflow")&&i()},e.start(1e3),s}async function jt(e,n,i,r){try{await e}finally{n()}if(i.overflowed)throw new M("RECORDING_FAILED",Ft);return zt(i.chunks,r)}function Ht(e){let n=()=>{};return{stopRecorder(){n(),e.state!=="inactive"&&e.stop()},armTimer(i,r){n=$t(i,r)}}}function Gt(e,n){let i=null;return{attach(r){i=r},detach(){i=null},autoStop(){e();let r=i?.onAutoStop;i&&(i.onAutoStop=void 0),r?.()},fail(r){e(),n();let s=i?.onError;i=null,s?.(r)}}}function qt(e,n,i,r){let s=Ut(r.maxBytes??9437184,r.hardMaxBytes??10485760),{stopRecorder:c,armTimer:u}=Ht(e),p=Gt(c,n);u(r.maxDurationMs??12e4,p.autoStop);let b=Bt(e,s,p.autoStop,p.fail),d={onError:r.onError,onAutoStop:r.onAutoStop,async stop(){c();try{return await jt(b,n,s,e.mimeType||i)}finally{p.detach()}},cancel(){c(),n(),p.detach()}};return p.attach(d),d}var X=()=>Zt();async function Zt(e=Lt(),n={}){let i=await Ot(e),r=Wt(i),s=i.getTracks(),c,u=()=>{for(let p of s)c&&p.removeEventListener?.("ended",c);r?.close(),s.forEach(p=>p.stop())};try{let p=Dt(e.isTypeSupported)??Mt,b=e.createRecorder(i,p),d=qt(b,u,p,n);return d.getAudioLevel=()=>r?.level()??null,c=()=>{let g=d.onError;d.cancel(),g?.(new M("MIC_UNAVAILABLE","Microphone disconnected. Check your device and try again."))},s.forEach(g=>g.addEventListener?.("ended",c)),d}catch(p){throw u(),p instanceof M?p:new M("RECORDING_FAILED",p instanceof Error?p.message:"The recording could not be started.")}}function Wt(e){let n;try{n=new AudioContext;let i=n.createMediaStreamSource(e),r=n.createAnalyser();r.fftSize=256,i.connect(r);let s=new Uint8Array(r.fftSize),c=n,u=!1;return{level(){if(c.state&&c.state!=="running")return null;r.getByteTimeDomainData(s);let p=s.reduce((b,d)=>b+((d-128)/128)**2,0)/s.length;return Math.min(1,Math.sqrt(p)*5)},close(){u||(u=!0,i.disconnect(),c.close().catch(p=>console.error("Prompt Voice audio meter cleanup failed",p)))}}}catch(i){return n&&n.close().catch(r=>console.error("Prompt Voice audio meter cleanup failed",r)),console.warn("Prompt Voice audio meter unavailable",i),null}}var w=globalThis.__ZCC_HOST_REACT__;var Rn=w.Children,Cn=w.Component,En=w.Fragment,kn=w.StrictMode,Tn=w.Suspense,In=w.cloneElement,Pn=w.createContext,Nn=w.createElement,_n=w.createRef,Dn=w.forwardRef,Mn=w.isValidElement,Ln=w.lazy,On=w.memo,zn=w.startTransition,P=w.useCallback,$n=w.useContext,Fn=w.useDebugValue,Un=w.useDeferredValue,N=w.useEffect,Vn=w.useId,Bn=w.useImperativeHandle,jn=w.useInsertionEffect,Hn=w.useLayoutEffect,j=w.useMemo,He=w.useReducer,_=w.useRef,v=w.useState,Gn=w.useSyncExternalStore,qn=w.useTransition,Zn=w.version;var be="promptVoice.transcribe",ie="promptVoice.status",Ge="promptVoice.rephrase",qe="promptVoice.availableModels";function J(e,n){let i=n.trim();return i?e?/\s$/.test(e)?`${e}${i}`:`${e} ${i}`:i:e}var Yt="No speech detected.",Te={phase:"idle",notice:null,error:null};function Ze(e,n){switch(n.type){case"START":return e.phase==="idle"||e.phase==="error"?{phase:"starting",notice:null,error:null}:e;case"STARTED":return e.phase==="starting"?{...e,phase:"recording"}:e;case"STOP":return e.phase==="recording"||e.phase==="starting"?{phase:"processing",notice:null,error:null}:e;case"CANCEL":return e.phase==="recording"||e.phase==="starting"?{...Te}:e;case"SUCCESS":case"NO_SPEECH":return e.phase!=="processing"?e:{phase:"idle",notice:n.type==="NO_SPEECH"?Yt:n.notice,error:null};case"CLEAR_NOTICE":return e.notice?{...e,notice:null}:e;case"FAILURE":return{phase:"error",notice:null,error:n.message}}}var Ie=16e3,We=44,ae=2,Kt="This recording couldn't be prepared for Local Whisper. Try again.",Xt=async(e,n)=>{let r=await new OfflineAudioContext(1,1,n).decodeAudioData(e),s=Array.from({length:r.numberOfChannels},(c,u)=>r.getChannelData(u));return{sampleRate:r.sampleRate,channels:s}};function Jt(e){if(e.length===0)return new Float32Array(0);if(e.length===1)return e[0];let n=Math.min(...e.map(r=>r.length)),i=new Float32Array(n);for(let r=0;r<n;r+=1){let s=0;for(let c of e)s+=c[r];i[r]=s/e.length}return i}function Qt(e,n){let i=e.length*ae,r=new Uint8Array(We+i),s=new DataView(r.buffer),c=(u,p)=>{for(let b=0;b<p.length;b+=1)s.setUint8(u+b,p.charCodeAt(b))};c(0,"RIFF"),s.setUint32(4,36+i,!0),c(8,"WAVE"),c(12,"fmt "),s.setUint32(16,16,!0),s.setUint16(20,1,!0),s.setUint16(22,1,!0),s.setUint32(24,n,!0),s.setUint32(28,n*ae,!0),s.setUint16(32,ae,!0),s.setUint16(34,8*ae,!0),c(36,"data"),s.setUint32(40,i,!0);for(let u=0;u<e.length;u+=1){let p=Math.max(-1,Math.min(1,e[u]));s.setInt16(We+u*ae,p<0?p*32768:p*32767,!0)}return r}function en(e){let n=atob(e),i=new Uint8Array(n.length);for(let r=0;r<n.length;r+=1)i[r]=n.charCodeAt(r);return i.buffer}async function tn(e,n=Xt){let i;try{let r=await n(en(e.base64),Ie);if(r.sampleRate!==Ie)throw new Error("decoder ignored the requested sample rate");i=Qt(Jt(r.channels),Ie)}catch{throw new M("RECORDING_FAILED",Kt)}return{base64:await ke(new Blob([i],{type:"audio/wav"})),mimeType:"audio/wav"}}async function he(e,n,i=tn){return(await e.call(ie).catch(()=>null))?.audioFormat==="wav"?i(n):n}var nn="Prompt Voice returned an unexpected response. Try again.",on="Dictation failed. Try again.",rn=4e3;function an(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}async function sn(e,n){let i=await he(e,n),r=await e.call(be,{audio:i.base64,mimeType:i.mimeType});if(!an(r))throw new Error(nn);return r}function Ye(e){return e instanceof Error&&e.message?e.message:on}function pn(e,n,i){if(!e.ok){i({type:"FAILURE",message:e.message});return}if(e.status==="no-speech"){i({type:"NO_SPEECH"});return}n.updateText(s=>J(s,e.text)),n.focus();let r=e.refineNotice?`Inserted the raw transcript. ${e.refineNotice.message}`:"Added to draft.";i({type:"SUCCESS",notice:r})}function cn(e,n,i,r){return n()?(e.onError=s=>{n()&&r(s)},e.onAutoStop=()=>{n()&&i()},e):(e.cancel(),null)}function ln(e,n,i,r,s){let c=u=>s({type:"FAILURE",message:Ye(u)});return e.then(u=>{let p=cn(u,i,r,b=>{n.current=null,c(b)});return p&&(n.current=p),p},u=>(i()&&c(u),null))}function dn(e,n){let i=_(null),r=_(null),s=_(0),c=_(!0),u=P(()=>{s.current++,r.current=null,i.current&&(i.current.cancel(),i.current=null),n({type:"CANCEL"})},[n]);N(()=>(c.current=!0,()=>{c.current=!1,u()}),[u]);let p=P(async()=>{let m=r.current?await r.current:i.current;return i.current=null,m},[]),b=P(async m=>{let h=++s.current,f=()=>c.current&&s.current===h,A=ln(e(),i,f,m,n);r.current=A,await A&&f()&&n({type:"STARTED"}),r.current===A&&(r.current=null)},[n,e]),d=P(()=>c.current,[]),g=P(()=>i.current?.getAudioLevel?.()??null,[]);return{start:b,takeSession:p,cancel:u,isMounted:d,getAudioLevel:g}}function Ke({startSession:e=X,noticeDurationMs:n=rn}={}){let i=ge(),r=fe(),[s,c]=He(Ze,Te),{start:u,takeSession:p,cancel:b,isMounted:d,getAudioLevel:g}=dn(e,c),[m,h]=v(null),[f,A]=v(0),[G,k]=v(!1);N(()=>{if(s.phase!=="recording"){h(null),A(0);return}let O=Date.now(),V=()=>{h(g()),A(Math.floor((Date.now()-O)/1e3))};V();let $=setInterval(V,100);return()=>clearInterval($)},[g,s.phase]),N(()=>{if(!s.notice)return;let O=setTimeout(()=>{c({type:"CLEAR_NOTICE"})},n);return()=>clearTimeout(O)},[n,s.notice]);let T=P(()=>{c({type:"CLEAR_NOTICE"})},[]),L=P(async()=>{c({type:"STOP"});let O=await p();if(!(!d()||!O))try{let V=await O.stop();if(!d())return;let $=await sn(r,V);if(!d())return;pn($,i,c)}catch(V){if(!d())return;c({type:"FAILURE",message:Ye(V)})}},[i,d,r,p]),q=P(async()=>{k(!1),c({type:"START"}),await u(()=>{k(!0),L()})},[L,u]),se=P(()=>{s.phase==="recording"||s.phase==="starting"?L():s.phase!=="processing"&&q()},[q,L,s.phase]);return{phase:s.phase,error:s.error,notice:s.notice,level:m,seconds:f,autoStopped:G,onClick:se,cancel:b,clearNotice:T,beginDictation:q,finishDictation:L}}var Pe=`/* Base Container */\r
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
`;var Xe=globalThis.__ZCC_HOST_REACT__,Q=Xe.Fragment;function o(e,n,i){return Xe.createElement(e,i===void 0?n:{...n,key:i})}var a=o;var mn="Dictation",Je="zcc-ext-prompt-voice-styles";function Ne(){if(typeof document>"u")return;let e=document.getElementById(Je);e||(e=document.createElement("style"),e.id=Je,document.head.appendChild(e)),e.textContent!==Pe&&(e.textContent=Pe)}var fn={idle:"Start dictation",starting:"Stop dictation",recording:"Stop dictation",processing:"Transcribing",error:"Start dictation"},Qe={position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",border:0};function et({startSession:e=X}){Ne();let{phase:n,error:i,notice:r,onClick:s,cancel:c,clearNotice:u,level:p,seconds:b,autoStopped:d}=Ke({startSession:e}),g=n==="starting"||n==="recording"||n==="processing",m=n==="idle"&&!!r,h=`${Math.floor(b/60)}:${String(b%60).padStart(2,"0")}`;return a("div",{className:`pv-mic pv-dictation-pill pv-phase-${n} ${m?"pv-has-notice":""}`,onClick:m?u:void 0,title:m?"Click to dismiss":void 0,children:[o("button",{type:"button",className:`pv-mic-button pv-mic-${n} ${g?"pv-pill-btn-stop":"pv-idle-icon"}`,"aria-label":mn,"aria-pressed":n==="recording"||n==="starting",title:fn[n],disabled:n==="processing",onClick:s,style:m?{display:"none"}:void 0,children:n==="idle"||n==="error"?o("svg",{viewBox:"0 0 24 24",width:"16",height:"16","aria-hidden":"true",focusable:"false",children:o("path",{d:"M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5Zm6 9h2v-3h-2v3Z",fill:"currentColor"})}):n==="processing"?o("span",{className:"pv-mic-spinner","aria-hidden":"true"}):o("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:o("rect",{x:"6",y:"6",width:"12",height:"12",rx:"2.5",fill:"currentColor"})})}),m?a("span",{role:"status",className:"pv-notice-content",children:[o("span",{className:"pv-notice-check",children:"\u2713"}),o("span",{className:"pv-pill-status",children:r})]}):null,n==="starting"?a(Q,{children:[a("div",{className:"pv-pill-timer-badge",children:[o("div",{className:"pv-pill-dot pv-pill-dot-starting"}),o("span",{className:"pv-pill-timer-text",children:"0:00"})]}),a("div",{className:"pv-pill-center",role:"status",children:[o("span",{className:"pv-mic-spinner","aria-hidden":"true"}),o("span",{className:"pv-pill-status",children:"Requesting microphone\u2026"})]})]}):null,n==="recording"?a(Q,{children:[a("div",{className:"pv-pill-timer-badge",children:[o("div",{className:"pv-pill-dot"}),a("span",{className:"pv-pill-timer-text",children:[o("span",{className:"pv-sr-only",style:Qe,children:"Recording "}),h]})]}),a("div",{className:"pv-pill-center",role:"status",children:[p===null?o("span",{className:"pv-sr-only",style:Qe,children:"Audio meter unavailable"}):null,o("span",{className:`pv-pill-waveform ${p===null?"animated":""}`,"aria-label":"Microphone audio activity",role:"meter","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":Math.round((p??.3)*100),children:[.4,.7,1,.7,.4].map((f,A)=>o("span",{className:"pv-pill-waveform-bar",style:p!==null?{height:`${Math.max(3,p*f*20)}px`}:void 0},A))}),o("span",{className:"pv-pill-status",children:"Listening..."}),p!==null&&p<.015&&b>=5?o("span",{className:"pv-mic-quiet-warning",children:"No audio detected \u2014 check your microphone."}):null]})]}):null,n==="processing"?a(Q,{children:[o("div",{className:"pv-pill-timer-badge",children:o("span",{className:"pv-pill-timer-text",children:h})}),o("div",{className:"pv-pill-center",role:"status",children:a("span",{className:"pv-pill-status",children:[o("span",{className:"pv-mic-spinner","aria-hidden":"true"})," ",d?"Recording limit reached. ":"","Transcribing and refining\u2026"]})})]}):null,n==="starting"||n==="recording"?o("button",{type:"button",className:"pv-mic-cancel pv-pill-btn-cancel",onClick:c,"aria-label":"Cancel recording",title:"Cancel recording",children:o("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:o("path",{d:"M18 6L6 18M6 6l12 12",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round"})})}):null,n==="error"&&i?o("span",{role:"alert",className:"pv-pill-status pv-mic-error",children:i}):null]})}var gn={"Voice & transcription":[{key:"inputLanguage",label:"Input language",options:["auto","en","he","de","fr","es","ja"]},{key:"dictionary",label:"Personal dictionary",multiline:!0,help:"Names and terms, one per line."}],"Prompt Voice":[{key:"tone",label:"Cleanup tone",options:["conversational","formal","casual","technical","custom"]},{key:"customPrompt",label:"Custom cleanup instructions",multiline:!0}],Connections:[]},tt={inputLanguage:"auto",tone:"conversational"},bn={auto:"Detect automatically",system:"Zana voice",none:"Off",assistant:"Zana assistant",openai:"OpenAI",anthropic:"Anthropic",google:"Google AI","google-gemini":"Google Gemini",en:"English",he:"Hebrew",de:"German",fr:"French",es:"Spanish",ja:"Japanese"};function nt({rpc:e,onBack:n}){let[i,r]=v({}),[s,c]=v("Loading\u2026"),[u,p]=v(null),b=_(0),d=_({});N(()=>{let m=!0;return e.call("promptVoice.settings.get").then(h=>{m&&(d.current=h||{},r(d.current),c("Saved"))}).catch(()=>{m&&c("Could not load settings")}),()=>{m=!1}},[]);let g=m=>{let h=++b.current;d.current={...d.current,...m};let f=d.current;r(f),c("Saving\u2026"),e.call("promptVoice.settings.update",f).then(()=>{h===b.current&&(p(null),c("Saved"))}).catch(()=>{h===b.current&&(p(f),c("Could not save settings."))})};return o("div",{className:"ps-workspace",children:o("main",{className:"ps-editor-canvas",style:{overflowY:"auto"},children:a("div",{style:{width:"100%",maxWidth:760,margin:"0 auto",display:"flex",flexDirection:"column",gap:12},children:[a("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12},children:[a("div",{children:[o("h1",{style:{fontSize:18,margin:"4px 0"},children:"Settings"}),o("span",{style:{color:"var(--ps-text-muted)",fontSize:12},children:"Configure voice and cleanup defaults"})]}),o("button",{className:"ps-btn",onClick:n,children:"\u2190 Back to Studio"})]}),a("div",{style:{color:"var(--ps-text-muted)",fontSize:11},children:[o("span",{role:"status",children:s}),u&&o("button",{className:"ps-btn",onClick:()=>g(u),children:"Retry"})]}),Object.entries(gn).map(([m,h])=>a("section",{className:"ps-pane",style:{flex:"none"},children:[a("div",{className:"ps-pane-header",children:[o("h2",{className:"ps-pane-title",style:{margin:0},children:m}),m!=="Connections"&&o("button",{className:"ps-btn",onClick:()=>g(Object.fromEntries(h.map(f=>[f.key,tt[f.key]??""]))),children:"Reset"})]}),a("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[m==="Connections"&&o("p",{children:"Manage API keys in Zana\u2019s Prompt Voice plugin settings."}),h.filter(f=>!(f.key==="customPrompt"&&i.tone!=="custom")).map(f=>a("label",{className:"ps-field-group",children:[o("span",{className:"ps-field-label",children:f.label}),f.options?o("select",{className:"ps-select",value:i[f.key]??tt[f.key]??"",onChange:A=>g({[f.key]:A.target.value}),children:f.options.map(A=>o("option",{value:A,children:bn[A]??A},A))}):f.multiline?o("textarea",{className:"ps-custom-prompt-input",value:i[f.key]??"",onChange:A=>g({[f.key]:A.target.value})}):o("input",{type:f.secret?"password":"text",className:"ps-select",value:i[f.key]??"",onChange:A=>g({[f.key]:A.target.value}),placeholder:f.secret?"Enter API key\u2026":void 0}),f.help&&o("small",{style:{color:"var(--ps-text-muted)"},children:f.help})]},f.key))]})]},m))]})})})}function ot(e){return e?e.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]+/gu)||[]:[]}var rt=1200;function it(e,n){if(!e&&!n)return[];if(e===n)return[{type:"unchanged",text:e}];if(!e)return[{type:"added",text:n}];if(!n)return[{type:"removed",text:e}];let i=ot(e),r=ot(n),s=i.length,c=r.length;if(s>rt||c>rt)return[{type:"removed",text:e},{type:"added",text:n}];let u=c+1,p=new Uint32Array((s+1)*u);for(let h=1;h<=s;h++){let f=h*u,A=(h-1)*u,G=i[h-1];for(let k=1;k<=c;k++)if(G===r[k-1])p[f+k]=p[A+(k-1)]+1;else{let T=p[f+(k-1)],L=p[A+k];p[f+k]=T>L?T:L}}let b=[],d=s,g=c;for(;d>0||g>0;){let h=d*u,f=(d-1)*u;d>0&&g>0&&i[d-1]===r[g-1]?(b.push({type:"unchanged",text:i[d-1]}),d--,g--):g>0&&(d===0||p[h+(g-1)]>=p[f+g])?(b.push({type:"added",text:r[g-1]}),g--):d>0&&(g===0||p[h+(g-1)]<p[f+g])&&(b.push({type:"removed",text:i[d-1]}),d--)}b.reverse();let m=[];for(let h of b)m.length>0&&m[m.length-1].type===h.type?m[m.length-1].text+=h.text:m.push({...h});return m}var hn=`
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
`;async function at(e){if(!e)return!1;if(typeof navigator<"u"&&navigator.clipboard&&typeof navigator.clipboard.writeText=="function")try{return await navigator.clipboard.writeText(e),!0}catch{}if(typeof document<"u")try{let n=document.createElement("textarea");n.value=e,n.setAttribute("readonly",""),n.style.position="fixed",n.style.top="-9999px",n.style.left="-9999px",n.style.opacity="0",document.body.appendChild(n),n.focus(),n.select();let i=document.execCommand("copy");if(document.body.removeChild(n),i)return!0}catch{}return!1}var st="zcc:prompt-voice:studio-draft:v1",pt=[{id:"polish",title:"Clean up writing",icon:"\u2728",desc:"Fix punctuation, grammar, and stuttering.",prompt:"Clean up disfluencies, typos, and improve sentence flow without altering intent.",tone:"technical"},{id:"executive",title:"Summarize",icon:"\u26A1",desc:"Condense into punchy bullet points.",prompt:"Summarize the core request into crisp, high-level executive bullet points.",tone:"formal"},{id:"spec",title:"Create a technical spec",icon:"\u{1F4D0}",desc:"Format with Goals, Context, Steps.",prompt:"Transform into a structured technical spec with ## Goal, ## Architecture, and ## Implementation Steps.",tone:"technical"},{id:"chat",title:"Make it conversational",icon:"\u{1F4AC}",desc:"Natural, conversational tone.",prompt:"Rephrase in a warm, polite, and helpful conversational tone.",tone:"conversational"}],vn=[{id:"google-gemini",label:"Google Gemini"},{id:"openai",label:"OpenAI (Whisper)"},{id:"system",label:"System (Zana Voice)"}],xn=[{id:"anthropic",displayName:"Anthropic",models:[{id:"claude-haiku-4-5-20251001",key:"anthropic-haiku",label:"Claude 4.5 Haiku",providerId:"anthropic"},{id:"claude-sonnet-5-20260201",key:"anthropic-sonnet",label:"Claude 5 Sonnet",providerId:"anthropic"}]},{id:"google",displayName:"Google Gemini",models:[{id:"gemini-2.5-flash",key:"google-flash",label:"Gemini 2.5 Flash",providerId:"google"}]},{id:"openai",displayName:"OpenAI",models:[{id:"gpt-5.4-nano",key:"openai-fast",label:"GPT-5.4 Nano (Fast)",providerId:"openai"},{id:"gpt-5.6-luna",key:"openai-smart",label:"GPT-5.6 Luna (Smart)",providerId:"openai"}]},{id:"assistant",displayName:"Zana Assistant",models:[{id:"assistant",key:"assistant",label:"Local / Active Thread Agent",providerId:"assistant"}]}];function yn(){try{return je()}catch{return null}}function ct({startSession:e=X}){let[n,i]=v(!1),r=fe(),s=ge(),c=yn(),u=c?.providerId,p=c?.familyId,b=_(!1),[d,g]=v(""),[m,h]=v(""),[f,A]=v(!1),[G,k]=v(!1),[T,L]=v(!1),[q,se]=v(null),[O,V]=v(null),[$,pe]=v("assistant"),[ee,ce]=v("assistant"),[wn,le]=v(null),[te,_e]=v(!0),[De,dt]=v(null),[ne,ve]=v(!1),[F,de]=v("polish"),[ue,Me]=v(""),[Z,Le]=v(!1),[Oe,x]=v(null),[I,me]=v("system"),[xe,ye]=v(""),[we,ze]=v(!0),[Se,W]=v(null),[B,$e]=v(!1),[ut,Fe]=v(0),[mt,Ue]=v(null),H=_(null),oe=_(null),re=_(null),Ve=_(null);N(()=>{try{let t=localStorage.getItem(st);if(t){let l=JSON.parse(t);l.inputText&&g(l.inputText),l.outputText&&h(l.outputText),l.selectedProviderId&&pe(l.selectedProviderId),l.selectedModelId&&(b.current=!0,ce(l.selectedModelId)),l.sttProvider&&me(l.sttProvider),l.sttModel&&ye(l.sttModel)}}catch{}},[]);let Ae=P(t=>{t&&(t.llmProvider&&(le(t.llmProvider),_e(t.llmProvider!=="none")),t.sttProvider&&me(t.sttProvider),typeof t.sttKeyConfigured=="boolean"&&ze(t.sttKeyConfigured))},[]),ft=P(()=>{r.call(ie).then(t=>Ae(t)).catch(()=>{})},[r,Ae]);N(()=>{let t=!0;return r.call(ie).then(l=>{t&&Ae(l)}).catch(()=>{}),()=>{t=!1}},[r]),N(()=>{let t=!0;return r.call("promptVoice.settings.get").then(l=>{if(!t)return;let y=l||{};y.sttProvider&&me(y.sttProvider),y.sttModel&&ye(y.sttModel)}).catch(()=>{}),()=>{t=!1}},[r]),N(()=>{let t=!0;return r.call(qe).then(l=>{if(!t)return;let y=l;Array.isArray(y)&&y.length>0&&V(y)}).catch(()=>{}),()=>{t=!1}},[r]);let U=j(()=>{let t=(S,C)=>[...S].sort((D,R)=>C(D).localeCompare(C(R),void 0,{sensitivity:"base",numeric:!0}));if(!O||O.length===0){let S=xn.map(C=>{let D=!!(u&&C.id.toLowerCase()===u.toLowerCase()||p&&C.id.toLowerCase().includes(p.toLowerCase())),R=t(C.models,K=>K.label||K.id).map(K=>({...K,isComposerMatch:D}));return{...C,isComposerMatch:D,models:R}});return t(S,C=>C.displayName||C.id)}let l={"assistant:assistant":"assistant","openai:gpt-5.4-nano":"openai-fast","openai:gpt-5.6-luna":"openai-smart","anthropic:claude-haiku-4-5-20251001":"anthropic-haiku","anthropic:claude-sonnet-5-20260201":"anthropic-sonnet","google:gemini-2.5-flash":"google-flash"},y=O.map(S=>{let C=!!(u&&S.providerId.toLowerCase()===u.toLowerCase()||p&&S.providerId.toLowerCase().includes(p.toLowerCase())),D=t(S.models,R=>R.label||R.id).map(R=>{let K=`${S.providerId}:${R.id}`,Nt=l[K]??R.id;return{id:R.id,key:Nt,label:R.label||R.id,providerId:S.providerId,isComposerMatch:C}});return{id:S.providerId,displayName:S.displayName||S.providerId,isComposerMatch:C,models:D}});return t(y,S=>S.displayName||S.id)},[O,u,p]),E=j(()=>U.find(t=>t.id===$)??U[0],[U,$]),Y=j(()=>E?.models??[],[E]),z=j(()=>Y.find(l=>l.id===ee||l.key===ee)??Y[0],[Y,ee]);N(()=>{if(!b.current&&U.length>0){let t=U.find(l=>l.isComposerMatch);t&&(pe(t.id),t.models.length>0&&ce(t.models[0].key||t.models[0].id))}},[U]),N(()=>{try{localStorage.setItem(st,JSON.stringify({inputText:d,outputText:m,selectedProviderId:$,selectedModelId:ee,sttProvider:I,sttModel:xe}))}catch{}},[d,m,$,ee,I,xe]);let gt=t=>{_e(t);let l=t?E?.id??"assistant":"none",y=t?z?.id??"assistant":"";le(l),r.call("promptVoice.settings.update",{llmProvider:l,llmModel:y}).catch(()=>{x("Could not update cleanup setting.")})},Re=t=>{me(t),W(null),r.call("promptVoice.settings.update",{sttProvider:t}).then(()=>ft()).catch(()=>{x("Could not update speech provider setting.")})},bt=t=>{ye(t),r.call("promptVoice.settings.update",{sttModel:t}).catch(()=>{})},ht=t=>{b.current=!0,pe(t);let l=U.find(S=>S.id===t),y="";if(l&&l.models.length>0){let S=l.models[0].key||l.models[0].id;y=l.models[0].id,ce(S)}te&&(le(t),r.call("promptVoice.settings.update",{llmProvider:t,llmModel:y}).catch(()=>{}))},vt=t=>{b.current=!0;let l=$,y=t;for(let S of U){let C=S.models.find(D=>D.id===t||D.key===t);if(C){S.id!==$&&(pe(S.id),l=S.id),ce(C.key||C.id),y=C.id;break}}te&&(le(l),r.call("promptVoice.settings.update",{llmProvider:l,llmModel:y}).catch(()=>{}))};N(()=>()=>{oe.current&&clearInterval(oe.current),re.current&&clearInterval(re.current),H.current&&H.current.cancel()},[]);let xt=j(()=>{let t=d.trim();return`${t?t.split(/\s+/).length:0} words \xB7 ${d.length} chars`},[d]),yt=j(()=>{let t=m.trim();return`${t?t.split(/\s+/).length:0} words \xB7 ${m.length} chars`},[m]),wt=j(()=>!m||!ne?[]:it(d,m),[d,m,ne]),St=async()=>{if(B){$e(!1),Ue(null),oe.current&&clearInterval(oe.current),re.current&&clearInterval(re.current);let t=H.current;if(H.current=null,!t)return;L(!0);try{let l=await he(r,await t.stop()),y=await r.call(be,{audio:l.base64,mimeType:l.mimeType,transcriptionOnly:!0});y.ok&&y.status==="ok"?(g(S=>J(S,y.text)),W(null)):y.ok&&y.status==="no-speech"?(x("No speech detected. Try speaking closer to the microphone."),setTimeout(()=>x(null),4e3)):y.ok||(x(y.message),W(y.message),y.code==="MISSING_KEY"&&ze(!1))}catch(l){x(l instanceof Error?l.message:"Transcription failed.")}finally{L(!1)}}else{if(W(null),x(null),I!=="system"&&!we){let t=I==="openai"?"OpenAI":"Google Gemini";W(`API key required for direct ${t} speech-to-text. Switch to System (Zana Voice) below to dictate using host voice.`),x(`API key required for ${t}. Switch to System (Zana Voice) to dictate thoughts.`);return}try{let t=await e();H.current=t,$e(!0),Fe(0),oe.current=setInterval(()=>{Fe(l=>l+1)},1e3),re.current=setInterval(()=>{if(H.current){let l=H.current.getAudioLevel?.()??null;Ue(l)}},100)}catch(t){x(t instanceof Error?t.message:"Microphone access denied.")}}},At=async()=>{let t=d.trim();if(!t||Z||F==="custom"&&!ue.trim())return;let l=pt.find(R=>R.id===F),y=F==="custom"?ue.trim():l?.prompt||"Polish and format for clarity.",S=l?.tone||"technical",C=E?.id??"assistant",D=z?.id??"assistant";x(null),Le(!0);try{let R=await r.call(Ge,{text:t,tone:S,customPrompt:y,llmProvider:C,llmModel:D});R.ok?(h(R.text),dt(`${E?.displayName||C}: ${R.llmModel||D}`)):x(R.message)}catch(R){x(R instanceof Error?R.message:"Refinement request failed.")}finally{Le(!1)}},Rt=async()=>{try{let t=await navigator.clipboard.readText();if(!t||!t.trim()){x("Clipboard is empty."),setTimeout(()=>x(null),2500);return}g(l=>J(l,t)),x("Pasted from clipboard into input draft!"),setTimeout(()=>x(null),2500)}catch{x("Clipboard access denied or unavailable."),setTimeout(()=>x(null),2500)}},Ct=async()=>{if(!d)return;await at(d)?(k(!0),setTimeout(()=>k(!1),2e3),x("Input draft copied to clipboard!"),setTimeout(()=>x(null),2500)):(x("Failed to copy to clipboard."),setTimeout(()=>x(null),3e3))},Et=async()=>{if(!m)return;await at(m)?(A(!0),setTimeout(()=>A(!1),2e3),x("Refined output copied to clipboard!"),setTimeout(()=>x(null),2500)):(x("Failed to copy to clipboard."),setTimeout(()=>x(null),3e3))},kt=()=>{!d&&!m||(g(""),h(""),de("polish"),Me(""),ve(!1),x("Studio canvas cleared."),setTimeout(()=>x(null),2500))},Tt=()=>{m&&(g(m),h(""),ve(!1),x("Refined output moved to input draft."),setTimeout(()=>x(null),2500))},It=()=>{let t=m||d;if(t)try{s.updateText(l=>J(l,t)),s.focus(),se("Inserted into Composer!"),setTimeout(()=>se(null),2500)}catch{x("Composer focus unavailable.")}},Pt=P(t=>{(t.ctrlKey||t.metaKey)&&t.key.toLowerCase()==="k"&&(t.preventDefault(),de("custom"),setTimeout(()=>Ve.current?.focus(),0))},[]);return a("div",{className:"ps-container",onKeyDown:Pt,children:[o("style",{children:hn}),a("header",{className:"ps-header",children:[a("div",{className:"ps-header-left",children:[o("span",{style:{fontSize:18},children:"\u{1F399}\uFE0F"}),o("span",{className:"ps-header-title",children:"Prompt Studio"}),o("span",{className:"ps-badge",children:"Voice & AI Refinement"}),q&&o("span",{className:"ps-badge",style:{background:"rgba(34, 197, 94, 0.2)",color:"#86efac"},children:q})]}),a("div",{className:"ps-header-actions",children:[a("button",{type:"button",className:"ps-btn",onClick:kt,title:"Clear current input and output",disabled:!d&&!m,children:[o("span",{children:"\u{1F5D1}\uFE0F"}),o("span",{children:"Clear"})]}),a("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:It,disabled:!d&&!m,title:"Append current text directly into Zana Composer",children:[o("span",{children:"\u{1F4AC}"}),o("span",{children:"Insert into Composer"})]})]})]}),n?o(nt,{rpc:r,onBack:()=>i(!1)}):a("div",{className:"ps-workspace",children:[a("aside",{className:"ps-sidebar",children:[a("section",{className:"ps-section",children:[a("div",{className:"ps-section-title",children:[o("span",{children:"Refinement Engine"}),o("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:E?.isComposerMatch?"\u2605 Composer Active":"AI Model"})]}),a("div",{className:"ps-field-group",children:[o("label",{htmlFor:"ps-provider-select",className:"ps-field-label",children:"Provider"}),o("select",{id:"ps-provider-select",className:"ps-select","aria-label":"Refinement provider",value:E?.id??"",onChange:t=>ht(t.target.value),disabled:Z,children:U.map(t=>a("option",{value:t.id,children:[t.displayName,t.isComposerMatch?" \u2605 (Composer)":""]},t.id))})]}),a("div",{className:"ps-field-group",children:[a("label",{htmlFor:"ps-model-select",className:"ps-field-label",children:["Model (",Y.length,")"]}),o("select",{id:"ps-model-select",className:"ps-select","aria-label":"Refinement model",value:z?.key||z?.id||"",onChange:t=>vt(t.target.value),disabled:Z||Y.length===0,children:Y.map(t=>a("option",{value:t.key||t.id,children:[t.label,t.isComposerMatch?" \u2605 (Composer)":""]},t.key||t.id))})]}),a("div",{style:{marginTop:8,paddingTop:8,borderTop:"1px solid var(--ps-border)",display:"flex",flexDirection:"column",gap:4},children:[a("label",{style:{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:11,fontWeight:500,userSelect:"none"},children:[o("input",{type:"checkbox","aria-label":"Auto-cleanup mic dictations",checked:te,onChange:t=>gt(t.target.checked)}),o("span",{children:"Auto-cleanup mic dictations"})]}),o("span",{style:{fontSize:10,color:"var(--ps-text-subtle)",lineHeight:1.3},children:te?`Composer mic cleans up using ${E?.displayName} (${z?.label||z?.id}).`:"Composer mic inserts raw transcript without AI cleanup."})]}),a("div",{style:{marginTop:4,fontSize:11,color:"var(--ps-text-muted)",lineHeight:1.35},children:[E?.isComposerMatch?a("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:600},children:["\u2605 Synced to Composer: ",E.displayName," (",z?.label,")"]}):E?.id==="assistant"?"Uses the active Zana assistant agent with no extra API key required.":a(Q,{children:["Using ",o("strong",{children:E?.displayName})," \xB7 ",o("code",{children:z?.id})]}),De?a("div",{style:{marginTop:3,color:"var(--ps-text-subtle)",fontSize:10},children:["Last refined: ",De]}):null]})]}),a("section",{className:"ps-section",children:[a("div",{className:"ps-section-title",children:[o("span",{children:"Voice Dictation"}),o("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:I==="system"?"Host STT":I==="openai"?"OpenAI":"Google Gemini"})]}),a("div",{className:"ps-field-group",children:[o("label",{htmlFor:"ps-stt-provider-select",className:"ps-field-label",children:"Speech Provider"}),o("select",{id:"ps-stt-provider-select",className:"ps-select","aria-label":"Speech-to-text provider",value:I,onChange:t=>{W(null),Re(t.target.value)},disabled:B||T,children:vn.map(t=>o("option",{value:t.id,children:t.label},t.id))})]}),I!=="system"&&a("div",{className:"ps-field-group",children:[o("label",{htmlFor:"ps-stt-model-input",className:"ps-field-label",children:"Speech Model (Optional)"}),o("input",{id:"ps-stt-model-input",className:"ps-select","aria-label":"Speech-to-text model",placeholder:"Provider default",value:xe,onChange:t=>bt(t.target.value),disabled:B||T})]}),Se&&a("div",{role:"alert",style:{padding:"8px 10px",borderRadius:6,background:"rgba(239, 68, 68, 0.12)",border:"1px solid rgba(239, 68, 68, 0.35)",color:"#fca5a5",fontSize:11,textAlign:"left",lineHeight:1.4,display:"flex",flexDirection:"column",gap:6},children:[a("div",{children:["\u26A0\uFE0F ",Se]}),I!=="system"&&o("button",{type:"button",className:"ps-btn ps-btn-primary",style:{alignSelf:"flex-start",fontSize:11,padding:"4px 8px"},onClick:()=>Re("system"),children:"Switch to System (Zana Voice)"})]}),I!=="system"&&!we&&!Se&&a("div",{style:{padding:"8px 10px",borderRadius:6,background:"rgba(234, 179, 8, 0.1)",border:"1px solid rgba(234, 179, 8, 0.3)",color:"#fde047",fontSize:11,textAlign:"left",lineHeight:1.4,display:"flex",flexDirection:"column",gap:6},children:[a("div",{children:["\u2139\uFE0F ",o("strong",{children:"API key required:"})," Direct ",I==="openai"?"OpenAI Whisper":"Google Gemini"," speech-to-text requires an API key in Zana Settings."]}),o("button",{type:"button",className:"ps-btn ps-btn-primary",style:{alignSelf:"flex-start",fontSize:11,padding:"4px 8px"},onClick:()=>Re("system"),children:"Switch to System (Zana Voice)"})]}),a("div",{className:"ps-dictation-card",children:[a("button",{type:"button",className:`ps-btn ${B?"ps-btn-danger":T?"":"ps-btn-primary"}`,style:{width:"100%",justifyContent:"center",padding:"10px 0",opacity:T?.8:1},onClick:St,disabled:T,"aria-label":T?"Transcribing audio":B?"Stop dictation":"Start dictation",children:[o("span",{className:T?"ps-spin":void 0,children:T?"\u23F3":B?"\u23F9\uFE0F":"\u{1F399}\uFE0F"}),o("span",{children:T?"Transcribing...":B?`Stop Dictation (${ut}s)`:"Dictate Thoughts"})]}),B&&a("div",{style:{width:"100%",display:"flex",flexDirection:"column",gap:4},children:[o("div",{className:"ps-meter-bar",children:o("div",{className:"ps-meter-fill",style:{width:`${Math.min(100,(mt??.1)*100)}%`}})}),o("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:"Listening live..."})]})]}),o("div",{style:{fontSize:10,color:"var(--ps-text-subtle)",lineHeight:1.3},children:I==="system"?"Uses host Zana voice transcription without requiring external API keys.":we?`Using direct ${I==="openai"?"OpenAI Whisper":"Google Gemini"} speech-to-text.`:`\u26A0\uFE0F ${I==="openai"?"OpenAI":"Google Gemini"} requires an API key in Zana Settings. Choose System (Zana Voice) for built-in free dictation.`})]}),a("section",{className:"ps-section",children:[o("div",{className:"ps-section-title",children:"How should we improve it?"}),a("div",{className:"ps-presets-list",role:"radiogroup","aria-label":"How should we improve it?",children:[pt.map(t=>a("label",{className:`ps-preset-btn ${F===t.id?"active":""}`,children:[a("span",{className:"preset-title",children:[o("input",{type:"radio",name:"refinement-style",value:t.id,checked:F===t.id,onChange:()=>de(t.id)}),t.title]}),o("span",{className:"preset-desc",children:t.desc})]},t.id)),a("label",{className:`ps-preset-btn ${F==="custom"?"active":""}`,children:[a("span",{className:"preset-title",children:[o("input",{type:"radio",name:"refinement-style",value:"custom",checked:F==="custom",onChange:()=>de("custom")}),"Custom instructions"]}),o("span",{className:"preset-desc",children:"Describe your own transformation."})]})]}),F==="custom"&&o("textarea",{ref:Ve,className:"ps-custom-prompt-input","aria-label":"Custom instructions",placeholder:"e.g. Turn into user stories with acceptance criteria...",value:ue,onChange:t=>Me(t.target.value)})]}),o("button",{type:"button",className:"ps-btn",style:{marginTop:"auto"},onClick:()=>i(!0),children:"Settings"})]}),a("main",{className:"ps-editor-canvas",children:[a("section",{className:"ps-pane",children:[a("div",{className:"ps-pane-header",children:[a("div",{className:"ps-pane-title",children:[o("span",{children:"\u{1F4DD}"}),o("span",{children:"Raw Input Draft"})]}),a("div",{style:{display:"flex",gap:6},children:[o("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Rt,title:"Paste from clipboard into input draft","aria-label":"Paste into input draft",children:"\u{1F4CB} Paste"}),o("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Ct,disabled:!d,title:"Copy raw input","aria-label":"Copy raw input",children:G?"\u2705 Copied":"\u{1F4CB} Copy"}),o("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>g(""),disabled:!d,title:"Clear input",children:"Clear"})]})]}),o("textarea",{className:"ps-textarea",placeholder:"Type your raw thoughts or click Dictate in the left sidebar to speak...",value:d,onChange:t=>g(t.target.value),"aria-label":"Raw Input Text"})]}),a("div",{className:"ps-action-bar",children:[a("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12},children:[o("span",{className:"ps-pill",children:"\u2B07 Refine pipeline"}),o("span",{style:{color:"var(--ps-text-muted)"},children:d.trim()?`${d.trim().split(/\s+/).length} words ready`:"Add text to get started"})]}),o("div",{style:{display:"flex",alignItems:"center",gap:6},children:a("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:()=>At(),disabled:Z||!d.trim()||F==="custom"&&!ue.trim(),title:"Transform raw draft into polished output",children:[o("span",{children:Z?"\u23F3":"\u26A1"}),o("span",{children:Z?"Refining...":"Refine text"})]})})]}),a("section",{className:"ps-pane",children:[a("div",{className:"ps-pane-header",children:[a("div",{className:"ps-pane-title",children:[o("span",{children:"\u2728"}),o("span",{children:"Result"})]}),a("div",{style:{display:"flex",gap:6},children:[m&&a("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>ve(t=>!t),title:"Toggle inline diff against input draft",children:[o("span",{children:ne?"\u{1F441}\uFE0F":"\u{1F50D}"}),o("span",{children:ne?"View Clean":"View Diff"})]}),o("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Tt,disabled:!m,title:"Move output to input draft for iterative re-refinement",children:"\u2B06 Replace Input"}),o("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Et,disabled:!m,title:"Copy refined text to clipboard","aria-label":"Copy refined output",children:f?"\u2705 Copied":"\u{1F4CB} Copy"})]})]}),ne&&m?o("div",{className:"ps-output-view",children:wt.map((t,l)=>t.type==="added"?o("span",{className:"ps-diff-added",children:t.text},l):t.type==="removed"?o("span",{className:"ps-diff-removed",children:t.text},l):o("span",{className:"ps-diff-unchanged",children:t.text},l))}):o("textarea",{className:"ps-textarea",placeholder:"Polished, structured output will appear here after clicking Refine...",value:m,onChange:t=>h(t.target.value),"aria-label":"Refined output"})]})]})]}),a("footer",{className:"ps-status-bar",children:[a("div",{style:{display:"flex",gap:12},children:[a("span",{children:["Input: ",xt]}),a("span",{children:["Output: ",yt]}),Oe&&o("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:500},children:Oe})]}),a("div",{style:{display:"flex",gap:12,alignItems:"center"},children:[a("span",{children:["Engine: ",E?.displayName," \xB7 ",z?.label]}),a("span",{className:"ps-pill",children:["Mic cleanup: ",te?`${E?.displayName} (${z?.label||z?.id})`:"Off (Raw)"]}),E?.isComposerMatch&&o("span",{className:"ps-pill",style:{color:"var(--accent, #3b82f6)"},children:"\u2605 Composer Synced"}),o("span",{children:"Zana Prompt Studio"})]})]})]})}var lt="prompt-studio",Oo=Be(e=>{Ne(),e.composer.customize({id:"prompt-voice-mic",actions:[{id:"prompt-voice-mic",component:et}]}),e.slots.navPanel?.({id:"prompt-studio",title:"Prompt Studio",icon:"Sparkles",path:lt,component:ct}),e.slots.commandPaletteAction?.({id:"open-prompt-studio",title:"Prompt Studio: Open Canvas",run:n=>{n.navigate?.(`/${lt}`)}})});export{lt as PROMPT_STUDIO_PANEL_PATH,Oo as default};
//# sourceMappingURL=app.js.map
