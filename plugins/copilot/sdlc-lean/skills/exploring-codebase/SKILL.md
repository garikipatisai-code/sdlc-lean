---
name: exploring-codebase
description: Use when orienting in unfamiliar code - mapping architecture, tracing flows, assessing change impact or finding dead code. Read-only reconnaissance
---

# Exploring Codebase

Read-only. No edits; shell only for search/read commands.

## Operations

- **map**: project overview — entry points, module layout, where config/tests/docs live.
- **find-symbol**: locate any function, class, or type with `path:line`.
- **change-impact**: given a symbol, list all callers/dependents — what breaks if it changes?
- **dead-code**: unused exports, unreachable branches, orphaned files.
- **flows**: trace a request/event end to end across modules.

Report concise and cited (`path:line`). End with dead ends ruled out so the
next agent does not repeat the search.
