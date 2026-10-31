# Antigravity Provider Plugin (`@zcc-ext/provider-antigravity`)

Google Antigravity ACP thread provider for Zana Command Center, powered directly by Google's official **Native ACP Server (`agy_acp_server`)**.

## 0.3.0 — Catalog recovery, Plan and subscription usage

- Model selection refreshes an expired or cold catalog automatically. Concurrent refreshes share one probe; transient failures preserve the last catalog for the same credentials. Sign-out and credential changes invalidate it.
- Authentication failures with saved credentials get one noninteractive retry through a fresh native runtime. Failed catalog recovery backs off for 30 seconds; explicit sign-out disables automatic recovery. Google may still require browser sign-in.
- Open **Antigravity account** from the thread side panel to check credentials or **Reconnect Antigravity** without visiting settings. Recovery returns the verified native model catalog directly. If the model picker still shows an earlier error, use its existing refresh button. No Zana core changes are required.
- Supports grouped ACP model options and catalog updates. Native model configuration is authoritative over legacy model aliases.
- Plan appears in the composer and uses the native `/plan` command. Keep Plan selected for planning follow-ups; select Agent explicitly to implement.
- Settings includes **Check subscription usage**, showing per-pool quota remaining, reset times, and the check timestamp. Provider usage reporting uses the same native `/usage` command. Baseline quota and AI credits are distinct; the command does not currently return an AI-credit balance.
- Unverified or stale readiness is no longer reported as expired authentication. Generic server errors preserve their cause.
- Native 1.4.3 and 1.4.5 were checked against the same account; both returned the same two base models. The managed runtime remains pinned to the tested 1.4.3 distribution. Updating a runtime does not guarantee additional account entitlements.

The saved-mode recovery control belongs to Zana itself and is implemented separately on `fix/composer-unavailable-mode-recovery-v2`. That app change displays missing saved modes honestly and offers **Switch to Agent** while preserving the draft.

---

## Architecture

1. **Managed Native ACP Distribution (`src/native-runtime.ts`)**:
   - Downloads and verifies Google's official ACP Registry distribution (`v1.4.3`, `https://cdn.agentclientprotocol.com/registry/v1/latest/antigravity.json`) across `windows-x86_64`, `darwin-aarch64`, `darwin-x86_64`, `linux-x86_64`, and `linux-aarch64`.
   - Enforces SHA-256 archive verification before extraction into `~/.zcc/runtimes/antigravity-acp/<version>/`.
   - Validates required companion binaries (`localharness_external.exe` on Windows alongside `agy_acp_server.exe`).
   - Supports atomic rollback (`runtime:rollback` RPC) via `current.json` (`previousVersion`) and cleans up process trees on Windows using `taskkill /PID <pid> /T /F`.

2. **Sanitized `GEMINI_HOME` (`src/gemini-home.ts`)**:
   - Supports all four official Google ACP authentication methods: `oauth-personal` (default), `oauth-business`, `gemini-api-key`, and `agent-platform`.
   - Prepares a sanitized ZCC `GEMINI_HOME` (`~/.zcc/state/antigravity-gemini-home`) that syncs `antigravity-acp/settings.json` and `antigravity-acp/acp_token.json` with `~/.gemini/antigravity-acp/` while automatically disabling unreachable IDE-only named-pipe MCP proxies (`*-antigravityide`) in `config/mcp_config.json` so prompts never stall on dead IDE pipes. Unchanged files are left alone.

3. **Native diagnostics (`src/native-auth.ts`)**: readiness, the model catalog, `/usage` and sign-in, behind the entry points `host.ts` and `server.ts` call. Each is a short script on these modules:
   - **Account identity (`src/account-identity.ts`)**: a snapshot of the account a diagnostic started against, with every cache key and the UI credential id. Results from an account that changed mid-run are discarded; a headless diagnostic's own auth-type write is adopted rather than treated as a change.
   - **Native ACP session (`src/acp-session.ts`)**: spawn, JSON-RPC, the stderr sign-in signal, late catalog updates, command waits, output guards, deadline and cleanup. Tests drive it through the scripted `FakeAcpServer` (`src/fake-acp-server.ts`).
   - **Readiness store (`src/readiness-store.ts`)**: readiness shared between processes through memory and disk. Health and Settings reads stay non-spawning; an expired catalog for the same account is served as stale and outlives transient failures.
   - **Keyed refresh (`src/keyed-refresh.ts`)**: catalog and usage refreshes are coalesced per account; catalog failures back off, usage successes are cached for one minute.

4. **Provider config (`src/provider-config.ts`)**: settings normalization, the launch spec (`_meta.parameterizedModelPicker: true`, `nativeReasoning.configId: 'thinking_level'`), and the projections into thread health, `model/list` replies and the Settings doctor status.

5. **Host Provider Bridge (`host.ts`)**:
   - The manifest declares `host.ts` as its source entry; the build emits `dist/host.js`. Path installs must never use the emitted bundle as the next build's input.
   - Launches `agy_acp_server` as a persistent per-thread ACP server.
   - Intercepts `provider/health`, `model/list`, and `provider/usage`.
   - Transparently upgrades legacy `agy-*` `providerThreadId` resume requests into fresh `thread/start` sessions.

Domain terms are defined in [GLOSSARY.md](GLOSSARY.md).

---

## Building and Testing

```bash
# Build server.mjs, app.js, dist/host.js, and *.meta.json
node plugins/provider-antigravity/scripts/build.mjs

# Run unit & component tests
cd plugins/provider-antigravity
npm test
```
