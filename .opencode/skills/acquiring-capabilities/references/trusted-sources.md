# Trusted sources for capabilities

Search the fast path first, inspect before trusting. This list is deliberately
small and curated — adding to it requires a maintainer-visible source.

## Verified — official / curated

| Source | What it provides | How to use |
|---|---|---|
| https://opencode.ai/docs/ecosystem | OpenCode plugins, tools, SDKs | `webfetch`; install via `opencode.json` `plugin` |
| https://github.com/anthropics/skills | Official Anthropic skills | `gh skill install anthropics/skills <name>` or copy `skills/<name>/` |
| https://github.com/obra/superpowers | Workflow skills (vendored here) | `gh skill install obra/superpowers` |
| https://github.com/awesome-opencode/awesome-opencode | Curated OpenCode plugins/agents | `webfetch`; follow each entry's repo |
| https://github.com/wshobson/agents | 200+ agents/skills, multi-harness | `gh skill install wshobson/agents <skill>` |
| npm registry, keyword `opencode-plugin` | Published OpenCode plugins | `opencode plugin <pkg> --global` |

## Established — require approval before install

Criteria: ≥1k stars, commit within ~6 months, MIT/Apache-2.0 (or similar),
identifiable maintainer, readable source. Verify with:

```sh
gh repo view <owner>/<repo> --json stargazerCount,licenseInfo,pushedAt,description
```

Only after the human approves: inspect the manifest for lifecycle hooks, pin an
exact version or commit, prefer vendoring the file(s) into the project.

## Unknown — inspect only, never auto-install

Anything not meeting the above. Read it, summarize risk, hand the decision to
the human.

## Where things install (OpenCode)

| Artifact | Project | Global |
|---|---|---|
| Skill | `.opencode/skills/<name>/SKILL.md` | `~/.config/opencode/skills/` |
| Agent | `.opencode/agents/<name>.md` | `~/.config/opencode/agents/` |
| Command | `.opencode/commands/<name>.md` | `~/.config/opencode/commands/` |
| Plugin (local) | `.opencode/plugins/<file>.js` | `~/.config/opencode/plugins/` |
| Plugin (npm) | `opencode.json` → `"plugin": ["<pkg>"]` | global `opencode.json` |
| MCP server | `.opencode`/`opencode.json` config | global `opencode.json` |

## Solving code problems (reuse, don't reinvent)

Authoritative, in order: the project's own patterns → language stdlib docs →
official framework docs → MDN (web) → well-known reference repos. Cite the
source next to adapted code.
