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
- Eval probes for autonomous-routing and option-selection triggers.

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
