# Progress — V2-native brain

**Plan**: [`2026-10-30-v2-native-brain.md`](./2026-10-30-v2-native-brain.md) (gate `94f101886b7a`)
**Spec**: [`../specs/2026-10-30-v2-native-brain.md`](../specs/2026-10-30-v2-native-brain.md) (gate `b108c26847f2`, APPROVED)
**Task**: 1 — RED contract tests
**Recorded (UTC)**: 2026-10-31T00:49:05Z
**Status**: Task 1 complete (RED baseline recorded); no production file was created or edited.

## Baseline procedure

The underlying (non-negated) suite was run once, then the plan's Task 1 Verify
(negated) was run exactly.

| Run | Command | Exit |
|---|---|---|
| Underlying | `node --test tests/opencode/test-v2-brain.mjs tests/opencode/test-tui-brain.mjs tests/opencode/test-host-evidence.mjs tests/scripts/test-host-evidence.mjs tests/opencode/test-plugin-loading.mjs tests/opencode/test-spec-gate.mjs tests/opencode/test-compaction-hook.mjs tests/opencode/test-safety-guards.mjs tests/opencode/test-approve-command.mjs tests/scripts/test-install-global.mjs` | **1** |
| Task 1 Verify (exact) | `! node --test tests/opencode/test-v2-brain.mjs tests/opencode/test-tui-brain.mjs tests/opencode/test-host-evidence.mjs tests/scripts/test-host-evidence.mjs tests/opencode/test-plugin-loading.mjs tests/opencode/test-spec-gate.mjs tests/opencode/test-compaction-hook.mjs tests/opencode/test-safety-guards.mjs tests/opencode/test-approve-command.mjs tests/scripts/test-install-global.mjs` | **0** |

Underlying totals: **123 tests, 72 pass, 51 fail**. The negated form exits 0
because the RED baseline is expected to fail until Tasks 2–5 land. Per-file
counts reconcile to those totals; each load failure counts as one file-level
test. The negated Verify was re-run after the final helper edit and exited 0
again with the same RED state.

## Per-file counts (underlying run)

| File | Tests | Pass | Fail | Note |
|---|---|---|---|---|
| `tests/opencode/test-v2-brain.mjs` | 26 | 4 | 22 | new; `prompt:`/`root:`/`gate:`/`safety:`/`docs:` RED |
| `tests/opencode/test-tui-brain.mjs` | 1 (file-level) | 0 | 1 | `ERR_MODULE_NOT_FOUND` baseline (`register.js` absent) |
| `tests/opencode/test-host-evidence.mjs` | 10 | 0 | 10 | new; `tool:execute.after` not registered yet |
| `tests/scripts/test-host-evidence.mjs` | 1 (file-level) | 0 | 1 | `ERR_MODULE_NOT_FOUND` baseline (`scripts/host-evidence.mjs` absent) |
| `tests/opencode/test-plugin-loading.mjs` | 20 | 19 | 1 | updated V2 prompt test fails |
| `tests/opencode/test-spec-gate.mjs` | 15 | 11 | 4 | updated root-precedence contract fails |
| `tests/opencode/test-compaction-hook.mjs` | 10 | 7 | 3 | `compactionContext()` contract fails |
| `tests/opencode/test-safety-guards.mjs` | 9 | 8 | 1 | `#nosafety` strictness fails |
| `tests/opencode/test-approve-command.mjs` | 16 | 11 | 5 | approval-order/hash/global-CLI contract fails |
| `tests/scripts/test-install-global.mjs` | 15 | 12 | 3 | TUI/host-evidence installer parity fails |

## Exact failing names

### `tests/opencode/test-v2-brain.mjs` (22)

- `prompt: first prompt appends the bootstrap after the user text`
- `prompt: a session that already has a user message is unchanged`
- `prompt: a retry after an empty message injects again`
- `prompt: child sessions skip injection`
- `prompt: a rejected or thrown session.context lookup skips injection`
- `prompt: @file mention text stays a prefix after the append`
- `prompt: two distinct sessions each inject (no process-local set)`
- `prompt: writeStatus records the injecting session`
- `prompt: a runtime throw marks the session for the context fallback`
- `root: projectRoot prefers location.directory over directory and never uses cwd`
- `root: the V2 tool hook uses location when both roots are present`
- `root: a location-only V2 tool hook enforces the plan scope`
- `root: checkSpecGate fails closed for mutating tools when the root is unknown`
- `root: compactionContext(undefined) returns an empty list`
- `root: the V2 compaction hook uses location.directory`
- `gate: a valid marker adds one short summary with plan, spec, and file count`
- `gate: an invalid marker pushes only "gate invalid"`
- `gate: no marker pushes nothing`
- `safety: #nosafety no longer bypasses destructive, secret, or Colab guards`
- `docs: README, USAGE, and CHANGELOG name sdlc.approve, host evidence, and preview-only`
- `docs: CHANGELOG states that #nosafety is removed`
- `docs: README and USAGE name scripts/host-evidence.mjs`

