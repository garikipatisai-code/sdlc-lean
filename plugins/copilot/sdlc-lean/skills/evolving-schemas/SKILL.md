---
name: evolving-schemas
description: Use when changing APIs, database schemas, or shared contracts. Expand/contract sequencing - never additive and destructive changes in one deploy
---

# Evolving Schemas

**Refusal: additive and destructive changes in the same deploy.**

## Expand/contract

1. **Expand**: add the new field/endpoint/table alongside the old. Deploy. Migrate writers, then readers.
2. **Backfill**: if old rows need the new shape, run an idempotent backfill - safe to run twice. Assert row counts (source = written + skipped) and run it a second time to prove the double run changes nothing.
3. **Contract gate**: remove the old shape only when a named metric reads zero old-shape reads (for example, zero log events still decoding the old payload) for a full window. Record the metric, the window, and the date it last read zero.
4. **Rollback**: name the rollback before the contract deploy - feature flag, down-migration, or restored snapshot - and test it on a copy. No tested rollback, no contract deploy.

## Compatibility rules

- No required-field additions, renames, or type changes without a compat window.
- SQL: additive migrations only per deploy; backfill before enforcing NOT NULL.
- Version the contract (or changelog it) with every change; note the removal date for deprecated parts.
- A contract choice that is hard to reverse? Record it with `adr`.
