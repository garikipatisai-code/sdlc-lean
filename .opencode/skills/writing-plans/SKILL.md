---
name: writing-plans
description: Use when you have an approved spec or requirements for a multi-step task, before touching any code. Produces a bite-sized implementation plan
---

# Writing Plans

Break approved work into tasks of 2–5 minutes each. One plan file per feature
(e.g. `docs/plans/YYYY-MM-DD-<slug>.md`). Visual-first: a plan is a diagram
plus a task table, not an essay.

## Plan header (mandatory)

Start the plan with YAML frontmatter so the spec gate can parse it:

```yaml
---
spec: docs/specs/YYYY-MM-DD-<slug>.md
status: approved
approved_by: <human>
approved_at: <ISO-8601 UTC>
files:
  - exact/or/glob/path
allow:
  - docs/plans/<slug>-progress.md
---
```

`files` is the edit scope; `allow` is always-writable control state (progress
ledger, debt ledger). The plan and spec are immutable while the gate is active.
The block above is the **post-approval** shape: before approval use
`status: draft` and leave `approved_by`/`approved_at` empty. The human fills
them; the planner never self-approves.

Then the prose header:

- **Goal**: one paragraph, then a mermaid `flowchart` of the architecture/flow.
- **Architecture**: components touched + interfaces consumed/produced.
- **Tech stack**: languages, frameworks, test command(s) — auto-detect from the repo, ask if ambiguous.
- **Spec**: link to the approved design.
- **Global Constraints**: repo conventions (from AGENTS.md/CONTRIBUTING if present).
- **Lean Constraints**: which ladder rung each area targets; reuse-first candidates.
- **Review Focus**: what reviewers should scrutinize.

## Activate the gate

After the human approves the plan, run:

```sh
node scripts/spec-check.mjs approve docs/plans/<slug>.md
# no repo-local script: node "${XDG_CONFIG_HOME:-$HOME/.config}/opencode/scripts/spec-check.mjs" approve ...
```

This writes `.sdlc/spec-gate.json` binding the spec hash, plan hash, and file
scope. Do not implement before it succeeds. `spec-check verify` must stay clean;
`close` is for after the final evidence is recorded. Changes to the plan or spec
require `close` + a new approval — never edit around the gate.

## Task table (mandatory)

| # | Task | Spec req | Files | Test | Expected | Verify |
|---|------|----------|-------|------|----------|--------|
| 1 | ... | requirement ID | exact paths | test that proves it | observable outcome | command |

Keep prose to per-task notes only where the table cannot carry it (signatures,
edge cases). No narrative sections that restate the table.

## Self-review before presenting

Check coverage (every spec requirement maps to ≥1 task and a requirement ID),
consistency (no contradicting tasks), and leanness (flag any task that adds
abstraction — justify or delete). Present the plan and wait for approval; never
execute an unapproved plan. Execution happens via `executing-plans` (inline) or
`subagent-driven-development` (parallel subagents), and the gate is active in
both.