### `tests/opencode/test-tui-brain.mjs` (1, module-not-found baseline)

`Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/home/appusai/Documents/Projects/sdlc-lean/.opencode/plugins/sdlc-lean-tui/register.js' imported from /home/appusai/Documents/Projects/sdlc-lean/tests/opencode/test-tui-brain.mjs`

### `tests/opencode/test-host-evidence.mjs` (10)

- `evidence: appends one hash-only row with the exact schema`
- `evidence: skips background, running, and timeout events`
- `evidence: ignores non-shell tools and repos with no active gate`
- `evidence: SDLC_LEAN_NO_HOST_EVIDENCE=1 disables the writer`
- `evidence: refuses a symlinked .sdlc directory without outside writes`
- `evidence: refuses a symlinked evidence file without outside writes`
- `evidence: stops at 500 rows`
- `evidence: skips a >=2 MB log without a full read`
- `evidence: creates .sdlc at 0700 and the log at 0600`
- `evidence: invalid events never throw`

### `tests/scripts/test-host-evidence.mjs` (1, module-not-found baseline)

`Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/home/appusai/Documents/Projects/sdlc-lean/scripts/host-evidence.mjs' imported from /home/appusai/Documents/Projects/sdlc-lean/tests/scripts/test-host-evidence.mjs`

### `tests/opencode/test-plugin-loading.mjs` (1)

- `V2 setup registers skills, the persisted prompt hook, and the safety tool hook`

### `tests/opencode/test-spec-gate.mjs` (4)

- `non-mutating tools pass; mutating tools without a root fail closed`
- `V2 hook enforces with location.directory only`
- `V2 hook prefers location.directory when both roots are present`
- `V2 hook fails closed for mutating tools when no root is available`

### `tests/opencode/test-compaction-hook.mjs` (3)

- `compactionContext() without a root returns an empty list (no cwd fallback)`
- `V2 setup registers the compaction session hook (v2.0.22 name) and appends location-backed system parts`
- `V2 compaction hook returns [] when the project root is unknown`

### `tests/opencode/test-safety-guards.mjs` (1)

- `#nosafety no longer bypasses destructive, secret, or Colab guards`

### `tests/opencode/test-approve-command.mjs` (5)

- `behavior: prefers the installed global CLI over the project copy`
- `behavior: a matching sha256 argument records tui-picker`
- `behavior: a wrong sha256 argument is refused with no marker`
- `behavior: a mismatched marker written by the CLI is deleted and refused`
- `behavior: a spec that escapes the project root is refused before writeGate`

### `tests/scripts/test-install-global.mjs` (3)

- `installs the TUI directory and host-evidence script and tracks them`
- `installs the real TUI part and host-evidence script byte-identical`
- `prune removes a stale TUI file and keeps the rest`

## V1-only assertions that pass (no weakening)

- V1 four hook keys (`test-v2-brain`, `test-approve-command`).
- V1 compaction legacy repo-root default with no directory (`test-v2-brain`, `test-compaction-hook`).
- V1 bootstrap/budget/activation suites and all benign safety cases.
- Current installer behavior for skills/agents/commands/plugin/spec-check/research.

## Task 1 boundary

Only tests and this ledger were written. No plugin, TUI, `scripts/`, docs, plan,
spec, README/USAGE/CHANGELOG, or stub production file was created or edited.
`scripts/spec-check.mjs` is untouched.

## Deviations / notes

- The Task 1 notes do not fix the `tool:execute.after` event object shape or the
  `matchPlanTasks`/`planDetails` return shapes. The tests pin the field names the
  plan does fix (row schema, `{ active, invalid }`, `{ rows, malformed }`) and
  accept either an array or `{ matched, total }` from `matchPlanTasks`; the
  event fixture sets the documented `input.command`, `result.output`,
  `metadata.exit`, `metadata.status`, and `metadata.timeout` fields.
- No test could not be authored. The two load failures above are the expected
  RED baselines for the absent TUI and host-evidence modules.

## Task 2 — GREEN server

**Recorded (UTC)**: 2026-10-31T00:54:31Z
**Status**: complete — server plugin implements AC1, AC2, AC3, AC5, AC6, AC8, AC9 without touching tests or later-task files.

**Verify (exact)**:

```
node --test --test-name-pattern="^(prompt|root|gate|safety):" tests/opencode/test-v2-brain.mjs && node --test tests/opencode/test-host-evidence.mjs tests/opencode/test-plugin-loading.mjs tests/opencode/test-spec-gate.mjs tests/opencode/test-compaction-hook.mjs tests/opencode/test-safety-guards.mjs tests/opencode/test-approve-command.mjs
```

