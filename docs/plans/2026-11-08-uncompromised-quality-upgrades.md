---
spec: docs/specs/2026-11-08-uncompromised-quality-upgrades.md
status: approved
approved_by: user-chat-2026-11-08-blanket-6plans
approved_at: 2026-11-08T17:20:05.000Z
files:
  - .opencode/skills/investigating-performance/SKILL.md
  - .opencode/skills/investigating-performance/references/method.md
  - .opencode/skills/threat-model/SKILL.md
  - .opencode/skills/threat-model/references/dfd-and-threats.md
  - .opencode/skills/threat-model/references/mappings.md
  - .opencode/skills/systematic-debugging/SKILL.md
  - .opencode/skills/systematic-debugging/references/debug-method.md
  - .opencode/skills/test-driven-development/SKILL.md
  - .opencode/skills/test-driven-development/references/tdd-method.md
  - .opencode/skills/dependency-upgrade/SKILL.md
  - .opencode/skills/dependency-upgrade/references/upgrade-method.md
allow:
  - docs/plans/2026-11-08-uncompromised-quality-upgrades-progress.md
  - docs/plans/2026-11-08-uncompromised-quality-upgrades-evidence.json
---

# Plan — Uncompromised Quality Upgrades

**Goal**: Deepen five thin execution skills with cap-safe reference detail
(own prose, paraphrase-only, attributed) — perf method + gate wiring,
threat DFD/framework maps, debug containment/taxonomies, TDD
micro-steps/mutation/property, upgrade SBOM/OSV/Renovate posture.

**Note**: spec file not present yet — create
`docs/specs/2026-11-08-uncompromised-quality-upgrades.md` before approving
(see progress deviations).

| # | Task | Verify |
|---|------|--------|
| 1 | investigating-performance (probe-first, method ref) | `node scripts/validate-skills.mjs` |
| 2 | threat-model (DFD + LLM/supply-chain + mappings) | `node scripts/validate-skills.mjs` |
| 3 | systematic-debugging (8D/SRE, bisect, taxonomies) | `node scripts/validate-skills.mjs` |
| 4 | test-driven-development (Beck, Stryker, fast-check) | `node scripts/validate-skills.mjs` |
| 5 | dependency-upgrade (Renovate, CycloneDX, OSV) | `node scripts/validate-skills.mjs` |

**Status**: draft — not approved. Non-sensitive only.
Approval scope note – covers this plan only; future work needs fresh approval (no open-ended grant).
