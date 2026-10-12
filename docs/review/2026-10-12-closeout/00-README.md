# External review bundle — empirical-research enhancement closeout (2026-10-12)

## What this is

Research-mode semantics for SDLC-Lean, adapted from audited upstream patterns (Inspect AI + RD-Agent, MIT, no code copied). Bounded closeout correction applied: fail-closed locks, incomplete-lock + successor-release tests, resampling/provenance separation.

## Contents

| File | Content |
|---|---|
| `01-patch-tracked.diff` | Unified diff of all 5 modified tracked files (3 skills, installer, installer test) |
| `bundle-new/` | Full copies of every new file: `scripts/research/`, `tests/scripts/research/`, `research-protocol` skill, edited-skill copies, installer test, all three plan/ledger docs. Test files carry a `.copy` suffix so the repo's `node --test` discovery ignores them (restore the original name to run a copy) |
| `03-correction-log.md` | Design corrections 1–8, bootstrap fix, T8 code+security fixes, closeout C1–C4 |
| `04-acceptance-mapping.md` | 7 scenarios → exact test names; resampling vs provenance split |
| `05-verify-output.txt` | Actual `npm run verify` output (exit 0: lint 37/0, tests 137/0) |
| `06-revision.txt` | Exact revision + working-tree status |

## Source revision

HEAD `a9470bd` (2026-10-04). **All enhancement work is uncommitted working tree** — see `06-revision.txt` status. Nothing committed, pushed, or installed globally. Upstream audit clones (read-only, `/tmp/opencode/upstream`) are not part of this bundle; their evidence is archived in-repo at `docs/research/upstream-audits/`.

## How to verify (reviewer)

1. `npm run verify` — must show lint 37/0, tests 137/0.
2. `node --test 'tests/scripts/research/*.mjs'` — 77 research tests.
3. Read `04-acceptance-mapping.md`, spot-check any scenario → test.
4. Check `01-patch-tracked.diff` — additive-only skill edits; installer +2 lines.

## Constraints observed

Zero new runtime deps · no global install · no remote writes · no GPU jobs · no live research runs · no sudo.
