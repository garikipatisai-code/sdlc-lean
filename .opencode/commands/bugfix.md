---
description: Evidence-based bug resolution - reproduce, trace, fix, review, confirm
agent: build
---

Bug resolution for: $ARGUMENTS.

1. **Explore** — map the suspect area (read-only).
2. **Investigate** — `systematic-debugging`: reproduce with a failing test, trace root cause (grep all callers), one-sentence hypothesis. Two-strike rule.
3. **Fix** — minimal fix per the lean ladder; reproducing test green, full suite green.
4. **Review** — `requesting-code-review` on the diff.
5. **Confirm** — `verification-before-completion` with fresh evidence.
