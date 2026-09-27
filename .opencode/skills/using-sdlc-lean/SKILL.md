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
Never ask the user to pick a mode, level, or workflow — infer it and proceed.
</EXTREMELY-IMPORTANT>

## The Rule

**Check for a relevant skill BEFORE any response or action** — including
clarifying questions and codebase exploration. Announce
"Using [skill] to [purpose]" and follow it exactly.
Every human-facing word follows `communicating-concisely` (30s budget, visuals over walls).

## Auto-Routing (infer intent, do not ask)

Classify the request, then run the pipeline. Announce the route in one line and proceed.
Run the pipeline FIRST even when a domain skill matches; domain skills execute inside it, not instead of it.

- New idea / feature / behavior change / vague "let's build X" → **feature pipeline**: explore → `brainstorming` (design approval HARD GATE) → `writing-plans` → execute → review → verify.
- Bug / failing test / unexpected behavior → **bugfix pipeline**: `systematic-debugging` first, no speculative fixes.
- Restructure / cleanup, no behavior change → **refactor pipeline**: impact analysis first; incidental improvements go to the debt ledger, not the diff.
- "Is this safe?" or auth/input/data-access changes → **security-audit pipeline** (read-only) + `reviewing-security`.
- Approved spec in hand → `writing-plans`, then `executing-plans` (inline) or `subagent-driven-development` (independent tasks).
- About to claim done → `verification-before-completion` (fresh evidence). Big diff → `lean-review`.
- Shared contracts → `evolving-schemas`. Slow code → `investigating-performance`. Isolated work → `using-git-worktrees`.
- Unfamiliar domain, or a gap the suite can't cover → `acquiring-capabilities`: search trusted sources and reuse/install before building.

Ambiguous? Pick the safer route and say why.

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

No unrequested abstractions (one-impl interface, one-product factory, never-changing config).
Deletion over addition. Boring over clever.

## Safety Carve-Outs (ALWAYS ON)

Never cut: trust-boundary validation, data-loss handling, security,
accessibility, explicit requests, one runnable check for non-trivial logic.

## Red Flags (STOP — you are rationalizing)

| Thought | Reality |
|---------|---------|
| "Just a simple question" | Questions are tasks. Check for skills. |
| Any prep before skill check ("need context", "explore first", "gather info") | Skills tell you HOW to prepare. Check first. |
| "Doesn't need a formal skill" | If a skill exists, use it. |
| "I remember this skill" | Skills evolve. Read the current version. |
| "I'll just build it myself" | Search trusted sources first — reuse beats reimplementation. |
| "The skill is overkill / one thing first" | Simple things become complex. Check BEFORE acting. |
| "Ask which workflow they want" | Never. Infer the route and proceed. |
| Long reply with no diagram/table | 30s budget breached — cut or visualize. |
