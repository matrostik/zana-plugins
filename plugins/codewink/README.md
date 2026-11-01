# CodeWink for Zana

CodeWink reviews GitHub pull requests with AI, inside Zana Command Center. It uses the AI providers you already set up in Zana (Claude Code, Codex, Cursor, OpenCode, Pi, and others), so there are no separate API keys to manage.

This plugin is a port of the standalone **CodeNod 2.5.1** application, rebuilt as a Zana plugin with a smaller, focused feature set.

## Prerequisites

- Zana Command Center with at least one AI provider configured
- A GitHub account (github.com and/or GitHub Enterprise)
- One of: the GitHub CLI signed in (`gh auth login`), a Git credential helper that knows your GitHub host, or a personal access token

## How To Get Started

1. Install the plugin from the Zana marketplace, or from a local checkout with `zcc plugin install .` in this folder.
2. Open **CodeWink** from the Zana sidebar.
3. Click **Settings** in the CodeWink toolbar. The **Profile** tab opens.
4. Under **GitHub accounts**, check that each host shows your name and login. If a host says "Not signed in", see Troubleshooting.
5. Optionally edit **Custom review instructions** and click **Save instructions**. CodeWink starts you off with default instructions; **Reset to default** brings them back.
6. Open the **AI Model** tab. Under **Review models**, pick one or more models and click **Save models**.
7. Open the **Organizations & Repos** tab. Add any GitHub Enterprise hosts and click **Save hosts**. Then add at least one repository under **Watched repositories**, and tick **Auto-review** for any that should be reviewed automatically.
8. Click **Back to pull requests**, then **Refresh**. Open pull requests in those repositories appear under **Needs my review**, **Mine**, and **Watched**.
9. Inside a Zana project, open the **CodeWink** project tab to see only that project's pull requests and local checkouts. If the project's GitHub repository isn't watched yet, click **Watch repository** there.

## How To Review a Pull Request

1. Select a pull request in the list.
2. Click **Review** (or **Models…** to pick different models for this one review).
3. Wait for the review to finish. You get a Zana inbox notification when it does.
4. Read the scores and the **Findings** tab. Findings that several models agreed on are listed with all of their names.
5. Filter findings by severity and category, expand file groups, and read the highlighted code context. Each finding identifies the model(s) that flagged it. Use **Edit** to revise an issue or its suggested fix before posting. Posted findings are read-only.
6. Select or unselect individual findings, or use **Select all issues**, **Select visible**, and **Clear selection**. **Copy N selected as prompt** copies the selected findings with PR context, location, suggestions, and model attribution for use in another agent.
7. Dismiss findings you want to exclude. Bulk dismiss affects only findings matching the current filters; **Undo** and **Restore** bring them back.
8. Choose **Comment**, then click **Post N findings to GitHub**. This posts selected active findings matching the filters (including previously published findings when re-posting), including those in collapsed file groups. Findings outside the diff appear in the review body. Unposted findings start selected; published findings are deselected after posting. Clear or adjust the selection before posting when needed.
8. To approve or request changes, choose that option instead. Zana asks you to confirm in a dialog first.

Use **Deep Review in thread** to open a normal, visible Zana thread with the pull request loaded, when you want to dig in interactively.

## How To Review Local Changes Before a Pull Request

CodeWink can review work in progress, even before you commit it. Your files, staging area, and branches are never changed.

Prerequisites: the folder is a Zana project (or a `git worktree` of one), and at least one review model is picked in CodeWink settings.

### From the CodeWink page

1. Open **CodeWink** and choose **Local changes** in the switch at the top.
2. Pick a checkout on the left. Checkouts are grouped by project and show how many files changed. Clean checkouts are hidden until you tick **Show clean**.
3. Under **Review local changes**, choose a scope: **Uncommitted**, **Staged**, or **Branch vs base** (optionally type a base branch).
4. Optionally describe the change under **Intent** so CodeWink can score requirements.
5. Click **Review changes**. A green **Snapshot taken** pill appears, then the review progress.
6. Read the scores and findings as for a pull request. **N files not reviewed** lists anything skipped and why.

**Expected result**: the latest review for the checkout, with **Rerun**, **Deep Review in thread**, **Fix with agent**, and **Delete review**. Earlier reviews are under **History**; click **View** to open one.

- If you edit files after the review, an amber **Working tree changed since this review** banner appears. Click **Review outdated — Rerun**.
- **Fix with agent** opens a picker for **Provider**, **Model**, and **Mode** (**Edit** or **Full**, as supported by the provider). It offers compatible providers independently of your review model list. Your last launch choices are remembered on this device; the initial choice is the first review model with Edit mode. Full must be chosen explicitly if Edit is unavailable. Launch failures stay in the picker so you can retry or choose another model. The agent edits your checkout and never commits. If files changed since the review, CodeWink asks before starting and preserves your chosen agent through that confirmation. Click **Re-review** when the agent finishes.

