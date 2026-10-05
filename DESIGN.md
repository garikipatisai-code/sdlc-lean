# DESIGN.md — pinned UI tokens (sdlc-lean)

Default stack: React + Tailwind + shadcn. Pin tokens here so upstream churn (e.g. Radix→Base UI Jul 2026) cannot silently restyle outputs.

- `--font-sans`, `--font-serif`, `--font-mono`: set per brief, never defaults.
- Color: 4–6 named hex per design plan; record here per project.
- Radius, shadows: record chosen values; no global defaults.
- shadcn: use MCP registry (`npx shadcn@latest mcp`) + `components.json`; pin registry commit per project.
- Dark mode: derive from tokens, record mapping here.