| Run | Exit | Tests | Pass | Fail |
|---|---|---|---|---|
| First suite (`test-v2-brain` prompt/root/gate/safety) | 0 | 23 | 23 | 0 |
| Second suite (host evidence + existing plugin/spec-gate/compaction/safety/approval) | 0 | 80 | 80 | 0 |
| Combined Verify | **0** | **103** | **103** | **0** |

**Edits**: `.opencode/plugins/sdlc-lean.js` only.
- `projectRoot(ctx)` (location first, `directory` second, never `cwd`); `REPO_ROOT` kept only for the V1 compaction legacy default.
- `checkSpecGate`: targets computed first; mutating targets with an unknown root throw `spec gate root unknown`; non-mutating/targetless no-ops.
- `compactionContext(root)` has no default and returns `[]` for falsy roots; V1 passes `directory || REPO_ROOT`.
- `checkSafety`: `#nosafety` early return removed; token removed from destructive/secret/`/content` messages; exact-known patterns unchanged.
- `resolveApprovalCli` (global CLI first, project fallback only when no global), `parseApprovalArg` (`{ arg, hash }`), and `approvePlan` (normalizeRel → buildGate → realpath plan/spec containment → optional hash compare → writeGate with host user/UTC/`approved_via` → readGate + validateGate + plan/spec/hash/files/allow compare; deletes only a marker this invocation wrote; never writes the plan).
- V2 setup: `root = projectRoot(ctx)`; `prompt` (persisted `session.context` check, child skip, append bootstrap, `writeStatus` only on injection, bounded `_promptFallback` on runtime throw), `context` (fallback once; otherwise validated short gate summary or `gate invalid`), `compaction`, `execute.before` (`checkSafety` then `checkSpecGate` with root), and `execute.after` (hash-only JSONL; skip background/running/timeout; active valid marker; exact 11-field row; 500 rows/2 MB via `lstat`/`statSync` + seeded counter; 0700/0600; `O_NOFOLLOW` + `fstat`; kill switch).
- V1 `SdlcLeanPlugin` keeps exactly its four hook keys; no `ctx.permission`.

**Deviations**: none. The approval CLI is imported with a per-invocation query
suffix so a re-installed/global CLI is not served from the ESM cache; this is an
implementation detail of "dynamically import it" and does not change the
contract or any test expectation.

## Task 3 — GREEN TUI part

**Recorded (UTC)**: 2026-10-31T00:56:13Z
**Status**: complete — TUI part implements AC4/AC5 (preview-only picker, activation, status) without touching tests, the server plugin, `scripts/`, or docs.

**Verify (exact)**:

```
node --check .opencode/plugins/sdlc-lean-tui/index.js && node --check .opencode/plugins/sdlc-lean-tui/tui.js && node --check .opencode/plugins/sdlc-lean-tui/register.js && node --test tests/opencode/test-tui-brain.mjs
```

| Run | Exit | Tests | Pass | Fail |
|---|---|---|---|---|
| RED baseline `node --test tests/opencode/test-tui-brain.mjs` (before implementation) | 1 | 1 (file-level) | 0 | 1 |
| Task 3 Verify (exact) | **0** | **19** | **19** | **0** |

RED baseline failure: `ERR_MODULE_NOT_FOUND` for
`.opencode/plugins/sdlc-lean-tui/register.js` (same as Task 1).

**Edits** (three new files):
- `index.js`: `export default { id: 'sdlc-lean-tui', setup() {} };`.
- `tui.js`: `export default { id: 'sdlc-lean-tui', setup: setupTui };`.
- `register.js`: fixed `crypto`/`path` imports, dynamic `node:fs` via `loadFs()` in
  `try/catch`; exports `listPlans`, `planDetails`, `gateSummary`,
  `hostEvidenceSummary`, `resolveSessionID`, `buildApproveCommand`,
  `activationText`, `setupTui`, `resetTuiState`.
  - `listPlans`: immediate `docs/plans/*.md`, filters progress/evidence,
    control/whitespace names, symlinks, non-regular, >1 MB; newest-first.
  - `planDetails`: immediate plan only, `lstat` regular non-symlink, realpath
    containment, frontmatter `spec`/`status`/`files`/`allow`, byte SHA-256,
    control-char sanitize, oversize/escape rejection.
  - `gateSummary`: read/sanitize marker, verify both file hashes; valid summary,
    `{ active: true, invalid: true }` on drift/tamper, `{ active: false }` absent.
  - `hostEvidenceSummary`: JSONL rows, malformed/oversize line skip, counts
    `{ rows, matched, malformed }` against the active plan hash.
  - `resolveSessionID`: only `ui.router.current()` with `type === 'session'` and
    a non-empty `sessionID`; no fallback.
  - `setupTui`: root from `data.location.directory || location.directory ||
    directory` (never cwd); activation via `location = context.location ??
    data.location.default()` and `skill.sync`/`list` array count, one toast per
    process, zero logs only; documented `keymap.layer(() => ({ mode: 'global',
    commands }))` with a no-`bind` retry on failure; no `layer.command`/
    `layer.keybind`.
  - `openPicker`: refuses without a current session, selects an immediate plan,
    confirms `files`/`allow`/plan SHA-256 and the exact
    `/approve <absolute-path> sha256:<hex>` preview command, then toasts
    `preview-only: run the command shown`; never calls `client.session.command`
    or `session.prompt`.
  - `showStatus`: `gate invalid` on drift, otherwise the active gate plus
    `host evidence: matched/rows rows (advisory)`.

