# Progress — UI/UX SOTA parity

Plan: [`2026-10-05-uiux-sota.md`](2026-10-05-uiux-sota.md)
Spec: [`../spikes/2026-10-05-uiux-sota.md`](../spikes/2026-10-05-uiux-sota.md) + [`../spikes/2026-10-05-popular-skills.md`](../spikes/2026-10-05-popular-skills.md)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 1 | Vendor frontend-design | ✅ | lint 33/0, Apache-2.0 attribution |
| 2 | Vendor ui-review | ✅ | lint 34/0, MIT attribution + live-fetch |
| 3 | intent-preview + /preview | ✅ | lint 35/0, reimplemented pattern |
| 4 | autonomy-dial + audit-undo | ✅ | lint 36/0, ledger created |
| 5 | plugin toast upgrade | ✅ | uxStatus TDD GREEN, verify 56/0 |
| 6 | tokens pin | ✅ | DESIGN.md + tokens.css |
| 7 | static dashboard | ✅ | --check ok, zero-dep |
| 8 | router + docs sync | ✅ | bootstrap 5109B, counts 36 |
| 9 | eval + review gates | ✅ | 14 probes dry, security+lean clean |

## Full-suite evidence (final)

- `node --test tests/opencode/test-ux-hooks.mjs tests/opencode/test-plugin-loading.mjs` → 20/0
- `npm run verify` → 36 skills lint 0 failures, 57/0 tests
- `npm run dashboard -- --check` → status ok, eval 5, progress 5
- `npm run eval` (dry) → 14 probes (activation 2, safety 2, routing 10)
- Bootstrap 5109B (≤5120, ≤5116 autonomy gate); secret-scan clean
- Lean review: adapters minimal, dashboard stdlib-only, no new deps. Review fixes applied: dashboard binds 127.0.0.1, all upstream SHAs pinned, LICENSE third-party list extended. Ship.

## Review round (requesting-code-review)

Single reviewer (`code-reviewer` subagent): verdict ship after 2 fixes. Disposition — fixed: localhost bind, pinned SHAs (41bbe19 / 063bee9 / e3d624b), plan count 32→36, deleted stale template rows, LICENSE entries. Rejected with reason: `preview.md agent:build` (matches bugfix/feature/refactor precedent); guidelines/skills two-repo split is upstream design (documented in attribution). net -8 lines from stale-row deletion.
