# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added
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