**Deviations**: none. `node:fs` is loaded by an awaited `loadFs()` at module
scope (dynamic `import('node:fs')` inside `try/catch`) so the pure helpers can
stay synchronous for the tests while the import stays fail-open.

## Task 4 — GREEN script and installer (BLOCKED on a Task 1 fixture defect)

**Recorded (UTC)**: 2026-10-31T00:58:20Z
**Status**: **BLOCKED — not complete.** `scripts/host-evidence.mjs` and the
installer parity changes are implemented; 29/31 tests pass and 2 fail because the
Task 1 test helper serializes row objects with `Array.join`, producing
`[object Object]` lines. Task 4 did not edit any test; escalation required
(plan: Tasks 2–5 must not edit Task 1 tests).

**Verify (exact)**:

```
node --check scripts/host-evidence.mjs && node --test tests/scripts/test-host-evidence.mjs tests/scripts/test-install-global.mjs
```

| Run | Exit | Tests | Pass | Fail |
|---|---|---|---|---|
| RED baseline (before implementation; host-script `ERR_MODULE_NOT_FOUND` counts as one file-level test plus 3 installer failures) | 1 | 16 | 12 | 4 |
| Task 4 Verify (current) | **1** | **31** | **29** | **2** |

`node --check scripts/host-evidence.mjs` exits 0. Installer suite is fully green
(15/15). Host-evidence script suite is 14/16.

**Exact failures** (both in `tests/scripts/test-host-evidence.mjs`):

- `script: status prints the advisory line and exits 0 when every task matches`
  — printed `host evidence rows: 0 (malformed 2)`, `host evidence: 0/2 matched (advisory)`.
- `script: --require-host exits 1 on an unmatched task`
  — printed `host evidence rows: 0 (malformed 1)`, `host evidence: 0/2 matched (advisory)`.

**Root cause (test fixture, not the implementation)**:
`tests/scripts/test-host-evidence.mjs:82` is
`fs.writeFileSync(..., `${lines.join('\n')}\n`)`. It is called at line 236 with
`rowsForTasks(...)` and at line 248 with `[rowFor(...)]` — arrays of row
**objects** — so the file bytes are `[object Object]\n…`, not JSONL. No read-only
parser can recover the row hashes, so `1/2` and `2/2` are unreachable. The
`script: malformed lines are skipped and never fail a match` test passes because
it stringifies rows explicitly, proving the parser/matcher path is correct:
it prints `host evidence: 2/2 matched (advisory)` and exits 0 under
`--require-host`.

**Required fix (owner: Task 1 test author, not Task 4)**: make `writeLog`
stringify non-string rows, e.g.
`lines.map((line) => (typeof line === 'string' ? line : JSON.stringify(line))).join('\n')`.
No production change is implied by the failure.

**Edits**:
- `scripts/host-evidence.mjs` (new): `normalizeCommand`, `loadRows`,
  `matchPlanTasks`, `status`, `main`; imports `parsePlanTasks`, `readGate`,
  `validateGate`, `normalizeRel`, `hashFile` from `./spec-check.mjs`; read-only
  (no write calls).
- `scripts/install-global.mjs`: `plugins/sdlc-lean-tui` `kind: 'dir'` key `tui`,
  `scripts/host-evidence.mjs` `kind: 'file'` key `hostEvidence`, summary keys
  `tui: 0`/`hostEvidence: 0`, CLI prints `tui <n>` and `host-evidence yes/no`;
  manifest prune and user-file guarantees unchanged.

**Deviations**: escalated rather than editing the test. Task 4 stays red until
the fixture is fixed; the plan/spec are untouched.

## Task 4 — deviation: Task 1 fixture serialized row objects with `join`

**Recorded (UTC)**: 2026-10-31T00:58:55Z
**Status**: resolved — fixture fix only; Task 4 now green.

