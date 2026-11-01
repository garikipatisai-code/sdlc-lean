---
name: writing-plans
description: Use when you have an approved spec or requirements for a multi-step task, before touching any code. Produces a bite-sized implementation plan
---

# Writing Plans

Break approved work into tasks with one verifiable outcome each. One plan file per feature
(e.g. `docs/plans/YYYY-MM-DD-<slug>.md`). Visual-first: a plan is a diagram plus a task table, not an essay.

## Task shape

Route depth by the work's shape, not by task count:

- **Localized** (one file or one concern): 3–5 tasks, each independently verifiable.
- **Multi-file interdependent**: state the explicit dependency order and note each task's impact on the files it touches.
- **Unknown**: run a spike task first; its outcome sets the shape of the rest.

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
  - docs/plans/<slug>-evidence.json
---
```

`files` is the edit scope; `allow` is always-writable control state; plan/spec are immutable while
the gate is active. Before approval use `status: draft` with empty `approved_by`/`approved_at` — the human fills them, the planner never self-approves.

- **Goal**: one paragraph, then a mermaid `flowchart` of the architecture/flow.
- **Architecture**: components touched + interfaces consumed/produced.
- **Tech stack**: languages, frameworks, test command(s) — auto-detect from the repo, ask if ambiguous.
- **Spec**: link to the approved design.
- **Global Constraints**: repo conventions (from AGENTS.md/CONTRIBUTING if present).
- **Lean Constraints**: which ladder rung each area targets; reuse-first candidates.
- **Review Focus**: what reviewers should scrutinize.

## Activate the gate

Default: machine-approve opens the gate when a valid unchanged envelope covers the plan; human `/approve docs/plans/<slug>.md` in the V2 TUI (TTY fallback `spec-check approve`, installed copy if no repo-local script) is fallback-only — no envelope, or envelope refused/changed — and writes `.sdlc/spec-gate.json` binding spec/plan hashes and scope.
Never implement before it succeeds; `close` only after evidence; plan/spec changes need `close` + a new approval — never edit around the gate. Widening the envelope is its own committed+authorized step first.

## Task table (mandatory)

| # | Task | Spec req | Files | Test | Expected | Verify |
|---|------|----------|-------|------|----------|--------|
| 1 | ... | requirement ID | exact paths | test that proves it | observable outcome | command |

`Files` lists exact paths where knowable. `Verify` is an external verification command (test, lint,
typecheck, CLI) — never "reviewed it". Evidence: `docs/plans/<slug>-evidence.json` =
`{ plan, plan_sha256, tasks: [{ task, verify, exit, at }] }`; one row per task, `verify` exactly the table cell, `exit` 0, `at` ISO-8601Z.

Keep prose to per-task notes only (signatures, edge cases); no narrative sections that restate the table.

## Requirement coverage

Binary checklist — every line must be true:

- [ ] every AC maps to ≥1 task
- [ ] every task names a spec req
- [ ] no orphan task (no task without a spec req)
- [ ] no task edits its own grader

## Test integrity

Never edit the tests that grade the work. If a grader is wrong, stop and escalate; do not weaken it to pass.

## Self-review before presenting

Run the [plan rubric](references/plan-rubric.md) as a binary gate, then check coverage,
consistency, and leanness (flag any task that adds abstraction — justify or delete). Present
the plan and wait for approval; never execute an unapproved plan. Execution:
`executing-plans` (inline) or `subagent-driven-development` (parallel subagents); the gate is active in both.
