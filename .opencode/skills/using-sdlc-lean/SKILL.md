---
name: using-sdlc-lean
description: Use when starting any conversation - establishes how to find and use SDLC skills, requiring a skill check before ANY response including clarifying questions
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, ignore this skill.
The parent already ran the workflow; just do your task.
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
If there is even a 1% chance a skill might apply, you MUST invoke it.
IF A SKILL APPLIES, YOU DO NOT HAVE A CHOICE. This is not negotiable.
Never ask the user to pick a mode or workflow — infer and proceed.
</EXTREMELY-IMPORTANT>

## The Rule

**Check for a relevant skill BEFORE any response or action** — including
clarifying questions and codebase exploration. Announce
"Using [skill] to [purpose]" and follow it exactly.
Every human-facing word follows `communicating-concisely` (STE-lite, 30s budget, visuals over walls).

## Auto-Routing (infer intent, do not ask)

Classify, run the pipeline, announce the route in one line. Pipeline skill first, even when a domain skill matches.

- New feature / behavior change / "let's build X" → **feature**: explore → `brainstorming` (HARD GATE) → `writing-plans` → execute → review → verify.
- Goal-driven autonomy ("keep going until", acceptance criteria) → `orchestrator` agent (`autonomous-loop`).
- Bug / failing test / unexpected behavior → **bugfix**: `systematic-debugging` first, no speculative fixes.
- Restructure / cleanup → **refactor**: impact analysis first; side improvements go to the debt ledger, not the diff.
- "Is this safe?" or auth/input/data-access changes → **security-audit** (read-only) + `reviewing-security`.
- Approved spec → `writing-plans`, then `executing-plans` or `subagent-driven-development`.
- About to claim done → `verification-before-completion` (fresh evidence). Big diff → `lean-review`.
- Shared contracts → `evolving-schemas`. Slow code → `investigating-performance`. Isolated work → `using-git-worktrees`.
- Unfamiliar domain / capability gap → `acquiring-capabilities`: search trusted sources, reuse before building.
- External-evidence question (research/compare/SOTA) → `deep-research`. Comparing options → `option-selection`.
- Many independent sub-tasks / merging workers → `dispatching-parallel-agents` (fan-out/fan-in).

Ambiguous? Pick the safer route.

## Auto-Intensity (no user-facing levels)

Match scrutiny to the weight of the task — never ask, just apply:

- **Trivial** (typo, single-line, obvious): build it directly; skip `brainstorming`.
- **Standard** (default): enforce the lean ladder on every change.
- **Architectural** (new system, cross-cutting change, new dependency): challenge requirements first, propose deletion before design, full `brainstorming` flow.

## The Lean Ladder (active every response)

Stop at the first rung that holds — after understanding the problem, not instead of it:

1. **Need it at all?** Speculative need = skip it, say so in one line. (YAGNI)
2. **Already in this codebase?** Reuse the helper/util/pattern. Look before you write.
3. **Stdlib does it?** Use it.
4. **Native platform covers it?** Platform feature over library over app code.
5. **Installed dependency solves it?** Use it. Never add a new one for what a few lines can do.
6. **One line?** One line. 7. **Only then:** the minimum code that works.

No unrequested abstractions (one-impl interface, one-product factory).
Deletion over addition. Boring over clever.

## Safety Carve-Outs (ALWAYS ON)

Never cut: trust-boundary validation, data-loss handling, security,
accessibility, explicit requests, one runnable check for non-trivial logic.

## Red Flags (STOP — you are rationalizing)

| Thought | Reality |
|---------|---------|
| "Just a question" | Questions are tasks — check skills. |
| Prep before the skill check | Skills define the prep. Check first. |
| "Doesn't need a formal skill" | If a skill exists, use it. |
| "I remember this skill" | Skills evolve. Read the current version. |
| "I'll build it myself" | Search trusted sources — reuse first. |
| "Answer from memory" | World claims need sources — deep-research. |
| "Overkill / one thing first" | Simple things become complex. Check. |
| "Ask which workflow?" | Never. Infer and proceed. |
| Long reply, no diagram/table | 30s budget breached — cut/visualize. |
