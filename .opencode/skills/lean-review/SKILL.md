---
name: lean-review
description: Use when a diff feels big, before merging, or to audit a repo for over-engineering. Tagged delete-list with net line savings; never applies fixes
---

# Lean Review

Review a diff (default) or whole repo (`repo` scope) for over-engineering.
Complements `requesting-code-review` — leanness only, correctness out of scope.
Never apply fixes; hand back the list.

## Output format (one line per item)

`path:line: <severity> <tag> <what>. <one-line reason>. <replacement>.`

Tags are binary: `delete` (remove entirely), `stdlib` (use standard library),
`native` (use platform feature), `yagni` (unneeded now), `shrink` (shorter form).
Severity is `low`, `medium`, or `high`; the reason justifies the tag in one line.

End with `net: -N lines` (and `-M deps` for repo scope). It is advisory, never a
gate: it informs the human, it does not pass or fail the review. Never delete
`tests`, `safety guards`, or `error handling` to improve it — a lower net line
count is not worth a lost guard. If clean: `Lean already. Ship.`

## Deferrals

Genuine shortcuts get a ceiling comment so they stay greppable:
`# scope: <ceiling>, <upgrade path>` (e.g. `# scope: single-region, extract provider interface at second region`).
Track them in the debt ledger (`references/debt-ledger.md`); flag `no-trigger` rot (a ceiling already hit).
