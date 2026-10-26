# Antigravity provider: code review and improvement plan

Reviewed 2026-10-25 at commit `e0db73fe9aa01868a5131cb80ab376e962d5f371`. Scope: the complete plugin, its committed host bundle, tests, installed CLI help, and existing local adapter logs. This is a review and plan; no runtime implementation was changed.

## Outcome

The missing running activity is explained by a confirmed parser omission: the adapter drops tool events. The intermittent first-prompt failure is **not yet reproduced end to end**. There are confirmed paths that silently complete without an answer, but the latest pre-review logs show the first recorded prompt finishing after approximately 87 seconds and the next after 209 seconds. Both exited 0 with `emittedDelta=true`. Lack of activity reporting can make such turns look ignored; the logs do not identify when useful text reached the UI or prove task success.

The most important additional findings are lost conversation continuity and unconditional permission bypass. Fixing just a startup delay would leave those defects intact.

## Behavior findings

### P1: Tool activity never reaches the thread

`plugins/provider-antigravity/agy-acp.mjs:357–395` handles only `step_update.text_delta` and `result.response`. The trailing-line parser repeats this at lines 410–441. Valid tool lifecycle JSON is silently discarded. Stderr is only written to the local logfile at lines 399–402.

The official CLI emits tool steps with state and tool metadata; ACP and the shipped Zana bridge support `tool_call` and `tool_call_update`. Simulating a tool-only ACTIVE event against the actual adapter source produced zero session updates followed by a successful `end_turn`.

**Change:** Introduce one event decoder and translator shared by normal and trailing lines. Map tool start, progress, output, completion and error to ACP tool events with stable IDs. Display factual startup/waiting status through a host-supported status path. Keep diagnostics separate from assistant answers. Preserve Unicode across chunk boundaries using a stream decoder rather than independent `Buffer.toString()` calls.

### P1: Errors and empty output become successful turns

`agy-acp.mjs:447–461` reports an error only when the exit is nonzero **and** no text has been emitted, then returns `end_turn` regardless. It never validates `result.status` or `result.error`. A partial answer followed by failure is reported as successful; an exit-zero process with no output completes invisibly.

Both paths were reproduced with simulated child events. These are credible mechanisms for an apparently ignored prompt, but neither is established as the cause of the user's intermittent incident.

**Change:** Track terminal result status independently of text. Distinguish successful completion, cancellation, CLI error, missing terminal result and transport failure. Require a valid terminal result rather than treating process exit as success. Preserve partial output and still surface failures. A legitimate empty response with a valid success result should be distinguished from an unexplained empty process exit. Do not blindly retry an ambiguous turn: tools may already have executed.

### P1: Follow-up and restored sessions lack native conversation history

`agy-acp.mjs:318–340` launches a new CLI for every prompt without `--conversation`, and ignores conversation IDs in init/results. `session/load` at lines 237–256 recreates configuration only, while initialization advertises `loadSession: true` at line 204.

The installed CLI 1.4.7 documents explicit conversation resumption and persistent streaming input. Official documentation says headless runs are stateless unless resumed. The current bridge therefore cannot guarantee that a follow-up continues the previous job, or that reloading restores context.

**Change:** Save native conversation identity per ACP session and use explicit `--conversation` for subsequent processes. Persist the mapping for restarts and implement ACP history replay, or stop advertising loading until that exists. Never use global `--continue`, which could resume another thread. Consider a persistent stream process only after lifecycle tests exist.

### P1: Permission selection does not enforce the promised behavior

`agy-acp.mjs:323` always adds `--dangerously-skip-permissions`. Installed CLI help defines this as auto-approving all tool permission requests. `server.ts:157` ignores the incoming permission mode. The shipped generic host bridge applies launch permission mappings, but this plugin supplies none; it does not call the adapter's `session/set_mode` handler.

Thus selecting accept-edits does not restore command approval, even though the default CLI mode is named accept-edits. This is an actual integration defect, not a hypothetical warning.

