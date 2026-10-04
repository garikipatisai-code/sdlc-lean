# Verify recipe (sdlc-lean)

Write-once-reuse verification for this project. Every completion claim in this
repo must cite fresh output of these commands (see `verification-before-completion`).

```sh
npm run verify        # skill lint + node --test (counts as of 2026-10-04: 32 skills / 49 tests)
npm run eval          # dry eval plan, 11 probes, zero spend — must list all probes
```

Live probes are opt-in and never required for completion claims:
`node eval/run.mjs --run --max-probes N` (spends tokens; manual only).
