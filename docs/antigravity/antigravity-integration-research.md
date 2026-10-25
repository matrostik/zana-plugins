# Antigravity integration research

Reviewed 2026-10-25. Scope: the current `plugins/provider-antigravity/agy-acp.mjs` adapter and public primary documentation. This is research and a recommended validation plan, not a claim that the intermittent first-prompt failure was reproduced.

## Supported integration boundary

The implementation is a custom ACP-to-CLI adapter. Zana talks ACP to the Node script; the script talks `agy` headless NDJSON. No private wire protocol is required for the improvements below.

There is also an official, separate native ACP distribution. The live ACP registry lists Google LLC's `antigravity-acp` **1.4.3**, including Google-hosted Windows x86-64 and ARM64 downloads, `agy_acp_server.exe`, and archive checksums. This is not evidence that `agy` itself accepts an ACP flag. [Official ACP registry](https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json)

**Recommendation:** perform a bounded native-ACP compatibility spike before a major bridge rewrite. Test authentication, actual model catalog under Zana's own client identity, first-turn latency, progress, permission requests, MCP injection, session reload, cancellation and process cleanup. If it meets those checks, directly use it with Zana's existing ACP bridge. Otherwise keep the documented CLI stream transport and fix its adapter. A first-hand report in Google's issue tracker describes third-party model filtering by client name in older native ACP versions; that is a compatibility risk to test, not established behavior of 1.4.3. Do not impersonate another client to obtain a different catalog. [Upstream report #1318](https://github.com/google-antigravity/antigravity-cli/issues/1318)

