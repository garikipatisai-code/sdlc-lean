# Progress — Frontend quality v2

Plan: [`2026-11-07-frontend-v2.md`](2026-11-07-frontend-v2.md)
Spec: [`docs/design/0005-frontend-quality-v2.md`](../design/0005-frontend-quality-v2.md)

Goal: Upgrade three skills + game pipeline so agent-built UI clears WCAG 2.2 AA with a capped visual loop, no new deps/bootstrap changes.

Baseline HEAD: `97f7b9a8411afec70cb671da72e7638d01a94e21`

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 1 | frontend-design 5 rules + template | ✅ | verify exit 0 2026-11-07T05:33:21Z |
| 2 | ui-review AA checklist + slop | ✅ | `node --test tests/opencode/test-skill-contracts.mjs` exit 0, 21/25 |
| 3 | Visual loop stage + pointer-only skill | ✅ | `node --test tests/opencode/test-eval-coverage.mjs && node --test tests/opencode/test-web-game-photoreal.mjs` exit 0, 7+12 pass 2026-11-07T05:36:18Z |
| 4 | Dry eval probes + coverage | ✅ | `node --test tests/eval/test-probes.mjs` exit 0, 20 pass 2026-11-07T05:42:21Z |

## Test commands

- `node scripts/validate-skills.mjs && node --test tests/opencode/test-skill-contracts.mjs`
- `node --test tests/opencode/test-skill-contracts.mjs`
- `node --test tests/opencode/test-eval-coverage.mjs && node --test tests/opencode/test-web-game-photoreal.mjs`
- `node --test tests/eval/test-probes.mjs`

Next: await human plan approval.

## Amendment 2026-11-07 — count-literal trap preempted

Added `tests/eval/test-probes.mjs` to plan `files:` and extended T4 Expected with count-literal update intent. Why: routing probes took the suite to 40 and the count pin now asserts 40; frontend T4 will add N more probes → 40+N breaks the count again, but the test file was not in scope (same trap as routing T4 — see follow-up ledger). T4 Verify stays `node --test tests/eval/test-probes.mjs` (covers the count assertion). No task/status/spec/approval change.

## Fix round 2026-11-07 — probe-vs-shipped mismatch (values only, still 44)

- ui-routing `frontend-design` → `web-game-development` (game.md:10 has web-game-development; `frontend-design` absent).
- ui-routing `visual` → `Visual loop` (game.md:15; lowercase `visual` absent).
- ui-aa `contrast` → `4.5:1` (ui-review:19; lowercase `contrast` absent, `4.5:1` present; kept `focus`/`24px`/`keyboard` verified present).
- ui-slop `flag` → `happy-path-only` (ui-review:20; lowercase `flag` absent, kept `slop` verified present).
- ui-visual-loop `cap` → `max 2–3 rounds` (game.md:15; word-boundary `cap` absent; kept `cheapest`/`baseline`/`escalate` verified present).
- tests/eval/test-probes.mjs: test name `exactly 35 probes` → `exactly 44 probes` (assertion already 44).
- Hard confirmed: ui-* probes stay in group `routing` with no `advisory` flag (same as other routing probes); coverage frontend-v2 dry comment already records dry-only, no CALIBRATION change.
