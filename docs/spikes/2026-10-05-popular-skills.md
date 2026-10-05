# Most popular AI skills + plugins — clone targets (Oct 2026)
_2026-10-05 · depth: standard · sources_reviewed: 20 · confidence: medium-high_

## Executive summary
- #1 clone target is `anthropics/skills#frontend-design` (~954K installs tracker est., 179.7K repo stars) Apache-2.0 — adapt with attribution, not from memory [1][4][5].
- #2 is `vercel-labs/agent-skills#web-design-guidelines` (~699K installs, 31.9K stars) MIT plus `react-best-practices` in same repo — vendor after security review [8][12].
- Largest OpenCode harness `oh-my-openagent` (69.8K stars) is SUL-1.0 — inspiration-only, do NOT copy code [9][10].
- SOTA agent UX to reimplement (no code copy): Claude plan mode (Shift+Tab, Ctrl+G), Cursor Projects coordinator + VMs, Codex focused diff, Copilot steer, verification-gated autonomy [15][16][17][18].
- shadcn (125.1K stars MIT) via MCP + v0 Design Systems 2.0 adapter pattern — reuse protocol, don't invent tokens [13][14][20].

## UI/UX skill leaders

`frontend-design` is the canonical UI skill: aesthetic direction + typography, bans 5 generic AI defaults, plan → review → build → critique [4][5]. `canvas-design` (114.1K) generates gallery-quality PDF/PNG artifacts [6]. `web-artifacts-builder` (106.3K) targets React 18+TS+Vite+Tailwind+shadcn 40+ components bundled to single HTML for artifacts [7]. Vercel's `web-design-guidelines` fetches `command.md` fresh each run and emits terse `file:line` findings [8][12]. Same repo holds `react-best-practices` (40+ React/Next perf rules, 8 categories) [12].

| Skill | Signal | License | Tier | Action |
|---|---|---|---|---|
| anthropics/frontend-design | 954K inst, 179.7K stars [1][5] | Apache-2.0 (many) | Verified | Clone/adapt with attribution |
| vercel/web-design-guidelines | 699K inst, 31.9K stars [8][12] | MIT | Established→approved | Vendor + per-run fetch |
| vercel/react-best-practices | part of 31.9K-star repo [12] | MIT | Established→approved | Vendor |
| shadcn skills + MCP | 125.1K stars parent [13][14] | MIT | Verified pattern | Reuse via MCP, pin `components.json` |
| canvas-design | 114.1K inst [6] | SPDX unverified | Established | Inspect SKILL.md, then adapt |
| web-artifacts-builder | 106.3K inst [7] | SPDX unverified | Established | Inspect, adapt single-HTML pattern |

## OpenCode plugin leaders

`oh-my-openagent` (ex `oh-my-opencode`) is the largest harness: background agents, LSP/AST/MCP tools, 33K weekly npm downloads [9][10]. `obra/superpowers` (295.3K stars cross-harness) is the workflow methodology already vendored here [11]. Official ecosystem lists daytona, codex/gemini/antigravity-auth, devcontainers, morph-fast-apply, tavily, firecrawl, scheduler, supermemory, micode, octto — curated but unranked [11]. `opencodeskills.dev` has 156 MIT skills but popularity unverified [11]. `kdcokenny/opencode-workspace` (586 stars) is archived — do not clone [11].

| Plugin | Signal | License | Tier | Action |
|---|---|---|---|---|
| oh-my-openagent | 69.8K stars, 33K/wk [9][10] | SUL-1.0 | Unknown (non-permissive) | Inspiration-only, rewrite |
| obra/superpowers | 295.3K stars [11] | MIT | Verified (vendored) | Already have; diff for gaps |
| ecosystem curated | Oct 3 2026 list [11] | mixed | Verified source | Pick per need, pin version |

## SOTA agent UX patterns (reimplement, no copy)

