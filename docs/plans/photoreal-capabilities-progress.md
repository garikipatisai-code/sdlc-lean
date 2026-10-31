# Progress — photoreal capabilities

- Plan: `docs/plans/2026-10-31-photoreal-capabilities.md`
- Spec: `docs/specs/2026-10-31-photoreal-capabilities.md`
- Goal: photoreal Babylon.js guidance (4 references + SKILL routes + test)
- Deadline: 2026-11-01T00:00:00Z
- Authorization: human answered Approve & implement 2026-10-31 (question tool)

## Tasks

- [x] Task 0 (recovery) — gate spawn-via-node fix + regression test (done 2026-10-31T02:25:18Z; verify `node --test tests/opencode/test-spec-gate.mjs && node scripts/validate-skills.mjs` exit 0, evidence row appended)
- [x] Task 1 — rendering reference + test skeleton (done 2026-10-31T02:23:18Z)
- [x] Task 2 — world-streaming reference (done 2026-10-31T02:24:10Z)
- [x] Task 3 — traffic + crowds reference (done 2026-10-31T02:24:10Z)
- [x] Task 4 — photoreal budgets reference (done 2026-10-31T02:24:10Z)
- [x] Task 5 — SKILL.md routes at or under 155 lines (done 2026-10-31T02:24:10Z)

## Task 0 log

- UTC: 2026-10-31T02:11:50Z
- Wrote spec (REQ-1..REQ-6, AC-1..AC-10, out-of-scope, Babylon-stay
  Y-statement, trace table), plan (frontmatter + 5-task table), this ledger.
- Tasks 1-5 references NOT implemented per brief.

## Recovery log (gate spawn-via-node amendment)

- Gate backup/rm verified 2026-10-31 (backup
  /tmp/opencode/spec-gate.backup-2026-10-31.json); gate closed for docs edits.
- Amendment drafted: spec REQ-0 + AC-0 (gate spawn must invoke CLI via `node`,
  not `process.execPath`; regression test stubs `spawnSync`, asserts argv0
  `node`), plan frontmatter reset to draft (approved_by/approved_at empty,
  8 files), Task 0 row added first (Task 1 after Task 0, Tasks 2-4 after
  Task 1, Task 5 last).
- Task 0 implementation DONE 2026-10-31T02:25:18Z (regression test in
  test-spec-gate.mjs, spawn via node); spec + plan approved in TTY (human,
  never self-approve).

## Close-out (2026-10-31T02:25:18Z)

- All Tasks 0-5 done; every plan Verify re-run exit 0 (see evidence JSON).
- Reviewers ship: code review minor only; security low residual (pty accepted
  with hashes + host-evidence mitigation).
- SKILL.md at 153/155 lines — headroom warning: only 2 lines remain.
- New test files tests/opencode/test-approve-autofill.mjs and
  tests/opencode/test-gate-spawn-node.mjs were created pre-gate (no scope
  violation, no further edits).

## Task 5 log

- UTC: 2026-10-31T02:24:10Z
- Added 4 SKILL.md route rows (photoreal-rendering, world-streaming,
  traffic-crowds, photoreal-budgets); SKILL.md 149 → 153 lines (cap 155).
- Activated 5 photoreal test todos → real assertions (12 pass, 0 todo).
- Verify: photoreal suite exit 0, validate-skills exit 0 (see evidence JSON).