Google documents `init`, incremental `step_update`, and terminal `result` events. Tool steps include `tool_info` and `ACTIVE`/`DONE` state. Results carry status and conversation ID. Diagnostics go to stderr. Headless runs are stateless unless resumed with `--conversation`; persistent `stream-json` input retains context, accepts text user messages, and emits one result per turn. Drivers should await that result before sending the next prompt. Only text blocks are accepted by this streaming input. [Google headless-mode documentation](https://antigravity.google/docs/cli/headless/)

`-p` selects single-prompt headless mode; the input/output format flags are described as print-mode options. The adapter omits `-p` while sending text on stdin. Whether this combination implicitly selects print mode must be tested against the installed version; documentation alone does not prove it drops prompts. `--dangerously-skip-permissions` auto-approves tool requests. Auto mode availability varies by platform/version, and is not synonymous with unrestricted permission bypass. [Google CLI reference](https://antigravity.google/docs/cli/reference/)

## Findings grounded in the local code

1. **The missing activity display has a direct explanation.** The parser forwards text deltas and final response text only. It discards tool start/completion events, parameters, output, failures, subagent metadata and usage. Stderr is written to a file only. ACP has `tool_call` and `tool_call_update` notifications specifically for this purpose. Emit stable IDs, initial pending/running state, and completion/failure results instead of presenting tool output as assistant prose. [ACP tool calls](https://agentclientprotocol.com/protocol/v1/tool-calls)

2. **Silent completion is possible.** The close handler unconditionally returns `end_turn`. An exit-zero run with no recognized response produces no visible explanation. A nonzero exit after a text fragment suppresses its error because the error branch requires `!hasEmittedDelta`. The parser never checks `result.status` or `result.error`. Require a terminal event; classify its outcome separately from whether text was emitted. Preserve useful partial text and still report failure.

3. **Conversation state is lost between prompts.** Every prompt spawns a new process, with neither a saved conversation ID nor a resume flag. `session/load` creates a fresh in-memory object when the ID is absent. This contradicts the advertised persistence capability: ACP loading means resuming prior context across restarts, and includes history replay requirements. Persist ACP-ID-to-CLI-ID mapping and restore history, or disable `loadSession` until supported. [ACP session setup](https://agentclientprotocol.com/protocol/v1/session-setup)

4. **Capabilities exceed the implementation.** Initialization advertises images and embedded context, but prompt extraction silently retains only text. Reject unsupported blocks explicitly and advertise the real contract. Do not invent support from the underlying model's capabilities.

5. **Prompt lifecycle needs one owner.** Async line handlers permit concurrent prompts, overwrite `activeProc`, and independently complete responses. Spawn error and close can both reply. Introduce per-session turn state, exactly-once settlement, a busy/queue policy, cancellation tracking and process cleanup. ACP clients must finish initialization and session setup before prompting; completion and cancellation are distinct outcomes. [ACP prompt-turn specification](https://agentclientprotocol.com/protocol/v1/prompt-turn)

## Relevant upstream history

The official changelog records Windows non-TTY output loss fixed in 1.0.15, silent success with empty output on server failure fixed in 1.1.1, structured stream output added in 1.1.8, and persistent stream input in 1.1.15. Version 1.2.6 changed the headless timeout default to unlimited and introduced structured `AGY_ERROR` stderr diagnostics and exit code 3 for model/agent failures. Later entries also fix errors occurring after partial response output. These are reasons to record the actual executable/version and test it, not proof that an upstream bug caused this user's incident. [Official CLI changelog](https://github.com/google-antigravity/antigravity-cli/blob/main/CHANGELOG.md)

## MCP and permissions

Google documents CLI MCP configuration at `~/.gemini/config/mcp_config.json` and `<workspace>/.agents/mcp_config.json`. Entries support local `command`/`args`/`env` and remote `serverUrl`/`headers`. Tool access follows permission policy, including named `mcp(server/tool)` rules. [Google MCP documentation](https://antigravity.google/docs/mcp/)

The current adapter ignores `params.mcpServers`. A user's separately configured CLI MCP servers may still work; Zana-provided servers are not thereby forwarded. No documented per-invocation `--mcp-config` override was established in this research. Do not plan one as if it exists or overwrite shared user/project config to inject ephemeral credentials. Validate a supported isolated mechanism, use native ACP if compatible, or explicitly report unsupported forwarded servers.

Headless operation cannot assume interactive permission prompts. Remove unconditional bypass and surface denials; if the CLI stream cannot round-trip Zana permission requests, advertise that limitation and define supported policy presets. The headless input documentation rejects `control_request` and `control_response`, so copying Claude-style stream permission messages is not a supported solution. [Google headless input contract](https://antigravity.google/docs/cli/headless/)

## Recommended sequence and verification

1. Capture resolved executable, actual CLI version, request/session IDs, spawn time, first event time, terminal result status, exit code/signal and stderr category. Keep prompt bodies and credentials out of routine logs. Add bounded log rotation.
2. Establish a deterministic fake CLI fixture replaying documented events: delayed init, tool-only activity before text, empty success, result error, partial text followed by failure, malformed/trailing NDJSON and spawn failure. Assert exactly one ACP terminal response and no invisible failure.
3. Compare the existing launch arguments with explicit supported text-headless invocation on a harmless fixed prompt. Repeat cold and warm launches. Do not automatically resend after an ambiguous failure: the first run may already have acted.
4. Implement the event translation and terminal state fixes before changing process lifetime. Test two prompts and two sessions, cancellation, reload and disconnect cleanup.
5. Choose one durable conversation strategy: explicit `--conversation` per process is the smaller change; one persistent stream process per ACP session avoids repeated startup but requires stricter lifecycle management. Add restart recovery either way.
6. Verify the Zana bridge consumes the chosen ACP event variants and capability versions. Use real tool calls with harmless output to check visible running/completed states, not only unit assertions.

## Limits and documentation discrepancies

The main review measured installed CLI version **1.4.7** and confirmed `--conversation` and streaming input in local help. Its inspection of the existing bridge log found an October 25 prompt running from 16:47:08.883 to 16:48:35.877 (about 87 seconds), then another from 16:51:21.100 to 16:54:49.972 (about 209 seconds); both closed with code 0 and `emittedDelta=true`. Those records show completed requests, not a proven lost first prompt. The flag only proves a text path ran; it does not establish when useful output became visible or that the intended task succeeded. Earlier model discovery encountered a sign-in error which the fallback catalog masked. The historic upstream fixes predate the installed version and therefore are not a sufficient explanation for the current symptom.

The headless page still lists a five-minute default timeout while the CLI reference and changelog describe unlimited by default. Set an explicit timeout policy and check local help instead of relying on either default. No readiness-delay requirement was established: adding arbitrary sleeps is not an evidence-based fix. Startup should be observable and bounded, with completion driven by protocol events.
