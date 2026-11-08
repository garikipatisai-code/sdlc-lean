# Free-model dispatch procedure

Defines how dispatch selects free `opencode-go/*` models for quota-safe work.
The resolver is pure (stdlib-only, no network); callers supply the model list.

## API (resolver)

Source: `eval/lib/free-models.mjs`

- `FALLBACK_TRIO` — frozen default trio (in order):  
  `opencode-go/crouton-alpha-free`, `opencode-go/beam-free`,
  `opencode-go/iceman-contributor-free`.
- `resolveFreeModels(models, opts?) -> string[]` — filters a model list and
  returns a **new** array of qualifying ids. `opts`: `denylist` (ids to
  exclude), `toolCallRequired` (default `true`), `fallback` (custom fallback
  array; defaults to `FALLBACK_TRIO`). Empty, corrupt, throwing, or
  all-filtered input returns a **copy** of the fallback (never the frozen
  constant reference). Input is not mutated.
- `getFreeModelsCached(fetcher, opts?) -> Promise<string[]>` — fetches raw
  models (accepts `[]`, `{ models }`, `{ data: { models } }`, `{ data }`),
  resolves them, and memoizes by **fetcher identity** (WeakMap) for `ttlMs`
  (default `60000`). `opts`: `ttlMs`, `now` (`() => ms` clock or fixed ms;
  defaults to `Date.now()`), plus `resolveOpts` forwarded to
  `resolveFreeModels`. On fetcher throw, returns/memoizes the resolved
  fallback for the TTL (a failing fetcher is not hammered). Returns a copy.

## Query → filter → fallback flow

1. **Query**: obtain the candidate model list (caller/network layer). Feed raw
   models to `getFreeModelsCached(fetcher, ...)` for TTL-memoized resolution,
   or pass an already-fetched list to `resolveFreeModels(models, ...)`.
2. **Filter** (per model, in order of effect): keep only ids that pass every
   guard below. The resolver normalizes common cost and tool-call shapes; a
   model that cannot prove it is free + capable is excluded.
3. **Fallback**: if the resolved set is empty (nothing qualified, empty input,
   corrupt input, or an error), return a **copy** of `FALLBACK_TRIO` (or the
   custom `fallback`). Never return the frozen constant itself.

## Guards (must hold for every resolved model)

- **Prefix**: id is a string starting with `opencode-go/`.
- **Both costs zero**: cost data is present and **every** supplied cost
  dimension is `0`. Supported shapes include `cost: 0`,
  `cost: { input, output }` / `{ inputCost, outputCost }` (both required;
  a partial split rejects), `cost: { total|value }`, and top-level
  `inputCost`/`outputCost` (both required). Missing cost or any non-zero →
  excluded (never treated as free).
- **Denylist**: id not in `opts.denylist`.
- **Secrets never free**: ids matching the secret-like pattern
  (`/secret|key|token/i`) are excluded, regardless of cost/capability.
- **tool_call required** (default): model advertises tool-call capability
  (boolean flags/capability names/tools variants normalized). Set
  `toolCallRequired: false` only when tool use is not required.
- **Cheap probe only**: dispatch uses the resolved free set for low-cost/free
  probing; never route paid/secret-bearing traffic through this path.
- **Cap + ask-to-extend**: dispatch is bounded (count/time/budget caps).
  When a cap is reached, stop and ask to extend rather than widening scope or
  escalating to paid/secret models silently.

## Mirror sync + back-compat

The frozen fallback trio ids are mirrored/referenced across quota-routing
surfaces (e.g. the phase/plugin quota pool vocabulary such as `QUOTA_POOL` and
related circuit/fallback constants). **Mirror sync note:** when the default
trio or quota vocabulary changes, update the resolver constant and every
mirror in lockstep (intentional duplication; tests pin both copies) — never
change one side alone.

**Back-compat:** older ledgers, plan/progress records, and evidence bundles
may reference the **frozen** ids by value. Those ids remain accepted and
resolvable; existing references are not rewritten. The resolver continues to
treat the frozen trio as the canonical fallback, so historical ledgers stay
valid. Any future id change must preserve back-compat for already-recorded
frozen ids or ship an explicit migration.
