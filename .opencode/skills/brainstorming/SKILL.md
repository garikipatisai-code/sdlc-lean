---
name: brainstorming
description: Use when facing any creative work before code exists - new features, components, behavior changes, or vague ideas. MUST run before writing-plans and before any implementation
---

# Brainstorming

Refine rough ideas into an approved design. **No code until the design is approved.** For bug fixes use `systematic-debugging` instead.

## 1. Classify (one line, then proceed)

- **Spike**: throwaway exploration to answer one question → time-box it, report findings, stop.
- **Bounded**: clear shape, small surface → ask at most 3 questions, then draft.
- **Architectural**: new system, cross-cutting change, new dependency → full flow below.

## 2. Questions (Socratic, batched)

Ask in batches, not one at a time. Cover: actual user need (challenge it —
lean rung 1: does this need to exist?), alternatives considered (including
deletion and native-platform options), scope boundaries (explicit non-goals),
and constraints (stack, perf, existing patterns to reuse — lean rung 2).

## 3. Design document (present in sections, get approval per section)

Write the design where the project keeps docs (`docs/` or equivalent), or
present inline for small tasks. Visual-first: lead with a mermaid `flowchart`
(or `erDiagram` for data, `sequenceDiagram` for interactions), then a compact
table of components/interfaces. Sections: Goal, Non-goals, Alternatives
considered (a table: option | why rejected), Architecture (diagram + interfaces),
Lean check (which rung each part stops at), Open questions.

**HARD GATE**: do not write code, plans, or tests until the human approves
the design. Approval of one section does not imply approval of the next.

## 4. Handoff

- Architectural → next skill is ONLY `writing-plans`.
- Bounded → may proceed directly to implementation with TDD.
- Spike → findings report only; decide next step with the human.
