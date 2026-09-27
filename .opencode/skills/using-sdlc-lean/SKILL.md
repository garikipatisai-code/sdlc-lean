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
"Using [skill] to [purpose]" and follow it exactly. Never ask the user to
pick a mode, level, or workflow — infer it below and proceed.

## Auto-Routing (infer intent, do not ask)

Classify the request, then run the pipeline. Announce the route in one line and proceed.
Even when a domain skill matches (frontend-design, etc.), run the pipeline
skill FIRST for new features and behavior changes — the domain skill executes
inside the pipeline, never instead of it.

- New idea / feature / behavior change / vague "let's build X" → **feature pipeline** (`/feature`): explore → `brainstorming` (design approval HARD GATE) → `writing-plans` → execute → review → verify.
- Bug / failing test / unexpected behavior → **bugfix pipeline** (`/bugfix`): `systematic-debugging` first, no speculative fixes.
- Restructure / cleanup / "make this better" with no behavior change → **refactor pipeline** (`/refactor`): impact analysis first; improvements found along the way go to the debt ledger, not the diff.
- "Is this safe / review for security" or auth/input/data-access changes → **security-audit pipeline** (read-only) + `reviewing-security`.
- Approved spec in hand → `writing-plans`, then `executing-plans` (inline) or `subagent-driven-development` (independent tasks).
- About to say done/passing → `verification-before-completion` first (fresh evidence, no exceptions).
- Diff feels big → `lean-review`. Starting isolated feature work → `using-git-worktrees`.
- Touching shared contracts → `evolving-schemas`. Slow code → `investigating-performance`.

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
| "The skill is overkill / one thing first" | Simple things become complex. Check BEFORE acting. |
| "Ask which workflow they want" | Never. Infer the route and proceed. |
