# CodeNod

Triage and AI-review GitHub pull requests in Zana Command Center using the AI providers you already configured in Zana.

## What you get

- **Review Inbox**: A sidebar page with three lists — **Needs my review**, **Mine**, and **Watched** repositories — showing CI state and the latest review for each pull request. Works with github.com and GitHub Enterprise hosts at the same time.
- **Multi-Model AI Review**: Each selected model reviews the pull request in its own hidden, read-only Zana thread. When the repository is a Zana project, the review runs in a fresh worktree so the model can read surrounding code; otherwise it reviews the diff alone.
- **Scores and Findings**: Risk, test coverage, requirements, simplicity, and stability scores, plus security, performance, logic, and style findings. Findings that several models agree on are merged and ranked higher.
- **Requirements from GitHub**: Requirements come from the pull request title and description, up to three linked issues, and an optional spec file pattern per repository.
- **Post to GitHub**: Post selected findings as inline review comments. Approving or requesting changes asks for your explicit sign-off and is refused once new commits arrive.
- **Deep Review**: Open a visible Zana thread with the full pull request context to dig in interactively.
- **Opt-in Auto-Review**: Per watched repository, review each new head commit automatically (drafts and your own pull requests are skipped).
- **CLI and Agent Tools**: `zcc codenod` from the terminal, and the `codenod_list_prs`, `codenod_get_review`, and `codenod_review_pr` tools for agents.

## GitHub sign-in

CodeNod uses, in order: `gh auth token --hostname <host>`, your Git credential helper, then tokens pasted into the **GitHub tokens** setting (`host=token`, one per line). Tokens are never stored in the plugin database or sent to the UI.

## Build artifacts

Like Git Tree, this plugin installs from pre-built artifacts committed alongside the source: `server.mjs` (referenced by `zcc.server`) and `app.js` (referenced by `zcc.app`). The TypeScript sources under `src/` plus `server.ts`/`app.tsx` are the source of truth; rebuild with `zcc plugin build` and re-commit the artifacts. Run the tests with `npm test`.
