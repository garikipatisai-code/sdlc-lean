# Citation check

Run this after drafting, before returning any report. It turns "I have sources"
into "each claim is supported by the page it cites". Budget: minutes, not a
second research round.

## 1. Extract claims

Walk the draft and list every substantive claim (numbers, causal statements,
comparisons, capability claims). Ignore opinions you label as opinions and
generic background. Each claim gets its citation `[n]` and a short id (C1, C2…).

## 2. Fetch

Open the cited URL itself — never the search result page, never a snippet.
Record: url, title, fetch status, and the quoted passage that should support
the claim. A fetch that fails, redirects to a paywall, or lacks the passage is
a **missing source**, not a pass.

## 3. Entailment rubric

Judge the claim against the fetched page only — not against what you remember
or what another source said.

| Verdict | Test | Action |
|---|---|---|
| supported | The page states the claim, or states premises that directly entail it | Keep as is |
| partial | The page supports part of the claim, a weaker version, or a different scope/population | Narrow the claim to what the page says; qualify it |
| unsupported | The page does not entail the claim, contradicts it, or the passage is absent | Cut the claim, or keep it only as "unverified" with a stated reason |

Edge cases: a claim spanning two sources is checked against both; a claim
resting on absence ("no study shows X") needs a search log, not a single page;
numbers must match units and dates exactly.

## 4. Accuracy count

Report `citation_accuracy: supported ÷ checked` (checked = claims with a
citation, excluding duplicates). Also list every partial and unsupported
verdict with its claim id. Never round up, never hide the failures; an
accuracy count without the failing list is not a check.

## 5. Conflicts

When two fetched pages disagree: keep both citations, state the disagreement in
`## Conflicts and gaps`, and prefer the more primary, more recent, or
higher-quality source (`references/source-quality.md`). If the conflict
changes the answer, say so in the executive summary; if it cannot be resolved
within budget, mark the claim "unverified" and name what would settle it.
