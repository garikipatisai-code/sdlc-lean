---
name: receiving-code-review
description: Use when receiving code review feedback, before implementing suggestions. Verify each item skeptically, especially unclear or questionable feedback
---

# Receiving Code Review

Treat every finding as a hypothesis, not an order.

1. **Verify**: reproduce or trace each finding. If you cannot reproduce it, say so with evidence — do not "fix" phantoms.
2. **YAGNI-check**: does the suggestion add unrequested abstraction or scope? Push back with the lean ladder.
3. **Implement** verified findings, one by one, with tests where behavior changes.
4. **Report**: fixed (with evidence), rejected (with reason), or needs-human (ambiguous trade-off).

Never bulk-apply review suggestions. A review that grows scope is a design
discussion — route it back through `brainstorming`, not silent compliance.