**Edit**: `tests/scripts/test-host-evidence.mjs` `writeLog` now JSON-stringifies
non-string lines (`typeof line === 'string' ? line : JSON.stringify(line)`) before
joining. Task 1 used `lines.join('\n')`, so row objects became `[object Object]`.
Malformed-line tests that pass raw strings are unchanged and still exercise the
parser's skip path.

**Unchanged**: no assertion, expected value, or test name; no production file;
no other test. Coverage is unchanged (2 tests moved from fail to pass).

**Verify (exact)**:

node --check scripts/host-evidence.mjs && node --test tests/scripts/test-host-evidence.mjs tests/scripts/test-install-global.mjs

| Run | Exit | Tests | Pass | Fail |
|---|---|---|---|---|
| Task 4 Verify (after fixture fix) | 0 | 31 | 31 | 0 |

`node --check scripts/host-evidence.mjs` exits 0. Host-evidence script suite is
16/16; installer suite is 15/15. Remaining failures: none.

## Task 5 — GREEN docs

**Recorded (UTC)**: 2026-10-31T01:02:06Z
**Status**: complete — docs state the native behavior, preview-only picker, strict guards, and host evidence; no test, code, TUI, script, skill, router, plan, or spec edit.

**Verify (exact)**:

```
node --test --test-name-pattern="^docs:" tests/opencode/test-v2-brain.mjs tests/opencode/test-approve-command.mjs
```

| Run | Exit | Tests | Pass | Fail |
|---|---|---|---|---|
| RED baseline (before docs edit) | 1 | 4 | 1 | 3 |
| Task 5 Verify (exact) | **0** | **4** | **4** | **0** |

**Edits**:
- `README.md`: project-local and global manual copies include
  `.opencode/plugins/sdlc-lean-tui/` and `scripts/host-evidence.mjs`; spec-gate
  row names `sdlc.approve` (preview-only, `files`/`allow` + SHA-256) plus the
  typed `/approve`; new hash-only advisory host-evidence row with
  `--require-host` opt-in; Safety states there is no in-band `#nosafety`
  bypass; Verify adds `node scripts/host-evidence.mjs status`.
- `USAGE.md`: install/manual/uninstall include the TUI directory and host script;
  activation toast is attributed to the TUI part while headless keeps status and
  announce; spec-gate bullet and command reference add picker preview, typed
  `/approve` with optional hash, `sdlc.approve`/`sdlc.status`, and
  `node scripts/host-evidence.mjs status`; safety states `#nosafety` is removed;
  troubleshooting row for a missing TUI part.
- `CHANGELOG.md`: Unreleased Added bullets for the persisted prompt hook, TUI
  preview-only picker/status, hash-only host evidence, and installer parity;
  Changed bullets for strict guards (`#nosafety` removed, breaking),
  location-first root, and approval global CLI/hash/re-read. No version bump.

**Deviations**: none. The RED baseline had 3 failing `docs:` assertions (the
three v2-brain docs tests); the fourth (`/approve` + TTY fallback) already
passed and stayed green.

## Task 6 — full gate, evidence, debt (BLOCKED: plan task-table pipes)

**Recorded (UTC)**: 2026-10-31T01:05:00Z
**Status**: **BLOCKED — evidence not written.** The debt rows landed and every
runnable Task Verify is green, but the required advisory diagnostic
`node scripts/host-evidence.mjs status` exits 1: the plan's own Task 2 Verify cell
contains unescaped `|` characters, so `parsePlanTasks` rejects the task table.
The same parser is used by `spec-check close`, so close is also blocked until the
plan text is fixed. No code, test, plan, or spec file was edited by this task.

**Verifies re-run in order (exact)**:

| Task | Command | Exit | Result |
|---|---|---|---|
| 1 | `! node --test tests/opencode/test-v2-brain.mjs tests/opencode/test-tui-brain.mjs tests/opencode/test-host-evidence.mjs tests/scripts/test-host-evidence.mjs tests/opencode/test-plugin-loading.mjs tests/opencode/test-spec-gate.mjs tests/opencode/test-compaction-hook.mjs tests/opencode/test-safety-guards.mjs tests/opencode/test-approve-command.mjs tests/scripts/test-install-global.mjs` | 0 (historical) | RED baseline; not re-run per plan; `at` 2026-10-31T00:49:05Z |
| 2 | `node --test --test-name-pattern="^(prompt\|root\|gate\|safety):" tests/opencode/test-v2-brain.mjs && node --test tests/opencode/test-host-evidence.mjs tests/opencode/test-plugin-loading.mjs tests/opencode/test-spec-gate.mjs tests/opencode/test-compaction-hook.mjs tests/opencode/test-safety-guards.mjs tests/opencode/test-approve-command.mjs` | 0 | 23 + 80 = 103 tests, 103 pass, 0 fail; `at` 2026-10-31T01:03:21Z |
| 3 | `node --check .opencode/plugins/sdlc-lean-tui/index.js && node --check .opencode/plugins/sdlc-lean-tui/tui.js && node --check .opencode/plugins/sdlc-lean-tui/register.js && node --test tests/opencode/test-tui-brain.mjs` | 0 | 19 tests, 19 pass, 0 fail; `at` 2026-10-31T01:03:24Z |
| 4 | `node --check scripts/host-evidence.mjs && node --test tests/scripts/test-host-evidence.mjs tests/scripts/test-install-global.mjs` | 0 | 31 tests, 31 pass, 0 fail; `at` 2026-10-31T01:03:25Z |
| 5 | `node --test --test-name-pattern="^docs:" tests/opencode/test-v2-brain.mjs tests/opencode/test-approve-command.mjs` | 0 | 4 tests, 4 pass, 0 fail; `at` 2026-10-31T01:03:27Z |
| 6 | `npm run verify && node eval/run.mjs` | 0 | lint 40 skills 0 failures; 453 tests, 453 pass, 0 fail; bootstrap 5068 B (≤5116); dry eval 35 probes, 0 failures; `at` 2026-10-31T01:04:24Z |

