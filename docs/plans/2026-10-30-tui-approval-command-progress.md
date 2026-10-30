# Progress — TUI `/approve` command

**Plan**: [2026-10-30-tui-approval-command.md](./2026-10-30-tui-approval-command.md)
**Spec**: [2026-10-30-tui-approval-command.md](../specs/2026-10-30-tui-approval-command.md)
**Started**: 2026-10-30

## Baseline (task 1)

RED baseline recorded at 2026-10-30T23:02:24Z, before any plugin or docs edit.

| Suite | Result |
|---|---|
| `node --test tests/opencode/test-approve-command.mjs` | exit 1 — 9 tests, 4 pass / 5 fail; no syntax or import error |
| `! node --test tests/opencode/test-approve-command.mjs` | exit 0 |

Failing (expected RED):

- `behavior: registers one human-only approve command` — `0 !== 1` registered commands.
- `behavior: success writes the host-user tui-command marker` — stops at "V2 setup must register an approve command"; no marker written.
- `behavior: success confirms plan, spec, files, and hash without a prompt` — same missing command, so no synthetic confirmation.
- `behavior: refusals leave no marker and send a synthetic refusal` — same missing command, so no refusal can be exercised yet.
- `docs: /approve is documented with the TTY fallback` — `README.md must name /approve` (also absent from USAGE, both skills, and CHANGELOG).

Passing baseline assertions:

- `behavior: no approval tool is registered`
- `behavior: V1 hooks are unchanged`
- `behavior: V2 setup without ctx.command still registers hooks`
- `behavior: non-TTY CLI still refuses approval` (`spec-check.mjs approve` with piped stdio exits 1, no marker)

The marker's `approved_via` tolerance of the copied CLI `validateGate` is asserted by the success test; it is not exercised by the RED run because no command exists yet.

## Task log

| # | Task | Status | Evidence |
|---|---|---|---|
| 1 | RED: command, marker, refusal, V1, and docs contract tests | done (expected RED) | `node --test tests/opencode/test-approve-command.mjs` exit 1 at 2026-10-30T23:02:24Z: 9 tests, 4 pass / 5 fail (names above); `! node --test tests/opencode/test-approve-command.mjs` exit 0. Only `tests/opencode/test-approve-command.mjs` created; plugin, docs, and existing tests untouched. |
| 2 | GREEN: register the V2 `/approve` executor and write the host marker | done | `node --test --test-name-pattern="^behavior:" tests/opencode/test-approve-command.mjs` exit 0 at 2026-10-30T23:03:12Z: 8/8 pass (includes copied-CLI `validateGate` preserving `approved_via`); `node --test tests/opencode/test-plugin-loading.mjs tests/opencode/test-spec-gate.mjs` exit 0: 32/32 pass; `node scripts/spec-check.mjs verify --require-active` exit 0. Changed only `.opencode/plugins/sdlc-lean.js`; tests/docs/CLI untouched. |
| 3 | GREEN: document `/approve` and the TTY fallback | done | `node --test --test-name-pattern="^docs:" tests/opencode/test-approve-command.mjs` exit 0 at 2026-10-30T23:04:22Z: 1/1 pass; `node --test tests/opencode/test-brain-skills.mjs tests/opencode/test-skill-contracts.mjs` exit 0: 47/47 pass; `node scripts/spec-check.mjs verify --require-active` exit 0. Changed `README.md`, `USAGE.md`, `.opencode/skills/writing-plans/SKILL.md` (84 lines, cap 85), `.opencode/skills/intent-preview/SKILL.md` (21 lines, cap 25), `CHANGELOG.md`; tests/plugin/CLI untouched. |
| 4 | Full gate, evidence, and final dry eval | done | `npm run verify && node eval/run.mjs` exit 0 at 2026-10-30T23:04:59Z: lint 40 skills / 0 failures; `node --test` 366 tests, 366 pass / 0 fail; bootstrap 5068 B (cap 5116); dry eval 35 probes. Evidence has 4 rows. No code, test, docs, CLI, plan, spec, or marker edits. |

## Task 4 — final re-verification

Re-ran the Task 2 and Task 3 Verifies, then the full gate. Task 1's negated command recorded exit 0 at RED (2026-10-30T23:02:24Z) and is not re-run: it intentionally exits 1 once the tests pass.

| # | Verify | Exit | At (UTC) | Result |
|---|---|---|---|---|
| 2 | `node --test --test-name-pattern="^behavior:" tests/opencode/test-approve-command.mjs && node --test tests/opencode/test-plugin-loading.mjs tests/opencode/test-spec-gate.mjs` | 0 | 2026-10-30T23:04:52Z | 8/8 behavior + 32/32 regression |
| 3 | `node --test --test-name-pattern="^docs:" tests/opencode/test-approve-command.mjs && node --test tests/opencode/test-brain-skills.mjs tests/opencode/test-skill-contracts.mjs` | 0 | 2026-10-30T23:04:53Z | 1/1 docs + 47/47 regression |
| 4 | `npm run verify && node eval/run.mjs` | 0 | 2026-10-30T23:04:59Z | lint 40/0; tests 366/366; bootstrap 5068 B; dry eval 35 probes |

**Caps**: `writing-plans` 84/85 lines; `intent-preview` 21/25 lines; 40 skills; 9 command files; bootstrap 5068/5116 B.

**Final counts**: `npm run verify` exit 0 — `validate-skills` 40 skills, 0 failures; `node --test` 366 tests, 366 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo. `node eval/run.mjs` dry exit 0 — 35 probes (activation 2, safety 2, routing 12, brain 3, trust 4, execution 4, command 4, agent 1, router 3), no model calls. Evidence rows: 4 (tasks 1–4), all `exit: 0`; plan hash matches the active marker. Debt ledger unchanged: no deferred shortcut accepted in this task.

closed spec gate: evidence docs/plans/2026-10-30-tui-approval-command-evidence.json sha256 3e2d4982982fb51d3aa224dda50dda15f4e0dce8e492d685644a84eb7a5c746e
