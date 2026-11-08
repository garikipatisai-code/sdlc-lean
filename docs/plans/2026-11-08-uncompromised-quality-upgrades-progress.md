# Uncompromised quality upgrades — Track 1 progress (investigating-performance)

Note: spec `docs/specs/2026-11-08-uncompromised-quality-upgrades.md` was missing at start (grep `uncompromised` 0 matches); not created per brief (outside allowed files). This file is the progress log and delivery record.

## RED (thin gap)

- `node scripts/validate-skills.mjs` -> `checked 40 skills, 0 failures`, exit 0. Lint passed on thin skill; gap is depth, not lint.
- `node --test tests/opencode/test-skill-contracts.mjs` -> 28/28 pass, exit 0. Generic contracts passed.
- `wc -l .opencode/skills/investigating-performance/SKILL.md` -> 14 lines; `ls .opencode/skills/investigating-performance/` -> only `SKILL.md`; `grep perf-gate|p95|flamegraph` -> 0 matches.
- `node scripts/perf-gate.mjs --help` -> exit 0, usage line shown; `grep -r perf-gate .opencode/skills --include=*.md` -> no refs (orphan gate, unwired).
- `games/starter/frame-log.json` present locally; documented gate not referenced by any skill.

Gap: 14-line body with no workload pinning, no percentiles/budget contract, no flamegraph guide, no perf-gate wiring.

## GREEN

- Expanded `.opencode/skills/investigating-performance/SKILL.md` (32 lines, ≤160): kept exact Use-when description, probe-first 4 steps (workload+budget, hotspot with share, predict-then-minimal, same-probe confirm), gate rule pointing to reference. Routable; detail deferred.
- Created `.opencode/skills/investigating-performance/references/method.md` (215 lines, own prose, paraphrase-only): probe definition, profiler matrix, p50/p95/p99 with nearest-rank and n, flamegraph reading, backend/web/frame budgets incl. INP at p75 ~200 ms good band (verify-live note), frame ~10 ms usable of 16.67 ms, perf-gate exact flags/exit 0/1/2 + seeded-miss caveat, confirm/revert, report checklist. Attribution: Gregg (flamegraph/USE posture), SRE (SLI/SLO/budget), INP/web-vitals (interaction percentile). No verbatim copying.
- Files touched (allowed only): SKILL.md, references/method.md, plus this progress file and evidence JSON.

## Verify

- `node scripts/perf-gate.mjs --log games/starter/frame-log.json --budget-ms 16.67` -> `p95=10.80ms budget=16.67ms n=30 -> PASS`, exit 0.
- `node scripts/perf-gate.mjs --log games/starter/frame-log.json --budget-ms 1` -> FAIL line, exit 1 (gate discriminates).
- `node scripts/validate-skills.mjs` -> 40/0, exit 0; `node --test tests/opencode/test-skill-contracts.mjs` -> 28/28, exit 0.
- `npm run verify` -> exit 0, 615/615 pass, lint clean.

## Deviation

- Spec file absent at start and still absent (honest; out of allowed scope). No scope expansion: no plugin code, no other skills, no test/lint edits, no new deps.

## Review nit fixes (docs-only)

- RED: `grep -c INP SKILL.md` -> 0; shell-safety/log-trust/scrub absent; empty-frame wording ambiguous.
- GREEN: SKILL step 1 now gates web interaction at p75 INP near ~200 ms good band (33 lines, <=160, routable); method.md clarifies empty-frame exits `1` (no measured data to pass), adds Shell safety (untrusted args, argv/quoting, metachar reject, path validation), Data handling (synthetic/non-secret, scrub URLs/tokens/PII, never commit raw prod dumps, restrict retention), and Log trust (fixed repo-relative allowlisted paths only, verify against `scripts/perf-gate.mjs` `containLogPath`).
- Verify: `node scripts/validate-skills.mjs` -> 40/0 exit 0; `npm run verify` -> exit 0, 615/615 pass. No plugin sync copy touched.

# Uncompromised quality upgrades — Track 2 progress (threat-model)

## RED (thin gap)

