function A(){return globalThis.__ZCC_PLUGIN_RUNTIME__??{}}function b(e){throw new Error(`${e} is not available until the host plugin runtime is installed`)}function v(e){return{__zccPluginApp:!0,setup:e}}function _(){return A().useRpc?.()??b("useRpc")}function x(){return A().useComposer?.()??b("useComposer")}var F=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4"];var d=class extends Error{code;constructor(t,n){super(n),this.name="RecordingError",this.code=t}};function j(e){return F.find(t=>e(t))??null}var B="audio/webm";function H(){return{getUserMedia:e=>navigator.mediaDevices.getUserMedia(e),createRecorder:(e,t)=>new MediaRecorder(e,t?{mimeType:t}:void 0),isTypeSupported:e=>typeof MediaRecorder<"u"&&MediaRecorder.isTypeSupported(e)}}async function V(e){try{return await e.getUserMedia({audio:!0})}catch(t){let n=t instanceof Error?t.name:"";throw n==="NotAllowedError"||n==="SecurityError"?new d("MIC_DENIED","Microphone access was denied. Allow it for Zana in system settings, then try again."):new d("MIC_UNAVAILABLE","No microphone is available. Connect one and try again.")}}function G(e){return new Promise((t,n)=>{let o=new FileReader;o.onload=()=>{let r=typeof o.result=="string"?o.result:"";t(r.slice(r.indexOf(",")+1))},o.onerror=()=>n(new d("RECORDING_FAILED","The recording could not be read.")),o.readAsDataURL(e)})}async function q(e,t){let n=new Blob(e,{type:t});return{base64:await G(n),mimeType:n.type||t}}function z(e,t){if(!(e>0&&Number.isFinite(e)))return()=>{};let n=setTimeout(t,e);return()=>clearTimeout(n)}var Z="That recording is too large to transcribe. Keep dictation shorter and try again.";function Y(e,t){let n=Math.max(t,e),o=[],r=0,c=!1;return{chunks:o,get overflowed(){return c},add(s){return s.size===0||c?"ignored":r+s.size>n?(c=!0,"overflow"):(o.push(s),r+=s.size,r>=e?"limit-reached":"accepted")}}}function X(e,t){let n=new Promise((o,r)=>{e.onstop=()=>o(),e.onerror=()=>{let c=new d("RECORDING_FAILED","Recording stopped unexpectedly. Try again.");t(c),r(c)}});return n.catch(()=>{}),n}function J(e,t,n,o){let r=X(e,o);return e.ondataavailable=c=>{let s=t.add(c.data);(s==="limit-reached"||s==="overflow")&&n()},e.start(1e3),r}async function K(e,t,n,o){try{await e}finally{t()}if(n.overflowed)throw new d("RECORDING_FAILED",Z);return q(n.chunks,o)}function W(e){let t=()=>{};return{stopRecorder(){t(),e.state!=="inactive"&&e.stop()},armTimer(n,o){t=z(n,o)}}}function Q(e,t){let n=null;return{attach(o){n=o},detach(){n=null},autoStop(){e();let o=n?.onAutoStop;n&&(n.onAutoStop=void 0),o?.()},fail(o){e(),t();let r=n?.onError;n=null,r?.(o)}}}function ee(e,t,n,o){let r=Y(o.maxBytes??9437184,o.hardMaxBytes??10485760),{stopRecorder:c,armTimer:s}=W(e),a=Q(c,t);s(o.maxDurationMs??12e4,a.autoStop);let u=J(e,r,a.autoStop,a.fail),p={onError:o.onError,onAutoStop:o.onAutoStop,async stop(){c();try{return await K(u,t,r,e.mimeType||n)}finally{a.detach()}},cancel(){c(),t(),a.detach()}};return a.attach(p),p}var w=()=>te();async function te(e=H(),t={}){let n=await V(e),o=()=>n.getTracks().forEach(r=>r.stop());try{let r=j(e.isTypeSupported)??B,c=e.createRecorder(n,r);return ee(c,o,r,t)}catch(r){throw o(),r instanceof d?r:new d("RECORDING_FAILED",r instanceof Error?r.message:"The recording could not be started.")}}var i=globalThis.__ZCC_HOST_REACT__;var Ee=i.Children,we=i.Component,Re=i.Fragment,ye=i.StrictMode,Ae=i.Suspense,be=i.cloneElement,ve=i.createContext,_e=i.createElement,xe=i.createRef,ge=i.forwardRef,Te=i.isValidElement,Ce=i.lazy,Ie=i.memo,Pe=i.startTransition,l=i.useCallback,De=i.useContext,Le=i.useDebugValue,Ne=i.useDeferredValue,g=i.useEffect,Oe=i.useId,Me=i.useImperativeHandle,ke=i.useInsertionEffect,$e=i.useLayoutEffect,Ue=i.useMemo,T=i.useReducer,S=i.useRef,Fe=i.useState,je=i.useSyncExternalStore,Be=i.useTransition,He=i.version;var C="promptVoice.transcribe";function I(e,t){let n=t.trim();return n?e?/\s$/.test(e)?`${e}${n}`:`${e} ${n}`:n:e}var ne="No speech detected.",y={phase:"idle",notice:null,error:null};function P(e,t){switch(t.type){case"START":return e.phase==="idle"||e.phase==="error"?{phase:"recording",notice:null,error:null}:e;case"STOP":return e.phase==="recording"?{phase:"processing",notice:null,error:null}:e;case"CANCEL":return e.phase==="recording"?{...y}:e;case"SUCCESS":case"NO_SPEECH":return e.phase!=="processing"?e:{phase:"idle",notice:t.type==="NO_SPEECH"?ne:t.notice,error:null};case"FAILURE":return{phase:"error",notice:null,error:t.message}}}var oe="Prompt Voice returned an unexpected response. Try again.",re="Dictation failed. Try again.";function ie(e){return typeof e=="object"&&e!==null&&typeof e.ok=="boolean"}async function ce(e,t){let n=await e.call(C,{audio:t.base64,mimeType:t.mimeType});if(!ie(n))throw new Error(oe);return n}function D(e){return e instanceof Error&&e.message?e.message:re}function se(e,t,n){if(!e.ok){n({type:"FAILURE",message:e.message});return}if(e.status==="no-speech"){n({type:"NO_SPEECH"});return}t.updateText(r=>I(r,e.text)),t.focus();let o=e.refineNotice?`Inserted the raw transcript. ${e.refineNotice.message}`:null;n({type:"SUCCESS",notice:o})}function ae(e,t,n,o){return t()?(e.onError=r=>{t()&&o(r)},e.onAutoStop=()=>{t()&&n()},e):(e.cancel(),null)}function ue(e,t,n,o,r){let c=s=>r({type:"FAILURE",message:D(s)});return e.then(s=>{let a=ae(s,n,o,u=>{t.current=null,c(u)});return a&&(t.current=a),a},s=>(n()&&c(s),null))}function pe(e,t){let n=S(null),o=S(null),r=S(0),c=S(!0),s=l(()=>{r.current++,o.current=null,n.current&&(n.current.cancel(),n.current=null),t({type:"CANCEL"})},[t]);g(()=>(c.current=!0,()=>{c.current=!1,s()}),[s]);let a=l(async()=>{let m=o.current?await o.current:n.current;return n.current=null,m},[]),u=l(async m=>{let R=++r.current,E=()=>c.current&&r.current===R,f=ue(e(),n,E,m,t);o.current=f,await f,o.current===f&&(o.current=null)},[t,e]),p=l(()=>c.current,[]);return{start:u,takeSession:a,cancel:s,isMounted:p}}function L({startSession:e=w}={}){let t=x(),n=_(),[o,r]=T(P,y),{start:c,takeSession:s,cancel:a,isMounted:u}=pe(e,r),p=l(async()=>{r({type:"STOP"});let E=await s();if(!(!u()||!E))try{let f=await E.stop();if(!u())return;let U=await ce(n,f);if(!u())return;se(U,t,r)}catch(f){if(!u())return;r({type:"FAILURE",message:D(f)})}},[t,u,n,s]),m=l(async()=>{r({type:"START"}),await c(()=>void p())},[p,c]),R=l(()=>{o.phase==="recording"?p():o.phase!=="processing"&&m()},[m,p,o.phase]);return{phase:o.phase,error:o.error,notice:o.notice,onClick:R,cancel:a,beginDictation:m,finishDictation:p}}var N=globalThis.__ZCC_HOST_REACT__,et=N.Fragment;function h(e,t,n){return N.createElement(e,n===void 0?t:{...t,key:n})}var O=h;var de="Dictation",le={idle:"Start dictation",recording:"Stop dictation",processing:"Transcribing",error:"Start dictation"};function M({startSession:e=w}){let{phase:t,error:n,notice:o,onClick:r}=L({startSession:e});return O("div",{className:"pv-mic",children:[h("button",{type:"button",className:`pv-mic-button pv-mic-${t}`,"aria-label":de,"aria-pressed":t==="recording",title:le[t],disabled:t==="processing",onClick:r,children:h("svg",{viewBox:"0 0 24 24",width:"16",height:"16","aria-hidden":"true",focusable:"false",children:h("path",{d:"M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5Zm6 9h2v-3h-2v3Z",fill:"currentColor"})})}),t==="error"&&n?h("span",{role:"alert",className:"pv-mic-message pv-mic-error",children:n}):null,t==="idle"&&o?h("span",{role:"status",className:"pv-mic-message",children:o}):null]})}var k=`/* Uses host design tokens only. Fall back to neutral values when a token is missing. */
.pv-mic {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.pv-mic-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--border-color, #d0d0d0);
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary, inherit);
  cursor: pointer;
}

.pv-mic-button:focus-visible {
  outline: 2px solid var(--focus-ring, #4a90e2);
  outline-offset: 2px;
}

.pv-mic-button:disabled {
  opacity: 0.5;
  cursor: progress;
}

.pv-mic-recording {
  color: var(--danger-color, #d33);
  border-color: currentColor;
}

.pv-mic-message {
  font-size: 12px;
  color: var(--text-secondary, inherit);
}

.pv-mic-error {
  color: var(--danger-color, #d33);
}
`;var $="zcc-ext-prompt-voice-styles";function fe(){if(typeof document>"u"||document.getElementById($))return;let e=document.createElement("style");e.id=$,e.textContent=k,document.head.appendChild(e)}var pt=v(e=>{fe(),e.composer.customize({id:"prompt-voice-mic",actions:[{id:"prompt-voice-mic",component:M}]})});export{pt as default};
//# sourceMappingURL=app.js.map
