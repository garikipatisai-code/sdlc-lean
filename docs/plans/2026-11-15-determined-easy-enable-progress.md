> SUPERSEDED — preserved-as-is (historical ledger; 715-pass historical Nov 15, current green 444/0 life-better).
> Do not rewrite rows; see evidence.json _superseded_note.
# Progress ledger — determined easy-enable

Plan: docs/plans/2026-11-15-determined-easy-enable.md (gate e7ef97ce5828)
Spec: docs/specs/2026-11-14-determined-execution.md
Allowed write: docs/plans/2026-11-15-determined-easy-enable-progress.md only (evidence.json published in closeout commit)

- T1: session override done — flag source session (unset/off) > DETERMINED_EXECUTION=1 > default-off, try/catch -> false (.opencode/plugins/sdlc-lean.js)
- T2: command doc done — .opencode/commands/determined.md references T1 flag-source API
- T3: skill done — .opencode/skills/autonomous-loop/SKILL.md "easy-enable" gated-only wording
- T4: coverage done — eval/coverage.mjs + tests/opencode/test-eval-coverage.mjs (eval exempt, test 10 stems mapped, no weakening)
- Critics: Security ACCEPT, Code ACCEPT
- Suite: npm run verify exit 0 (715 pass, 0 fail)
- Gate: OK (active marker, plan/spec hashes match, all edits within allow scope)
