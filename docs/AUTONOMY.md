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

## Two-provider OpenRouter routing (generated snippet — human pastes only)

Generate text only — never install, never touch `~/.config` from the agent.
Model pins themselves land in T2; the snippet below lists provider
endpoints + keys only, NOT the pins. Intended T2 pins (per account):
implementer `cohere/north-mini-code:free`, reviewer/planner
`nvidia/nemotron-3-ultra-550b-a55b:free`, summarizer
`google/gemma-4-31b-it:free`.

Merge into `~/.config/opencode/opencode.jsonc` (add both keys inside the existing `providers` object — do NOT nest a second `providers` key; distinct provider IDs keep both accounts live):

```jsonc
  "openrouter": {
    "package": "@opencode/ai/providers/openrouter",
    "key": "{env:OPENROUTER_API_KEY}"
  },
  "openrouter-b": {
    "package": "@opencode/ai/providers/openrouter",
    "key": "{env:OPENROUTER_API_KEY_B}"
  }
```

Alternation rule: the orchestrator alternates `openrouter` /
`openrouter-b` per dispatch and records model+account in the progress
ledger row.

Human paste-and-verify steps:

1. Set the two env vars (`OPENROUTER_API_KEY`, `OPENROUTER_API_KEY_B`).
2. Paste the snippet into the `providers` object of
   `~/.config/opencode/opencode.jsonc`.
3. Restart OpenCode.
4. Confirm both IDs selectable: open the model picker and run a trivial
   prompt on each (confirm in your OpenCode version).

## Quota behavior (two $10 accounts, pooled free quota)

- Pooled free budget: ~2,000 req/day (2 accounts × ~1,000 req/day each).
- Per-account limits: 20 RPM / 1,000 req/day. Either account 429s
  independently; the other account still serves until it also exhausts.
- Alternation: the orchestrator alternates `openrouter` / `openrouter-b`
  per dispatch and records model+account in the progress ledger row
  (spreads load across both per-account RPM/day caps).
- Exhaustion behavior: 429 → next link per the T3 fallback chain;
  pooled exhaustion (both accounts out) = stop + escalate — never silently
  spend. The paid link requires an explicit pre-auth flag; absent pre-auth
  = stop + escalate. (Chain mechanics + 429-retry live in T3.)

## Full-ID mapping table (T2 pins + T4 carry-over; re-probe via catalog)

Train route is routing policy, not a model rename: customer-code payloads
use the no-train route only; non-sensitive payloads use the provider
default. Expiry is per-catalog `expiration_date` — re-probe, never hardcode
(see `docs/verify-recipe.md` catalog re-probe procedure).

| Role / use | Full model ID | Train route | Expiry note |
|---|---|---|---|
| Implementer primary | `cohere/north-mini-code:free` | no-train for customer code; provider default otherwise | `expiration_date` via re-probe |
| Implementer fallback | `recursive/flint-v1.0:free` | no-train for customer code; provider default otherwise | `expiration_date` via re-probe |
| Implementer alternate free | `dots-studio/dots-3-note-preview:free` | no-train for customer code; provider default otherwise | `expiration_date` via re-probe |
| Reviewer / planner | `nvidia/nemotron-3-ultra-550b-a55b:free` | no-train for customer code; provider default otherwise | `expiration_date` via re-probe |
| Summarizer | `google/gemma-4-31b-it:free` | no-train for customer code; provider default otherwise | `expiration_date` via re-probe |
| Heavy / reasoning (paid-gated) | `openai/gpt-oss-120b` | pre-auth required; no-train for customer code | paid link — pre-auth flag only, never silent |
| Denylist — never selected | `poolside/laguna*` | never (excluded) | excluded by mapping |
| Denylist — never selected | `thinkingmachines/inkling*` | never (excluded) | excluded by mapping |
| Denylist — never selected | `liquid/lfm-2.5*` | never (excluded) | excluded by mapping |
| Denylist — never selected | `nemotron-3.5-content-safety*` | never (excluded — safety) | excluded by mapping |
