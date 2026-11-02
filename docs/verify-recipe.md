# Verify recipe (sdlc-lean)

Write-once-reuse verification for this project. Every completion claim in this
repo must cite fresh output of these commands (see `verification-before-completion`).

```sh
npm run verify        # skill lint + node --test (counts as of 2026-11-01: 40 skills / 9 commands / 538 tests)
npm run eval          # dry eval plan, 35 probes, zero spend — must list all probes
node scripts/spec-check.mjs verify --require-active   # active spec gate: no drift, no malformed marker # bare close skips drift (skipDrift escape hatch); approve/verify/keep full drift enforcement
```

Live probes are opt-in and never required for completion claims:
`node eval/run.mjs --run --max-probes N` (spends tokens; manual only).

Discovery aid (not a completion claim): `node scripts/spec-check.mjs envelope check <file>` + `close --machine` criteria (see `docs/design/0001-auto-tier-pilot.md`).
Discovery aid (not a required claim): `approve --machine` criteria (see `docs/design/0002-machine-approve.md`) — `approve --machine` opens the gate under envelope ceiling; critic sessions must be independent (validateCriticsSessions refuses duplicate/self-review sessions).
