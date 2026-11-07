# Design review reference

On-demand detail for the `brainstorming` skill: the artifact template, review
perspective assignments, the review protocol, and the leading-indicator log.

## Artifact template

```markdown
# <Feature> — design

## Goal
One paragraph: the outcome, and how you know it happened.

## Non-goals
What this change explicitly does not do.

## Alternatives
| Option | Why rejected |
|---|---|
| A | ... |
| B | ... |

## Trade-offs
What the chosen design buys, what it gives up, what would change the decision.

## Trace
| Requirement | Design | Test |
|---|---|---|
| R1 | component or interface | test name or command |

## Review findings
| # | Perspective | Finding | Disposition |
|---|---|---|---|
| 1 | requirements | ... | accept / reject (reason) / defer (owner) |

## Leading indicators
- Issues caught pre-implementation: N
- Review coverage: perspectives assigned / findings received
- Requirements traced to tests: N / M
```

## Perspectives

Assign by change size. Architectural change → at least two perspectives;
bounded change → one reviewer, picking the highest-risk perspective.

| Perspective | Asks |
|---|---|
| requirements | Does every requirement have a design element and a test? Any orphan scope? |
| failure modes | What breaks, under what conditions, and how would we see it? |
| operability | Can this be run, observed, rolled back, and debugged in production? |

## Review protocol

1. Reviewers read the artifact and write findings individually, before any
   discussion or approval.
2. Findings are merged into one list, each with a disposition: accept, reject
   with reason, or defer to a named owner.
3. Approval happens after dispositions are recorded, never before.
4. A meeting is optional; the written findings are the record.

## Leading-indicator log

Append one line per design to the artifact (no dashboard):

| Date | Issues caught pre-implementation | Review coverage | Requirements traced to tests |
|---|---|---|---|
| YYYY-MM-DD | N (one line each) | assigned / received | traced / total |
