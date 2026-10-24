---
description: Reverse engineer a shipped artifact (read-only) - route, evidence, validate, report
agent: plan
---

Read-only reverse engineering. Target: $ARGUMENTS (artifact path, or "my app" + the feature).

1. **Route** — follow `reverse-engineering`: pick the target route (`references/target-routing.md`); connect via MCP tools → `rea` CLI → `npx -y rea-agents@6.4.0` (approval required first).
2. **Analyze** — summary-first; keep evidence IDs; grade observations vs inferences; record unknowns instead of guessing.
3. **Validate** — apply `references/reconstruction-validation.md` gates before any reconstruction claim.
4. **Report** — findings with evidence, coverage, limitations, residual unknowns. Never mutate the analyzed artifact or apply fixes in this pipeline.
