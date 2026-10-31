> Superseded by docs/plans/2026-10-31-auto-tier-pilot-progress.md (dated, gate-linked, authoritative); the rest below is kept as history.

# Progress — auto-tier pilot (design round, docs-only)

- UTC: 2026-10-31
- Authorization: human-authorized Auto-tier pilot design, chat accept 2026-10-31
- Scope this round: design artifact + threat-model section + this ledger only. Zero code, zero tests, zero skill/plugin/script edits.

## Goal

Design an ENVELOPE-AUTHORIZED MACHINE-CLOSED loop for Auto-tier runs (standing envelope authorized once; inside it the agent writes its own reference plan, loops unattended, and closes on machine authority with zero human keystrokes) that keeps irreversible-external acts human, and get that design approved via human written findings before any plan or code.

## Acceptance

1. Design approved by human written findings (merged dispositions in `docs/design/0001-auto-tier-pilot.md`).
2. Zero code changed this round (`git status` shows only the 3 listed docs files).

## Decision (option-selection Y-statement)

Solo-dev speed on a trusted local repo facing per-step approval friction: we chose standing pre-approval — declare tier + named check (default `npm run verify`) + file scope + iteration budget + reversal per run, loop unattended with audit + reversal, escalate to stop-and-report on 2×same-failure/unclear-reversibility/destructive/grader-conflict/gate-block — to achieve long unattended runs with audit + reversal, accepting that scope-widening and merges stay human. Losers: delete-gate (surrenders the authorization boundary); steering-only (leaves the per-step gate waits); maker-checker-only (already exists yet still stops mid-run).

## Research pointers

- Friction ranked table: plan approval #1, design HARD GATE #2, intent-preview accept #3, drift #4, merge #5, fix-loop exhaustion #6, grader #7.
- External patterns: verification-gated tiers, staffing L1–L5, goal-loop with exits, steering policy-as-context, pre-approved scopes + sandbox, maker-checker + audit.
- Authority (read-only): `autonomy-dial` (tiers, named check, audit row, reversal, escalate rules), `autonomous-loop` (loop, budgets, stop rules), `brainstorming` (artifact headings, HARD GATE), `adr` (template), `threat-model` (checklist + table shape).

## Status

Awaiting human design approval (written findings). No plans, no code, no tests until approval lands.

## Revision 2026-10-31 — rubber-stamp insight (docs-only)

- Insight: on experimental work the human lacks domain knowledge to judge plans, so judgment-based plan/scope approval degrades into rubber-stamping — false confidence, worse than useless.
- Change: envelope-vs-judgment split — the human authorizes the risk envelope once per goal (blast radius, reversibility, no external effects, budget caps); correctness-judgment goes to machine-verifiable checks + independent critics + cited research evidence.
- Experimental track: unknown domain → smaller envelope (fewer files, scratch dirs, no merge), more evidence required (named check + eval probes + reviewer pass + reversal commit), never auto-merge/publish.
- Status still awaiting human design approval (written findings). No plans, no code, no tests until approval lands.

## Revision 2026-10-31 — human-out-of-loop directive (docs-only)

- Directive: SAFELY remove the human from the inner loop entirely. Plans/scope MDs are kept FOR REFERENCE (audit trail, auto-maintained) — NEVER as approval artifacts requiring human hash approval.
- Decision: ENVELOPE-AUTHORIZED MACHINE-CLOSED loop. The standing envelope (authorized once, version-controlled, human-readable risk terms: paths, reversibility, no external side effects, budgets) is the ONLY human act. Inside it the agent authors reference plans, implements, then the gate OPENS and CLOSES on machine authority alone — close condition = named check green + independent critic pass + evidence rows + reversal commit + audit-ledger row, zero human keystrokes.
- Honest boundary: inside-the-machine (local repo, reversible) = human-out-of-loop achievable; IRREVERSIBLE EXTERNAL acts (shared-remote merge/PR, publish/release, spend, prod/external network writes, grader changes, red close) stay ALWAYS-human — small explicit list, everything else autonomous.
- Human role inside-the-machine is outer-loop only: periodic audit-ledger SAMPLING (e.g. weekly review), not per-step approval.
- Status still awaiting human design approval (written findings). No plans, no code, no tests until approval lands.

## Next

`writing-plans` ONLY after human written-findings approval of `docs/design/0001-auto-tier-pilot.md`. Then: threat-model input feeds the plan; plan approval activates the spec gate for implementation.
