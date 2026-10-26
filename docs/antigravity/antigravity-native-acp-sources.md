# Native Antigravity ACP: primary-source investigation

Date: 2026-10-25. This note covers documentary evidence. The separate local protocol investigation determines what actually works with this Windows installation and Zana's client identity. No binary was downloaded or executed for this source-research subtask.

## Recommendation

Prefer a direct connection from Zana's existing ACP host bridge to Google's native `agy_acp_server` if the local compatibility checks pass. Avoid another broad CLI-to-ACP translation layer. Native ACP is a credible supported integration surface, but replacement should be conditional on authentication, actual model availability, tool events, permission handling and restoration tests—not on the executable starting successfully.

## Distribution and identity: verified in published registry

The official ACP registry lists `antigravity-acp` version **1.4.3**, author **Google LLC**, with a **proprietary** license and a link to Google's terms. It publishes macOS, Linux and Windows binaries. The Windows x86-64 entry is:

- Archive: `https://dl.google.com/agy-extensions/releases/windows/agy-acp-server-1.4.3-windows-x86_64.zip`
- Command: `./agy_acp_server.exe`
- SHA-256: `54c2e16378d9a4952e1da70e355f3c33c4f284308d6de48ab3e6e34a127bd325`

This package is separate from `agy` CLI 1.4.7. Do not infer an `agy --acp` flag or treat their version numbers as interchangeable. Pin the tested ACP artifact and checksum. The registry alone does not establish permission to redistribute binaries inside the plugin; prefer installing the vendor artifact directly unless redistribution terms are separately established. [Official registry](https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json)

An upstream Windows 1.4.0 report identifies a sibling `localharness_external.exe`. Preserve the full verified archive layout; do not deploy only the ACP executable until its runtime dependencies have been checked locally. The same report describes a single-workspace boundary even in yolo mode, so use the project directory as session cwd and explicitly test any multi-root requirement. These are reported older-version behaviors, not verified 1.4.3 results. [Upstream issue #1273](https://github.com/google-antigravity/antigravity-cli/issues/1273)

## Authentication: supported methods, uncertain credential reuse

Google describes unified authentication across IDE extensions, CLI and desktop app: the signed-in account controls entitlement, quota and privacy policy. This does **not** by itself prove that launching the standalone ACP binary will reuse the installed CLI's credential storage without further authentication. [Google IDE extensions overview](https://antigravity.google/docs/ide/extensions/)

The official Zed integration guide documents these auth type IDs:

| ID | Documented use |
|---|---|
| `oauth-personal` | Personal Google AI plans, including free, Pro and Ultra |
| `oauth-business` | Gemini Enterprise, with project and region |
| `gemini-api-key` | Gemini API key |
| `agent-platform` | Enterprise API key or ADC; project/region for ADC |

This supports choosing personal OAuth for subscription use rather than silently switching to API billing. Enumerate the server's actual `authMethods` during initialization and handle its authentication-required response. Do not copy credentials or infer private credential paths. [Google Zed integration](https://antigravity.google/docs/ide/extensions/zed)

An older macOS report shows `authenticate` using `oauth-personal` starting browser OAuth and a loopback listener, then the process disappearing before callback. The report explicitly does not establish which component killed it. It is a reason to keep the process alive through login and record exit status, not evidence that this Windows version has the defect. [Upstream issue #915](https://github.com/google-antigravity/antigravity-cli/issues/915)

## Model parity: material unresolved risk

An open first-hand issue reports that ACP 1.3.0 filtered Claude/GPT-OSS for an unrecognized client name, and source inspection found the same allowlist in 1.4.1. Changing to a known editor identity changed availability in that report. This is not a vendor commitment and does not establish 1.4.3 behavior. Test with Zana's real identity and use only the returned catalog. Do not spoof another editor or keep the old hard-coded models as if they are available. If native ACP exposes only Gemini, present that as a migration tradeoff rather than an authentication failure or hidden fallback. [Upstream issue #1318](https://github.com/google-antigravity/antigravity-cli/issues/1318)

## Protocol requirements for the replacement

ACP initialization negotiates protocol version, capabilities and authentication methods. Clients must not proceed with an unsupported returned protocol version. Missing capabilities mean unsupported. Therefore preserve Zana's supported protocol and record the actual native result rather than assuming that a report about draft v2 requires a host upgrade. [ACP initialization](https://agentclientprotocol.com/protocol/v1/initialization)

`session/new` carries cwd and MCP servers. `session/load`, when advertised, must restore the previous conversation and replay its history as session updates. Test memory after a process restart, not only whether `session/load` returns successfully. Native session IDs must replace synthetic adapter IDs; old `agy-...` IDs have no established mapping to native sessions. Existing threads need an explicit migration/history-only policy. [ACP session setup](https://agentclientprotocol.com/protocol/v1/session-setup)

Session modes are discovered from session state, not universal identifiers. ACP is moving mode controls toward configuration options; legacy `session/set_mode` remains documented. Map Zana controls only after checking which native mode/config changes the shipped host actually sends. Keep approval handling distinct from mode names. [ACP session modes](https://agentclientprotocol.com/protocol/v1/session-modes)

The public sources reviewed here do not establish the complete 1.4.3 mode list, all accepted MCP transports, per-model reasoning fields, image behavior, usage reporting or restoration reliability. Capture initialization and session metadata locally, then test the specific features. Do not infer native capabilities from the ordinary CLI's flags or settings.

## Native reliability still needs qualification

An upstream report on ACP 1.1.1 describes normal tool and final-message updates without the terminal `session/prompt` response, sometimes also ignoring cancel. It includes HTTP MCP use and reproduced observations, but no confirmed cause or established fix for 1.4.3. Native migration should therefore retain bounded inactivity diagnostics, process lifecycle supervision and cancel escalation. Never infer success solely from final-looking prose, and never automatically resend an ambiguous turn that may have executed tools. [Upstream issue #1041](https://github.com/google-antigravity/antigravity-cli/issues/1041)

## Acceptance evidence to gather

1. Verified archive and full companion-file layout; initialization with Zana's honest identity.
2. Authentication behavior with the existing account, without copying tokens; explicit handling when sign-in is needed.
3. Returned model/effort catalog compared with desired model availability.
4. Fresh-session first prompt and warm follow-up: first-event latency, tool updates, exactly one terminal result.
5. A harmless permission-required tool action with both approve and deny outcomes; cancellation while active.
6. A session-scoped test MCP server: discovery and one harmless invocation.
7. Same-process continuity, cross-process restore, history replay and isolation between two threads.
8. Host-delivered integration and UI rendering, not only a bare protocol harness.

If these pass, the plugin can become primarily runtime installation/discovery, provider registration, setup/auth status and metadata. Zana's existing ACP host owns the protocol transport and standard event rendering; Google's runtime owns conversation and tool execution. Keep a temporary opt-in legacy route only for explicitly identified incompatibilities, never silently switch transports mid-thread.
