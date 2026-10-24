# Progress Ledger — Colab runtime lifecycle capability

## Goal
Reusable Colab lifecycle capability in SDLC-Lean: prepare → connect → inspect →
execute → persist → release → verify, with honest enforced-vs-advisory claims.
No parallel cloud framework; reuse existing mechanisms (skill/lint/plugin/installer/tests).

## Acceptance criteria
1. Capability audit from the **pinned** colab-mcp source (`b9ab3899…`) + official
   `google/colab/runtime.py` — no invented tools, forks' features not assumed.
2. One on-demand skill + concise references; deterministic enforcement via existing infra.
3. Separate state dimensions (MCP server / bridge / catalog / notebook / runtime);
   no proof-by-absence claims; ownership recorded; unrelated sessions never touched.
4. Envelope gates before allocation; time-only fallback when CU rate/balance unavailable.
5. Execution gate: real call before allocation, hardware inspected, bounded retries,
   checkpoint/resume provenance, export + hash/ack verification before teardown.
6. Cleanup: `runtime.unassign()` in an approved cell; try/finally + external timeout;
   evidence classes REQUESTED / VERIFIED_RELEASED / UNVERIFIED_POSSIBLY_ALLOCATED;
   no reconnect-to-verify; incident path (stop work, notify, manual instructions).
7. Offline mocks for the 13 spec scenarios; existing lint/test/installer gates run.
8. Delivery: changed files, capability/limitation table, enforced-vs-advisory table,
   rollback, proposed CPU-only live test (approval requested separately).
9. No GPU allocation, no model download, no experiment, no global install, no OAuth, no push.

## Budget
3 loop iterations. Offline only; no GPU; no `npm run install:global`.

## Stage plan
- [x] Recon: AGENTS.md, skills conventions, plugin, installer, tests, lint, docs counts.
- [x] Audit: pinned colab-mcp source read end-to-end; live catalog = bootstrap-only
      (`open_colab_browser_connection` only) ⇒ no allocation tool in reach.
- [x] Research: frontend tool catalog + `google.colab.runtime.unassign()` source verified.
- [x] Decisions recorded (plan §Decisions).
- [x] T1 skill + references · T2 decision core + mocks · T3 plugin guards (parallel implementers).
- [x] T4 docs/counts/changelog/debt ledger (D-008 router gap, D-009 guard gaps, D-010 pin drift).
- [x] T5 critic pass (code + security reviewers) → 8 verified findings → fix round.
- [x] T6 fresh `npm run verify` + completion report.

## Loop 2 — critic pass and corrections (2026-10-12)
Both reviewers ran without shell and emulated; the parent reproduced every finding
with real commands before accepting it. Confirmed and fixed:
1. **Honesty (highest value)**: SKILL.md's enforced claim overreached — `checkSafety`
   only sees the `bash`/`shell` tool, so notebook-cell code (`!pkill …`) and MCP tool
   arguments are never inspected; no pattern matched a kernel process. Enforced row
   rewritten, scope sentence added.
2. **False refusals** (reproduced): quoted prose (`git commit -m "block pkill colab-mcp"`,
   `grep -rn "rm -rf /content" docs/`), `pkill -f colab-mcp-helper`, `pkill -0` liveness.
   Fixed with command-position anchoring (same technique as `SECRET_READ_RE`) plus
   `(?![\w-])`; intended blocks re-verified (26-case parent probe, both directions).
3. **Claim-strength gaps in the core** (reproduced): `artifacts.verified` true despite a
   failed export in the same run; `hashes["undefined"]` key; `ack:true` without a sha256
   counted as verified; `foldRun` could not reach `VERIFIED_RELEASED`; unused `ready` field.
   All fixed; new 14th test block pins the positive ladder path.
4. Ledger example corrected to the array form; D-009 bypass list corrected with verified
   forms; plan amended.

