---
name: threat-model
description: Use when designing or changing anything that crosses a trust boundary - auth, input handling, data access, or external calls - before implementation
---

# Threat Model

Lightweight and design-time. Output a short table, not a document.

## Checklist

1. **Assets** — what is worth stealing, breaking, or lying about?
2. **Entry points** — every input: users, APIs, files, env, webhooks, other services.
3. **Trust boundaries** — where data changes hands; mark each one.
4. **Threats** per boundary (STRIDE-lite): spoofing, tampering, repudiation, information disclosure, denial of service, elevation.
5. **Mitigations** — one per credible threat; prefer platform/framework controls over hand-rolled ones.
6. **Residual risk** — what remains, and who accepts it.

## Output

| boundary | threat | likelihood | mitigation | residual |
|---|---|---|---|---|

## Rules

- No finding without a traced path: attacker input → impact.
- Validate at the boundary, once. Encode invariants in types where possible.
- Secrets never enter the model context or logs.
