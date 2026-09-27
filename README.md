# sdlc-lean

A generic OpenCode SDLC suite for any project: all of superpowers' workflow
discipline, filtered through ponytail's leanness — plus the best ideas from
the wider agent ecosystem. Balanced enforcement: gates exist, all escapable
with explicit justification, except safety guards which stay on.

## Install

**Project-local** (this repo is the source of truth):

```sh
cp -r .opencode /path/to/your-project/
```

Restart OpenCode. Verify: say `let's build a date picker` → it routes to
`brainstorming` on its own. No modes, no setup questions — the router
infers intent (feature/bugfix/refactor/security-audit) and scrutiny
(trivial/standard/architectural) from the request itself.

**Global** (every project):

```sh
cp -r .opencode/skills/* ~/.config/opencode/skills/
cp -r .opencode/agents/* ~/.config/opencode/agents/
cp -r .opencode/commands/* ~/.config/opencode/commands/
mkdir -p ~/.config/opencode/plugins && cp .opencode/plugins/sdlc-lean.js ~/.config/opencode/plugins/
```

No dependencies. Works on OpenCode V1 (1.18.x, verified) and V2 (dual export).

Pair with [snip](https://github.com/edouard-claude/snip) (`opencode-snip`)
for 60–90% shell-output token savings — complementary, not bundled.

## What's inside

| Area | Contents |
|---|---|
| Skills (22) | router, brainstorming, writing-plans, worktrees, sdd/executing-plans, TDD, debugging, verification, review in/out, finish-branch, parallel-agents, writing-skills, diagnosing, lean-review, security, performance, schemas, release-notes, exploring-codebase, managing-tasks |
| Agents (6) | implementer, planner, code-reviewer, test-writer, explorer, security-reviewer |
| Commands (4) | `/feature`, `/bugfix`, `/security-audit`, `/refactor` — pre-wired pipelines the router invokes automatically |
| Plugin | per-session bootstrap, auto-routing, safety guards |

## Auto-routing

There is nothing to configure. The router skill classifies each request and
runs the matching pipeline (feature → brainstorm → plan → execute → review →
verify; bug → reproduce → root-cause → fix → confirm; etc.), scaling scrutiny
to the weight of the task. Safety carve-outs (trust-boundary validation,
data-loss handling, security, accessibility) stay on for everything.

## Verify

```sh
node scripts/validate-skills.mjs   # static skill lint
node --test "tests/opencode/*.mjs" # plugin + safety tests
```

See `eval/results/2026-09-27-dogfood.md` for live-harness verification.

## Credits

Built on patterns from MIT-licensed upstream work:
[obra/superpowers](https://github.com/obra/superpowers) (workflow + plugin skeleton),
[DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) (lean ladder + modes),
plus ideas from wshobson/agents, ClaudeTools/marketplace, osmontero/opencode-skills,
opencode-snip, and the awesome-opencode ecosystem. See LICENSE.
