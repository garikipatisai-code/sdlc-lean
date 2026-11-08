# TDD method (reference)

Paraphrased guidance. Non-sensitive. Attribution: Kent Beck (test-driven
development by example; red-green-refactor micro-steps, the fake-it and
triangulation tactics, green means go) and the test-driven-development
literature; StrykerJS (mutation testing); fast-check (property-based
testing). Do not copy source text; apply the ideas.

## Beck-style micro-steps

Beck's posture is small, honest cycles rather than big-bang test suites:

1. Pick the smallest behavior that moves the design forward.
2. **Fake it**: a stub that returns the expected literal satisfies the new
   test quickly. This is deliberate, not lazy; it keeps the cycle short.
3. Add a second test to triangulate: the first test passes with the fake, the
   second (a different input/branch) breaks the fake and forces the real
   implementation. One test proves nothing about generality.
4. **Make it real**: write the least production code that passes both tests.
5. **Refactor only while green**: rename, extract, remove duplication; every
   edit keeps the suite passing. Untested refactoring is out of scope.
6. Repeat; each cycle leaves a regression suite the next cycle can trust.

Rules of thumb: the test comes first, it fails for the right reason, the
production change is the minimum that passes, and no code without a failing
test demands it. If a test would not fail without the change, the change is
unproven.

## Mutation testing (Stryker posture)

Mutation testing inverts the question: instead of "do the tests pass?", it
asks "would the tests notice a small deliberate break in the code?"

- A mutation engine produces many small variants (flipped comparisons,
  off-by-one bounds, replaced operators, removed statements). Each variant is
  a mutant; the suite runs against it.
- A mutant that makes some test fail is killed: good signal. A mutant no test
  catches is a survivor: a genuine gap, not a score to chase blindly.
- Use survivors to write missing behavior tests, not to tweak thresholds.
  Re-running after a survivor-driven test addition should kill that mutant.
- Run targeted (changed files/units) in normal development; full mutation
  runs are expensive and belong in scheduled/CI depth, not every edit.
- Stryker's mutation score is advisory evidence of test quality, never a
  release gate by itself, and never a reason to weaken or delete tests.
- Opt-in only: this repo prefers its existing test stack. Introduce Stryker
  or any mutation tooling only when the stack and runtime fit, without
  adding new dependencies for this guidance alone.

## Property-based testing (fast-check posture)

Example tests pin known cases; property tests pin invariants over many
generated cases, which catches corner cases handwriting misses.

- State an invariant: round-trip (encode then decode returns the input),
  ordering (sorted output stays sorted), idempotence (applying twice equals
  applying once), or "never throws on generated input".
- Generate inputs with a property-based library (fast-check): arbitraries
  describe the shape (numbers, lists, strings); the framework runs many
  cases and shrinks any failure to the smallest repro.
- Keep the seed and the shrunk case when a failure is found; minimization
  turns a shrunk counterexample into a readable regression test.
- Pair both styles: properties for invariants, examples for readable
  behavior. Properties supplement, never replace, the RED-GREEN cycle and
  the integrity rule.
- Guardrails: keep generators bounded and deterministic where the repo
  requires it, avoid live services, and prefer the existing test stack
  before adding a property library as a dependency.

## How the pieces fit

| Signal | Question it answers | Depth tool |
|---|---|---|
| RED-GREEN-REFACTOR | Is the next behavior proven before the fix? | One failing test, minimum change |
| Triangulation | Is the implementation general or a fake-literal pass? | Second test with different input |
| Mutation | Would tests catch a small deliberate break? | Stryker survivors audit |
| Property | Do invariants hold across generated cases? | fast-check invariants + shrinking |

Test integrity still binds all four: never weaken, skip, delete, or rewrite
a test/assertion, snapshot, fixture, or lint rule to pass; a changed assertion
remains a behavior change requiring approval. A red suite is fixed by fixing
behavior (or, with approval, the test when the behavior contract changed),
never by silencing the signal.
