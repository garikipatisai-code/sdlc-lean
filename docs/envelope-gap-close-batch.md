# Envelope — gap-close batch (standing machine authorization, human-directed 2026-11-01)

Authorized by human directive 2026-11-01 "continue with machine autonomy" for this plan only:
docs/plans/2026-11-01-gap-close-batch.md. Standing designs 0002/0003 (human-accepted)
authorize this envelope-authorized machine-approve mechanism.

## Paths (exactly the gap plan files + allow lists, no more)

- scripts/spec-check.mjs
- scripts/install-global.mjs
- .opencode/plugins/sdlc-lean.js
- tests/scripts/test-gap-atomicity-probes.mjs
- tests/scripts/test-gap-parity.mjs
- tests/scripts/test-spec-check.mjs
- docs/design/0001-auto-tier-pilot.md
- docs/design/0002-machine-approve.md
- docs/design/0003-autonomy-by-default.md
- docs/threat-model.md
- docs/verify-recipe.md
- docs/AUTONOMY.md
- README.md
- USAGE.md
- CHANGELOG.md
- .opencode/skills/intent-preview/SKILL.md
- .opencode/skills/autonomous-loop/SKILL.md
- docs/plans/2026-11-01-gap-close-batch-progress.md
- docs/plans/2026-11-01-gap-close-batch-evidence.json

## Reversibility (reversal: commit SHA per run)

- reversal: git commit SHA of the reverting commit, recorded per run in the audit ledger row
- strategy: `git revert <SHA>` restores the tree; the SHA is captured before the run closes

## No external effects (publish/release/spend/network-prod/merge-shared: no)

- publish: no — never publish or release packages from a run inside this envelope
- release: no — no tags, no releases, no shared-remote merge or shared-remote PR
- spend: no — no paid calls, no provisioned resources beyond the local machine
- network-prod: no — no network writes to prod or any external system
- merge-shared: no — never merge into a shared branch from a run inside this envelope
- grader-changes: no — except stale-assertion fixes under an open approval; never weaken a pass bar to go green
- red-close: no — never close while the named check is red

## Budgets (max-iterations 3, check: npm run verify)

- max-iterations: 3
- check: npm run verify
- stop-on: same check fails twice with the same output; unclear scope or reversibility; any out-of-envelope file; any external effect requested

## Expected outcomes (pre-declared new behaviors for the gap-close batch)

- crash-safe gate retry: crashed dual-mutation converges on retry, never bricked-refused
- non-TTY close refused; check-bound close enforced; human-CLI clobber guarded pre-write
- self-review verdicts refused; blob-hash envelope auth binding enforced
- installer symlinked dest refused with manifest unchanged
- crash-sim and parity probes green (CLI verdicts equal plugin verdicts)
- docs current across the 12 explorer items plus residual threat-model rows
- full suite green under the named check
