---
name: autonomous-loop
description: Use when asked to achieve a goal autonomously - "keep going until", "loop until", "run end to end", "do whatever it takes", or any goal with acceptance criteria. Loop route-decide-plan-execute-verify-correct until done or an honest budget stop
---

# Autonomous Loop

Drive a goal to done **without asking**. Each iteration is a full SDLC pass.
Stop only when acceptance criteria are met with fresh evidence, or a budget
rule fires.

## Setup (once)

- Restate the goal + **acceptance criteria** (observable, verifiable).
- Declare the **budget**: 3 iterations unless the human set one.
- Create the progress ledger `docs/plans/<slug>-progress.md` (format and
  handover rules per `managing-tasks`) — it survives compaction and drives
  the give-up-honestly report.

## Loop (repeat until a stop rule fires)

```mermaid
flowchart LR
  R[route] --> D[decision? option-selection, research-first]
  D --> P[plan: writing-plans if multi-step]
  P --> E[execute: TDD / systematic-debugging]
  E --> V[verify: fresh evidence]
  V --> C{criteria met?}
  C -- yes --> K[critic pass: code-review + security-review]
  K --> O[completion report: evidence + decisions]
  C -- no --> B{budget left? progress?}
  B -- yes --> F[fix: systematic-debugging, never speculative]
  F --> E
  B -- no --> H[give up honestly: state + remaining work]
```

1. **Route** with `using-sdlc-lean` (feature/bugfix/refactor/research) and
   invoke the pipeline skill first.
2. **Decide** every fork via `option-selection`: research, matrix, pick,
   record. Never ask the human to choose.
3. **Plan** with `writing-plans` for multi-step work; skip for one-liners.
4. **Execute** with `test-driven-development`, or `systematic-debugging` for
   bugs.
5. **Verify** with `verification-before-completion`: run the repo's commands,
   reuse `docs/verify-recipe.md` if it exists, else write it.
6. **Correct**: on failure, one fix round via `systematic-debugging`; record
   what changed each round in the ledger.

## Stop rules (first that fires wins)

| Rule | Action |
|---|---|
| Criteria met, fresh evidence | critic pass → completion report |
| 2 consecutive no-progress loops | change strategy (different approach), not the same fix again |
| Budget exhausted | **give up honestly**: state, evidence, exact remaining work, next step |
| Human interrupts | pause, report loop state from the ledger |

## Rules

- Never claim done without fresh verification output.
- Safety guards (destructive ops, secrets) are not negotiable — never loop
  around them.
- Update the ledger every iteration; it is the memory that survives compaction.
- Subagent work fans out per `dispatching-parallel-agents`; merge per its
  contract.
