# Auto-tier envelope — standing pre-approval (human authorized once per goal)

<!--
  HOW TO USE (read me first — these comments are not machine-checked):
  - A human authorizes this envelope ONCE per goal. Everything inside runs
    with zero human keystrokes; anything outside stops with an escalation.
  - Fill every section. Keep paths tight: fewer files = smaller blast radius.
  - Risk in plain terms: paths bound the blast radius; reversibility guarantees
    we can undo the run; no-external-effects guarantees nothing leaves this
    machine (no publish, spend, or prod writes); budgets cap the loop.
  - Machine check: `node scripts/spec-check.mjs envelope check <this-file> --root .`
    must exit 0. It rejects absolute paths, `..` escapes, globs escaping the
    root, an empty reversibility section, and any affirmative external effect.
-->

<!-- Human risk terms: this envelope authorizes unattended local writes ONLY.
     Irreversible-external acts stay ALWAYS-human: shared-remote merge/PR,
     publish/release, spend, prod or external network writes, grader changes,
     closing while checks are red. Out-of-envelope file = stop + escalate. -->

## Paths (allowed scope, relative only)

<!--
  Rules: relative paths only. No absolute paths (`/etc/x`, `C:\x`),
  no `..` segments, no backslashes. Globs (`*`, `**`, `?`) are allowed but
  must stay inside the repo root (e.g. `../*` is rejected).
  One path per `- ` bullet. Keep the bullet to the bare path.
-->

- docs/auto-envelope.template.md
- scripts/spec-check.mjs
- .opencode/plugins/sdlc-lean.js
- docs/audit-ledger.md
- tests/scripts/test-auto-tier-machine-close.mjs
- tests/opencode/test-auto-tier-sop.mjs

## Reversibility (reversal = commit SHA per run)

<!--
  Every Auto run records its reverting commit SHA in the audit ledger
  (`date | tier | check | result | reversal`). No reversal path = no run.
-->

- reversal: git commit SHA of the reverting commit, recorded per run in the audit ledger row
- strategy: `git revert <SHA>` or `git reset --hard <SHA-before-run>` restores the tree; the SHA is captured before the run closes

## No external effects (nothing leaves this machine)

<!--
  All entries must stay denials (`no` / `never`). Any affirmative
  (`publish: yes`, `allow publish`, ...) fails validation.
-->

- publish: no — never publish or release packages from an Auto run
- release: no — no tags, no GitHub releases, no shared-remote merge/PR
- spend: no — no paid API calls beyond budget, no provisioned resources
- network-prod: no — no network writes to prod or any external system
- grader-changes: no — never edit grader assertions or pass bars to go green
- red-close: no — never close while the named check is red

## Budgets (loop caps for the unattended run)

<!--
  max-iterations caps the execute-verify-correct loop (default 3 per
  `autonomous-loop`). check names the single command that must go green
  before any machine-close. Escalate (stop, no retry) on 2x same-failure.
-->

- max-iterations: 3
- check: npm run verify
- stop-on: same check fails twice with the same output; unclear scope or reversibility; any out-of-envelope file; any external effect requested