- `wc -l .opencode/skills/threat-model/SKILL.md` -> 36 lines; `ls .opencode/skills/threat-model/` -> only `SKILL.md`; no `references/`.
- `grep -c "DFD\|LLM\|supply-chain\|OWASP\|NIST\|ATT&CK\|ATLAS" .opencode/skills/threat-model/SKILL.md` -> 0 (no DFD/LLM/supply-chain/framework coverage).
- `node scripts/validate-skills.mjs` -> `checked 40 skills, 0 failures`, exit 0.
- `node --test tests/opencode/test-skill-contracts.mjs` -> 28/28 pass, exit 0 (cap 40 enforced for threat-model).
- Gap: 36-line body with STRIDE-lite + table only; no DFD, no LLM threats, no supply-chain, no OWASP/NIST/ATT&CK mapping; detail inlined not referenced.

## GREEN

- Expanded `.opencode/skills/threat-model/SKILL.md` (39 lines, <=40): kept exact Use-when description, hard strings (Assets, Entry points, Trust boundaries, Attacker paths, risk is binary: high or low, residual owner, No finding without a traced path, H1 table), STRIDE-lite, binary risk, residual owner; added DFD + LLM + supply-chain pointers and mappings pointer; detail deferred to references.
- Created `.opencode/skills/threat-model/references/dfd-and-threats.md`: DFD elements (externals, processes, stores, flows), trust boundaries, STRIDE-lite per element, LLM threats (OWASP LLM Top 10 paraphrased), supply-chain threats (dependency/build/artifact/source/model/update), attribution.
- Created `.opencode/skills/threat-model/references/mappings.md`: OWASP Top 10 (web), OWASP LLM Top 10, NIST (SP 800-218 SSDF, AI RMF), MITRE ATT&CK + ATLAS selected IDs, SLSA levels; paraphrased identifiers + attribution.
- Files touched (allowed only): SKILL.md, references/dfd-and-threats.md, references/mappings.md, plus this progress file and evidence JSON.

## Verify

- `wc -l .opencode/skills/threat-model/SKILL.md` -> 39 (cap 40).
- `node scripts/validate-skills.mjs` -> `checked 40 skills, 0 failures`, exit 0.
- `node --test tests/opencode/test-skill-contracts.mjs` -> 28/28 pass, exit 0.
- `npm run verify` -> 615 tests, 615 pass, 0 fail; lint clean, exit 0.
- `grep -c "OWASP\|NIST\|ATT&CK\|ATLAS\|SLSA\|LLM0" .opencode/skills/threat-model/references/mappings.md` -> framework IDs present (exact count not a gate).

## Deviation

- Spec file `docs/specs/2026-11-08-uncompromised-quality-upgrades.md` absent at start and still absent (honest; out of allowed scope). No scope expansion: no plugin code, no other skills, no test/lint edits, no new deps, no product artifact `docs/threat-model.md` edits.

## Review nit fixes (docs-only)

- RED: output table lacked framework id citation; line 21 supply-chain naming incomplete.
- GREEN: SKILL output table keeps hard header and adds framework ID example (A01, LLM01, T1195) in Mappings line; line 21 now names supply-chain as SLSA/NIST SP 800-218 SSDF/ATT&CK.
- Verify: `node scripts/validate-skills.mjs` -> 40/0 exit 0; `npm run verify` -> exit 0, 615/615 pass. No plugin sync copy touched.

# Uncompromised quality upgrades — Track 3 progress (systematic-debugging)

## RED (thin gap)

- `wc -l .opencode/skills/systematic-debugging/SKILL.md` -> 29; `ls .opencode/skills/systematic-debugging/` -> only `SKILL.md`; no `references/`.
- `grep -n "containment|8D|SRE|bisect|flaky|race|perf taxonomy|intermittent" .opencode/skills/systematic-debugging/SKILL.md` -> no containment/8D/SRE/bisect/taxonomy coverage (only unrelated "route through"/"escalate" matches).
- `node scripts/validate-skills.mjs` -> `checked 40 skills, 0 failures`, exit 0.
- `node --test tests/opencode/test-skill-contracts.mjs` -> 28/28 pass, exit 0.
- Gap: 4-phase core present but missing 8D/SRE containment+escalation framing, bisect/diff guidance, flaky/race/perf taxonomies, and references with paraphrased attribution.

## GREEN

