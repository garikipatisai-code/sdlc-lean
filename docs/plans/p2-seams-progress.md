# P2 — D-015/D-019 unwired seams documented as accepted debt (docs-only)

## RED (gap probe)
- `.opencode/agents/orchestrator.md:172-174` previously read "Unwired seams are debt, not enforced: ... no wiring promise." — the claim was present but phrased like an open TODO rather than an explicit accepted-debt record; no retro-sweep-before-close tie-in on the seam line itself (line 176 covers skipped gates generally).
- Ambiguity: could be read as pending wiring work instead of accepted debt with no behavior change.

## GREEN (minimal diff, wording only, no code logic)
- `.opencode/agents/orchestrator.md:172-174` reworded:
  "Accepted debt (no wiring promise): unwired seams D-015 (`checkReviewerBash`
  read-only test allowlist) and D-019 (`checkImplementerBash`) are not enforced.
  Reviewers are read-only: no bash, no fixes. Retro-sweep required before close."
- No behavior change: reviewers remain read-only (no bash, no fixes); seams remain unwired/not enforced; no code touched.

## Verification
- `node scripts/validate-skills.mjs` → exit 0 (unchanged skill set; no skill files edited).

## Files touched
- `.opencode/agents/orchestrator.md:172-174` (wording only)
- `docs/plans/p2-seams-progress.md` (this record; created)

Status: done — debt documented, docs-only.
