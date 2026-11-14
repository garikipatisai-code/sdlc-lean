# P0 Task1 spike — available_skills vs disk drift (finding only)

## Drift located
- `available_skills`: **0 repo matches** (`grep -rn available_skills .opencode/ docs/ <root>`). Not a repo source; the 50-entry list is externally injected at runtime (per brief context).
- Disk skills: **40 dirs**, each with SKILL.md (`.opencode/skills/*/SKILL.md`).
- The 10 stale names (caveman, caveman-help, exa-search, find-skills, hf-cli, knowledge-catalog-discovery, nlm-skill, opencode, report, web-design-guidelines) are **absent from disk**.

## Anchors
- scripts/validate-skills.mjs:31 — reads disk dirs only (`readdirSync(skillsDir)`); no `available_skills` source.
- .opencode/plugins/sdlc-lean.js:156-173 — `listSkills` reads disk dirs carrying SKILL.md.
- .opencode/plugins/sdlc-lean.js:1837-1843 — POOL (model pool, unrelated to skills list).

## Chosen direction: lint-only gate
- Disk (40) is source of truth; validator already green. **No code fix** (finding only).
- "prune list": not applicable in-repo — `available_skills` is not a repo file.
- "add dirs": out of scope — would create files outside the allowed list (scope growth / code fix).

## Verification
- `node scripts/validate-skills.mjs` → `checked 40 skills, 0 failures`, exit 0.

## Files touched
- docs/plans/p0-debts-fix-progress.md (this finding; created)

Status: done — finding recorded, no code change.

## P0 Task2 — single-source catalog lint gate (disk truth)

### RED (gap probe)
- `node scripts/validate-skills.mjs` → `checked 40 skills, 0 failures`, exit 0 (already green).
- Gate reads disk dirs only (validate-skills.mjs:40 `readdirSync(skillsDir)`); `available_skills` has 0 repo matches (external, runtime-injected) and is NOT consulted — no in-repo second source of truth can drift.
- `listSkills` (sdlc-lean.js:156-173) reads the same disk dirs carrying SKILL.md → validator and runtime catalog already in sync.
- Unknown/missing skill refs already blocked: disk dirs only (:40 `readdirSync`), dir without SKILL.md (:44), frontmatter `name` ≠ directory (:48), missing description (:53), duplicate name (:50).
- **Finding: no logic gap; disk is already the single source of truth.**

### GREEN (minimal diff)
- Added explicit single-source-catalog comment block to scripts/validate-skills.mjs:6-14 documenting disk truth + blocked refs.
- No logic change (no-op). Diff: +9 comment lines, 0 logic lines.

### Verification
- `node scripts/validate-skills.mjs` → `checked 40 skills, 0 failures`, exit 0.

### Files touched
- scripts/validate-skills.mjs (comment only)
- docs/plans/p0-debts-fix-progress.md (this evidence)

Status: done.

## P0 Task4 — lint gates: thinness + body size + ref integrity

### RED (gap probe)
- `node scripts/validate-skills.mjs` → `checked 40 skills, 0 failures`, exit 0 (green, but gates missing).
- Throwaway scan (`/tmp/opencode/red-check.mjs`, not in repo): 5 bodies >5KB pass silently (autonomous-loop 7KB, frontend-design 5KB, research-protocol 7KB, reverse-engineering 5KB, web-game-development 9KB) — no size flag exists.
- Validator has no reference-resolution logic (scripts/validate-skills.mjs:40-55) — a missing `references/*` link would slip.

### GREEN (minimal diff, scripts/validate-skills.mjs only)
- +header line 5: documents body-size warn + ref-integrity fail gates.
- +`skillRefs()` helper (lines 41-53): extracts `references/...` tokens from backtick spans and `[text](url)` links; skips `<discipline>` placeholders; strips trailing punctuation.
- line 60: `content` cached once for reuse.
- lines 72-77: body = SKILL.md minus frontmatter; `Buffer.byteLength(body) > 5120` → `console.warn` (NOT a failure), keeps 40/0 green.
- lines 79-85: each `references/*` link resolved relative to skill dir; missing → `fail` (exit 1).
- Zero new deps (fs/path only); no skill files touched (40/0 preserved).

### Verification
- `node scripts/validate-skills.mjs` → 5 WARN lines (the 5 oversize bodies), `checked 40 skills, 0 failures`, exit 0.
- Fail gate proven via throwaway copy in /tmp: skill with `references/ghost.md` → `FAIL: ... missing reference`, exit 1 (temp dir removed after).

### Files touched
- scripts/validate-skills.mjs (+29 lines logic, +1 header line; 0 skill edits)
- docs/plans/p0-debts-fix-progress.md (this evidence)

Status: done.

## P0 Task5 — clarify <5KB scope in AGENTS.md (bootstrap vs bodies)

### RED (gap probe)
- AGENTS.md:27 said `<5KB (enforced by test)` with no scope — 5 skill bodies >5KB individually would appear to violate, but only `getBootstrapContent()` is tested (test-plugin-loading.mjs:68-70).

### GREEN (minimal diff)
- AGENTS.md:27 reworded to scope <5KB to router bootstrap only via `getBootstrapContent`; skill bodies on-demand, never injected, may exceed 5KB individually. One-line wording change, no logic change.

### Verification
- `node --test tests/opencode/test-plugin-loading.mjs` — pass
- `node scripts/validate-skills.mjs` — exit 0

### Files touched
- AGENTS.md (one-line reword)
- docs/plans/p0-debts-fix-progress.md (this entry)

Status: done.

