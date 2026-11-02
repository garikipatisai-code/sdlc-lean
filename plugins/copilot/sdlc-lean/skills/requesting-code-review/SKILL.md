---
name: requesting-code-review
description: Use when completing tasks, implementing features, or before merging. Dispatches a reviewer for correctness, security, performance, and maintainability
---

# Requesting Code Review

The reviewer needs the **approved spec and plan**, not just the diff — scope
drift is invisible without them. Pass: spec path, plan path, the plan's `files`
list, the `diff`, and the raw `Verify` output. A self-report is not evidence.

Every change takes the review path; there is no self-review shortcut. The only
exception is binary and recorded: `≤20 changed lines AND no auth/IO/schema`.
Write `review-exception: ≤20 lines, no auth/IO/schema` in the review note;
otherwise dispatch a reviewer.

## 4 passes, each bound to its evidence source

A pass is not a persona verdict; it reports only what its evidence shows. A
pass with no such evidence says `no finding` — never "looks fine".

1. **Correctness** — against the `spec` or plan requirement: unmet AC, extra scope.
2. **Security** — only a `traced attacker path` from input to impact; see `reviewing-security`.
3. **Performance** — only a `measurement`; no speculative optimization demands; see `investigating-performance`.
4. **Maintainability + leanness** — the `diff` plus `lean-review`'s tagged list.

Also flag files changed outside the plan's `files` scope, acceptance criteria
with no evidence, and any claim that skips the gate.

## Persist findings

Every finding goes in the review note **and** the progress ledger as
`path:line`, `severity`, and `disposition` (`fixed`/`rejected`/`needs-human`).
Uncertain items are `needs-human` questions, not verdicts. The reviewer never
applies fixes — it hands back the list; the implementer decides and records
each `disposition` (see `receiving-code-review`).
