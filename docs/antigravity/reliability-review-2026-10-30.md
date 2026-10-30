# Antigravity Provider reliability review

Initially reviewed 2026-10-30 on branch `review/antigravity-provider-reliability`, based on `a5ff0fc`. The original findings and plan below are retained for context. Implementation is now version 0.3.0; the installed marketplace plugin has not been replaced.

## Implementation results

- Implemented automatic cold/expired catalog discovery, concurrent-refresh sharing, failure backoff, same-credential stale fallback, explicit cached labels, and preservation of model IDs. Empty catalogs remain eligible for discovery after backoff so late updates can recover. Sign-out and credential changes invalidate cached data.
- Fixed grouped model extraction, authoritative config precedence over legacy aliases, and handling of catalog update notifications during discovery.
- Generic server errors retain their cause; unverified health is `unknown` rather than `unauthenticated`. Diagnostic deadlines now report an explicit timeout and close the process tree. Readiness cache writes use uniquely named temporary files and rename.
- Plan is registered as a composer action. Isolated native ACP testing established that `/plan` is an advertised command even though it is absent from permission-mode choices. A real planning request produced a plan and left the temporary project unchanged. Plan uses that native command rather than pretending `default` is a planning permission policy.
- Established a working quota source: the native ACP server advertises and implements `/usage`. Implemented provider usage reporting and a Settings button with remaining percentages, per-pool reset times, source and check timestamp. Command discovery can arrive after `session/new`, so the diagnostic waits briefly for it. Unknown/unadvertised commands are not sent speculatively to a model. Results are bounded, concurrent reads share a query, and successful usage checks are cached for one minute. Sign-out discards pending UI results. Credits and session token usage are not fabricated from quota data.
- Checked native runtime 1.4.3 and checksum-verified 1.4.5 separately. Both returned Gemini 4 Argon and Gemini 3.8 Flash as the two base-model choices for this account. The legacy catalog contains reasoning-specific aliases of those same models. Additional partner models were not present in either raw native catalog. The managed pin remains 1.4.3; no installed runtime was changed.
- The companion app fix is in the Zana repository on `fix/composer-unavailable-mode-recovery-v2`: missing saved modes display as unavailable, with an explicit Switch to Agent action that clears the invalid mode and retains the draft.
- Fixed test environment isolation after discovering an existing logout test could write real authentication settings even with a separate `ZCC_DATA_DIR`. Restored the previously verified OAuth setting and isolated HOME, USERPROFILE, GEMINI_HOME and ZCC_DATA_DIR in all plugin tests. Also corrected Windows PATH casing in the app's E2E launcher: fake provider turns had been failing with `spawn node ENOENT` because `Path` was lost when adding uppercase `PATH`.

PR #22 review fixes also revalidate source and managed credentials before returning or caching catalog and usage results, including sign-out, account replacement and changes during headless authentication. Access-token refresh for the same refresh token remains valid. Readiness and usage diagnostics share runtime setup, auth detection, deadlines and cleanup. Synchronous setup failures return structured bridge errors, and oversized usage output reports its cause.

Concurrent first-time headless catalog and usage diagnostics now share one auth settings commit while authenticating each runtime independently. The group validates the account before accepting each authentication, so another diagnostic's settings write is allowed while sign-out or credential replacement still invalidates pending results. Both refresh paths prepare the managed home once and reuse their initial fingerprints for identity and cache keys.

Current plugin verification: 109 tests pass across six files, including the generated UI bundle. In an isolated checkout with locked tools and the pinned SDK, coverage passes the configured floor: statements 93.58%, branches 83.67%, functions 94.51%, lines 95.54%. Typecheck, build, manifest validation and bundle syntax checks pass. Seven account-isolation regression cases and both concurrent-auth completion orders were observed failing before their fixes. Eight concurrency checks cover both headless auth methods, both completion orders, sign-out and credential replacement. Two additional checks preserve same-account token refresh and headless-auth usage caching. Companion-app results have not been rerun in this pass.

## Evidence and findings

### P1 — Catalog expiry produces the screenshot warning

