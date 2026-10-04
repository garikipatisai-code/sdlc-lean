---
name: adr
description: Use when a significant architectural decision is made and must be recorded - a choice that is hard to reverse or affects multiple modules
---

# Architecture Decision Record

Record the decision and its why. ADRs are immutable history.

## When

A choice that is costly to reverse, crosses modules or teams, adds a dependency, or settles a recurring debate.

## Template (one file per decision, numbered)

- **Title** — `NNNN short-phrase`.
- **Status** — proposed / accepted / superseded by `NNNN` / deprecated.
- **Context** — the forces, constraints, and what we know.
- **Decision** — what we will do, in the active voice.
- **Alternatives** — option | why rejected.
- **Consequences** — what becomes easy, what becomes hard, what we now owe.

## Rules

- Never edit an accepted ADR; supersede it with a new one.
- Keep it to one screen; link code, issues, and prior ADRs.
- State the alternative you rejected and why — that is the value.
