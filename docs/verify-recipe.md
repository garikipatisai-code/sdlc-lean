# Verify recipe (sdlc-lean)

Write-once-reuse verification for this project. Every completion claim in this
repo must cite fresh output of these commands (see `verification-before-completion`).

```sh
npm run verify        # skill lint + node --test (counts as of 2026-10-23: 39 skills / 204 tests)
npm run eval          # dry eval plan, 15 probes, zero spend — must list all probes
node scripts/spec-check.mjs verify --require-active   # active spec gate: no drift, no malformed marker
```

Live probes are opt-in and never required for completion claims:
`node eval/run.mjs --run --max-probes N` (spends tokens; manual only).
