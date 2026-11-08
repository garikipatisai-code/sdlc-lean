# Open-Design Vendor Guards

- **Date:** 2026-11-08
- **Status:** draft
- **Approved by:** <!-- empty; do not self-approve -->
- **Approved at:** <!-- empty -->

## Goal

Guard any vendored open-design material with pinned versions, checksums, and permissive licensing. Default to refs-only and zero dependencies; vendoring stays opt-in.

## Acceptance Criteria

- **AC-1 (pin):** Every vendored item is version-pinned; unpinned copies fail.
- **AC-2 (SUMS):** Checksums are present and verified; missing or mismatched checksums fail.
- **AC-3 (Apache-2.0):** Only Apache-2.0-licensed material (with attribution) is eligible for vendoring.
- **AC-4 (zero-dep):** No new dependency is added to enable the vendored design material.
- **AC-5 (opt-in):** Vendoring is explicit opt-in only; default path remains refs-only with no vendored source.

## Out-of-scope

All other code, refs-only design guidance changes, and approval actions (`spec-check approve`, setting `approved_by`/`approved_at`).

## Notes

- **draft** only; never approve in this change.
- Short capture only; no sensitive values or upstream wording reproduced.
