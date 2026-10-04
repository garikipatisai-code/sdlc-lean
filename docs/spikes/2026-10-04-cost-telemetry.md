# Spike — cost/token telemetry in OpenCode V2

Date: 2026-10-04 · Time-boxed · OpenCode v2.0.22 (running service on 127.0.0.1)

**Question:** Can a plugin observe token and USD-cost usage, so sdlc-lean can
back its "lean" claims with numbers?

**Answer: Yes — both per message and in aggregate.** No new dependency needed.

## Evidence (source: server OpenAPI, `/openapi.json`)

| Schema | Carries | Where |
|---|---|---|
| `Session.Message.Assistant` | `tokens: TokenUsage.Info`, `cost: Money.USD` | every assistant message |
| `TokenUsage.Info` | `input`, `output`, `reasoning`, `cache.read`, `cache.write` | nested |
| `SessionStats.Info` | `sessions`, `subagents`, `prompts`, `steps`, `tokens`, `cost`, `models[]` (per-model `tokens`+`cost`), `tools` | aggregate |
| `Model.Info.cost` | USD per million tokens (tiered) | cost rates |

Endpoint: `GET /api/experimental/session/stats`. The plugin context is an
OpenCode client, so aggregate stats are reachable from a plugin; per-message
usage is reachable through the documented `ctx.session.context({ sessionID })`,
which returns messages including assistant `tokens`/`cost`.

## Access paths for a plugin

1. **`ctx.session.context({ sessionID })`** — read assistant messages, sum
   `tokens`/`cost`. Documented in the plugin `SessionContext`; most stable.
2. **`ctx.event.subscribe()`** — react to message updates, then read
   `context`/stats.
3. **`/api/experimental/session/stats`** — aggregate, per-model, tool usage.
   Marked **experimental**; name/shape may change.

## Risks / caveats

- The stats endpoint is `experimental` — feature-detect and fail open.
- `ctx.session.stats` was **not** listed in the documented plugin
  `SessionContext` reference; confirm the exact method at implementation time
  (fall back to `ctx.session.context`).
- Cost is only as accurate as provider pricing in `Model.Info.cost`.

## Recommendation

Feasible and cheap: a plugin (or the eval harness) can record tokens + cost per
session/pipeline from `ctx.session.context`, no new dependency. Worth doing
**as part of the eval harness** (track 5) so one artifact reports behaviour
pass/fail and cost.
