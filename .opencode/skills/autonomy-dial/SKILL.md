---
name: autonomy-dial
description: Use when running agentic loops with adjustable autonomy - Observe to Auto tiers, named check command, audit ledger, reversal path, escalation on a failed check
---

# Autonomy Dial

Reimplemented from SOTA autonomy patterns (Cursor /goal + /loop, Copilot steer, verification-gated autonomy). No upstream code copied.

## Tiers

- Observe: preview every step, confirm tool calls.
- Assist: auto read-only, ask before edits.
- Auto: iterate until the run's named check command passes, stop on budget.

## Rules

- Gate every Auto run on a named check command (tests, build, lint, or screenshot). State the exact command before the first edit; iterate until pass or honest stop.
- Steer without interrupting: follow-ups queue for next tool call; long-lived `/goal` holds objective until complete.
- Escalate when the same check fails twice with the same output, or when scope or reversibility is unclear. No unmeasured success rate: a check result is pass or fail, not a score.
- Record exactly one row per Auto run in `docs/audit-ledger.md` (`| date | tier | check | result | reversal |`), e.g. `2026-10-30 | Auto | npm test | pass | commit abc1234`.

- `reversal` names the undo path: the reverting commit, the diff, or the path to restore. No reversal path, no Auto run.

## Model tier note
Light checks may ride cheap models; consequential runs use stronger — see orchestrator Model routing.
Quota: dynamic free-first `console-openrouter/nvidia/nemotron-3.5-super-vl:free` x2 round-robin → `opencode-go` cost `0/0` re-discovered at dispatch (denylist excluded; trio `crouton/beam/iceman` = fallback examples only) → orchestrator session model fallback (cap + ask-to-extend; secrets NEVER to free); resolver `eval/lib/free-models.mjs`; 429/provider-error only; circuit `CLOSED`/`OPEN`/`HALF-OPEN` + cheap probe `GET /api/v1/models` then `max_tokens:1` (never paid); admission `settled+outstanding+next<=cap` — at cap block + ask user for extension + escalate, never auto-extend/spend; `cooldown_until` JSONL `YYYY-MM-DDTHH:mm:ss.sssZ`; per-dispatch ledger row; delegation narrow-only.
