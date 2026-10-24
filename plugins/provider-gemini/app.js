function S(){return globalThis.__ZCC_PLUGIN_RUNTIME__??{}}function _(t){throw new Error(`${t} is not available until the host plugin runtime is installed`)}function b(t){return{__zccPluginApp:!0,setup:t}}function w(){return S().useRpc?.()??_("useRpc")}var e=globalThis.__ZCC_HOST_REACT__;var T=e.Children,k=e.Component,$=e.Fragment,R=e.StrictMode,N=e.Suspense,j=e.cloneElement,L=e.createContext,G=e.createElement,q=e.createRef,D=e.forwardRef,F=e.isValidElement,O=e.lazy,z=e.memo,H=e.startTransition,g=e.useCallback,V=e.useContext,M=e.useDebugValue,U=e.useDeferredValue,d=e.useEffect,Z=e.useId,B=e.useImperativeHandle,J=e.useInsertionEffect,K=e.useLayoutEffect,W=e.useMemo,Q=e.useReducer,Y=e.useRef,l=e.useState,X=e.useSyncExternalStore,ee=e.useTransition,ne=e.version;var v=`.gemini-settings-panel {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1rem 0;
  max-width: 680px;
  color: var(--text-normal);
}

.gemini-status-card {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding: 1.25rem;
  background-color: var(--background-card, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
  border-radius: var(--radius-md, 8px);
}

.gemini-status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.gemini-status-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.gemini-status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.gemini-status-indicator.ready {
  background-color: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
}

.gemini-status-indicator.warning {
  background-color: #eab308;
  box-shadow: 0 0 8px rgba(234, 179, 8, 0.4);
}

.gemini-status-indicator.checking {
  background-color: #94a3b8;
  animation: gemini-pulse 1.5s infinite;
}

@keyframes gemini-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.gemini-status-label {
  font-weight: 600;
  font-size: 0.95rem;
}

.gemini-version-tag {
  font-size: 0.8rem;
  color: var(--text-muted, #94a3b8);
  background-color: rgba(255, 255, 255, 0.06);
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-sm, 4px);
}

.gemini-desc {
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-muted, #94a3b8);
  margin: 0;
}

.gemini-command-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  background-color: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-sm, 4px);
  font-family: monospace;
  font-size: 0.85rem;
}

.gemini-command-text {
  color: var(--text-normal);
  user-select: all;
  overflow-x: auto;
}

.gemini-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.825rem;
  font-weight: 500;
  border-radius: var(--radius-sm, 4px);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
  background-color: var(--background-hover, rgba(255, 255, 255, 0.08));
  color: var(--text-normal);
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.gemini-btn:hover {
  background-color: rgba(255, 255, 255, 0.14);
  border-color: var(--border-strong, rgba(255, 255, 255, 0.3));
}

.gemini-btn-primary {
  background-color: #2563eb;
  border-color: #3b82f6;
  color: #ffffff;
}

.gemini-btn-primary:hover {
  background-color: #1d4ed8;
  border-color: #60a5fa;
}

.gemini-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.gemini-actions-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

.gemini-steps-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
  background-color: var(--background-card, rgba(255, 255, 255, 0.02));
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-md, 8px);
}

.gemini-steps-title {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-normal);
}

.gemini-steps-list {
  margin: 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-muted, #94a3b8);
  line-height: 1.45;
}
`;var y=globalThis.__ZCC_HOST_REACT__,ie=y.Fragment;function n(t,i,r){return y.createElement(t,r===void 0?i:{...i,key:r})}var o=n;var x="provider-gemini-styles";function E(){if(typeof document>"u"||document.getElementById(x))return;let t=document.createElement("style");t.id=x,t.textContent=v,document.head.appendChild(t)}function P(){let t=w(),[i,r]=l(!1),[s,p]=l(null),[m,f]=l(null);d(()=>{E()},[]);let u=g(async()=>{r(!0);try{let c=await t.call("doctor:status");p(c)}catch(c){p({installed:!1,version:null,executable:"gemini",error:c?.message||"Failed to communicate with plugin server."})}finally{r(!1)}},[t]);d(()=>{u()},[u]);let h=(c,A)=>{typeof navigator<"u"&&navigator.clipboard&&(navigator.clipboard.writeText(c),f(A),setTimeout(()=>f(null),2e3))},a=s?.installed===!0;return o("div",{className:"gemini-settings-panel",children:[o("div",{className:"gemini-status-card",children:[o("div",{className:"gemini-status-header",children:[o("div",{className:"gemini-status-title-row",children:[n("span",{className:`gemini-status-indicator ${i?"checking":a?"ready":"warning"}`}),n("span",{className:"gemini-status-label",children:i?"Checking Gemini CLI...":a?"Gemini CLI Connected":"Gemini CLI Not Detected"}),a&&s?.version&&o("span",{className:"gemini-version-tag",children:["v",s.version]})]}),n("button",{type:"button",className:"gemini-btn",onClick:u,disabled:i,children:i?"Checking...":"Run Doctor Check"})]}),n("p",{className:"gemini-desc",children:"Zana runs threads with your Google AI / Gemini Advanced subscription using the Gemini CLI over the Agent Client Protocol (ACP). Authentication is managed directly by your Google sign-in."}),s?.error&&n("p",{className:"gemini-desc",style:{color:"#f87171"},children:s.error}),a?o("div",{children:[n("p",{className:"gemini-desc",style:{marginBottom:"0.5rem"},children:"To sign in or switch your active Google subscription account, run in your terminal:"}),o("div",{className:"gemini-command-box",children:[n("span",{className:"gemini-command-text",children:"gemini"}),n("button",{type:"button",className:"gemini-btn",onClick:()=>h("gemini","login"),children:m==="login"?"Copied!":"Copy"})]})]}):o("div",{children:[n("p",{className:"gemini-desc",style:{marginBottom:"0.5rem"},children:"Install the Gemini CLI globally via npm to enable this provider:"}),o("div",{className:"gemini-command-box",children:[n("span",{className:"gemini-command-text",children:"npm install -g @google/gemini-cli"}),n("button",{type:"button",className:"gemini-btn",onClick:()=>h("npm install -g @google/gemini-cli","install"),children:m==="install"?"Copied!":"Copy"})]})]})]}),o("div",{className:"gemini-steps-card",children:[n("h4",{className:"gemini-steps-title",children:"Quick Setup Guide"}),o("ol",{className:"gemini-steps-list",children:[n("li",{children:"Install the official Gemini CLI (`npm install -g @google/gemini-cli`)."}),n("li",{children:"Run `gemini` in your terminal to complete your Google account sign-in."}),n("li",{children:'Click "Run Doctor Check" above to verify connectivity.'}),n("li",{children:'Start a new thread in Zana and select "Gemini" from the AI model picker.'})]})]})]})}var ue=b(t=>{t.slots.settingsSection({id:"gemini-provider",title:"Gemini Provider",description:"Configure and verify Google AI subscription access via Gemini CLI",component:P})});export{P as GeminiSettingsSection,ue as default};
