---
name: frontend-design
description: Use when building new UI or reshaping existing UI - distinctive visual design, aesthetic direction, typography, avoid templated defaults, React Tailwind shadcn
---

# Frontend Design

Source: `anthropics/skills#frontend-design` (Apache-2.0). Full upstream prose is authoritative; this file is the lean adapter. See `references/ATTRIBUTION.md`.

## Direction

Act as design lead: one distinct identity per brief, grounded in subject matter (audience, job, materials, vernacular). Confirm subject before designing.

## Principles

- Hero first: most characteristic thing, deliberate form (headline, image, demo, interaction).
- Type: 1–2 families, clearly distinct roles; scale per Elements of Typographic Style; <80ch lines.
- Structure encodes info: borders, numbering, dividers only when content warrants (no 01/02/03 unless sequence).
- Motion: one orchestrated moment max; action-driven motion welcome; no scattered fade-slide.
- Copy: user perspective, active voice, CTA names outcome, errors direct, sentence case, one job per element.

## Avoid unless brief demands

Cream `#F4F1EA`+terracotta `#D97757`, black+acid accent, broadsheet hairlines, SaaS-card kit (identical radius, `rgba(0,0,0,.1)` shadows), template chrome (ALL-CAPS eyebrows, `A · B · C` meta, `WORD — fragment`, `#0B0B0B`, mono labels, `→` links).

## Process

1. Plan tokens: 4–6 named hex, type roles, layout + ASCII wireframe + alignment, uniqueness principles.
2. Review vs brief: generic for any page? Revise and state why.
3. Build: watch CSS specificity; React+Tailwind+shadcn default; tokens in `DESIGN.md`.
4. Critique: responsive, keyboard focus visible, reduced-motion respected, accessible palette; remove one accessory.

## Primitives

Primitive-first: shadcn/Radix + Tailwind only, no custom controls. Customize via `className` and design tokens; never fork primitive behavior.

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

Spec all states: empty, loading, error, disabled — happy-path-only fails review. Mobile to desktop with one consistent spacing scale; no breakpoint-specific chrome.

## Motion

Framer-motion for hover/press/enter, focus transitions, skeleton loaders. Static-only fails review; keep motion to one orchestrated moment max per Principles.

Provenance: upstream siblings `canvas-design` and `web-artifacts-builder` are not vendored here and their SPDX/license status is unverified — do not assume Apache-2.0 coverage.