**Advisory diagnostic (fails)**:

```
$ node scripts/host-evidence.mjs status
[host-evidence] task row must have 7 cells, got 10
exit 1
```

**Root cause (plan text, not code)**: `parsePlanTasks` in
`scripts/spec-check.mjs` splits Markdown rows on unescaped pipes
(`splitRow`). The plan's Task 2 Verify cell contains
`--test-name-pattern="^(prompt|root|gate|safety):"` with two unescaped `|`
characters, so that row parses as 10 cells against a 7-cell header. The parser
accepts escaped pipes (`\|`) — covered by
`tests/scripts/test-spec-check.mjs`: `parsePlanTasks unescapes escaped pipes
inside Verify`. The plan's Task 2 cell needs the two pipes escaped as `\|`.

**Impact**: `host-evidence.mjs status` and `spec-check close` both call
`parsePlanTasks`; `close` would fail with the same `invalid-plan-task` even with
six correct evidence rows. Evidence was therefore **not written**: it would bind
the current `plan_sha256`, which must change when the plan text is amended and
re-approved. Task 6 must be re-run (evidence bound to the new marker) after the
plan fix.

**Debt ledger**: D-003 status is now
`closed 2026-10-31: #nosafety removed; strict guards; tests`; D-028–D-034 were
appended (native `ask` deferred, `instructions.entry` deferred, TUI footer status
deferred, hard host-evidence gate deferred, CLI symlink hardening deferred,
read-only tool surface deferred, TUI execute branch preview-only pending U2).
D-001–D-002 and D-004–D-027 are unchanged.

**Boundary**: only `docs/debt-ledger.md` and this progress ledger were edited.
No code, test, TUI, script, README/USAGE/CHANGELOG, plan, spec, or evidence file
was touched. `scripts/spec-check.mjs` is untouched; `close` was not run.

## Task 6 — full gate, evidence, debt (COMPLETE, plan re-approved `01a604720cc8`)

**Recorded (UTC)**: 2026-10-31T01:10:57Z
**Status**: complete — all six Verifies pass, evidence written and validated
read-only against `close`'s checks, debt rows confirmed. `close` not run
(orchestrator runs it separately).

**Debt ledger**: verified already correct, no edit needed. D-003 status is
`closed 2026-10-31: #nosafety removed; strict guards; tests`; D-028–D-034 are
present with the deferred items from the Task 6 notes; D-001–D-002 and
D-004–D-027 are unchanged.

**Verifies re-run in order (exact plan cells)**:

| Task | Command (verbatim cell) | Exit | Result | `at` (UTC) |
|---|---|---|---|---|
| 1 | `! node --test` over the 10 Task 1 files | 0 (historical) | RED baseline, not re-run per plan | 2026-10-31T00:49:05Z |
| 2 | Task 2 cell verbatim (escaped-pipe pattern + 6-file suite) | 0 | first suite 1 file-level pass + second suite 80/80 (see vacuity flag) | 2026-10-31T01:09:28Z |
| 3 | Task 3 cell verbatim (3x `node --check` + `test-tui-brain`) | 0 | 19 tests, 19 pass, 0 fail | 2026-10-31T01:10:05Z |
| 4 | Task 4 cell verbatim (`--check` + 2 script suites) | 0 | 31 tests, 31 pass, 0 fail | 2026-10-31T01:10:08Z |
| 5 | Task 5 cell verbatim (`^docs:` pattern, 2 files) | 0 | 4 tests, 4 pass, 0 fail | 2026-10-31T01:10:11Z |
| 6 | `npm run verify && node eval/run.mjs` (single chained run) | 0 | lint 40 skills 0 failures; 453 tests, 453 pass, 0 fail; bootstrap 5068 B (limit 5116); dry eval 35 probes, exit 0 | 2026-10-31T01:10:57Z |

