# Web game engine matrix (2026-10)

Pinned snapshot from official docs/release notes; re-verify versions before a new
project. **Default rule: choose the smallest engine that covers the game's hardest
requirement, then keep WebGL2 as the floor and WebGPU as enhancement.**

## Comparison

| Engine / renderer | 2D / 3D | WebGPU | Mobile | License | Best fit |
|---|---|---|---|---|---|
| **Phaser 4** | 2D | No (WebGL2) | Excellent | MIT | Complete 2D games: scenes, Arcade/Matter physics, audio, input |
| **PixiJS v8** | 2D | Yes, core + WebGL fallback | Excellent | MIT | Render layer inside a larger app; max batching; you build systems |
| **three.js** (r18x) | 3D (+2D) | `WebGPURenderer` + WebGL2 fallback | Good | MIT | Rendering-centric 3D, custom pipelines, TSL node materials |
| **Babylon.js 9** | 3D | Mature, side-by-side | Good | Apache-2.0 | 3D game needing engine + Havok physics + editor |
| **PlayCanvas** | 3D | Opt-in beta; WebGL2 default | Strong (portal/Lens) | MIT engine; free editor for public projects, paid private tiers | Editor-first 3D, Snapchat/portal distribution |
| **Godot 4 web export** | 2D/3D | No (Compatibility/WebGL2) | OK single-thread | MIT | Editor-driven projects; no C# on web; multi-MB wasm |
| **Defold** | 2D/3D | Not verified | Strong, tiny builds | Defold (Apache-2.0-like) | ~3 MB-class loads, YouTube Playables, Lua teams |
| **Bevy / WASM** | 3D | Yes (wgpu) | Weak (large wasm) | MIT/Apache-2.0 | Rust teams, prototypes |
| **Construct 3** | 2D | Unverified | Good | Proprietary | No-code teams |
| **Unity 6.3** | 2D/3D | Experimental; WebGL2 default | Heavy | Proprietary | Console/PC parity is the product, not web-first |

## Decision rules

1. **2D, content-heavy, needs scenes/physics/audio now** → Phaser 4. Do not add a
   separate ECS/physics stack unless the game outgrows Arcade/Matter.
2. **2D, custom architecture, sprites are one layer** → PixiJS v8 + your own sim
   and physics (Rapier, Planck, or custom). Pixi is a renderer, not a game engine.
3. **3D with gameplay systems** → Babylon.js 9. You get engine, physics, editor,
   and WebGPU/WebGL parity; less custom plumbing than three.js.
4. **3D where rendering *is* the product** → three.js. Budget for camera,
   controls, physics, asset pipeline, and scene management yourself.
5. **Editor-first 3D / portal distribution** → PlayCanvas. Verify the WebGPU path
   on target devices; WebGL2 remains the default.
6. **Team wants a real editor and ships multi-MB wasm** → Godot 4 web export.
   Check COOP/COEP requirements, audio effects, and C# exclusion early.
7. **Bundle size is the hard constraint** → Defold. Measure first-load wasm +
   assets on a throttled connection, not the zip size.

## Browser reality (check before betting on a feature)

- **WebGPU**: Chrome/Edge 113+, Firefox 141+ (Windows first), Safari/iOS/iPadOS
  26+. Not Baseline: Firefox Android/Linux gaps; older iOS lacks it. Global page
  support ~86–88% (2026). Always ship a WebGL2 path.
- **WebTransport**: Baseline 2026 newly available, ~91.6% global; Safari/iOS only
  from 26.4. Use for unreliable datagrams with a WebSocket fallback.
- **OffscreenCanvas**: Chrome 69+, Firefox 105+, Safari 16.4+.
- **WASM SIMD**: default in modern engines. **Threads** require cross-origin
  isolation (COOP/COEP) and complicate portal embedding.
- **iOS Safari**: audio must be unlocked by a gesture; backgrounding suspends
  timers/sockets; memory and thermal limits are tighter than desktop.

## Version notes that change APIs

- Phaser 4 shipped 2026-04 ("Caladan"), render-node WebGL renderer, Canvas
  deprecated, Mesh/Plane removed; 4.2.x current. APIs differ from Phaser 3.
- PixiJS v8 (2024-03) made WebGPU a core backend and changed init to async; v8
  docs only — do not mix v7 patterns.
- three.js r183 deprecated `Clock`; use `Timer`. `examples/js` was removed in
  r148, `build/three.min.js` in r161. Read the installed version before editing.
- Babylon.js 9 adds Frame Graph and clustered/volumetric lighting; WebGPU is
  mature, WebGPU-XR still experimental.
- Godot 4.3+ defaults web export to single-threaded (no COOP/COEP headers), at
  the cost of audio effects/reverb.

## Sources

- https://web.dev/blog/webgpu-supported-major-browsers (2025-11-25)
- https://github.com/phaserjs/phaser/discussions/7274 ; https://phaser.io/download/release/v4.2.1
- https://pixijs.com/blog/pixi-v8-launches (2024-03-05)
- https://doc.babylonjs.com/setup/support/webGPU ; https://doc.babylonjs.com/whats-new
- https://blog.playcanvas.com/build-webgpu-apps-today-with-playcanvas/ (2024-04-18)
- https://docs.godotengine.org/en/latest/tutorials/export/exporting_for_web.html
- https://defold.com (1.14.0, 2026-10-12)
- https://docs.unity3d.com/6000.3/Documentation/Manual/WebGPU.html
- https://developer.mozilla.org/en-US/docs/Web/API/WebTransport
