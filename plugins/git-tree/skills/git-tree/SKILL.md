---
name: git-tree
description: Inspect project Git history, commit topology, branch/tag/stash refs, commit comparisons, and file diffs using the Git Tree plugin (`zcc git-tree` CLI and `git_tree_inspect` tool).
---

# Git Tree Skill

Use the Git Tree plugin when inspecting a project's commit tree/graph, comparing two commits or branches, reviewing uncommitted changes, or checking remotes and stashes.

## CLI Usage

```bash
zcc git-tree repos --project <projectId>
zcc git-tree log --project <projectId> [--max-count 50] [--branches main,feature/foo]
zcc git-tree details --project <projectId> --commit <sha>
zcc git-tree compare --project <projectId> --from <baseSha> --to <headSha>
zcc git-tree diff --project <projectId> --commit <sha> --file <relPath>
zcc git-tree remotes --project <projectId>
```

## Agent Tool (`git_tree_inspect`)

Call `git_tree_inspect` with:
- `action: "log"` — Retrieve structured commits, parents, branches, tags, stashes, and uncommitted change summary.
- `action: "details"` — Retrieve full commit metadata and changed file list for `commit`.
- `action: "compare"` — Compare changed files between `fromCommit` and `toCommit`.
- `action: "diff"` — Retrieve unified and split diff hunks for `filePath` in `commit` (or between `fromCommit` and `toCommit`).
