---
name: codenod
description: Triage and AI-review GitHub pull requests with the CodeNod plugin — list the review inbox, run multi-model reviews with Zana's providers, read scores and findings, and post comments (`zcc codenod` CLI and `codenod_*` tools).
---

# CodeNod Skill

Use CodeNod when the user asks which pull requests need their review, wants an AI review of a GitHub pull request, or wants to read or post the findings of an earlier review.

The review inbox (`list` / `sync` / `codenod_list_prs`) only includes pull requests in watched repositories. `review` and `show` still work for a pull request URL even if that repository is not watched.

Pull requests are referenced as a URL (`https://github.com/acme/api/pull/42`), `host/owner/repo#42` for GitHub Enterprise, or `owner/repo#42` for the default host.

## CLI Usage

```bash
zcc codenod list [--tab needs-review|mine|watched] [--json]
zcc codenod sync
zcc codenod review <pr> [--models provider:model[@reasoning],...] [--wait] [--json]
zcc codenod show <pr> [--json]
zcc codenod post <pr> --yes [--findings all|id,id] [--message "..."]
zcc codenod repos [list | add <owner/repo> [--auto] [--spec "docs/**/*.md"] | remove <host/owner/repo>]
zcc codenod models [--json]
zcc codenod auth
```

Run `zcc codenod models` to see the `provider:model` ids accepted by `--models`.

`post` only publishes comments. It refuses to run without `--yes`; confirm with the user before passing it. Approving or requesting changes is only possible from the CodeNod page in Zana, where the user signs off explicitly.

## Agent Tools

- `codenod_list_prs` — open pull requests with CI state and latest review status; optional `tab`.
- `codenod_get_review` — scores (risk, coverage, requirements, simplicity, stability), summary, per-model runs, and findings for `pr`.
- `codenod_review_pr` — start an unattended AI review of `pr`; optional `models` and `wait`. It never posts to GitHub.

## Reading Results

- Risk is 1–10 where higher is riskier; the other scores are 1–10 where higher is better.
- The requirements score is empty when the pull request, its linked issues, and spec files state no requirements.
- Each finding lists the models that agreed on it; findings flagged by more models are more likely real.
- A review marked stale was made for an older commit; start a new review before acting on it.
