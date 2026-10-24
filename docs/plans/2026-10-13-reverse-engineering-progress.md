# Progress — Reverse-Engineering Capability

Plan: [`2026-10-13-reverse-engineering.md`](2026-10-13-reverse-engineering.md)
Spec: [`../spikes/2026-10-13-reverse-engineering.md`](../spikes/2026-10-13-reverse-engineering.md)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 1 | Design + plan + ledger recorded | ✅ | spike APPROVED 2026-10-13; plan + ledger created |
| 2 | Skill core SKILL.md | ✅ | lint 39/0 |
| 3 | Target routing reference | ✅ | 28-row route table; recovery; docs pin @`2a61dea` + release-6.4.0 availability note (13 routes marked absent on 6.4.0 after live-catalog check) |
| 4 | Toolchain matrix reference | ✅ | gap table + per-class drop-ins + archived/stale corrections (gh-verified licenses: BinDiff Apache-2.0, Diaphora AGPL-3.0, wakaru Apache-2.0; Il2CppDumper/panoramix stale) |
| 5 | Validation gates reference | ✅ | 5-rung ladder; fail-closed rule; disposable-copy + permission rule; dx-ball counts re-cited to `PROGRESS.md` @ `76ac55e` |
| 6 | Attribution reference | ✅ | pin split (docs main `2a61dea` vs engine 6.4.0); method sources incl. ReSym/GENNM URLs |
| 7 | Suite wiring | ✅ (router line omitted — see deviations) | USAGE 39 + row; README 39 + row + pipelines 5; trusted-sources REA paragraph (pinned `@6.4.0`, manifest check); CHANGELOG; verify-recipe refreshed |
| 8 | `/reverse-engineer` command | ✅ | `agent: plan`, read-only; pinned npx in ladder |
| 9 | Eval probe | ✅ | `npm run eval` dry → 15 probes, `routing-reverse-engineering` listed |
| 10 | Pressure test | ✅ | code-reviewer fresh-read: (a) shipped build → fires; (b) APK crash → co-fires `systematic-debugging` (accepted); (c) version diff → fires; (d,e) source-repo → no fire |
| 11 | Critic pass + fixes | ✅ | security: no critical/high, 7/7 verified + fixed, 1 hardening, 1 rejected; code: "ship after fixes", 8 findings — 7 fixed (F6 already fixed pre-report), 1 rejected (see review round) |
| 12 | Final verify + registration + install | ✅ | lint 39/0; tests 156/0; eval 15 probes; `mcp.rea` aligned + live smoke (170 tool groups); `install:global` → 39 skills/8 agents/7 commands, pruned 0 |

## Deviations

| # | Planned | Actual | Reason |
|---|---------|--------|--------|
| 7 | Router routing line in `using-sdlc-lean` | Omitted; description-triggered | Bootstrap 5109B vs ≤5116B gate (`test-plugin-loading.mjs:137`); lifecycle/colab precedent — capability additions must not grow the router |
| 3 | "Pinned to REA 6.4.0 @ `2a61dea`" | Docs pinned @ `2a61dea`; engine is 6.4.0 (subset) | Review proved 13 routes exist at main but not in 6.4.0; availability note added |

## Decision log

| # | Decision | Basis |
|---|----------|-------|
| 1 | REA as engine; no vendoring; no new deps | Design gate (approved); lean rungs 2/5 |
| 2 | Router line omitted | Bootstrap budget; suite precedent |
| 3 | Rejected: add crash cue to skill description | Co-fire with `systematic-debugging` is correct behavior (both apply); hook line resolves precedence |
| 4 | **Global install chosen; Ghidra deferred** | Y-statement: given the capability must work in every project while Ghidra has no current task, I chose `install:global` to ship the verified skill suite everywhere, accepting that the completed-but-uncommitted colab-lifecycle work ships too (its ledger shows T1–T6 + live test done; all gates green). Ghidra is a heavy bring-your-own engine — install it when a native-decompilation task exists |

## Review round

