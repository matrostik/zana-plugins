# Antigravity Provider Plugin (`@zcc-ext/provider-antigravity`)

Google Antigravity ACP thread provider for Zana Command Center, powered directly by Google's official **Native ACP Server (`agy_acp_server`)**.

## 0.3.0 — Catalog recovery, Plan and subscription usage

- Model selection refreshes an expired or cold catalog automatically. Concurrent refreshes share one probe; transient failures preserve the last catalog for the same credentials. Sign-out and credential changes invalidate it.
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

2. **Authentication, Readiness & Sanitized `GEMINI_HOME` (`src/native-auth.ts`)**:
   - Supports all four official Google ACP authentication methods: `oauth-personal` (default), `oauth-business`, `gemini-api-key`, and `agent-platform`.
   - Prepares a sanitized ZCC `GEMINI_HOME` (`~/.zcc/state/antigravity-gemini-home`) that syncs `antigravity-acp/settings.json` and `antigravity-acp/acp_token.json` with `~/.gemini/antigravity-acp/` while automatically disabling unreachable IDE-only named-pipe MCP proxies (`*-antigravityide`) in `config/mcp_config.json` so prompts never stall on dead IDE pipes.
   - Keeps health and Settings reads non-spawning. Explicit model discovery refreshes cold or expired catalogs with one bounded probe, backs off failures, and preserves a stale same-credential catalog for transient failures. Readiness freshness remains separate from catalog availability.
   - Provides an explicit 5-stage live readiness probe (`probeNativeAcpReadiness` with `BROWSER=echo`) and interactive Google OAuth sign-in (`startNativeAcpSignIn`).

3. **Host Provider Bridge (`host.ts`)**:
   - Launches `agy_acp_server` as a persistent per-thread ACP server with `_meta.parameterizedModelPicker: true` and `nativeReasoning.configId: 'thinking_level'`.
   - Intercepts `provider/health`, `model/list`, and `provider/usage`; quota reads use a bounded native `/usage` command, coalesce concurrent checks and cache successful results for one minute.
   - Transparently upgrades legacy `agy-*` `providerThreadId` resume requests into fresh `thread/start` sessions.

---

## Building and Testing

```bash
# Build server.mjs, app.js, dist/host.js, and *.meta.json
node plugins/provider-antigravity/scripts/build.mjs

# Run unit & component tests
cd plugins/provider-antigravity
npm test
```