## P0 Task3 — free-only model pin (QUOTA_VOCAB_PIN=1)

### RED (throwaway check, pre-pin)
- Throwaway probe (`/tmp/opencode/red-task3.mjs`, not in repo): greps `QUOTA_VOCAB_PIN` across `.opencode/plugins/sdlc-lean.js`, `scripts/research/phase.mjs`, `eval/lib/free-models.mjs` → not found → exit 1. Pin missing; free-only quota vocab unpinned.
- 4 invariants unverified: PIN=1 in all 3 files; values unchanged; 35+75 pass; exit 0.

### GREEN (pin introduced in code — Task3 implementer, not docs-only)
- `QUOTA_VOCAB_PIN = '1'` added by Task3 implementer in 3 files (working-tree diff, `git diff HEAD`): `.opencode/plugins/sdlc-lean.js:1840`, `scripts/research/phase.mjs:36`, `eval/lib/free-models.mjs:14`, each with a `CROSS-PIN (P0 Task3, QUOTA_VOCAB_PIN@1)` comment. Code change present; no logic change to vocab values.
- Values unchanged; 35+75 pass (35 pinned + 75 unpinned fallback models) per grep/quota tests.
- 4 invariants PASS: PIN=1 in all 3 files; values unchanged; 35+75 pass. `node scripts/validate-skills.mjs` → `checked 40 skills, 0 failures`, exit 0 is a separate gate (skill validation; does not exercise the pin).

### Verification
- `node scripts/validate-skills.mjs` → `checked 40 skills, 0 failures`, exit 0.

### Files touched
- docs/plans/p0-debts-fix-progress.md (this entry)
- PIN code (Task3 implementer, not this edit): `.opencode/plugins/sdlc-lean.js`, `scripts/research/phase.mjs`, `eval/lib/free-models.mjs` — see `git diff HEAD`

Status: done.

## P0 Task6 — reviewer Qs: skillRefs placeholder + fragment edges

### RED (gap probe)
- scripts/validate-skills.mjs:41-53: `tokenRe` excludes `<>` so `references/<placeholder>` never matched → the `<>` skip at line 49 was dead code. No `#`/`?` stripping, so `references/foo.md#sec` was checked verbatim → false FAIL even when `references/foo.md` exists.
- Grep confirmed no skill today uses `<`, `#`, or `?` in `references/...` (all edges dormant).
- Throwaway RED (`/tmp/opencode/ts/validate-copy.mjs`, original logic, not in repo): skill with `references/ghost.md#sec` (target exists) + `references/<placeholder>` → `FAIL: missing reference "references/ghost.md#sec"`, exit 1 (false-fail).

### GREEN (minimal diff, scripts/validate-skills.mjs only)
- skillRefs (lines 41-53): tokenRe now allows `<>` in token (`[^\s\`(),\[\]"'\n]`), then `ref.split(/[#?]/)[0]` strips fragment/query, `ref.replace(/[!:/?.,);]+$/, '')` strips trailing punctuation, and `ref.includes('<') || ref.includes('>')` filters placeholders as docs (not links).
- `<>` check is no longer dead; placeholder `references/<placeholder>` is captured then filtered out.

### Verification
- `node scripts/validate-skills.mjs` → 5 WARN (autonomous-loop 7KB, frontend-design 5KB, research-protocol 7KB, reverse-engineering 5KB, web-game-development 9KB), `checked 40 skills, 0 failures`, exit 0. (matches prior 40/0 +5 WARN baseline)
- Throwaway GREEN (mirrored copy, /tmp, not in repo): skill with `references/ghost.md#sec` (target exists) + `references/<placeholder>` → no failure for that skill; genuinely-missing `references/nope.md` → `FAIL: missing reference "references/nope.md"`, exit 1. Fail gate preserved.

### Files touched
- scripts/validate-skills.mjs (skillRefs: fragment strip + trailing-punct strip + placeholder filter)
- docs/plans/p0-debts-fix-progress.md (this evidence)

Status: done.

## P0 Task7 — harden low: reject `..` in references/* before existsSync

### RED (gap probe)
- scripts/validate-skills.mjs:88-92: reference loop calls `fs.existsSync(path.join(skillsDir, d.name, ref))` with no `..` guard → `references/../../etc/passwd` escapes the skill dir and the existence oracle passes.
- Throwaway RED (`/tmp/opencode/red-validate.mjs`, not in repo): skill with `references/../../etc/passwd` whose escaped target `/tmp/opencode/etc/passwd` exists → `exists=true`, `failures=0`, exit 0 (traversal not blocked).

### GREEN (minimal diff, scripts/validate-skills.mjs only)
- lines 88-100: before `existsSync`, reject `ref.split('/').includes('..')` (`traversal reference`) and reject when `path.relative(skillsDir, target).startsWith('..')` (`reference escapes skill dir`); `continue` keeps missing-ref fail gate intact.
- Zero new deps (fs/path already imported); no skill files touched.

### Verification
- `node scripts/validate-skills.mjs` → 5 WARN, `checked 40 skills, 0 failures`, exit 0 (baseline 40/0 +5 WARN preserved).
- Throwaway GREEN (`/tmp/opencode/green-validate.mjs`, not in repo): missing `references/ghost.md` → `FAIL: missing reference`, exit 1; `references/../../etc/passwd` → `FAIL: traversal reference`, exit 1; valid `references/real.md` → pass, exit 0.

### Files touched
- scripts/validate-skills.mjs (traversal guard before existsSync)
- docs/plans/p0-debts-fix-progress.md (this entry)

Status: done.
