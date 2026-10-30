---
name: option-selection
description: Use when choosing between options or approaches - "which option", "choose between", "is X better than Y", "best way", "compare X vs Y", "pick a tool/library". Research before deciding, score binary criteria in a matrix, pick, and record the decision
---

# Option Selection

When more than one option could satisfy a requirement: **research first, then
commit**. Never pick from memory or vibes. Skip the protocol only when exactly
one option exists after the lean ladder (need it / reuse / stdlib / platform /
installed dep).

## Protocol

1. **Define** the decision question in one line and the criteria that matter
   (fit, effort, maintenance, license, risk). Each criterion must be answerable
   yes/no per option — split vague criteria until it is.
2. **Options**: reuse before rebuild (`acquiring-capabilities`). Always include
   `do nothing / delete` as option 1 (lean rung 1).
3. **Research**, effort scaled to impact (`deep-research` + researcher
   subagents): trivial → zero research, pick boring; standard → 1 researcher,
   3–5 searches; architectural → 2–4 parallel researchers.
4. **Matrix**: binary criteria × options; each cell yes/no with a citation [n]
   to a page you fetched and read. No weighted scores, no 1–10 ratings.
5. **Pairwise swap**: exactly two options → run the matrix twice with the
   order swapped; keep the winner only if both orders agree, else say
   "insufficient data".
6. **Pick**: winner + Y-statement — "in context X, facing Y, I chose Z to
   achieve W, accepting tradeoff T". One line why each loser lost.
7. **Record the decision**: architectural → `adr` skill; otherwise record the decision in the plan/progress doc. Later work consults it, never silently relitigates.

## Rules

- Tie-break: less code, no new dependency, native platform.
- Insufficient evidence → say "insufficient data", do not pad.
- Never auto-install unknown code — trust tiers from `acquiring-capabilities`.
