# Audit ledger

One row per Auto run. Human outer loop only: sample this ledger weekly
(e.g. every Monday), not per-run — per-run review would reintroduce the
approval friction the envelope removes.

Row checklist — every row must hold: UTC date (`YYYY-MM-DD`), tier
(`Auto`), the named check that gated the run (default `npm run verify`),
result (`pass`/`fail`), and the reverting commit SHA (`reversal`; no
reversal path, no run).

## Meters (sampled; no new infra)

- **rework rate** = reworked ÷ total dispatches.
- **429 rate** = 429s ÷ total calls.

Sample the ledger per-call×rounds on a 2-week cadence (human outer loop
only — no runtime counter, no new infra). Per-run review is out of scope
(reintroduces approval friction).

_No Auto runs logged yet — the first machine-closed run appends row 1 below._

| date | tier | check | result | reversal |
|---|---|---|---|---|
