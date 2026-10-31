# Spec — Photoreal capabilities for web-game-development

**Status**: draft
**Approved by**: (awaiting TTY approve — never self-approve)
**Date**: 2026-10-31
**Related**: `.opencode/skills/web-game-development/SKILL.md`, `docs/specs/2026-10-23-spec-enforcement.md`

## Goal

Give the `web-game-development` skill photoreal 3D guidance: four focused
Babylon.js references (rendering, world streaming, traffic + crowds, budgets),
routed from `SKILL.md`, backed by a test skeleton that pins the routes and the
line budget.

## Requirements

- **REQ-0 — Gate spawn must invoke CLI via node, not process.execPath.**
  Background gate check in `.opencode/plugins/sdlc-lean.js:412`
  (`spawnSync(process.execPath, [cli, 'check', ..., '--root', root])`) fails
  under the opencode host. The gate spawn must invoke the CLI via `node`
  (argv0 `node`) so gated writes succeed when the `node` check exits 0.
- **REQ-1 — Photoreal rendering reference.** A new
  `references/babylon-photoreal-rendering.md` covering PBR materials, IBL,
  lighting rigs, shadows, and the post-processing chain for Babylon.js 9.
- **REQ-2 — World-streaming reference.** A new
  `references/babylon-world-streaming.md` covering LOD, frustum/occlusion
  culling, tile/chunk streaming, and asset eviction for large scenes.
- **REQ-3 — Traffic systems reference.** Traffic guidance (deterministic sim,
  pooled agents, LOD'd vehicles) in
  `references/babylon-traffic-crowds.md`, with sim rules kept out of render code.
- **REQ-4 — Crowds systems reference.** Crowd guidance (instancing, animation
  LOD, agent caps, non-color cues) in the same `babylon-traffic-crowds.md`.
- **REQ-5 — Photoreal budgets reference.** A new
  `references/babylon-photoreal-budgets.md` with frame, asset, and GPU-memory
  budgets plus the mid-tier-mobile measurement bar.
- **REQ-6 — SKILL.md routing.** `SKILL.md` gains route-table rows pointing at
  the four new references and stays at or under 155 lines total.

## Acceptance criteria

- **AC-0**: gate spawn invokes the CLI via `node` (not `process.execPath`);
  gated writes succeed when the `node` check exits 0; regression test stubs
  `spawnSync` and asserts argv0 is `node`.
- **AC-1**: `babylon-photoreal-rendering.md` exists and covers PBR, IBL,
  lighting, shadows, and post-processing.
- **AC-2**: `babylon-world-streaming.md` exists and covers LOD, culling,
  tile streaming, and eviction.
- **AC-3**: `babylon-traffic-crowds.md` covers deterministic traffic with sim
  separated from render code.
- **AC-4**: `babylon-traffic-crowds.md` covers instanced crowds with animation
  LOD and agent caps.
- **AC-5**: `babylon-photoreal-budgets.md` states frame, asset, and GPU-memory
  budgets with a mid-tier-mobile measurement bar.
- **AC-6**: `SKILL.md` route table links all four new references.
- **AC-7**: `SKILL.md` is at most 155 lines.
- **AC-8**: `tests/opencode/test-web-game-photoreal.mjs` passes under
  `node --test`.
- **AC-9**: `node scripts/validate-skills.mjs` exits 0.
- **AC-10**: No WebGPU-only claims; WebGL2 floor plus WebGPU progressive
  enhancement is stated.

## Out of scope

- Engine-switch or default-pick changes (no three.js/PlayConform/Godot edit).
- Netcode, shipping, PWA/portal, or vendored-material changes.
- A demo game, scene code, or asset binaries.
- `scripts/spec-check.mjs`, plugin, agent, or command changes (except the
  Task 0 REQ-0 gate-spawn recovery fix).

## Decisions

- **Babylon-stay (Y-statement)**: In the context of photoreal 3D guidance for
  the web-game skill, facing the three.js-custom-pipeline versus
  Babylon.js-9-engine choice, we decided to stay with Babylon.js 9 as the
  photoreal default and achieve PBR/IBL/streaming/crowd guidance inside its
  WebGPU/WebGL-parity renderer, accepting less custom-pipeline control,
  because the skill already pins Babylon.js 9 as the 3D-engine default and a
  second engine path would double the budget and test surface.

## Trace

| Requirement | Acceptance | Plan task | Verify |
|---|---|---|---|
| REQ-0 gate spawn via node | AC-0 | Task 0 | `node --test tests/opencode/test-spec-gate.mjs` |
| REQ-1 rendering | AC-1, AC-8, AC-10 | Task 1 | `node --test tests/opencode/test-web-game-photoreal.mjs` |
| REQ-2 streaming | AC-2, AC-8 | Task 2 | `grep -q LOD` on the streaming reference |
| REQ-3 traffic | AC-3, AC-8 | Task 3 | `grep -q sim` on the traffic-crowds reference |
| REQ-4 crowds | AC-4, AC-8 | Task 4 | covered with Task 4 budgets verify |
| REQ-5 budgets | AC-5 | Task 4 | `grep -q budget` on the budgets reference |
| REQ-6 routing | AC-6, AC-7, AC-9 | Task 5 | `grep -q babylon-photoreal` on SKILL.md plus lint |
