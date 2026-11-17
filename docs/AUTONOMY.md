# AUTONOMY — standing rule: envelope-first, zero approvals inside

Default loop (zero keystrokes inside the envelope): goal → draft narrow
envelope → one chat yes (goal assignment IS the authorization) → commit
envelope + auth ledger line → machine-approve opens the gate → loop alone
(implement, named check, critics, evidence) → machine-close (check green +
audit row + reversal SHA). Repeat while the envelope covers the plan and
stays unchanged.

Template scope note: the shipped template keeps narrow pilot paths
(plan+impl+evidence only) because an empty Paths section fails
`envelope check`. Scope is filled by the bootstrap draft from the stated
goal, never pre-filled by the installer. Widening is its own
committed+authorized step (widened envelope commit + fresh auth ledger
line), never silent.

Fallback only (human `/approve`+hash): no envelope (bootstrap refused or
impossible), or the envelope was refused/changed. Typed `/approve` with the
plan SHA-256. The exception, not the norm.

ALWAYS-human (no envelope covers these — attempt = stop + escalate):
shared-remote merge/PR, publish/release, spend, prod or external network
writes, grader assertion changes, closing while checks are red.

No global self-sync (THREAT-NOSYNC): the agent never writes the shared
install to fix drift — it reports the drift and the human runs the
installer. The installer is additive-only: existing envelope/ledger files
are left untouched (`already present, skipped`).

## Two-provider OpenRouter routing (console-managed accounts — already live)

No local config needed (console-managed accounts); verify via `opencode models | grep console-openrouter`.
Dynamic free pool below (re-discovered at dispatch) supersedes earlier
super-vl-only wording. Orchestrator stays UNPINNED (inherits the session
model). Per-dispatch override: explicit `model:` + `account:` from the pool,
ledger-tracked per dispatch.
Paid link: REMOVED — free-only scope. Explicit removal, no silent drop.

ZDR: verified on all Nemotron models (super-vl primary on both accounts).

Prior north-mini-code / gemma pins are retired (historical only); do not route.
Human verify-both-IDs steps (already live — confirmation, not setup):

1. Verify both IDs selectable: `opencode models | grep console-openrouter` shows `console-openrouter` and `console-openrouter2`.
2. Confirm in the model picker and run a trivial prompt on each (confirm in your OpenCode version).

## Quota-aware routing (dynamic free-first pool)

Dynamic pool (re-discovered at dispatch; no frozen IDs):
- P: `console-openrouter/nvidia/nemotron-3.5-super-vl:free` (OR1) <-> `console-openrouter2/nvidia/nemotron-3.5-super-vl:free` (OR2) <-> `console-openrouter/thinkingmachines/inkling-2-small:free` (OR1) <-> `console-openrouter2/thinkingmachines/inkling-2-small:free` (OR2) (round-robin, ledger-tracked; `429` → same model other account first; inkling-2-small only with `xhigh` effort + thinking + agent harness (mini-swe-agent/stirrup), no harness → skip) → `console-openrouter/cohere/north-mini-code:free` (OR1) / `console-openrouter2/cohere/north-mini-code:free` (OR2) → re-discovered `opencode-go` / `opencode` free P models (cost `0/0`, allowlist-only).
- S: `console-openrouter/particle-ai/particle-1:free` + `console-openrouter2/particle-ai/particle-1:free` → `console-openrouter/recursive/flint-v1.0:free` + `console-openrouter2/recursive/flint-v1.0:free` → re-discovered Go/OC free S models.
- then orchestrator's own session model (BRAIN fallback; cap + ask-to-extend; secrets never free). Known-good examples only (not frozen): `opencode-go/crouton-alpha-free` / `beam-free` / `iceman-contributor-free`; always re-discover.

Selection is allowlist-only, deny-rest-by-default: only IDs explicitly listed in
this pool/routing table are selectable; every other model is denied — allowlist =
exact IDs + family-prefix stems (stems match only with a `-free`/`:free`
suffix); No substring deny. `muse-spark*`, `laguna` (`poolside/laguna*`,
expired), `lfm` (`liquid/lfm*`, not-for-coding), and content-safety no-tools
models are not allowlisted. `thinkingmachines/inkling-2-small:free` is
allowlisted (OR1/OR2) behind the `xhigh` + thinking + agent-harness gate
(dispatch-gated: orchestrator must use harness else skip).

