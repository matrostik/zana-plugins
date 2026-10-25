# Antigravity Provider Plugin (`@zcc-ext/provider-antigravity`)

Google Antigravity ACP thread provider for Zana Command Center, powered directly by Google's official **Native ACP Server (`agy_acp_server`)**.

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
   - Provides a fast, non-spawning readiness & model cache (`getFastNativeReadiness`) so `model/list`, `provider/health`, and Settings loads complete in `< 2ms` without spawning background 372 MB `agy_acp_server` processes.
   - Provides an explicit 5-stage live readiness probe (`probeNativeAcpReadiness` with `BROWSER=echo`) and interactive Google OAuth sign-in (`startNativeAcpSignIn`).

3. **Host Provider Bridge (`host.ts`)**:
   - Launches `agy_acp_server` as a persistent per-thread ACP server with `_meta.parameterizedModelPicker: true` and `nativeReasoning.configId: 'thinking_level'`.
   - Intercepts `provider/health` and `model/list` directly in the host bridge using `getFastNativeReadiness`.
   - Transparently upgrades legacy `agy-*` `providerThreadId` resume requests into fresh `thread/start` sessions.

---

## Building and Testing

```bash
# Build server.mjs, app.js, dist/host.js, and *.meta.json
node plugins/provider-antigravity/scripts/build.mjs

# Run unit & component tests
npx vitest run plugins/provider-antigravity
```
