# Phase C permissions/orchestration progress

## Goal

Draft-only Phase C plan for permissions/orchestration runtime enforcement
(D-011, D-012, D-015/D-019, D-026/D-033, D-018). No code edits in this step.

## Baseline

- Baseline SHA: `644df00b078049487b036dbe1ccbf156d85c4dfb`
- Spec: `docs/debt-ledger.md`
- Plan: `docs/plans/2026-11-07-phase-c-perms.md` (draft, unapproved)
- Gate: none active (docs-only; listed files only)

## Verification

- Test: `node --test tests/scripts/research/test-phase.mjs` + `node --test tests/opencode/test-agent-permissions.mjs`
- Last run: 20/0 + 4/0 green (Task 3 round 2 2026-11-07T03:13:24.000Z, exit 0 — no existing contract broke)

## Task log

| # | Task | Status |
|---|------|--------|
| 1 | Phase strictness (D-012) | DONE 2026-11-07T03:04:28.122Z — `node --test tests/scripts/research/test-phase.mjs` 20/0 exit 0 |
| 2 | Invocation gate (D-011) | DONE 2026-11-07T03:07:43.000Z — `node --test tests/scripts/research/test-phase.mjs` 20/0 exit 0 |
| 3 | Agent path guards (D-015/D-019) | DONE 2026-11-07T03:13:24.000Z (round 2: 3 reviewer defects closed) — `node --test tests/scripts/research/test-phase.mjs` 20/0 + `node --test tests/opencode/test-agent-permissions.mjs` 4/0 exit 0 |
| 4 | uxStatus caller + read-only tool (D-026/D-033) | DONE 2026-11-07T03:15:30.000Z — `node --test tests/opencode/test-ux-hooks.mjs` 1/0 + `node --test tests/scripts/research/test-phase.mjs` 20/0, both exit 0 |
| 5 | Merge/worktree guard (D-018) | DONE 2026-11-07T03:19:47.000Z, round 2 CLOSED 2026-11-07T03:24:48.000Z — `node --test tests/scripts/research/test-phase.mjs` 20/0 exit 0 |

## Task 1 notes (D-012, `scripts/research/phase.mjs` only)

- (a) `approvalMatches`/`retryAuthorizationMatches` now take `nowMs=Date.now()` + optional `anchorMs`; reject future-dated `at`/`approvedAt` and `at` < anchor. `openPhase` anchors to `ledger.createdAt`; `planRetry`/`beginDispatch` anchor to `reconciledAt ?? settledAt`.
- (b) Strict schema: approval top-level exactly 4 keys; dispatch retry approval exactly 2 keys; `validateHandoff`/`validateBrief`/phaseHistory/closeout reject unknown fields; `buildHandoff` input rejects unknown fields.
- (c) `beginDispatch` post-write revalidation: `validateLedger` + `locateDispatch` identity check after push, rollback + fail closed on mismatch.
- API preserved: new params optional with safe defaults; existing 20 tests unmodified and green.

## Task 2 notes (D-011, `scripts/research/phase.mjs` + `.opencode/plugins/sdlc-lean.js`)

- (a) `phase.mjs`: new exported `assertLedgerLoaded(ledgerLike)` — separable
  loaded-marker check (object + `LEDGER_SCHEMA` + phases array), fails closed
  `ledger-unreadable`; wired as the first call in `recordCheckpoint`,
  `resumePhase`, `beginDispatch`, `settleDispatch`, `reconcileDispatch`,
  `planRetry` (checkpoint/continuation/recovery only — `validateLedger`,
  handoff/brief validators, delegation, `summarizeDispatches`,
  `openPhase`/`evaluateLaunch`/`closePhase`/`buildHandoff` untouched).
- (b) plugin: new exported `checkPhaseLedgerGate(ledgerLike, context)` —
  pass-through (`null`) when no phase marker is present, `ledger-unreadable`
  throw when a marker (`phaseId`/`ledgerFile`/etc.) is present but no ledger
  is loaded. NOT wired into any hook: no clean phase-relevant seam exists —
  `tool.execute.before` (V1 + V2 `ctx.tool.hook`), session
  `prompt`/`context`/`compaction` hooks and `/approve` carry no phase-ledger
  context, so wiring there would break the pass-through constraint. Global
  safety/spec-gate behavior byte-identical; normal sessions unaffected.
- Task 1 strictness intact: future-`at`/`approvedAt`, stale-retry, extra-field
  and revalidation behavior re-probed green (see below).

## Task 3 notes (D-015/D-019, `.opencode/plugins/sdlc-lean.js` + agent frontmatter)

