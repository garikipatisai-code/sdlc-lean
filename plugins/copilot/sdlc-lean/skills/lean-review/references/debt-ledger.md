# Debt ledger format

A debt ledger records **deliberate shortcuts and deferred work** so they stay
visible instead of rotting into invisible risk. It is the durable half of
lean-review's deferral rule: the code carries a greppable ceiling comment, the
ledger carries the decision and its trigger.

## Where it lives

In a consumer project: `docs/debt-ledger.md` (create on first deferral). This
file is the **format + template** the suite ships.

## Entry format (one row per item)

| id | date | area | finding | trigger | est. saving | status |
|---|---|---|---|---|---|---|
| D-001 | 2026-10-04 | billing | hard-coded tax rate | second tax region | ~40 lines | open |

- **id** — `D-NNN`, never reused.
- **area** — module or subsystem.
- **finding** — the shortcut, with `path:line` and the code's ceiling comment.
- **trigger** — the concrete event that makes the shortcut wrong. Without a
  trigger it is not a deferral, it is an oversight.
- **est. saving** — optional; rough size if paid down now.
- **status** — `open` · `scheduled` · `done` · `wontfix` · `no-trigger`.

## Template

```md
# Debt ledger

| id | date | area | finding | trigger | est. saving | status |
|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |
```

## Rules

- Add a row **when you defer**, not in a cleanup batch.
- Link the row to the ceiling comment (`# scope: <ceiling>, <upgrade path>`).
- `no-trigger` rot: the trigger has already happened — escalate it now, do not
  leave it open.
- `refactor` and `lean-review` read and write this file; side improvements go
  here, never into an unrelated diff.
