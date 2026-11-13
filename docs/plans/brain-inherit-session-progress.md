# Progress — Brain Inherit Session (Task 0 ledger)

## Goal

BRAIN inherits whichever model the orchestrator session runs — dynamically, UNPINNED (NO_STATIC_PINS), no hardcoded `opencode-go/muse-spark-1.3-contributor` in BRAIN prompts/ledgers. Ledger records the resolved session model + account per BRAIN dispatch.

## Baseline

- `node --test`: 676 pass / 0 fail (exit 0), UTC 2026-11-13
- live free list [longcat-2.5-free, iceman-contributor-free, beam-free], cost 0/0, total 24
- brain dispatch `opencode-go/muse-spark-1.3-contributor`: zero=false, paid (hardcode to replace)
- cited commits: 190ed01 (fix(agents): UNPINNED dispatch, orchestrator bash deny, reviewer no-commands guardrails), 99f84f1 (docs(ledger): agent-suite audit+fix evidence), 740c112 (docs(readme): Model routing section — free-first cost control + quality gates)

## Acceptance

- BRAIN roles with no model: pin → inherit orchestrator session model (UNPINNED, no hardcode)
- BRAIN ledger row = resolved orchestrator session model + account per BRAIN dispatch (current session: model=opencode-go/muse-spark-1.3-contributor account=opencode-go; generic rule: whatever session runs, UNPINNED, cap-counted, never a free-pool ID [super-vl:free, crouton/beam/iceman/longcat-free]).
- Tests enforce UNPINNED on BRAIN dispatches
- `node --test` green (676/676 baseline)
- Critics clean

## Budget

3 iterations (max). This setup = iteration 1 of 3.

## Tasks

- [x] #1 Free-pool deny muse-spark family (bare + contributor + suffixed) from FREE-pool/MUSCLE selection only; BRAIN roles always allowed on orchestrator session model (UNPINNED, cap-counted, never free pool) — DONE (exit 0, UTC 2026-11-13T17:57:22.840Z)
- [x] #2 Free-pool deny (test side) — muse-spark family (muse-spark, muse-spark-1.3, muse-spark-1.3-contributor + suffixed) added to BRAIN-row deny assertions in tests/opencode/test-model-routing.mjs (FREE-pool exclusion); BRAIN rows stay on orchestrator session model (UNPINNED) — DONE (exit 0, UTC 2026-11-13T17:58:45.000Z)
- [x] #3 planner plan — pin the fix scope (allowed files only) — DONE (exit 0, UTC 2026-11-13T18:05:00.000Z)
- [x] #4 full verification (verify only) — verify DONE (exit 0, UTC 2026-11-13T18:11:15.000Z); critics pending
- [x] #5 verify + critics — critics DONE (mixed: code clean, security HIGHs open); verify baseline retained from Task 4 (676/676, NO_STATIC_PINS, DENY_OK)
- [x] #6 narrow F1/F2 docs fix — reconcile :78/:79/:87/:118-120 (paid fallback admission + no-fresh-approval scope); paid/session step always needs fresh approval; :79 no-fresh-approval scoped to next-free-link re-dispatch only — DONE (exit 0, UTC 2026-11-13T18:30:00.000Z)
- [x] #7 full verification (verify only, post F1/F2 gate fix) — verify DONE (exit 0, UTC 2026-11-13T18:17:38.000Z); re-critic pending
- [x] #8 re-critic closeout — code re-confirm ses_e29de2266 (no blocking; wording tight; tests additive; 1 prior nit dead super-vl-free FREE_IDS:26); security re-check ses_e29de226 (F1 CLOSED :87 admission + spend approval, :70/:118-119; F2 CLOSED :79 free-only, paid always fresh approval); F3/F4 deferred as accepted debt — DONE (exit 0, UTC 2026-11-13T18:40:00.000Z)

## Decisions

- Inherit session model (UNPINNED) rather than re-pin: prior audit found all 7 workers UNPINNED (NO_STATIC_PINS); BRAIN hardcode contradicts that. No new static pin introduced.
- Ledger adds BRAIN model+account rows alongside existing free rows; free-only, non-sensitive.
- Free-pool deny scoped to muse-spark family (bare + contributor + suffixed) for FREE-pool/MUSCLE only; session model always allowed for BRAIN (cap-counted, UNPINNED, never free pool). No provider-model hardcode as required BRAIN ID. Contributor carve-out removed (no muse-spark free-pool fallback); paid fallback = session model only + explicit spend approval.

## Critics (Task 5)

- **Code review `ses_e29e42bb`**: no blocking; 2 non-blocking — (1) clarify `:71` contributor wording, (2) remove dead `super-vl-free` in `FREE_IDS`. Evidence: Task 4 verify 20/20, 676/676, `NO_STATIC_PINS`, `DENY_OK` (2026-11-13T18:11:15Z).
- **Security `ses_e29e42ba`**: status complete, **NOT clean** — fix round proposed, awaiting human approval.
  - F1 HIGH `:118-120` vs `:78` vs `:87` (paid fallback admission)
  - F2 HIGH `:70-71` vs `:79` (no-fresh-approval scope)
  - F3 MED `:71/:94/:115` suffixed deny gaps
  - F4 LOW ledger sensitivity

## Progress

Task 5 critics DONE (mixed — code clean / security HIGHs open).
Task 6 narrow F1/F2 docs fix DONE — :78/:79/:87/:118-120 reconciled; paid/session fallback requires admission + explicit spend approval + ask-to-extend (fresh, not covered by :79); :79 no-fresh-approval scoped to next-free-link re-dispatch only; BRAIN UNPINNED, MUSCLE free-first, secrets never free preserved.
Task 7 full verification (post F1/F2) DONE — `npm run verify` 676 pass / 0 fail (exit 0), `node --test tests/opencode/test-model-routing.mjs tests/opencode/test-agent-permissions.mjs` 20 pass / 0 fail (exit 0), `NO_STATIC_PINS`, `GATE_OK` (UTC 2026-11-13T18:17:38.000Z).
Task 8 re-critic closeout DONE — code re-confirm ses_e29de2266 (no blocking; wording tight; tests additive; 1 prior nit dead super-vl-free FREE_IDS:26); security re-check ses_e29de226 (F1 CLOSED :87 admission + spend approval, :70/:118-119; F2 CLOSED :79 free-only, paid always fresh approval); F3/F4 + code nit accepted as debt. Phase ready to close.

## Re-critic (Task 8)

- **Code review `ses_e29de2266`**: no blocking; wording tight; tests additive; 1 prior nit (dead `super-vl-free` in `FREE_IDS:26`). Verify basis: 676/676, 20/20, `NO_STATIC_PINS`, `GATE_OK` (2026-11-13T18:17:38Z).
- **Security `ses_e29de226`**: F1 CLOSED (`:87` admission + spend approval, `:70`/`:118-119`); F2 CLOSED (`:79` free-only, paid always fresh approval). F3/F4 deferred (accepted debt).

## Next step

Phase ready to close (no open blockers; F3/F4 + code nit as accepted debt). F3 needs care (`iceman-contributor-free` is live free cost 0/0 — do NOT remove without separate approval). F4 LOW ledger sensitivity. Dispatch ledger: `model=opencode-go/beam-free account=opencode-go`.
