---
description: Report sdlc-lean status - activation proof, plugin presence, and installed skills/agents/commands
---

Deterministic check (read-only, change nothing):

!`echo "last activation: $(cat "${XDG_STATE_HOME:-$HOME/.local/state}/sdlc-lean/status.json" 2>/dev/null || echo none)"; echo "project skills: $(find .opencode/skills -name SKILL.md 2>/dev/null | wc -l)"; echo "global skills: $(find $HOME/.config/opencode/skills -name SKILL.md 2>/dev/null | wc -l)"; echo "agents: $(find .opencode/agents $HOME/.config/opencode/agents -name '*.md' 2>/dev/null | wc -l)"; echo "commands: $(find .opencode/commands $HOME/.config/opencode/commands -name '*.md' 2>/dev/null | wc -l)"; echo "plugin: $(find .opencode/plugins $HOME/.config/opencode/plugins -name sdlc-lean.js 2>/dev/null | tr '\n' ' ')"`

Report in at most 5 lines: whether the last activation was recorded (timestamp +
session + skill count) — this proves the plugin injected; whether the plugin is
installed (project or global); and the skill/agent/command counts. Then the
activation signals to watch for: a one-time `sdlc-lean active` toast in the TUI,
and a `Using <skill>` announce on the first routed task. End with how to force a
pipeline (`/feature`, `/bugfix`, `/refactor`, `/security-audit`).
