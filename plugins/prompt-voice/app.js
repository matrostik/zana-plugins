function Ze(){return globalThis.__ZCC_PLUGIN_RUNTIME__??{}}function Ke(e){throw new Error(`${e} is not available until the host plugin runtime is installed`)}function ht(e){return{__zccPluginApp:!0,setup:e}}function Te(){return Ze().useRpc?.()??Ke("useRpc")}function De(){return Ze().useComposer?.()??Ke("useComposer")}function xt(){return Ze().useComposerView?.()??Ke("useComposerView")}var In=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4"];var z=class extends Error{code;constructor(t,o){super(o),this.name="RecordingError",this.code=t}};function Tn(e){return In.find(t=>e(t))??null}var Dn="audio/webm";function yt(){return{getUserMedia:e=>navigator.mediaDevices.getUserMedia(e),createRecorder:(e,t)=>new MediaRecorder(e,t?{mimeType:t}:void 0),isTypeSupported:e=>typeof MediaRecorder<"u"&&MediaRecorder.isTypeSupported(e)}}async function Pn(e,t){let o=t&&t!=="default"?t:void 0,r=o?{audio:{deviceId:{exact:o}}}:{audio:!0};try{return await e.getUserMedia(r)}catch(a){let c=a instanceof Error?a.name:"";if(c==="NotAllowedError"||c==="SecurityError")throw new z("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again.");if(o&&(c==="OverconstrainedError"||c==="NotFoundError"))try{return await e.getUserMedia({audio:!0})}catch(p){let s=p instanceof Error?p.name:"";if(s==="NotAllowedError"||s==="SecurityError")throw new z("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again.")}throw new z("MIC_UNAVAILABLE","No microphone is available. Connect one and try again.")}}function Ye(e){return new Promise((t,o)=>{let r=new FileReader;r.onload=()=>{let a=typeof r.result=="string"?r.result:"";t(a.slice(a.indexOf(",")+1))},r.onerror=()=>o(new z("RECORDING_FAILED","The recording could not be read.")),r.readAsDataURL(e)})}async function Nn(e,t){let o=new Blob(e,{type:t});return{base64:await Ye(o),mimeType:o.type||t}}function _n(e,t){if(!(e>0&&Number.isFinite(e)))return()=>{};let o=setTimeout(t,e);return()=>clearTimeout(o)}var Mn="That recording is too large to transcribe. Keep dictation shorter and try again.";function Ln(e,t){let o=Math.max(t,e),r=[],a=0,c=!1;return{chunks:r,get overflowed(){return c},add(p){return p.size===0||c?"ignored":a+p.size>o?(c=!0,"overflow"):(r.push(p),a+=p.size,a>=e?"limit-reached":"accepted")}}}function On(e,t){let o=new Promise((r,a)=>{e.onstop=()=>r(),e.onerror=()=>{let c=new z("RECORDING_FAILED","Recording stopped unexpectedly. Try again.");t(c),a(c)}});return o.catch(()=>{}),o}function Un(e,t,o,r){let a=On(e,r);return e.ondataavailable=c=>{let p=t.add(c.data);(p==="limit-reached"||p==="overflow")&&o()},e.start(1e3),a}async function Vn(e,t,o,r){try{await e}finally{t()}if(o.overflowed)throw new z("RECORDING_FAILED",Mn);return Nn(o.chunks,r)}function zn(e){let t=()=>{};return{stopRecorder(){t(),e.state!=="inactive"&&e.stop()},armTimer(o,r){t=_n(o,r)}}}function Fn(e,t){let o=null;return{attach(r){o=r},detach(){o=null},autoStop(){e();let r=o?.onAutoStop;o&&(o.onAutoStop=void 0),r?.()},fail(r){e(),t();let a=o?.onError;o=null,a?.(r)}}}function $n(e,t,o,r){let a=Ln(r.maxBytes??9437184,r.hardMaxBytes??10485760),{stopRecorder:c,armTimer:p}=zn(e),s=Fn(c,t);p(r.maxDurationMs??12e4,s.autoStop);let d=Un(e,a,s.autoStop,s.fail),u={onError:r.onError,onAutoStop:r.onAutoStop,async stop(){c();try{return await Vn(d,t,a,e.mimeType||o)}finally{s.detach()}},cancel(){c(),t(),s.detach()}};return s.attach(u),u}var me=e=>Bn(yt(),e);async function Bn(e=yt(),t={}){let o=await Pn(e,t.deviceId),r=Gn(o),a=o.getTracks(),c,p=()=>{for(let s of a)c&&s.removeEventListener?.("ended",c);r?.close(),a.forEach(s=>s.stop())};try{let s=Tn(e.isTypeSupported)??Dn,d=e.createRecorder(o,s),u=$n(d,p,s,t);return u.getAudioLevel=()=>r?.level()??null,c=()=>{let g=u.onError;u.cancel(),g?.(new z("MIC_UNAVAILABLE","Microphone disconnected. Check your device and try again."))},a.forEach(g=>g.addEventListener?.("ended",c)),u}catch(s){throw p(),s instanceof z?s:new z("RECORDING_FAILED",s instanceof Error?s.message:"The recording could not be started.")}}function Gn(e){let t;try{t=new AudioContext;let o=t.createMediaStreamSource(e),r=t.createAnalyser();r.fftSize=256,o.connect(r);let a=new Uint8Array(r.fftSize),c=t,p=!1;return{level(){if(c.state&&c.state!=="running")return null;r.getByteTimeDomainData(a);let s=a.reduce((d,u)=>d+((u-128)/128)**2,0)/a.length;return Math.min(1,Math.sqrt(s)*5)},close(){p||(p=!0,o.disconnect(),c.close().catch(s=>console.error("Prompt Voice audio meter cleanup failed",s)))}}}catch(o){return t&&t.close().catch(r=>console.error("Prompt Voice audio meter cleanup failed",r)),console.warn("Prompt Voice audio meter unavailable",o),null}}var E=globalThis.__ZCC_HOST_REACT__,wt=E,qo=E.Children,Zo=E.Component,Ko=E.Fragment,Yo=E.StrictMode,Xo=E.Suspense,Jo=E.cloneElement,Qo=E.createContext,er=E.createElement,tr=E.createRef,nr=E.forwardRef,or=E.isValidElement,rr=E.lazy,ir=E.memo,ar=E.startTransition,I=E.useCallback,sr=E.useContext,lr=E.useDebugValue,cr=E.useDeferredValue,P=E.useEffect,pr=E.useId,dr=E.useImperativeHandle,ur=E.useInsertionEffect,mr=E.useLayoutEffect,H=E.useMemo,St=E.useReducer,R=E.useRef,v=E.useState,fr=E.useSyncExternalStore,br=E.useTransition,gr=E.version;var N="default";function Hn(e){if(typeof e!="string")return N;let t=e.trim().slice(0,256);return!t||t===N?N:t}function jn(e){return typeof e!="string"?"":e.trim().slice(0,200)}function Wn(e){return!(e===!1||typeof e=="string"&&e.trim().toLowerCase()==="false")}function qn(e){let t=typeof e=="number"?e:typeof e=="string"&&e.trim()!==""?Number(e):Number.NaN;return Number.isFinite(t)?Math.round(Math.min(100,Math.max(0,t))):75}function J(e){let t=e??{},o=Hn(t.micDeviceId);return{micDeviceId:o,micLabel:o===N?"":jn(t.micLabel),soundCuesEnabled:Wn(t.soundCuesEnabled),soundCuesVolume:qn(t.soundCuesVolume)}}var Pe="promptVoice.transcribe",ye="promptVoice.status",At="promptVoice.rephrase",Ct="promptVoice.availableModels",fe="promptVoice.settings.get",Q="promptVoice.settings.update",j={state:"promptVoice.localWhisper.state",installRuntime:"promptVoice.localWhisper.installRuntime",cancelRuntimeInstall:"promptVoice.localWhisper.cancelRuntimeInstall",downloadModel:"promptVoice.localWhisper.downloadModel",cancelModelDownload:"promptVoice.localWhisper.cancelModelDownload",removeModel:"promptVoice.localWhisper.removeModel",selectModel:"promptVoice.localWhisper.selectModel",start:"promptVoice.localWhisper.start",stop:"promptVoice.localWhisper.stop"};function be(e,t){let o=t.trim();return o?e?/\s$/.test(e)?`${e}${o}`:`${e} ${o}`:o:e}var Et="zcc:prompt-voice:audio-prefs:v1";function Xe(){try{if(typeof localStorage>"u")return null;let e=localStorage.getItem(Et);if(!e)return null;let t=JSON.parse(e);return!t||typeof t!="object"||Array.isArray(t)?null:J(t)}catch{return null}}function ge(){return Xe()??J({})}function ie(e){let t=J(e);try{typeof localStorage<"u"&&localStorage.setItem(Et,JSON.stringify({micDeviceId:t.micDeviceId,micLabel:t.micDeviceId===N?"":t.micLabel,soundCuesEnabled:String(t.soundCuesEnabled),soundCuesVolume:String(t.soundCuesVolume)}))}catch{}return t}var Zn="No speech detected.",Je={phase:"idle",notice:null,error:null};function Rt(e,t){switch(t.type){case"START":return e.phase==="idle"||e.phase==="error"?{phase:"starting",notice:null,error:null}:e;case"STARTED":return e.phase==="starting"?{...e,phase:"recording"}:e;case"STOP":return e.phase==="recording"||e.phase==="starting"?{phase:"processing",notice:null,error:null}:e;case"CANCEL":return e.phase==="recording"||e.phase==="starting"?{...Je}:e;case"SUCCESS":case"NO_SPEECH":return e.phase!=="processing"?e:{phase:"idle",notice:t.type==="NO_SPEECH"?Zn:t.notice,error:null};case"CLEAR_NOTICE":return e.notice?{...e,notice:null}:e;case"FAILURE":return{phase:"error",notice:null,error:t.message}}}var Kn={start:[{frequency:523.25,offsetSec:0,durationSec:.11,type:"sine",peakFactor:.9},{frequency:659.25,offsetSec:.075,durationSec:.14,type:"sine",peakFactor:1}],stop:[{frequency:493.88,offsetSec:0,durationSec:.1,type:"sine",peakFactor:.85}],complete:[{frequency:659.25,offsetSec:0,durationSec:.1,type:"sine",peakFactor:.85},{frequency:783.99,offsetSec:.075,durationSec:.16,type:"sine",peakFactor:1}],error:[{frequency:329.63,offsetSec:0,durationSec:.12,type:"triangle",peakFactor:.9},{frequency:246.94,offsetSec:.095,durationSec:.16,type:"triangle",peakFactor:.9}]},Ne=null;function Yn(){if(typeof window>"u")return null;let e=window.AudioContext??window.webkitAudioContext;return e?((!Ne||Ne.state==="closed")&&(Ne=new e),Ne):null}function kt(e,t,o){let r=e.currentTime,a=Kn[t],c=null,p=0;for(let s of a){let d=e.createOscillator(),u=e.createGain(),g=r+s.offsetSec,f=g+s.durationSec,b=s.offsetSec+s.durationSec+.02,S=o*(s.peakFactor??1);b>=p&&(p=b,c=d),d.type=s.type??"sine",d.frequency.setValueAtTime(s.frequency,g),u.gain.setValueAtTime(1e-4,g),u.gain.exponentialRampToValueAtTime(Math.max(2e-4,S),g+.015),u.gain.exponentialRampToValueAtTime(1e-4,f),d.connect(u),u.connect(e.destination),d.start(g),d.stop(f+.02)}return{finalOsc:c,totalDurationSec:p}}function It(e,t){let o=Math.ceil(t*1e3)+40;return new Promise(r=>{let a=!1,c=null,p=()=>{a||(a=!0,c!==null&&clearTimeout(c),e&&typeof e.removeEventListener=="function"&&e.removeEventListener("ended",p),r())};if(e&&typeof e.addEventListener=="function")e.addEventListener("ended",p,{once:!0});else if(e&&"onended"in e){let s=e.onended;e.onended=function(d){typeof s=="function"&&s.call(this,d),p()}}c=setTimeout(p,o)})}async function Xn(e){if(e.state!=="suspended")return e.state==="running";let t=null;try{return await Promise.race([e.resume(),new Promise(o=>{t=setTimeout(o,750)})]),e.state!=="suspended"}catch{return!1}finally{t!==null&&clearTimeout(t)}}function _(e,t){if(!t.enabled)return null;let o=Math.min(100,Math.max(0,t.volume));if(!Number.isFinite(o)||o<=0)return null;try{let r=Yn();if(!r)return null;let a=o/100*.2;if(r.state==="suspended")return(async()=>{if(!await Xn(r))return;let{finalOsc:d,totalDurationSec:u}=kt(r,e,a);await It(d,u)})().catch(()=>{});let{finalOsc:c,totalDurationSec:p}=kt(r,e,a);return It(c,p)}catch{return null}}var Qe=16e3,Tt=44,we=2,Jn="This recording couldn't be prepared for Local Whisper. Try again.",Qn=async(e,t)=>{let r=await new OfflineAudioContext(1,1,t).decodeAudioData(e),a=Array.from({length:r.numberOfChannels},(c,p)=>r.getChannelData(p));return{sampleRate:r.sampleRate,channels:a}};function eo(e){if(e.length===0)return new Float32Array(0);if(e.length===1)return e[0];let t=Math.min(...e.map(r=>r.length)),o=new Float32Array(t);for(let r=0;r<t;r+=1){let a=0;for(let c of e)a+=c[r];o[r]=a/e.length}return o}function to(e,t){let o=e.length*we,r=new Uint8Array(Tt+o),a=new DataView(r.buffer),c=(p,s)=>{for(let d=0;d<s.length;d+=1)a.setUint8(p+d,s.charCodeAt(d))};c(0,"RIFF"),a.setUint32(4,36+o,!0),c(8,"WAVE"),c(12,"fmt "),a.setUint32(16,16,!0),a.setUint16(20,1,!0),a.setUint16(22,1,!0),a.setUint32(24,t,!0),a.setUint32(28,t*we,!0),a.setUint16(32,we,!0),a.setUint16(34,8*we,!0),c(36,"data"),a.setUint32(40,o,!0);for(let p=0;p<e.length;p+=1){let s=Math.max(-1,Math.min(1,e[p]));a.setInt16(Tt+p*we,s<0?s*32768:s*32767,!0)}return r}function no(e){let t=atob(e),o=new Uint8Array(t.length);for(let r=0;r<t.length;r+=1)o[r]=t.charCodeAt(r);return o.buffer}async function oo(e,t=Qn){let o;try{let r=await t(no(e.base64),Qe);if(r.sampleRate!==Qe)throw new Error("decoder ignored the requested sample rate");o=to(eo(r.channels),Qe)}catch{throw new z("RECORDING_FAILED",Jn)}return{base64:await Ye(new Blob([o],{type:"audio/wav"})),mimeType:"audio/wav"}}async function _e(e,t,o=oo){return(await e.call(ye).catch(()=>null))?.audioFormat==="wav"?o(t):t}var ro="Prompt Voice returned an unexpected response. Try again.",io="Dictation failed. Try again.",ao=4e3;function so(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}function lo(e){return typeof e=="object"&&e!==null&&!("ok"in e&&"status"in e)}async function co(e,t){let o=await _e(e,t),r=await e.call(Pe,{audio:o.base64,mimeType:o.mimeType});if(!so(r))throw new Error(ro);return r}function Dt(e){return e instanceof Error&&e.message?e.message:io}function ve(e){return{enabled:e.soundCuesEnabled,volume:e.soundCuesVolume}}function po(e,t,o,r=ge()){if(!e.ok){_("error",ve(r)),o({type:"FAILURE",message:e.message});return}if(e.status==="no-speech"){o({type:"NO_SPEECH"});return}_("complete",ve(r)),t.updateText(c=>be(c,e.text)),t.focus();let a=e.refineNotice?`Inserted the raw transcript. ${e.refineNotice.message}`:"Added to draft.";o({type:"SUCCESS",notice:a})}function uo(e,t,o,r){return t()?(e.onError=a=>{t()&&r(a)},e.onAutoStop=()=>{t()&&o()},e):(e.cancel(),null)}function mo(e,t,o,r,a,c){let p=s=>{_("error",ve(c())),a({type:"FAILURE",message:Dt(s)})};return e.then(s=>{if(!s)return null;let d=uo(s,o,r,u=>{t.current=null,p(u)});return d&&(t.current=d),d},s=>(o()&&p(s),null))}function fo(e,t,o){let r=R(null),a=R(null),c=R(0),p=R(!0),s=I(()=>{c.current++,a.current=null,r.current&&(r.current.cancel(),r.current=null),t({type:"CANCEL"})},[t]);P(()=>(p.current=!0,()=>{p.current=!1,s()}),[s]);let d=I(async()=>{let b=a.current?await a.current:r.current;return r.current=null,b},[]),u=I(async(b,S)=>{let y=++c.current,T=()=>p.current&&c.current===y,h=_("start",ve(S)),B=mo((async()=>h&&(await h,!T())?null:await(S.micDeviceId!==N?e({deviceId:S.micDeviceId}):e()))(),r,T,b,t,o);a.current=B,await B&&T()&&t({type:"STARTED"}),a.current===B&&(a.current=null)},[t,o,e]),g=I(()=>p.current,[]),f=I(()=>r.current?.getAudioLevel?.()??null,[]);return{start:u,takeSession:d,cancel:s,isMounted:g,getAudioLevel:f}}function Pt({startSession:e=me,noticeDurationMs:t=ao}={}){let o=De(),r=Te(),a=R(r);a.current=r;let[c,p]=St(Rt,Je),s=R(c.phase);s.current=c.phase;let d=R(null),u=R(ge()),g=I(()=>u.current,[]),{start:f,takeSession:b,cancel:S,isMounted:y,getAudioLevel:T}=fo(e,p,g),[h,k]=v(null),[B,ae]=v(0),[Se,te]=v(!1);P(()=>{let M=!0;return a.current.call(fe).then(W=>{if(!M||!lo(W))return;let V=ie(W);d.current=V,(s.current==="idle"||s.current==="error")&&(u.current=V)}).catch(()=>{}),()=>{M=!1}},[]),P(()=>{if(c.phase!=="recording"){k(null),ae(0);return}let M=Date.now(),W=()=>{k(T()),ae(Math.floor((Date.now()-M)/1e3))};W();let V=setInterval(W,100);return()=>clearInterval(V)},[T,c.phase]),P(()=>{if(!c.notice)return;let M=setTimeout(()=>{p({type:"CLEAR_NOTICE"})},t);return()=>clearTimeout(M)},[t,c.notice]);let Le=I(()=>{p({type:"CLEAR_NOTICE"})},[]),$=I(async()=>{let M=u.current;p({type:"STOP"});let W=await b();if(!(!y()||!W))try{let V=await W.stop();if(!y())return;_("stop",ve(M));let oe=await co(r,V);if(!y())return;po(oe,o,p,M)}catch(V){if(!y())return;_("error",ve(M)),p({type:"FAILURE",message:Dt(V)})}},[o,y,r,b]),K=I(async()=>{let M=Xe()??d.current??J({});u.current=M,te(!1),p({type:"START"}),await f(()=>{te(!0),$()},M)},[$,f]),ne=I(()=>{c.phase==="recording"||c.phase==="starting"?$():c.phase!=="processing"&&K()},[K,$,c.phase]);return{phase:c.phase,error:c.error,notice:c.notice,level:h,seconds:B,autoStopped:Se,onClick:ne,cancel:S,clearNotice:Le,beginDictation:K,finishDictation:$}}var et=`/* Base Container */
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
`;var Nt="zcc-ext-prompt-voice-styles";function he(){if(typeof document>"u")return;let e=document.getElementById(Nt);e||(e=document.createElement("style"),e.id=Nt,document.head.appendChild(e)),e.textContent!==et&&(e.textContent=et)}var _t=globalThis.__ZCC_HOST_REACT__,F=_t.Fragment;function n(e,t,o){return _t.createElement(e,o===void 0?t:{...t,key:o})}var l=n;var go="Dictation",vo={idle:"Start dictation",starting:"Stop dictation",recording:"Stop dictation",processing:"Transcribing",error:"Start dictation"},Mt={position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",border:0};function Lt({startSession:e=me}){he();let{phase:t,error:o,notice:r,onClick:a,cancel:c,clearNotice:p,level:s,seconds:d,autoStopped:u}=Pt({startSession:e}),g=t==="starting"||t==="recording"||t==="processing",f=t==="idle"&&!!r,b=`${Math.floor(d/60)}:${String(d%60).padStart(2,"0")}`;return l("div",{className:`pv-mic pv-dictation-pill pv-phase-${t} ${f?"pv-has-notice":""}`,onClick:f?p:void 0,title:f?"Click to dismiss":void 0,children:[n("button",{type:"button",className:`pv-mic-button pv-mic-${t} ${g?"pv-pill-btn-stop":"pv-idle-icon"}`,"aria-label":go,"aria-pressed":t==="recording"||t==="starting",title:vo[t],disabled:t==="processing",onClick:a,style:f?{display:"none"}:void 0,children:t==="idle"||t==="error"?n("svg",{viewBox:"0 0 24 24",width:"16",height:"16","aria-hidden":"true",focusable:"false",children:n("path",{d:"M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5Zm6 9h2v-3h-2v3Z",fill:"currentColor"})}):t==="processing"?n("span",{className:"pv-mic-spinner","aria-hidden":"true"}):n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("rect",{x:"6",y:"6",width:"12",height:"12",rx:"2.5",fill:"currentColor"})})}),f?l("span",{role:"status",className:"pv-notice-content",children:[n("span",{className:"pv-notice-check",children:"\u2713"}),n("span",{className:"pv-pill-status",children:r})]}):null,t==="starting"?l(F,{children:[l("div",{className:"pv-pill-timer-badge",children:[n("div",{className:"pv-pill-dot pv-pill-dot-starting"}),n("span",{className:"pv-pill-timer-text",children:"0:00"})]}),l("div",{className:"pv-pill-center",role:"status",children:[n("span",{className:"pv-mic-spinner","aria-hidden":"true"}),n("span",{className:"pv-pill-status",children:"Requesting microphone\u2026"})]})]}):null,t==="recording"?l(F,{children:[l("div",{className:"pv-pill-timer-badge",children:[n("div",{className:"pv-pill-dot"}),l("span",{className:"pv-pill-timer-text",children:[n("span",{className:"pv-sr-only",style:Mt,children:"Recording "}),b]})]}),l("div",{className:"pv-pill-center",role:"status",children:[s===null?n("span",{className:"pv-sr-only",style:Mt,children:"Audio meter unavailable"}):null,n("span",{className:`pv-pill-waveform ${s===null?"animated":""}`,"aria-label":"Microphone audio activity",role:"meter","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":Math.round((s??.3)*100),children:[.4,.7,1,.7,.4].map((S,y)=>n("span",{className:"pv-pill-waveform-bar",style:s!==null?{height:`${Math.max(3,s*S*20)}px`}:void 0},y))}),n("span",{className:"pv-pill-status",children:"Listening..."}),s!==null&&s<.015&&d>=5?n("span",{className:"pv-mic-quiet-warning",children:"No audio detected \u2014 check your microphone."}):null]})]}):null,t==="processing"?l(F,{children:[n("div",{className:"pv-pill-timer-badge",children:n("span",{className:"pv-pill-timer-text",children:b})}),n("div",{className:"pv-pill-center",role:"status",children:l("span",{className:"pv-pill-status",children:[n("span",{className:"pv-mic-spinner","aria-hidden":"true"})," ",u?"Recording limit reached. ":"","Transcribing and refining\u2026"]})})]}):null,t==="starting"||t==="recording"?n("button",{type:"button",className:"pv-mic-cancel pv-pill-btn-cancel",onClick:c,"aria-label":"Cancel recording",title:"Cancel recording",children:n("svg",{viewBox:"0 0 24 24",width:"12",height:"12","aria-hidden":"true",focusable:"false",children:n("path",{d:"M18 6L6 18M6 6l12 12",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round"})})}):null,t==="error"&&o?n("span",{role:"alert",className:"pv-pill-status pv-mic-error",children:o}):null]})}var ho=500,xo=5e3;function tt(e){return e>=1e3**3?`${(e/1e3**3).toFixed(1)} GB`:`${Math.round(e/1e3**2)} MB`}function yo(e){return e.runtime.status==="installing"||e.server.state==="starting"||e.models.some(t=>t.status==="downloading")}function wo(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}function So(e){let[t,o]=v(null),[r,a]=v(null),[c,p]=v(null),s=R(!0),d=I(b=>{if(s.current){if(!wo(b)){a("Local Whisper returned an unexpected response.");return}b.state&&o(b.state),a(b.ok?null:b.message)}},[]),u=I(()=>e.call(j.state).then(d,()=>s.current&&a("Could not load Local Whisper status.")),[e,d]),g=I(async(b,S,y)=>{p(b);try{d(await e.call(S,y))}catch{s.current&&a("Local Whisper request failed. Try again.")}finally{s.current&&p(null)}},[e,d]);P(()=>(s.current=!0,u(),()=>{s.current=!1}),[u]);let f=t?yo(t):!1;return P(()=>{let b=setInterval(()=>void u(),f?ho:xo);return()=>clearInterval(b)},[f,u]),{state:t,error:r,pending:c,run:g}}function nt({tone:e}){return n("span",{"aria-hidden":"true",style:{width:9,height:9,borderRadius:"50%",marginTop:4,flex:"none",background:{ok:"var(--ps-success)",warn:"var(--ps-warn)",err:"var(--ps-danger)",busy:"var(--ps-accent)",idle:"var(--ps-text-muted)"}[e]}})}function Ot({value:e,label:t}){let o=Math.round(e*100);return n("div",{role:"progressbar","aria-label":t,"aria-valuenow":o,"aria-valuemin":0,"aria-valuemax":100,style:{height:5,minWidth:80,background:"var(--ps-bg-hover)",borderRadius:3,overflow:"hidden"},children:n("div",{style:{width:`${o}%`,height:"100%",background:"var(--ps-accent)"}})})}var Me={display:"flex",gap:10,alignItems:"flex-start",padding:"10px 12px",borderRadius:6,border:"1px solid var(--ps-border)"},ee={color:"var(--ps-text-muted)",fontSize:11};function Ao(e){let{runtime:t,server:o,activeModelId:r}=e;return t.status==="not-installed"?{tone:"idle",title:"Runtime not installed",detail:`whisper.cpp ${t.version} \xB7 requires ${t.requirements.join(", ")||"no extra components"}`,action:{label:"Install runtime",method:j.installRuntime,primary:!0}}:t.status==="installing"?{tone:"busy",title:`Installing runtime\u2026 ${Math.round((t.progress??0)*100)}%`,detail:"Verifying the download as it arrives.",action:{label:"Cancel",method:j.cancelRuntimeInstall}}:o.state==="running"?{tone:"ok",title:"Running",detail:`Model ${o.modelId} \xB7 on this device (127.0.0.1) \xB7 managed by Prompt Voice`,action:{label:"Stop",method:j.stop}}:o.state==="starting"?{tone:"busy",title:"Starting\u2026",detail:`Loading model ${o.modelId}.`}:o.state==="crashed"?{tone:"err",title:"Stopped unexpectedly",detail:`Exit code ${o.exitCode??"unknown"}. Logs contain no audio or transcripts.`,action:{label:"Restart",method:j.start,primary:!0}}:r?{tone:"warn",title:"Stopped",detail:"Starts automatically when you dictate.",action:{label:"Start",method:j.start}}:{tone:"warn",title:"Runtime installed",detail:"Download a model below and choose Use to start."}}function Co({model:e,state:t,pending:o,onRun:r}){let a=t.activeModelId===e.id,c=t.runtime.status==="installed"&&!a,p=g=>`${g}:${e.id}`,s={modelId:e.id},d=null,u;return e.status==="downloading"?(d=l(F,{children:[n(Ot,{value:e.progress??0,label:`Downloading ${e.label}`}),l("span",{style:ee,children:[Math.round((e.progress??0)*100),"% of ",tt(e.sizeBytes)]})]}),u=n("button",{type:"button",className:"ps-btn",onClick:()=>r(p("cancel"),j.cancelModelDownload,s),children:"Cancel"})):e.status==="available"?u=l("button",{type:"button",className:"ps-btn",disabled:o===p("download"),onClick:()=>r(p("download"),j.downloadModel,s),children:["Download ",tt(e.sizeBytes)]}):(d=a?n("span",{className:"ps-tag",children:"Active"}):o===p("use")?n("span",{className:"ps-tag",children:"Loading\u2026"}):n("span",{className:"ps-tag",children:"Installed"}),u=l(F,{children:[c&&n("button",{type:"button",className:"ps-btn",disabled:o!==null,onClick:()=>r(p("use"),j.selectModel,s),children:"Use"}),n("button",{type:"button",className:"ps-btn ps-btn-danger",disabled:a||o!==null,title:a?"Choose another model before removing this one":void 0,"aria-label":`Remove ${e.label}`,onClick:()=>r(p("remove"),j.removeModel,s),children:"Remove"})]})),l("tr",{style:a?{background:"color-mix(in srgb, var(--ps-accent) 10%, transparent)"}:void 0,children:[l("td",{style:{padding:"8px 6px"},children:[n("strong",{children:e.label})," ",e.recommended&&n("span",{className:"ps-tag",children:"Recommended"})]}),l("td",{style:{padding:"8px 6px",...ee},children:[tt(e.sizeBytes)," disk",e.memoryEstimate?l(F,{children:[n("br",{}),e.memoryEstimate," RAM"]}):null]}),n("td",{style:{padding:"8px 6px"},children:n("div",{style:{display:"flex",flexDirection:"column",gap:4},children:d})}),n("td",{style:{padding:"8px 6px",textAlign:"right",whiteSpace:"nowrap"},children:n("div",{style:{display:"inline-flex",gap:6},children:u})})]})}function Eo(e,t){let o=e==="local-whisper";return o&&t==="none"?{offline:!0,text:"Audio and text stay on this device."}:o?{offline:!1,text:"Audio stays on this device. Cleanup sends the transcript to your selected cleanup model."}:{offline:!1,text:"Audio leaves this device for transcription."}}function Ut({rpc:e,sttProvider:t,llmProvider:o,onApplyPreset:r}){let{state:a,error:c,pending:p,run:s}=So(e),d=Eo(t,o),u=a?.runtime.status==="installed"&&a.activeModelId!==null;return l("section",{className:"ps-pane",style:{flex:"none"},"aria-labelledby":"ps-lw-title",children:[l("div",{className:"ps-pane-header",children:[n("h2",{id:"ps-lw-title",className:"ps-pane-title",style:{margin:0},children:"Local Whisper"}),n("span",{className:"ps-tag",children:a?a.platform.supported?u?"Ready":"Not set up":"Unavailable":"Loading\u2026"})]}),l("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[n("p",{style:{...ee,margin:0},children:"Transcribe on this device. Audio is never sent anywhere when Local Whisper is the speech provider."}),(c||a?.lastError)&&n("div",{role:"alert",style:{...Me,borderColor:"var(--ps-danger)",color:"var(--ps-danger)",fontSize:12},children:c??a?.lastError?.message}),a&&!a.platform.supported&&l("div",{style:Me,children:[n(nt,{tone:"err"}),l("div",{children:[n("strong",{children:"Not available on this computer"}),n("div",{style:ee,children:a.platform.message})]})]}),a?.platform.supported&&n(Ro,{state:a,pending:p,onRun:s}),a?.platform.supported&&l("div",{children:[l("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"baseline"},children:[n("span",{className:"ps-field-label",children:"Models \xB7 multilingual"}),n("span",{style:ee,children:"Stored in this computer's app data"})]}),l("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:12},children:[n("thead",{children:n("tr",{children:["Model","Size","Status",""].map(g=>n("th",{style:{textAlign:"left",...ee,fontWeight:600,padding:"4px 6px"},children:g},g))})}),n("tbody",{children:a.models.map(g=>n(Co,{model:g,state:a,pending:p,onRun:s},g.id))})]})]}),l("div",{style:Me,children:[n(nt,{tone:d.offline?"ok":"warn"}),l("div",{style:{flex:1},children:[n("strong",{children:d.offline?"Fully offline":"Not fully offline"}),n("div",{style:ee,children:d.text})]}),!d.offline&&n("button",{type:"button",className:"ps-btn",onClick:()=>r({sttProvider:"local-whisper",llmProvider:"none"}),children:"Use offline preset"})]})]})]})}function Ro({state:e,pending:t,onRun:o}){let r=Ao(e);return l("div",{style:Me,"aria-live":"polite",children:[n(nt,{tone:r.tone}),l("div",{style:{flex:1,minWidth:0},children:[n("strong",{children:r.title}),n("div",{style:ee,children:r.detail}),e.runtime.status==="installing"&&n("div",{style:{marginTop:6},children:n(Ot,{value:e.runtime.progress??0,label:"Installing runtime"})})]}),r.action&&n("button",{type:"button",className:r.action.primary?"ps-btn ps-btn-primary":"ps-btn",disabled:t==="runtime",onClick:()=>o("runtime",r.action.method),children:r.action.label})]})}function ot(e){if(typeof e!="string")return[];let t=new Set,o=/[,\n]/;for(let r of e.split(o)){let a=r.trim().slice(0,80);if(a&&t.add(a),t.size>=200)break}return[...t]}function Vt(e,t){let o=ot(t);if(o.length===0)return[...e];let r=new Set(e),a=[...e];for(let c of o){if(a.length>=200)break;r.has(c)||(r.add(c),a.push(c))}return a}function rt(e){return e.join(`
`)}var it=[{code:"auto",label:"Detect automatically"},{code:"af",label:"Afrikaans"},{code:"ar",label:"Arabic"},{code:"hy",label:"Armenian"},{code:"az",label:"Azerbaijani"},{code:"eu",label:"Basque"},{code:"be",label:"Belarusian"},{code:"bn",label:"Bengali"},{code:"bs",label:"Bosnian"},{code:"bg",label:"Bulgarian"},{code:"ca",label:"Catalan"},{code:"zh",label:"Chinese"},{code:"hr",label:"Croatian"},{code:"cs",label:"Czech"},{code:"da",label:"Danish"},{code:"nl",label:"Dutch"},{code:"en",label:"English"},{code:"et",label:"Estonian"},{code:"fi",label:"Finnish"},{code:"fr",label:"French"},{code:"gl",label:"Galician"},{code:"ka",label:"Georgian"},{code:"de",label:"German"},{code:"el",label:"Greek"},{code:"gu",label:"Gujarati"},{code:"he",label:"Hebrew"},{code:"hi",label:"Hindi"},{code:"hu",label:"Hungarian"},{code:"is",label:"Icelandic"},{code:"id",label:"Indonesian"},{code:"ga",label:"Irish"},{code:"it",label:"Italian"},{code:"ja",label:"Japanese"},{code:"kn",label:"Kannada"},{code:"kk",label:"Kazakh"},{code:"ko",label:"Korean"},{code:"lv",label:"Latvian"},{code:"lt",label:"Lithuanian"},{code:"mk",label:"Macedonian"},{code:"ms",label:"Malay"},{code:"ml",label:"Malayalam"},{code:"mt",label:"Maltese"},{code:"mr",label:"Marathi"},{code:"ne",label:"Nepali"},{code:"no",label:"Norwegian"},{code:"fa",label:"Persian"},{code:"pl",label:"Polish"},{code:"pt",label:"Portuguese"},{code:"pa",label:"Punjabi"},{code:"ro",label:"Romanian"},{code:"ru",label:"Russian"},{code:"sr",label:"Serbian"},{code:"sk",label:"Slovak"},{code:"sl",label:"Slovenian"},{code:"es",label:"Spanish"},{code:"sw",label:"Swahili"},{code:"sv",label:"Swedish"},{code:"tl",label:"Tagalog"},{code:"ta",label:"Tamil"},{code:"te",label:"Telugu"},{code:"th",label:"Thai"},{code:"tr",label:"Turkish"},{code:"uk",label:"Ukrainian"},{code:"ur",label:"Urdu"},{code:"vi",label:"Vietnamese"},{code:"cy",label:"Welsh"}];function Ft(){if(!(typeof navigator>"u"))return navigator.mediaDevices}function ko(e){return e.replace(/^default\s*[-–:]\s*/i,"").trim()}function $t(e){let t=e instanceof Error?e.name:"";return t==="NotAllowedError"||t==="SecurityError"}function zt(e){let t=e.filter(s=>s.kind==="audioinput"),o=t.some(s=>!!s.label?.trim()),r=null,a=[],c=new Set,p=1;for(let s of t){let d=s.label?.trim()??"";if(s.deviceId===N){d&&(r=ko(d)||d);continue}!s.deviceId||c.has(s.deviceId)||(c.add(s.deviceId),a.push({deviceId:s.deviceId,label:d||`Microphone ${p}`,isDefault:!1}),p++)}return{devices:a,defaultDeviceLabel:r,labelsAvailable:o}}async function Io(e){if(!e.getUserMedia||!e.enumerateDevices)return{ok:!1,permissionDenied:!1};try{return(await e.getUserMedia({audio:!0})).getTracks().forEach(o=>o.stop()),{ok:!0,rawDevices:await e.enumerateDevices()}}catch(t){return $t(t)?{ok:!1,permissionDenied:!0}:(console.warn("Prompt Voice failed to refresh audio input devices",t),{ok:!1,permissionDenied:!1})}}async function Bt(e={}){let t=e.mediaDevices??Ft();if(!t?.enumerateDevices)return{devices:[],defaultDeviceLabel:null,labelsAvailable:!1,permissionDenied:!1,supported:!1,error:null};let o;try{o=await t.enumerateDevices()}catch(c){return console.warn("Prompt Voice failed to enumerate audio input devices",c),{devices:[],defaultDeviceLabel:null,labelsAvailable:!1,permissionDenied:$t(c),supported:!0,error:"Could not list microphones. Using System default."}}let r=zt(o),a=!1;if(e.requestPermissionIfUnlabeled&&!r.labelsAvailable){let c=await Io(t);c.ok?r=zt(c.rawDevices):a=c.permissionDenied}return{...r,permissionDenied:a,supported:!0,error:null}}function Gt(e,t=Ft()){if(!t?.addEventListener||!t?.removeEventListener)return()=>{};let o=()=>e();return t.addEventListener("devicechange",o),()=>t.removeEventListener?.("devicechange",o)}function Ht(){let[e,t]=v([]),[o,r]=v(null),[a,c]=v(!0),[p,s]=v(!1),[d,u]=v(null),[g,f]=v(!1),b=R(!0),S=R(0),y=I(async(T=!1)=>{let h=++S.current;b.current&&f(!0);try{let k=await Bt({requestPermissionIfUnlabeled:T});if(!b.current||S.current!==h)return;t(k.devices),r(k.defaultDeviceLabel),c(k.labelsAvailable),s(k.permissionDenied),u(k.error)}catch(k){if(console.warn("Prompt Voice audio device lookup failed",k),!b.current||S.current!==h)return;t([]),u("Could not list microphones. Using System default.")}finally{b.current&&S.current===h&&f(!1)}},[]);return P(()=>{b.current=!0,y(!1);let T=Gt(()=>{y(!1)});return()=>{b.current=!1,S.current++,T()}},[y]),{devices:e,defaultDeviceLabel:o,labelsAvailable:a,permissionDenied:p,error:d,isRefreshing:g,refresh:y}}var Po={"Voice & transcription":[{key:"sttProvider",label:"Speech-to-text provider",options:["system","google-gemini","openai","local-whisper"]},{key:"inputLanguage",label:"Input language",options:it.map(e=>e.code),help:"Spoken language for transcription, or Detect automatically."},{key:"dictionary",label:"Personal dictionary",help:"Add specific names, acronyms, or technical terms to guarantee accurate spelling."}],"Prompt Voice":[{key:"tone",label:"Cleanup tone",options:["conversational","formal","casual","technical","custom"]},{key:"customPrompt",label:"Custom cleanup instructions",multiline:!0}],Connections:[]},at={sttProvider:"system",inputLanguage:"auto",tone:"conversational"},No={...Object.fromEntries(it.map(e=>[e.code,e.label])),system:"Zana voice",none:"Off",assistant:"Zana assistant",openai:"OpenAI",anthropic:"Anthropic",google:"Google AI","google-gemini":"Google Gemini","local-whisper":"Local Whisper (on this device)"};function _o(e,t,o){return e.error?{warn:!0,text:e.error}:e.permissionDenied?{warn:!0,text:"Microphone permission denied. Allow microphone access in system settings to see device names."}:t.micDeviceId!==N&&!o?{warn:!0,text:"Selected microphone is currently disconnected. Recording will fall back to System default until reconnected."}:!e.labelsAvailable&&e.devices.length>0?{warn:!1,text:"Device names are hidden until microphone access is granted. Click Refresh to detect names."}:t.micDeviceId===N?{warn:!1,text:"Uses your OS default input device. Saved selection applies to Prompt Studio and Composer dictation."}:{warn:!1,text:`Using ${o?.label??(t.micLabel||t.micDeviceId)}. Saved until you choose another mic.`}}function Mo({prefs:e,audio:t,onSelect:o}){let r=t.devices.find(d=>d.deviceId===e.micDeviceId),a=e.micDeviceId!==N&&!r,c=_o(t,e,r),p=t.defaultDeviceLabel?`System default (${t.defaultDeviceLabel})`:"System default",s=d=>{if(d===N){o(N,"");return}let u=t.devices.find(g=>g.deviceId===d);o(d,u?.label??e.micLabel)};return l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-mic-select",className:"ps-field-label",children:"Input microphone"}),l("div",{className:"ps-mic-row",children:[l("select",{id:"ps-mic-select","aria-label":"Input microphone",className:"ps-select",value:e.micDeviceId,onChange:d=>s(d.target.value),children:[n("option",{value:N,children:p}),t.devices.map(d=>n("option",{value:d.deviceId,children:d.label},d.deviceId)),a&&n("option",{value:e.micDeviceId,children:`${e.micLabel||e.micDeviceId} (Disconnected)`})]}),n("button",{type:"button",className:"ps-btn",onClick:()=>void t.refresh(!0),disabled:t.isRefreshing,"aria-label":"Refresh microphones",title:"Refresh connected audio input devices",children:t.isRefreshing?"Refreshing\u2026":"\u21BB Refresh"})]}),l("div",{className:"ps-audio-status",role:t.error?"alert":void 0,children:[n("span",{className:`ps-audio-dot ${c.warn?"warn":""}`,"aria-hidden":"true"}),n("span",{children:c.text})]})]})}function Lo({prefs:e,onToggle:t,onVolumeChange:o}){let r=()=>{e.soundCuesEnabled&&_("start",{enabled:!0,volume:e.soundCuesVolume})};return l(F,{children:[l("div",{className:"ps-toggle-card",children:[l("div",{className:"ps-toggle-copy",children:[n("span",{id:"ps-sound-cues-label",className:"ps-toggle-title",children:"Sound cues & chimes"}),n("small",{style:{color:"var(--ps-text-muted)"},children:"Play a subtle chime when dictation starts, finishes, or encounters an error."})]}),n("button",{type:"button",className:"ps-switch",role:"switch","aria-checked":e.soundCuesEnabled,"aria-labelledby":"ps-sound-cues-label",onClick:t})]}),l("div",{className:`ps-volume-card ${e.soundCuesEnabled?"":"disabled"}`,children:[l("div",{className:"ps-volume-header",children:[n("label",{htmlFor:"ps-chime-volume",className:"ps-field-label",children:"Chime volume"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 9px",fontSize:11},disabled:!e.soundCuesEnabled,onClick:r,children:"Test chime"})]}),l("div",{className:"ps-volume-controls",children:[n("input",{id:"ps-chime-volume",type:"range",className:"ps-volume-slider","aria-label":"Chime volume",min:0,max:100,step:5,value:e.soundCuesVolume,disabled:!e.soundCuesEnabled,onChange:a=>o(Number(a.target.value)),onPointerUp:r,onKeyUp:a=>{["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(a.key)&&r()}}),l("span",{className:"ps-volume-pct",children:[e.soundCuesVolume,"%"]})]})]})]})}function Oo({values:e,onSave:t}){let o=H(()=>J(e),[e]),r=Ht();return l("section",{className:"ps-pane",style:{flex:"none"},"aria-labelledby":"ps-audio-feedback-title",children:[l("div",{className:"ps-pane-header",children:[n("h2",{id:"ps-audio-feedback-title",className:"ps-pane-title",style:{margin:0},children:"Audio & Feedback"}),n("button",{type:"button",className:"ps-btn",onClick:()=>t({micDeviceId:N,micLabel:"",soundCuesEnabled:String(!0),soundCuesVolume:String(75)}),children:"Reset"})]}),l("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[n(Mo,{prefs:o,audio:r,onSelect:(p,s)=>t({micDeviceId:p,micLabel:s})}),n(Lo,{prefs:o,onToggle:()=>{let p=!o.soundCuesEnabled;t({soundCuesEnabled:String(p)}),p&&_("start",{enabled:!0,volume:o.soundCuesVolume})},onVolumeChange:p=>t({soundCuesVolume:String(p)})})]})]})}function Uo({terms:e,atLimit:t,onRemove:o,onClearAll:r}){return l(F,{children:[n("div",{className:"ps-dict-well",children:e.length>0?n("ul",{className:"ps-dict-pills","aria-label":"Dictionary terms",children:e.map(a=>l("li",{className:"ps-dict-pill",children:[n("span",{className:"ps-dict-pill-text",children:a}),n("button",{type:"button",className:"ps-dict-pill-remove",onClick:()=>o(a),"aria-label":`Remove ${a}`,title:`Remove ${a}`,children:"\xD7"})]},a))}):n("span",{className:"ps-dict-empty",children:"No terms added yet. Type a term above or paste a comma-separated list."})}),l("div",{className:"ps-dict-footer",children:[l("span",{className:"ps-dict-count",children:[e.length===1?"1 term active":`${e.length} terms active`,t?` (max ${200})`:""]}),n("button",{type:"button",className:"ps-btn ps-dict-clear-btn",onClick:r,disabled:e.length===0,children:"Clear all"})]})]})}function Vo({label:e,help:t,value:o,resetSignal:r,onChange:a}){let[c,p]=v(""),s=H(()=>ot(o),[o]),d=s.length>=200;P(()=>{r>0&&p("")},[r]);let u=()=>{let f=c.trim();if(!f||d)return;let b=Vt(s,f);p(""),b.length!==s.length&&a(rt(b))};return l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-dictionary-input",className:"ps-field-label",children:e}),t&&n("small",{style:{color:"var(--ps-text-muted)"},children:t}),l("div",{className:"ps-dict-container",children:[l("div",{className:"ps-dict-input-row",children:[n("input",{id:"ps-dictionary-input",type:"text",className:"ps-dict-input",value:c,onChange:f=>p(f.target.value),onKeyDown:f=>{f.key==="Enter"&&(f.preventDefault(),u())},onPaste:f=>{let b=f.clipboardData?.getData("text");if(!b||!/[\r\n]/.test(b))return;f.preventDefault();let S=f.currentTarget.selectionStart??c.length,y=f.currentTarget.selectionEnd??c.length;p(c.slice(0,S)+b.replace(/[\r\n]+/g,", ")+c.slice(y))},placeholder:"Type a term and press Enter (or paste comma-separated)...",disabled:d}),n("button",{type:"button",className:"ps-btn ps-btn-primary ps-dict-add-btn",onClick:u,disabled:!c.trim()||d,children:"+ Add"})]}),n(Uo,{terms:s,atLimit:d,onRemove:f=>a(rt(s.filter(b=>b!==f))),onClearAll:()=>{p(""),a("")}})]})]})}function zo({field:e,values:t,resetSignal:o,onSave:r}){if(e.key==="dictionary")return n(Vo,{label:e.label,help:e.help,value:t.dictionary??"",resetSignal:o,onChange:p=>r({dictionary:p})});let a=t[e.key]??at[e.key]??"",c=e.options&&e.key==="inputLanguage"&&a&&!e.options.includes(a)?[...e.options,a]:e.options;return l("label",{className:"ps-field-group",children:[n("span",{className:"ps-field-label",children:e.label}),c?n("select",{className:"ps-select",value:a,onChange:p=>r({[e.key]:p.target.value}),children:c.map(p=>n("option",{value:p,children:No[p]??p},p))}):e.multiline?n("textarea",{className:"ps-custom-prompt-input",value:t[e.key]??"",onChange:p=>r({[e.key]:p.target.value})}):n("input",{type:e.secret?"password":"text",className:"ps-select",value:t[e.key]??"",onChange:p=>r({[e.key]:p.target.value}),placeholder:e.secret?"Enter API key\u2026":void 0}),e.help&&n("small",{style:{color:"var(--ps-text-muted)"},children:e.help})]})}function Wt({rpc:e,onBack:t}){he();let[o,r]=v({}),[a,c]=v("Loading\u2026"),[p,s]=v(null),[d,u]=v(0),g=R(0),f=R({}),b=R(e);b.current=e,P(()=>{let y=!0;return b.current.call(fe).then(T=>{if(!y)return;let h=T||{};f.current=h,r(h),ie(h),c("Saved")}).catch(()=>{y&&c("Could not load settings")}),()=>{y=!1}},[]);let S=y=>{let T=++g.current,h=f.current={...f.current,...y};r(h),ie(h),c("Saving\u2026"),b.current.call(Q,h).then(()=>{T===g.current&&(s(null),c("Saved"))}).catch(()=>{T===g.current&&(s(h),c("Could not save settings."))})};return n("div",{className:"ps-workspace",children:n("main",{className:"ps-editor-canvas",style:{overflowY:"auto"},children:l("div",{style:{width:"100%",maxWidth:760,margin:"0 auto",display:"flex",flexDirection:"column",gap:12},children:[l("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12},children:[l("div",{children:[n("h1",{style:{fontSize:18,margin:"4px 0"},children:"Settings"}),n("span",{style:{color:"var(--ps-text-muted)",fontSize:12},children:"Configure voice and cleanup defaults"})]}),n("button",{className:"ps-btn",onClick:t,children:"\u2190 Back to Studio"})]}),l("div",{style:{color:"var(--ps-text-muted)",fontSize:11},children:[n("span",{role:"status",children:a}),p&&n("button",{className:"ps-btn",onClick:()=>S(p),children:"Retry"})]}),n(Oo,{values:o,onSave:S}),Object.entries(Po).map(([y,T])=>l(wt.Fragment,{children:[l("section",{className:"ps-pane",style:{flex:"none"},children:[l("div",{className:"ps-pane-header",children:[n("h2",{className:"ps-pane-title",style:{margin:0},children:y}),y!=="Connections"&&n("button",{className:"ps-btn",onClick:()=>{y==="Voice & transcription"&&u(h=>h+1),S(Object.fromEntries(T.map(h=>[h.key,at[h.key]??""])))},children:"Reset"})]}),l("div",{style:{display:"flex",flexDirection:"column",gap:14,padding:14},children:[y==="Connections"&&n("p",{children:"Manage API keys in Zana\u2019s Prompt Voice plugin settings."}),T.filter(h=>!(h.key==="customPrompt"&&o.tone!=="custom")).map(h=>n(zo,{field:h,values:o,resetSignal:d,onSave:S},h.key))]})]}),y==="Voice & transcription"&&n(Ut,{rpc:e,sttProvider:o.sttProvider??at.sttProvider,llmProvider:o.llmProvider,onApplyPreset:S})]},y))]})})})}function qt(e){return e?e.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]+/gu)||[]:[]}var Zt=1200;function Kt(e,t){if(!e&&!t)return[];if(e===t)return[{type:"unchanged",text:e}];if(!e)return[{type:"added",text:t}];if(!t)return[{type:"removed",text:e}];let o=qt(e),r=qt(t),a=o.length,c=r.length;if(a>Zt||c>Zt)return[{type:"removed",text:e},{type:"added",text:t}];let p=c+1,s=new Uint32Array((a+1)*p);for(let b=1;b<=a;b++){let S=b*p,y=(b-1)*p,T=o[b-1];for(let h=1;h<=c;h++)if(T===r[h-1])s[S+h]=s[y+(h-1)]+1;else{let k=s[S+(h-1)],B=s[y+h];s[S+h]=k>B?k:B}}let d=[],u=a,g=c;for(;u>0||g>0;){let b=u*p,S=(u-1)*p;u>0&&g>0&&o[u-1]===r[g-1]?(d.push({type:"unchanged",text:o[u-1]}),u--,g--):g>0&&(u===0||s[b+(g-1)]>=s[S+g])?(d.push({type:"added",text:r[g-1]}),g--):u>0&&(g===0||s[b+(g-1)]<s[S+g])&&(d.push({type:"removed",text:o[u-1]}),u--)}d.reverse();let f=[];for(let b of d)f.length>0&&f[f.length-1].type===b.type?f[f.length-1].text+=b.text:f.push({...b});return f}var Fo=`
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
`;async function Yt(e){if(!e)return!1;if(typeof navigator<"u"&&navigator.clipboard&&typeof navigator.clipboard.writeText=="function")try{return await navigator.clipboard.writeText(e),!0}catch{}if(typeof document<"u")try{let t=document.createElement("textarea");t.value=e,t.setAttribute("readonly",""),t.style.position="fixed",t.style.top="-9999px",t.style.left="-9999px",t.style.opacity="0",document.body.appendChild(t),t.focus(),t.select();let o=document.execCommand("copy");if(document.body.removeChild(t),o)return!0}catch{}return!1}var Xt="zcc:prompt-voice:studio-draft:v1",Jt=[{id:"polish",title:"Clean up writing",icon:"\u2728",desc:"Fix punctuation, grammar, and stuttering.",prompt:"Clean up disfluencies, typos, and improve sentence flow without altering intent.",tone:"technical"},{id:"executive",title:"Summarize",icon:"\u26A1",desc:"Condense into punchy bullet points.",prompt:"Summarize the core request into crisp, high-level executive bullet points.",tone:"formal"},{id:"spec",title:"Create a technical spec",icon:"\u{1F4D0}",desc:"Format with Goals, Context, Steps.",prompt:"Transform into a structured technical spec with ## Goal, ## Architecture, and ## Implementation Steps.",tone:"technical"},{id:"chat",title:"Make it conversational",icon:"\u{1F4AC}",desc:"Natural, conversational tone.",prompt:"Rephrase in a warm, polite, and helpful conversational tone.",tone:"conversational"}],$o={system:"Host STT",openai:"OpenAI","google-gemini":"Google Gemini","local-whisper":"Local Whisper"};function Qt(e){return e==="openai"||e==="google-gemini"}var Bo=[{id:"google-gemini",label:"Google Gemini"},{id:"local-whisper",label:"Local Whisper (on this device)"},{id:"openai",label:"OpenAI (Whisper)"},{id:"system",label:"System (Zana Voice)"}],Go=[{id:"anthropic",displayName:"Anthropic",models:[{id:"claude-haiku-4-5-20251001",key:"anthropic-haiku",label:"Claude 4.5 Haiku",providerId:"anthropic"},{id:"claude-sonnet-5-20260201",key:"anthropic-sonnet",label:"Claude 5 Sonnet",providerId:"anthropic"}]},{id:"google",displayName:"Google Gemini",models:[{id:"gemini-2.5-flash",key:"google-flash",label:"Gemini 2.5 Flash",providerId:"google"}]},{id:"openai",displayName:"OpenAI",models:[{id:"gpt-5.4-nano",key:"openai-fast",label:"GPT-5.4 Nano (Fast)",providerId:"openai"},{id:"gpt-5.6-luna",key:"openai-smart",label:"GPT-5.6 Luna (Smart)",providerId:"openai"}]},{id:"assistant",displayName:"Zana Assistant",models:[{id:"assistant",key:"assistant",label:"Local / Active Thread Agent",providerId:"assistant"}]}];function Ho(){try{return xt()}catch{return null}}function en({startSession:e=me}){let[t,o]=v(!1),r=Te(),a=De(),c=Ho(),p=c?.providerId,s=c?.familyId,d=R(!1),[u,g]=v(""),[f,b]=v(""),[S,y]=v(!1),[T,h]=v(!1),[k,B]=v(!1),[ae,Se]=v(null),[te,Le]=v(null),[$,K]=v("assistant"),[ne,M]=v("assistant"),[W,V]=v(null),[oe,st]=v(!0),[lt,nn]=v(null),[xe,Oe]=v(!1),[q,Ae]=v("polish"),[Ce,ct]=v(""),[se,pt]=v(!1),[dt,A]=v(null),[O,Ee]=v("system"),[Ue,Ve]=v(""),[ze,ut]=v(!0),[Fe,re]=v(null),[Y,$e]=v(!1),[on,mt]=v(0),[rn,Be]=v(null),[ft,an]=v(()=>ge()),bt=R(ft);bt.current=ft;let X=R(null),le=R(null),ce=R(null),gt=R(null);P(()=>{try{let i=localStorage.getItem(Xt);if(i){let m=JSON.parse(i);m.inputText&&g(m.inputText),m.outputText&&b(m.outputText),m.selectedProviderId&&K(m.selectedProviderId),m.selectedModelId&&(d.current=!0,M(m.selectedModelId)),m.sttProvider&&Ee(m.sttProvider),m.sttModel&&Ve(m.sttModel)}}catch{}},[]);let Ge=I(i=>{i&&(i.llmProvider&&(V(i.llmProvider),st(i.llmProvider!=="none")),i.sttProvider&&Ee(i.sttProvider),typeof i.sttKeyConfigured=="boolean"&&ut(i.sttKeyConfigured))},[]),He=I(()=>{r.call(ye).then(i=>Ge(i)).catch(()=>{})},[r,Ge]);P(()=>{let i=!0;return r.call(ye).then(m=>{i&&Ge(m)}).catch(()=>{}),()=>{i=!1}},[r]);let vt=R(r);vt.current=r;let pe=R(!0),je=R(0),Re=R(0),ke=I(i=>{an(m=>m.micDeviceId===i.micDeviceId&&m.micLabel===i.micLabel&&m.soundCuesEnabled===i.soundCuesEnabled&&m.soundCuesVolume===i.soundCuesVolume?m:i)},[]),Ie=I(()=>{let i=++je.current;vt.current.call(fe).then(m=>{if(!pe.current||je.current!==i)return;let C=m||{};typeof C.sttProvider=="string"&&C.sttProvider&&Ee(C.sttProvider),typeof C.sttModel=="string"&&C.sttModel&&Ve(C.sttModel),m&&typeof m=="object"&&ke(ie(C))}).catch(()=>{})},[ke]);P(()=>(pe.current=!0,Ie(),()=>{pe.current=!1,je.current++,Re.current++}),[Ie]),P(()=>{let i=!0;return r.call(Ct).then(m=>{if(!i)return;let C=m;Array.isArray(C)&&C.length>0&&Le(C)}).catch(()=>{}),()=>{i=!1}},[r]);let Z=H(()=>{let i=(x,w)=>[...x].sort((L,D)=>w(L).localeCompare(w(D),void 0,{sensitivity:"base",numeric:!0}));if(!te||te.length===0){let x=Go.map(w=>{let L=!!(p&&w.id.toLowerCase()===p.toLowerCase()||s&&w.id.toLowerCase().includes(s.toLowerCase())),D=i(w.models,ue=>ue.label||ue.id).map(ue=>({...ue,isComposerMatch:L}));return{...w,isComposerMatch:L,models:D}});return i(x,w=>w.displayName||w.id)}let m={"assistant:assistant":"assistant","openai:gpt-5.4-nano":"openai-fast","openai:gpt-5.6-luna":"openai-smart","anthropic:claude-haiku-4-5-20251001":"anthropic-haiku","anthropic:claude-sonnet-5-20260201":"anthropic-sonnet","google:gemini-2.5-flash":"google-flash"},C=te.map(x=>{let w=!!(p&&x.providerId.toLowerCase()===p.toLowerCase()||s&&x.providerId.toLowerCase().includes(s.toLowerCase())),L=i(x.models,D=>D.label||D.id).map(D=>{let ue=`${x.providerId}:${D.id}`,kn=m[ue]??D.id;return{id:D.id,key:kn,label:D.label||D.id,providerId:x.providerId,isComposerMatch:w}});return{id:x.providerId,displayName:x.displayName||x.providerId,isComposerMatch:w,models:L}});return i(C,x=>x.displayName||x.id)},[te,p,s]),U=H(()=>Z.find(i=>i.id===$)??Z[0],[Z,$]),de=H(()=>U?.models??[],[U]),G=H(()=>de.find(m=>m.id===ne||m.key===ne)??de[0],[de,ne]);P(()=>{if(!d.current&&Z.length>0){let i=Z.find(m=>m.isComposerMatch);i&&(K(i.id),i.models.length>0&&M(i.models[0].key||i.models[0].id))}},[Z]),P(()=>{try{localStorage.setItem(Xt,JSON.stringify({inputText:u,outputText:f,selectedProviderId:$,selectedModelId:ne,sttProvider:O,sttModel:Ue}))}catch{}},[u,f,$,ne,O,Ue]);let sn=i=>{st(i);let m=i?U?.id??"assistant":"none",C=i?G?.id??"assistant":"";V(m),r.call(Q,{llmProvider:m,llmModel:C}).catch(()=>{A("Could not update cleanup setting.")})},We=i=>{Ee(i),re(null),r.call(Q,{sttProvider:i}).then(()=>He()).catch(()=>{A("Could not update speech provider setting.")})},ln=i=>{Ve(i),r.call(Q,{sttModel:i}).catch(()=>{})},cn=i=>{d.current=!0,K(i);let m=Z.find(x=>x.id===i),C="";if(m&&m.models.length>0){let x=m.models[0].key||m.models[0].id;C=m.models[0].id,M(x)}oe&&(V(i),r.call(Q,{llmProvider:i,llmModel:C}).catch(()=>{}))},pn=i=>{d.current=!0;let m=$,C=i;for(let x of Z){let w=x.models.find(L=>L.id===i||L.key===i);if(w){x.id!==$&&(K(x.id),m=x.id),M(w.key||w.id),C=w.id;break}}oe&&(V(m),r.call(Q,{llmProvider:m,llmModel:C}).catch(()=>{}))};P(()=>()=>{le.current&&clearInterval(le.current),ce.current&&clearInterval(ce.current),X.current&&X.current.cancel()},[]);let dn=H(()=>{let i=u.trim();return`${i?i.split(/\s+/).length:0} words \xB7 ${u.length} chars`},[u]),un=H(()=>{let i=f.trim();return`${i?i.split(/\s+/).length:0} words \xB7 ${f.length} chars`},[f]),mn=H(()=>!f||!xe?[]:Kt(u,f),[u,f,xe]),qe=()=>{le.current&&(clearInterval(le.current),le.current=null),ce.current&&(clearInterval(ce.current),ce.current=null)},fn=()=>{qe(),le.current=setInterval(()=>mt(i=>i+1),1e3),ce.current=setInterval(()=>{X.current&&Be(X.current.getAudioLevel?.()??null)},100)},bn=async i=>{$e(!1),Be(null),qe();let m=X.current;if(X.current=null,!!m){B(!0);try{let C=await m.stop();if(!pe.current)return;_("stop",i);let x=await _e(r,C),w=await r.call(Pe,{audio:x.base64,mimeType:x.mimeType,transcriptionOnly:!0});w.ok&&w.status==="ok"?(_("complete",i),g(L=>be(L,w.text)),re(null)):w.ok&&w.status==="no-speech"?(A("No speech detected. Try speaking closer to the microphone."),setTimeout(()=>A(null),4e3)):w.ok||(_("error",i),A(w.message),re(w.message),w.code==="MISSING_KEY"&&ut(!1))}catch(C){_("error",i),A(C instanceof Error?C.message:"Transcription failed.")}finally{B(!1)}}},gn=async(i,m)=>{if(re(null),A(null),O!=="system"&&!ze){_("error",m);let x=O==="openai"?"OpenAI":"Google Gemini";re(`API key required for direct ${x} speech-to-text. Switch to System (Zana Voice) below to dictate using host voice.`),A(`API key required for ${x}. Switch to System (Zana Voice) to dictate thoughts.`);return}let C=++Re.current;try{let x=_("start",m);if(x&&(await x,!pe.current||Re.current!==C))return;let w=await(i.micDeviceId!==N?e({deviceId:i.micDeviceId}):e());if(!pe.current||Re.current!==C){w.cancel();return}w.onError=L=>{X.current=null,$e(!1),Be(null),qe(),_("error",m),re(L.message),A(L.message)},X.current=w,$e(!0),mt(0),fn()}catch(x){_("error",m),A(x instanceof Error?x.message:"Microphone access denied.")}},vn=I(()=>{o(!1),ke(ge()),Ie(),He()},[Ie,He,ke]),hn=async()=>{let i=bt.current,m={enabled:i.soundCuesEnabled,volume:i.soundCuesVolume};Y?await bn(m):await gn(i,m)},xn=async()=>{let i=u.trim();if(!i||se||q==="custom"&&!Ce.trim())return;let m=Jt.find(D=>D.id===q),C=q==="custom"?Ce.trim():m?.prompt||"Polish and format for clarity.",x=m?.tone||"technical",w=U?.id??"assistant",L=G?.id??"assistant";A(null),pt(!0);try{let D=await r.call(At,{text:i,tone:x,customPrompt:C,llmProvider:w,llmModel:L});D.ok?(b(D.text),nn(`${U?.displayName||w}: ${D.llmModel||L}`)):A(D.message)}catch(D){A(D instanceof Error?D.message:"Refinement request failed.")}finally{pt(!1)}},yn=async()=>{try{let i=await navigator.clipboard.readText();if(!i||!i.trim()){A("Clipboard is empty."),setTimeout(()=>A(null),2500);return}g(m=>be(m,i)),A("Pasted from clipboard into input draft!"),setTimeout(()=>A(null),2500)}catch{A("Clipboard access denied or unavailable."),setTimeout(()=>A(null),2500)}},wn=async()=>{if(!u)return;await Yt(u)?(h(!0),setTimeout(()=>h(!1),2e3),A("Input draft copied to clipboard!"),setTimeout(()=>A(null),2500)):(A("Failed to copy to clipboard."),setTimeout(()=>A(null),3e3))},Sn=async()=>{if(!f)return;await Yt(f)?(y(!0),setTimeout(()=>y(!1),2e3),A("Refined output copied to clipboard!"),setTimeout(()=>A(null),2500)):(A("Failed to copy to clipboard."),setTimeout(()=>A(null),3e3))},An=()=>{!u&&!f||(g(""),b(""),Ae("polish"),ct(""),Oe(!1),A("Studio canvas cleared."),setTimeout(()=>A(null),2500))},Cn=()=>{f&&(g(f),b(""),Oe(!1),A("Refined output moved to input draft."),setTimeout(()=>A(null),2500))},En=()=>{let i=f||u;if(i)try{a.updateText(m=>be(m,i)),a.focus(),Se("Inserted into Composer!"),setTimeout(()=>Se(null),2500)}catch{A("Composer focus unavailable.")}},Rn=I(i=>{(i.ctrlKey||i.metaKey)&&i.key.toLowerCase()==="k"&&(i.preventDefault(),Ae("custom"),setTimeout(()=>gt.current?.focus(),0))},[]);return l("div",{className:"ps-container",onKeyDown:Rn,children:[n("style",{children:Fo}),n("header",{className:"ps-header",children:l("div",{className:"ps-header-left",children:[n("span",{style:{fontSize:18},children:"\u{1F399}\uFE0F"}),n("span",{className:"ps-header-title",children:"Prompt Studio"}),n("span",{className:"ps-badge",children:"Voice & AI Refinement"})]})}),t?n(Wt,{rpc:r,onBack:vn}):l("div",{className:"ps-workspace",children:[l("aside",{className:"ps-sidebar",children:[l("section",{className:"ps-section",children:[l("div",{className:"ps-section-title",children:[n("span",{children:"Voice Dictation"}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:$o[O]??O})]}),l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-stt-provider-select",className:"ps-field-label",children:"Speech Provider"}),n("select",{id:"ps-stt-provider-select",className:"ps-select","aria-label":"Speech-to-text provider",value:O,onChange:i=>{re(null),We(i.target.value)},disabled:Y||k,children:Bo.map(i=>n("option",{value:i.id,children:i.label},i.id))})]}),Qt(O)&&l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-stt-model-input",className:"ps-field-label",children:"Speech Model (Optional)"}),n("input",{id:"ps-stt-model-input",className:"ps-select","aria-label":"Speech-to-text model",placeholder:"Provider default",value:Ue,onChange:i=>ln(i.target.value),disabled:Y||k})]}),Fe&&l("div",{role:"alert",style:{padding:"8px 10px",borderRadius:6,background:"rgba(239, 68, 68, 0.12)",border:"1px solid rgba(239, 68, 68, 0.35)",color:"#fca5a5",fontSize:11,textAlign:"left",lineHeight:1.4,display:"flex",flexDirection:"column",gap:6},children:[l("div",{children:["\u26A0\uFE0F ",Fe]}),Qt(O)&&n("button",{type:"button",className:"ps-btn ps-btn-primary",style:{alignSelf:"flex-start",fontSize:11,padding:"4px 8px"},onClick:()=>We("system"),children:"Switch to System (Zana Voice)"})]}),O!=="system"&&!ze&&!Fe&&l("div",{style:{padding:"8px 10px",borderRadius:6,background:"rgba(234, 179, 8, 0.1)",border:"1px solid rgba(234, 179, 8, 0.3)",color:"#fde047",fontSize:11,textAlign:"left",lineHeight:1.4,display:"flex",flexDirection:"column",gap:6},children:[l("div",{children:["\u2139\uFE0F ",n("strong",{children:"API key required:"})," Direct ",O==="openai"?"OpenAI Whisper":"Google Gemini"," speech-to-text requires an API key in Zana Settings."]}),n("button",{type:"button",className:"ps-btn ps-btn-primary",style:{alignSelf:"flex-start",fontSize:11,padding:"4px 8px"},onClick:()=>We("system"),children:"Switch to System (Zana Voice)"})]}),l("div",{className:"ps-dictation-card",children:[l("button",{type:"button",className:`ps-btn ${Y?"ps-btn-danger":k?"":"ps-btn-primary"}`,style:{width:"100%",justifyContent:"center",padding:"10px 0",opacity:k?.8:1},onClick:hn,disabled:k,"aria-label":k?"Transcribing audio":Y?"Stop dictation":"Start dictation",children:[n("span",{className:k?"ps-spin":void 0,children:k?"\u23F3":Y?"\u23F9\uFE0F":"\u{1F399}\uFE0F"}),n("span",{children:k?"Transcribing...":Y?`Stop Dictation (${on}s)`:"Dictate Thoughts"})]}),Y&&l("div",{style:{width:"100%",display:"flex",flexDirection:"column",gap:4},children:[n("div",{className:"ps-meter-bar",children:n("div",{className:"ps-meter-fill",style:{width:`${Math.min(100,(rn??.1)*100)}%`}})}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:"Listening live..."})]})]}),n("div",{style:{fontSize:10,color:"var(--ps-text-subtle)",lineHeight:1.3},children:O==="system"?"Uses host Zana voice transcription without requiring external API keys.":O==="local-whisper"?"Transcribes on this device. Install the runtime and a model in Settings.":ze?`Using direct ${O==="openai"?"OpenAI Whisper":"Google Gemini"} speech-to-text.`:`\u26A0\uFE0F ${O==="openai"?"OpenAI":"Google Gemini"} requires an API key in Zana Settings. Choose System (Zana Voice) for built-in free dictation.`})]}),l("section",{className:"ps-section",children:[l("div",{className:"ps-section-title",children:[n("span",{children:"Refinement Engine"}),n("span",{style:{fontSize:10,color:"var(--ps-text-muted)"},children:U?.isComposerMatch?"\u2605 Composer Active":"AI Model"})]}),l("div",{className:"ps-field-group",children:[n("label",{htmlFor:"ps-provider-select",className:"ps-field-label",children:"Provider"}),n("select",{id:"ps-provider-select",className:"ps-select","aria-label":"Refinement provider",value:U?.id??"",onChange:i=>cn(i.target.value),disabled:se,children:Z.map(i=>l("option",{value:i.id,children:[i.displayName,i.isComposerMatch?" \u2605 (Composer)":""]},i.id))})]}),l("div",{className:"ps-field-group",children:[l("label",{htmlFor:"ps-model-select",className:"ps-field-label",children:["Model (",de.length,")"]}),n("select",{id:"ps-model-select",className:"ps-select","aria-label":"Refinement model",value:G?.key||G?.id||"",onChange:i=>pn(i.target.value),disabled:se||de.length===0,children:de.map(i=>l("option",{value:i.key||i.id,children:[i.label,i.isComposerMatch?" \u2605 (Composer)":""]},i.key||i.id))})]}),l("div",{style:{marginTop:8,paddingTop:8,borderTop:"1px solid var(--ps-border)",display:"flex",flexDirection:"column",gap:4},children:[l("label",{style:{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:11,fontWeight:500,userSelect:"none"},children:[n("input",{type:"checkbox","aria-label":"Auto-cleanup mic dictations",checked:oe,onChange:i=>sn(i.target.checked)}),n("span",{children:"Auto-cleanup mic dictations"})]}),n("span",{style:{fontSize:10,color:"var(--ps-text-subtle)",lineHeight:1.3},children:oe?`Composer mic cleans up using ${U?.displayName} (${G?.label||G?.id}).`:"Composer mic inserts raw transcript without AI cleanup."})]}),l("div",{style:{marginTop:4,fontSize:11,color:"var(--ps-text-muted)",lineHeight:1.35},children:[U?.isComposerMatch?l("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:600},children:["\u2605 Synced to Composer: ",U.displayName," (",G?.label,")"]}):U?.id==="assistant"?"Uses the active Zana assistant agent with no extra API key required.":l(F,{children:["Using ",n("strong",{children:U?.displayName})," \xB7 ",n("code",{children:G?.id})]}),lt?l("div",{style:{marginTop:3,color:"var(--ps-text-subtle)",fontSize:10},children:["Last refined: ",lt]}):null]})]}),l("section",{className:"ps-section",children:[n("div",{className:"ps-section-title",children:"How should we improve it?"}),l("div",{className:"ps-presets-list",role:"radiogroup","aria-label":"How should we improve it?",children:[Jt.map(i=>l("label",{className:`ps-preset-btn ${q===i.id?"active":""}`,children:[l("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:i.id,checked:q===i.id,onChange:()=>Ae(i.id)}),i.title]}),n("span",{className:"preset-desc",children:i.desc})]},i.id)),l("label",{className:`ps-preset-btn ${q==="custom"?"active":""}`,children:[l("span",{className:"preset-title",children:[n("input",{type:"radio",name:"refinement-style",value:"custom",checked:q==="custom",onChange:()=>Ae("custom")}),"Custom instructions"]}),n("span",{className:"preset-desc",children:"Describe your own transformation."})]})]}),q==="custom"&&n("textarea",{ref:gt,className:"ps-custom-prompt-input","aria-label":"Custom instructions",placeholder:"e.g. Turn into user stories with acceptance criteria...",value:Ce,onChange:i=>ct(i.target.value)})]}),n("button",{type:"button",className:"ps-btn",style:{marginTop:"auto"},onClick:()=>o(!0),children:"Settings"})]}),l("main",{className:"ps-editor-canvas",children:[l("section",{className:"ps-pane",children:[l("div",{className:"ps-pane-header",children:[l("div",{className:"ps-pane-title",children:[n("span",{children:"\u{1F4DD}"}),n("span",{children:"Raw Input Draft"})]}),l("div",{style:{display:"flex",gap:6},children:[n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:yn,title:"Paste from clipboard into input draft","aria-label":"Paste into input draft",children:"\u{1F4CB} Paste"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:wn,disabled:!u,title:"Copy raw input","aria-label":"Copy raw input",children:T?"\u2705 Copied":"\u{1F4CB} Copy"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>g(""),disabled:!u,title:"Clear input",children:"Clear"})]})]}),n("textarea",{className:"ps-textarea",placeholder:"Type your raw thoughts or click Dictate in the left sidebar to speak...",value:u,onChange:i=>g(i.target.value),"aria-label":"Raw Input Text"})]}),l("div",{className:"ps-action-bar",children:[l("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12},children:[n("span",{className:"ps-pill",children:"\u2B07 Refine pipeline"}),n("span",{style:{color:"var(--ps-text-muted)"},children:u.trim()?`${u.trim().split(/\s+/).length} words ready`:"Add text to get started"})]}),n("div",{style:{display:"flex",alignItems:"center",gap:6},children:l("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:()=>xn(),disabled:se||!u.trim()||q==="custom"&&!Ce.trim(),title:"Transform raw draft into polished output",children:[n("span",{children:se?"\u23F3":"\u26A1"}),n("span",{children:se?"Refining...":"Refine text"})]})})]}),l("section",{className:"ps-pane",children:[l("div",{className:"ps-pane-header",children:[l("div",{className:"ps-pane-title",children:[n("span",{children:"\u2728"}),n("span",{children:"Result"})]}),l("div",{style:{display:"flex",gap:6},children:[f&&l("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:()=>Oe(i=>!i),title:"Toggle inline diff against input draft",children:[n("span",{children:xe?"\u{1F441}\uFE0F":"\u{1F50D}"}),n("span",{children:xe?"View Clean":"View Diff"})]}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Cn,disabled:!f,title:"Move output to input draft for iterative re-refinement",children:"\u2B06 Replace Input"}),n("button",{type:"button",className:"ps-btn",style:{padding:"3px 8px",fontSize:11},onClick:Sn,disabled:!f,title:"Copy refined text to clipboard","aria-label":"Copy refined output",children:S?"\u2705 Copied":"\u{1F4CB} Copy"})]})]}),xe&&f?n("div",{className:"ps-output-view",children:mn.map((i,m)=>i.type==="added"?n("span",{className:"ps-diff-added",children:i.text},m):i.type==="removed"?n("span",{className:"ps-diff-removed",children:i.text},m):n("span",{className:"ps-diff-unchanged",children:i.text},m))}):n("textarea",{className:"ps-textarea",placeholder:"Polished, structured output will appear here after clicking Refine...",value:f,onChange:i=>b(i.target.value),"aria-label":"Refined output"})]}),l("div",{className:"ps-action-bar",children:[n("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12},children:ae?n("span",{className:"ps-badge",style:{background:"rgba(34, 197, 94, 0.2)",color:"#86efac"},children:ae}):n("span",{style:{color:"var(--ps-text-muted)"},children:f?"Ready to insert refined result into Composer":u?"Ready to insert raw draft into Composer":"Draft or refine a prompt to insert into Composer"})}),l("div",{style:{display:"flex",alignItems:"center",gap:8},children:[l("button",{type:"button",className:"ps-btn",onClick:An,title:"Clear current input and output",disabled:!u&&!f,children:[n("span",{children:"\u{1F5D1}\uFE0F"}),n("span",{children:"Clear"})]}),l("button",{type:"button",className:"ps-btn ps-btn-primary",onClick:En,disabled:!u&&!f,title:"Append current text directly into Zana Composer",children:[n("span",{children:"\u{1F4AC}"}),n("span",{children:"Insert into Composer"})]})]})]})]})]}),l("footer",{className:"ps-status-bar",children:[l("div",{style:{display:"flex",gap:12},children:[l("span",{children:["Input: ",dn]}),l("span",{children:["Output: ",un]}),dt&&n("span",{style:{color:"var(--accent, #3b82f6)",fontWeight:500},children:dt})]}),l("div",{style:{display:"flex",gap:12,alignItems:"center"},children:[l("span",{children:["Engine: ",U?.displayName," \xB7 ",G?.label]}),l("span",{className:"ps-pill",children:["Mic cleanup: ",oe?`${U?.displayName} (${G?.label||G?.id})`:"Off (Raw)"]}),U?.isComposerMatch&&n("span",{className:"ps-pill",style:{color:"var(--accent, #3b82f6)"},children:"\u2605 Composer Synced"}),n("span",{children:"Zana Prompt Studio"})]})]})]})}var tn="prompt-studio",Oi=ht(e=>{he(),e.composer.customize({id:"prompt-voice-mic",actions:[{id:"prompt-voice-mic",component:Lt}]}),e.slots.navPanel?.({id:"prompt-studio",title:"Prompt Studio",icon:"Sparkles",path:tn,component:en}),e.slots.commandPaletteAction?.({id:"open-prompt-studio",title:"Prompt Studio: Open Canvas",run:t=>{t.navigate?.(`/${tn}`)}})});export{tn as PROMPT_STUDIO_PANEL_PATH,Oi as default};
//# sourceMappingURL=app.js.map
