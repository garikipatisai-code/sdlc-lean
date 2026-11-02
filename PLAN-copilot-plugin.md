---
spec: GitHub Copilot Agent Plugins 1.0 package at plugins/copilot/sdlc-lean/ — plugin.json manifest, README.md, verbatim copies of all 40 .opencode/skills/*/SKILL.md, and ports of all 8 .opencode/agents/*.md as com.github.copilot/agents/*.agent.md. .opencode/ fully undisturbed (no edits to any existing file, scripts/, tests/, package.json).
status: approved
approved_by: human (scope + plan approval)
approved_at: 2026-11-01T00:00:00Z
files:
  - plugins/copilot/sdlc-lean/plugin.json
  - plugins/copilot/sdlc-lean/README.md
  - plugins/copilot/sdlc-lean/skills/acquiring-capabilities/SKILL.md
  - plugins/copilot/sdlc-lean/skills/adr/SKILL.md
  - plugins/copilot/sdlc-lean/skills/autonomous-loop/SKILL.md
  - plugins/copilot/sdlc-lean/skills/autonomy-dial/SKILL.md
  - plugins/copilot/sdlc-lean/skills/brainstorming/SKILL.md
  - plugins/copilot/sdlc-lean/skills/colab-lifecycle/SKILL.md
  - plugins/copilot/sdlc-lean/skills/communicating-concisely/SKILL.md
  - plugins/copilot/sdlc-lean/skills/deep-research/SKILL.md
  - plugins/copilot/sdlc-lean/skills/dependency-upgrade/SKILL.md
  - plugins/copilot/sdlc-lean/skills/diagnosing-sdlc/SKILL.md
  - plugins/copilot/sdlc-lean/skills/dispatching-parallel-agents/SKILL.md
  - plugins/copilot/sdlc-lean/skills/evolving-schemas/SKILL.md
  - plugins/copilot/sdlc-lean/skills/executing-plans/SKILL.md
  - plugins/copilot/sdlc-lean/skills/exploring-codebase/SKILL.md
  - plugins/copilot/sdlc-lean/skills/finishing-a-development-branch/SKILL.md
  - plugins/copilot/sdlc-lean/skills/frontend-design/SKILL.md
  - plugins/copilot/sdlc-lean/skills/incident-postmortem/SKILL.md
  - plugins/copilot/sdlc-lean/skills/intent-preview/SKILL.md
  - plugins/copilot/sdlc-lean/skills/investigating-performance/SKILL.md
  - plugins/copilot/sdlc-lean/skills/lean-review/SKILL.md
  - plugins/copilot/sdlc-lean/skills/managing-tasks/SKILL.md
  - plugins/copilot/sdlc-lean/skills/option-selection/SKILL.md
  - plugins/copilot/sdlc-lean/skills/receiving-code-review/SKILL.md
  - plugins/copilot/sdlc-lean/skills/requesting-code-review/SKILL.md
  - plugins/copilot/sdlc-lean/skills/research-protocol/SKILL.md
  - plugins/copilot/sdlc-lean/skills/reverse-engineering/SKILL.md
  - plugins/copilot/sdlc-lean/skills/reviewing-security/SKILL.md
  - plugins/copilot/sdlc-lean/skills/simplified-technical-english/SKILL.md
  - plugins/copilot/sdlc-lean/skills/subagent-driven-development/SKILL.md
  - plugins/copilot/sdlc-lean/skills/systematic-debugging/SKILL.md
  - plugins/copilot/sdlc-lean/skills/test-driven-development/SKILL.md
  - plugins/copilot/sdlc-lean/skills/threat-model/SKILL.md
  - plugins/copilot/sdlc-lean/skills/ui-review/SKILL.md
  - plugins/copilot/sdlc-lean/skills/using-git-worktrees/SKILL.md
  - plugins/copilot/sdlc-lean/skills/using-sdlc-lean/SKILL.md
  - plugins/copilot/sdlc-lean/skills/verification-before-completion/SKILL.md
  - plugins/copilot/sdlc-lean/skills/web-game-development/SKILL.md
  - plugins/copilot/sdlc-lean/skills/writing-plans/SKILL.md
  - plugins/copilot/sdlc-lean/skills/writing-release-notes/SKILL.md
  - plugins/copilot/sdlc-lean/skills/writing-skills/SKILL.md
  - plugins/copilot/sdlc-lean/com.github.copilot/agents/orchestrator.agent.md
  - plugins/copilot/sdlc-lean/com.github.copilot/agents/explorer.agent.md
  - plugins/copilot/sdlc-lean/com.github.copilot/agents/researcher.agent.md
  - plugins/copilot/sdlc-lean/com.github.copilot/agents/planner.agent.md
  - plugins/copilot/sdlc-lean/com.github.copilot/agents/implementer.agent.md
  - plugins/copilot/sdlc-lean/com.github.copilot/agents/test-writer.agent.md
  - plugins/copilot/sdlc-lean/com.github.copilot/agents/code-reviewer.agent.md
  - plugins/copilot/sdlc-lean/com.github.copilot/agents/security-reviewer.agent.md
allow:
  - PLAN-copilot-plugin.md
  - /tmp/opencode/copilot-plugin-verify.json
---

## Goal
Ship a self-contained, installable GitHub Copilot Agent Plugin (`copilot plugin install ./plugins/copilot/sdlc-lean`) that exposes sdlc-lean's skills and agents to Copilot, alongside (not replacing) OpenCode. `.opencode/` is fully undisturbed — zero edits to any existing file.

## Architecture
One new plugin tree, `plugins/copilot/sdlc-lean/`, following the Agent Plugins 1.0 layout:
- `plugin.json` — manifest (schema-allowed keys only).
- `README.md` — install, usage, honest limitation note.
- `skills/<name>/SKILL.md` — verbatim copies of the 40 `.opencode/skills` skills (copies, not symlinks, so the plugin installs standalone; `.opencode/skills/` remains the source of truth).
- `com.github.copilot/agents/<name>.agent.md` — the 8 `.opencode/agents` ports with Copilot frontmatter (`name`, `description`, `tools`).
No shared code, no build step, no dependencies; nothing in `.opencode/`, `scripts/`, `tests/`, or `package.json` is touched.

## Tech Stack
Markdown, JSON, shell/git for verification. No new npm/runtime dependencies.

## Spec (approved scope)
Option 1 — Agent Plugins 1.0 package: `plugin.json` with `$schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json"`, name `sdlc-lean`, version `1.0.0`, description, author, license `MIT`, keywords; 40 verbatim skill copies; 8 agent ports with frontmatter; README with install (`copilot plugin install ./plugins/copilot/sdlc-lean`), usage (`/skills list`, `/agent`), and an honest limitation note: Copilot gets skills/agents as guidance only — spec-gate + safety enforcement stays OpenCode-only.

## Global / Lean Constraints
- Only NEW files under `plugins/copilot/sdlc-lean/`; `.opencode/` and all existing files untouched.
- 3–7 prioritized, dependency-ordered, bite-sized tasks.
- Every task has one verifiable outcome with an external CLI verification command — never "reviewed it".
- Files frontmatter must cover every created file (scope block complete).

## Review Focus
- Skill copies are byte-verbatim — no rewording or added frontmatter.
- Agent ports preserve original behavior content; only frontmatter (`name`, `description`, `tools`) is added.
- `plugin.json` keys limited to the Agent Plugins 1.0 allowlist.
- README limitation note must not overclaim Copilot enforcement (spec-gate/safety remain OpenCode-only).
- `git status` must show only untracked new files under `plugins/copilot/sdlc-lean/`.

| # | Task | Spec req | Files | Test | Expected | Verify |
|---|------|----------|-------|------|----------|--------|
| 1 | Create plugin.json + README.md | Manifest per Agent Plugins 1.0 schema ($schema, name, version, description, author, license, keywords); README with install/usage/limitation sections | `plugins/copilot/sdlc-lean/plugin.json`, `plugins/copilot/sdlc-lean/README.md` | `python3 -m json.tool plugins/copilot/sdlc-lean/plugin.json`; grep for `$schema`, `name`, `version`, `license` | Valid JSON; only schema-allowed keys present; README contains install/usage/honest-limitation | `json.tool` exit 0; grep hits for each required key |
| 2 | Port 40 skills verbatim (batch copy) | Copy all 40 `.opencode/skills/<n>/SKILL.md` → `plugins/copilot/sdlc-lean/skills/<n>/SKILL.md`, unedited | `plugins/copilot/sdlc-lean/skills/*/SKILL.md` (40 files) | `find plugins/copilot/sdlc-lean/skills -name SKILL.md \| wc -l`; `diff` sampled source↔copy pairs | 40 files; each byte-identical to its `.opencode/` source | count == 40; `diff`/`md5sum` match on sampled pairs |
| 3 | Port 8 agents with Copilot frontmatter | Port all 8 `.opencode/agents/*.md` → `com.github.copilot/agents/<NAME>.agent.md` with `name`, `description`, `tools` frontmatter | `plugins/copilot/sdlc-lean/com.github.copilot/agents/*.agent.md` (8 files) | `find ... -name '*.agent.md' \| wc -l`; `head -n 6` per file | 8 files; each has frontmatter containing name/description/tools | count == 8; grep `^name:`/`^description:`/`^tools:` per file |
| 4 | Verify counts + JSON validity (acceptance gate) | 50 new files total; plugin.json valid JSON; README present | all `files` listed above | `find plugins/copilot/sdlc-lean -type f \| wc -l`; `python3 -m json.tool plugin.json`; `test -f README.md` | 50 files; JSON parses; README.md exists | count == 50; all commands exit 0 |
| 5 | Confirm existing files undisturbed | Zero edits to `.opencode/`, scripts/, tests/, package.json | existing files (read-only) | `git status --porcelain` | Only `?? plugins/copilot/sdlc-lean/...` entries; no modified/deleted/renamed files | `git status --porcelain \| grep -v '^?? plugins/copilot/sdlc-lean/'` returns empty |
