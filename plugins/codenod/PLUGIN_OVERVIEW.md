# CodeNod

Triage and AI-review GitHub pull requests in Zana Command Center using the AI providers you already configured in Zana.

## What you get

- **Review Inbox**: A sidebar page with three lists — **Needs my review**, **Mine**, and **Watched** — showing CI state and the latest review for each pull request in repositories you watch. Works with github.com and GitHub Enterprise hosts at the same time.
- **Multi-Model AI Review**: Each selected model reviews the pull request in its own hidden, full-access Zana thread, so reviews run without approval prompts. When the repository is a Zana project, the review runs in a fresh worktree so the model can read surrounding code; otherwise it reviews the diff alone.
- **Scores and Findings**: Risk, test coverage, requirements, simplicity, and stability scores, plus security, performance, logic, and style findings. Findings that several models agree on are merged and ranked higher.
- **Requirements from GitHub**: Requirements come from the pull request title and description, up to three linked issues, and an optional spec file pattern per repository.
- **Findings Workflow**: Theme-aware severity cards identify the model(s) that flagged each finding, with suggested fixes, filters, collapsible file groups, and highlighted code context. Select all or visible findings, copy selected findings as a prompt for another agent, edit unposted findings, or dismiss findings with undo and restore.
- **Post to GitHub**: Post selected active findings matching the current filters as review comments, with support for re-posting previously published findings. Approving or requesting changes asks for your explicit sign-off and is refused once new commits arrive.
- **Outdated Reviews**: An amber banner shows the reviewed and current commits, with a Rerun action. Inbox alerts are sent once per detected head commit and survive restarts; failed deliveries retry on a later sync. Previous completed findings remain visible during reruns and after failures or cancellation.
- **Deep Review**: Open a visible Zana thread with the full pull request context to dig in interactively.
- **Opt-in Auto-Review**: Per watched repository, review each new head commit automatically (drafts and your own pull requests are skipped).
- **Local Reviews**: Review uncommitted, staged, or branch changes in any checkout of a Zana project before a pull request exists. Reviews read an immutable snapshot commit, so your files, index, and branches are never touched.
- **CLI and Agent Tools**: `zcc codenod` from the terminal, and the `codenod_list_prs`, `codenod_get_review`, `codenod_review_pr`, and `codenod_review_local` tools for agents.

## GitHub sign-in

CodeNod uses, in order: `gh auth token --hostname <host>`, your Git credential helper, then tokens pasted into the **GitHub tokens** setting (`host=token`, one per line). Tokens are never stored in the plugin database or sent to the UI.

## Build artifacts

Like Git Tree, this plugin installs from pre-built artifacts committed alongside the source: `server.mjs` (referenced by `zcc.server`) and `app.js` (referenced by `zcc.app`). The TypeScript sources under `src/` plus `server.ts`/`app.tsx` are the source of truth; rebuild with `zcc plugin build` and re-commit the artifacts. Run the tests with `npm test`.

## Changelog

### 0.2.0

- **Local Reviews**: `zcc codenod review-local` reviews uncommitted (default), staged, or branch changes of the current checkout without a pull request. Each review captures an immutable snapshot commit under `refs/codenod/local/` using a temporary index; reviewers run in a worktree of that snapshot.
- **Safe File Selection**: Untracked files are included unless gitignored. Changed secret-looking files (untracked, tracked, staged, or committed on the branch) stay at their base version in the snapshot. Binaries, new files over 256 KB, and new files beyond 200 are skipped too, and every skipped file is listed with a reason. Reviewers always read a worktree of the snapshot, never the live checkout.
- **Requirements Without a PR**: An optional intent note, branch commit messages, and the repository's spec file pattern feed the requirements score.
- **Staleness**: Results are marked stale when the reviewed files, the commit they sit on, or the branch's merge base change. Starting the same review twice, even at the same moment, reuses the running one. `--fail-on` also fails on a stale result.
- **Fix and Deep Review Back Ends**: Fix starts a visible thread on the live checkout with normal permission prompts and never commits; it asks first when files changed since the review. Deep Review runs in a worktree of the snapshot.
- **Agent Pre-PR Review**: `codenod_review_local` reviews the calling thread's checkout quietly and returns blocking findings; the skill documents a 3-round limit and a pre-push hook recipe with `--fail-on`.
- **Retention**: Keeps 10 reviews per checkout, removes reviews older than 30 days except the latest, and forgets removed worktrees.

### 0.1.4

- **Internal**: The review pipeline now runs against a generic review target, with pull requests as the first target. No user-visible change; this prepares for reviewing local changes without a pull request.

### 0.1.3

- **Agents Board Review Coordinator**: Automated multi-model reviews spawn a single visible Coordinator Thread on Zana's Agents board (1 card per PR review instead of flooding with individual worker threads). Sub-model evaluation runs remain hidden, headless workers.
- **Review Thread Auto-Archive**: Visible Coordinator Threads and Deep Review threads are automatically archived once a PR is closed or merged on GitHub.
- **Deep Review with Targeted Findings**: Users can launch a Deep Review focused specifically on their selected finding(s).
- **Agent Post-PR Self-Review Loop**: Agents can invoke `codenod_review_pr` with `wait: true` and `remediationGate: true` to receive structured blocking findings for automated self-remediation before human sign-off.

### 0.1.2

- Added functionality to enable or disable automatic repository sync, with configurable interval between sync cycles.
- Dedicated "Repository synchronization" section in Organizations & Repos settings with toggle control and disabled state handling.
- Toolbar indicator showing when automatic background sync is paused.

### 0.1.1

- Added theme-aware finding cards, suggested-fix panels, severity/category filters, collapsible file groups, and highlighted code context checked against the reviewed commit.
- Added editing for unposted findings, filtered bulk dismiss with undo/restore, and posting of active, unposted findings matching the filters.
- Added commit-aware outdated review banners, amber list badges, and deduplicated Inbox notifications.
- Kept completed results visible while reruns progress or fail, with cancellation targeting the active rerun.
- Check for new commits on PR selection, app resume (at most once per minute), and review completion. Background checks use the configured sync interval (five minutes by default) while Zana is running.
