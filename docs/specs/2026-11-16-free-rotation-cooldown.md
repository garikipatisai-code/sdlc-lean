# Free Rotation Cooldown

Status: draft
approved_by:
approved_at:

## Goal

Quota-aware free-first rotation with cooldown ledger: on 429/provider-error,
re-dispatch same-model-other-account first, then next re-discovered free model;
record cooldown + ledger row per dispatch; never auto-paid.

## Acceptance Criteria

- R-1: Trigger is 429 / provider-error only; billing codes never trigger rotation.
- R-2: Order is same-model-other-account first, then next re-discovered free model; null = exhausted → stop + escalate.
- R-3: One ledger row per dispatch (model + account + effort + thinking).
- R-4: Cooldown JSONL appended on every trigger (model, account, cooldown_until, circuit OPEN); fail-open (never blocks dispatch).
- R-5: Paid/session-model fallback only after admission passes + explicit spend approval + ask-to-extend; exhaustion with no approval → stop + escalate, never auto-paid.
- R-6: Secrets never to any free endpoint; denylist never selected (lfm, inkling, laguna/expired, jev, content-safety no-tools).

## Out-of-scope

Runtime routing changes beyond the routing table, model approvals, any approval action, network probes beyond cheap GET /api/v1/models + max_tokens:1 completion.

## Locked decisions (Task 1 spike, 2026-11-16)

- (a) Base role: implementer (.opencode/agents/implementer.md). Reason: permission superset (edit allow + bash allow) covers all muscle roles via prompt injection; one file per provider-model serves explorer/implementer/test-writer; researcher stays BRAIN session model per routing table (never base pins on researcher for muscle work); explorer read-only behavior enforced by prompt, permission is a ceiling.
- (b) Writer seam: prefer plugin execute.after on dispatch failure (automatic cooldown + ledger append, fail-open). Seam EXISTS in this codebase: V2 `ctx.tool.hook('execute.after', ...)` wired at `.opencode/plugins/sdlc-lean.js:3017` (currently records host evidence via `recordHostEvidence`; same fail-open advisory pattern applies). V1 has only `tool.execute.before` (`sdlc-lean.js:2861`) — no V1 after-hook exists, so V1 falls back to orchestrator-maintained file via existing write tools with fail-open read. File caps mirror host-evidence: 0600 file / 0700 dir, 500-row / 2MB cap, symlink-safe, append-only, hash-only rows (no raw commands/outputs).
- (c) Pin IDs: 20-file list confirmed against live inventory 2026-11-16 (dispatch-time re-discovery authoritative; pins are frozen-known-good, never hardcode-dispatch). OR (console-openrouter + console-openrouter2, -a/-b account suffix): super-vl, north, ling, particle, flint, gemma + openrouter/free router (7). Go: beam, iceman-contrib, longcat, hy4 (4). OC: beam, iceman, nemotron-super-vl, longcat, flint-40b, minimax, deepseek, mimo, glm (9). Exclusions with reason: lfm (not-for-coding), inkling (harness-only), laguna/expired (expired), jev (no tool support), content-safety no-tools models (no function calling). Router file carries nondeterministic-selection caveat + never-secrets.
- (d) Orchestrator path: `.opencode/agents/orchestrator.md` (Model routing + Model routing table sections) — exact file Task 3 updates.

## Notes

- Draft only; never approve.
- Fail-open everywhere: cooldown write failure never blocks dispatch.
- Live inventory 2026-11-16 per brief; re-discover at dispatch time, never hardcode.
