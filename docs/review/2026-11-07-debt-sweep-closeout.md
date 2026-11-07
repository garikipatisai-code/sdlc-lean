# Debt-sweep closeout — 2026-11-07

Consolidated reference for the 34-row ledger sweep (D-001–D-034, plus
follow-up-born D-035–D-038). One place to answer "what is closed, what is
open, what is accepted, what deviated, what is still questioned."

## Scope

- **Ledger:** `docs/debt-ledger.md` (34 rows at sweep start, 38 after follow-up).
- **Dates:** findings 2026-10-04 – 2026-11-07; sweep executed 2026-11-07.
- **Phases + commits:** A safety guards (`3cccaa5`), B1 gate code
  (`62adcef`), C perms (`f96f310`), D eval/docs (`ae96a10`), follow-up
  pinning + nits (uncommitted working tree at closeout time).
- **Test counts:** full `npm run verify` 538 pass (Phase C/D baseline) →
  565 pass (follow-up T2 pin) → **567 pass / 0 fail** (follow-up T5, final).
  `tests/opencode/test-safety-guards.mjs` 9 → 19 (T1) → 24 (T5).
- **Progress sources:** `docs/plans/phase-a-safety-guards-progress.md`,
  `docs/plans/2026-11-07-phase-b1-gate-code-progress.md`,
  `docs/plans/2026-11-07-phase-c-perms-progress.md`,
  `docs/plans/2026-11-07-phase-d-eval-docs-progress.md`,
  `docs/plans/2026-11-07-follow-up-progress.md`; residuals in
  `docs/threat-model.md` (B1 Task 2/3, R3 sections).

Status vocabulary: **Closed** = behavior shipped + test-pinned.
**Closed-documented** = prose-only (no code change claimed, no code change
owed). **Open** = bypass tail or unwired seam remains; ledger `open` tracks
tail risk, not shipped behavior (threat-model R3 section).

## Disposition table (all IDs)

