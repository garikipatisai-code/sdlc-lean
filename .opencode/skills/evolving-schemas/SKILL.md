---
name: evolving-schemas
description: Use when changing APIs, database schemas, or shared contracts. Expand/contract sequencing - never additive and destructive changes in one deploy
---

# Evolving Schemas

**Refusal: additive and destructive changes in the same deploy.**

## Expand/contract

1. **Expand**: add the new field/endpoint/table alongside the old. Deploy. Migrate writers, then readers.
2. **Contract**: only after all clients move, remove the old in a separate deploy.

## Compatibility rules

- No required-field additions, renames, or type changes without a compat window.
- SQL: additive migrations only per deploy; backfill before enforcing NOT NULL.
- Version the contract (or changelog it) with every change; note the removal date for deprecated parts.
