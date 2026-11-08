# DFD, LLM, and supply-chain threats

Detail for `threat-model`. Paraphrased from public frameworks; attribution at
the end. No verbatim copying.

## Data flow diagram (DFD)

Draw one DFD per change that crosses a trust boundary. Elements:

- **External entities** — users, other services, CI, browsers, agents.
- **Processes** — code that transforms data (handlers, workers, models).
- **Data stores** — DBs, caches, files, queues, vector stores, model weights.
- **Data flows** — arrows showing direction and protocol.

Mark each **trust boundary** where data changes hands or privilege changes.
Number flows so each arrow can be referenced by a threat row.

STRIDE-lite per element (apply only credible ones):

| element | typical threats |
|---|---|
| external entity | spoofing (identity), repudiation |
| process | tampering, elevation, denial of service |
| data store | tampering, information disclosure, denial of service |
| data flow | tampering, information disclosure, denial of service |

A DFD is the input to the table in `SKILL.md`; every threat row names a
numbered flow or boundary.

## LLM threats (OWASP LLM Top 10, paraphrased)

When the system calls or hosts a model, check these in addition to STRIDE:

- **LLM01 Prompt injection** — untrusted text steers model behavior; direct
  (user) or indirect (retrieved docs, tool output).
- **LLM02 Insecure output handling** — model output treated as trusted and
  passed to a sink (shell, SQL, HTML) without validation.
- **LLM03 Training data poisoning** — untrusted data in training/fine-tune
  corpus biases or backdoors the model.
- **LLM04 Model denial of service** — inputs that exhaust context, tokens, or
  compute; recursive tool calls.
- **LLM05 Supply chain** — compromised base model, plugin, or dataset.
- **LLM06 Sensitive information disclosure** — model leaks secrets or training
  data in responses.
- **LLM07 Insecure plugin design** — tools the model can call lack authz,
  validation, or least privilege.
- **LLM08 Excessive agency** — model granted actions beyond the task; no
  human-in-the-loop on irreversible steps.
- **LLM09 Overreliance** — humans or downstream code trust model output
  without verification.
- **LLM10 Model theft** — weights or proprietary prompts exfiltrated.

Mitigation posture: treat model output as untrusted input; validate at the
boundary; least-privilege tool scopes; human approval on irreversible acts.

## Supply-chain threats

- **Dependency compromise** — malicious or vulnerable package enters the
  build; pin, lock, and verify (SLSA provenance, SBOM).
- **Build/CI compromise** — attacker alters build steps or secrets; protect
  the pipeline and sign artifacts.
- **Artifact tampering** — published package or image modified in transit;
  verify signatures and digests.
- **Source compromise** — stolen maintainer credentials push malicious code;
  MFA, branch protection, code review.
- **Model/weight compromise** — poisoned or swapped weights (see LLM05).
- **Update channel** — auto-update pulls untrusted code; pin versions and
  verify.

## Attribution

- OWASP Top 10 (web) and OWASP Top 10 for LLM Applications — OWASP
  Foundation (owasp.org), paraphrased.
- STRIDE — Microsoft (threat-modeling methodology), paraphrased.
- NIST SP 800-218 (SSDF) and NIST AI RMF 1.0 — NIST, paraphrased.
- MITRE ATT&CK and MITRE ATLAS — MITRE Corporation, paraphrased.
- SLSA (Supply-chain Levels for Software Artifacts) — OpenSSF, paraphrased.

No verbatim text from any source; identifiers are short labels, not quotes.