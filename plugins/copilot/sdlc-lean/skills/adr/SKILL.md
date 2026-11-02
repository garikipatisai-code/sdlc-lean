---
name: adr
description: Use when a significant architectural decision is made and must be recorded - a choice that is hard to reverse or affects multiple modules
---

# Architecture Decision Record

Record the decision and its why. ADRs are append-only history: a decision is superseded, never rewritten.

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

- Only the Status line may change: accepted → superseded by NNNN (or deprecated). The rest of an accepted ADR is frozen.
- The new ADR names and links the decision it replaces, so history stays traceable.
- Keep it to one screen; link code, issues, and prior ADRs.
- State the alternative you rejected and why — that is the value.
