# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Changed
- Four-wave evidence-backed hardening: TTY-bound approval, evidence-bound close, least-privilege agents, and eval trust (Wave 1); TDD/fail-before-fix, evidence-based review, merge gate, and worktree baseline (Wave 2); 40-skill contracts, 9-command coverage, `url-fetched`/`command-exit`, 35 probes, and calibration (Wave 3); five pending domain rules resolved, `/release`, and domain/claim corrections (Wave 4).
- Strict guards (breaking): the `#nosafety` in-band bypass is removed from the
  destructive, secret, and Colab guards. Those actions now always throw, the
  error messages no longer advertise the token, and the agent cannot
  self-authorize; humans can still run them outside the agent.
- Location-first project root: V2 resolves the project from
  `ctx.location.directory` before `directory` and never from `cwd`; mutating
  file tools fail closed when the root is unknown, and compaction returns `[]`.
- Approval integrity: `/approve` prefers the installed global CLI, accepts an
  optional `sha256:<hex>`, realpath-checks the plan and spec, and re-reads plus
  validates the marker after writing (`approved_via: tui-picker` with a hash,
  else `tui-command`). The plan file is never written.
- Popup approval primary: the V2 TUI palette `sdlc.approve` lists plans and
  Approve writes the normal marker (`approved_via: tui-popup`); typed
  `/approve` and `spec-check approve` TTY fallback stay; headless/SSH uses the
  TTY CLI; V1 loads no TUI part. `approved_via: tui-popup` is informational
  and bash-forgeable — trust comes from close evidence binding; no sandbox
  claimed.

### Added
- Auto-tier pilot (envelope-authorized machine-close): `docs/auto-envelope.template.md` standing pre-approval + `envelope check` validator; `close --machine` (named check + critics + evidence + reversal + audit row, with `approved_at`-anchored grader-immutability, envelope-immutability, and expected-outcome guards); SoP role separation that fails open when roles are unobservable; design in `docs/design/0001-auto-tier-pilot.md`, pilot threat section in `docs/threat-model.md`.
- Persisted V2 prompt hook: `ctx.session.hook('prompt')` appends the bootstrap
  to the first user prompt once per session, skips child sessions, and falls
  back through the `context` hook on a runtime throw. V1's hook shape is
  unchanged.
- V2 TUI part `sdlc.approve` / `sdlc.status`: the picker is preview-only — it
  lists immediate plans, shows `files`/`allow` and the plan SHA-256, and prints
  the exact `/approve <absolute-path> sha256:<hex>` command; it never calls
  `session.command`. `sdlc.status` shows the active gate and the advisory
  host-evidence count, and activation emits one toast from the TUI part.
- Hash-only host evidence: `execute.after` appends advisory
  `.sdlc/host-evidence.jsonl` rows with hashes, `argv0`, and exit status but
  never the raw command or output; `scripts/host-evidence.mjs status` prints
  `host evidence: n/m matched (advisory)`, and `--require-host` opts into a
  nonzero exit.
- Installer parity: `npm run install:global` copies the TUI directory and
  `scripts/host-evidence.mjs`, tracks them in the manifest, and prunes stale
  files without touching user files.
- V2 TUI approval command `/approve <plan>`: a human-invoked OpenCode command
  writes the normal `.sdlc/spec-gate.json` marker with the host OS user and
  `approved_via: tui-command`; the TTY-bound `spec-check approve` CLI remains
  the fallback; no new dependency.
- Web-game capability: `web-game-development` skill + `/game` command — web-first
  engine matrix (Phaser 4, PixiJS v8, three.js, Babylon.js, PlayCanvas, Godot web
  export), fixed-step/WebGPU architecture, frame and asset budgets, authoritative
  netcode, game feel/playtest/accessibility, PWA/portal shipping gates. Vendors a
  curated Apache-2.0 reference corpus (Phaser/Pixi/three + 12 disciplines +
  itch/prototype) with attribution; no executable upstream helpers. Vendored
  Markdown/JSON plus the upstream Apache `LICENSE`/`NOTICE`; CI/credential
  guidance is hardened (SHA-256 pin, step-scoped secret, no creds-file reads)
  and helper scripts are not bundled. Adds a routing probe (40 skills).
- V1 trust core: CI workflow, root package manifest, debt-ledger format,
  `simplified-technical-english` skill, and hardened safety guards.
- Live eval harness (`eval/run.mjs`): dry-by-default probes with structural
  scoring and token/cost telemetry; never runs in CI.
- Lifecycle skills: `incident-postmortem`, `dependency-upgrade`,
  `threat-model`, and `adr` (description-triggered, no router growth).
- Autonomous orchestration: `orchestrator` primary agent + `autonomous-loop`
  skill (goal-driven loops with iteration budgets and honest stop rules) and
  `option-selection` skill (research-first compare-then-commit decisions:
  options matrix, Y-statement, ADR handoff).
- Verify-recipe memory in `verification-before-completion` (write once, reuse
  every loop) and compaction-state hook in the plugin (debt ledger + newest
  plan progress survive context compaction, fail-open).