## Evidence (fresh, loop 2)
| Check | Command | Result |
|---|---|---|
| Full gate | `npm run verify` | `checked 38 skills, 0 failures`; `tests 156 / pass 156 / fail 0` |
| Bootstrap budget | `getBootstrapContent()` | 5029 B (unchanged; router untouched) |
| Guard, both directions | 26-case probe + 7 adversarial cases | intended blocked, benign pass, `#nosafety` opt-out works |
| Installer isolation | `install-global.mjs --target /tmp/opencode/…` | 38 skills; colab-lifecycle's 4 files ship; no `SOURCES` change |
| No global install / no Colab contact | — | only temp-target probe; no GPU, no model download, no OAuth, no push |

## Loop 3 — approved CPU-only live test (2026-10-12)
Scope approved by the human: one notebook, one owned CPU runtime, no GPU/TPU,
no downloads/installs/training, no reconnect after release, no process kills.

| Step | Outcome |
|---|---|
| Identity + ownership | notebook recorded as a non-sensitive label; registry entry opened and later closed |
| Live catalog + `get_cells` | bootstrap-only → **exactly the 7 predicted tools**; `get_cells` succeeded with **no runtime connected** (pre-allocation gate) |
| Hardware | CPU-only confirmed: no `nvidia-smi`, no `/dev/nvidia0`, no CUDA env |
| Artifact | written to `/content`, exported by output read-back, **sha256 matched exactly** |
| Release | `runtime.unassign()` returned without error (HTTP 200 path) ⇒ `REQUESTED` |
| Human confirmation | UI showed **"Reconnect"** (not absence) → then `Runtime → Manage sessions` = **"No active session"** ⇒ `VERIFIED_RELEASED` |
| Post-release | no reconnect, no probe, no bridge call |

**Timing (honest):** the observed span of **≥64 s** (first cell execution →
release request) does **not** establish an upper bound — the connect instant was
not observed. Total allocation duration is **estimated/unknown**, and compliance
with the 5-minute cap was **not independently verified**. Compute-unit
consumption is not measurable in reach (no CU API): unknown, not zero.

Live findings folded into the references: observed notebook schemas (scoped to
the session, no compatibility claim), `run_code_cell` response ambiguity
(`aborted` while the cell executed), `Reconnect` ≠ absence, `Manage sessions`
"No active session" = accepted human confirmation. Raw evidence stays **outside
the repo** (local run journal + local state registry); no tokens, cookies,
credentials, or notebook URLs were recorded anywhere.


## Evidence so far (pinned)
| Fact | Source | Date |
|---|---|---|
| Server defines only `open_colab_browser_connection`; all notebook tools are proxied from the browser and appear/disappear via `send_tool_list_changed()` | `colab-mcp@b9ab3899` `src/colab_mcp/session.py:174-202` | read 2026-10-12 |
| No runtime/accelerator/shutdown/billing tool in the pinned server | same + live catalog (bootstrap-only) | 2026-10-12 |
| Frontend tool set = 7 notebook-content tools (`add_code_cell`, `add_text_cell`, `delete_cell`, `get_cells`, `move_cell`, `run_code_cell`, `update_cell`); schemas are third-party reconstructions | colab-mcp discussion #69 + fork lineage | 2026-05-19 |
| `runtime.unassign()` → `POST http://$TBE_RUNTIME_ADDR/unassign`; `RuntimeManagementError` when not external Colab / no service / non-200; then `kernel.disconnect()` | `colabtools/google/colab/runtime.py` (raw, fetched) | verified 2026-10-12 |
| No in-notebook API for accelerator set/read, runtime status, or compute units; `colab usage` (CLI) exists but is out of scope/unauthorized here | colabtools tree + `google-colab-cli` docs | verified 2026-10-12 |
| Router bootstrap 5029 B ≤ 5116 B; only assertion is `skills.length >= 4` | `sdlc-lean.js` measured; `test-plugin-loading.mjs:49` | 2026-10-12 |
