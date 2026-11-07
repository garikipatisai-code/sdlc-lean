---
name: web-game-development
description: Use when building, designing, porting, or shipping a web-based game - 2D/3D engine choice, fixed-step loop, WebGPU/WebGL rendering, physics, game feel, netcode, performance budgets, playtesting, accessibility, PWA/portal shipping (Phaser 4, PixiJS v8, three.js, Babylon.js, PlayCanvas, Godot web export)
---

# Web Game Development

**S-tier is a gate, not a vibe.** A web game is S-tier only with evidence for:
stable 60 fps on a mid-tier phone, first gameplay within 20 s, initial download
within portal limits, deterministic simulation with replay, authoritative netcode
where multiplayer exists, full input and accessibility coverage, and enforced
frame/asset budgets. Refuse to call a build S-tier without that evidence.

## Route first

Read the smallest matching reference before acting. Do not load the whole corpus.

| Task | Read |
|---|---|
| "Which engine?", 2D vs 3D, porting, runtime choice | `references/engine-matrix.md` |
| Loop, ECS, rendering, workers/WASM, frame and asset budgets, profiling | `references/web-architecture-performance.md` |
| Multiplayer, prediction, reconciliation, transports, hosting | `references/web-netcode.md` |
| PWA, portals, mobile, saves, analytics, launch checklist | `references/web-shipping.md` |
| Core loop, balance, game feel, playtest, accessibility | `references/game-design-playtest.md` |
| Phaser 4 scenes/physics | `references/vendor/phaser-core/`, `references/vendor/phaser-arcade-physics/` |
| PixiJS v8 render layer | `references/vendor/pixijs-rendering/` |
| three.js scene, materials, glTF (self-host production JS; import maps cannot carry SRI) | `references/vendor/threejs-scene-setup/`, `references/vendor/threejs-materials-lighting/`, `references/vendor/threejs-gltf-loading/` |
| Juice, levels, cameras, UI, input, physics, saves, shaders, audio, procedural, assets | matching `references/vendor/<discipline>/`; `create-game-assets` helper scripts are not vendored — skip their script steps |
| One-hour prototype / vertical slice | `references/vendor/prototype-fast/` |
| itch.io build upload | `references/vendor/itch-publish/` |
| Photoreal rendering, PBR/IBL lighting, post (photoreal/lighting) | `references/babylon-photoreal-rendering.md` |
| Large-scene streaming, chunks, HLOD (streaming/chunk/HLOD) | `references/babylon-world-streaming.md` |
| Vehicles, traffic, crowds (vehicle/traffic/crowd) | `references/babylon-traffic-crowds.md` |
| Photoreal budgets, KTX2, portal caps (budget/KTX2/portal) | `references/babylon-photoreal-budgets.md` |

Vendored material is Apache-2.0, pinned, and documented in
`references/VENDORED.md`. Some cross-skill links point to upstream skills not
vendored — treat them as further reading, not missing dependencies. The
`create-game-assets` helper scripts are not bundled; use project tooling instead
of fetching them. Web-engine vendor files contain JavaScript; discipline files
use Godot/Unity examples for concepts — translate the technique to the target
web engine.

## Default engine picks (2026-10)

| Project | Default | Why |
|---|---|---|
| Complete 2D game (scenes, physics, audio, input) | **Phaser 4** (MIT) | Full stack, fast iteration; WebGL2 only, no WebGPU yet |
| 2D render layer inside a larger app / max batching | **PixiJS v8** (MIT) | WebGPU core with WebGL fallback, tree-shakeable, render groups |
| 3D game needing an engine | **Babylon.js 9** (Apache-2.0) | Mature WebGPU/WebGL parity, Havok physics, editor |
| Rendering-centric 3D / custom pipeline | **three.js** (MIT) | WebGPURenderer + WebGL2 fallback, TSL; you own the systems |
| Editor-first 3D, portal/Lens distribution | **PlayCanvas** (MIT engine; free editor for public projects, paid private tiers) | Strong mobile/portal story; WebGPU still opt-in beta, WebGL2 default |
| Editor-driven 2D/light 3D | **Godot 4 web export** (MIT) | Real editor; WebGL2 only, no C# on web, multi-MB wasm |
| Tiny bundle / playables | **Defold** | ~3 MB-class builds, Lua velocity |
| Web-only with Unity | Avoid unless console/PC parity is the product | WebGPU experimental, heavy runtime |

**WebGPU is shipped in all major browser engines** (Chrome/Edge 113+, Firefox
141+ Windows, Safari/iOS 26+), but it is **not Baseline**: Firefox Android/Linux and older iOS still
lack it. Treat WebGL2 as the floor and WebGPU as progressive enhancement with a
tested fallback and device/context-loss recovery. Phaser 4 is WebGL2-only;
Unity 6.3 still labels WebGPU experimental.

## S-tier evidence table

Every cell names evidence to show before any S-tier claim.

| engine | performance | accessibility | replay | shipping |
|---|---|---|---|---|
| pinned version + why | p95 frame time log at 60 fps | input/a11y checklist pass | seed + input log → state hash | portal build + load budget |