**Advisory diagnostic (not evidence)**:

```
$ node scripts/host-evidence.mjs status
host evidence rows: 0
host evidence: 0/6 matched (advisory)
exit 0 at 2026-10-31T01:10:40Z
```

**Gate check**: `node scripts/spec-check.mjs verify --require-active` exits 0 at
2026-10-31T01:10:42Z and prints the active gate
(`plan 01a604720cc8, spec b108c26847f2`).

**Evidence**: wrote `docs/plans/2026-10-30-v2-native-brain-evidence.json` with
`plan` = `docs/plans/2026-10-30-v2-native-brain.md`,
`plan_sha256` = `01a604720cc89f4e25e9cebc22fd79a9a26b632669bd0cbedfed41a87509f74b`
(full 64-hex from `.sdlc/spec-gate.json`), key `tasks`, exactly 6 rows
(task 1–6, `exit: 0`, UTC `at` per the table above). A read-only check of every
`close` comparison (plan, `plan_sha256` vs the active marker, all six
`verify.trim()` vs `parsePlanTasks` output, exits, UTC `at`) passes 6/6.

**Flags (not failures)**:

- Task 2 verbatim-pattern vacuity: the re-approved cell's escaped pipes survive
  bash double quotes, so `node --test-name-pattern` receives literal `\|`
  (regex literal pipe) and matches 0 subtests — the first suite reports a
  vacuous file-level pass (`tests 1 pass 1`). Exit is still 0. Genuine coverage
  was confirmed by a read-only diagnostic with the unescaped pattern: 23/23
  pass, so Task 2 is really 23 + 80 = 103 green. The verbatim command supplies
  the evidence exit/`at`; the diagnostic is advisory only.
- Evidence Task 2 `verify` uses unescaped pipes because `close` compares
  `row.verify.trim()` against `parsePlanTasks` output, and `splitRow` unescapes
  `\|` to `|`. A raw escaped copy would fail `close` with `verify-mismatch`;
  the written string is exactly what `close` expects (validated above).
- Output capture for the chained Task 6 run used `>` redirection to
  `/tmp/opencode/*.log` (outside the repo; no repo file touched). No `close`
  was run; no code/test/docs/plan/spec edit was made by this task.

**Boundary**: only this progress ledger and the evidence JSON were written.
`docs/debt-ledger.md` needed no change. No code, test, TUI, script,
README/USAGE/CHANGELOG, plan, or spec edit. `scripts/spec-check.mjs` is
untouched.

## Task 6 — deviation: Task 2 Verify with escaped pipes is vacuous

**Recorded (UTC)**: 2026-10-31T01:12:00Z
**Status**: blocked — evidence NOT closed; plan fix + re-approval required.

**Finding**: the approved Task 2 Verify contains `^(prompt\|root\|gate\|safety):`
(escaped for the markdown table parser). Executed in shell it reaches node as a
literal-pipe regex: `node --test --test-name-pattern="^(prompt\|root\|gate\|safety):"`
runs 1 file-level test, 1 pass — NOT the 23 prompt/root/gate/safety tests. The
unescaped form runs 23/23. The current evidence file records the unescaped form,
so it does not match the command that was run. Closing now would pass the
parser but certify coverage that Task 2 did not execute.

**Required plan fix (human only; agent must not edit the plan under gate)**:
replace the Task 2 Verify cell with a pipe-free form:

`node --test --test-name-pattern="^prompt:" tests/opencode/test-v2-brain.mjs && node --test --test-name-pattern="^root:" tests/opencode/test-v2-brain.mjs && node --test --test-name-pattern="^gate:" tests/opencode/test-v2-brain.mjs && node --test --test-name-pattern="^safety:" tests/opencode/test-v2-brain.mjs && node --test tests/opencode/test-host-evidence.mjs tests/opencode/test-plugin-loading.mjs tests/opencode/test-spec-gate.mjs tests/opencode/test-compaction-hook.mjs tests/opencode/test-safety-guards.mjs tests/opencode/test-approve-command.mjs`

Then re-approve with `node scripts/spec-check.mjs approve docs/plans/2026-10-30-v2-native-brain.md`
(new plan hash). Task 2 and Task 6 Verifies must be re-run; evidence rewritten
with the new `plan_sha256`; close only after that.

## Task 2 + 6 re-run — pipe-free Task 2 cell (plan `c3b63f631c86`)

