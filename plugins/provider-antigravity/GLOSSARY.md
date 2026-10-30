# Antigravity Provider Glossary

**Native ACP runtime**: Google's `agy_acp_server` distribution, managed under `~/.zcc/runtimes/antigravity-acp/` (`src/native-runtime.ts`).

**Source home / managed home**: the user's Gemini home (`~/.gemini` or `GEMINI_HOME`), and the sanitized copy the runtime actually reads (`~/.zcc/state/antigravity-gemini-home`). Tokens and settings sync between them; unreachable IDE-only MCP proxies are dropped from the managed copy (`src/gemini-home.ts`).

**Headless auth method**: `gemini-api-key` and `agent-platform`. Their credentials live in the environment, and a diagnostic writes their auth type after a headless `authenticate`.

**Account snapshot**: the account a diagnostic started against: both homes' credential fingerprints, the readiness and refresh keys, and the opaque credential id. It stays *current* until credentials change, an explicit invalidation (sign-in, sign-out, auth-type or runtime change) runs, or the account is switched in another process. A snapshot adopts its own headless auth-type write (`src/account-identity.ts`).

**Native ACP session**: one short-lived conversation with the runtime used for diagnostics and sign-in. It never approves tools or serves filesystem requests (`src/acp-session.ts`).

**Readiness**: what is known about the runtime and account: `runtime_missing`, `runtime_launches`, `sign_in_required`, `authenticated` (credentials present, unverified) or `session_ready` (verified, with a model catalog).

**Readiness store**: readiness shared between the Settings process and thread host processes, in memory and on disk (`src/readiness-store.ts`).

**Catalog**: the models a ready session offers. A catalog is *settled* when readiness alone answers a model request; it is *stale* when expired but still the last good catalog for the same account.

**Keyed refresh**: coalesced, cached and backed-off refreshes of the catalog and of `/usage` quota (`src/keyed-refresh.ts`).

**Provider config**: settings normalization, the launch spec, and the projections of readiness into thread health, `model/list` replies and the Settings doctor status (`src/provider-config.ts`).