- Spec-gate enforcement (`scripts/spec-check.mjs` + plugin hook): an approved
  plan binds spec/plan SHA-256 and a file scope in `.sdlc/spec-gate.json`;
  `edit`/`write`/`patch`/`apply_patch` outside that scope are blocked, plan/spec are immutable
  until `close` + re-approval, and repos without a marker are unaffected.
  Workflow docs treat design/plan/scope approval as an authorization boundary,
  not a checkpoint. Installer ships the CLI globally; bash writes remain a
  documented residual risk (D-013).
- Eval probes for autonomous-routing and option-selection triggers.
- Reverse-engineering capability: `reverse-engineering` skill + `/reverse-engineer`
  command — REA engine ladder (pinned, not vendored), full target routing,
  S-tier reconstruction gates, competitor best-of toolchain matrix; adds a
  routing probe (39 skills).
- UI/UX SOTA: `frontend-design` (adapted anthropics Apache-2.0), `ui-review` (vercel MIT, live-fetch), `intent-preview` + `/preview`, `autonomy-dial` + audit ledger, `uxStatus` plugin signal, `DESIGN.md` tokens pin, static `dashboard` (`npm run dashboard`), 3 routing probes. Router stays 5109B.
- Global install/update script (`npm run install:global`): copies the suite to
  `~/.config/opencode/`, prunes only previously-installed files that left the
  repo (manifest-tracked; user files untouched). Refresh any PC with
  `git pull && npm run install:global`.
- Empirical research mode: `research-protocol` skill (freeze → execute →
  evidence → amend; null/negative outcomes count as completed research),
  stdlib-only `scripts/research/` (`protocol.mjs` + `cluster.mjs`: streaming
  sha256 digests, 4-field score-cache binding, protocol lock, outcome taxonomy,
  run log + amendment gate, O_EXCL device locks, deterministic clustering,
  CLI), installer ships `scripts/research` globally with
  env → local → global → bundled discovery. Research route in the router,
  research-mode section in `autonomous-loop`, source-audit workflow in
  `acquiring-capabilities`. Closeout: fail-closed locks, release tokens, PID
  validation, evidence-bundle check. Router bootstrap 5029 B (≤5116).
  Patterns adapted (no code copied) from UKGovernmentBEIS/inspect_ai@a1dbea8
  and microsoft/RD-Agent@484776c (MIT).
- Orchestration/reliability hardening: stdlib-only `scripts/research/phase.mjs`
  phase ledger — checkpoints informational (no user-mediated "continue" per
  chunk), launch gated on the live clock against persisted absolute UTC
  deadlines and the required observation allowance, resume preserving deadline
  and cumulative usage, expired phases staying closed (a further phase needs its
  own approval record), cumulative/phase limits enforced, recovery denied by
  default (explicit narrow task+phase+action approval required; step-zero crash
  never self-authorizes; uncertain outcomes block re-dispatch until reconciled),
  delegation scope subset rule, and an atomic durable handoff that fails closed
  on malformed state (size-capped reads, credential-shape scan, strict phase
  identity checks). Referenced by `autonomous-loop`, `research-protocol`,
  `managing-tasks`, `dispatching-parallel-agents`, and the `orchestrator`
  agent — instruction layer only; no runtime hook yet (D-011). 20 offline
  scenarios in `tests/scripts/research/test-phase.mjs`.
- Colab lifecycle capability: `colab-lifecycle` skill — pinned capability audit
  (the official `colab-mcp` server is a proxy: notebook cells only, no
  allocation/status/shutdown/compute-unit API), five separate session-state
  dimensions, five-part workload envelope, release-evidence ladder
  (`REQUESTED` / `VERIFIED_RELEASED` / `UNVERIFIED_POSSIBLY_ALLOCATED`),
  ownership ledger, incident protocol, credential hygiene, and an explicit
  enforced-vs-advisory split. Deterministic core `lib/lifecycle.mjs` (pure,
  zero-dep, 13 mock-tested scenarios) plus plugin guards refusing bridge/kernel
  kills as a teardown substitute and `rm -r /content` (runtime stays allocated
  / unexported artifacts lost). Release path is the official
  `google.colab.runtime.unassign()` in an approved cell. Description-triggered,
  no router growth (bootstrap still 5029 B ≤5116).

## 1.0.0 - 2026-10-04

Initial tagged baseline. Reconstructed from git history before this date.

### Added
- Router (`using-sdlc-lean`) with intent inference, auto-routing, and the
  seven-rung lean ladder.
- Feature, bugfix, refactor, and security-audit pipelines (commands + skills).
- 25 skills including brainstorming, writing/executing plans, TDD,
  systematic-debugging, verification, review in/out, lean-review, security,
  performance, schemas, release notes, worktrees, parallel agents,
  managing-tasks, communicating-concisely, acquiring-capabilities, deep-research,
  writing-skills, and diagnosing-sdlc.
- 7 subagents: explorer, researcher, planner, implementer, test-writer,
  code-reviewer, security-reviewer.
- Zero-dependency OpenCode plugin (V1 + V2): per-session bootstrap injection,
  activation status/toast, and always-on safety guards.
- Static skill lint (`scripts/validate-skills.mjs`) and plugin/safety tests.
- Dogfood eval and cited deep-research report.
