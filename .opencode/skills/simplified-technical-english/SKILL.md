---
name: simplified-technical-english
description: Use when writing long prose, explanations, or generated documentation that must be unambiguous and easy to read - applies an ASD-STE100-informed subset at about 80% (short simple sentences, one meaning per word, active voice), never claiming certification or compliance
---

# Simplified Technical English (STE-informed)

Plain, unambiguous prose for long or technical text. This is an
**ASD-STE100-informed subset**, applied at ~80% — not the standard. Output is
**STE-informed, never certified or compliant** [ASD-STE100 Issue 9, © ASD; the
dictionary is not reproduced here].

Origin: Andrej Karpathy (2026) suggested asking a model to explain in
ASD-STE100 and softening to "80% of the way" because the spec is stringent.
Use the principles; do not copy the dictionary.

## When to use

- Use for long explanations, generated docs, runbooks, specs, and prose.
- **Structure first.** A diagram or table beats STE. Never steamroll a good
  mermaid into sentences.
- Skip it for short status lines, code, and anything `communicating-concisely`
  already covers as a list.

## The subset (highest-leverage rules)

**Words**
1. One word, one meaning; do not rotate synonyms for the same thing.
2. Use a verb for an action, not a nominalization ("install", not "installation of").
3. Avoid phrasal verbs; use the single verb ("remove", not "take off").
4. Keep terminology consistent; do not stretch a term to a new sense ad hoc.

**Verbs**
5. Permitted: infinitive, imperative, simple present, simple past, simple
   future; past participle only as an adjective.
6. No present/past perfect ("have received" → "received").
7. Do not use -ing forms as running verbs.
8. Active voice; passive only in descriptive text when the actor is unknown.

**Sentences**
9. Procedures use the imperative ("Install the component.").
10. One instruction per sentence.
11. ≤20 words per procedural sentence; ≤25 per descriptive sentence.
12. Do not drop subjects, verbs, or articles to shorten.
13. Noun clusters ≤3 words; break them with prepositions.

**Structure**
14. ≤6 sentences per paragraph; one topic per paragraph.
15. Put a condition before the action it applies to.
16. Put WARNING/CAUTION before the step it applies to.
17. Use vertical numbered/bulleted lists for sequences and conditions.
18. No semicolons; start a new sentence.
19. Use articles consistently; American English spelling.

**Safety of meaning**
20. **Preserve conditions, exceptions, and modality.** "May" is not "will";
    "unless" and "not verified" stay. Never trade correctness for brevity.

## Hard rule

**Preserve the facts.** STE must never drop a caveat, invent precision, or
turn an estimate into a fact. If simplifying would change meaning, keep the
longer sentence.

## Self-check before sending

- Longest sentence under the limit? Any semicolons? Any perfect tense or
  -ing verb? Is every condition still present? Does any claim now look more
  certain than the source?

## Anti-patterns

- Do not claim "ASD-STE100 compliant" — nothing here is certified.
- Do not simplify away uncertainty, scope, or exceptions.
- Do not replace a clear diagram with prose.