| ID | Verdict | Evidence |
|---|---|---|
| D-001 | Open residual | Single-quoted `$HOME` passes (expands to `~`, quoted tilde unmatched by bare-tilde pattern; fail-open on literal-`$HOME` relative dirname, vanishingly rare). Do NOT loop/widen. Shipped: `3cccaa5` + H4/M1 rounds; pins `tests/opencode/test-safety-guards.mjs:102,123,144`. Next: `normalizeRmCommand` cf `.opencode/plugins/sdlc-lean.js:390`. Src: phase-a progress `:23,32`, H4. |
| D-002 | Open residual | (e) nested `sh -c` stays single-level, do NOT loop; (f) `zgrep`/`rg` out of exact-known scope, do NOT add; (g) unbalanced-quote fail-closed accepted. Shipped: `3cccaa5`; pins `test-safety-guards.mjs:157,178,194,203`. Next: `stripEnvPrefix` cf `sdlc-lean.js:232` (`:1461` current). Src: phase-a progress `:24,33`. |
| D-003 | Closed | `#nosafety` removed 2026-10-31; strict guards; pin `test-safety-guards.mjs:284`. |
| D-004 | Open residual | Uppercase `PROCESS.ENV` passes via case-insensitive `process` exclusion (lowercase benign preserved; uppercase file form vanishingly rare), do NOT widen. Shipped: `3cccaa5`; pins `test-safety-guards.mjs:267`. Next: `SENSITIVE_PATH_RE` cf `sdlc-lean.js:409`. Src: phase-a progress `:25,34`. |
| D-005 | Closed | Router reworded → 5050 B, 66 B headroom; budget test-enforced. |
| D-006 | Open residual | `canvas-design` + `web-artifacts-builder` unvendored, per-skill SPDX unverified. Documented-only: `frontend-design/SKILL.md` +2-line note (Phase D T6). Next: inspect SKILL.md + LICENSE on next UX pass. |
| D-007 | Open residual | Static snapshot only, no live SSE — staged per design. Shipped instead: 15 s poll live snapshot (`scripts/dashboard.mjs`, `docs/dashboard.html`, `ae96a10`). Next: dashboard usage shows staleness pain. |
| D-008 | Open residual | No Colab route in router body. Shipped in budget: one line `- Colab run/release→colab-lifecycle` + shortened fan-out (net +8 B, 5107→5108 B ≤ 5116; Phase D T2, `ae96a10`). Next: mis-route on Colab intent. |
| D-009 | Open residual | Fix-round-3 ESCALATION (NOT absorbed): backtick/`$()`/paren `rm -rf /content` still pass — trailing `/content` boundary excludes `)`/backtick; needs trailing-boundary change, out of round scope, needs re-review. Round-2 accepted: (a) `sudo env` double-prefix passes, do NOT stack; (b) `nohup`/`env -i`/prefix-path out of scope, do NOT add; (c) nested `sh -c` single-level; (d) bare numeric `kill` fail-open (pid unknowable). Shipped: `3cccaa5` + rounds; pins `test-safety-guards.mjs:213,246`. Next: COLAB_CMD/rm-content guards cf D-001 `sdlc-lean.js:219`. Src: phase-a progress `:26,36,37,55-60,76-80`. |
| D-010 | Open residual | Matrix re-audit owed on pin change. Phase D T6 matrix note BLOCKED by gate scope; landed as nearest in-scope equivalent: 2-line provenance note in `colab-lifecycle/SKILL.md` body (pin stays, CPU-only 7-tool live-run scope, `run_code_cell` ambiguity documented-only). Matrix file edit deferred to follow-up. Src: phase-d progress `:24,71`. Next: re-audit when `opencode.jsonc` pin moves. |
| D-011 | Open residual | `assertLedgerLoaded` + `checkPhaseLedgerGate` shipped (`f96f310`, pins in `tests/scripts/research/test-phase.mjs`) but NOT wired into any hook — no phase-relevant seam exists (tool/session/`/approve` hooks carry no ledger context; wiring would break pass-through). Same analyzed-but-deferred seam convention as Tasks 2–4. Next: session hook or command wrapper that loads the ledger; future agent-aware hook MUST pass acting agent id. |
| D-012 | Open residual | Approval timestamps unanchored, handoff accepts unknown extras, `beginDispatch` skips post-write revalidation. Shipped: strictness (`f96f310`, 8 pin blocks in `test-phase.mjs`). Next: next phase-ledger pass or external handoff consumer. |
| D-013 | Closed-documented | Drift-guard-not-sandbox, no sandbox claimed; marker-path containment only (plugin lstat/realpath; CLI `assertSdlcContained` from B1 Task 1); skipDrift close-before-humanApproval order. Prose in `docs/threat-model.md:143-148` (B1 Task 2). Verify quoted 2026-11-07: 15 + 28 pass. Commit `62adcef`. |
| D-014 | Open residual | `web-game-development/**` ungated until a plan approves. Documented-only: +2-line ungated-tree note in `web-game SKILL.md` (Phase D T6, `ae96a10`). Next: next edit to the web-game tree. |
| D-015 | Open residual | V1 hosts ignore path globs (`test-writer` edit boundary unenforced on V1). `checkAgentPathScope` shipped (`f96f310`, 4 pin blocks in `tests/opencode/test-agent-permissions.mjs`) but unwired — V1/V2 `execute.before` carry no agent identity. Next: ~30-line plugin path guard at an agent-aware hook. |
| D-016 | Closed-documented | No-abandon by design (superseding plan only; contradicts AC2 otherwise). Prose in `docs/threat-model.md:143-148` (B1 Task 2). Commit `62adcef`. |
| D-017 | Closed-documented | Ledger 3-execution-advisory wording stale vs source of truth; D-023/024/025 calibrated 3/3, advisory removed. Reconciled by documentation only — NO flag flips (`eval/probes.mjs:20,29-34`, `eval/coverage.mjs:15,22-28`; currently 8 advisory: 4 command + 1 agent + 3 router). Phase D T1, `ae96a10`. Verify: `test-probes.mjs` 20 pass + `test-eval-coverage.mjs` 7 pass. |
| D-018 | Open residual | Merge guard shipped AND wired (`checkMergeGuard`, `f96f310`, pins `test-safety-guards.mjs:303,318,328`); `git worktree add` passes by design. HONESTY residual: baseline RECORDING stays artifact-level (agent-written; a hook cannot write files). Next: runtime merge/worktree hook or a missed merge gate. |
| D-019 | Open residual | `checkReviewerBash` shipped (`f96f310`, pins in `test-agent-permissions.mjs`) but unwired — no read-only test allowlist at runtime; reviewer cannot independently re-run Verify. Next: one bash allowlist entry (`node --test` read-only). |
| D-020 | Open residual | 7 command/agent/router probes `advisory: true` until calibrated (dry listing covers them; live miss cannot fail gate). Next: probe calibration. |
| D-021 | Closed | All 10 Wave-4 rules hard contracts 2026-10-30; no-pending tests green. |
| D-022 | Open residual | Content contracts are structural checks; no runtime proof claimed (documentation boundary). Boundary docs shipped Phase D T1 (`eval/probes.mjs`, `eval/coverage.mjs` comments-only, `ae96a10`). Next: n/a. |
| D-023 | Closed | `review-disposition` recalibrated 3/3 2026-10-30, advisory removed, stable. |
| D-024 | Closed | `merge-gate` recalibrated 3/3 2026-10-30, advisory removed, stable. |
| D-025 | Closed | `worktree-baseline` recalibrated 3/3 2026-10-30, advisory removed, stable. |
| D-026 | Open residual | `recordUxStatus` (one `uxStatus(` call site, `sdlc-lean.js:277`) + `getSdlcStatus` pure query (`sdlc-lean.js:285`) shipped (`f96f310`, pins in `tests/opencode/test-ux-hooks.mjs`) but unwired — no hook observes named-check-green. Audit-ledger sink DEFERRED (ledger outside gate scope). Next: one `uxStatus` caller + tests at a check-aware hook; future hook MUST call it once. |
| D-027 | Open residual | `command-release` advisory until first live calibration (dry listing + fixture phrases only). Next: first live run. |
| D-028 | Open residual | Deferred ask locked: zero `permission` string in plugin; hooks are session prompt/context/compaction + tool execute before/after only (`sdlc-lean.js:1768`, `:1919`, `:1923`); hard throws stay. Pins in T1 same gate. Next: only when host offers non-auto-approvable ask. |
| D-029 | Open residual | `instructions.entry` deferred (experimental); persisted `prompt` hook owns injection. Next: ~20 lines when it leaves experimental. |
| D-030 | Open residual | No footer status segment; gate + host-evidence count via `sdlc.status` palette + activation toast only. Next: host exposes a documented footer slot. |
| D-031 | Closed-documented | Advisory-by-default hash-only host evidence (`argv0` + `command_sha256` + `output_sha256` + bytes; `--require-host` opt-in; log not tamper-proof) + broker residual (duplicate/required-session refusal only; self-attestation forgeable; broker-attested identity out of scope, no broker code). Prose in `docs/threat-model.md:150-154` (B1 Task 3). Verify quoted 2026-11-07: 10 + 16 + 5 pass. Commit `62adcef`. |
| D-032 | Open residual | CLI `approve` path symlink-hardening NOT done this wave (`spec-check.mjs` unchanged this wave per original row; B1 Task 1 ADDED `assertSdlcContained` refusing symlinked `.sdlc` in `writeGate`/`approveMachineGate`, `62adcef`, 28/28 CLI tests). Row stays open for general file-write scope. Next: spec-check CLI pass (requires `cli_sha256` re-approval). |
| D-033 | Open residual | No read-only tool surface (no host tool-definition capability observed; faking one refused). `getSdlcStatus(root)` pure query shipped as the future tool's wrap target (`f96f310`). Next: one tool definition + tests when a concrete need lands. |
| D-034 | Open residual | Picker preview-only (`/approve <abs> sha256:<hex>`, never calls `session.command`); post-command re-read waits on pre-flight U2. TUI honesty shipped Phase D T5 (`register.js`, `ae96a10`; 35 TUI tests). Next: U2 shows endpoint reachable from agent bash. |
| D-035 | Closed-documented | T5 nits (a)–(f) CLOSED/KEPT: router spacing + 1 B (`SKILL.md:39`, 5108/5116); floor→round (`register.js:265`); `STALE_AFTER_SEC` 300 + `formatStaleness` (`register.js:258-259`, call sites `:793,803`); `getSdlcStatus` future-clamp comment (`sdlc-lean.js:285,288-289`, NO behavior change); Many-tasks KEEP; quote-aware-`|` KEEP fail-closed (`sdlc-lean.js:671`). Follow-up T5, uncommitted. |
| D-036 | Open residual | T5 (g) DEFERRED notes-only, no signature change: `isTestsPath` root anchoring deferred (`sdlc-lean.js:602`); `closePhase` taxonomy null-vs-ledger-unreadable deferred (`phase.mjs:583`); HANDOFF/BRIEF const duplication deferred (`phase.mjs:908-909`). T5 (l) pointer check only (double-prefix `sudo env` throws; `nohup` throws; nested `sh -c` single-level; `zgrep`/`rg` PASS; `python`/`curl`-URL/fullwidth PASS; single-quoted HOME throws; `rm -- -r /content` throws). Max 1 extra micro-fix NOT used. Next: future wiring pass for deferred items. |
| D-037 | Open residual | Copilot lib not mirrored: `plugins/copilot/.../colab-lifecycle/SKILL.md:84` reworded to see OpenCode source; `lib/lifecycle.mjs` NOT vendored by design. Pinned by `tests/opencode/test-colab-lifecycle.mjs` on OpenCode source. Next: vendor later only if copilot tree needs standalone core. |
| D-038 | Closed | T5 guards CLOSED minimal same-guard style + pins: quoted-flags `rm "-rf"` (`sdlc-lean.js:390`); backtick abort decoy (`sdlc-lean.js:1500`); attached `-C/tmp` + multi-token `-c` (`sdlc-lean.js:1488`). Pins `test-safety-guards.mjs:372,385`. Follow-up T5, uncommitted. |