Starting a new PR or local review clears the previous scores, summary, findings, and model results from the current view once the server accepts the review, then shows the new progress. If a PR rerun fails or is cancelled, the view returns to the last completed review when available and displays the unsuccessful rerun's status and error alongside those results; terminal output reports it too. Local reviews keep showing the latest attempt, with earlier reviews available through **History**.

### From the terminal

1. Open a terminal in the project folder or one of its worktrees.
2. Run `zcc codewink review-local --wait`. This reviews every change since your last commit, including new files.
   - Add `--scope staged` to review only what you staged with `git add`.
   - Add `--scope branch` to review everything since your branch left the main branch (use `--base origin/develop` for another base).
   - Add `--intent "What the change should do"` so CodeWink can score requirements.
3. Wait for the review to finish. It prints scores, skipped files, and findings.
4. Run `zcc codewink show-local` at any time to see the latest results again. If you edited files since, the results are marked **stale**.

**Expected result**: scores and findings like a pull request review. Files that look like secrets (such as `.env` or private keys), binaries, and very large new files are skipped and listed so you know what was not reviewed.

**Tips**

- Zana agents can do the same with the `codewink_review_local` tool, so an agent can check its own work before opening a pull request.
- To gate pushes, add a pre-push Git hook that runs `zcc codewink review-local --scope branch --wait --fail-on high`. See `skills/codewink/SKILL.md` for a ready-made script.
- Local reviews can't be posted to GitHub. Open a pull request and review it there when you want comments on GitHub.

**Troubleshooting**

- **"does not belong to a Zana project"**: add the folder as a project in Zana first.
- **"No uncommitted changes to review"**: there is nothing to review in that scope. Try `--scope branch`.
- **"Base branch … does not exist" or "Could not find a default base branch"**: pass an existing branch with `--base`, for example `--base origin/main`.
- **"This branch has no commits yet"**: make a first commit, then review.

## What You Get

- **Review inbox** with three lists: pull requests waiting for your review, your own, and every open PR in watched repositories. The inbox only includes repositories you add. Each row shows CI state and the latest review.
- **Five scores**: risk (higher is riskier), plus test coverage, requirements, simplicity, and stability (higher is better).
- **Findings** in four categories: security, performance, logic, and style, each with a severity, file, line, and suggested fix.
- **Multi-model consensus**: each model reviews on its own; matching findings are merged and ranked by how many models agree. Up to 5 models per review.
- **Requirements from GitHub**: taken from the pull request title and description, up to 3 linked issues, and optional spec files per repository (for example `docs/**/*.md`). When nothing is stated, the requirements score shows N/A instead of guessing.
- **Several GitHub hosts at once**: github.com and any number of GitHub Enterprise hosts.
- **Opt-in auto-review** per watched repository: once per new commit, skipping drafts and your own pull requests.
- **Local reviews** of uncommitted, staged, or branch changes, before a pull request exists.
- **Command line**: `zcc codewink list | sync | review | show | post | review-local | show-local | repos | models | prompts | auth`.
- **Agent tools**: `codewink_list_prs`, `codewink_get_review`, `codewink_list_prompts`, `codewink_review_pr`, and `codewink_review_local`, so Zana agents can check and start reviews.

Create named review prompts and choose a default in CodeWink settings. For a single review, choose a prompt on the review screen, or run `zcc codewink prompts` to find IDs and pass `--prompt <id>` to `review` or `review-local`. Use `--prompt builtin` for built-in instructions only. Agent tools accept the same selection as `promptId` (use `null` for built-in only). Each review records the prompt text used, so reruns can preserve it even after the library changes.

## Safety

- Reviews run unattended in hidden Zana threads with each provider's full-access permission mode, so they never stop on an approval prompt. Providers without a full-access mode can't be used for reviews. When the repository is a Zana project, the review gets its own fresh worktree, so your working copy is never touched. Otherwise the model reviews the diff only.
- Local reviews read a snapshot commit built with a temporary Git index, so your files, staging area, and branches are untouched. Changed files that look like secrets are left out of the snapshot, and reviewers read a copy of the snapshot rather than your live folder.
- Pull request text, comments, and linked issues are treated as untrusted input and sanitized before they reach the model.
- Posting comments takes an explicit click (or `--yes` on the command line).
- Approve and Request changes need a Zana-signed confirmation tied to the exact commit you reviewed. They are refused if new commits arrived since the review. Agents and the command line cannot approve.
- GitHub tokens are read when needed and are never stored in the plugin database or sent to the UI.

## Troubleshooting

- **A host shows "not signed in"**: run `gh auth login --hostname <host>`, or paste a token into the **GitHub tokens (fallback)** plugin setting as `host=token`, one per line.
- **"No review model is configured"**: pick models in CodeWink settings, or pass `--models provider:model` on the command line. Run `zcc codewink models` to see the accepted ids.
- **A review failed**: open the **Models** tab and click **Open thread** to see what the model replied. Try again, or pick a different model.
- **Approve is refused as stale**: new commits were pushed. Click **Re-review**, then approve.
- **Plugin shows "Failed" in the Plugins hub**: click **Reload**. If it persists, restart Zana and check `zcc plugin logs codewink`.