## Non-negotiables

1. **Fixed-step simulation + interpolated render.** Accumulator clamped to
   ~0.25 s; simulate 30–60 Hz; render with `alpha = acc / dt`. Never tie physics
   or gameplay to display refresh.
2. **Budget the frame, not the average.** 60 fps = 16.67 ms, but ~10 ms is
   usable; 120 fps = 8.3 ms. Ship 60 locked with adaptive resolution before
   chasing 120.
3. **Zero steady-state allocation** in hot paths. Pool bullets, particles,
   enemies, vectors, event objects; preallocate typed-array arenas.
4. **Measure with the browser, not intuition.** Chrome DevTools performance +
   rendering overlay, WebGPU timestamp queries (100 µs quantized in Chrome),
   `Spector.js` for WebGL/WebGL2; test a mid-tier Android and a 4 GB Chromebook
   for 10+ minutes.
5. **WebGPU path + WebGL2 fallback + recovery.** Handle `device.lost` and
   `webglcontextlost` by rebuilding GPU resources; never assume a context lives.
6. **Assets are a budget.** KTX2/Basis textures, meshopt meshes, atlases,
   audio sprites, subset fonts; batch/instance, cull, LOD, and cap pixel ratio.
7. **Offload where it pays.** OffscreenCanvas render worker when input latency
   allows; WASM SIMD/threads for physics/animation hot loops, not for glue.
8. **Netcode is server-authoritative.** Client prediction + reconciliation,
   interpolated remotes, sanitized inputs. WebSocket default; WebTransport only
   with a WebSocket fallback (Safari/iOS 26.4+).
9. **Input and accessibility are features.** Keyboard, mouse, touch, gamepad;
   remap, sensitivity, safe areas; ≤100 ms input→feedback; buffer ~100–150 ms,
   coyote ~100 ms; motion-reduce and non-color cues.
10. **Ship gate, not a demo.** Portal limits, LCP ≤2.5 s / INP ≤200 ms /
    CLS ≤0.1, audio unlocked on gesture, IndexedDB saves + `persist()`, HTML/ARIA
    menus outside the canvas, analytics funnel, save migration, rollback.

## Workflow

1. **Classify** — new or existing; pinned engine version; 2D/3D; multiplayer;
   target portals, devices, and browsers. Read the engine matrix.
2. **Design** — `brainstorming`: 30-second verb loop, MDA, kill criteria, scope.
   Do not pick content or meta before the verb is fun.
3. **Plan** — `writing-plans`: deterministic sim, render, input, perf budgets,
   netcode (if any), a11y, save, ship. TDD the sim/content logic; rendering gets
   visual + perf checks.
4. **Build a vertical slice** — greybox first, measure frame time immediately,
   then add content. Juice and assets only after the loop reads.
5. **Verify** — deterministic replay test; p95 frame time on target hardware;
   bundle/asset/GPU-memory budget; input latency; a11y checklist; portal build.
6. **Ship** — portal channels, analytics, save schema version, rollback plan.
   Read `references/web-shipping.md` before the first upload.

## Suggested project shape

```text
src/
  sim/        deterministic, DOM-free, seeded RNG, fixed step, replayable
  render/     engine-specific scene/renderer, interpolation, no game rules
  input/      action mapping, buffering, device adapters
  net/        transport, snapshots, prediction, reconciliation
  content/    data-driven levels, tuning configs, asset manifest
  ui/         DOM/ARIA menus, HUD bridge; canvas is not accessible UI
tests/        sim determinism, replay, balance sanity, perf budget
```

Keep rules out of render code and DOM out of sim code. A replay from a seed +
input log must reproduce the same state hash in CI.

## Red flags

| Thought | Reality |
|---|---|
| "Optimize after it's fun" | Measure from the first playable; fun at 12 fps is not evidence. |
| "WebGPU everywhere" | WebGL2 floor + fallback, or you cut off iOS <26 and Firefox Android. |
| "60 fps on my laptop" | Test mid-tier mobile and a 4 GB Chromebook, thermally sustained. |
| "P2P multiplayer is simpler" | NAT/relay cost and cheating; authority belongs on the server. |
| "Canvas is our UI" | Screen readers cannot see canvas text; use DOM/ARIA for menus. |
| "itch.io is enough" | Poki/CrazyGames have load, size, exclusivity, and SDK rules. |
| "We'll add accessibility later" | Remap, subtitles, motion, and difficulty options change architecture. |

## References

- `references/engine-matrix.md` — 2026 engine/renderer comparison and defaults.
- `references/web-architecture-performance.md` — loop, ECS, workers, assets,
  budgets, profiling, mobile constraints.
- `references/web-netcode.md` — transports, authority, prediction, frameworks.
- `references/web-shipping.md` — portals, PWA, saves, audio unlock, a11y, launch.
- `references/game-design-playtest.md` — core loop, feel, balance, playtest, a11y.
- `references/VENDORED.md` — upstream source, commit, license, scope.
> Provenance: this tree shipped without spec-gate approval — future edits need an approved plan; upstream pin in `references/VENDORED.md`.
