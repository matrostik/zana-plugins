---
name: codenod
description: Triage and AI-review GitHub pull requests and local changes with the CodeNod plugin — list the review inbox, run multi-model reviews with Zana's providers on a pull request or on uncommitted, staged, or branch changes before a pull request exists, read scores and findings, and post comments (`zcc codenod` CLI and `codenod_*` tools).
---

# CodeNod Skill

Use CodeNod when the user asks which pull requests need their review, wants an AI review of a GitHub pull request, wants a review of local changes before committing or opening a pull request, or wants to read or post the findings of an earlier review.

The review inbox (`list` / `sync` / `codenod_list_prs`) only includes pull requests in watched repositories. `review` and `show` still work for a pull request URL even if that repository is not watched.

Pull requests are referenced as a URL (`https://github.com/acme/api/pull/42`), `host/owner/repo#42` for GitHub Enterprise, or `owner/repo#42` for the default host.

## CLI Usage

```bash
zcc codenod list [--tab needs-review|mine|watched] [--json]
zcc codenod sync
zcc codenod review <pr> [--models provider:model[@reasoning],...] [--prompt id|builtin] [--wait] [--json]
zcc codenod show <pr> [--json]
zcc codenod post <pr> --yes [--findings all|id,id] [--message "..."]
zcc codenod review-local [--path dir] [--scope uncommitted|staged|branch] [--base origin/main] [--intent "..."] [--models ...] [--prompt id|builtin] [--wait] [--fail-on critical|high|medium|low] [--json]
zcc codenod show-local [--path dir] [--json]
zcc codenod repos [list | add <owner/repo> [--auto] [--spec "docs/**/*.md"] | remove <host/owner/repo>]
zcc codenod models [--json]
zcc codenod auth
```

Run `zcc codenod models` to see the `provider:model` ids accepted by `--models`.

`post` only publishes comments. It refuses to run without `--yes`; confirm with the user before passing it. Approving or requesting changes is only possible from the CodeNod page in Zana, where the user signs off explicitly.

## Local Reviews

`review-local` reviews a checkout of a Zana project without a pull request. It defaults to the current directory, which must be a checked-out location (the main checkout or a `git worktree`) of a registered project.

Use `zcc codenod prompts` or `codenod_list_prompts` to discover prompt IDs. Pass `--prompt <id>` or the agent tool's `promptId` to override the configured default; use `--prompt builtin` or `promptId: null` for built-in instructions only.

- `--scope uncommitted` (default): every change since HEAD, including new files that are not gitignored.
- `--scope staged`: only what `git add` staged.
- `--scope branch`: everything since the merge base with `--base` (defaults to the remote's default branch), including uncommitted work.
- `--intent` states what the change is meant to do; with branch commit messages and the repository's spec files it drives the requirements score.

CodeNod reviews an immutable snapshot commit (kept under `refs/codenod/local/`) and never changes the user's files, index, or branches. Changed files that look like secrets (`.env*`, keys, certificates, `*credentials*`, `*secret*`) are kept at their base version, whether untracked, staged, or committed on the branch. Binaries, new files over 256 KB, and new files beyond the first 200 are also skipped; all skipped files are listed. Reviewers read a worktree of the snapshot, never the live checkout. Local reviews can never be posted to GitHub.

`--fail-on <severity>` (needs `--wait`) exits 1 when an active finding is at or above that severity, when the review does not complete, and when files changed while it ran (stale).

## Agent Tools

- `codenod_list_prs` — open pull requests with CI state and latest review status; optional `tab`.
- `codenod_get_review` — scores (risk, coverage, requirements, simplicity, stability), summary, per-model runs, and findings for `pr`.
- `codenod_review_pr` — start an unattended AI review of `pr`; optional `models`, `wait`, and `remediationGate`. It never posts to GitHub. When `wait: true` and `remediationGate: true`, returns `blockingCount`, `blockingFindings`, and `coordinatorThreadId`.
- `codenod_review_local` — review this thread's own checkout before a pull request exists; optional `scope`, `base`, `intent`, `worktreePath` (another checkout of the same project), `models`, `wait`, and `remediationGate`. Runs quietly (no Agents board card, no Inbox message), never posts, and never modifies files. Returns `status: "stale"` instead of results when files changed while the review ran.

## Pre-PR Self-Review Playbook

Before opening a pull request for changes you made:
1. Call `codenod_review_local` with `wait: true`, `remediationGate: true`, and an `intent` that states what the change should do. Use `scope: "branch"` when the work is already committed.
2. If `blockingCount > 0`, fix the `blockingFindings` in your checkout. Do not commit just to satisfy the review; the default scope already includes uncommitted work.
3. Review again. Stop after **3 review rounds in total**: if blocking findings remain, report them to the user instead of looping.
4. If a call returns `status: "stale"`, files changed during the review; run it again before acting on findings.

## Post-PR Self-Review Playbook

When an agent authors changes and creates a pull request (e.g. via `gh pr create`):
1. **Trigger Review**: Call `codenod_review_pr` with `pr`, `wait: true`, and `remediationGate: true`.
   - The review automatically creates a single visible Coordinator Thread on Zana's Agents board so the review is observable without thread clutter.
2. **Inspect Blocking Findings**: The tool response provides structured `blockingCount` and `blockingFindings` (critical and high-severity issues flagged by review models).
3. **Bounded 1-Retry Remediation**:
   - If `blockingCount > 0`, address the issues in the workspace, commit, and push.
   - Run `codenod_review_pr` with `wait: true` and `remediationGate: true` **at most once more**.
   - If findings remain after this single remediation cycle, do not loop further; report the findings and PR link to the user.

## Reading Results

- Risk is 1–10 where higher is riskier; the other scores are 1–10 where higher is better.
- The requirements score is empty when the pull request, its linked issues, and spec files state no requirements.
- Each finding lists the models that agreed on it; findings flagged by more models are more likely real.
- A review marked stale was made for an older commit; start a new review before acting on it.
- A local review marked stale was made for files that have changed since; start a new review before acting on it.

## Git Hook Recipe

CodeNod installs no hooks. If the user wants a gate before pushing, suggest this `.git/hooks/pre-push` (make it executable). A review takes minutes, so pre-push fits better than pre-commit:

```sh
#!/bin/sh
zcc codenod review-local --scope branch --wait --fail-on high || {
  echo "CodeNod: blocking findings or the review failed. Inspect with: zcc codenod show-local"
  echo "Push anyway with: git push --no-verify"
  exit 1
}
```
