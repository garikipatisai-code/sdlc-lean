# Citation check

Run this after drafting, before returning any report. It turns "I have sources"
into "each claim is supported by the page it cites". Budget: minutes, not a
second research round. Entailment is **strict**: judge the claim against the
fetched page only — never against memory, never against another source, never
against what "probably" follows.

## 1. Extract claims

Walk the draft and list every substantive claim (numbers, causal statements,
comparisons, capability claims). Ignore opinions you label as opinions and
generic background. Each claim gets its citation `[n]` and a short id (C1, C2…).

## 2. Fetch

Open the cited URL itself — never the search result page, never a snippet.
Record: url, title, fetch status, and the quoted passage that should support
the claim. A fetch that fails, redirects to a paywall, or lacks the passage is
a **missing source**, not a pass.

## 3. Entailment rubric (strict)

Judge the claim against the fetched page only. No charitable reading: if the
page does not state it or directly entail it, it is not supported. Numbers
must match units and dates exactly.

| Verdict | Test | Action |
|---|---|---|
| supported | The page states the claim, or states premises that directly entail it | Keep as is |
| partial | The page supports part of the claim, a weaker version, or a different scope/population | Qualify: narrow the claim to what the page says |
| unsupported | The page contradicts the claim, or the passage is absent / does not entail it | Cut |
| contested | Two or more fetched pages disagree on the same factual assertion and neither clearly wins on source quality/freshness/primary status | Keep both citations and state the disagreement; qualify or cut if it changes the answer; else label "contested" |
| unverified | The claim cannot be checked: fetch failed, single source with no corroboration, or an absence claim with no search log | Cut, or mark "unverified" with the reason and what would settle it |

Edge cases: a claim spanning two sources is checked against each cited page and
is supported only if every cited page it relies on entails its portion;
otherwise partial/unsupported. A claim resting on absence ("no study shows X")
needs a search log, not a single page.

## 4. Contradiction detection

After entailment, scan across fetched pages for the same factual assertion
(numbers, dates, causal claims, capability claims):

- If two or more pages assert incompatible facts, record both citations and
  the exact disagreement (values, dates, conclusions).
- Try to resolve using `references/source-quality.md`: prefer the more
  primary, more recent, or higher-quality source; if resolved, keep that
  verdict and note the resolution.
- If unresolvable within budget, verdict = **contested**: keep both citations,
  state the disagreement in `## Conflicts and gaps`, and say whether it
  changes the answer.
- Never average or smooth over a disagreement; surface it. Convergence is not
  proof (three low-quality sources agreeing is shared noise).

## 5. Uncertainty and confidence handling

- **Per-claim confidence**: high = 3+ independent sources agree with no
  contradiction; medium = 2 sources, or one authoritative primary; low = single
  source or unresolved conflict.
- Single-source factual claims are marked "unverified" (not "supported").
- Absence/estimate/opinion must be labeled as such; never present an estimate
  as a fact.
- Undated or stale material in fast-moving topics → "unverified" as a factual
  basis until re-verified.
- Propagate uncertainty: report-level confidence reflects the weakest key
  claim; unresolved conflicts lower it. If evidence is missing, write
  "insufficient data found" — never pad.
- A confidence label without the failing/unverified list is not a check.

## 6. Accuracy count

Report `citation_accuracy: supported ÷ checked` (checked = claims with a
citation, excluding duplicates). Also list every partial, unsupported, contested,
and unverified verdict with its claim id. Never round up, never hide the
failures; an accuracy count without the failing list is not a check.

## 7. Conflicts

When two fetched pages disagree: keep both citations, state the disagreement in
`## Conflicts and gaps`, and prefer the more primary, more recent, or
higher-quality source (`references/source-quality.md`). If the conflict
changes the answer, say so in the executive summary; if it cannot be resolved
within budget, mark the claim "unverified" and name what would settle it.
