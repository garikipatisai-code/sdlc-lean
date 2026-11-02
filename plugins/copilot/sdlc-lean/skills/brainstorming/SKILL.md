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

Ask in batches. Cover: actual user need (challenge it — lean rung 1: does this
need to exist?), alternatives (including deletion and native-platform options),
scope boundaries (non-goals), and constraints (stack, perf, patterns to reuse).

## 3. Design artifact

Write it where the project keeps docs (`docs/`), or inline for a spike.
Visual-first: a mermaid `flowchart` (or `erDiagram`, `sequenceDiagram`), then
the tables. Required headings, in order:

| Heading | Must contain |
|---|---|
| `## Goal` | the outcome, one paragraph |
| `## Non-goals` | what is explicitly out of scope |
| `## Alternatives` | ≥2 options, each with why rejected |
| `## Trade-offs` | what this buys, what it gives up |
| `## Trace` | requirement → design → test table |
| `## Review findings` | written individual findings, merged |
| `## Leading indicators` | recorded per section 5 |

Template and perspective table: `references/design-review.md`.

## 4. Review protocol

- Written individual findings BEFORE approval — not a verbal yes.
- Bounded change → one reviewer; architectural change → ≥2 assigned perspectives: requirements, failure modes, operability.
- Merge dispositions: accept, reject with reason, or defer to a named owner.
- A meeting is optional; written findings are the record.

## 5. Leading indicators (record in the artifact, no dashboard)

- Issues caught pre-implementation, one line each.
- Review coverage: perspectives assigned vs. findings received.
- Requirements traced to tests: traced / total.

**HARD GATE**: no code, plans, or tests until the human approves the design artifact; approving one section does not approve the next.

## 6. Handoff

- Architectural → next skill is ONLY `writing-plans`.
- Bounded → may proceed directly to implementation with TDD.
- Spike → findings report only; decide next step with the human.
- Trust boundary in scope? Hand off to `threat-model`; its artifact is a design input.
