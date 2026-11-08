---
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior, before proposing any fix. Root cause first, always
---

# Systematic Debugging

**NO FIXES WITHOUT ROOT CAUSE.** Symptom patches are rejected.

## 4 phases
1. **Contain + reproduce**: reversible containment (flag/rollback/limit), owner/blast/removal; failing repro first, confirm reason.
2. **Trace**: real flow end to end; grep every caller, fix once at shared path. Use `git bisect`/diff for unknown regression.
3. **Hypothesize**: one root-cause sentence; test competing candidates, fix neither. Classify deterministic/flaky/race/perf (`references/debug-method.md`).
4. **Fix + verify**: minimal fix, repro passes, suite green. Two failed attempts → re-trace; third identical diagnosis → run `diagnosing-sdlc` and escalate.

## Fail-before-fix proof
After the fix, temporarily revert the production change; confirm the repro test fails again; reapply and confirm green. The repro test stays; record the repro command in the progress ledger and the evidence row. Secret-safe: env vars only; redact inline credentials before ledger/evidence; treat rows as public.

## Rules
- Containment is not a fix: removal condition + verify after removal.
- Never weaken, skip, delete, or rewrite a test/assertion, snapshot, fixture, or lint rule to pass; a changed assertion is a behavior change requiring approval.
- Production incident? `incident-postmortem`. Detail (containment, bisect/diff, taxonomies, proof): `references/debug-method.md`.
