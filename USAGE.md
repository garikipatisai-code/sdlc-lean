# Usage

How to install, run, and customize `sdlc-lean` in OpenCode. New here? Read the
[README](README.md) first; this file is the hands-on guide.

```mermaid
flowchart LR
    A[Install .opencode] --> B[Restart OpenCode]
    B --> C[Describe work in plain language]
    C --> D[Router picks a pipeline]
    D --> E[Skills + subagents run]
    E --> F[Concise, visual result]
```

## 1. Install

**Project-local** — applies to one repo, reviewable in its diff:

```sh
cp -r .opencode /path/to/your-project/
```

**Global** — applies to every project:

```sh
cp -r .opencode/skills/*   ~/.config/opencode/skills/
cp -r .opencode/agents/*   ~/.config/opencode/agents/
cp -r .opencode/commands/* ~/.config/opencode/commands/
mkdir -p ~/.config/opencode/plugins
cp .opencode/plugins/sdlc-lean.js ~/.config/opencode/plugins/
```

Restart OpenCode after installing. No dependencies. Works on OpenCode V1
(1.18.x, verified) and V2 (dual export).

## 2. Verify it is live

Start a session and send any message. The agent should announce a skill
(e.g. *"Using brainstorming to…"*). Quick probes:

| Say this | Expected |
|---|---|
| `Let's add a date picker` | Routes to `brainstorming` (feature pipeline) |
| `This test is failing` | Routes to `systematic-debugging` (bugfix pipeline) |
| `Explain how X works` | Uses `communicating-concisely` (diagram + short prose) |

## 3. Everyday use

Nothing to select — describe the work and the router runs the pipeline.

| You want | You say | Pipeline runs |
|---|---|---|
| A new feature | *"Add CSV export to the reports page"* | explore → brainstorm → plan → TDD → review → verify |
| A bug fixed | *"Login 500s on unicode passwords"* | reproduce → root-cause → fix → confirm |
| A cleanup | *"Split this 600-line module"* | impact analysis → behavior-preserving steps |
| A security check | *"Is the upload endpoint safe?"* | read-only traced-path audit |
| A capability you lack | *"We need OCR — find a trusted option"* | trusted-source search → reuse/install |

### Pipelines as commands

Every pipeline also has an explicit slash command when you want determinism:

| Command | Flow |
|---|---|
| `/feature <what>` | explore → plan → implement → review → verify |
| `/bugfix <what>` | explore → investigate → fix → review → confirm |
| `/refactor <what>` | impact → decompose → implement → verify |
| `/security-audit [scope]` | audit → scan → dead-code → report (read-only) |

## 4. What happens automatically

- **Routing & scrutiny** — the router infers the pipeline and scales effort
  (trivial builds directly; architectural runs the full brainstorming gate).
- **Lean ladder** — every change stops at the earliest rung: need it? → reuse
  in-repo → stdlib → native → installed dep → one line → minimum code.
- **Safety guards** — destructive shell commands are blocked and `.env`/private
  keys are refused, always. Trust-boundary validation, data-loss handling,
  security, and accessibility are never cut.
- **Output contract** — replies respect a ~30-second budget and prefer mermaid
  diagrams and tables over prose walls.

## 5. Skills & agents reference

| Skills (24) | Purpose |
|---|---|
| `using-sdlc-lean` | Router: infers pipeline + scrutiny |
| `brainstorming` · `writing-plans` · `executing-plans` · `subagent-driven-development` | Feature flow: design → plan → execute |
| `test-driven-development` · `systematic-debugging` · `verification-before-completion` | Correctness gates |
| `requesting-code-review` · `receiving-code-review` · `lean-review` | Review in/out + over-engineering audit |
| `reviewing-security` · `investigating-performance` · `evolving-schemas` · `writing-release-notes` | Rigor skills |
| `using-git-worktrees` · `dispatching-parallel-agents` · `managing-tasks` | Isolation, parallelism, persistence |
| `exploring-codebase` · `acquiring-capabilities` · `communicating-concisely` | Orientation, reuse, output |
| `writing-skills` · `diagnosing-sdlc` | Meta: author skills, debug the suite |

| Agents (6) | What it does |
|---|---|
| `explorer` | Read-only codebase reconnaissance |
| `planner` | Produces bite-sized implementation plans |
| `implementer` | Executes one task with TDD |
| `test-writer` | Adds failing-first tests |
| `code-reviewer` | 4-pass diff review |
| `security-reviewer` | Exploitability-ranked findings |

Subagents inherit your configured model. Invoke one directly with `@explorer`
or let a pipeline dispatch it.

## 6. Customize

Fix the model a subagent uses:

```md
---
description: Executes one plan task with TDD, self-review, and evidence reporting
mode: subagent
model: deepseek/deepseek-flash
---
```

Restrict skills per agent (in `opencode.json`):

```json
{ "agent": { "plan": { "permission": { "skill": { "acquiring-capabilities": "deny" } } } } }
```

Add a skill: follow `writing-skills`, then run `node scripts/validate-skills.mjs`.

## 7. Safety & trust

`acquiring-capabilities` gates third-party code by trust tier — verified
installs directly, established needs approval after a security review, unknown
is inspect-only. Trusted sources and install paths:
[`.opencode/skills/acquiring-capabilities/references/trusted-sources.md`](.opencode/skills/acquiring-capabilities/references/trusted-sources.md).

## 8. Update / uninstall

Re-copy `.opencode` from a fresh clone to update. To uninstall, delete the
copied `skills/`, `agents/`, `commands/` entries and the plugin file; remove
the plugin entry from `opencode.json` if you added one.

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| No skill announced | Confirm `.opencode/skills/*/SKILL.md` exists and restart |
| `/feature` missing | Commands must be in `.opencode/commands/` or `~/.config/opencode/commands/` |
| Plugin not loading | Check the file is `.opencode/plugins/sdlc-lean.js`; V2 needs the repo root to contain `index.js` only if installed as a package |
| Wrong pipeline chosen | Be explicit (`/bugfix …`) — free-text routing is model-dependent |

## 10. Develop / verify

```sh
node scripts/validate-skills.mjs   # static skill lint
node --test "tests/opencode/*.mjs" # plugin, budget, and safety tests
```

Live-harness evidence: [`eval/results/`](eval/results/).
