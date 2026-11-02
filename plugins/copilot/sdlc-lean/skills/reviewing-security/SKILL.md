---
name: reviewing-security
description: Use when reviewing code for security, before merging auth, input-handling, or data-access changes. No finding without a traced attacker path
---

# Reviewing Security

**Refusal: a finding without a traced path from attacker-controlled input to
impact is not a finding.** An untraced concern is a question, not a finding.

## Checklist

- Input → sink tracing: every external input (request, file, env, message) followed to its sink.
- Authorization: every data access checked against ownership/role — missing check = finding with the unguarded `path:line`.
- Secrets: no hardcoded credentials, tokens, or keys; `.env` never read into context or committed.
- Injection: queries/commands/shell built from untrusted parts flagged with the exact concatenation.

## Finding template

One line per finding: `attacker input → sink → path:line → severity`.

- Fill all four fields; an untraced concern is a question, not a finding.
- Severity is high or low, from exploitability and reach, never a hunch.

Report ranked by exploitability: `path:line` + attack path + concrete fix.

Designing it, before code exists? Pair with `threat-model`.