- Extended `.opencode/skills/systematic-debugging/SKILL.md` (22 lines, <=30 execution cap): preserved exact Use-when description and required strings (`fail-before-fix`, `temporarily revert`, `repro test fails again`, `repro command`, `evidence row`, integrity rule, `diagnosing-sdlc`, `escalate`). Added 4-phase containment+reproduce, bisect/diff trace, deterministic/flaky/race/perf classification, containment removal/verify, and two-strike→diagnosing-sdlc escalation kept. Detail deferred to reference.
- Created `.opencode/skills/systematic-debugging/references/debug-method.md`: 8D/SRE containment/escalation posture, bisect/diff narrowing, deterministic/flaky/race/perf taxonomies, fail-before-fix proof, handoffs. Paraphrased with attribution (8D, SRE, superpowers-style fail-before-fix practice). Non-sensitive.
- Files touched (allowed only): SKILL.md, references/debug-method.md, plus this progress file and evidence JSON.

## Verify

- `node scripts/validate-skills.mjs` -> `checked 40 skills, 0 failures`, exit 0.
- `node --test tests/opencode/test-skill-contracts.mjs` -> 28/28 pass, exit 0.
- `node --test tests/opencode/test-execution-skills.mjs --test-name-pattern='systematic-debugging'` -> pass (after tightening to execution-skill cap/required strings).
- `npm run verify` -> 615 tests, 615 pass, 0 fail; lint clean, exit 0.

## Deviation

- Spec file `docs/specs/2026-11-08-uncompromised-quality-upgrades.md` absent at start and still absent (honest; out of allowed scope). No scope expansion: no TDD skill, no incident-postmortem edits, no test edits, no new deps. Initial GREEN exceeded execution-skill 30-line cap; corrected to satisfy existing contract while keeping required extensions.

# Uncompromised quality upgrades — Track 4 progress (test-driven-development)

## RED (thin gap)

- `wc -l .opencode/skills/test-driven-development/SKILL.md` -> 30; `ls .opencode/skills/test-driven-development/` -> only `SKILL.md`; no `references/`.
- `grep -n "Beck|Stryker|fast-check|mutation|property" .opencode/skills/test-driven-development/SKILL.md` -> 0 matches, exit 1.
- `node scripts/validate-skills.mjs` -> `checked 40 skills, 0 failures`, exit 0.
- `node --test tests/opencode/test-skill-contracts.mjs` -> 28/28 pass, exit 0.
- `node --test tests/opencode/test-execution-skills.mjs --test-name-pattern='test-driven-development'` -> pass (cap 40, required strings, integrity intact).
- Gap: RED-GREEN-REFACTOR cycle + integrity present but no Beck micro-step/triangulation depth, no Stryker mutation guidance, no fast-check property guidance, detail inlined not referenced.

## GREEN

- Extended `.opencode/skills/test-driven-development/SKILL.md` (34 lines, <=40 execution cap): preserved exact Use-when description and required strings (`test-first generates the external signal`, `does not by itself guarantee quality or productivity`, `RED`, `GREEN`, `REFACTOR`, `regression`, INTEGRITY verbatim); added Beck micro-step + triangle markers, mutation/property depth pointers to reference. Forbidden `Iron Law` absent. Detail deferred to reference.
- Created `.opencode/skills/test-driven-development/references/tdd-method.md` (82 lines, own prose, paraphrase-only): Beck micro-steps (fake-it, triangulation, refactor-while-green), Stryker mutation posture (mutants/killed/survivors, targeted vs full runs, score advisory), fast-check property posture (invariants, generators, shrinking), fit table, integrity restated. Attribution: Kent Beck (TDD by example, red-green-refactor triangle, fake-it, triangulation), StrykerJS (mutation testing), fast-check (property-based testing). Opt-in only; prefers existing test stack, no new deps mandated.
- Files touched (allowed only): SKILL.md, references/tdd-method.md, plus this progress file and evidence JSON.

## Verify

- `wc -l .opencode/skills/test-driven-development/SKILL.md` -> 34 (cap 40).
- `node scripts/validate-skills.mjs` -> `checked 40 skills, 0 failures`, exit 0.
- `node --test tests/opencode/test-skill-contracts.mjs` -> 28/28 pass, exit 0.
- `node --test tests/opencode/test-execution-skills.mjs --test-name-pattern='test-driven-development'` -> pass (cap, strings, forbidden).
- `npm run verify` -> exit 0, 615/615 pass, lint clean (reported after final gate; see evidence JSON).

## Deviation

- Spec file `docs/specs/2026-11-08-uncompromised-quality-upgrades.md` absent at start and still absent (honest; out of allowed scope). No scope expansion: no systematic-debugging edits, no new frameworks/deps added (guidance only, opt-in), no test/lint edits, no grader edits.