**Change:** Define and test the mapping from Zana permission policy to native mode and approval behavior. Remove unconditional bypass. If headless CLI cannot support interactive approvals, expose only behavior that can be enforced, or implement an appropriate permission path; merely removing the flag may create hangs or denied tools. Treat read-only plan mode separately from Zana's permission modes.

### P2: Process ownership and cancellation can violate ACP lifecycle

`agy-acp.mjs:405–475` replies from both `error` and `close`. Simulating Node's error-then-close sequence produced two terminal responses for one request. There is no child-stdin error handler, parent-input-close cleanup, or explicit signal cleanup. `session/cancel` at lines 483–490 clears the process handle immediately and sends a response even when called as a notification; the prompt later completes with `end_turn`, not a tracked cancellation.

Concurrent prompt handlers can overwrite `activeProc`; an older child's close handler can clear a newer child's handle. The current bundled host normally serializes turns, reducing that exposure, but the adapter itself does not enforce ownership.

**Change:** One turn object per session owns child handles, decoder, terminal result and settlement. Settle exactly once; reject or serialize concurrent input; keep cancellation tracked until the child is closed; clean up owned children on disconnect. Add bounded startup and inactivity handling with actionable diagnostics, and a configurable overall timeout. Never answer JSON-RPC notifications.

### P2: Unsupported content is accepted and discarded

Initialization advertises image and embedded-context support at `agy-acp.mjs:206–208`, but extraction at lines 300–315 retains only text. An image-only prompt was reproduced as successful completion without spawning the CLI. Text-plus-image prompts silently lose the image. Session creation/loading also ignores supplied `mcpServers`; therefore Zana's supplied tools are not connected through this path, even if the CLI has its own configured MCP tools.

**Change:** Advertise truthful input capabilities and reject unsupported blocks visibly. Evaluate documented conversion for embedded text resources. Implement session-scoped MCP forwarding only through a supported CLI mechanism, or explicitly report that integration as unsupported. Avoid silently modifying global CLI configuration.

### P2: Health and model discovery hide authentication failures

`server.ts:175–201` probes only `--version`; `app.tsx:72` labels success “Connected.” The pre-review log contains a model-discovery sign-in failure at 16:42 UTC, while the adapter substitutes fallback models. Failed discoveries are not cached, so configuration probing can repeatedly spawn the failing command. Existing `agy-acp.test.ts` request deadlines also match the full five-second discovery timeout, creating a slow-environment test race.

**Change:** Separate installed, authenticated, model-discovery and ready states. Use one executable resolver for the doctor and runtime. Preserve authentication errors instead of presenting a fallback catalog as available entitlement. Cache in-flight discovery and short-lived failures; keep known catalogs visibly stale rather than authoritative. Validate model/effort combinations instead of applying every effort to every model.

## Standards and packaging findings

### P2: Host adapter location depends on the desktop installation

`server.ts:12` supplies an absolute adapter path from the plugin server filesystem. `host.ts:25–43` searches adjacent to the executing host artifact, then the user's installed-plugin registry, then a hard-coded developer checkout. The adapter is outside `dist/`, while the host artifact is `dist/host.js`. This can work locally through the registry or server path, but is not self-contained when delivered to another execution host. A remote end-to-end run was not performed; it is not a proven cause of the local incident.

**Change:** Package adapter execution with the delivered host artifact or use the host's supported asset-delivery mechanism. Test from an isolated installation directory and execution host with no developer checkout or desktop registry. Remove developer-path fallback.

### P2: Rebuilds rely on an undeclared developer checkout

`scripts/build.mjs:7` imports esbuild through an absolute `D:/Dev/code/zana/...` path. `package.json` declares build/test scripts but no tool dependencies. Build metadata versions are hard-coded at lines 123 and 169. This undermines the README's self-contained convention and WORKFLOW.md's required reproducible source/artifact rebuild. Current CI only validates the marketplace feed.

**Change:** Declare and pin build/test dependencies, derive versions from package metadata, and run plugin tests plus artifact consistency checks in CI. Rebuild committed artifacts and bump the package version for publication, as WORKFLOW.md requires.