`src/native-auth.ts:675,721–831` couples catalog availability to a ten-minute readiness TTL. Once the cache expires, local credentials produce `authenticated` with `models: []`. `host.ts:272–312` only calls this fast path for `model/list`; it cannot run discovery. It then returns the exact “No models discovered…” text shown in the screenshot. Repeated refreshes through this handler cannot refresh the native catalog. `host.ts:190–198` also reports an unverified session as `unauthenticated`, conflating cache freshness with authentication failure.

The real persisted catalog was last checked at 2026-10-27T17:41:09.065Z and contained Gemini 4 Argon and Gemini 3.8 Flash. The existing TTL-expiry test deterministically verifies the transition from `session_ready` to `authenticated`. This is a confirmed mechanism matching the warning, though the screenshot alone cannot establish which invalidation triggered that particular request.

### P1 — Model extraction omits grouped catalog entries

`src/native-auth.ts:393–437` reads only top-level `options[].value`. ACP supports groups containing their own `options`; those entries have no top-level value and are skipped. A throwaway test using a valid grouped model entry returned zero models. This proves the parser defect, but does not establish that Google's current response uses groups.

Only the first model config option is read, and `models.availableModels` is considered only if the config parser returns zero entries. Conflicting or partial representations need a documented precedence policy rather than an unconditional union that might reintroduce unavailable models.

The probe's stdout handler (`src/native-auth.ts:523–549`) ignores notifications and server requests. Consequently it cannot observe later `config_option_update` catalog changes or handle an unexpected server request. Actual thread sessions are delegated to the SDK bridge, so this finding concerns the separate readiness probe.

### P1 — Error classification can incorrectly request sign-in

`src/native-auth.ts:986–1011` treats every JSON-RPC error with code `-32000` as authentication required. That generic server-error code is not sufficient evidence of expired credentials. Other server failures can lose their original message and be presented as sign-in failures. Failed probe results are retained in memory for the same ten-minute TTL. Capture method, phase, code and structured recovery data, preserve the cause, and distinguish auth, quota, network, timeout and runtime failures.

### P2 — Runtime pin is behind the current registry

The plugin pins runtime 1.4.3. The official registry retrieved during this review lists 1.4.5. This warrants an isolated compatibility comparison, not an untested automatic update. Registry version freshness is not proof that it fixes model visibility.

### P2 — Subscription usage is not implemented

`server.ts:113` registers `maintenance.usage: false`. Readiness extracts only `_meta.antigravity.tier.name`, not quota balances or reset windows. A fresh real `initialize` / `session/new` check, with no model prompt, reported `session_ready`, Google AI Pro, and the same two parsed models at 2026-10-30T06:25:20.797Z. This is a fresh service-reported tier, not a billing renewal/expiry check or a remaining-usage measurement.

Google documents `/usage` (alias `/quota`) in its interactive CLI, and baseline usage in Antigravity Settings. Credits are a separate balance. These provide a supported manual route today. This review did not establish a documented machine-readable quota endpoint for the standalone ACP server. Do not infer remaining quota from tier or per-turn token usage, or assume CLI slash commands work over ACP.

### Historical errors need separate regression checks

Local server logs from October 27 include duplicate ESM-banner declarations during host bundle loading, permission-mode rejection by CodeNod, startup registration timeouts, and a review timeout. They predate this review and do not prove those issues remain in the current installed plugin. Include bundle-load and integration smoke checks; do not attribute all historical errors to the catalog bug.

## Proposed implementation sequence

### Added scope: missing Plan mode and saved-mode error

The second screenshot shows “The saved composer mode is unavailable. Choose an available mode before sending.” This is a composer selection error, separate from the model-discovery warning.

**Confirmed missing capability:** `plugins/provider-antigravity/server.ts:120` registers `composerActions: []`. The persisted native session advertises `default`, `auto_edit`, and `yolo`, with no `plan`. Zana's `packages/domain/src/bb-thread/execution-mode.ts:87–148` offers Plan only when a native mode is classified as Plan or the provider advertises the portable `plan` composer action. These inputs therefore offer Agent only. The native modes listed here are not evidence of a planning mode; `default` must not be relabeled Plan.

