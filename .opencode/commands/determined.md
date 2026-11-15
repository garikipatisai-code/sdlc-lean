---
description: Toggle/session-report the determined-execution opt-in flag (session override > DETERMINED_EXECUTION=1 > default off). Read-only when off.
---

# /determined on|off|status

Session-only command for the determined-execution opt-in flag. No logic lives here — this doc is static markdown only; the flag source is the T1 plugin API (`.opencode/plugins/sdlc-lean.js`): exported `DETERMINED_EXECUTION = 'DETERMINED_EXECUTION'` and `isDeterminedEnabled(ctx)`.

## Precedence (normative)

1. **Session override** — in-memory store keyed by session ID (`'1'`/`'on'` = enabled, `'off'`/other = disabled). Session read failure resolves to `false` (fail-open).
2. **Env fallback** — `DETERMINED_EXECUTION=1` (trimmed, lowercased, exact `1`).
3. **Default** — off. No session override and no env match means determined execution is off.

When off, every T1 helper (`restatePhase`, `emitObserve`, `reflectScratch`, `checkAbstain`, `checkTimelyStop`, `skepticPrefix`, `criticWidth2`) returns `null` — byte-identical to the current kernel, fail-open preserved, no `spec-check approve` and no active gate.

## Subcommands

- `/determined on` — sets the session override to `1` for this session only (session-scoped; not persisted across sessions).
- `/determined off` — clears the session override; resolution falls through to env then default-off.
- `/determined status` — reports the resolved flag state: active session override if set, otherwise env `DETERMINED_EXECUTION`, otherwise default-off.

## Rules

- Session-only: no file writes, no cross-session effect, no secrets.
- Default-off byte-identical: behavior is unchanged when the flag is off.
- No approval needed: no spec-gate marker, no `spec-check approve`, free-only.
