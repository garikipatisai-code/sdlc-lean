# Spec: follow-up hardening (test-pinning, ledger prose, review fallout)

Scope: close out deferred items from Phases A–D. New spec file (not docs/debt-ledger.md) so ledger prose is editable under the follow-up gate. Ledger flips below are author-authorized by the approver of the follow-up plan.

## R1 — Test-pinning Phase A (add-only, never weaken)
Commit the recorded `node -e` probe cases as assertions in `tests/opencode/test-safety-guards.mjs`: rm normalization ($HOME, //, dot-segments, flags, quotes, subshells, pipe trailing, --preserve-root), env-prefix + stripLaunchPrefix, right-guard `(?![\w.-])`, quote-mask + `2>` rule, sh-c unwrap + verbs, Colab guards + flags-after-path + xargs combo, `-- --check`-style... (no: that is dashboard). Source of truth: `docs/plans/phase-a-safety-guards-progress.md` probe tables. ADD-ONLY: no existing assertion modified/deleted. Proves: D-001/D-002/D-004/D-009 closed with committed tests.

## R2 — Test-pinning Phase C (add-only)
Commit probes: strictness + invocation (`tests/scripts/research/test-phase.mjs`: anchored at, unknown-field rejection, post-write revalidation, assertLedgerLoaded), path scope + reviewer allowlist (`tests/opencode/test-agent-permissions.mjs`: tests/** boundary, unparseable-patch fail-closed, `..` escape, reviewer chain rules), uxStatus caller + status query (`tests/opencode/test-ux-hooks.mjs`), merge-guard cases (`git merge` block incl. globals/decoys/prefixes/--abort exceptions + worktree pass-through — home: `tests/opencode/test-safety-guards.mjs` destructive-command suite). Source: `docs/plans/2026-11-07-phase-c-perms-progress.md`. ADD-ONLY.

## R3 — Ledger + matrix prose
Flip with exact recorded wording (progress ledgers hold the text): D-002/D-009/D-028 statuses + residuals, D-017 staleness, B-ledger parts (D-013/D-016/D-031/skipDrift/broker as closed-documented per B1 threat-model rows), capability-matrix re-audit row, `status`-drift wording fix. Files: `docs/debt-ledger.md`, `docs/threat-model.md`, `.opencode/skills/colab-lifecycle/references/capability-matrix.md`.

## R4 — Session-strip investigation (machine-close)
Investigate: does `collectMachineVerdicts` strip `session` before `validateCriticsSessions`, making duplicate-session enforcement vacuous end-to-end (B1 review Q1)? If CONFIRMED bug in product code (`scripts/spec-check.mjs`, NOT a grader): fix + regression via existing machine-close tests. If not confirmed: document as non-issue. Never weaken grader assertions. Escalate if the fix touches grader semantics.

## R5 — Nits batch (all recorded in progress ledgers; no behavior change beyond stated)
TUI: `Preview-only` spacing (+1B), floor-vs-round alignment, `STALE_AFTER_SEC` const + format helper, getSdlcStatus root containment (doc or clamp), footer question answered. Router: "Many tasks" abbreviation verdict (keep + headroom note, or widen with compensating cuts — budget MUST hold ≤5116). Reviewer: quote-aware `|` allowlist question. Phase C: isTestsPath root anchoring, closePhase taxonomy (`closePhase` null vs ledger-unreadable), HANDOFF/BRIEF key const duplication. Phase A: quoted-flags `rm "-rf" /`, `sudo env` double-prefix, nohup paths, nested sh-c depth>2, zgrep/rg, python class, curl-URL over-block, fullwidth `.env`, `'$HOME'` literal over-block, `/bin/rm` + `sudo -u` (closed — pin as tests in R1), backtick abort decoy, attached `-C/tmp`, multi-token `-c` values, `rm /content -- -r` note. Copilot `lib/` exclusion: vendor `colab-lifecycle/lib/lifecycle.mjs` under copilot tree OR reword SKILL.md:82 link + debt row (R3).

## R6 — Cleanup
Delete the voided Phase B drafts (`docs/plans/2026-11-07-phase-b-gate{,-progress,-evidence}.md` — superseded by B1; deviation history lives in B1 plan background + B progress ledger). Keep committed non-dated Phase A files as history.

## Acceptance
`npm run verify` green (538+ new tests); every test edit add-only (no existing assertion changed — reviewer checks diff); evidence rows per plan task with exact Verify cells; spec + plan immutable under gate; ledger flips match R3 wording.
