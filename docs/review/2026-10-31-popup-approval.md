# Review — popup approval

**Date**: 2026-10-31
**Artifact**: `docs/specs/2026-10-31-popup-approval.md`
**Perspectives**: security (trust boundaries), failure modes/operability.
**Result**: 9 security + 15 failure-mode findings; 5 blockers; dispositions below. No finding was silently dropped.

## Blockers and high severity

| ID | Finding | Disposition | Change |
|---|---|---|---|
| F1/F01 | Setup-captured root approves the wrong checkout | Accept | Per-open root from TUI location only; abort on session switch |
| F2 | `approved_via` forgeable by bash; same OS user | Accept | Label is informational; documented forgeable; trust via close evidence |
| F3/F03 | Global/project CLI divergence causes cli-drift or weakened validation | Accept | Single global-first order; refuse on divergence |
| F4 | TOCTOU between shown hash, build, write, re-read | Accept | Shown, gate, and re-read hashes must all match; content-matched delete |
| F5 | Status shows attacker scope as active | Accept | Display through full validateGate; mismatch shows gate invalid |
| F6/F05/F06 | Symlinked .sdlc/CLI/marker; naive unlink deletes outside files | Accept | lstat CLI/.sdlc/marker; realpath containment; delete only what was written |
| F04 | Lenient TUI parser displays draft plans the CLI refuses | Accept | Display from buildGate output |
| F02 | Session switch between select and confirm | Accept | Re-resolve after confirm; abort on change |
| F10 | Silent overwrite of an active gate | Accept | Second confirm naming old plan/hash or refuse with close hint |
| F07/F7 | Missing fs/dialog fallback silent or hash-less | Accept | Fallback always shows exact hash command or refuses the hash claim |
| F11 | approved_via token + username unavailable in TUI | Accept | Dynamic node:os; refuse when unavailable; single tui-popup token |

## Medium and low findings

Folded into ACs, tests, or risks:

- F8 double registration: module guard; palette-only default, bind opt-in.
- F9 human-only proof unknown: residual accepted by host user; headless uses TTY CLI.
- F08 double-scan unknown: manual smoke decides stub retention.
- F09 unknown vs inactive conflation: distinct unknown state, never fail-open display.
- F12 unbounded View excerpt: cap 2000 chars with counts.
- F13 verification gaps: TUI tests mirror approve drift/escape/overwrite cases.
- F14 installer parity: assert TUI dir and manifest coverage.
- F15 V1/headless matrix: document V1-ignore and headless TTY-only path.

## Leading indicators

- Issues caught pre-implementation: 5 (stale root, forgeable label, CLI divergence, TOCTOU, symlink unlink).
- Review coverage: 2/2 perspectives produced findings; 24 findings total.
- Requirements traced: 4/4 to tests in the spec trace table.
