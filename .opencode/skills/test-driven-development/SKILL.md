---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code. RED-GREEN-REFACTOR cycle with failing-test-first discipline
---

# Test-Driven Development

Test-first generates the external signal: a failing test is the only proof the
change is observable. TDD reliably adds tests; it does not by itself guarantee
quality or productivity.

## Cycle

1. **RED**: write one failing test capturing the next behavior (Beck micro-step).
   Run it — confirm it fails for the right reason.
2. **GREEN**: write the minimum code that passes (lean ladder applies — minimum, not scaffolding).
3. **Verify**: run the focused test, then the full suite. Both must pass.
4. **REFACTOR**: clean up while green (Beck triangle). Re-run the suite.

One behavior per cycle. Regression-first for bugfixes: add the reproducing test
(see `systematic-debugging` for root-cause discipline), watch it fail, then fix.
Depth (Beck posture, mutation, property tests): `references/tdd-method.md`.

## Test integrity

Never weaken, skip, delete, or rewrite a test/assertion, snapshot, fixture, or lint rule to pass; a changed assertion is a behavior change requiring approval.

## Writing good tests

Test behavior, not implementation. One assertion focus per test. Name tests
after the behavior (`returns-empty-for-unknown-user`). Prefer the repo's
existing test stack and hermetic fakes over new frameworks or live services.
Use mutation (Stryker) and property tests (fast-check) as verification depth
when they fit the stack.
