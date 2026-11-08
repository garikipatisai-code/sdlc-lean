---
name: frontend-design
description: Use when building new UI or reshaping existing UI - distinctive visual design, aesthetic direction, typography, avoid templated defaults, React Tailwind shadcn
---

# Frontend Design

Source: `anthropics/skills#frontend-design` (Apache-2.0). Full upstream prose is authoritative; this file is the lean adapter. See `references/ATTRIBUTION.md`. Design tokens: `references/design-tokens.md`.

## Direction
Act as design lead: one distinct identity per brief, grounded in subject matter (audience, job, materials, vernacular). Confirm subject before designing.

## Principles

- Hero first: most characteristic thing, deliberate form (headline, image, demo, interaction).
- Type: 1–2 families, clearly distinct roles; scale per Elements of Typographic Style; <80ch lines.
- Structure encodes info: borders, numbering, dividers only when content warrants (no 01/02/03 unless sequence).
- Motion: one orchestrated moment max; action-driven motion welcome; no scattered fade-slide.
- Copy: user perspective, active voice, CTA names outcome, errors direct, sentence case, one job per element.

## Avoid unless brief demands + Taste fail-gate

Cream `#F4F1EA`+terracotta `#D97757`, black+acid accent, broadsheet hairlines, SaaS-card kit (identical radius, `rgba(0,0,0,.1)` shadows), template chrome (ALL-CAPS eyebrows, `A · B · C` meta, `WORD — fragment`, `#0B0B0B`, mono labels, `→` links).
Fail-gate: one identity only — no SaaS-card kit, no template chrome (any present = fail); failing to remove one accessory = blocking.

## Process

1. Plan tokens: 4–6 named hex, type roles, layout + ASCII wireframe + alignment, uniqueness principles. Token-first: no default Tailwind palette or unregistered colors; motion per `references/design-tokens.md` (ease-out, 200/140ms); dark mode via `[data-theme="dark"]` overrides semantic tokens only.

2. Review vs brief: generic for any page? Revise and state why.
3. Build: watch CSS specificity; React+Tailwind+shadcn default; tokens in `DESIGN.md`.
4. Critique: responsive, focus-visible rings, reduced-motion respected, accessible palette; remove one accessory (blocking).
## Primitives

Primitive-first: shadcn/Radix + Tailwind only, no custom controls. Customize via `className` and design tokens; never fork primitive behavior. shadcn snippets (MIT, refs only, no vendoring): Button/Dialog/Form via `shadcn add`; hardening: `npx shadcn@<pinned-ver> add --dry-run; git diff --check + review before commit`; customize via `className`+tokens only.

## Full-spec prompt template

Copy-paste this block per brief before building:

```text
Per-component behavior: <what each component does, its triggers, its outcome>.
Per-element prefs: <type roles, spacing, emphasis per element>.
Stack/fonts/palette: <React+Tailwind+shadcn, 1-2 font families + roles, 4-6 named hex>.
App context: <audience, job, surrounding screens/flows>.
Iteration protocol: <plan tokens + wireframe, build, review vs brief, revise with reason>.
```

Reject vague prompts; fill every slot or confirm subject first.

## AA gate

WCAG 2.2 AA: text contrast 4.5:1, large text/graphics 3:1. Focus-visible never obscured. Targets 24px min. Full keyboard path plus landmarks; reduced-motion respected.

## States + responsive

Spec all states: empty, loading, error, disabled — required, missing any fails review (pass/fail). Mobile to desktop with one consistent spacing scale; no breakpoint-specific chrome.

## Motion

One orchestrated moment max — pass/fail; more = fail. Framer-motion for hover/press/enter, focus transitions, skeleton loaders; static-only fails review. Honor prefers-reduced-motion; keep focus-visible ring visible.

## Visual-critique loop (opt-in manual)

Run screenshot → critique vs brief → fix, max 3 rounds. Evidence: Playwright `toHaveScreenshot()` golden-file workflow — first run writes golden, `--update-snapshots` refreshes. Manual only. Never wired to plugin/CI.

## Vendor tooling (opt-in, dev-only)

Vendored under `references/vendor/open-design/` (pinned `87a4f91c308170a8270458fc40fc66a86ed69aac`, Apache-2.0; see `references/vendor/open-design/ATTRIBUTION.md`). Dev tools only — never auto-run, never wired to build/test/CI; they expect an upstream-shaped `design-systems/` tree beside the script:

- `npx tsx references/vendor/open-design/check-tokens-fixture-sync.ts` — token/fixture sync guard.
- `npx tsx references/vendor/open-design/extract-components-manifest.ts [--brand <id>] [--out <path>]` — component manifest extractor.
- `references/vendor/open-design/contracts/components-manifest.ts` — vendored dep (byte-identical upstream); extractor import adapted in exactly one line: `../packages/contracts/src/design-systems/components-manifest.ts` → `./contracts/components-manifest.ts`.
- `references/vendor/open-design/contracts/components-manifest.contract.json` — derived contract (`derived: true`, `derivedDate: 2026-11-08`); no upstream JSON at pinned SHA; covers all 10 `ComponentsManifest` top-level fields.
- `references/vendor/open-design/token-schema.ts` — zero-import schema.

Run manually when needed; do not add to npm scripts or CI.

Provenance: upstream siblings `canvas-design` and `web-artifacts-builder` are not vendored here and their SPDX/license status is unverified — do not assume Apache-2.0 coverage.
