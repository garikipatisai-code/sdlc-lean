---
spec: docs/specs/open-design-vendor-guards.md
status: approved
approved_by: user-chat-2026-11-08-blanket-6plans
approved_at: 2026-11-08T17:20:05.000Z
files:
  - .opencode/skills/frontend-design/references/vendor/open-design/PIN.json
  - .opencode/skills/frontend-design/references/vendor/open-design/ATTRIBUTION.md
  - .opencode/skills/frontend-design/references/vendor/open-design/SHA256SUMS
  - .opencode/skills/frontend-design/references/vendor/open-design/token-schema.ts
  - .opencode/skills/frontend-design/references/vendor/open-design/check-tokens-fixture-sync.ts
  - .opencode/skills/frontend-design/references/vendor/open-design/contracts/components-manifest.ts
  - .opencode/skills/frontend-design/references/vendor/open-design/extract-components-manifest.ts
  - .opencode/skills/frontend-design/references/vendor/open-design/contracts/components-manifest.contract.json
  - .opencode/skills/frontend-design/SKILL.md
  - tests/opencode/vendor-open-design-pin.mjs
allow:
  - docs/plans/open-design-vendor-guards-progress.md
  - docs/plans/open-design-vendor-guards-evidence.json
---

# Plan — Open-Design Vendor Guards

**Goal**: Pin and vendor (refs-gated, SHA256SUMS-checked) the
`nexu-io/open-design` tooling into `frontend-design` references: pin recipe +
license verify, token schema + fixture-sync checker, extractor + derived
contract, opt-in dev-only docs; `vendor-open-design-pin.mjs` guards drift.

**Note**: spec file not present yet — create
`docs/specs/open-design-vendor-guards.md` before approving
(progress notes pin path only).

| # | Task | Verify |
|---|------|--------|
| 1 | fetch, pin, license-verify + pin test | `node --test tests/opencode/vendor-open-design-pin.mjs` |
| 2 | vendor schema + fixture-sync checker | `node --test tests/opencode/vendor-open-design-pin.mjs` |
| 3 | extractor dep + derived components contract | `node --test tests/opencode/vendor-open-design-pin.mjs` |
| 4 | vendor docs (opt-in, dev-only) + full verify | `node scripts/validate-skills.mjs` |
| 5 | dangling-import fix (checker adaptation #2) | `node --test tests/opencode/vendor-open-design-pin.mjs` |

**Status**: draft — not approved. Non-sensitive only.
Approval scope note – covers this plan only; future work needs fresh approval (no open-ended grant).
