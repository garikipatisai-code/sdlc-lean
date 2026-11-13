# Progress — Tiered-effort dispatch defaults (Task 1)

## Goal

Guidance text only in `.opencode/agents/orchestrator.md` (no schema change):
- "Reasoning-effort defaults (per tier)" block: MUSCLE `medium` (beam) + thinking on where valuable (super-vl); BRAIN `high`; longcat/iceman-free exempt (no knob, never force); never max-by-default (429 risk).
- Brief-carry line: every worker dispatch records chosen effort + thinking setting as a model+account+effort ledger row.

## Basis

- Spec: session rule (tiered reasoning-effort defaults), approved plan = this file.
- Plan: `docs/plans/2026-11-13-tiered-effort-progress.md` (this file).
- Allowed files ONLY: `.opencode/agents/orchestrator.md`, this progress file, `docs/plans/2026-11-13-tiered-effort-evidence.json`.
- Out of scope: tests (Task 4), audit/debt ledgers (Task 3), plugin, all else.

## TDD

- RED: `grep -q "Reasoning-effort defaults" .opencode/agents/orchestrator.md` → DEFAULTS_MISSING; evidence file absent → EVIDENCE_MISSING.
- GREEN: added "Reasoning-effort defaults (per tier)" block + brief-carry ledger-row line to orchestrator.md; created progress + evidence; all checks pass below.
- Verify: `grep ... && echo DEFAULTS_OK` → DEFAULTS_OK; `node scripts/validate-skills.mjs` → exit 0; evidence JSON parse → JSON_OK.
- REFACTOR: none — guidance text only, additive, no schema change.

## Tasks

- [x] #1 Reasoning-effort defaults + brief-carry ledger row (Task 1 DONE)
  (verify: `grep -q "Reasoning-effort defaults" .opencode/agents/orchestrator.md && echo DEFAULTS_OK` → DEFAULTS_OK; `node scripts/validate-skills.mjs` → exit 0; `node -e "JSON.parse(require('fs').readFileSync('docs/plans/2026-11-13-tiered-effort-evidence.json','utf8'));console.log('JSON_OK')"` → JSON_OK; exit 0, UTC 2026-11-13T23:27:16Z. Ledger: model=console-openrouter/nvidia/nemotron-3.5-super-vl:free account=console-openrouter. Hashes 59504e8. No secrets. Free-only.)
- [x] #2 Escalation bump rule docs (Task 2 DONE)
  (verify: `grep -q "+1" .opencode/agents/orchestrator.md && grep -qi "capped at max" .opencode/agents/orchestrator.md && echo BUMP_OK` → BUMP_OK; `node scripts/validate-skills.mjs` → exit 0; `node -e "JSON.parse(require('fs').readFileSync('docs/plans/2026-11-13-tiered-effort-evidence.json','utf8'));console.log('JSON_OK')"` → JSON_OK; exit 0, UTC 2026-11-13T23:28:09Z. Ledger: model=console-openrouter/nvidia/nemotron-3.5-super-vl:free account=console-openrouter2. Hashes 59504e8. No secrets. Free-only.)
- [x] #3 Meters docs (Task 3 DONE)
  (verify: `grep -q "rework rate" docs/audit-ledger.md && grep -q "429 rate" docs/audit-ledger.md && echo METERS_OK` → METERS_OK; `node scripts/validate-skills.mjs` → exit 0; `node -e "JSON.parse(require('fs').readFileSync('docs/plans/2026-11-13-tiered-effort-evidence.json','utf8'));console.log('JSON_OK')"` → JSON_OK; exit 0, UTC 2026-11-13T23:29:04Z. Ledger: model=opencode-go/beam-free account=opencode-go (cost 0/0). Hashes 59504e8. No secrets. Free-only. Debt row D-041 appended (manual sampling only).)
- [x] #4 Ledger + full verify (Task 4 DONE)
  (verify: `npm run verify` → tests 714, pass 714, fail 0 (705 + 9 new); `node --test tests/opencode/test-tiered-reasoning.mjs` → 9/9; `git status --short` → uncommitted effort batch + judge batch pending push; `git diff --exit-code -- tests/opencode/test-model-routing.mjs tests/opencode/test-agent-permissions.mjs tests/opencode/test-brain-judge-guarantees.mjs` → exit 0 (untouched); UTC 2026-11-13T23:30:29Z. Ledger: model=opencode-go/beam-free account=opencode-go (cost 0/0; test-writer effort n/a exempt). Hashes 59504e8. No secrets. Free-only. Critics DONE clean: code ses_e28c00d94 (no findings: wording exact, no weakening, graders untouched, zero-dep); security ses_e28c00d93 (CLEAN: no spend/quota forcing, no leak, no meter gaming).)

## Residuals

- Docs-only change in the local agent file; no global sync, no plugin touch (Task 4 verify-only, no source/test edits).
- Meters are manual sample-based (D-041): no dispatch/rework/429 counters in ledger row schema; per-call×rounds sampling on 2-week cadence; no new infra.
- Task 4 verify DONE: npm run verify 714/714; test-tiered-reasoning 9/9; protected tests untouched (exit 0). Critics DONE clean. Ready to push (judge batch still uncommitted alongside — listed honestly below).

## Critics (closeout)

- Code `ses_e28c00d94`: no findings — wording exact, no weakening, graders untouched, zero-dep.
- Security `ses_e28c00d93`: CLEAN — no spend/quota forcing, no leak, no meter gaming.
- Verify basis: 714/714 (npm run verify), tiered 9/9, protected tests untouched (exit 0).
- Status: DONE clean, ready to push.

## Uncommitted (honest listing)

- Effort batch: `.opencode/agents/orchestrator.md`, `docs/audit-ledger.md`, `docs/debt-ledger.md`, `docs/plans/2026-11-13-tiered-effort-progress.md`, `docs/plans/2026-11-13-tiered-effort-evidence.json`, `tests/opencode/test-tiered-reasoning.mjs`.
- Judge batch (still uncommitted alongside): `docs/plans/2026-11-13-brain-judge-guarantees-progress.md`, `docs/plans/2026-11-13-brain-judge-guarantees-evidence.json`, `tests/opencode/test-brain-judge-guarantees.mjs`.
- Worker-self-failover ledger edits: `docs/plans/2026-11-13-worker-self-failover-429-progress.md`, `docs/plans/2026-11-13-worker-self-failover-429-evidence.json`.

Ledger: model=opencode-go/beam-free account=opencode-go (cost 0/0). Free-only; no secrets.

## Stray-entry removal (2026-11-13)

- Removed pre-existing stray filesystem entry in `.opencode/agents/` (directory named `planner.md\ncontent">\n---\n...`, inode 3582887, contained empty `nvidia/` subdir). Deleted by inode only: `find .opencode/agents -maxdepth 1 -inum 3582887 -exec rm -rf {} +` (exit 0).
- Real `.opencode/agents/planner.md` untouched: sha256 before==after = `c046530f1ccb569323a358444afe430fecaebbe9cdb29be12e67c9828828e851`.
- Result: 8 agents remain; `git status --short` clean; `node --test tests/opencode/test-tiered-reasoning.mjs` → 9/9 pass, exit 0.
- Ledger: model=opencode-go/beam-free account=opencode-go (cost 0/0). Free-only; no secrets.
