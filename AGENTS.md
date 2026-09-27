# AGENTS.md — sdlc-lean repo conventions

This repo ships an OpenCode SDLC suite. It is also the fallback ruleset:
keep this file short — it loads as context.

## Structure

- `.opencode/skills/<name>/SKILL.md` — one skill per dir, `name` == dir, `Use when...` descriptions only.
- `.opencode/agents/*.md` — subagents (`mode: subagent`), no hardcoded models (inherit).
- `.opencode/commands/*.md` — slash commands, `$ARGUMENTS` for input.
- `.opencode/plugins/sdlc-lean.js` — zero-dep plugin. Keep it dependency-free.
- `scripts/validate-skills.mjs` — static lint, must pass on every skill change.
- `tests/opencode/*.mjs` — `node --test`, must pass on every plugin change.

## Rules for edits

- New skill? Follow `writing-skills`: minimal, pressure-test the trigger, run the lint.
- Plugin changes must stay V1+V2 compatible and fail open (never break activation).
- Safety guards only grow by exact-known destructive patterns; benign must pass (add a test).
- Bootstrap budget: <5KB. Skill bodies stay on-demand, never injected.
