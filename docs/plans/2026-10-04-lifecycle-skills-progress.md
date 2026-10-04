# Progress — lifecycle skills (4)

Plan: [`2026-10-04-lifecycle-skills.md`](2026-10-04-lifecycle-skills.md)
Status: all tasks complete.

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 1 | Shipping assertions | ✅ | `tests/opencode/test-plugin-loading.mjs` lifecycle test passes |
| 2 | `incident-postmortem` | ✅ | 26 lines; lint clean |
| 3 | `dependency-upgrade` | ✅ | 24 lines; lint clean |
| 4 | `threat-model` | ✅ | 28 lines; lint clean |
| 5 | `adr` | ✅ | 27 lines; lint clean |
| 6 | Sibling links | ✅ | `systematic-debugging`→incident, `reviewing-security`→threat-model, `evolving-schemas`→adr, `writing-release-notes`→dependency-upgrade |
| 7 | Docs sync | ✅ | README/USAGE 26→30; CHANGELOG updated |

## Full-suite evidence

- `node scripts/validate-skills.mjs` → `checked 30 skills, 0 failures`
- `node --test` → `39 pass / 0 fail`
- `getBootstrapContent()` → `5116 bytes` (unchanged; lifecycle test asserts ≤ 5116)

## Review (self — trivial markdown diff, per requesting-code-review)

- Descriptions are `Use when…` triggers only; asserted by the shipping test. ✅
- No overlap: postmortem (post-incident) ≠ debugging (pre-fix); threat-model
  (design-time) ≠ reviewing-security (review-time). ✅
- No router edit; bootstrap byte-identical. ✅

## Design decisions

- Wired by `description` (skills self-trigger) + sibling links → zero bootstrap
  growth, honoring the 5KB gate.
- Minimal one-screen checklists; no reference templates (deferred as YAGNI).
