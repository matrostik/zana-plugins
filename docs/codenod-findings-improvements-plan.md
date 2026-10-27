# CodeNod findings improvements implementation plan

## Goal

Improve provenance and reuse of findings in the CodeNod PR detail view, and let reviewers choose exactly which unposted findings to send to GitHub. Keep the implementation within the existing Zana plugin UI/RPC architecture.

## Current behavior and relevant code

- Findings are rendered by `FindingsView` and displayed as file-grouped cards. `FindingRow.agreedBy` already contains the model identifiers that produced a consensus finding; the card only shows a count when the review used multiple models.
- The detail view's `postableFindings` is derived from every active, unposted finding matching current severity/category filters. The Post action submits those IDs to the existing `post` RPC. The server validates IDs against the review and excludes dismissed/already-posted findings.
- Cards can be edited and dismissed. Posted cards are read-only. Review findings and model runs already have separate test coverage.
- No finding selection or clipboard action exists today.

## Product decisions

1. Show provenance on each finding as the names in `agreedBy`, including the single-model case. Render an explicit fallback such as “Model unavailable” only for malformed/legacy empty provenance. Keep the aggregate denominator/count as secondary information if useful; do not imply all completed models agree when only a subset flagged the finding.
2. “Copy selected findings as prompt” means selection is for prompt generation and review/post selection can share the same selected IDs to avoid two inconsistent selection mechanisms. The copy action copies a ready-to-paste prompt containing PR identity/title, review commit, and each selected finding's severity, category, location, description, optional suggestion, and model attribution. It does not copy hidden diff/context or send data to another agent.
3. Selecting findings is explicit. Default selection should preserve today's convenient behavior by selecting all eligible findings matching active filters when the selection feature is first used (or by a visible Select visible action). After selection becomes user-controlled, filter changes must not silently add/remove IDs; selection persists across filters and is pruned when findings become dismissed, posted, or disappear on review change.
4. “Post selected” submits only selected, eligible IDs. Keep the existing message-only comment behavior and approval flow for Approve/Request changes; for approval events, selection still controls included findings. GitHub remains an explicit user-triggered side effect.

## Implementation slices

### 1. Model attribution on cards

- In `FindingCard`, render the `agreedBy` values as compact model badges or a readable “Flagged by …” line. Preserve provider/model IDs as accessible text and allow wrapping/truncation with a title for long names.
- Use the model identities already persisted in `FindingRow`; no database migration or server RPC is needed.
- Keep consensus count if it adds value, but derive the attribution display from `agreedBy` itself and avoid conflating the number of configured models with the finding's provenance.

### 2. Shared finding selection and copy-to-prompt

- Own selected finding IDs at `PrDetail` level (or another component that can coordinate FindingsView and the post footer), keyed/reset by the active review ID.
- Add accessible checkboxes to eligible cards and bulk “Select visible” / “Clear selection” controls. Selection should include only active and unposted findings; disabled/posted/dismissed cards cannot be selected.
- Add a pure formatter for the prompt text, preferably in `src/app/format.ts` or a focused utility, so it is deterministic and directly unit-testable. Escape/quote model-produced content as plain text and delimit findings clearly; do not interpret model HTML.
- Add “Copy N selected as prompt”. Use the supported browser clipboard API from the user gesture; surface success/failure through the existing status/error pattern. Disable the action at zero eligible selections. Avoid adding a server RPC because clipboard access belongs in the renderer.
- Preserve current edit and dismiss semantics. Disable selection/copy while editing or while conflicting actions are busy.

### 3. Post only selected findings

- Pass selected IDs into the detail post calculation and derive `postableFindings` by intersecting selected IDs with active, unposted findings matching the current filters. Clearly show selected eligible count and provide a visible select/clear action so users understand why filtered findings are or are not included.
- Submit only these IDs through the existing `post` RPC; keep server-side filtering/validation as the authority. Do not change the post payload or GitHub API behavior unless implementation reveals a specific gap.
- Preserve message-only COMMENT behavior. Preserve signed approval binding and stale-review protections for APPROVE/REQUEST_CHANGES. Ensure the confirmation detail reports the actual selected finding count.
- After a successful post, remove newly posted IDs from selection. On failed/partial posts, preserve IDs that remain eligible so the user can retry; reconcile against refreshed findings.

### 4. Documentation and regression coverage

- Update CodeNod README/PLUGIN_OVERVIEW usage text to explain model attribution, selection, copying, and selected-only posting.
- Extend the existing `pr-detail-actions` and `FindingsView` UI tests for provenance display, selection across filters, copy formatting/success/failure, selected-only GitHub payload, reset across review IDs, and posted/dismissed cleanup. Add pure formatter tests.
- Follow the plugin guide: keep UI state in React, avoid unnecessary backend/storage changes, use host theme tokens and accessible labels, and test app components with the existing Vitest/jsdom setup.
- Rebuild committed `app.js` (and `server.mjs` only if server code changes) using the documented plugin build command. Verify generated artifacts are in sync before release.

## Acceptance criteria

- Every finding card identifies the model(s) that flagged it, including single-model reviews.
- A user can select one or more eligible findings, copy a complete prompt containing only those findings, and receive a clear result if clipboard access fails.
- A user can post only chosen eligible findings; unselected findings are not sent. Filter changes do not unexpectedly broaden selection.
- Existing dismissal/editing, message-only comments, GitHub posting safeguards, stale approval refusal, and post reconciliation continue to work.
- UI and formatter regression tests cover the behaviors above; `npm run typecheck`, `npm test`, and `npm run build` pass.

## Likely files

- `plugins/codenod/src/app/FindingsView.tsx`
- `plugins/codenod/src/app/PrDetail.tsx`
- `plugins/codenod/src/app/format.ts` (or a dedicated prompt formatter)
- `plugins/codenod/src/app/styles.ts`
- `plugins/codenod/src/__tests__/pr-detail-actions.test.tsx`
- `plugins/codenod/src/__tests__/pr-detail.test.tsx` and/or a focused FindingsView test
- `plugins/codenod/src/__tests__/format.test.ts`
- `plugins/codenod/README.md`
- `plugins/codenod/PLUGIN_OVERVIEW.md`
- generated `plugins/codenod/app.js`

## Risks / details to settle during implementation

- Very long selections can exceed clipboard expectations; show the selected count and keep formatting plain text, but do not truncate silently.
- Preserve selection for findings hidden by filters so narrowing a filter does not destroy intent; make the current visible selection count obvious.
- The current server may omit some requested findings from the GitHub review body when GitHub's payload size limit is reached. Keep existing response semantics and ensure only IDs actually marked posted are removed from selection.
