---
name: managing-tasks
description: Use for work spanning sessions - persistent task state, progress ledger, and handover prompts that survive compaction and restarts
---

# Managing Tasks

Sessions compact and restart; the ledger is what survives.

## State file

Keep `.planning/STATE.md` at the repo root (gitignored or committed per team
preference): current goal, task list with status, key decisions, next step.
Update it at every task boundary — never only in chat.

## Task lifecycle

`new` (define + decompose) → `start` → `progress` (ledger entry per task:
evidence, not vibes) → `stop`/`handoff` (write STATE.md + a focused resume
prompt) → `validate` (spec mapping) → done.

## Handover prompt

On stop or before context limits: produce a resume prompt containing goal,
STATE.md pointer, completed evidence, and the single next action. A fresh
session must be able to continue from the prompt + STATE.md alone.