**Maintainability heuristic:** Duplicate normal/trailing stream parsers already differ in fallback behavior. Consolidating them is justified by correctness, not merely style. Keep process lifecycle, stream translation, conversation storage and executable discovery as distinct modules with small interfaces; avoid a broad framework rewrite.

## Verification performed

- Installed CLI: `agy --version` returned **1.4.7**; `agy --help` confirmed resume, streaming input, permission bypass and unlimited default print timeout.
- All **13 tests across three files passed** using the existing Vitest installation in the neighboring Zana checkout. No test dependency installation or plugin rebuild was performed. The current bridge tests never send a nonempty prompt.
- A throwaway in-memory harness evaluated the actual adapter source with fake process streams, model discovery and filesystem logging. It reproduced dropped tool activity, silent zero-output completion, hidden nonzero exit after partial text, duplicate error/close completion, and image-only no-op. This validates adapter logic, not real CLI timing or the intermittent UI issue.
- Existing pre-test logs were inspected without recording prompt contents. Recorded turn durations were approximately 87 and 209 seconds, with successful exit and an emitted text path. Logs lack process/request correlation and first-event timestamps, limiting inference when multiple adapters append to the same file.
- No real model job, authentication change, installation, publication or application-code edit was performed.

## Implementation order and acceptance checks

0. **Evaluate Google's native ACP server before a major adapter rewrite.** The [official ACP registry](https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json) lists Google LLC's `antigravity-acp` 1.4.3, including `agy_acp_server.exe` and a Windows archive checksum. This is separate from installed `agy` 1.4.7. Run a bounded compatibility experiment using Zana's honest client identity: authentication, model/effort availability, first prompt, progress/tool output, permission requests, MCP forwarding, cancellation and resume. Prefer the native server if these checks pass; retain the CLI adapter only if a documented compatibility gap requires it. The companion research notes an upstream report of client-dependent model availability in earlier ACP versions, so replacement is not assumed drop-in. No binary was downloaded or executed during this review.
1. **Make failure and latency observable.** Add bounded, redacted structured diagnostics with bridge PID, ACP session/request ID, resolved CLI version, spawn/first-event/result/close timestamps, event types and exit status. Reproduce cold and warm first turns with a harmless fixed prompt. Compare current launch arguments against explicit documented print-mode invocation; missing `-p` is a compatibility question, not a proven bug. Acceptance: each submitted turn has a traceable terminal outcome or an explicit stalled state, never an unexplained disappearance.
2. **Correct the event and turn boundary.** Add deterministic fixture tests before changing the parser; implement tool translation, terminal-result validation, exactly-once completion, cancellation and cleanup. Acceptance: visible running/completed/failed tools; a partial-output failure remains a failure; cancellation is distinguished; failed spawn yields one response; split UTF-8 and trailing NDJSON decode correctly.
3. **Restore thread continuity.** Persist native conversation IDs, resume explicitly, and implement truthful reload behavior. Acceptance: a second turn remembers a unique first-turn marker; reloading preserves it; two threads do not leak history; a missing native conversation produces an explicit restoration failure.
4. **Align capabilities, permissions and readiness.** Test permission decisions through the shipped host, reject unsupported content, resolve auth errors and define MCP support. Acceptance: accept-edits does not auto-approve arbitrary commands; unsupported images are not silently accepted; signed-out installation is not labeled connected; the configured executable is used consistently.
5. **Make delivery repeatable.** Fix adapter packaging/dependencies, add clean-install and delivered-host smoke tests, synchronize bundles and release notes. Acceptance: fresh checkout builds/tests without the author's directory layout; installed artifact matches source; isolated host can locate and run the adapter.

If the custom adapter remains necessary, start with explicit conversation resumption per process because it is a smaller change. A persistent NDJSON worker is a later optimization for repeated startup latency; use it only with clear per-turn serialization and restart recovery. Do not add arbitrary startup sleeps or automatic prompt resends as the primary fix.

## Research

See [the companion primary-source research](antigravity-integration-research.md) for the official headless protocol, ACP requirements, version history and documentation discrepancies. The older upstream Windows/output fixes predate installed 1.4.7 and are not sufficient to explain the current symptom.
