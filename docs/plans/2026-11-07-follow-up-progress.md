# Progress: follow-up hardening (draft)

## Goal

Draft the follow-up hardening plan (R1-R6: test-pinning A, test-pinning C,
ledger plus matrix prose, session-strip spike, nits batch, cleanup) with the
exact corrections: voided drafts in scope, exact T6 Verify cell, draft
frontmatter. No code changes until approved.

## Baseline

- HEAD: ae96a10bfb612a99908d165e80a8adce89bb92f3
- No active gate at draft time (no `.sdlc/spec-gate.json`).
- Spec: docs/specs/2026-11-07-follow-up-hardening.md (read-only).
- Plan: docs/plans/2026-11-07-follow-up.md
- Plan SHA256: 549eb1dce29cd46296096591636609b7edeba534fe92367929971951a26791bb

## Test commands

- T1: node --test tests/opencode/test-safety-guards.mjs
- T2: npm run verify
- T3: npm run lint
- T4: node --test tests/scripts/test-auto-tier-machine-close.mjs
- T5: npm run verify
- T6: test ! -e docs/plans/2026-11-07-phase-b-gate.md -a ! -e docs/plans/2026-11-07-phase-b-gate-progress.md -a ! -e docs/plans/2026-11-07-phase-b-gate-evidence.json

## Status

- Plan drafted with 6-row task table (verified parse: 6 data rows).
- Frontmatter status draft, approved_by and approved_at empty, allow lists
  the two ledger paths.
- Table Verify cells match the required exact strings; T6 cell has no
  pipes or backticks.

## Next

- await human plan approval

## T4 SPIKE (2026-11-07T04:15:36Z) — CONFIRMED + fixed

