---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code. RED-GREEN-REFACTOR cycle with failing-test-first discipline
---

# Test-Driven Development

## Iron Law (balanced)

No production code without a failing test first. If you catch yourself with
pre-written implementation code: either write the failing test that demands
it now, or delete the code and start from the test. Justification is allowed;
silence is not.

## Cycle

1. **RED**: write one failing test capturing the next behavior. Run it — confirm it fails for the right reason.
2. **GREEN**: write the minimum code that passes (lean ladder applies — minimum, not scaffolding).
3. **Verify**: run the focused test, then the full suite. Both must pass.
4. **REFACTOR**: clean up while green. Re-run the suite.

One behavior per cycle. Fix a bug → first add the reproducing test (see
`systematic-debugging` for root-cause discipline), watch it fail, then fix.

## Writing good tests

Test behavior, not implementation. One assertion focus per test. Name tests
after the behavior (`returns-empty-for-unknown-user`). Prefer the repo's
existing test stack and hermetic fakes over new frameworks or live services.
