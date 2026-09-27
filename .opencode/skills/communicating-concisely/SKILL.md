---
name: communicating-concisely
description: Use whenever communicating with the human - status updates, explanations, reviews, or any generated documentation. Enforces the 30-second attention budget with visuals over text walls
---

# Communicating Concisely

Human attention per response: ~30 seconds (~120 words). Only then can a human
comfortably oversee agent-driven development. Every human-facing output obeys this.

## Rules

1. **Answer first.** Verdict, outcome, or recommendation in the first 2 lines. No preamble, no restating the question.
2. **Default under 120 words.** Bullets over paragraphs. One idea per bullet.
3. **Visual over prose for anything structural**: flows/architecture/sequences → mermaid diagram; comparisons/options → table; status → checklist or table. Never a text wall where a diagram or table fits.
4. **Progressive disclosure**: summary + evidence always; details on demand ("say the word and I'll expand"). Link to files (`path:line`) instead of pasting code.
5. **Expand only when asked** or when the task genuinely requires it (plan approval, incident report). Even then: diagram first, then the minimum prose.

## Generated documentation

Same contract, scaled: start with a mermaid overview + a summary table, then
sections. Every diagram must be renderable (valid mermaid, no HTML hacks).
Prefer: flowchart for flows, sequenceDiagram for interactions, erDiagram for
schemas, gantt or checklist for plans.
