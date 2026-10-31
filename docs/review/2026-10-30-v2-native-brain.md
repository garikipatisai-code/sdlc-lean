# Review — V2-native brain

**Date**: 2026-10-30
**Artifact**: `docs/specs/2026-10-30-v2-native-brain.md`
**Perspectives**: security (trust boundaries), failure modes/operability, requirements trace.
**Result**: 18 security findings + 41 failure-mode findings; 2 blockers; dispositions below. No finding was silently dropped.

## Blockers and high severity

| ID | Finding | Disposition | Change |
|---|---|---|---|
| SEC-01 | Native `ask` can auto-approve under `--auto`/subagent; one saved `rm *` can cover `rm -rf /` | Accept — reject the ask | Hard throws stay; permission hook deferred |
| SEC-02 | `session.command` is not human-invoked by construction; an automation can forge the marker | Accept with residual (owner: host user) | Hash-bound picker; pre-flight U2; preview-only fallback; `approved_via: tui-picker` |
| SEC-03 | `#nosafety` lets the agent bypass destructive and secret guards | Accept | Remove the token from all guards; update tests and messages |
| SEC-04 | `process.cwd()` fallback disables the gate | Accept | No cwd; fail closed on mutating tools when the root is unknown |
| SEC-05 | Host evidence stores raw commands with bearer tokens/URL credentials | Accept | Hash-only rows; no raw command/output; 0600 |
| SEC-06 | Blind confirmation and TOCTOU on plan content | Accept | Show `files`/`allow` patterns + SHA-256; require the hash; re-read/validate |
| SEC-07 | Permission hook can lower a configured deny | Accept as moot | Ask deferred; no permission hook |
| SEC-08 | `--require-host` is forgeable and passes with zero rows | Accept | Per-task matching; plan hash; zero rows fail; advisory default |
| SEC-11 | `/approve` imports agent-writable project code | Accept | Prefer installed global CLI; re-read/validate marker |
| SEC-12 | Symlinked `docs/plans` escapes the repo | Accept (plugin) | Realpath containment before approval; CLI symlink hardening deferred |
| F1 | Per-process set is not once per session; restart/retry re-injects or loses bootstrap | Accept | Persisted `session.context` check; no set |
| F2 | Prepending bootstrap invalidates attachment mention offsets | Accept | Append instead of prepend |
| F5 | `approvePlan`/`projectRoot` contradiction can approve in cwd | Accept | `approvePlan` uses `ctx.location.directory` only |
| F6 | Gate silently checks cwd when location is absent | Accept | Fail closed for mutating file tools |
| F9 | Picker cannot distinguish success from refusal | Accept | Re-read marker and compare plan/spec/hash |
| F19 | Symlink/FIFO evidence file causes out-of-repo write or stall | Accept | `lstat` + `O_NOFOLLOW` + `fstat` |
| F26 | `! node --test` verify strings never match host rows | Accept | Normalize `!`/`$`, trim, collapse whitespace, hash |
| F27 | `--require-host` fails on every unmatched extra row | Accept | Fail only on unmatched plan tasks; extras advisory |
| F28 | Rows are not bound to a plan; stale rows match | Accept | Stamp and filter by `plan_sha256` |
| F29 | Missing exit code counts as matched | Accept | Match only `exit === 0`; missing exit is `unknown` |
| F31 | Saved allow widens destructive scope | Accept as moot | Ask deferred; hard throw stays |
| F35 | Changing `spec-check.mjs` under an active gate causes `cli_sha256` drift | Accept | No `spec-check.mjs` change; new read-only script |

## Medium and low findings

Folded into acceptance criteria, tests, or risks:

- **Prompt/context**: F3 title generation (append + test), F4 runtime fallback, F7 compaction default root, F8 dead `ctx.directory` fallback (documented V1 shim), F12 skill sync count, F13 status writer, F14 fake-context TUI test, F15 dynamic `node:fs`, F16 `Plugin.define` caveat removed, F17 double registration smoke, F18 optional keybind.
- **TUI**: F10 absolute path, F11 no-session refusal, F16 plain `{id, setup}`.
- **Evidence**: F20 shell field mapping (`workdir`), F21 background/timeout/running skip, F22 mode 0600, F23 cap without hot-path read, F24 malformed-line skip, F25 kill switch.
- **Script**: F30 usage/zero-row message.
- **V1/installer**: F36 shared-helper regressions, F37 four existing tests updated, F38 installer keys/fixture, F39 V1 directory-load smoke, F40 probe count `>=35`, F41 docs test/rollback.
- **Security mediums**: SEC-09 validated marker summary, SEC-10 symlink/FIFO, SEC-13 text-marker fallback scoped to V2, SEC-14 set eviction solved by persisted check, SEC-15 current-session-only, SEC-16 display sanitization, SEC-17 malformed evidence, SEC-18 child lookup fails closed for injection.
- **Security lows**: SEC-14/15/16/17 are covered by the persisted check, current-session refusal, sanitization, and skip-malformed rules.

## Leading indicators

- Issues caught pre-implementation: 7 (V2 context non-persistence, `ctx.directory` mismatch, dead toast, `--auto` ask risk, `session.command` boundary, `#nosafety`, evidence forgery).
- Review coverage: 3/3 perspectives produced findings; 59 findings total.
- Requirements traced: 9/9 to tests in the spec trace table.