**Confirmed saved-selection mechanism:** In the adjacent Zana checkout, `apps/app/src/components/ThreadCommandComposer.tsx:365–370` displays the first available entry when the saved mode is missing, but still validates the saved ID and blocks sending after the catalog settles. This explains how Agent can appear selected while an unavailable saved mode causes the banner. The reset effect at lines 394–399 explicitly leaves user-saved selections unchanged. A Node assertion against the actual domain functions reproduced Agent-only options with a missing saved `plan` selection and an Agent display fallback. Zana already has a runtime test for the exact warning at `ThreadCommandComposer.runtime.test.tsx:546`. The screenshot does not reveal the stored mode ID, so Plan is a plausible example rather than a confirmed saved value for this incident.

**Mode discovery nuance:** With optional native-agent discovery disabled, `visibleAcpModeOptions` admits only IDs `build` and `plan`; the three saved native IDs above are filtered out. With discovery enabled they can appear as custom entries. Include both settings in the investigation rather than assuming the server's mode catalog is always visible.

**Additional implementation work:**

- Treat Plan support as a functional feature: compare native 1.4.3/1.4.5 session modes and config options first. If supported, map the actual native planning capability. If absent, verify whether Zana's portable planning path can enforce the intended behavior for generic ACP before registering `composerActions: ['plan']`. Merely exposing the menu or forwarding a literal `/plan` is insufficient. Verify planning instructions, edit/command restrictions, plan output/revision, persistence across turns and explicit transition to implementation. Keep work intent separate from permission modes and native approval policies.
- Fix stale saved-mode recovery in the owning Zana repository, with its own branch/PR if needed. Show the unavailable saved choice explicitly and provide a direct “Switch to Agent” recovery action that updates both saved composer mode and underlying ACP selection. Preserve draft text. Avoid displaying Agent as if it were already selected while validating a hidden stale ID. Do not silently downgrade saved Plan intent to executing Agent behavior.
- Refresh the catalog before declaring a saved mode unavailable; preserve valid selections through loading and transient discovery failures. Scope persisted selections to the appropriate provider/thread context and migrate only documented aliases. Inspect the actual stored ID and catalog when reproducing this account's intermittent case.

1. **Preserve catalog availability independently of health freshness.** Store the last successful catalog with account/auth/runtime identity, source and timestamp. Serve a clearly stale catalog during transient refresh failures for the same identity; invalidate on sign-out or account change. Do not preserve a false ready/authenticated state or leak a previous account's catalog. Add one bounded discovery refresh shared by concurrent callers, failure backoff, and explicit force-refresh behavior. Keep ordinary health reads cheap and avoid spawning one runtime per menu opening. Check the host SDK's supported stale/error metadata and model-list deadline before selecting the response shape.
2. **Make discovery complete and testable.** Parse flat and grouped options, define authoritative-source precedence, preserve reasoning metadata, and process relevant catalog updates. Capture a sanitized summary of raw model config structure to distinguish upstream omission from parser omission. Compare the same account's native catalog with Google's picker before concluding which models should appear. Never hard-code advertised public model names as entitled model IDs.
3. **Make failures explain themselves.** Preserve server causes and attach operation, elapsed time, runtime version, cache freshness and recovery action. Separate authentication failures from unverified/expired checks. Recompute credential fingerprints after successful authentication/token refresh and test cross-process cache replacement and isolation. Use atomic persisted writes; reject malformed cache payloads. Keep diagnostics free of credentials and prompt content.
4. **Add subscription visibility in stages.** Show service-reported tier and last-check time first, with a supported manual usage route. Inspect negotiated ACP capabilities and sanitized metadata to establish whether 1.4.3 or 1.4.5 provides quota windows. If a supported machine-readable source exists, implement `provider/usage` with per-pool remaining values, units, reset times and source timestamps, then enable maintenance usage. Otherwise show remaining usage as unavailable and retain the manual route. Keep baseline limits, credit balance and conversation token usage distinct.
5. **Validate and package.** Compare 1.4.3 and 1.4.5 in isolated runtime directories without replacing the installed runtime. Verify sign-in, discovery, reasoning, one thread's lifecycle and process cleanup. Smoke-test loading the committed bundle through Zana, including CodeNod permissions. Bump plugin version, update overview/release notes and rebuild committed artifacts before a PR. No push, installation change or publication was performed for this review.