## Review nit fixes (docs-only)

- RED: `grep -c "references/tdd-method.md" SKILL.md` -> 2 (duplicate pointer in Cycle + Writing good tests).
- GREEN: kept Cycle-section pointer (line 22), removed second pointer (line 34 now ends "when they fit the stack."). 34 lines (<=40), required strings intact, lint clean.
- Verify: `npm run verify` -> exit 0, 615/615 pass. No plugin sync copy touched.

# Uncompromised quality upgrades — Track 5 progress (dependency-upgrade)

## RED (thin gap)
- `wc -l .opencode/skills/dependency-upgrade/SKILL.md` -> 27; `ls .opencode/skills/dependency-upgrade/` -> only `SKILL.md`; no `references/`.
- `grep -c "Renovate|CycloneDX|OSV|SBOM" .opencode/skills/dependency-upgrade/SKILL.md` -> 0 (no Renovate/CycloneDX-SBOM/OSV wiring).
- `node scripts/validate-skills.mjs` -> `checked 40 skills, 0 failures`, exit 0.
- `node --test tests/opencode/test-skill-contracts.mjs` -> 28/28 pass, exit 0.
- Gap: 10-step checklist present (audit/advisory ID/one package/lockfile diff assertion/runtime smoke/rollback path) but no Renovate/CycloneDX-SBOM/OSV integration; detail inlined not referenced.

## GREEN
- Extended `.opencode/skills/dependency-upgrade/SKILL.md` (34 lines, <=35): preserved exact Use-when description and required strings (`audit`, `advisory ID`, `one package`, `lockfile diff assertion`, `runtime smoke`, `rollback path`); wired OSV into audit, CycloneDX SBOM diff into lockfile assertion and blast radius, Renovate one-update-per-PR/automerge/rollback into steps 5/9/10; added Tooling section pointing to reference.
- Created `.opencode/skills/dependency-upgrade/references/upgrade-method.md`: Renovate/CycloneDX/OSV posture, 10-step mapping, guardrails, non-sensitive handling, paraphrased with attribution (Mend Renovate, OWASP CycloneDX, Google/OpenSSF OSV). One-package/lockfile-diff/smoke/rollback retained and strengthened.
- Files touched (allowed only): SKILL.md, references/upgrade-method.md, plus this progress file and evidence JSON.

## Verify
- `wc -l .opencode/skills/dependency-upgrade/SKILL.md` -> 34 (cap 35).
- `node scripts/validate-skills.mjs` -> `checked 40 skills, 0 failures`, exit 0.
- `node --test tests/opencode/test-skill-contracts.mjs` -> 28/28 pass, exit 0.
- `grep -c "Renovate\|CycloneDX\|OSV\|SBOM" .opencode/skills/dependency-upgrade/SKILL.md` -> 7; reference cited resolves.
- `npm run verify` -> exit 0, 615/615 pass, lint clean.

## Deviation
- Spec file `docs/specs/2026-11-08-uncompromised-quality-upgrades.md` absent at start and still absent (honest; out of allowed scope). No scope expansion: no actual bumps, lockfiles, feature commits, grader edits, new deps; no plugin sync copy touched.

## Close-evidence repair (history note)

- RED: prior evidence JSON used custom format (wrong `plan` = progress.md, no `plan_sha256`, no `tasks` rows) → `validateCloseEvidence` refused `evidence-plan-mismatch`. Preserved custom per-track detail here by reference: the Track 1–5 RED/GREEN/Verify blocks above remain the historical record; no custom content kept in the new JSON.
- GREEN (docs-only, fresh re-runs): plan Verify for all 5 tasks is `node scripts/validate-skills.mjs` (exact plan-table string). Re-ran each fresh now, all `checked 40 skills, 0 failures`, exit 0: task 1 at 2026-11-08T20:42:12.000Z, task 2 at 2026-11-08T20:42:13.000Z, task 3 at 2026-11-08T20:42:14.000Z, task 4 at 2026-11-08T20:42:16.000Z, task 5 at 2026-11-08T20:42:17.000Z.
- REFACTOR: rewrote evidence JSON to close format only (`plan`, `plan_sha256 700d37c1cb3b4d8869b795ef2c4387486e10578f45e29ca5a6583979b7f83846`, 5 tasks with exact Verify, exit 0, real UTC `at`). No falsification: only exit 0 actually re-ran rows recorded. Plan/spec not edited; gate stays active for human close after review.
