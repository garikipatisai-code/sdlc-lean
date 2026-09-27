---
name: writing-skills
description: Use when creating new skills, editing existing skills, or verifying skills work before deployment. Minimal trigger descriptions, pressure-tested
---

# Writing Skills

## Description rules (SDO)

The `description` is the trigger — write `Use when...` conditions only, never
a workflow summary. Name must match the directory and
`^[a-z0-9]+(-[a-z0-9]+)*$`. Keep description under 1024 chars.

## Minimalism

Smallest skill that changes behavior. One job per skill; compose, don't bloat.
Every section must earn its place — delete anything the agent would do anyway.

## Verification

1. `node scripts/validate-skills.mjs` — static lint must pass.
2. Pressure-test: fresh session, give a task that should trigger the skill,
   confirm it fires (and that unrelated tasks don't).
3. Fix loopholes found in testing by tightening the description, not by adding prose.
