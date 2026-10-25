function z(){return globalThis.__ZCC_PLUGIN_RUNTIME__??{}}function M(a){throw new Error(`${a} is not available until the host plugin runtime is installed`)}function _(a){return{__zccPluginApp:!0,setup:a}}function C(){return z().useRpc?.()??M("useRpc")}var t=globalThis.__ZCC_HOST_REACT__;var B=t.Children,J=t.Component,K=t.Fragment,W=t.StrictMode,Q=t.Suspense,Y=t.cloneElement,X=t.createContext,ee=t.createElement,te=t.createRef,ne=t.forwardRef,oe=t.isValidElement,re=t.lazy,ae=t.memo,se=t.startTransition,E=t.useCallback,ie=t.useContext,ce=t.useDebugValue,le=t.useDeferredValue,v=t.useEffect,de=t.useId,ue=t.useImperativeHandle,pe=t.useInsertionEffect,me=t.useLayoutEffect,fe=t.useMemo,he=t.useReducer,ge=t.useRef,m=t.useState,be=t.useSyncExternalStore,ye=t.useTransition,ve=t.version;var P=`.agy-settings-panel {
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
  flex-wrap: wrap;
  gap: 0.75rem;
}

.agy-status-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.agy-actions-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
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

.agy-backend-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background-color: rgba(96, 165, 250, 0.15);
  border: 1px solid rgba(96, 165, 250, 0.3);
  border-radius: var(--radius-sm, 4px);
  color: #93c5fd;
}

.agy-state-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: var(--radius-sm, 4px);
  background-color: var(--background-subtle, rgba(255, 255, 255, 0.08));
  color: var(--text-muted);
}

.agy-state-pill.state-session_ready,
.agy-state-pill.state-authenticated {
  background-color: rgba(34, 197, 94, 0.15);
  color: #4ade80;
}

.agy-state-pill.state-sign_in_required,
.agy-state-pill.state-runtime_launches {
  background-color: rgba(234, 179, 8, 0.15);
  color: #facc15;
}

.agy-state-pill.state-runtime_missing {
  background-color: rgba(248, 113, 113, 0.15);
  color: #f87171;
}

.agy-readiness-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.agy-readiness-step {
  font-size: 0.72rem;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm, 4px);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
  color: var(--text-muted);
  opacity: 0.65;
}

.agy-readiness-step.passed {
  border-color: rgba(34, 197, 94, 0.35);
  color: #86efac;
  opacity: 0.9;
}

.agy-readiness-step.active {
  border-color: rgba(96, 165, 250, 0.5);
  background-color: rgba(96, 165, 250, 0.12);
  color: var(--text-normal);
  font-weight: 600;
  opacity: 1;
}

.agy-models-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.375rem;
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

.agy-desc-note {
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm, 6px);
  background-color: rgba(234, 179, 8, 0.08);
  border: 1px solid rgba(234, 179, 8, 0.25);
  color: #fde047;
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

.agy-btn-primary {
  background-color: rgba(59, 130, 246, 0.22);
  border-color: rgba(96, 165, 250, 0.45);
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
`;var k=globalThis.__ZCC_HOST_REACT__,xe=k.Fragment;function e(a,s,f){return k.createElement(a,f===void 0?s:{...s,key:f})}var r=e;var N="provider-antigravity-styles";function H(){if(typeof document>"u"||document.getElementById(N))return;let a=document.createElement("style");a.id=N,a.textContent=P,document.head.appendChild(a)}var w={runtime_missing:"Runtime Missing",runtime_launches:"Runtime Launches",sign_in_required:"Sign-In Required",authenticated:"Authenticated",session_ready:"Session Ready"},A=["runtime_missing","runtime_launches","sign_in_required","authenticated","session_ready"];function U(){let a=C(),[s,f]=m(!1),[i,c]=m(null),[x,l]=m(null),[o,p]=m(null),[R,S]=m(null);v(()=>{H()},[]);let g=E(async(n=!1)=>{f(!0),l(null);try{let u=await a.call("doctor:status",n?{probeNative:!0,forceRefresh:!0}:null);p(u)}catch(u){p({installed:!1,authenticated:!1,ready:!1,version:null,pinnedVersion:"1.4.3",previousVersion:null,source:"uninstalled",executable:"agy_acp_server",companionFilesPresent:!1,missingCompanionFiles:[],state:"runtime_missing",authMethod:"oauth-personal",configuredAuthType:null,pendingAuthUrl:null,models:[],modes:[],tierName:null,disabledDeadMcpServers:[],error:u?.message||"Failed to communicate with plugin server."})}finally{f(!1)}},[a]);v(()=>{g(!1)},[g]);let T=async()=>{c("install"),l(null);try{let n=await a.call("runtime:install");p(n)}catch(n){l(n?.message||"Failed to install Google Native ACP runtime.")}finally{c(null)}},I=async()=>{c("rollback"),l(null);try{let n=await a.call("runtime:rollback");p(n)}catch(n){l(n?.message||"Failed to roll back Native ACP runtime.")}finally{c(null)}},$=async()=>{c("login"),l(null);try{let n=await a.call("auth:login");p(n)}catch(n){l(n?.message||"Interactive Google sign-in failed.")}finally{c(null)}},j=async()=>{c("logout"),l(null);try{let n=await a.call("auth:logout");p(n)}catch(n){l(n?.message||"Failed to clear native ACP authentication.")}finally{c(null)}},L=async()=>{c("probe"),await g(!0),c(null)},D=(n,u)=>{typeof navigator<"u"&&navigator.clipboard&&(navigator.clipboard.writeText(n),S(u),setTimeout(()=>S(null),2e3))},d=o?.state??"runtime_missing",b=o?.installed===!0,y=d==="session_ready"||d==="authenticated",h=o?.pinnedVersion??"1.4.3",F=s?"Checking Antigravity Native ACP...":y?"Antigravity Native ACP Connected":`Antigravity Native ACP (${w[d]})`;return r("div",{className:"agy-settings-panel",children:[r("div",{className:"agy-status-card",children:[r("div",{className:"agy-status-header",children:[r("div",{className:"agy-status-title-row",children:[e("span",{className:`agy-status-indicator ${s||i?"checking":y?"ready":"warning"}`}),e("span",{className:"agy-status-label",children:F}),e("span",{className:"agy-version-tag",children:b?`v${o?.version??h}`:`Pinned v${h}`}),o?.tierName&&e("span",{className:"agy-backend-badge",children:o.tierName}),e("span",{className:`agy-state-pill state-${d}`,children:w[d]})]}),r("div",{className:"agy-actions-row",children:[e("button",{type:"button",className:"agy-btn",onClick:T,disabled:s||i!==null,children:i==="install"?"Installing...":b?`Reinstall Runtime (v${h})`:`Install Native ACP Runtime (v${h})`}),o?.previousVersion&&e("button",{type:"button",className:"agy-btn",onClick:I,disabled:s||i!==null,children:i==="rollback"?"Rolling back...":`Rollback to v${o.previousVersion}`})]})]}),e("div",{className:"agy-readiness-steps",children:A.map(n=>{let u=A.indexOf(d),O=A.indexOf(n),V=n===d,q=O<u&&d!=="runtime_missing";return e("span",{className:`agy-readiness-step ${V?"active":q?"passed":""}`,children:w[n]},n)})}),r("p",{className:"agy-desc",children:["Runs Zana threads directly over Google's official Native ACP server (",e("code",{children:"agy_acp_server"})," + ",e("code",{children:"localharness_external"}),"). Auth method:"," ",e("code",{children:o?.authMethod??"oauth-personal"}),o?.configuredAuthType?` (configured: ${o.configuredAuthType})`:" (not yet configured)"]}),(o?.error||x)&&e("p",{className:"agy-desc agy-desc-error",children:x||o?.error}),b&&r("div",{className:"agy-actions-row",children:[e("button",{type:"button",className:"agy-btn agy-btn-primary",onClick:$,disabled:s||i!==null,children:i==="login"?"Waiting for Google Sign-In in Browser...":y?"Re-authenticate with Google":"Sign In with Google"}),e("button",{type:"button",className:"agy-btn",onClick:L,disabled:s||i!==null,children:i==="probe"?"Verifying Session...":"Verify Session & Models"}),o?.configuredAuthType&&e("button",{type:"button",className:"agy-btn",onClick:j,disabled:s||i!==null,children:"Clear Auth Selection"})]}),o?.pendingAuthUrl&&r("div",{children:[e("p",{className:"agy-desc",children:"If your browser did not open automatically, copy this OAuth link:"}),r("div",{className:"agy-command-box",children:[e("span",{className:"agy-command-text",children:o.pendingAuthUrl}),e("button",{type:"button",className:"agy-btn",onClick:()=>D(o.pendingAuthUrl,"oauth"),children:R==="oauth"?"Copied!":"Copy URL"})]})]}),o&&o.models.length>0&&r("div",{children:[r("p",{className:"agy-desc",children:["Available Native ACP models (",o.models.length,"):"]}),e("div",{className:"agy-models-list",children:o.models.map(n=>r("span",{className:"agy-version-tag",children:[n.name," (",n.id,")"]},n.id))})]}),o&&o.disabledDeadMcpServers.length>0&&r("p",{className:"agy-desc agy-desc-note",children:["Automatically bypassed unreachable IDE named-pipe MCP proxies (",e("code",{children:o.disabledDeadMcpServers.join(", ")}),") to prevent 38s prompt stalls."]})]}),r("div",{className:"agy-steps-card",children:[e("h4",{className:"agy-steps-title",children:"Quick Setup Guide"}),r("ol",{className:"agy-steps-list",children:[r("li",{children:["Click ",e("strong",{children:"Install Native ACP Runtime"})," above to download and verify Google's official SHA-256 ACP archive (",e("code",{children:"agy_acp_server"})," +"," ",e("code",{children:"localharness_external"}),")."]}),r("li",{children:["Select your ",e("strong",{children:"Google ACP authentication method"})," above (default:"," ",e("code",{children:"oauth-personal"}),") and click ",e("strong",{children:"Sign In with Google"}),"."]}),r("li",{children:["Start a new thread in Zana and select ",e("strong",{children:"Antigravity"})," as the provider."]})]})]})]})}var ke=_(a=>{a.slots.settingsSection({id:"antigravity-provider",title:"Antigravity Provider",description:"Configure Google Antigravity via Google Native ACP server (agy_acp_server)",component:U})});export{U as AntigravitySettingsSection,ke as default};
