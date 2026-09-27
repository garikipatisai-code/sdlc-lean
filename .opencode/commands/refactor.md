---
description: Safe refactoring - impact analysis, decomposition, implementation, verification
agent: build
---

Safe refactoring for: $ARGUMENTS.

1. **Impact** — map all callers and dependents of the target (read-only). What breaks if this changes?
2. **Decompose** — split into behavior-preserving steps small enough to verify individually. If behavior must change, route through `brainstorming` first.
3. **Implement** — one step at a time with the suite green after each. TDD where behavior is pinned.
4. **Verify** — `verification-before-completion`: full suite + diff review. No scope growth — improvements found along the way go to the debt ledger, not this diff.