Fallback: orchestrator's session model (inherits session; contributor-grade required where paid) — allowlist-only selection; non-allowlisted families rejected (deny-rest-by-default; No substring deny; family-prefix stems require -free/:free suffix), plus paid `openai/gpt-oss-120b`. Never paid/out-of-pool contributor fallback (contributor-free eligible when 0/0, except non-allowlisted families).
Orchestrator stays UNPINNED; every worker dispatch passes explicit
`model:` + `account:` and records one ledger row per dispatch (model + account + effort + thinking).
Delegation is narrow-only (allowed worker subagents only).

Trigger: `429` / `provider-error` only (billing codes never trigger).
Retry order: same model other account first (super-vl / inkling-2-small pair OR1<->OR2, north OR1/OR2), then next re-discovered Go/OC free model, then orchestrator model fallback (explicit spend approval + ask-to-extend).
Circuit: `CLOSED` / `OPEN` / `HALF-OPEN`. Cooldown JSONL (strict schema): `{"type":"cooldown","model":"<pool-id>","account":"<account>","cooldown_until":"YYYY-MM-DDTHH:mm:ss.sssZ","circuit":"OPEN"}` (strict `YYYY-MM-DDTHH:mm:ss.sssZ`).
Cheap probe only: `GET /api/v1/models`, then tiny completion `max_tokens:1`;
never a paid probe. Exhaustion → stop + escalate.

Admission: `settled+outstanding+next<=cap`. At cap: block, ask the user for
an extension, escalate — never auto-extend and never auto-spend.
Privacy: secrets NEVER to any free endpoint.

Resolver: `eval/lib/free-models.mjs` (filter: `opencode-go/` prefix, cost `0/0`,
denylist, secrets-never-free, tool_call required; 31/31 tests).

## Reasoning effort (per tier; per dispatch)

- **MUSCLE** (free pool) — `medium` default; top-coding dense steps on the most
  capable free models (super-VL) may raise to `high` effort + thinking where
  valuable; never max-by-default (429/provider backoff risk).
- **inkling-2-small** — `xhigh` effort + thinking, only inside an agent harness
  (mini-swe-agent/stirrup); no harness → skip, never downgrade effort to force it.
- **BRAIN** (orchestrator session model) — `high`.
- **longcat/iceman-free** — exempt: no effort knob, never force thinking or max.
- Hardship/rework → +1 effort, capped at `high` for MUSCLE (inkling-2-small's
  required `xhigh` is the only exception).
- Paid session fallback is kept: cap + ask-to-extend (fresh approval), never
  auto-paid; exhaustion → stop + escalate.

## Full-ID mapping table (dynamic free-first; re-probe via catalog)
Train route is routing policy, not a model rename: customer-code payloads
use the no-train route only; non-sensitive payloads use the provider
default. Expiry is per-catalog `expiration_date` — re-probe, never hardcode
(see `docs/verify-recipe.md` catalog re-probe procedure).

| Role / use | Full model ID | Train route | Expiry note |
|---|---|---|---|
| Pool | `console-openrouter/nvidia/nemotron-3.5-super-vl:free` | provider default | ZDR verified; `expiration_date` via re-probe |
| Pool | `console-openrouter2/nvidia/nemotron-3.5-super-vl:free` | provider default | ZDR verified; `expiration_date` via re-probe |
| Pool (example) | `opencode-go/crouton-alpha-free` | provider default | example only; re-discover via cost `0/0`; `expiration_date` via re-probe |
| Pool (example) | `opencode-go/beam-free` | provider default | example only; re-discover via cost `0/0`; `expiration_date` via re-probe |
| Pool (example) | `opencode-go/iceman-contributor-free` | provider default | example only; re-discover via cost `0/0`; `expiration_date` via re-probe |
| Fallback | orchestrator session model | provider default | contributor-grade required where paid; allowlist-only: non-listed = denied (deny-rest-by-default; No substring deny; family-prefix stems require -free/:free suffix), paid `openai/gpt-oss-120b` |
| Pool (harness-gated) | `console-openrouter/thinkingmachines/inkling-2-small:free` (OR1) / `console-openrouter2/thinkingmachines/inkling-2-small:free` (OR2) | provider default | allowlisted; `xhigh` effort + thinking + agent harness (mini-swe-agent/stirrup) required — no harness → skip; `expiration_date` via re-probe |
| Fallback (dynamic) | orchestrator session model | provider default | cap + ask-to-extend; secrets never free |
| Not allowlisted — denied by default | `poolside/laguna*` | never (excluded) | excluded by allowlist (expired) |
| Not allowlisted — denied by default | `liquid/lfm-2.5*` | never (excluded) | excluded by allowlist (not-for-coding) |
| Not allowlisted — denied by default | `nemotron-3.5-content-safety*` | never (excluded — safety) | excluded by allowlist |
