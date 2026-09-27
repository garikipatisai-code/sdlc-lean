---
description: Read-only security assessment - audit, scan, dead code, dependencies, report
agent: plan
---

Read-only security assessment. Scope: $ARGUMENTS (default: current diff / changed files).

1. **Audit** — follow `reviewing-security`: trace attacker-controlled input to impact for every finding. No traced path = no finding.
2. **Scan** — check for hardcoded secrets, sensitive file access, unsafe sinks (project-appropriate).
3. **Dead code & deps** — flag unreferenced exports and unused dependencies (see `lean-review` tags).
4. **Report** — ranked findings with `path:line`, severity by exploitability. Never apply fixes in this pipeline.
