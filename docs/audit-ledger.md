# Audit ledger

One row per Auto run. Human outer loop only: sample this ledger weekly
(e.g. every Monday), not per-run — per-run review would reintroduce the
approval friction the envelope removes.

Row checklist — every row must hold: UTC date (`YYYY-MM-DD`), tier
(`Auto`), the named check that gated the run (default `npm run verify`),
result (`pass`/`fail`), and the reverting commit SHA (`reversal`; no
reversal path, no run).

_No Auto runs logged yet — the first machine-closed run appends row 1 below._

| date | tier | check | result | reversal |
|---|---|---|---|---|
| 2026-11-01T20:08:24.000Z | Auto | envelope-auth | active | docs/envelope-gap-close-batch.md |
| 2026-11-01T23:38:16.139Z | Auto-activate | docs/plans/2026-11-01-gap-close-batch.md | active | docs/envelope-gap-close-batch.md |
| 2026-11-01T23:40:34Z | Auto | envelope-auth | active | docs/envelope-gap-close-batch.md |
