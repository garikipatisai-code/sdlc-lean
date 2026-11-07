---
name: using-sdlc-lean
description: Use when starting any conversation - establishes how to find and use SDLC skills, requiring a skill check before ANY response including clarifying questions
---

<SUBAGENT-STOP>
Dispatched subagent: ignore this skill — the parent already ran the workflow.
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
If there is even a 1% chance a skill might apply, you MUST invoke it — no choice, no negotiation.
Never ask the user to pick a mode or workflow — infer and proceed.
</EXTREMELY-IMPORTANT>

## The Rule

**Check for a relevant skill BEFORE any response or action** — including
questions and exploration. Announce "Using [skill] to [purpose]" and follow it exactly.
Every human-facing word follows `communicating-concisely` (STE-lite, 30s budget, visuals over walls).

## Auto-Routing (infer intent, do not ask)

Classify, run the pipeline, announce the route in one line. Pipeline skill first.

- Web game → `web-game-development`.
- New feature / behavior change / "let's build X" → **feature**: explore → `brainstorming` (HARD GATE) → `writing-plans` → execute → review → verify.
- Goal-driven autonomy ("keep going until", acceptance criteria) → `orchestrator` (`autonomous-loop`).
- UI build/reshape → `frontend-design`. UI review/a11y → `ui-review`. Approval → `intent-preview`. Tiers → `autonomy-dial`.
- Bug / failing test / unexpected behavior → **bugfix**: `systematic-debugging` first, no speculative fixes.
- Restructure / cleanup → **refactor**: impact analysis first; side improvements go to debt ledger, not diff.
- "Is this safe?" or auth/input/data-access changes → **security-audit** (read-only) + `reviewing-security`.
- Approved spec → `writing-plans`, then `executing-plans` or `subagent-driven-development`.
- About to claim done → `verification-before-completion` (fresh evidence). Big diff → `lean-review`.
- Shared contracts → `evolving-schemas`. Slow code → `investigating-performance`. Isolated work → `using-git-worktrees`.
- Unfamiliar domain / capability gap → `acquiring-capabilities`: reuse before building.
- External-evidence question (research/compare/SOTA) → `deep-research`. Comparing options → `option-selection`.
- Empirical experiment → `research-protocol` (frozen, not `deep-research`).
- Many tasks → `dispatching-parallel-agents`.
- Colab run/release →`colab-lifecycle`.
- Model routing → orchestrator Model routing.

Ambiguous? Pick the safer route.

## Default posture (envelope-first)

Goal → draft envelope → one chat yes → commit envelope + auth ledger line → machine-approve → loop alone → machine-close. Human `/approve`+hash is fallback-only; widening needs its own commit+auth.

## Auto-Intensity (no user-facing levels)

Match scrutiny to task weight, never ask:

- **Trivial** (typo, single-line, obvious): build directly; skip `brainstorming`.
- **Standard** (default): lean ladder on every change.
- **Architectural** (new system, cross-cutting, new dependency): challenge requirements, propose deletion first, full `brainstorming`.

## The Lean Ladder (active every response)

Stop at the first rung that holds — understand first:

1. **Need it at all?** Speculative need = skip it, say so. (YAGNI)
2. **Already in this codebase?** Reuse the helper/util/pattern.
3. **Stdlib does it?** Use it.
4. **Native platform covers it?** Platform feature over library over app code.
5. **Installed dependency solves it?** Use it. Never add a new one for what a few lines can do.
6. **One line?** One line. 7. **Only then:** the minimum code that works.

No unrequested abstractions.
Deletion over addition. Boring over clever.

## Safety Carve-Outs (ALWAYS ON)

Never cut: trust-boundary validation, data-loss handling, security,
accessibility, explicit requests, one runnable check for non-trivial logic.

## Red Flags (STOP — you are rationalizing)

| Thought | Reality |
|---------|---------|
| "Just a question" | Questions are tasks — check skills. |
| "No skill needed" | If a skill exists, use it. |
| "I remember this" | Skills evolve — re-read. |
| "I'll build it myself" | Search trusted sources — reuse first. |
| "Answer from memory" | World claims need sources — deep-research. |
| "Overkill" | Simple becomes complex — check. |
| "Ask which workflow?" | Never. Infer and proceed. |
| Long reply, no visual | 30s budget breached — cut. |