## Settings

CodeWink review settings live in the CodeWink panel (**Settings** in the toolbar). The plugin settings page only contains the optional GitHub token fallback, used when `gh auth token` and `git credential fill` are unavailable.

The **Profile** tab presents the prompt library as a compact prompt selector with aligned name and instructions fields. **AI Model** shows actionable warnings for unavailable providers selected in the review configuration; unused provider failures stay under collapsed **Provider diagnostics**.

| Tab | Setting | Default | Purpose |
| --- | --- | --- | --- |
| Profile | GitHub accounts | read-only | Name, email, and login from each signed-in host |
| Profile | Custom review instructions | starter text | Extra guidance added to every review; empty means the built-in prompt only |
| Organizations & Repos | GitHub hosts | github.com | Add GitHub Enterprise hosts; the first one is used for `owner/repo#123` |
| Organizations & Repos | Sync interval (minutes) | 5 | How often to poll GitHub |
| Organizations & Repos | Watched repositories | none | Grouped by host and owner, with Auto-review and a spec pattern each |
| AI Model | Review models | none | Up to 5 models per review |
| AI Model | Reviews running at once | 2 | Reviews running at the same time |
| AI Model | Review timeout per model (minutes) | 20 | Per-model time limit |
| AI Model | Review workspace | worktree | Worktree, project checkout, or diff only |
| AI Model | Fallback project for review threads | none | Zana project that hosts diff-only reviews |
| AI Model | Archive hidden review threads when done | on | Keeps the thread list tidy |

**GitHub tokens (fallback)** stays in Zana's plugin settings, where it is stored as a secret. On upgrade, CodeWink copies existing review settings into its own settings store once.

---

## Migration Notes

### Source

The original application is **CodeNod 2.5.1**, a standalone Next.js web app with an Electron macOS desktop shell, a Postgres/Supabase database, and its own AI client layer. It covered review, analytics, team management, and several integrations.

### What was carried over

These parts were ported and adapted, mostly unchanged in behavior:

- The review system prompt, analysis categories, response schema, and quality rules
- The issue matcher used for multi-model consensus (tokenizing, similarity, anchors)
- Diff annotation with line numbers, the list of generated and binary files to skip, and the diff size budget
- The five-score model and severity levels
- Deep Review, rebuilt as a visible Zana thread

### What changed

| Area | CodeNod 2.5.1 | CodeWink for Zana |
| --- | --- | --- |
| AI models | Own AI clients and API keys | Zana providers, through hidden Zana threads |
| Storage | Postgres / Supabase | Plugin SQLite database (no data import) |
| App shell | Next.js web app and Electron | One Zana sidebar page, a per-project tab, and a settings section |
| GitHub sign-in | App-managed tokens | `gh` CLI, Git credential helper, or a secret setting |
| Requirements | GUS work items | Pull request text, linked GitHub issues, spec files |
| Notifications | Slack, Teams, in-app | Zana inbox |
| Approving | Auto-approve pipelines | Manual, with signed confirmation per commit |

### What was removed

- **GUS integration**, entirely
- Auto-approve and review pipelines, the pipeline builder, and the Auto Reviewer agent
- Reviewer recommendation and auto-assignment
- Slack and Microsoft Teams integrations
- PR lifecycle analytics and charts, saved filters, and the comments inbox
- The MCP server, the `tinynod` companion, and the Conclave feature
- The Electron desktop app and its bundled database

### Key decisions

- **Hidden threads instead of direct model calls**, so every Zana provider works the same way and reviews can read the repository in a worktree.
- **JSON-only replies with one repair retry**: if a model's reply can't be parsed, it is asked once to resend valid JSON.
- **Polling, not webhooks**, so no public endpoint is needed.
- **Reviews are manual by default**; auto-review is opt-in per repository.

## Development

```bash
npm install          # dev dependencies only (tests and type checking)
npm test             # 33 tests: pure logic, a fake Zana host end to end, and UI rendering
npm run typecheck
npm run build        # zcc plugin build → server.mjs and app.js
zcc plugin reload codewink
```

The TypeScript sources (`server.ts`, `app.tsx`, `src/`) are the source of truth. The built `server.mjs` and `app.js` are committed so the plugin installs without a build step; rebuild and commit them after changing the sources.

Layout:

- `server.ts` — plugin entry: settings, RPC methods, sync schedule, and wiring
- `src/server/github/` — host parsing, token resolution, and the GitHub REST client
- `src/server/review/` — prompts, context gathering, reply parsing, consensus, and the thread runner
- `src/server/local/` — Git snapshots and the local review service
- `src/server/` — database, sync, posting, views, and the CLI and agent tools
- `src/app/` — the sidebar page and project tab, pull request list and detail, and settings UI
- `src/__tests__/` — Vitest suites and a fake Zana host
- `skills/codewink/SKILL.md` — guidance for Zana agents
