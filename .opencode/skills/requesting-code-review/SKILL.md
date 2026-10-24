---
name: requesting-code-review
description: Use when completing tasks, implementing features, or before merging. Dispatches a reviewer for correctness, security, performance, and maintainability
---

# Requesting Code Review

The reviewer needs the **approved spec and plan**, not just the diff — scope
drift is invisible without them. Pass: spec path, plan path, the plan's `files`
list, and the diff.

## 4-pass review (dispatch a reviewer subagent, or self-review for trivial diffs)

1. **Correctness**: does it do what the spec/plan says — nothing more, nothing less?
2. **Security**: traced path from attacker-controlled input to impact? See `reviewing-security`.
3. **Performance**: measurement-backed concerns only (see `investigating-performance`) — no speculative optimization demands.
4. **Maintainability + leanness**: run `lean-review` on the diff.

Also flag: files changed outside the plan's `files` scope, acceptance criteria
with no evidence, and any claim that skips the gate.

## Finding format

`path:line` + severity + concrete fix. Confidence-filtered: uncertain
findings are questions, not verdicts. Reviewer never applies fixes — hands
back the list; implementer decides (see `receiving-code-review`).
