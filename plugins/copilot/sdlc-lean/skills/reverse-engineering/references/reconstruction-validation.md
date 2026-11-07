# Reconstruction validation — S-tier gates

A reconstruction is a claim about someone else's artifact. Claims need machines,
not plausibility. Apply in order: grade → validate → close. If you cannot reach
a rung, say so and deliver at the rung you proved.

Running artifacts (substitution, fuzzing, crash repro) requires explicit user
permission and an isolated environment. Work on a disposable copy — never the
original; hash-check the original before and after, and destroy copies when done.

## Floor: evidence model

- Grade every claim: **observation / derivation / inference / unknown**, linked
  to its evidence ID.
- Unknowns are recorded (`record_unknown`), never filled with inventions.
  Resolution requires qualifying observed evidence; stale revisions are reread,
  not retried blind.
- Compare only with complete, compatible page sets; a missing match under
  partial coverage is not absence. Contradictions block the affected equivalence
  and leave the unaffected comparison intact.
- Concurrent or nondeterministic behavior gets partial-order / finite-trace
  semantics — never total-order claims.
- **Fail-closed aggregation: `fail`, `unknown`, `unsupported`, `truncated`,
  `skipped` never aggregate to `pass`.** (REA readiness conformance.)

## Ladder — strongest provable rung wins

1. **Byte-exact replay** (strongest). Pin the original toolchain; compile each
   function as its own complete unit; compare full bytes plus complete
   relocation sets, literals, and size; hash-bind the report; test the checker
   itself with adversarial negatives. Reference standard: the dx-ball
   reconstruction — 253 byte-exact functions / 63,862 exact bytes
   ([PROGRESS.md](https://raw.githubusercontent.com/N0zoM1z0/dx-ball/76ac55e38239bc3ae8aed1903ba092953b161445/docs/PROGRESS.md))
   with 8 rejection tests on the oracle
   ([BUILD_MATCHING.md](https://raw.githubusercontent.com/N0zoM1z0/dx-ball/a55dca27ec0a07018c1b2c95ae2be027f7d8c3c4/docs/BUILD_MATCHING.md)).
2. **Runtime differential substitution**. Replace the function inside a
   disposable copy of the real binary with the reconstruction's recompilation
   and compare branch-coverage profiles against the reference on a seed corpus.
   Metrics: Recompile Success Rate + Coverage Equivalence Rate.
   [DecompileBench](https://arxiv.org/html/2505.11340v1)
3. **Fuzz-driven differential beyond shipped tests**. Synthesize drivers, grow a
   corpus from the reference binary, rerun identical inputs. This is the rung
   that catches "passes every test, still wrong" — 4.9% overall divergence, up
   to 13%, on candidates that passed all shipped tests.
   [Decompile-Diverge](https://arxiv.org/abs/2609.05370)
4. **Unit-level differential on extracted vectors**. Execute the attested
   original and the reconstruction on the same inputs; compare outputs and
   named intermediate state. State the case space (e.g. all inputs in a domain),
   not a sample.
5. **Declared-partial**. Per claim, list what is established and what is
   **not** established. The dx-ball oracle pattern: every row declares its own
   non-established claims. No closure claim outside the domain.
   [ORACLES](https://raw.githubusercontent.com/N0zoM1z0/dx-ball/a55dca27ec0a07018c1b2c95ae2be027f7d8c3c4/docs/ORACLES.md)

Never use re-executability, pass@1, or "passes the existing tests" as fidelity
proof. LLM refinement can raise build rate while lowering behavioral match
(75% → 90% build, 74% → 62% match) by inventing fields and guards that replace
visible unknown markers.

## Independent verification (before delivery)

- Every claim moves **draft → verified / rejected** in a separate pass — fresh
  context or a second method. Rejections and contradictions stay visible.
- LLM-produced artifacts (names, types, layouts) are hypotheses: require
  multi-pass agreement, majority voting, or symbolic constraints before
  accepting (ReSym, GENNM patterns).
- The verifier's authority must be comparable to the observation's — same
  target digest, same environment, same optimization level. Fidelity declines
  with optimization level; validate where the original was built.

## Required reporting

- Separate, never merged: byte-exact count · semantic-acceptance count ·
  comprehension score.
- Per-oracle "does not establish" lists.
- Provenance: artifact digest, toolchain identity, evidence IDs, checker
  version.

## Failure modes to guard

| Mode | What it looks like | Guard |
|---|---|---|
| Hallucinated types / ABI edits | Invented struct types, injected headers, "unused" params dropped | Cross-check against decompiler output; reject ABI-visible edits |
| Dataflow corruption | Constants or field accesses silently altered (`msg->mode` → `s->last`) | Multi-pass agreement; differential rung ≥ 4 |
| Metric gaming | Passes tests, diverges on generated inputs; refinement erases unknown markers | Rung 3 corpus + never fill placeholders |
| Output-trust asymmetry | Novices benefit most, experts are harmed most by hallucinations | Risk labels; keep unknowns visible; never present inference as observation |
| Soliloquizing | Agent "observes" what it never executed | Every observation cites real tool output |
| Vacuous equivalence | Implicit stubbing makes "equivalence" meaningless | Declare bridges/mocks per oracle; poison frees; exclude undefined state from acceptance |
| Stale replay | Reused evidence after target change; tampered bundles | Hash-check inputs; reject stale/tampered evidence |

## Checklist before claiming anything

- [ ] Every load-bearing claim has an evidence ID and a grade.
- [ ] Unknowns are listed; none were silently filled.
- [ ] Comparisons used complete, compatible page sets.
- [ ] Strongest feasible rung applied; weaker rungs declared as such.
- [ ] Independent verification pass done; rejections visible.
- [ ] Non-established claims listed per result.
- [ ] No "passes tests = verified" shortcut anywhere in the report.
