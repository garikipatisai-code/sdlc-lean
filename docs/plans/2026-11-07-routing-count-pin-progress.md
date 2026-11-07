# Progress — Routing Count Pin

## Goal

Pin the 40-probe count so full verify is green.

## Baseline

- HEAD: `97f7b9a8411afec70cb671da72e7638d01a94e21`
- Plan: `docs/plans/2026-11-07-routing-count-pin.md`
- Plan sha256: `2aa0f13041c2e7c92db2d2c998c4f65c01d1855b5a1748f79bc9dbc374aab706`

## Test command

`npm run verify` (covers existing count test in `tests/eval/test-probes.mjs`)

## Tasks

- [x] #1 Update count 35→40 with comment `35 + 5 routing T4` — done (verify: `npm run verify`, exit 0, UTC 2026-11-07T05:30:01Z)

## Next

await human plan approval
