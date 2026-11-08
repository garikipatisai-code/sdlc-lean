# Design tokens (refs-only)

References: `nexu-io/open-design`, Apache-2.0, refs-only. This file is original prose; it does not reproduce upstream text verbatim. Verbatim-check 2026-11-08: own-prose, no upstream copy verified via marker set.

## Layers

- identity: raw brand values — color primitives, type scale, spacing base.
- structure: layout values — radii, elevations, breakpoints.
- default: semantic values with fallback (defaults-with-fallback), e.g. `color: var(--color-text, #111)`.
- alias: public names that point via `var(` to the layer below, so components consume the alias only.

## Motion

- Ease: ease-out `cubic-bezier(0.23,1,0.32,1)`.
- Enter: 200ms. Exit: 140ms.
- no ease-in on UI motion; never collapse a surface with `scale(0)`.

## Token-first rule

- Token-first: do not use the default Tailwind palette or unregistered hardcoded colors. Every color resolves through a registered token or alias.

## Theme

- Dark mode: `[data-theme="dark"]` overrides semantic tokens only; primitives stay unchanged.

## Fixture sync

- Keep `tokens.css :root` identical to `fixture :root`; change one, change both.

## USAGE

- USAGE nests tokens behind a small router/map: a single entry table maps names to `var(` references, and components consume mapped names, never raw values.

## Sanitization

- Validate token names against identifier charset; escape or reject dangerous values; keep `var()` indirection (consume aliases only, never raw values).

## Accessibility

- reduced-motion: honor `prefers-reduced-motion` and collapse animation durations.
- focus-visible: keep a visible focus ring on all interactive elements.
- Contrast: body text meets 4.5:1 against its background.
