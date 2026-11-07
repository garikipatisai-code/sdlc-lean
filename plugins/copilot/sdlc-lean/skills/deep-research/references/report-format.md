# Report format

Keep it inside the 30-second budget (`communicating-concisely`): summary first,
detail after; diagrams and tables over prose walls.

## Skeleton

```md
# <Title>
_<date> · depth: <mode> · sources_reviewed: N · confidence: high|medium|low_

## Executive summary
- 3–5 bullets: the answer, the strongest evidence, the biggest caveat.

## <Theme 1>
Claim [1]. Claim [2].  (mermaid/table if it clarifies)

## <Theme 2>
...

## Key takeaways
- Actionable, decision-oriented.

## Conflicts and gaps
- Contested points + why; sub-questions that remain unanswered.

## Sources
1. <title> — <url>
2. ...
```

## Citations

- Inline `[n]` next to each substantive claim; numbers map to `## Sources`.
- Sequential, no gaps, each URL fetched and read (never snippet-only).
- Every entry: title — url (add author/org + date when it matters).

## Confidence

- **high** — 3+ independent sources agree.
- **medium** — 2 sources, or one authoritative primary.
- **low** — single source or unresolved conflict; mark "unverified".

## Long reports

Write the full report to a file (e.g. `docs/research/<slug>.md`) and return:
the executive summary, the file path, `sources_reviewed: N`, and confidence.
Never paste the entire report into chat.