## Accepted-by-design (not bugs)

- **No sandbox (D-013).** Gate intercepts `edit`/`write`/`patch`/`apply_patch`
  only; bash redirection, `mv`, generated scripts, local writer on
  `.sdlc/spec-gate.json` are outside enforcement. Hashes detect drift, not
  forgery. Owner: **human operator**. Closed-documented B1 Task 2.
- **Broker attestation (gap-close T3 / B1 Task 3).** Critic session
  independence is self-attested; a single closer can forge sessions to
  simulate independence. `validateCriticsSessions` refuses duplicates +
  required-session gaps only. Full broker-attested identity is out of scope,
  no broker code, documented not fake-fixed. Follow-up T4 spike confirmed
  the adjacent real bug (session-strip made the validator vacuous) and fixed
  it minimally in `scripts/spec-check.mjs` (`closeMachineGate` validates raw
  doc items, not stripped verdicts) — self-attestation forgeability itself
  remains accepted. Owner: **human operator** (sampling).
- **Advisory evidence (D-031).** Hash-only rows, advisory default,
  `--require-host` opt-in; log documented as not tamper-proof. Owner:
  **human operator** (sampling).
- **V1 path-glob unenforced (D-015).** V1 hosts understand scalar
  `permission`, not path globs; runtime path enforcement deferred to a future
  agent-aware hook. Owner: **plugin** (future wiring pass).
