# Web rigor tiers

Three test rigor tiers for web-game development. Each tier tightens the
block-vs-warn matrix below as the project matures; a block never downgrades to
warn within the same tier.

## Tiers

### minimal — prototype / pre-alpha
Only the gates that invalidate the whole loop block. Everything else warns so
the loop stays fast while sim rules, art, and perf are still in flux.

### standard — vertical slice / alpha
Determinism and perf block; visual and a11y still warn during active churn.

### full — release candidate / live
Determinism, perf, visual, and a11y all block. New warns require a follow-up
ticket.

## Per-test-type block-vs-warn matrix

| Test type        | minimal | standard | full | Rationale                              |
|------------------|---------|----------|------|----------------------------------------|
| Sim determinism  | block   | block    | block | Divergent sim = broken game            |
| Perf / frame budget| block | block    | block | Applies once a frame budget is declared|
| Visual regression| warn    | warn     | block | Art churn in prototype/alpha           |
| Lint / types     | warn    | block    | block | Type errors break the build            |
| Accessibility    | warn    | warn     | block | Blocked only at release candidate      |
| Network sync     | warn    | block    | block | Desync invalidates multiplayer         |

### Mode notes (pattern from CCGS modes.rigor)

- Prototype == minimal: sim determinism=block, perf=block (budget declared),
  visual=warn.
- Tighten the block set as maturity grows; never relax a block mid-tier.
- A test type not listed above defaults to warn until a tier promotes it.
