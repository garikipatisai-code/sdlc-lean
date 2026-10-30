// Coverage map: one entry per top-level skill and per slash command.
// Data only — no imports, no behavior, no throw. Structural evidence, not
// runtime enforcement (AC8, AC11; audit P1 "Measurement", Wave 3).
//
// Schema:
//   SKILLS[name]            = { probe | group | exempt, reason? }
//   COMMANDS[stem]          = { probe | group | exempt }
//   GENERIC_EXEMPTIONS[name] = { rule, reason }
//   CALIBRATION[probeId]    = 'uncalibrated' | 'stable' | 'unstable'
//
// Exactly one of `probe`/`group`/`exempt` per entry. `probe` names a `PROBES`
// id; `group` names a probe group containing at least one probe; `exempt`
// carries a non-empty one-line `reason`.

export const SKILLS = {
  'acquiring-capabilities': {
    exempt: true,
    reason: 'capability acquisition is a precondition; install approval is contract-only (AC2)',
  },
  adr: { probe: 'router-adr' },
  'autonomous-loop': { probe: 'routing-autonomous' },
  'autonomy-dial': {
    exempt: true,
    reason: 'manual ledger and named check; no calibrated probe',
  },
  brainstorming: { probe: 'brain-design' },
  'colab-lifecycle': {
    exempt: true,
    reason: 'live Colab needs browser/runtime; release evidence is contract-only (AC2)',
  },
  'communicating-concisely': {
    exempt: true,
    reason: 'enforced by bootstrap/activation tests, not a task probe',
  },
  'deep-research': { probe: 'brain-research' },
  'dependency-upgrade': {
    exempt: true,
    reason: 'no dedicated live probe; generic contract covers it',
  },
  'diagnosing-sdlc': {
    exempt: true,
    reason: 'post-hoc workflow; no deterministic probe',
  },
  'dispatching-parallel-agents': {
    exempt: true,
    reason: 'orchestration behavior; no deterministic probe',
  },
  'evolving-schemas': {
    exempt: true,
    reason: 'contract-only; no live probe',
  },
  'executing-plans': {
    exempt: true,
    reason: 'Wave 1/2 structural gates cover the workflow; no dedicated live probe',
  },
  'exploring-codebase': { probe: 'routing-refactor' },
  'finishing-a-development-branch': { probe: 'merge-gate' },
  'frontend-design': { probe: 'routing-frontend' },
  'incident-postmortem': { probe: 'router-incident' },
  'intent-preview': { probe: 'routing-preview' },
  'investigating-performance': {
    exempt: true,
    reason: 'no live probe; measurement is project-specific',
  },
  'lean-review': {
    exempt: true,
    reason: 'advisory review output; no deterministic probe',
  },
  'managing-tasks': {
    exempt: true,
    reason: 'state is covered by compaction/trust tests',
  },
  'option-selection': { probe: 'routing-option' },
  'receiving-code-review': {
    exempt: true,
    reason: 'covered indirectly by the execution review probe',
  },
  'requesting-code-review': { probe: 'review-disposition' },
  'research-protocol': {
    exempt: true,
    reason: 'empirical runs need a real workload; contract-only (AC2)',
  },
  'reverse-engineering': { probe: 'routing-reverse-engineering' },
  'reviewing-security': { probe: 'command-security-audit' },
  'simplified-technical-english': {
    exempt: true,
    reason: 'prose style; no deterministic probe',
  },
  'subagent-driven-development': {
    exempt: true,
    reason: 'Wave 1/2 structural gates cover orchestration; no dedicated live probe',
  },
  'systematic-debugging': { probe: 'debug-repro' },
  'test-driven-development': {
    exempt: true,
    reason: 'Wave 2 structural gate; no live probe',
  },
  'threat-model': { probe: 'router-threat-model' },
  'ui-review': { probe: 'routing-uireview' },
  'using-git-worktrees': { probe: 'worktree-baseline' },
  'using-sdlc-lean': { probe: 'activation-bootstrap' },
  'verification-before-completion': { probe: 'external-verification' },
  'web-game-development': { probe: 'routing-web-game' },
  'writing-plans': { probe: 'brain-plan' },
  'writing-release-notes': { probe: 'command-release' },
  'writing-skills': {
    exempt: true,
    reason: 'coverage rule enforced by test-eval-coverage; no model probe',
  },
};

export const COMMANDS = {
  bugfix: { probe: 'routing-bugfix' },
  feature: { probe: 'routing-feature' },
  game: { probe: 'routing-web-game' },
  preview: { probe: 'command-preview' },
  refactor: { probe: 'routing-refactor' },
  release: { probe: 'command-release' },
  'reverse-engineer': { probe: 'command-reverse-engineer' },
  'sdlc-lean': { probe: 'activation-status' },
  'security-audit': { probe: 'command-security-audit' },
};

export const GENERIC_EXEMPTIONS = {
  'managing-tasks': {
    rule: 'description-prefix',
    reason:
      'description starts "Use for work spanning sessions" (session-spanning intent, not a trigger); reword in Wave 4',
  },
};

export const CALIBRATION = {
  'external-verification': 'stable',
  'debug-repro': 'stable',
  'review-disposition': 'stable',
  'merge-gate': 'stable',
  'worktree-baseline': 'stable',
};
