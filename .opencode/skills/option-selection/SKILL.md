---
name: option-selection
description: Use when choosing between options or approaches - "which option", "choose between", "is X better than Y", "best way", "compare X vs Y", "pick a tool/library". Research before deciding, compare in a matrix, pick, and record the decision
---

# Option Selection

When more than one option could satisfy a requirement: **research first, then
commit**. Never pick from memory or vibes. Skip the whole protocol only when
exactly one option exists after the lean ladder (need it / reuse / stdlib /
platform / installed dep).

## Protocol

1. **Define**: the decision question in one line + the criteria that matter
   (fit, effort, maintenance, license, risk).
2. **Identify options**: reuse before rebuild (`acquiring-capabilities`); always
   include "do nothing / delete" as option 1 (lean rung 1).
3. **Research, effort scaled to impact** (`deep-research` + fan-out via
   researcher subagents): trivial → zero research, pick boring; standard → 1
   researcher, 3–5 searches; architectural → 2–4 parallel researchers.
4. **Matrix**: ≥2 options × criteria × tradeoffs. Every claim carries a
   citation [n] to a page you fetched and read.
5. **Pick**: winner + Y-statement — "in context X, facing Y, I chose Z to
   achieve W, accepting tradeoff T". One line why each loser lost.
6. **Record**: architectural → `adr` skill; otherwise record the decision in the
   plan/progress doc. Later work consults it, never silently relitigates.

## Rules

- Insufficient evidence → say "insufficient data", do not pad. A rejected
  option with evidence beats a gut-picked winner.
- Ties → prefer: less code, no new dependency, native platform.
- Never auto-install unknown code — trust tiers from `acquiring-capabilities`.
