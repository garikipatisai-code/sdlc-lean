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
- `console-openrouter/nvidia/nemotron-3.5-super-vl:free` on
  `console-openrouter` + `console-openrouter2/nvidia/nemotron-3.5-super-vl:free`
  on `console-openrouter2` (round-robin, ledger-tracked; `429` → other account first).
- then `opencode-go` models discovered as cost `0/0` via models API at dispatch
  (denylist excluded; thick briefs required). Known-good examples only:
  `opencode-go/crouton-alpha-free` / `opencode-go/beam-free` /
  `opencode-go/iceman-contributor-free` — examples, NOT a frozen requirement;
  free list may change anytime, always re-discover.
- then orchestrator's own session model (BRAIN fallback; cap + ask-to-extend;
  secrets never free).

Fallback: orchestrator's session model (inherits session; contributor-grade required where paid) — blocked models: reject `opencode-go/muse-spark-1.3` and paid `openai/gpt-oss-120b`.
Orchestrator stays UNPINNED; every worker dispatch passes explicit
`model:` + `account:` and records one ledger row per dispatch (model + account).
Delegation is narrow-only (allowed worker subagents only).

Trigger: `429` / `provider-error` only (billing codes never trigger).
Retry order: super-vl same-model other-account, then next re-discovered free model,
then orchestrator model fallback.
Circuit: `CLOSED` / `OPEN` / `HALF-OPEN`. Cooldown JSONL:
`{"type":"cooldown","model":"<pool-id>","account":"<account>","cooldown_until":"YYYY-MM-DDTHH:mm:ss.sssZ","circuit":"OPEN"}` (strict `YYYY-MM-DDTHH:mm:ss.sssZ`).
Cheap probe only: `GET /api/v1/models`, then tiny completion `max_tokens:1`;
never a paid probe. Exhaustion → stop + escalate.

Admission: `settled+outstanding+next<=cap`. At cap: block, ask the user for
an extension, escalate — never auto-extend and never auto-spend.
Privacy: secrets NEVER to any free endpoint.

Resolver: `eval/lib/free-models.mjs` (filter: `opencode-go/` prefix, cost `0/0`,
denylist, secrets-never-free, tool_call required; 30/30 tests).
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
| Fallback | orchestrator session model | provider default | contributor-grade required where paid; blocked models: reject `opencode-go/muse-spark-1.3` and `openai/gpt-oss-120b` |
| Fallback (dynamic) | orchestrator session model | provider default | cap + ask-to-extend; secrets never free || Denylist — never selected | `poolside/laguna*` | never (excluded) | excluded by mapping |
| Denylist — never selected | `thinkingmachines/inkling*` | never (excluded) | excluded by mapping |
| Denylist — never selected | `liquid/lfm-2.5*` | never (excluded) | excluded by mapping |
| Denylist — never selected | `nemotron-3.5-content-safety*` | never (excluded — safety) | excluded by mapping |
