# Plan rubric — binary checklist

Run this against a draft plan before presenting it. Every item is pass/fail; one
fail blocks presentation. No scores, no "mostly", no holistic judgment.

## Checklist

### Requirement coverage

- [ ] Every acceptance criterion (AC) maps to ≥1 task.
- [ ] Every task names a spec requirement (AC ID or requirement ID) in `Spec req`.
- [ ] No orphan task: no task lacks a spec requirement.
- [ ] No task edits the tests that grade the work (its own grader).

### Task shape

- [ ] Localized work (one file or one concern) → 3–5 tasks.
- [ ] Multi-file interdependent work → explicit dependency order + impact notes per task.
- [ ] Unknown work → a spike task first, whose outcome shapes the rest.

### Task table

- [ ] `Files` lists exact paths where knowable.
- [ ] `Verify` is an external verification command (test, lint, typecheck, CLI).
- [ ] `Verify` is never "reviewed it", "looks good", or a manual opinion.
- [ ] `Expected` is observable, not a restatement of the task.
- [ ] Every task has one verifiable outcome.

### Header and gate

- [ ] Frontmatter has `spec`, `status`, and `files`.
- [ ] `approved_by`/`approved_at` are empty until a human approves.
- [ ] `allow` contains the progress ledger.
- [ ] Goal, architecture, tech stack, spec link, global/lean constraints, and review focus are present.
- [ ] Plan and spec stay immutable while the gate is active.

## Fail actions

| Fail | Action |
|---|---|
| AC with no task | Add a task or cut the AC from the spec (re-approve). |
| Task with no spec requirement | Delete it or attach the requirement it serves. |
| Task edits its own grader | Stop. Escalate; never weaken the test. |
| `Verify` is not a command | Replace it with the exact command and its pass condition. |
| Unknown scope | Add a spike task before implementation tasks. |
| Multi-file coupling hidden | Add dependency order and impact notes. |

## Red flags

- Task sizes in minutes instead of verifiable outcomes.
- `Verify: reviewed it` or `Verify: tested manually`.
- Tasks that restate the table in prose.
- A plan that changes its own scope mid-flight.
