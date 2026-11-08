---
name: threat-model
description: Use when designing or changing anything that crosses a trust boundary - auth, input handling, data access, or external calls - before implementation
---

# Threat Model

**Inbound route**: `brainstorming` hands off when a trust boundary is in scope;
`reviewing-security` hands off when a finding needs a design fix. The artifact is
a design input.

Write `docs/threat-model.md` (one per change; append a section if it exists).
Lightweight and design-time: a short artifact, not a document pile.

## Checklist

1. **Assets** — what is worth stealing, breaking, or lying about?
2. **Entry points** — every input: users, APIs, files, env, webhooks, other services.
3. **Trust boundaries + DFD** — draw the data flow (externals, processes, stores, flows); mark every boundary. See `references/dfd-and-threats.md`.
4. **Attacker paths** — per boundary, attacker input → sink → impact.
5. **Threats** per boundary (STRIDE-lite): spoofing, tampering, repudiation, information disclosure, denial of service, elevation; plus LLM (OWASP LLM Top 10) and supply-chain (SLSA/NIST SP 800-218 SSDF/ATT&CK) per `references/dfd-and-threats.md`.
6. **Mitigations** — one per credible threat; prefer platform/framework controls over hand-rolled ones.
7. **Residual risk** — what remains and the named residual owner who accepts it.

## Output (`docs/threat-model.md`)

| boundary | threat | risk | mitigation | residual owner |
|---|---|---|---|---|

Risk is binary: high or low. No ordinal 1–10 likelihood or impact scores; if you cannot say high or low, trace the path further.

Mappings (paraphrased, attributed): OWASP Top 10 / OWASP LLM Top 10 / NIST (SP 800-218, AI RMF) / MITRE ATT&CK & ATLAS — `references/mappings.md`. Cite a framework ID per row (e.g. A01, LLM01, T1195).
## Rules

- No finding without a traced path: attacker input → impact.
- Validate at the boundary, once. Encode invariants in types where possible.
- Secrets never enter the model context or logs.
- Every threat cites a framework ID from `references/mappings.md`.