Verdict: CONFIRMED product bug (real path loses session AND validator
vacuous end-to-end). Fixed minimally in product code only
(scripts/spec-check.mjs). No grader semantics touched
(grader = tests/**, scripts/validate-skills.mjs, eval/**; validator != grader).

Trace (scripts/spec-check.mjs):
- `collectMachineVerdicts` (1173-1194): `items.map(item => string?item:item.verdict)`
  strips `session` -> `[{verdict:'ACCEPT',session:'s1'} x2]` becomes
  `["ACCEPT","ACCEPT"]`.
- `validateCriticsSessions` (1212-1225): `v && typeof v==='object' && v.session`
  else `''`, filtered -> strings give `sessionIds=[]`; guard
  `if (sessionIds.length>0 && unique.size!==len)` false -> never throws.
- `closeMachineGate` pre-fix (1257-1260):
  `validateCriticsSessions(verdicts, sessionRequirements)` passed stripped
  strings; `sessionRequirements` from `criticsDoc.requiredSessions||[]`
  (array docs -> `[]`). So duplicates always PASS; non-empty requiredSessions
  would always THROW "not found".
- RED demo (real-path input, not unit-shaped):
  `collect([{verdict:'ACCEPT',session:'s1'} x2])` -> `["ACCEPT","ACCEPT"]` ->
  `validate(strings,[])` PASS (BUG vacuous); same for
  `{verdicts:[...dup...]}`; `validate(raw objects,[])` THROW
  "duplicate session IDs" (validator correct, input wrong).
- Fix: `closeMachineGate` now builds `sessionItems` from raw doc
  (`Array?doc : doc.verdicts? : doc.critics? : [doc]`) and validates those;
  `collectMachineVerdicts` API unchanged, ACCEPT check unchanged.
- GREEN: `validate(sessionItems,[])` THROW on dup (fixed), PASS on distinct
  sessions, PASS on plain `['ACCEPT','ACCEPT']` (no sessions, correct).
- Verify: `node --test tests/scripts/test-auto-tier-machine-close.mjs` ->
  5 pass / 0 fail, exit 0 (2026-11-07T04:15:36Z).

## T1 PIN (2026-11-07T04:32:42Z) — 10 new blocks, ADD-ONLY, GREEN first run

- Appended 10 `test()` blocks to `tests/opencode/test-safety-guards.mjs`
  (zero existing assertions modified/deleted; `#nosafety` opener restored
  verbatim after an edit clipped it — diff shows pure addition).
- Added-case list (throw/pass per Phase A probe tables + fix rounds +
  consolidated H1–H5/M1 + micro-round):
  - rm normalization: `rm -rf /*`, `//`, `/tmp/../../`, `"/"`, `"/*"`,
    `"/tmp/../../"`, `rm -r -f /`, `rm -R /`, `rm -- /`, `rm -rf -- /`
    throw; `rm -rf /tmp/content`, `./content`, `rm --help` pass.
  - `--preserve-root` strip: `--no-preserve-root`/`--preserve-root` forms
    throw; `~`/`~/foo`, `rm -rf /|cat`, `~|cat`, backtick/`$()`/paren
    subshells on `/` and `~` throw; `/tmp/colab-work` passes.
  - `"$HOME"` quoting: `"$HOME"`, `"${HOME}"`, `"~"`, `"~/foo"`,
    `'$HOME'` (fail-safe over-block residual) throw; `echo $HOME` passes.
  - env-prefix + stripLaunchPrefix: `FOO=1`/`sudo`/`env`/`env VAR=x`/
    `env FOO=1 BAR=2`/`VAR= `/`A= ` reader prefixes, `/bin/`+`/usr/bin/`
    reader paths throw; `FOO=1/env/sudo echo hi`,
    `/bin/cat .env.example`, `cat src/index.ts` pass.
  - secret verbs + dd: `egrep`/`fgrep`/`gawk`/`mawk` + `.env`,
    `dd if=.env`, `dd if=.env of=/tmp/o` throw;
    `dd if=/dev/zero of=/tmp/x`, bare `dd` pass.
  - quote-mask + `2>` + right-guard: `cat ".env" > /tmp/x`,
    `$(cat .env)`, `cat .env)` throw; `echo "a > b" .env`,
    `ls -l .env 2>/tmp/e` pass.
  - sh-c unwrap + nested depth: `sh -c 'rm -rf /'`, nested
    `sh -c 'sh -c "rm -rf /"'` throw (destructive);
    `sh -c 'grep x .env'` throws (sensitive); `sh -c 'echo hi'`,
    `echo sh -c` pass.
  - Colab bridge: `exec`/`nohup`/`sudo env FOO=1`/`timeout 5`/
    `timeout -s KILL 5` pkill, `xargs kill -9`, `kill 1234 # colab-mcp`,
    `/bin/pkill`, `sudo -u root/app-user` pkill, `$(pkill…)`/
    `echo $(pkill…)`/`echo (pkill…)`, `sh -c 'pkill…'` throw (bridge);
    `exec echo hi`, `timeout 5 pgrep colab`, `sudo ls /content`,
    `kill 1234` (bare-pid residual), `(see colab-mcp docs)`,
    `(pkill -9 1234)`, `pkill -0`, `colab-mcp-helper` pass.
  - /content: `rm /content -rf/-R/-R -f`, `rm -rf /content|cat`,
    backtick/`$()`/paren `/content`, `/bin/rm`, `sudo -u root rm`,
    `find /content -name x -delete`, `sh -c 'rm -rf /content'` throw
    (artifact); `ls -la /content`, `rm /content -l`, `rm /content`,
    `sudo ls /content` pass.
  - sensitive basename + i-flag: `config.env`/`.ENV`/`Config.ENV`/
    `A/.Env.Local`/`my.env`/`secrets/my.env.bak` throw on read;
    `.env.example`/`foo.env.example`/`envelope.py` pass;
    `cat CONFIG.ENV`/`grep -r x config.env` throw;
    `grep -rn "process.env"`, `grep PROCESS.ENV` (case-insensitive
    `process` exclusion residual), bare `config.env` pass;
    `write config.env` throws with the regen message.
  - NO merge cases (T2's) — none added.
- TDD note: GREEN first run, so no guard regression to report.
- Verify: `node --test tests/opencode/test-safety-guards.mjs` ->
  19 pass / 0 fail, exit 0 (2026-11-07T04:32:42Z).

## T3 ledger plus matrix (2026-11-07T04:35:00Z)

- RED: `tests pinning in T1` 0 hits and `closed-documented` 0 hits in docs/debt-ledger.md; `follow-up re-audit` 0 hits in capability-matrix.md (prose absent, lint exit 0 baseline).
- GREEN docs-only, no code: docs/debt-ledger.md D-002/D-009/D-028 stay open with wording hardened + green, tests pinning in T1 (same gate), residuals verbatim plus file:line plus next step (src phase-a-safety-guards-progress.md:24,33-37,55-60,76-80; T1 pins tests/opencode/test-safety-guards.mjs). D-013/D-016 closed-documented per B1 Task 2 threat-model section with skipDrift order and Task 1 symlinked-sdlc refusal; D-031 closed-documented per B1 Task 3 with advisory hash-only plus broker-attested out of scope; verifies quoted (15 plus 28 pass 2026-11-07T02:55:46.005Z; 10 plus 16 plus 5 pass 2026-11-07T02:56:35.278Z). D-010 stays open re-audit owed, Phase D T6 BLOCKED deferred quoted (src phase-d-eval-docs-progress.md:24,71). Matrix adds Re-audit status 2026-11-07 section (pin stays, re-audit on pin change, CPU-only scope).
- Threat-model Q3 status-drift: skipped, no edit. Current B1 Task 2 plus Task 3 sections (docs/threat-model.md:143-154) already cover skipDrift order (close runs validateCloseEvidence BEFORE humanApproval) and advisory plus broker residuals; no new wording needed.
- Verify: `npm run lint` exit 0 (40 skills checked).

## T3 round-2 (2026-11-07T04:37:52Z) — reviewer 1 high + 1 medium + 1 low + extension

- D-017 flip: closed-documented Phase D T1 per eval source of truth; D-023/D-024/D-025 3/3 2026-10-30 advisory removed stable; staleness reconciled per docs/plans/2026-11-07-phase-d-eval-docs-progress.md:18 plus eval/probes.mjs:20,29-34 plus eval/coverage.mjs:15,22-28 (8 advisory: 4 command plus 1 agent plus 3 router); verify node --test tests/eval/test-probes.mjs (20 pass) plus node --test tests/opencode/test-eval-coverage.mjs (7 pass).
- D-028 file:line: hook sites sdlc-lean.js:1768 V1 tool.execute.before plus sdlc-lean.js:1919 V2 execute.before / sdlc-lean.js:1923 V2 execute.after; no permission/ask hook registered.
- R3 status-drift note: new threat-model subsection near gap-close residuals reconciling R1 closed equals behavior-shipped plus test-pinned, rows stay open while tails remain (D-001/D-002/D-004/D-009 pattern), D-001/D-004 untouched noted; ~5 lines prose only.
- Extension: D-001 plus D-004 flipped same open-hardened-green pattern as D-002/D-009 (Phase A shipped plus T1 pinning; tails per phase-a-safety-guards-progress.md:23,32 and :25,34); still open, not closed. Ledger copilot mirror note appended (mirror lacks re-audit section; sync deferred, no edit).
- Verify: `npm run lint` exit 0 (40 skills checked).

## T2 PIN (2026-11-07T04:42:54Z) — 17 new blocks, ADD-ONLY, GREEN (1 new-test path fix)

- Appended ADD-ONLY, zero existing assertions modified/deleted:
  - tests/scripts/research/test-phase.mjs (8): future/pre-creation approvals refuse + valid passes (createdAt anchor); stale/future retry refuse + valid passes; approval extra + buildHandoff input extra refuse; handoff/brief extras refuse via readHandoff; happy dispatch holds + invalid ledger fails closed; NaN clock fails closed + tie-safe retry + brief values verbatim + closeout completed→closed taxonomy + invalid-close-status; gate fails closed without ledger + loaded happy + pure validators; strictness holds under gate + completed-after-deadline refuses + expired passes.
  - tests/opencode/test-agent-permissions.mjs (4): test-writer scope outside throws/inside passes + absolute /tests/ tolerance + patch-body aware + non-file pass + implementer null; reviewer node --test/git reads pass + rm/phase/chained/pipe/redirect/empty refuse + implementer null; round-2 D1 newline/bare-& refuse + legit --test-name-pattern/git-diff pass + --flag deny + D2 unparseable/empty-list fail-closed + targetless pass + tests body pass + D3 ../ escape refuse + ./ pass + absolute tolerance residual; seam future-at refuses + gate passthrough/marker-throws + read/git-status pass + V1/V2 hooks unwired.
  - tests/opencode/test-ux-hooks.mjs (2): recordUxStatus/getSdlcStatus functions + fail/null/empty-tier passthrough + pass writes ux tier/confidence + getSdlcStatus gate null/skills number; single uxStatus( call site + V1 unwired + test-writer/reviewer/gate intact.
  - tests/opencode/test-safety-guards.mjs (3, AFTER T1 blocks): merge direct/chained/sh-c refuse ALWAYS-human + abort/base/log pass; worktree add/list/status pass-by-design + quoted prose pass + read pass; round-2 globals (-c/--git-dir/--no-pager/-C with value) refuse + stash/base/status pass + abort scope &&/||/| refuse + abort passthrough + launch prefixes (exec/nohup/setsid/timeout/inner exec) refuse + benign exec/timeout pass + inner shells (zsh/fish/--noprofile/-x) refuse + inner echo pass.
- TDD note: pinning tests first run 564/1 fail on new-test import path (`../../../scripts` → `../../scripts` in test-agent-permissions seam test); fixed new test only, no product touch, no existing assertion touched; rerun GREEN.
- Verify: `npm run verify` → 565 pass / 0 fail, exit 0 (2026-11-07T04:42:54Z); focused `node --test tests/scripts/research/test-phase.mjs` 28/0 + plugin triple 33/0.

## T5 Nits batch (2026-11-07T04:49:00Z) — CLOSED/KEPT per brief, FULL regression GREEN

- RED probes (pre-fix PASS where should THROW): `rm "-rf" /` PASS; `git merge main backtick-echo-abort` PASS; `git merge main dollar-paren-abort` PASS; `git -C/tmp merge main` PASS; `git -c core.pager equals quoted less-R merge main` PASS.
- GREEN minimal same-guard style (sdlc-lean.js): (i) 1-line flag-unquote in normalizeRmCommand sdlc-lean.js:390; (j) segment-split to backtick plus dollar-paren sdlc-lean.js:1500 plus attached-no-space and multi-token -c in MERGE_CMD_RE sdlc-lean.js:1488 (2 lines). Benign holds: `rm -rf /tmp/content`, `rm --help`, `git merge --abort`, `git -C /tmp status` PASS.
- TUI (register.js): (a) router spacing done in SKILL.md:39 (5107 to 5108B/5116); (b) floor to round register.js:265; (c) STALE_AFTER_SEC 300 plus formatStaleness register.js:258-259 call sites 1-line register.js:793,803; (d) getSdlcStatus 2-line future-clamp comment sdlc-lean.js:288-289 NO behavior change.
- Docs/KEEP: (e) Many tasks KEEP plus headroom 5108/5116 ledger D-035; (f) reviewer quote-aware pipe KEEP fail-closed ledger D-035 sdlc-lean.js:671; (g) isTestsPath sdlc-lean.js:602 plus closePhase taxonomy plus HANDOFF/BRIEF duplication ledger notes only D-036; (h) copilot SKILL.md:84 reword to see OpenCode source plus D-037 lib-not-mirrored open do NOT vendor; (k) D-035 to D-038 cover (a)-(l) plus Phase A/C residuals with file:line plus next step; (l) pointer check only (sudo env throws, nohup throws, nested single-level, zgrep/rg PASS, python PASS, curl PASS, fullwidth PASS, single-quoted HOME throws, rm content dash-dash -r throws) max 1 extra micro-fix not used D-036.
- Tests ADD-ONLY in tests/opencode/test-safety-guards.mjs (existing T1 blocks untouched): T5 quoted-flag block (3 throw plus 2 pass); T5 merge decoy block (4 throw via checkMergeGuard plus checkSafety, 2 pass). `node --test tests/opencode/test-safety-guards.mjs` 24/0.
- Verify: `npm run verify` 567 pass / 0 fail exit 0 (2026-11-07T04:49:00Z); `npm run lint` exit 0 40 skills; bootstrap 5108B.

## T6 cleanup (2026-11-07T04:44:41Z)

- RED: `test ! -e ...phase-b-gate.md -a ! -e ...phase-b-gate-progress.md -a ! -e ...phase-b-gate-evidence.json` exit 1 (all 3 untracked drafts present).
- GREEN: `rm` exactly the 3 voided Phase B drafts, nothing else.
- Verify: same `test ! -e -a ! -e -a ! -e` exit 0; `git status --porcelain` shows no deletions (3 `??` entries gone, zero `D` lines).
