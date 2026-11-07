# Phase A safety guards progress

## Goal

Harden safety guards D-001/D-002/D-004/D-009; D-028 deferred (keep hard throws, no permission hook).

## Baseline

- Baseline SHA: 644df00b078049487b036dbe1ccbf156d85c4dfb
- Spec: docs/debt-ledger.md
- Plan: docs/plans/2026-11-07-phase-a-safety-guards.md (status: draft, unapproved)
- Test command: `node --test tests/opencode/test-safety-guards.mjs`

## Status

- Plan drafted: 2026-11-07 (draft, awaiting human approval — no code changes yet).
- Active spec gate: none (fail-open); docs-only step.

## Tasks

| # | Task | Debt | State | Evidence |
|---|------|------|-------|----------|
| 1 | Harden destructive-rm normalization D-001/D-009 | D-001, D-009 | DONE 2026-11-07 (fix round 2: quoted-root bypass) | `node --test tests/opencode/test-safety-guards.mjs` 9/9 green (exit 0); /tmp probe: prior bypasses still throw, quoted roots `"/"`, `"/*"`, `"/tmp/../../"` now throw, `"~"`/`"~/foo"`/benign pass |
| 2 | Expand shell secret-exfiltration guard D-002 | D-002 | DONE 2026-11-07 (fix round 3: env-prefix empty-value + leading sudo/env/command) | `node --test tests/opencode/test-safety-guards.mjs` 9/9 green (exit 0); /tmp probe: full regression green (Task 1: 12 throw + 5 benign; Task 2 prior matrix throw/pass; new 4 throw; `env echo hi`, `sudo echo hi`, `FOO=1 echo hi` pass) |
| 3 | Fix sensitive-path matching + `.env` regen D-004 | D-004 | DONE 2026-11-07 (basename + i flag + regen message; shell EXFIL/token aligned) | `node --test tests/opencode/test-safety-guards.mjs` 9/9 green (exit 0); inline probe: `config.env`/`.ENV`/`my.env`/`my.env.bak` throw, `.env.example`/`foo.env.example`/`envelope.py` pass, write/edit regen message, shell `CONFIG.ENV`/`grep config.env` throw, `process.env` passes |
| 4 | Harden Colab bridge/content guards + lock deferred ask D-009/D-028 | D-009, D-028 deferred | DONE 2026-11-07 (fix round 2: flags-after-path `[Rr]` + `sudo -u [\w.-]+`; fix round 3: COLAB_CMD separator → `[;&|(\n$\`]` — kills-in-subshell now throw; rm-in-subshell `)`/backtick-close still passes, ESCALATED, no further change) | `node --test tests/opencode/test-safety-guards.mjs` 9/9 green (exit 0); inline probe: 15 throw (sh -c pkill/rm inner, -R, split, --, //, flags-after, /bin/rm, sudo -u rm/pkill, xargs kill, numeric-pid-with-ref, find -delete) + 16 benign pass; round 2: `rm /content -R`, `rm /content -R -f`, `sudo -u app-user pkill` now throw, `sudo -u root` still throws, `sudo ls /content` still passes; round 3: `$(pkill -f colab-mcp)`/`echo $(pkill…)`/`echo (pkill…)` now throw, `(see colab-mcp docs)`/`(pkill -9 1234)`/prose still pass; RESIDUAL (escalated, NOT fixed — needs re-review): `` `rm -rf /content` `` / `$(rm -rf /content)` / `(rm -rf /content)` still pass — trailing `/content` boundary `(?:\/\|\s\|$\|;\|['"])` excludes `)`/backtick |

## Verification

- Docs-only step: `node --test tests/opencode/test-safety-guards.mjs` stays green (9/9 pass, no code changed).
- Task 1 (2026-11-07): `node --test tests/opencode/test-safety-guards.mjs` 9/9 green (exit 0) after `normalizeRmCommand` fix; /tmp ad-hoc probe confirmed all 9 bypasses now throw with existing destructive/artifact classes and all 5 benign pass.
- Task 1 fix round 2 (2026-11-07): added absolute-path unquote `s.replace(/(['"])(\/[^'"]*)\1/g, '$2')` in `normalizeRmCommand` (after $HOME expansion, before flag canonicalization); `node --test tests/opencode/test-safety-guards.mjs` 9/9 green (exit 0); /tmp probe: quoted `"/"`, `"/*"`, `"/tmp/../../"` now throw; `"~"`/`"~/foo"`/`"$HOME"`/`"$HOME/foo"`/benign pass. Residual: single-quoted `'$HOME'` passes (expands to `'~'`, same as `"~"` — quoted tilde unmatched by bare-tilde pattern; fail-open on a literal-$HOME relative dirname, accepted as vanishingly rare).
- Task 2 fix round 3 (2026-11-07): one-line `stripEnvPrefix` fix — `replace(/^\s*(?:(?:sudo|env|command)\s+)?(?:\w+=(?:'[^']*'|"[^"]*"|\S*)\s+)+/, '')` (optional leading `sudo|env|command` + `\S*` empty-value). RED: `env VAR=x cat .env`, `env FOO=1 BAR=2 cat .env`, `VAR= cat .env`, `A= cat .env` all passed pre-fix; GREEN: all 4 throw post-fix, `env echo hi`/`sudo echo hi`/`FOO=1 echo hi` pass. `node --test tests/opencode/test-safety-guards.mjs` 9/9 green (exit 0). Full regression: Task 1 (12 throw incl. quoted roots + 5 benign), Task 2 prior matrix (`FOO=1 grep/cat .env`, `sudo`/`env cat .env`, `$(cat .env)`, `cat .env)`, quote-mask `echo "a > b" .env` pass / `cat ".env" > /tmp/x` throw, `2>` rule `ls -l .env 2>/tmp/e` pass, sh -c unwrap, egrep/fgrep/gawk/mawk throw; benign `cat src/index.ts`, `.env.example`, prose, `process.env` pass). Residuals (accepted, for ledger): (e) nested `sh -c 'sh -c ...'` stays documented single-level — do NOT loop; (f) `zgrep`/`rg` out of exact-known scope — do NOT add; (g) unbalanced-quote fail-closed accepted. Reviewer questions answered as directed.
- Task 3 (2026-11-07): `SENSITIVE_PATH_RE` → `/(^|\/)[^/]*\.env(?:\.(?!example$|sample$|template$)[^/]*)?$|…/i` (basename + `i` flag) + write/edit regen message (`to regenerate, copy .env.example out-of-band or ask the human operator; direct agent write is refused`); shell `SECRET_EXFIL_RE`/`SENSITIVE_TOKEN_RE` → `(?!process\.env\b)[\w.-]*\.env` (basename while `process.env` stays benign). RED: `config.env`/`.ENV` read PASS pre-fix; GREEN: `config.env`/`.ENV`/`Config.ENV`/`A/.Env.Local`/`my.env`/`secrets/my.env.bak` throw on read/patch, `.env.example`/`foo.env.example`/`envelope.py` pass, write/edit regen message, shell `cat/grep CONFIG.ENV`/`grep config.env` throw, `process.env` passes. `node --test tests/opencode/test-safety-guards.mjs` 9/9 green (exit 0). Full regression: Task 1 (12 throw + 4 benign) + Task 2 (11 throw + 6 benign + edge `>`, `|`, `2>`, quote-mask) unchanged-correct. Residual (accepted): uppercase `PROCESS.ENV` passes shell EXFIL/token via case-insensitive `process` exclusion (lowercase `process.env` benign preserved; uppercase file form vanishingly rare) — do NOT widen.
- Task 4 (2026-11-07): three minimal edits in `.opencode/plugins/sdlc-lean.js`, all Colab-scoped. (1) `COLAB_CMD` one-line extend → `(?:(?:sudo(?:\s+-[^\s]+|\s+-u\s+\w+)?|env|command)\s+)?(?:\/(?:bin|usr\/bin)\/)?` so `/bin/rm|pkill`, `sudo -u root rm|pkill` refuse. (2) New flags-after-path guard `rm\s+['"]?\/content(?=\/|\s|$|;|['"])[^;\n]*?\s-[^;\s]*r` so `rm /content -rf` throws while bare `rm /content` and `rm /content -l` pass. (3) Colab scan generalized to unwrapped variants (`variants.some(v => re.test(normalizeRmCommand(v)))`, same pattern as SECRET guards) so `sh -c 'pkill -f colab-mcp'` / `sh -c 'rm -rf /content'` throw; plus anchored combo (`COLAB_KILL_CMD_RE` kill/pkill/killall at command position incl. `xargs` + `COLAB_TOKEN_RE` colab token anywhere, `-0` liveness excluded) so `pgrep -f colab-mcp | xargs kill -9` and `kill 1234 # colab-mcp` throw while prose (`git commit -m "block pkill colab-mcp"`, `echo "see pkill …"`) passes. RED pre-fix: `sh -c 'pkill…'`, `sh -c 'rm…'`, `xargs kill`, `kill 1234 # colab-mcp`, `rm /content -rf`, `/bin/rm`, `sudo -u` all PASS; GREEN post-fix: all 15 throw, 16 benign pass. `rm -R`/split/`--`/`//` verified already throwing via Task 1 normalization (no fix needed). `node --test tests/opencode/test-safety-guards.mjs` 9/9 green (exit 0). Full regression Tasks 1–3 (12/12) unchanged-correct; note `cat process.env` THROW is pre-existing (SECRET_READ_RE has no process exclusion; suite only contracts `grep -rn "process.env"` PASS, verified). D-028 lock (deferred ask): grep verified — zero `permission` string in plugin, hooks are only session `prompt`/`context`/`compaction` + tool `execute.before/after`; no permission/ask hook registered, hard throws stay. Residuals (accepted): bare `kill <pid>` with no colab reference passes (pid unknowable, fail-open); nested `sh -c 'sh -c …'` single-level only (Task 2 residual (e), do NOT loop). Spec-gate note: `docs/debt-ledger.md` D-009/D-028 status flip is OUT OF SCOPE — spec is immutable under the active gate (edit blocked by spec-check, recorded as deviation, no bypass); needs human close + re-approve follow-up, same as reviewer defect 2.
- Task 4 fix round 3 (2026-11-07, LAST per brief): one-line `COLAB_CMD` edit — leading separator `[;&|\n]` → `[;&|(\n$\`]` (identical to SECRET_READ_RE/SECRET_EXFIL_RE). RED pre-fix: `$(pkill -f colab-mcp)`, `` `rm -rf /content` ``, `$(rm -rf /content)` all PASS. Post-fix: `$(pkill -f colab-mcp)` / `echo $(pkill -f colab-mcp)` / `echo (pkill -f colab-mcp)` THROW; `(see colab-mcp docs)` / `(pkill -9 1234)` / prose / `pkill -0` / `sudo ls /content` still PASS. `node --test tests/opencode/test-safety-guards.mjs` 9/9 green (exit 0). Full regression Tasks 1–3 + Task 4 matrix unchanged-correct (one probe-script self-error: bare `kill 1234` listed in both lists — PASS is the correct accepted residual). ESCALATION (surprise, NOT absorbed — no further code change): `` `rm -rf /content` `` / `$(rm -rf /content)` / `echo (rm -rf /content)` still PASS — the rm guards' trailing `/content` boundary `(?:\/|\s|$|;|['"])` excludes `)` and backtick (confirmed: `echo (rm -rf /content ;)` and `` `rm -rf /content ` `` with trailing space DO throw). The instructed leading-separator fix alone does not make subshell-closed /content deletes throw; closing that needs a trailing-boundary change (out of this round's "change only this" scope — needs orchestrator re-review).
- Task 4 fix round 2 (2026-11-07): two one-line edits, same area. (1) Flags-after-path guard `\s-[^;\s]*r` → `\s-[^;\s]*[Rr]` (D-009 uppercase class; `rm` itself stays lowercase — no `i` flag). RED pre-fix: `rm /content -R`, `rm /content -R -f` PASS; GREEN post-fix: both throw, `rm /content -rf` still throws, `rm /content -l`/`rm /content` still pass. (2) `COLAB_CMD` sudo-user `\w+` → `[\w.-]+`. RED pre-fix: `sudo -u app-user pkill -f colab-mcp` PASS; GREEN: throws; `sudo -u root pkill -f colab-mcp` still throws, `sudo ls /content` still passes. `node --test tests/opencode/test-safety-guards.mjs` 9/9 green (exit 0). Full regression: Task 1 (12 throw + 5 benign) + Task 2 prior matrix + Task 3 matrix unchanged-correct. Residuals (accepted, NO code change): (a) `sudo env FOO=1 pkill` double-prefix passes — do NOT stack prefixes; (b) `nohup pkill` / `env -i pkill` / `/usr/local/bin/pkill` prefix/path forms out of exact-known scope — do NOT add; (c) nested `sh -c 'sh -c ...'` stays single-level (Task 2 residual (e)) — do NOT loop; (d) bare numeric `kill <pid>` with no colab reference passes (pid unknowable, fail-open).

## Deviation note (reviewer defect 2 — NOT acted on)

- Reviewer defect 2 asks to extend tests/opencode/test-safety-guards.mjs, which is outside gate files scope — blocked edit, needs human close + re-approval to widen (or follow-up tests-only plan). Recorded verbatim per task brief; no test file touched.

## Next action

- await human plan approval

## Consolidated fix round H1–H5 + M1 (2026-11-07T02:37:18Z, human-authorized)

- Scope: same file, same debt classes (`sdlc-lean.js` only). No test file touched (FORBIDDEN).
- TDD: RED 0/25 throw pre-fix (all bypasses confirmed PASS) → GREEN 25/25 throw + 12/12 benign pass post-fix → FULL regression (Tasks 1–4 matrices) → `node --test tests/opencode/test-safety-guards.mjs` 9/9 exit 0.
- Per-fix open/closed table:

| Fix | Change | Must-throw | Must-pass | State |
|---|---|---|---|---|
| H1 | D0/D1 trailing `(\s\|$\|;)` → `(\s\|$\|;\|)\|`)`; /content trailing ×3 (+find, flags-after lookahead) add `)`, backtick, `\|` (pipe required by `rm -rf /content\|cat` case) | `` `rm -rf /` ``, `$(rm -rf /)`, `(rm -rf /)` ×3 targets + `rm -rf /content\|cat` (9+1) | `/tmp/content`, `./content`, `/content-helper` | CLOSED |
| H2 | `normalizeRmCommand` += `s.replace(/\s+--(?:no-)?preserve-root\b/g,'')` | `rm --no-preserve-root -rf /`, `rm -rf --no-preserve-root /` | `rm --help` | CLOSED |
| H3 | `(?:\/(?:bin\|usr\/bin)\/)?` after sudo/env/command group in SECRET_READ_RE + SECRET_EXFIL_RE | `/bin/cat .env`, `/usr/bin/grep -r x .env`, `sudo /bin/cat .env` | `/bin/cat .env.example`, `cat src/index.ts` | CLOSED |
| H4 | `(['"])~(\/[^'"]*)?\1` → `~$2` in `normalizeRmCommand` | `rm -rf "$HOME"`, `"${HOME}"`, `"~"`, `"~/foo"` | `'$HOME'`→`'~'` throws (fail-safe over-block, accepted residual); `"~"` filename literal likewise (documented) | CLOSED + residual noted |
| H5 | `dd` added to SECRET_READ_RE verbs; `hasExfilRedir` += `/\b[io]f=/` on masked text with sensitive token | `dd if=.env`, `dd if=.env of=/tmp/o` | `dd if=/dev/zero of=/tmp/x`, bare `dd` | CLOSED |
| M1 | `stripLaunchPrefix` helper + COLAB combo tests `stripLaunchPrefix(normalizeRmCommand(v))` | `exec`/`nohup pkill -f colab-mcp`, `sudo env FOO=1 pkill -f colab-mcp`, `timeout 5 pkill -f colab-mcp` | `exec echo hi`, `timeout 5 pgrep colab`, `sudo ls /content` | CLOSED + deviation noted |

- FULL regression notes: prior matrices green; intentional flip — `"~"`/`"~/foo"`/`"$HOME"` now throw (H4, was benign in Task 1 round 2); bare `config.env`/`.ENV` as shell commands still pass (fail-open: no reader verb/redir/`if=` — file-tool and verb paths throw); `rm -rf "/"` still throws (balanced-quote unquote intact).
- DEVIATIONS (escalated, not absorbed):
  - (a) M1 strip shape extended: brief's literal regex leaves `timeout 5 pkill` unstripped (bare `5` matches neither launch word nor `\w+=`), so a `timeout\s+(?:-\S+\s+)*\d\S*\s+` alternative was added first in the alternation to meet the `timeout 5 pkill -f colab-mcp` must-throw. Bare `timeout -s KILL 5 pkill` (named signal + duration) still passes — residual for re-review.
  - (b) H1 D0/D1 (`/` root, `~`) got `)` + backtick only, per brief; `|` was added to /content boundaries only. `rm -rf /|cat` (no-space pipe on root) still passes — residual for re-review.
  - (c) Ledger update BLOCKED: brief asks to update `docs/debt-ledger.md`, but it is the spec path (immutable while gate active) and outside the allowed files list (`sdlc-lean.js`, progress, evidence only). Proposed ledger row for human to apply at close/re-approval: `| D-035? | 2026-11-07 | plugin/safety | Phase-A final-audit residuals: single-quoted '$HOME'/'~' over-block (fail-safe), named-signal timeout + no-space root-pipe bypasses | next safety-hardening pass | ~5 lines | open |`.
  - (d) Syntax self-correction: raw backtick in the three /content template-literal regexes broke `node --check`; escaped to `` \` `` (same pattern). No behavior change.
- Verify: `node --test tests/opencode/test-safety-guards.mjs` 9/9 green (exit 0).

## Final micro-round (2026-11-07T02:41:39Z, human-authorized — 3 one-line fixes, closes prior residuals)

- Scope: `sdlc-lean.js` only (3 minimal edits); no test file touched (FORBIDDEN).
- TDD: RED 0/5 throw pre-fix (`sh -c 'rm -rf /'`, nested `sh -c 'sh -c "rm -rf /"'`, `rm -rf /|cat`, `rm -rf ~|cat`, `timeout -s KILL 5 pkill -f colab-mcp` all PASS) → GREEN 11/11 (5 must-throw THROW + 6 must-pass PASS) → FULL regression (Task 1–4 + H1–H5/M1 matrices) GREEN → `node --test tests/opencode/test-safety-guards.mjs` 9/9 green (exit 0).
- Per-fix table:

| Fix | Change | Must-throw (GREEN) | Must-pass (GREEN) | State |
|---|---|---|---|---|
| 1 (severe — destructive-on-variants) | Variants built BEFORE destructive test; loop → `variants.some((v) => re.test(normalizeRmCommand(v)))`; snapshot `[...variants]` → live `for (let i=0;i<variants.length;i++)` with per-variant depth cap 3 | `sh -c 'rm -rf /'`, nested `sh -c 'sh -c "rm -rf /"'` | `sh -c 'echo hi'`, `echo sh -c` | CLOSED — closes D0-sh-c residual |
| 2 (pipe trailing) | D0/D1 trailing `(\s\|$\|;\|)\|`)` add `\|` (mirror /content guards) | `rm -rf /\|cat`, `rm -rf ~\|cat` | `rm -rf /tmp/content`, `rm -rf ./content` | CLOSED — closes H1-pipe residual (`rm -rf /\|cat` no-space root pipe) |
| 3 (timeout flag-value) | Launch-prefix timeout alternative `(?:-\S+\s+)*\d` → `(?:-\S+(?:\s+[^\s]+)?\s+)*\d` | `timeout -s KILL 5 pkill -f colab-mcp`; `timeout 5 pkill -f colab-mcp` still throws | `timeout 5 pgrep colab`, `exec echo hi` | CLOSED — closes named-signal timeout residual |

- FULL regression notes: Task 1 (12 throw incl. quoted roots/backtick/subshell + benign), Task 2 (readers/exfil/env-prefix/dd//bin-paths + benign incl. `process.env`/quote-mask/`2>`), Task 3 (basename/i-flag + shell token + regen message), Task 4 (15 throw incl. sh-c inner/flags-after/sudo -u/xargs/numeric-pid/find-delete/sub sensitive + 16 benign), H1–H5/M1 matrices — all GREEN, no flips.
- Verify: `node --test tests/opencode/test-safety-guards.mjs` 9/9 green (exit 0).

## Deviation: evidence filename vs close derivation

- (1) Naming defect: plan file `docs/plans/2026-11-07-phase-a-safety-guards.md` derives evidence `docs/plans/2026-11-07-phase-a-safety-guards-evidence.json` via evidenceFor, but the approved plan's allow list + setup wrote `docs/plans/phase-a-safety-guards-evidence.json` (date prefix dropped — planner A naming defect, approved as-is).
- (2) `close` failed `missing-evidence` at 2026-11-07 (user terminal); content is verified bound (plan_sha256 d8fbc018d3a9, 4 rows exit 0).
- (3) Fix is human-side byte-identical copy to the derived name (operator act in own terminal, not an agent gate bypass — agent cannot create it: derived path outside gate allow, plan immutable while active).
- (4) Prevention: Phase C/D drafts use non-dated progress/evidence names too and WILL hit the same wall — rename to dated convention + update their plan allow lists AFTER Phase A close (edits blocked while this gate is active), BEFORE their approvals.