- plugin: new exported `checkAgentPathScope(agentId, tool, target)` —
  test-writer-only `tests/**` boundary (string/array/args-object targets,
  patch-body aware via `pathsFromPatch`, absolute `/…/tests/…` tolerated);
  all other agents → `null` pass-through, non-file tools → `true`.
- plugin: new exported `checkReviewerBash(agentId, command)` — code-reviewer
  allowlist ONLY `node --test …` + `git diff|status|log …`; chaining
  and everything else throws; all other agents → `null`, empty → throws.
- Wiring honesty: NEITHER helper is called from any global hook — V1
  `tool.execute.before` and V2 `ctx.tool.hook('execute.before')` carry no
  observable agent identity, so wiring there would guess identity or
  fail-closed globally. Same analyzed-but-deferred seam convention as Task 2.
  Global safety/spec-gate behavior byte-identical; future agent-aware hook
  MUST pass the acting agent id. No path-glob logic in any V1-consumed path.
- frontmatter (comments only, semantics preserved): `test-writer.md` keeps
  V2 `permissions` triple exactly (no V1 `permission:`, no `temperature`) +
  2 parity comment lines; `code-reviewer.md` keeps V1 `permission: edit/bash:
  deny` verbatim + 3 comment lines pointing at `checkReviewerBash`.
- Task 1–2 intact: strictness + ledger-gate + pass-through re-probed green.

## Task 3 follow-up pinning (D-015/D-019 guards; `node -e` probes, all observed GREEN)

- RED `typeof plugin.checkAgentPathScope` was `undefined` (no test-only boundary seam)
- RED `typeof plugin.checkReviewerBash` was `undefined` (no reviewer allowlist seam)
- GREEN `checkAgentPathScope('test-writer','edit','src/app.js')` throws `outside tests/**`; `tests/opencode/test-x.mjs` → `true`; absolute `/repo/src/a.js` throws, `/repo/tests/a.mjs` → `true`
- GREEN `checkAgentPathScope('test-writer','patch',{patchText:'*** Update File: src/a.js'})` throws; `tests/a.mjs` body → `true`; non-file `bash` → `true`
- GREEN `checkAgentPathScope('implementer','edit','src/app.js')` → `null`; `undefined` agent → `null` (all other agents unaffected)
- GREEN `checkReviewerBash('code-reviewer','node --test tests/opencode/test-agent-permissions.mjs')` → `true`; `git status`/`git diff --stat`/`git log --oneline -5` → `true`
- GREEN `checkReviewerBash('code-reviewer','rm -rf /tmp/x')` throws; `node scripts/research/phase.mjs` throws; `node --test … && rm` / pipe / redirect / empty all throw
- GREEN `checkReviewerBash('implementer','rm -rf /')` → `null` (non-reviewer unaffected)
- GREEN Tasks 1–2 still strict: future-`at` open rejects; `checkPhaseLedgerGate` passthrough `null` + marker-without-ledger `ledger-unreadable`; `checkSafety read/git status` unaffected; V1+V2 `execute.before` contain no `checkAgentPathScope|checkReviewerBash` (unwired seam)
- GREEN suites: `node --test tests/scripts/research/test-phase.mjs` 20/0 + `node --test tests/opencode/test-agent-permissions.mjs` 4/0, both exit 0

## Task 3 round 2 (reviewer REQUEST CHANGES fixed 2026-11-07T03:13:24.000Z, `.opencode/plugins/sdlc-lean.js` only)