Plan-approval is standard: Claude `Shift+Tab` plan mode (read-only), `Ctrl+G` edit plan in editor, skip if one-sentence diff [15]. Cloud async: Cursor Projects coordinator → parallel agents on own VMs; Copilot researches/plans/iterates on branch → PR; Codex IDE → Cloud delegation [16][18]. Teams: isolated context per subagent, `/batch` 5–30, Writer/Reviewer [16]. Diff UX: Codex summary + focused diff beside code, keep-only-wanted; Copilot ready-to-apply suggestions per commit/PR [17]. Steering: Cursor follow-ups wait for next tool call, `/goal` long-lived objective, `/loop` check-ins [16]. Autonomy gate: runnable check (tests/build/lint/screenshot), iterate until pass via prompt/`/goal`/Stop hook/fresh-context verifier [15].

Adoption context: Claude Code 39% work usage / 31% main tool; 90% use agents weekly, 68% daily; Codex 3%→16%, Copilot 29%→21%, Cursor 18%→12%, OpenCode 7% [16].

## Key takeaways
- Clone now (permissive + attribution): frontend-design, web-design-guidelines, react-best-practices, shadcn MCP pattern, web-artifacts single-HTML.
- Rewrite from description only: autonomy-dial, intent-preview, audit-undo, Projects-coordinator, cloud-delegation — proprietary UX, no code copy.
- Never copy: `docx/pdf/pptx/xlsx` (source-available, not OSS) [2]; SUL-1.0 harness code [9]; shadcn Figma commercial skills [20].
- Pin `DESIGN.md` + `tokens.css` + `--font-*` to survive upstream churn (Radix→Base UI Jul 2026 lesson).

## Conflicts and gaps
- Install counts are skills.sh tracker estimates, not vendor-official; Anthropic publishes no installs — treat 954K/699K as medium confidence [5][8].
- `frontend-design` exact SPDX not verified on page; parent `anthropics/skills` is mixed Apache-2.0 + source-available [1][4].
- Per-skill licenses for canvas/web-artifacts, npm downloads for small `opencode-*` plugins, `/commands` ranking — insufficient data found.
- Canvas/Windsurf specifics — insufficient data found within budget.

## Sources
1. anthropics/skills repo — https://github.com/anthropics/skills
2. Claude Agent Skills overview — https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
3. anthropics/claude-code frontend-design SKILL.md — https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md
4. skills.sh anthropics/skills index — https://skills.sh/anthropics/skills
5. skills.sh frontend-design — https://skills.sh/anthropics/skills/frontend-design
6. skills.sh canvas-design — https://skills.sh/anthropics/skills/canvas-design
7. skills.sh web-artifacts-builder — https://skills.sh/anthropics/skills/web-artifacts-builder
8. skills.sh web-design-guidelines — https://skills.sh/vercel-labs/agent-skills/web-design-guidelines
9. oh-my-openagent repo — https://github.com/code-yeongyu/oh-my-openagent
10. oh-my-opencode npm — https://www.npmjs.com/package/oh-my-opencode
11. obra/superpowers + OpenCode ecosystem + catalogs — https://github.com/obra/superpowers ; https://opencode.ai/docs/ecosystem/ ; https://github.com/kdcokenny/opencode-workspace ; https://opencodeskills.dev/ ; https://www.firecrawl.dev/blog/best-opencode-skills
12. vercel-labs/agent-skills repo — https://github.com/vercel-labs/agent-skills
13. shadcn skills docs — https://ui.shadcn.com/docs/skills
14. shadcn-ui/ui repo — https://github.com/shadcn-ui/ui
15. Claude Code best practices — https://code.claude.com/docs/en/best-practices
16. Cursor changelog — https://cursor.com/changelog
17. Codex IDE docs — https://learn.chatgpt.com/docs/codex/ide
18. Copilot agents how-to — https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents
19. shadcn MCP docs — https://ui.shadcn.com/docs/mcp
20. v0 Design Systems 2.0 — https://v0.app/docs/design-systems-2
