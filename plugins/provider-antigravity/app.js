function S(){return globalThis.__ZCC_PLUGIN_RUNTIME__??{}}function _(o){throw new Error(`${o} is not available until the host plugin runtime is installed`)}function y(o){return{__zccPluginApp:!0,setup:o}}function b(){return S().useRpc?.()??_("useRpc")}var e=globalThis.__ZCC_HOST_REACT__;var T=e.Children,I=e.Component,$=e.Fragment,R=e.StrictMode,N=e.Suspense,L=e.cloneElement,j=e.createContext,D=e.createElement,F=e.createRef,O=e.forwardRef,q=e.isValidElement,z=e.lazy,H=e.memo,G=e.startTransition,v=e.useCallback,M=e.useContext,V=e.useDebugValue,Z=e.useDeferredValue,u=e.useEffect,U=e.useId,B=e.useImperativeHandle,J=e.useInsertionEffect,K=e.useLayoutEffect,W=e.useMemo,Q=e.useReducer,Y=e.useRef,l=e.useState,X=e.useSyncExternalStore,ee=e.useTransition,te=e.version;var w=`.agy-settings-panel {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1rem 0;
  max-width: 680px;
  color: var(--text-normal);
}

.agy-status-card {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding: 1.25rem;
  background-color: var(--background-card, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
  border-radius: var(--radius-md, 8px);
}

.agy-status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.agy-status-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.agy-status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.agy-status-indicator.ready {
  background-color: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
}

.agy-status-indicator.warning {
  background-color: #eab308;
  box-shadow: 0 0 8px rgba(234, 179, 8, 0.4);
}

.agy-status-indicator.checking {
  background-color: #60a5fa;
  animation: agy-pulse 1.5s infinite;
}

.agy-status-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-normal);
}

.agy-version-tag {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  font-family: monospace;
  background-color: var(--background-subtle, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-sm, 4px);
  color: var(--text-muted);
}

.agy-desc {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-muted);
}

.agy-desc-error {
  color: #f87171;
}

.agy-command-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  background-color: var(--background-inset, rgba(0, 0, 0, 0.3));
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-sm, 6px);
  margin-top: 0.5rem;
}

.agy-command-text {
  font-family: monospace;
  font-size: 0.825rem;
  color: var(--text-accent, #93c5fd);
  word-break: break-all;
}

.agy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 500;
  border-radius: var(--radius-sm, 5px);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
  background-color: var(--background-button, rgba(255, 255, 255, 0.08));
  color: var(--text-normal);
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
}

.agy-btn:hover:not(:disabled) {
  background-color: var(--background-button-hover, rgba(255, 255, 255, 0.14));
  border-color: var(--border-hover, rgba(255, 255, 255, 0.25));
}

.agy-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.agy-steps-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
  background-color: var(--background-card, rgba(255, 255, 255, 0.02));
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
  border-radius: var(--radius-md, 8px);
}

.agy-steps-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-normal);
}

.agy-steps-list {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-muted);
}

.agy-steps-list li {
  margin-bottom: 0.375rem;
}

.agy-steps-list code {
  font-family: monospace;
  font-size: 0.8rem;
  padding: 0.1rem 0.3rem;
  background-color: var(--background-subtle, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-sm, 3px);
  color: var(--text-normal);
}

@keyframes agy-pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.9);
  }
}
`;var g=globalThis.__ZCC_HOST_REACT__,re=g.Fragment;function t(o,r,i){return g.createElement(o,i===void 0?r:{...r,key:i})}var n=t;var A="provider-antigravity-styles";function E(){if(typeof document>"u"||document.getElementById(A))return;let o=document.createElement("style");o.id=A,o.textContent=w,document.head.appendChild(o)}function P(){let o=b(),[r,i]=l(!1),[s,p]=l(null),[m,f]=l(null);u(()=>{E()},[]);let d=v(async()=>{i(!0);try{let c=await o.call("doctor:status");p(c)}catch(c){p({installed:!1,version:null,executable:"agy",error:c?.message||"Failed to communicate with plugin server."})}finally{i(!1)}},[o]);u(()=>{d()},[d]);let h=(c,x)=>{typeof navigator<"u"&&navigator.clipboard&&(navigator.clipboard.writeText(c),f(x),setTimeout(()=>f(null),2e3))},a=s?.installed===!0;return n("div",{className:"agy-settings-panel",children:[n("div",{className:"agy-status-card",children:[n("div",{className:"agy-status-header",children:[n("div",{className:"agy-status-title-row",children:[t("span",{className:`agy-status-indicator ${r?"checking":a?"ready":"warning"}`}),t("span",{className:"agy-status-label",children:r?"Checking Antigravity CLI...":a?"Antigravity CLI Connected":"Antigravity CLI Not Detected"}),a&&s?.version&&n("span",{className:"agy-version-tag",children:["v",s.version]})]}),t("button",{type:"button",className:"agy-btn",onClick:d,disabled:r,children:r?"Checking...":"Run Doctor Check"})]}),n("p",{className:"agy-desc",children:["Zana runs threads using your Google Antigravity account via the Antigravity CLI (",t("code",{children:"agy"}),"). Access Gemini 4 Argon, Gemini 3.8 Flash, Claude Opus 5.5, and more directly in your workspace."]}),s?.error&&t("p",{className:"agy-desc agy-desc-error",children:s.error}),a?n("div",{children:[t("p",{className:"agy-desc",children:"To check active models and subscription quota from your terminal, run:"}),n("div",{className:"agy-command-box",children:[t("span",{className:"agy-command-text",children:"agy models"}),t("button",{type:"button",className:"agy-btn",onClick:()=>h("agy models","models"),children:m==="models"?"Copied!":"Copy"})]})]}):n("div",{children:[n("p",{className:"agy-desc",children:["Make sure Antigravity CLI (",t("code",{children:"agy"}),") is installed and available in your PATH:"]}),n("div",{className:"agy-command-box",children:[t("span",{className:"agy-command-text",children:"agy --version"}),t("button",{type:"button",className:"agy-btn",onClick:()=>h("agy --version","version"),children:m==="version"?"Copied!":"Copy"})]})]})]}),n("div",{className:"agy-steps-card",children:[t("h4",{className:"agy-steps-title",children:"Quick Setup Guide"}),n("ol",{className:"agy-steps-list",children:[n("li",{children:["Ensure the official Antigravity CLI (",t("code",{children:"agy"}),") is installed on your machine."]}),n("li",{children:["Run ",t("code",{children:"agy"})," in your terminal once to authenticate with your Google account."]}),t("li",{children:'Click "Run Doctor Check" above to verify your local connectivity.'}),n("li",{children:["In Zana, select ",t("strong",{children:"Antigravity"})," from the AI model picker to start a thread."]})]})]})]})}var de=y(o=>{o.slots.settingsSection({id:"antigravity-provider",title:"Antigravity Provider",description:"Configure and verify Google Antigravity access via Antigravity CLI (agy)",component:P})});export{P as AntigravitySettingsSection,de as default};