## Acceptance checks

- With a catalog older than ten minutes, model listing remains useful and reports freshness; it does not incorrectly demand sign-in.
- Concurrent refreshes share one bounded probe; transient failure retains a same-account stale catalog, while logout/account changes invalidate it.
- Flat/grouped catalogs, duplicate IDs, partial legacy fields, model updates and per-model reasoning are covered by protocol fixtures.
- Generic `-32000` errors retain their cause; actual auth failures offer sign-in; timeouts and quota errors remain distinguishable.
- Successful token refresh does not immediately invalidate its newly written catalog; cache reads tolerate atomic cross-process replacement.
- Usage displays only observed balances and reset times, with timestamps; unsupported sources explicitly report unavailable.
- Both native runtime versions receive an isolated compatibility check; final bundles load through the actual host and source/artifacts match.
- Plan is visible only when its end-to-end behavior is supported; selecting it produces a plan without unintended edits or commands, survives follow-ups/restart, and requires explicit implementation intent to execute.
- Test saved Plan/custom/native modes after provider switching, plugin reload, catalog refresh, new-thread creation and thread restoration, with native discovery enabled and disabled.
- A removed saved mode is shown accurately, blocks an unsafe implicit change of intent, and offers a working explicit Agent recovery action; recovery preserves draft text and updates the underlying mode.

## Validation performed and limits

- Current full plugin suite: **109 passed** across six files. Test hooks isolate HOME, USERPROFILE, GEMINI_HOME and ZCC_DATA_DIR. Regression coverage includes source and managed account changes, sign-out during usage, obsolete failure results, concurrent callers, concurrent first-time headless diagnostics, headless authentication changes, same-account token refresh, oversized output and synchronous bridge setup errors.
- Temporary diagnostic checks: **2 passed**: grouped-model omission reproduced and a live native-session check completed. The live check output was verified through its isolated persisted result; it sent no model prompt. Temporary test source removed.
- Host/server/UI tests, plugin typecheck, build and bundle syntax checks pass in an isolated checkout using the repository's locked dependencies and SDK commit `bb2cb0b6201dd409fbf73dd11bf7096df5dacf93`. CI now installs local tools even for plugins without a lockfile and builds the SDK before testing. Host bundles were rebuilt against that same layout to remove adjacent-checkout bundle drift. Two CI-runner regression tests cover repository-tool fallback and plugin-tool priority. The generated UI bundle is exercised by the UI tests; loading the rebuilt plugin inside Electron has not been repeated in this pass.
- Remaining usage, billing dates, the raw live catalog's complete structure and whether runtime 1.4.5 changes catalog contents were not established.
- Follow-up review: a direct Node assertion using Zana's real mode projection reproduced Agent-only entries and an unavailable saved Plan selection. The exact screenshot guard and existing host runtime test were inspected; the full composer test suite was not rerun. The incident's stored mode ID and native planning behavior remain unverified.

## Primary sources

- ACP config options, grouped selections and catalog update notifications: https://agentclientprotocol.com/protocol/v1/session-config-options
- Official runtime registry (1.4.5 at review time): https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json
- Google model availability and entitlement distinctions: https://antigravity.google/docs/models
- Google quota CLI command: https://www.antigravity.google/docs/cli/commands/usage
- Google plans, baseline quota and overages: https://www.antigravity.google/docs/plans
- Google CLI credit monitoring: https://www.antigravity.google/docs/cli/credits/

Model entitlements and runtime versions can change. Google's public pages are not evidence of this account's exact entitlements; the native session and account-specific picker remain the decisive comparison.
