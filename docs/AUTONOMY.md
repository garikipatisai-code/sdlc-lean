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
All static pins are `console-openrouter/nvidia/nemotron-3.5-super-vl:free`
(super-vl-everywhere, acct1). Orchestrator stays UNPINNED (inherits the
session model).

Per-dispatch override: explicit `model:` alternates `console-openrouter` /
`console-openrouter2` round-robin, ledger-tracked per dispatch (model +
account). Same-model-other-account retry first on 429/provider-error, then
next link.

Paid link: REMOVED — free-only scope. Explicit removal, no silent drop.

ZDR: verified on all Nemotron models (super-vl primary on both accounts).

Gemma (`google/gemma-4-31b-it:free`) is dead on both accounts — capacity
exhausted and no ZDR. Do not route; removed from the chain.
Break-glass: `cohere/north-mini-code:free` retained outage-only, never routine;
super-vl is primary on both accounts.

Human verify-both-IDs steps (already live — confirmation, not setup):

1. Verify both IDs selectable: `opencode models | grep console-openrouter` shows `console-openrouter` and `console-openrouter2`.
2. Confirm in the model picker and run a trivial prompt on each (confirm in your OpenCode version).

## Quota behavior (two $10 accounts, pooled free quota)

- Pooled free budget: ~2,000 req/day (2 accounts × ~1,000 req/day each).
- Per-account limits: 20 RPM / 1,000 req/day. Either account 429s
  independently; the other account still serves until it also exhausts.
- Alternation: the orchestrator alternates `console-openrouter` / `console-openrouter2`
  per dispatch and records model+account in the progress ledger row
  (spreads load across both per-account RPM/day caps).
- Exhaustion behavior: 429 → same model on the other account, then next link;
  pooled exhaustion (both accounts out) = stop + escalate — never silently
  spend. No paid link exists (free-only scope, removed explicitly).

## Full-ID mapping table (super-vl-everywhere; re-probe via catalog)

Train route is routing policy, not a model rename: customer-code payloads
use the no-train route only; non-sensitive payloads use the provider
default. Expiry is per-catalog `expiration_date` — re-probe, never hardcode
(see `docs/verify-recipe.md` catalog re-probe procedure).

| Role / use | Full model ID | Train route | Expiry note |
|---|---|---|---|
| All roles (acct1 primary) | `console-openrouter/nvidia/nemotron-3.5-super-vl:free` | provider default | ZDR verified; `expiration_date` via re-probe |
| All roles (acct2 override) | `console-openrouter2/nvidia/nemotron-3.5-super-vl:free` | provider default | ZDR verified; `expiration_date` via re-probe |
| Denylist — never selected | `poolside/laguna*` | never (excluded) | excluded by mapping |
| Denylist — never selected | `thinkingmachines/inkling*` | never (excluded) | excluded by mapping |
| Denylist — never selected | `liquid/lfm-2.5*` | never (excluded) | excluded by mapping |
| Denylist — never selected | `nemotron-3.5-content-safety*` | never (excluded — safety) | excluded by mapping |