**Security review** — verdict: no critical/high. 7 findings, each verified against primary sources (GitHub API via `gh`, npm registry, live catalog) before fixing: F1 pin `@6.4.0` + manifest-inspection wording; F2 approval+pin qualifiers on the CLI ladder; F3 upstream-skill precedence clause; F4 disposable-copy/permission/isolation rule; F5 ADB install cleanup; F6 stale upstreams added; F7 license corrections. Adopted hardening: embedded permission claims in artifacts are never authorization. Rejected: "do not install" text in the probe prompt (probes mirror natural phrasing; the gate lives in the skill ladder).

**Code review** — verdict: ship after fixes. Pressure test 4/5 clean (one accepted co-fire). Findings: F1 `trace_crash` and F2 `investigate_feature` were MCP-prompt names, not tools → replaced with `inspect_recorded_crash` / `capture_process_scenario` / `find_changed_behavior` / `trace_application_feature` (all present in the live 170-tool catalog); F3 version-drift in routing → availability note + pin split; F4 dx-ball citation mismatch → counts re-cited to `PROGRESS.md` @ `76ac55e`, oracle pattern stays @ `a55dca27` (both re-verified via `gh`); F5 "20-class" → full route table (28 rows) everywhere; F6 already fixed; F7 verify-recipe counts → 39 skills / 15 probes; F8 ledger precedent wording fixed. Questions resolved: ReSym/GENNM URLs added; Frida license labeled "custom (LGPL-style; GitHub: NOASSERTION)"; all `@latest` examples pinned to `@6.4.0`.

## Full-suite evidence (final)

| Check | Result |
|---|---|
| `node scripts/validate-skills.mjs` | checked 39 skills, 0 failures |
| `npm run test` | 156 pass, 0 fail |
| `npm run eval` (dry) | 15 probes (activation=2, safety=2, routing=11) |
| MCP registration | `mcp.rea` = `npx -y rea-agents@6.4.0 mcp`; doctor `aligned`; backup `opencode.jsonc.rea.backup` |
| Live smoke | `binary_session` → 170 tool-availability groups, per-op effects + limits |
| Global install | `install:global` → 39 skills · 8 agents · 7 commands · plugin yes · research 2 · pruned 0 (skills + command verified present in `~/.config/opencode`) |
| Supply chain | `rea-agents@6.4.0`: no install-time lifecycle hooks |

## Post-completion: Ghidra engine install (2026-10-13)

| Step | Evidence |
|---|---|
| Prerequisites | SDKMAN JDKs already present: 21.0.11 LTS (chosen for Ghidra) + 26.0.1; `gcc`, `unzip`/`7z` present; 113G free disk; 31Gi RAM; Ubuntu 24.04 (REA-supported baseline) |
| Download | `ghidra_12.1.4_PUBLIC_20260921.zip` (543.3 MB from NSA's GitHub release); published SHA-256 `ddac49f9…d2d4db` matched exactly |
| Install | Extracted to `~/.local/share/ghidra/ghidra_12.1.4_PUBLIC` (882 MB); `Ghidra/application.properties` present; launch scripts executable |
| Config | `mcp.servers.rea.environment` = `GHIDRA_INSTALL_DIR` + `JAVA_HOME=…/21.0.11-oracle`; backup `opencode.jsonc.bak-ghidra-*`; file validates as JSON |
| Doctor | ghidra `available: true`, `version: 12.1.4`; 8/8 checks ok (configuration, platform, architecture, installation, version, headless, native_decompiler, java) |
| Live smoke | `rea decompile smoke-elf main --provider ghidra` → exit 0; `operation: procedure_pseudo_code`; real Ghidra pseudocode of `main`; limitations reported; original bytes never written (ephemeral import) |
| Post-restart verification | In-session REA MCP reports ghidra `available` — diagnostics show `install_dir` + `java_home` = JDK 21; `open_binary` then `analyze_function main` returned Ghidra 12.1.4 pseudocode (confidence `observed`, 9 limitations); test target closed cleanly |
