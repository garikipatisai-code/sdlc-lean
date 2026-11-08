# Framework mappings (paraphrased)

Every threat row cites at least one ID from this file. Paraphrased identifiers
only; see attribution at the end.

## OWASP Top 10 (web, 2021)

- A01 Broken Access Control
- A02 Cryptographic Failures
- A03 Injection
- A04 Insecure Design
- A05 Security Misconfiguration
- A06 Vulnerable and Outdated Components
- A07 Identification and Authentication Failures
- A08 Software and Data Integrity Failures
- A09 Security Logging and Monitoring Failures
- A10 Server-Side Request Forgery

## OWASP Top 10 for LLM Applications (2025)

- LLM01 Prompt Injection
- LLM02 Insecure Output Handling
- LLM03 Training Data Poisoning
- LLM04 Model Denial of Service
- LLM05 Supply Chain Vulnerabilities
- LLM06 Sensitive Information Disclosure
- LLM07 Insecure Plugin Design
- LLM08 Excessive Agency
- LLM09 Overreliance
- LLM10 Model Theft

## NIST

- SP 800-218 (SSDF): PO (prepare org), PS (protect software), PW (produce
  well-secured software), RV (respond to vulnerabilities).
- AI RMF 1.0: GOVERN, MAP, MEASURE, MANAGE.

## MITRE ATT&CK (enterprise, selected)

- T1195 Supply Chain Compromise (and sub-techniques .001/.002/.003)
- T1078 Valid Accounts (initial access via stolen creds)
- T1190 Exploit Public-Facing Application
- T1059 Command and Scripting Interpreter
- T1566 Phishing
- T1027 Obfuscated Files or Information
- T1552 Unsecured Credentials
- T1499 Endpoint Denial of Service

## MITRE ATLAS (adversarial ML, selected)

- AML.T0051 LLM Prompt Injection
- AML.T0043 Craft Adversarial Data
- AML.T0010 ML Supply Chain Compromise
- AML.T0040 ML Model Inference API Access (model theft)
- AML.T0031 Erode ML Model Integrity

## SLSA (supply-chain levels)

- L1 provenance exists; L2 hosted build; L3 hardened builds; L4 hermetic +
  reproducible (aspirational).

## Attribution

- OWASP Top 10 (web) and OWASP Top 10 for LLM Applications — OWASP
  Foundation, paraphrased identifiers.
- NIST SP 800-218 and NIST AI RMF 1.0 — NIST, paraphrased.
- MITRE ATT&CK and MITRE ATLAS — MITRE Corporation, paraphrased.
- SLSA — OpenSSF, paraphrased.

Short labels only; no verbatim text from any source.