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

## Fail-before-fix proof

After the fix, temporarily revert the production change; confirm the repro test
fails again; reapply and confirm green. The repro test stays; record the repro
command in the progress ledger task row and the evidence row.

## Rules

- Two-strike rule: two failed fix attempts → stop, re-trace, restate the hypothesis; a third identical diagnosis → run `diagnosing-sdlc` and escalate. Never stack speculative fixes.
- The reproducing test stays. Never weaken, skip, delete, or rewrite a test/assertion, snapshot, fixture, or lint rule to pass; a changed assertion is a behavior change requiring approval.
- Symptom-only patches are rejected. If the true fix is out of scope, say so and file it — do not smuggle it in.
- A production incident rather than a local bug? After the fix, run `incident-postmortem`.
