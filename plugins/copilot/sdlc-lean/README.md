# sdlc-lean — GitHub Copilot Agent Plugin

A self-contained [Agent Plugins 1.0](https://agent-plugins.org/plugin-authors) package that exposes sdlc-lean's skills and agents to GitHub Copilot CLI, **alongside (not replacing) OpenCode**.

## Install

```bash
copilot plugin install ./plugins/copilot/sdlc-lean
```

## Usage

In a Copilot CLI session:

```copilot
/plugin list
/skills list
/agent
```

Invoke any sdlc-lean skill as a Copilot skill, or select a sdlc-lean agent (`orchestrator`, `explorer`, `researcher`, `planner`, `implementer`, `test-writer`, `code-reviewer`, `security-reviewer`) for a specialized role.

## What's included

- **40 skills** — copied verbatim from `.opencode/skills/` (`.opencode/` remains the source of truth for OpenCode).
- **8 agents** — ported from `.opencode/agents/` with Copilot frontmatter (`name`, `description`, `tools`).

## Limitation (honest)

Copilot receives the skills and agents as guidance. The sdlc-lean **spec gate and safety guards are enforced only under OpenCode** — Copilot CLI has no equivalent plugin hook system to enforce them. OpenCode remains the enforcement host; this plugin makes the same skill/agent content available to Copilot.

## OpenCode is untouched

Zero files under `.opencode/`, `scripts/`, `tests/`, or `package.json` were modified. Install this plugin independently with `copilot plugin install`.