- **Unwired seams (D-011/D-015/D-019/D-026).** `checkPhaseLedgerGate`,
  `checkAgentPathScope`, `checkReviewerBash`, `recordUxStatus` are exported,
  tested, and deliberately NOT called from any global hook (no seam carries
  agent/ledger/check identity; wiring would guess or break pass-through).
  Owner: **plugin** (future agent-aware hook MUST pass the acting agent id;
  check-aware hook MUST call `recordUxStatus` once).
- **Generic description-prefix exemption (D-021).** One exemption remains by
  design. Owner: **suite**.

## Deviation log

- Spec-in-`files` (Phase B): voided `2026-11-07-phase-b-gate.md` + progress +
  evidence; corrected B1 scope excludes spec `docs/debt-ledger.md` (spec
  immutable under gate). Src: b1 progress `:11, T6-follow-up :158-162`.
- Prose Verify cells (Phase C rows 3–4, Phase D T2/T3/T5): voided; corrected
  to exact runnable commands (evidence-string fix + Verify-cell correction).
  Src: phase-c progress `:204-213`, phase-d progress `:92-96`.
- Evidence rebinds: Phase D evidence restamped under fresh gate `1409b64c47e2`
  with exact cell strings, all exit 0. Src: phase-d progress `:75-90`.
- cli-drift voids: `cli_sha256` changed (B1 Task 1) → gate verify reports
  cli-drift until close + re-approve (orchestrator-owned). Src: b1 progress
  `:Next`.
- Missing `tasks` key: follow-up draft corrected (exact T6 Verify cell, draft
  frontmatter, voided drafts in scope). Src: follow-up progress `:27-33`.
- Cap overrun: `using-git-worktrees/SKILL.md` hit 32 lines vs the 30-line cap
  (`test-execution-skills.mjs:177`, grader-immutable); trimmed prose-only to
  30, full 538/0 green. Src: phase-c progress `:215-231`.