- D1 (chain regex): `checkReviewerBash` separator class extended to
  `/[;|`$<>&\n\r]/` — `node --test tests/x.mjs\nrm -rf /tmp/x` and bare-`&`
  `node --test tests/x.mjs&rm -rf /` now throw; legit
  `node --test --test-name-pattern=…` / `git diff <commit>` still `true`,
  `node --flag --test` still denied. CLOSED.
- D2 (unparseable patch): `checkAgentPathScope` tracks `bodyPresent` /
  `sawEmptyList` — patch body yielding zero paths, `[]`, `{filePath: []}`
  now throw fail-closed; `true` only for non-file tools / no-body
  targetless (`undefined`/`null`/`{}`) reads. `patch` + `tests/a.mjs` body
  still `true`. CLOSED.
- D3 (`..` escape): `isTestsPath` lexically resolves (posix-style, leading
  `..` preserved) and rejects normalized starting with `..` or containing
  `/../` — `tests/../src/app.js`, `../tests/a.mjs` now throw; `./` trimming
  and absolute `/…/tests/…` tolerance kept. CLOSED.
- Reviewer question (absolute `isTestsPath` over-permissive without root
  anchoring): recorded as follow-up note only, NOT changed (spec tolerates
  absolute `/tests/` paths).
- RED pre-fix all 3 returned `true`; GREEN post-fix all throw; regression
  probes hold. Suites: `node --test tests/scripts/research/test-phase.mjs`
  20/0 + `node --test tests/opencode/test-agent-permissions.mjs` 4/0, both
  exit 0.

## Follow-up test-pinning (verbatim `node -e` probes; pin as committed tests in tests-only follow-up)

- RED (a1) future approval ACCEPTED (gap confirmed)
- RED (a2) stale approval planRetry.allowed=true (gap if true)
- RED (a3) future approvedAt ACCEPTED (gap confirmed)
- RED (b1) approval extra field ACCEPTED (gap confirmed)
- RED (b2) handoff extra ACCEPTED (gap confirmed)
- RED (b3) brief extra ACCEPTED (gap confirmed)
- RED (c) beginDispatch validateLedger count in body=1 (gap if 1, fixed if >=2)
- GREEN (a1) future approval REJECTED: approval-required
- GREEN (a2) stale approval allowed=false reason=recovery-not-authorized (pass if false/recovery-not-authorized)
- GREEN (a3) future approvedAt REJECTED: recovery-not-authorized
- GREEN (b1) approval extra REJECTED: approval-required
- GREEN valid openPhase still PASSES
- GREEN (b2) handoff extra REJECTED: invalid-handoff
- GREEN (b3) brief extra REJECTED: invalid-handoff
- GREEN (c) beginDispatch validateLedger count=4 (pass if >=2)
- GREEN (c) happy dispatch still works

## Task 2 follow-up pinning (D-011 gate; `node -e` probes, all observed GREEN)

- RED `typeof phase.assertLedgerLoaded` was `undefined` (separable guard missing)
- RED `recordCheckpoint(null)` threw `invalid-ledger` (wrong gate reason, not `ledger-unreadable`)
- RED `typeof plugin.checkPhaseLedgerGate` was `undefined` (no narrow plugin seam)
- GREEN `assertLedgerLoaded` is `function`; unloaded `recordCheckpoint`/`resumePhase`/`beginDispatch`/`planRetry`/`settleDispatch`/`reconcileDispatch` all throw `ledger-unreadable`
- GREEN loaded `recordCheckpoint`/`resumePhase`/`beginDispatch`/`settleDispatch` happy paths pass
- GREEN Task 1 still strict: future-`at` open rejects `approval-required`; future-`approvedAt` retry `allowed=false`/`recovery-not-authorized`; stale approval `allowed=false`; approval/handoff extra-field rejects; pure `validateLedger({})` still `invalid-ledger`; delegation still `delegation-expanded`
- GREEN plugin pass-through: `checkPhaseLedgerGate(ledger, undefined)` → `null`; `checkPhaseLedgerGate(null, {})` → `null`; marker-present + no ledger throws `ledger-unreadable`; marker + loaded ledger → `true`
- GREEN pass-through proof: normal `read`/`bash echo hi` via `checkSafety` unaffected; global hooks unwired (no `checkPhaseLedgerGate` call in `tool.execute.before`/session-hook/command paths)

## Task 4 notes (D-026/D-033, `.opencode/plugins/sdlc-lean.js` only)

- Caller: new exported `recordUxStatus(result, sessionID)` — the ONE
  `uxStatus(` call site (line ~277). Pass = exact `pass`
  (`'pass'` string or `{result:'pass',tier,confidence}` with non-empty
  strings); non-pass/invalid → `getStatus()` passthrough, throws → `null`.
  NOT wired into any global hook — no hook observes named-check-green
  (`execute.after` sees every tool exit, wrong granularity; session hooks
  carry no check result; `/approve` is a human gate). Same
  analyzed-but-deferred seam convention as Tasks 2–3; future check-aware
  hook MUST call it once. Global behavior byte-identical.
- Sink (DEVIATION BY DESIGN): plan Expected `docs/audit-ledger.md` rows are
  NOT written — that ledger is outside this plan's gate scope (edits block).
  Tier/confidence land in the status file via the existing `uxStatus` path;
  task evidence lands here in the progress ledger. Audit-ledger wiring is
  deferred to a follow-up whose gate includes the ledger.
- Tool surface verdict: NO host tool-definition capability exists (observed
  surfaces: `ctx.skill.transform`, `ctx.session.hook`, `ctx.tool.hook`,
  `ctx.command.transform` only — no register/define path), so NO model tool
  is registered (faking one refused). New exported `getSdlcStatus(root)` is
  the pure read-only query a future tool would wrap: `{skills, status,
  gate}` (`gate` = `{plan, spec, files}` count or `null`), no writes, no
  spawns, fail-open `null` gate / `null` return.
- No write surface: new block contains no `writeFileSync`/`spawnSync`/
  hook or command registration (one comment line mentions the words only);
  the single `uxStatus` call reuses the pre-existing status-file path.
- Probes (`node -e`, all observed GREEN): RED `grep -c "uxStatus("` = 0,
  `recordUxStatus`/`getSdlcStatus` `undefined`; GREEN exactly 1 `uxStatus(`
  call site, both exports `function`, `recordUxStatus({result:'fail',…})`
  + `recordUxStatus(null)` no-throw passthrough,
  `recordUxStatus({result:'pass',tier:'Assist',confidence:'high'})` →
  status `ux {"tier":"Assist","confidence":"high"}`,
  `getSdlcStatus('/nonexistent-root')` → `{skills,status,gate:null}`;
  Tasks 1–3 intact (future-`at` rejects, gate passthrough `null` +
  marker throws, test-writer scope + reviewer bash throws).
- Suites: `node --test tests/opencode/test-ux-hooks.mjs` 1/0 +
  `node --test tests/scripts/research/test-phase.mjs` 20/0, both exit 0.

## Task 5 notes (D-018, `.opencode/plugins/sdlc-lean.js` + 2 skills)

- plugin: new exported `checkMergeGuard(command)` — string or `{command}`; `COLAB_CMD`-anchored `git\s+merge(?![\w-])` (global); `sudo|env|command` + `/bin|/usr/bin` prefix covered, so `sudo git merge` refuses the same way; `merge-base` excluded via `(?![\w-])`, `git log --merges` never matches (`git\s+log` verb); quoted prose (`echo "git merge"`) passes (not at command position). Abort exception: same `;`/`\n` segment containing `--abort`/`--quit` (`(?:^|\s)--(?:abort|quit)(?![\w-])`) passes; any other merge segment throws ALWAYS-human message. Wired into `checkSafety` bash/shell variants loop (raw + env-stripped + `sh -c` inners), so V1 `tool.execute.before` + V2 `ctx.tool.hook('execute.before')` both refuse.
- `git worktree add` intentionally PASSES (no refusal; suite parallel workflow depends on it) — pass-by-design, documented in skill.
- skills (prose only, no behavior change beyond pointers): finishing adds one-line hook pointer, keeps human-merge rule; worktrees adds one-line hook pointer + per-worktree baseline schema (baseline SHA + test command in the stream's progress ledger + per-worktree `.sdlc/spec-gate.json` marker).
- HONESTY residual: baseline RECORDING stays artifact-level (agent-written; a hook cannot write files) — same analyzed-but-deferred seam convention as Tasks 2–4; no recording hook faked.
- Suites: `node --test tests/scripts/research/test-phase.mjs` 20/0 exit 0.

## Task 5 follow-up pinning (D-018 guard; `node -e` probes, all observed GREEN)

- RED `typeof checkMergeGuard` was `undefined`; `checkSafety('bash',{command:'git merge main'})` passed (gap confirmed)
- GREEN `checkMergeGuard('git merge main'|'git merge feature-x'|'sudo git merge main')` throws ALWAYS-human; chained `git status; git merge main` via `checkSafety` throws; `sh -c 'git merge main'` throws
- GREEN `checkMergeGuard('git merge --abort'|'git merge --quit')` → `true`; `git merge-base …` → `true`; `git log --merges --oneline` → `true`; `git worktree add …` (+ `checkSafety`) → `true`; `git worktree list`/`git status` pass; `echo "git merge main"` → `true`
- GREEN Tasks 1–4 intact: future-`at` rejects; `checkPhaseLedgerGate` passthrough `null` + marker throws `ledger-unreadable`; test-writer scope throws; reviewer `node --test` → `true` + `rm` throws; `recordUxStatus` passthrough + `getSdlcStatus` shape; normal `read` unaffected
- GREEN suite: `node --test tests/scripts/research/test-phase.mjs` 20/0 exit 0

## Next

Awaiting human approval of `docs/plans/2026-11-07-phase-c-perms.md`. No
implementation until approved.

## Evidence-string fix (2026-11-07T03:18:19.000Z, close `verify-mismatch`)

- Rows 3–4 `verify` corrected to the EXACT T3/T4 Verify cell string:
  `` `node --test tests/scripts/research/test-phase.mjs` + plugin suite ``
  (old row 3: `node --test tests/scripts/research/test-phase.mjs`;
  old row 4: `node --test tests/opencode/test-ux-hooks.mjs`).
- "plugin suite" expansion honestly earned via conjunction exit 0:
  `node --test tests/scripts/research/test-phase.mjs && node --test tests/opencode/test-plugin-loading.mjs tests/opencode/test-spec-gate.mjs tests/opencode/test-agent-permissions.mjs tests/opencode/test-ux-hooks.mjs`
  → phase 20/0 + plugin-surface 40/0, conjunction exit 0.
- Row 5 (T5 skeleton, exit null) untouched; top-level `plan_sha256` untouched.

## Skill-cap collision fix (2026-11-07T03:21:22.000Z, close T5 `verify-mismatch`)

- T5 skill edit had pushed `using-git-worktrees/SKILL.md` to 32 lines;
  `tests/opencode/test-execution-skills.mjs:177` enforces the 30-line cap →
  `npm run verify` exit 1. Test is grader-immutable (never weakened).
- Trim (prose only, lean ladder): hook pointer compressed to one line
  (keeps `checkMergeGuard` + passes-by-design + artifact-level + deferred
  residual); baseline-record sentence drops the trailing process-miss clause
  (schema intact: baseline SHA + test command + per-worktree
  `.sdlc/spec-gate.json` marker); blank line before the Setup list removed.
  All 7 required strings present, forbidden pattern clear, `finishing-a-development-branch`
  checked 14/20 (under cap, untouched, uneditable per brief).
- Conjunction `node --test tests/scripts/research/test-phase.mjs && npm run verify`
  → phase 20/0 + full 538/0, exit 0 (execution-skills cap/strings/forbidden all green).
- Evidence row 5 `verify` set to the EXACT T5 cell string
  (`` `node --test tests/scripts/research/test-phase.mjs` + full `npm run verify` ``);
  rows 1–4 + top hash untouched.

## Task 5 round 2 (reviewer REQUEST CHANGES fixed 2026-11-07T03:24:48.000Z, `.opencode/plugins/sdlc-lean.js` only)

- F1 (High, git globals): `MERGE_CMD_RE` now
  `git\s+(?:(?:-c\s+\S+\s+|-[A-Za-z]+(?:\s+\S+)?\s+|--\S+\s+)*)merge(?![\w-])`.
  DEVIATION (minimal, intent-faithful): brief's literal `-[A-Za-z]+\s+` misses
  `git -C /tmp merge main` (verified no-match — short-flag value arg left
  unconsumed), so the short-flag alt consumes one optional value
  (`(?:\s+\S+)?`). `git -c user.name=x` / `--git-dir=/tmp/x` / `--no-pager`
  all throw; `git stash merge`, `merge-base`, `git -C /tmp status` still pass.
  CLOSED.
- F2 (High, abort scope): post-merge segment now cut at the nearest of
  `[;&|\n]` (was `;`/`\n` only) — `git merge main && echo --abort`
  (`||`, `|` likewise) throws; `git merge --abort` (+ `; echo done`) passes.
  CLOSED.
- F3 (Medium, launch prefix): merge-guard loop now also tests
  `stripLaunchPrefix(normalizeRmCommand(v))` (existing secret-guard helper
  reused, same shape as the COLAB bridge combo) — `exec`/`nohup`/`setsid`/
  `timeout 10` + `sh -c 'exec …'` all throw; `exec echo hi`,
  `timeout 5 pgrep colab` still pass. CLOSED.
- F4 (Medium, inner shells): `innerShellCommands` now
  `/(?<![\w-])(?:sh|bash|dash|zsh|fish)\s+(?:-\S+\s+)*-c\s+(["'])(.*?)\1/gi`
  (brief shape + kept lookbehind) — `zsh`/`fish -c`, `sh --noprofile -c`,
  `bash -x -c` inners throw. Shared-helper regression: safety-guards +
  colab-lifecycle suites green; `colab-mcp-helper` benign + inner `echo hi`
  pass. CLOSED.
- F5 (mechanical): evidence top-level `plan_sha256` set to the gate hash
  `e8aef2a2…ec411` (`sha256sum` of the plan file matches gate — verified
  before writing); rows 1–5 untouched except row 5 `at` →
  2026-11-07T03:24:48.000Z (same verify string, exit 0).
- RED pre-fix all 13 bypass probes passed (gap open); GREEN post-fix all
  throw; benign matrix holds. Suites: `node --test
  tests/scripts/research/test-phase.mjs` 20/0 exit 0 (safety-guards +
  colab-lifecycle 23/0 exit 0 as inner-helper regression).
- Skill untouched: `using-git-worktrees/SKILL.md` still 30 lines (cap holds).