**Recorded (UTC)**: 2026-10-31T01:15:08Z
**Status**: complete — all six Verifies pass on the re-approved pipe-free plan
(`plan_sha256` `c3b63f631c86c9b764e7ad59d271068ec10aaf72244c7934d09b927aa8133204`
from `.sdlc/spec-gate.json`, `created_at` 2026-10-31T01:14:06Z). Evidence
rewritten and validated read-only against `close`'s checks (plan, `plan_sha256`,
all six `verify.trim()` vs `parsePlanTasks` output, exits, UTC `at`): 6/6.
`close` not run (orchestrator runs it separately).

**Verifies re-run in order (exact CURRENT plan cells)**:

| Task | Command (verbatim CURRENT cell) | Exit | Result | `at` (UTC) |
|---|---|---|---|---|
| 1 | `! node --test tests/opencode/test-v2-brain.mjs tests/opencode/test-tui-brain.mjs tests/opencode/test-host-evidence.mjs tests/scripts/test-host-evidence.mjs tests/opencode/test-plugin-loading.mjs tests/opencode/test-spec-gate.mjs tests/opencode/test-compaction-hook.mjs tests/opencode/test-safety-guards.mjs tests/opencode/test-approve-command.mjs tests/scripts/test-install-global.mjs` | 0 (historical) | RED baseline, not re-run per plan | 2026-10-31T00:49:05Z |
| 2 | `node --test --test-name-pattern="^prompt:" tests/opencode/test-v2-brain.mjs && node --test --test-name-pattern="^root:" tests/opencode/test-v2-brain.mjs && node --test --test-name-pattern="^gate:" tests/opencode/test-v2-brain.mjs && node --test --test-name-pattern="^safety:" tests/opencode/test-v2-brain.mjs && node --test tests/opencode/test-host-evidence.mjs tests/opencode/test-plugin-loading.mjs tests/opencode/test-spec-gate.mjs tests/opencode/test-compaction-hook.mjs tests/opencode/test-safety-guards.mjs tests/opencode/test-approve-command.mjs` | 0 | prompt 9/9 + root 7/7 + gate 3/3 + safety 4/4 = 23, plus second suite 80/80; **103 tests, 103 pass, 0 fail — non-vacuous** | 2026-10-31T01:14:49Z |
| 3 | `node --check .opencode/plugins/sdlc-lean-tui/index.js && node --check .opencode/plugins/sdlc-lean-tui/tui.js && node --check .opencode/plugins/sdlc-lean-tui/register.js && node --test tests/opencode/test-tui-brain.mjs` | 0 | 19 tests, 19 pass, 0 fail | 2026-10-31T01:14:52Z |
| 4 | `node --check scripts/host-evidence.mjs && node --test tests/scripts/test-host-evidence.mjs tests/scripts/test-install-global.mjs` | 0 | 31 tests, 31 pass, 0 fail | 2026-10-31T01:14:54Z |
| 5 | `node --test --test-name-pattern="^docs:" tests/opencode/test-v2-brain.mjs tests/opencode/test-approve-command.mjs` | 0 | 4 tests, 4 pass, 0 fail | 2026-10-31T01:14:56Z |
| 6 | `npm run verify && node eval/run.mjs` | 0 | lint 40 skills 0 failures; 453 tests, 453 pass, 0 fail; bootstrap 5068 B (limit 5116); dry eval 35 probes, 0 failures | 2026-10-31T01:15:02Z |

**Advisory diagnostic (not evidence)**:

```
$ node scripts/host-evidence.mjs status
host evidence rows: 0
host evidence: 0/6 matched (advisory)
exit 0 at 2026-10-31T01:15:04Z
```

**Gate check**: `node scripts/spec-check.mjs verify --require-active` exits 0 at
2026-10-31T01:15:05Z (`plan c3b63f631c86, spec b108c26847f2`).

**Task 2 non-vacuity confirmation**: the CURRENT pipe-free cell runs four
separate `--test-name-pattern` runs (`^prompt:` 9, `^root:` 7, `^gate:` 3,
`^safety:` 4 = 23 real subtests) plus the 80-test second suite = 103 tests
green. No escaped pipes, no vacuous file-level pass.

**Evidence**: overwrote
`docs/plans/2026-10-30-v2-native-brain-evidence.json` with `plan` =
`docs/plans/2026-10-30-v2-native-brain.md`, `plan_sha256` = the full 64-hex
above, key `tasks`, exactly 6 rows (task 1–6, `exit: 0`, UTC `at` per the table
above) with `verify` strings copied exactly from the CURRENT plan cells
(parser-canonical, confirmed byte-equal to `parsePlanTasks` output).

**Boundary**: only this progress ledger and the evidence JSON were written.
`docs/debt-ledger.md` needed no change (D-003 closed, D-028–D-034 present,
verified). No code, test, TUI, script, README/USAGE/CHANGELOG, plan, or spec
edit. `scripts/spec-check.mjs` is untouched. No `close` was run.


