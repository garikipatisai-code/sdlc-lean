---
name: incident-postmortem
description: Use when an incident or outage has happened and needs a blameless postmortem - so the team learns and the same failure cannot silently repeat
---

# Incident Postmortem

Blameless: find the conditions, not a person. Facts before narrative.

## Checklist

1. **Timeline** — start at the first user-visible symptom, use UTC timestamps, note who did what.
2. **Impact** — who/what was affected, for how long, how many, any data loss. Quantify.
3. **Detection** — how it was found and time to detect; a customer report is a gap.
4. **Mitigation** — what stopped it and time to restore.
5. **Root cause** — the condition that made this possible, not the last action.
6. **Contributing factors** — deploy, observability, process, or docs that widened it.
7. **What was luck** — a near miss is a finding.
8. **Action items** — each with an owner, a date, and a type: prevent / detect / mitigate.

## Rules

- No names as causes. "The deploy script had no lock", not "X deployed twice".
- An action item without an owner and date is a wish.
- Separate confirmed facts from hypotheses.
- End with the smallest change that would have caught this earlier.
