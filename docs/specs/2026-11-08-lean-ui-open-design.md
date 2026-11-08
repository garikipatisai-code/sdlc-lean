# Lean UI Open Design (refs-only)

- **Date:** 2026-11-08
- **Status:** draft
- **Approved by:** <!-- empty; do not self-approve -->
- **Approved at:** <!-- empty -->
- **Plan:** `docs/plans/2026-11-08-lean-ui-open-design-progress.md`

## Goal

Deliver a lean UI upgrade using **refs-only** design references (no vendored upstream source), grounded in the approved 2026-11-08 brief. Establish token-first guidance, motion defaults, and review gates without expanding scope beyond the listed files.

## Scope

Allowed/scope files for this work (as implemented or governed by the brief):

- `.opencode/skills/frontend-design/SKILL.md`
- `.opencode/skills/frontend-design/references/design-tokens.md`
- `.opencode/skills/frontend-design/references/ATTRIBUTION.md`
- `.opencode/skills/ui-review/SKILL.md`
- `.opencode/skills/web-game-development/SKILL.md` (budget gate only)
- `docs/plans/2026-11-08-lean-ui-open-design-progress.md`
- `docs/specs/2026-11-08-lean-ui-open-design.md` (this spec)

Out of scope: all other code/skills, runtime behavior changes, dependency changes, approval actions (`spec-check approve`, setting `approved_by`/`approved_at`).

## Acceptance Criteria

- **AC-1 (License, refs-only):** All open-design references are **refs-only** with **Apache-2.0** attribution where applicable (e.g., `nexu-io/open-design` entry in frontend-design `references/ATTRIBUTION.md`); no upstream source vendored.
- **AC-2 (4-layer taxonomy):** Design tokens follow a clear 4-layer taxonomy (documented in `references/design-tokens.md`) so primitive → semantic → component/context → usage layers are distinguishable.
- **AC-3 (Motion durations):** Motion defaults specify **200ms** and **140ms** durations (per design-tokens guidance) for the defined interaction classes.
- **AC-4 (Motion easing/transform bans):** Motion guidance **forbids `ease-in`** and **forbids `scale(0)`** (no disappear-from-zero / harsh ease-in patterns) except where explicitly justified by the token spec.
- **AC-5 (Token-first bans):** UI guidance/review enforces token-first: **ban default Tailwind palette** usage and **ban unregistered hardcoded colors**; require design tokens.
- **AC-6 (Dark-mode override):** Dark mode is implemented via **`[data-theme="dark"]` overrides of semantic tokens only** (no ad-hoc dark color forks).
- **AC-7 (Fixture-sync):** Any token/contract fixtures used for validation remain in sync with the documented token names and rules (no drift between reference and checks).
- **AC-8 (USAGE router):** A clear usage/router path exists so consumers know which reference applies (design-tokens/attribution/skill routing documented and discoverable from the frontend-design skill).
- **AC-9 (Accessibility):** A11y gates remain enforced: WCAG 2.2 AA contrast (4.5:1 text, 3:1 large/graphics), focus-visible, keyboard/landmarks, and `prefers-reduced-motion` respected.
- **AC-10 (Budget — frontend-design):** `.opencode/skills/frontend-design/SKILL.md` stays within **160** lines.
- **AC-11 (Budget — ui-review):** `.opencode/skills/ui-review/SKILL.md` stays within **25** lines.
- **AC-12 (Budget — web-game-development):** `.opencode/skills/web-game-development/SKILL.md` stays within **155** lines.
- **AC-13 (Verify green):** `npm run verify` passes (lint + tests green) for the delivered state.
- **AC-14 (Scope files):** Changes are limited to the scope files listed above; no unrelated code/skill edits.
- **AC-15 (Non-destructive review behavior):** ui-review retains fail-closed fetch behavior (`If the fetch fails, stop`, `fails closed`, never review from memory) alongside token-first/motion checks.
- **AC-16 (Provenance):** Provenance/attribution remains honest (refs-only, unverified siblings not claimed as covered) consistent with skill attribution notes.

## Notes

- This document is a **draft** derived from the approved 2026-11-08 brief and progress log; it records intended/verified acceptance criteria for the lean UI open-design work.
- Approval is out of scope for this draft (do not set `approved_by`/`approved_at`, do not run `spec-check approve`).
- Evidence: `docs/plans/2026-11-08-lean-ui-open-design-evidence.json`.
