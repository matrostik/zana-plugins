# CodeNod for Zana

CodeNod reviews GitHub pull requests with AI, inside Zana Command Center. It uses the AI providers you already set up in Zana (Claude Code, Codex, Cursor, OpenCode, Pi, and others), so there are no separate API keys to manage.

This plugin is a port of the standalone **CodeNod 2.5.1** application, rebuilt as a Zana plugin with a smaller, focused feature set.

## Prerequisites

- Zana Command Center with at least one AI provider configured
- A GitHub account (github.com and/or GitHub Enterprise)
- One of: the GitHub CLI signed in (`gh auth login`), a Git credential helper that knows your GitHub host, or a personal access token

## How To Get Started

1. Install the plugin from the Zana marketplace, or from a local checkout with `zcc plugin install .` in this folder.
2. Open **CodeNod** from the Zana sidebar.
3. Click **Settings** in the CodeNod toolbar.
4. Under **Review models**, tick one or more models and click **Save models**.
5. Check **GitHub sign-in**. Each host should show "signed in". If not, see Troubleshooting.
6. Optional: under **Watched repositories**, add repositories you want to follow, and tick **Auto-review** for any that should be reviewed automatically.
7. Click **Refresh**. Your pull requests appear under **Needs my review**, **Mine**, and **Watched**.

## How To Review a Pull Request

1. Select a pull request in the list.
2. Click **Review** (or **Models…** to pick different models for this one review).
3. Wait for the review to finish. You get a Zana inbox notification when it does.
4. Read the scores and the **Findings** tab. Findings that several models agreed on are listed with all of their names.
5. Tick the findings you want to share, choose **Comment**, and click **Post N selected**. They appear as inline comments on GitHub.
6. To approve or request changes, choose that option instead. Zana asks you to confirm in a dialog first.

Use **Deep Review in thread** to open a normal, visible Zana thread with the pull request loaded, when you want to dig in interactively.

## What You Get

- **Review inbox** with three lists: pull requests waiting for your review, your own, and watched repositories. Each row shows CI state and the latest review.
- **Five scores**: risk (higher is riskier), plus test coverage, requirements, simplicity, and stability (higher is better).
- **Findings** in four categories: security, performance, logic, and style, each with a severity, file, line, and suggested fix.
- **Multi-model consensus**: each model reviews on its own; matching findings are merged and ranked by how many models agree. Up to 5 models per review.
- **Requirements from GitHub**: taken from the pull request title and description, up to 3 linked issues, and optional spec files per repository (for example `docs/**/*.md`). When nothing is stated, the requirements score shows N/A instead of guessing.
- **Several GitHub hosts at once**: github.com and any number of GitHub Enterprise hosts.
- **Opt-in auto-review** per watched repository: once per new commit, skipping drafts and your own pull requests.
- **Command line**: `zcc codenod list | sync | review | show | post | repos | models | auth`.
- **Agent tools**: `codenod_list_prs`, `codenod_get_review`, and `codenod_review_pr`, so Zana agents can check and start reviews.

## Safety

- Reviews run in hidden Zana threads using the most read-only permission mode each provider offers. When the repository is a Zana project, the review gets its own fresh worktree, so your working copy is never touched. Otherwise the model reviews the diff only.
- Pull request text, comments, and linked issues are treated as untrusted input and sanitized before they reach the model.
- Posting comments takes an explicit click (or `--yes` on the command line).
- Approve and Request changes need a Zana-signed confirmation tied to the exact commit you reviewed. They are refused if new commits arrived since the review. Agents and the command line cannot approve.
- GitHub tokens are read when needed and are never stored in the plugin database or sent to the UI.

## Troubleshooting

- **A host shows "not signed in"**: run `gh auth login --hostname <host>`, or paste a token into the **GitHub tokens (fallback)** plugin setting as `host=token`, one per line.
- **"No review model is configured"**: pick models in CodeNod settings, or pass `--models provider:model` on the command line. Run `zcc codenod models` to see the accepted ids.
- **A review failed**: open the **Models** tab and click **Open thread** to see what the model replied. Try again, or pick a different model.
- **Approve is refused as stale**: new commits were pushed. Click **Re-review**, then approve.
- **Plugin shows "Failed" in the Plugins hub**: click **Reload**. If it persists, restart Zana and check `zcc plugin logs codenod`.

## Settings

| Setting | Default | Purpose |
| --- | --- | --- |
| GitHub Enterprise hosts | empty | Extra hosts, comma-separated; github.com is always included |
| GitHub tokens (fallback) | empty | `host=token` per line, stored as a secret |
| Sync interval (minutes) | 5 | How often to poll GitHub |
| Reviews running at once | 2 | Reviews running at the same time |
| Review timeout per model (minutes) | 20 | Per-model time limit |
| Review workspace | worktree | Worktree, project checkout, or diff only |
| Fallback project for review threads | none | Zana project that hosts diff-only reviews |
| Archive hidden review threads when done | on | Keeps the thread list tidy |
| Custom review instructions | empty | Extra guidance added to every review |

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

| Area | CodeNod 2.5.1 | CodeNod for Zana |
| --- | --- | --- |
| AI models | Own AI clients and API keys | Zana providers, through hidden Zana threads |
| Storage | Postgres / Supabase | Plugin SQLite database (no data import) |
| App shell | Next.js web app and Electron | One Zana sidebar page and a settings section |
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
zcc plugin reload codenod
```

The TypeScript sources (`server.ts`, `app.tsx`, `src/`) are the source of truth. The built `server.mjs` and `app.js` are committed so the plugin installs without a build step; rebuild and commit them after changing the sources.

Layout:

- `server.ts` — plugin entry: settings, RPC methods, sync schedule, and wiring
- `src/server/github/` — host parsing, token resolution, and the GitHub REST client
- `src/server/review/` — prompts, context gathering, reply parsing, consensus, and the thread runner
- `src/server/` — database, sync, posting, views, and the CLI and agent tools
- `src/app/` — the sidebar page, pull request list and detail, and settings UI
- `src/__tests__/` — Vitest suites and a fake Zana host
- `skills/codenod/SKILL.md` — guidance for Zana agents
