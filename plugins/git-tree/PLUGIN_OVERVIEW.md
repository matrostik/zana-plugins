# Git Tree

View an interactive Git Tree of your project repository in Zana Command Center, modelled after `mhutchie/vscode-git-graph`.

## What you get

- **Per-Project Left Menu Tab (`Git Tree`)**: Opens directly inside any Project workbench (and can be detached into its own window or split pane).
- **Rich Commit DAG Visualization**: Renders local and remote branches, tags, stashes, `HEAD`, and uncommitted changes with rounded or angular SVG branch lanes.
- **Commit Details, Diffs & 2-Commit Comparison**: Click any commit to inspect metadata, GPG signature status, and changed files (Tree or List view) with an inline or side-by-side diff viewer. `Ctrl/Cmd+Click` any second commit to compare two commits or compare uncommitted changes against a commit.
- **Persistent Code Review**: Track which files you have reviewed in any commit or comparison across Zana sessions.
- **Full Git Context-Menu Actions**: Create, checkout, rename, delete, merge, rebase, push, pull, and fetch branches; cherry-pick, revert, reset (`soft` / `mixed` / `hard`), or drop commits; manage tags and stashes; clean untracked files (`git clean`); initialize empty repositories (`git init`); and configure remotes, issue links, export `.git-tree.json` settings, and pull request creation links.
- **Zana Agent & CLI Integration**: Spawn a thread with commit or diff context directly from the tree, run `zcc git-tree` from the terminal (with automatic project inference from working directory), or let agents inspect repository history with `git_tree_inspect`.
- **Workbench Integration**: Open from the left menu tab, command palette quick open (`open-git-tree`), or split workbench panes with customizable resizable columns.

## Build artifacts

This plugin installs from the pre-built artifacts committed alongside the source: `server.mjs` (referenced by `zcc.server`) and `app.js` (referenced by `zcc.app`). No build step is required to install it via `zcc plugin install .` or from the marketplace.

The TypeScript sources under `src/` plus `server.ts`/`app.tsx` are the authoritative source of truth. Rebuilding the artifacts (`npm run build`) and running the test suite (`vitest`) require the Zana monorepo, because `package.json` depends on workspace packages (`@zana-ai/*`, `workspace:*`) and `scripts/build-app.mjs` imports `packages/plugin-build`. Clone this plugin into the Zana monorepo's `extensions/` (or `plugins/`) workspace to build or test it, then re-commit the regenerated `server.mjs` and `app.js`.
