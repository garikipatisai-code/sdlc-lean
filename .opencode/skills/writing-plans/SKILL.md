---
name: writing-plans
description: Use when you have an approved spec or requirements for a multi-step task, before touching any code. Produces a bite-sized implementation plan
---

# Writing Plans

Break approved work into tasks of 2–5 minutes each. One plan file per feature
(e.g. `docs/plans/YYYY-MM-DD-<slug>.md`). Visual-first: a plan is a diagram
plus a task table, not an essay.

## Plan header (mandatory)

- **Goal**: one paragraph, then a mermaid `flowchart` of the architecture/flow.
- **Architecture**: components touched + interfaces consumed/produced.
- **Tech stack**: languages, frameworks, test command(s) — auto-detect from the repo, ask if ambiguous.
- **Spec**: link to the approved design.
- **Global Constraints**: repo conventions (from AGENTS.md/CONTRIBUTING if present).
- **Lean Constraints**: which ladder rung each area targets; reuse-first candidates.
- **Review Focus**: what reviewers should scrutinize.

## Task table (mandatory)

| # | Task | Files | Test | Expected | Verify |
|---|------|-------|------|----------|--------|
| 1 | ... | exact paths | test that proves it | observable outcome | command |

Keep prose to per-task notes only where the table cannot carry it (signatures,
edge cases). No narrative sections that restate the table.

## Self-review before presenting

Check coverage (every spec requirement maps to ≥1 task), consistency (no
contradicting tasks), and leanness (flag any task that adds abstraction —
justify or delete). Present the plan and wait for approval; never execute an
unapproved plan. Execution happens via `executing-plans` (inline) or
`subagent-driven-development` (parallel subagents).
