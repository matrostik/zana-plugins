function M(){return globalThis.__ZCC_PLUGIN_RUNTIME__??{}}function V(t){throw new Error(`${t} is not available until the host plugin runtime is installed`)}function N(t){return{__zccPluginApp:!0,setup:t}}function S(){return M().useRpc?.()??V("useRpc")}var i=globalThis.__ZCC_HOST_REACT__;var ne=i.Children,oe=i.Component,ae=i.Fragment,se=i.StrictMode,ie=i.Suspense,re=i.cloneElement,ce=i.createContext,le=i.createElement,ue=i.createRef,de=i.forwardRef,pe=i.isValidElement,me=i.lazy,fe=i.memo,ge=i.startTransition,_=i.useCallback,he=i.useContext,ye=i.useDebugValue,be=i.useDeferredValue,v=i.useEffect,ve=i.useId,xe=i.useImperativeHandle,we=i.useInsertionEffect,Se=i.useLayoutEffect,Ae=i.useMemo,Re=i.useReducer,y=i.useRef,h=i.useState,_e=i.useSyncExternalStore,Ce=i.useTransition,ke=i.version;var A=`.agy-account-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.agy-account-panel h2 {
  font-size: 16px;
  margin: 0;
}

.agy-account-panel .agy-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.agy-settings-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 680px;
}

.agy-status-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px solid var(--border-default, #2a2a2a);
  background: var(--bg-surface, #141414);
}

.agy-status-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.agy-status-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.agy-status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.agy-status-indicator.ready {
  background: var(--success, #22c55e);
}

.agy-status-indicator.warning {
  background: var(--warning, #eab308);
}

.agy-status-indicator.checking {
  background: var(--accent, #3b82f6);
  animation: agy-pulse 1s infinite alternate;
}

.agy-status-label {
  font-weight: 600;
  font-size: 14px;
}

.agy-version-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--bg-subtle, #222);
  color: var(--fg-muted, #888);
}

.agy-backend-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  font-weight: 500;
}

.agy-state-pill {
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 4px;
  font-weight: 500;
}

.agy-state-pill.state-session_ready {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
}

.agy-state-pill.state-authenticated,
.agy-state-pill.state-sign_in_required {
  background: rgba(234, 179, 8, 0.15);
  color: #facc15;
}

.agy-state-pill.state-runtime_launches {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
}

.agy-state-pill.state-runtime_missing {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.agy-actions-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.agy-btn {
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-default, #333);
  background: var(--bg-subtle, #1f1f1f);
  color: var(--fg-default, #eee);
  cursor: pointer;
}

.agy-btn-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.agy-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.agy-btn-primary {
  background: var(--accent, #2563eb);
  border-color: var(--accent, #2563eb);
  color: #fff;
}

.agy-spinner {
  width: 12px;
  height: 12px;
  display: inline-block;
  flex-shrink: 0;
  animation: agy-spin 0.85s linear infinite;
}

.agy-refresh-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.agy-readiness-steps {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin: 4px 0;
}

.agy-readiness-step {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  background: var(--bg-subtle, #1a1a1a);
  color: var(--fg-muted, #666);
  border: 1px solid transparent;
}

.agy-readiness-step.passed {
  color: var(--fg-muted, #888);
  border-color: var(--border-subtle, #2a2a2a);
}

.agy-readiness-step.active {
  color: #fff;
  background: var(--border-default, #333);
  font-weight: 600;
  border-color: var(--accent, #3b82f6);
}

.agy-desc {
  font-size: 12px;
  color: var(--fg-muted, #999);
  margin: 0;
  line-height: 1.5;
}

.agy-desc-error {
  color: var(--error, #f87171);
}

.agy-desc-note {
  color: var(--accent, #60a5fa);
  font-size: 11px;
}

.agy-command-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--bg-input, #0d0d0d);
  border: 1px solid var(--border-subtle, #222);
  font-family: monospace;
  font-size: 11px;
  margin-top: 6px;
}

.agy-command-text {
  word-break: break-all;
}

.agy-models-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.agy-usage-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--border-subtle, #333);
  border-radius: 6px;
  margin: 12px 0;
}

.agy-usage-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}

.agy-usage-card h4 {
  margin: 0;
}

.agy-usage-list {
  padding-left: 20px;
  font-size: 12px;
  line-height: 1.7;
  margin: 0;
}

.agy-steps-card {
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, #222);
  background: var(--bg-card, #111);
}

.agy-steps-title {
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--fg-default, #ddd);
}

.agy-steps-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: var(--fg-muted, #888);
  line-height: 1.6;
}

@keyframes agy-pulse {
  0% {
    opacity: 0.4;
  }
  100% {
    opacity: 1;
  }
}

@keyframes agy-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
`;var E=globalThis.__ZCC_HOST_REACT__,C=E.Fragment;function n(t,e,o){return E.createElement(t,o===void 0?e:{...e,key:o})}var a=n;var k={runtime_missing:"Runtime Missing",runtime_launches:"Runtime Installed",sign_in_required:"Sign-in Required",authenticated:"Unverified Credentials",session_ready:"Session Ready"},I=["runtime_missing","runtime_launches","sign_in_required","authenticated","session_ready"];function U({className:t,size:e=14}){return a("svg",{fill:"currentColor",viewBox:"0 0 24 24",xmlns:"http://www.w3.org/2000/svg",className:t,width:e,height:e,children:[n("title",{children:"Antigravity"}),n("path",{fillRule:"evenodd",clipRule:"evenodd",d:"M12 1.5a.8.8 0 0 1 .72.47c.83 2.27 1.99 4.24 3.62 5.87s3.6 2.79 5.87 3.62a.8.8 0 0 1 0 1.44c-2.27.83-4.24 1.99-5.87 3.62s-2.79 3.6-3.62 5.87a.8.8 0 0 1-1.44 0c-.83-2.27-1.99-4.24-3.62-5.87s-3.6-2.79-5.87-3.62a.8.8 0 0 1 0-1.44c2.27-.83 4.24-1.99 5.87-3.62s2.79-3.6 3.62-5.87A.8.8 0 0 1 12 1.5Z"})]})}function P({label:t,spinning:e=!0}){return a("svg",{className:e?"agy-spinner":void 0,width:"12",height:"12",style:{width:12,height:12,flexShrink:0,display:"inline-block"},viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.75",strokeLinecap:"round","aria-hidden":t?void 0:!0,role:t?"img":void 0,"aria-label":t,children:[n("path",{d:"M13.5 8a5.5 5.5 0 1 1-1.6-3.9"}),n("path",{d:"M13.5 2.5v2.75H10.75"})]})}function z(t,e,o,r){return{handleInstallRuntime:async()=>{o("install"),r(null);try{let c=await t.call("runtime:install");e(c)}catch(c){r(c?.message||"Failed to install Google Native ACP runtime.")}finally{o(null)}},handleRollbackRuntime:async()=>{o("rollback"),r(null);try{let c=await t.call("runtime:rollback");e(c)}catch(c){r(c?.message||"Failed to roll back Native ACP runtime.")}finally{o(null)}}}}function R(t){t.current&&(clearInterval(t.current),t.current=null)}function T(t,e,o,r,l){return{handleSignIn:async()=>{o("login"),r(null),R(l),l.current=setInterval(async()=>{try{let s=await t.call("doctor:status");s.pendingAuthUrl&&e(s)}catch{}},1200);try{let s=await t.call("auth:login");e(s)}catch(s){r(s?.message||"Interactive Google sign-in failed.")}finally{R(l),o(null)}},handleSignOut:async()=>{o("logout"),r(null);try{let s=await t.call("auth:logout");e(s)}catch(s){r(s?.message||"Failed to clear native ACP authentication.")}finally{o(null)}}}}function F(t){let[e,o]=h(!1),[r,l]=h(null),[u,c]=h(null),s=y(0),d=_(async(m=!1)=>{let f=++s.current;o(!0),l(null);try{let p=await t.call("doctor:status",m?{probeNative:!0,forceRefresh:!0}:null);s.current===f&&c(p)}catch(p){s.current===f&&l(p?.message||"Failed to communicate with plugin server.")}finally{s.current===f&&o(!1)}},[t]);return v(()=>(d(!1),()=>{s.current++}),[d]),{loading:e,actionError:r,setActionError:l,status:u,setStatus:c,checkHealth:d}}function q(t){let[e,o]=h(null),[r,l]=h(null),u=y(null),c=y(null),{loading:s,actionError:d,setActionError:m,status:f,setStatus:p,checkHealth:b}=F(t);v(()=>()=>{R(u),c.current&&(clearTimeout(c.current),c.current=null)},[]);let{handleInstallRuntime:g,handleRollbackRuntime:x}=z(t,p,o,m),{handleSignIn:w,handleSignOut:D}=T(t,p,o,m,u);return{loading:s,actionBusy:e,actionError:d,status:f,copiedKey:r,handleInstallRuntime:g,handleRollbackRuntime:x,handleSignIn:w,handleSignOut:D,handleProbeNative:async()=>{o("probe"),await b(!0),o(null)},copyToClipboard:(O,j)=>{typeof navigator>"u"||!navigator.clipboard?.writeText||Promise.resolve(navigator.clipboard.writeText(O)).then(()=>{l(j),c.current&&clearTimeout(c.current),c.current=setTimeout(()=>{c.current=null,l(null)},2e3)}).catch(()=>{})}}}function H({status:t,loading:e,actionBusy:o,onInstall:r,onRollback:l}){let u=t?.state??"runtime_missing",c=t?.installed===!0,s=u==="session_ready",d=t?.pinnedVersion,m=d?` (v${d})`:"",f=t?.version??d,p=e?"Checking Antigravity Native ACP...":s?"Antigravity Native ACP Connected":u==="authenticated"?"Antigravity Native ACP (Unverified Session \u2014 Verify Session & Models)":`Antigravity Native ACP (${k[u]})`;return a("div",{className:"agy-status-header",children:[a("div",{className:"agy-status-title-row",children:[n("span",{className:`agy-status-indicator ${e||o?"checking":s?"ready":"warning"}`}),n("span",{className:"agy-status-label",children:p}),f&&n("span",{className:"agy-version-tag",children:c?`v${f}`:`Pinned v${f}`}),t?.tierName&&n("span",{className:"agy-backend-badge",children:t.tierName}),n("span",{className:`agy-state-pill state-${u}`,children:k[u]})]}),a("div",{className:"agy-actions-row",children:[n("button",{type:"button",className:"agy-btn",onClick:r,disabled:e||o!==null,children:o==="install"?"Installing...":c?`Reinstall Runtime${m}`:`Install Native ACP Runtime${m}`}),t?.previousVersion&&n("button",{type:"button",className:"agy-btn",onClick:l,disabled:e||o!==null,children:o==="rollback"?"Rolling back...":`Rollback to v${t.previousVersion}`})]})]})}function Z({nativeState:t}){let e=I.indexOf(t);return n("div",{className:"agy-readiness-steps",children:I.map((o,r)=>{let l=o===t,u=r<e&&t!=="runtime_missing";return n("span",{className:`agy-readiness-step ${l?"active":u?"passed":""}`,children:k[o]},o)})})}function B({status:t,actionBusy:e,loading:o,copiedKey:r,onSignIn:l,onProbe:u,onSignOut:c,onCopy:s}){if(!t?.installed)return null;let d=t.state==="session_ready"||t.state==="authenticated";return a(C,{children:[a("div",{className:"agy-actions-row",children:[n("button",{type:"button",className:"agy-btn agy-btn-primary",onClick:l,disabled:o||e!==null,children:e==="login"?"Waiting for Google Sign-In in Browser...":d?"Re-authenticate with Google":"Sign In with Google"}),n("button",{type:"button",className:"agy-btn",onClick:u,disabled:o||e!==null,children:e==="probe"?"Verifying Session...":"Verify Session & Models"}),t.configuredAuthType&&n("button",{type:"button",className:"agy-btn",onClick:c,disabled:o||e!==null,children:"Clear Auth Selection"})]}),t.pendingAuthUrl&&a("div",{children:[n("p",{className:"agy-desc",children:"If your browser did not open automatically, copy this OAuth link:"}),a("div",{className:"agy-command-box",children:[n("span",{className:"agy-command-text",children:t.pendingAuthUrl}),n("button",{type:"button",className:"agy-btn",onClick:()=>s(t.pendingAuthUrl,"oauth"),children:r==="oauth"?"Copied!":"Copy URL"})]})]})]})}function $({status:t}){return!t||t.models.length===0?null:a("div",{children:[a("p",{className:"agy-desc",children:["Available Native ACP models (",t.models.length,"):"]}),n("div",{className:"agy-models-list",children:t.models.map(e=>a("span",{className:"agy-version-tag",children:[e.name," (",e.id,")"]},e.id))})]})}function J({status:t}){let e=S(),[o,r]=h(null),[l,u]=h(!1),[c,s]=h(null),d=y(0),m=y(null);v(()=>(d.current++,m.current=null,r(null),s(null),u(!1),()=>{d.current++}),[t?.authMethod,t?.configuredAuthType,t?.executable,t?.authenticated,t?.credentialId]);let f=async()=>{let p=++d.current,b=m.current!==null;u(!0),s(null);try{let g=await e.call("usage:status",b?{forceRefresh:!0}:void 0);if(p!==d.current)return;g.usage.status==="ok"?(m.current=g,r(g),s(null)):g.usage.status==="unauthenticated"||g.usage.status==="not_installed"?(m.current=null,r(g),s(null)):m.current?(r(m.current),s(g.usage.message||"Usage is unavailable. Verify your Google sign-in and try again.")):r(g)}catch(g){p===d.current&&s(g?.message||"Could not check subscription usage.")}finally{p===d.current&&u(!1)}};return a("div",{className:"agy-usage-card",children:[a("div",{className:"agy-usage-header",children:[n("h4",{children:"Subscription usage"}),l&&a("span",{className:"agy-refresh-badge",role:"status","aria-label":"Refreshing subscription usage",style:{display:"inline-flex",alignItems:"center",gap:5},children:[n(P,{}),n("span",{children:"Refreshing..."})]})]}),a("p",{className:"agy-desc",children:["Plan: ",t?.tierName||"not yet verified"]}),a("button",{type:"button",className:"agy-btn agy-btn-with-icon",onClick:f,disabled:l||!t?.authenticated,children:[l&&n(P,{}),n("span",{children:l?"Checking usage...":o?.usage.status==="ok"?"Refresh subscription usage":"Check subscription usage"})]}),c&&n("p",{role:"status",className:"agy-desc agy-desc-error",children:c}),o?.usage.status==="ok"&&a(C,{children:[a("p",{className:"agy-desc",children:["Checked ",new Date(o.usage.checkedAt).toISOString()," \xB7 Google Antigravity /usage"]}),n("ul",{className:"agy-usage-list",children:o.usage.windows.map(p=>a("li",{children:[n("strong",{children:p.label.replace(/ Remaining$/,"")}),": ",Math.round((100-p.usedPercent)*100)/100,"% remaining",p.resetsAt&&a("span",{children:[" \xB7 Resets ",p.resetsAt]})]},p.label))})]}),o&&o.usage.status!=="ok"&&n("p",{role:"status",className:"agy-desc agy-desc-error",children:o.usage.message||"Usage is unavailable. Verify your Google sign-in and try again."}),a("p",{className:"agy-desc",children:["Baseline quota is separate from AI credits. You can also check usage in Google Antigravity Settings or run ",n("code",{children:"/usage"})," in an Antigravity thread."]})]})}function K(){return a("div",{className:"agy-steps-card",children:[n("h4",{className:"agy-steps-title",children:"Quick Setup Guide"}),a("ol",{className:"agy-steps-list",children:[a("li",{children:["Click ",n("strong",{children:"Install Native ACP Runtime"})," above to download and verify Google's official SHA-256 ACP archive."]}),a("li",{children:["Select your ",n("strong",{children:"Google ACP authentication method"})," and click ",n("strong",{children:"Sign In with Google"}),"."]}),n("li",{children:"Run the session verification check above to confirm readiness and load the native model catalog."}),a("li",{children:["Start a new thread in Zana and select ",n("strong",{children:"Antigravity"})," as the provider (legacy ",n("code",{children:"agy-*"})," CLI threads migrate via context handoff)."]})]})]})}function W(){let t=S(),e=q(t);v(()=>{L()},[]);let o=e.status?.state??"runtime_missing";return a("div",{className:"agy-settings-panel",children:[a("div",{className:"agy-status-card",children:[n(H,{status:e.status,loading:e.loading,actionBusy:e.actionBusy,onInstall:e.handleInstallRuntime,onRollback:e.handleRollbackRuntime}),n(Z,{nativeState:o}),a("p",{className:"agy-desc",children:["Runs Zana threads directly over Google's official Native ACP server (",n("code",{children:"agy_acp_server"}),"). Auth method: ",n("code",{children:e.status?.authMethod??"oauth-personal"}),e.status?.configuredAuthType?` (configured: ${e.status.configuredAuthType})`:" (not yet configured)"]}),o==="authenticated"&&n("p",{className:"agy-desc agy-desc-note",children:"Local credentials detected, but the Native ACP session has not been verified yet. Run the session verification probe below to confirm readiness."}),(e.status?.error||e.actionError)&&n("p",{className:"agy-desc agy-desc-error",children:e.actionError||e.status?.error}),n(B,{status:e.status,actionBusy:e.actionBusy,loading:e.loading,copiedKey:e.copiedKey,onSignIn:e.handleSignIn,onProbe:e.handleProbeNative,onSignOut:e.handleSignOut,onCopy:e.copyToClipboard}),n($,{status:e.status}),e.status?.checkedAt&&a("p",{className:"agy-desc",children:[e.status.catalogStale?"Catalog refresh needed \u2014 last verified ":"Session last checked ",new Date(e.status.checkedAt).toISOString()]}),e.status&&e.status.disabledDeadMcpServers.length>0&&a("p",{className:"agy-desc agy-desc-note",children:["Automatically bypassed unreachable IDE named-pipe MCP proxies (",n("code",{children:e.status.disabledDeadMcpServers.join(", ")}),") to prevent prompt stalls."]})]}),n(J,{status:e.status}),n(K,{})]})}function Y(t){return t?t.replace(/\s*Open the thread side panel → Antigravity account and click "[^"]+"\./g,"").trim()||t:null}function X(){let t=S(),[e,o]=h(null),[r,l]=h(!0),[u,c]=h(null),[s,d]=h(null),m=y(null),f=y(0),{handleSignIn:p}=T(t,o,c,d,m),b=_(async(g=!1)=>{let x=++f.current;l(!0),d(null);try{let w=await t.call("auth:recover",{forceRefresh:g});f.current===x&&o(w)}catch(w){f.current===x&&d(w?.message||"Could not reconnect Antigravity.")}finally{f.current===x&&l(!1)}},[t]);return v(()=>(L(),b(),()=>{f.current++,R(m)}),[b]),a("div",{className:"agy-account-panel",children:[n("h2",{children:"Antigravity account"}),n("p",{className:"agy-desc",children:"Checks the account on this computer. Saved credentials are renewed automatically when possible."}),n("p",{role:"status","aria-live":"polite",children:r?"Checking saved credentials\u2026":u==="login"?"Complete Google sign-in in your browser\u2026":e?.ready?"Connected":e?.state==="sign_in_required"?"Google sign-in is required. Reconnect here to continue.":"Antigravity could not connect."}),(s||e?.error)&&n("p",{className:"agy-desc agy-desc-error",role:"alert",children:Y(s||e?.error)}),a("div",{className:"agy-actions",children:[n("button",{className:"agy-btn",disabled:r||u!==null,onClick:()=>void b(!0),children:"Check again"}),n("button",{className:"agy-btn",disabled:r||u!==null||e?.installed===!1,onClick:p,children:"Reconnect Antigravity"})]}),e?.pendingAuthUrl&&n("a",{href:e.pendingAuthUrl,target:"_blank",rel:"noreferrer",children:"Open Google sign-in"}),n($,{status:e}),e?.ready&&n("p",{className:"agy-desc",children:"If the model picker still shows an earlier error, use its refresh button to reload these models."})]})}var De=N(t=>{t.slots.experimental_providerIcon?.({providerId:"antigravity",icon:U}),t.slots.threadPanelAction({id:"antigravity-account",title:"Antigravity account",icon:"KeyRound",component:X}),t.slots.settingsSection({id:"antigravity-provider",title:"Antigravity Provider",description:"Configure Google Antigravity via Google Native ACP server (agy_acp_server)",component:W})});function L(){if(typeof document>"u")return;let t="antigravity-provider-styles",e=document.getElementById(t);if(e){e.textContent!==A&&(e.textContent=A);return}let o=document.createElement("style");o.id=t,o.textContent=A,document.head.appendChild(o)}export{X as AntigravityAccountPanel,U as AntigravityProviderIcon,W as AntigravitySettingsSection,De as default,Y as formatAccountPanelError};
