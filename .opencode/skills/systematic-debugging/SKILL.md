---
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior, before proposing any fix. Root cause first, always
---

# Systematic Debugging

**NO FIXES WITHOUT ROOT CAUSE.** A report names a symptom. Patching the named
path while sibling callers stay broken is the opposite of lazy.

## 4 phases

1. **Reproduce**: write the failing test/script first. Confirm it fails for the reported reason.
2. **Trace**: follow the real flow end to end. Grep every caller of the function you are about to touch. Fix it once, where all callers route through.
3. **Hypothesize**: state the single root cause in one sentence. If you have two candidates, test both — do not fix both.
4. **Fix + verify**: minimal fix (lean ladder), reproducing test goes green, full suite stays green.

## Rules

- Two-strike rule: two failed fix attempts → stop, re-trace, restate the hypothesis. Never stack speculative fixes.
- Symptom-only patches are rejected. If the true fix is out of scope, say so and file it — do not smuggle it in.