- Ledger update BLOCKED (Phase A H-rounds): brief asked to update
  `docs/debt-ledger.md` but spec is immutable under an active gate; proposed
  row left for human at close. Landed instead in follow-up T3 (+ T3 round-2).
  Src: phase-a progress `:63,66`.
- M1 strip shape (Phase A): brief's literal regex left `timeout 5 pkill`
  unstripped; `timeout\s+(?:-\S+\s+)*\d\S*\s+` alternative added first
  (intent-faithful). Named-signal `timeout -s KILL 5` residual closed in the
  micro-round. Src: phase-a progress `:64,73-80`.
- Task-5 F1 (Phase C round 2): brief's `-[A-Za-z]+\s+` missed
  `git -C /tmp merge`; short-flag alt consumes one optional value
  (intent-faithful, verified no-match pre-fix). Src: phase-c progress `:235-241`.
- T4 session-strip fix (follow-up): product-code-only fix in
  `scripts/spec-check.mjs`; no grader semantics touched (validator ≠ grader).
  Src: follow-up progress `:39-69`.
- New-test path fix (follow-up T2): `../../../scripts` → `../../scripts` in
  the new seam test only; no product touch. Src: follow-up progress `:146`.
- D-017/D-001/D-004 flips + R3 note (follow-up T3 round-2): staleness
  reconciled documentation-only, no flag flips; threat-model R3 subsection
  added (~5 lines prose). Src: follow-up progress `:131-137`.

## Open questions backlog (reviewer Qs + next step)

- `closePhase` completed→closed taxonomy — `scripts/research/phase.mjs:583`.
  Next: decide taxonomy in the next phase-ledger pass; pin with a test.
- HANDOFF/BRIEF const duplication — `phase.mjs:908-909,936-938`. Next: dedupe
  at the wiring pass (D-036 deferred, notes-only).
- Quote-aware `|` split — KEEP fail-closed (`sdlc-lean.js`, reviewer
  `checkMergeGuard` Q; `MERGE_CMD_RE` at `:1488`, segment split at `:1500`).
  Next: none unless a false positive surfaces.
- Absolute `isTestsPath` over-permissive without root anchoring —
  `sdlc-lean.js:602`. Next: anchor to root at wiring (spec tolerates
  absolute `/tests/` today).
- Floor vs round — already aligned to round (`register.js:265`, D-035(b)).
  Next: none.
- Footer slot — no host slot exists; `sdlc.status` + toast only (D-030).
  Next: claim a footer part only when the host documents one.
- `getSdlcStatus` root clamp — 2-line future-clamp comment at
  `sdlc-lean.js:288-289`, currently unwired so no finding. Next: enforce
  containment when wrapping it in a real tool (D-033).
- Nested `sh -c` depth — single-level documented (D-002(e)/D-009(c)).
  Next: do NOT loop; accepted.
- Backtick abort decoy — CLOSED T5 (`sdlc-lean.js:1500`,
  pin `test-safety-guards.mjs:385`). Next: none.
- Multi-token `-c` — CLOSED T5 (`sdlc-lean.js:1488`, same pin). Next: none.
- Attached `-C/tmp` — CLOSED T5 (same). Next: none.
- `-u` hyphen user (`sudo -u app-user`) — CLOSED Phase A round 2
  (`[\w.-]+`). Next: none.
- Session-strip residual forgeability — validator now sees raw sessions
  (`scripts/spec-check.mjs` `closeMachineGate`), but self-attestation stays
  forgeable by design (broker residual). Next: broker-attested identity if a
  future run needs it.

## Follow-up entry points (where a future run starts)

- **Specs:** `docs/specs/2026-11-07-follow-up-hardening.md` (R1–R6 pattern for
  the next pinning round); domain specs under `docs/specs/` for new scope.
- **Ledgers:** `docs/debt-ledger.md` (rows D-036/D-037 + all Open residuals
  above carry verbatim reason + file:line + next step); progress files listed
  in Scope carry the probe tables.
- **Verify recipe:** `npm run verify` (567 pass gate) + focused suites:
  `node --test tests/opencode/test-safety-guards.mjs` (24),
  `node --test tests/scripts/research/test-phase.mjs` (28),
  `node --test tests/opencode/test-agent-permissions.mjs`,
  `node --test tests/opencode/test-ux-hooks.mjs`,
  `node --test tests/eval/test-probes.mjs` (20),
  `node --test tests/opencode/test-eval-coverage.mjs` (7),
  `npm run lint` (40 skills).
