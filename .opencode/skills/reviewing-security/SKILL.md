---
name: reviewing-security
description: Use when reviewing code for security, before merging auth, input-handling, or data-access changes. No finding without a traced attacker path
---

# Reviewing Security

**Refusal: a finding without a traced path from attacker-controlled input to
impact is not a finding.** Uncertain items are questions.

## Checklist

- Input → sink tracing: every external input (request, file, env, message) followed to its sink.
- Authorization: every data access checked against ownership/role — missing check = finding with the unguarded `path:line`.
- Secrets: no hardcoded credentials, tokens, or keys; `.env` never read into context or committed.
- Injection: queries/commands/shell built from untrusted parts flagged with the exact concatenation.

Report ranked by exploitability: `path:line` + attack path + concrete fix.
