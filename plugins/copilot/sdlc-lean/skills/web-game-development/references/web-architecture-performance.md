# Web game architecture and performance

The browser gives you one main thread, a GPU you do not own, and a user who
leaves after 20 seconds. Architecture exists to keep simulation deterministic,
rendering isolated, and the frame inside budget.

## 1. Fixed-step simulation, interpolated render

```js
const DT = 1 / 60;              // simulation step (30–60 Hz)
let acc = 0;
let prev = performance.now();

function frame(now) {
  let frameTime = (now - prev) / 1000;
  prev = now;
  frameTime = Math.min(frameTime, 0.25);   // clamp: no spiral of death
  acc += frameTime;

  let steps = 0;
  while (acc >= DT && steps++ < 4) {
    step(DT);                               // deterministic: no DOM, no RNG without seed
    acc -= DT;
  }
  if (acc >= DT) acc = 0;                   // drop backlog: run slow, never freeze

  render(acc / DT);                         // interpolate prev/current transforms
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

- Simulate at a fixed rate; never scale gameplay by display refresh.
- Keep `step()` pure/side-effect-free except on game state. Seed all randomness.
- Render interpolation uses previous and current snapshots; do not mutate sim
  state in render.
- Cap catch-up steps (e.g. max 4) and drop time instead of freezing.

## 2. Frame budget

| Target | Frame | Practical budget | Notes |
|---|---|---|---|
| 60 fps | 16.67 ms | ~10 ms usable | Browser compositor/other tabs take the rest |
| 120 fps | 8.33 ms | ~5–6 ms usable | Feature tier, not baseline |
| 30 fps mobile floor | 33.3 ms | ~20 ms | Acceptable only for slow/strategy genres |

Suggested 60 fps split: gameplay 4–5 ms · physics 2–3 ms · render submit 3–4 ms
· UI/audio 1–2 ms · slack 2 ms. Measure the split; do not allocate by hope.

- Profile a **release build**, not a dev server with source maps and React
  StrictMode double-renders.
- Record p50/p95/p99 frame time over a representative scene, not a single FPS
  counter.
- Add a CI perf gate (p95 frame time, bundle size, GPU memory ceiling) and fail
  the build on regression.

## 3. Data layout: ECS when entity count justifies it

- Under ~1k entities, plain objects/components are fine. Above ~10k active
  entities, prefer data-oriented arrays (SoA) and archetype iteration.
- No neutral ECS-vs-OOP benchmark exists; decide by profiling your scene.
- Keep hot loops monomorphic: same object shapes, no megamorphic property access,
  no per-frame closures.
- Avoid per-frame `JSON`, string concatenation, array spreads, `map/filter`, and
  `new` in the simulation. Target **zero steady-state allocation**.
- Pool bullets, particles, damage numbers, vectors, matrices, events; pre-warm
  pools at load.

## 4. Rendering

- **Batch/instance**: one texture atlas + shared material → one draw call for
  many sprites. Use instancing for repeated meshes.
- **Cull**: frustum + distance; avoid submitting off-screen objects. LOD or
  impostors for distant geometry.
- **Overdraw**: stacked transparents/particles re-shade pixels; cap full-screen
  effects and large particles.
- **Pixel ratio**: `Math.min(devicePixelRatio, 2)`; lower it dynamically when
  frame time exceeds budget (adaptive resolution).
- **WebGPU**: use render bundles, indirect draws, and batched uploads; handle
  `device.lost`. Timestamp queries are optional and Chrome quantizes to 100 µs —
  use them for relative comparisons, not absolute truth.
- **WebGL2**: prefer `texStorage`, avoid per-frame shader compiles, restore
  resources on `webglcontextlost`.
- **OffscreenCanvas worker**: transfer control to a worker when render work is
  heavy and input latency allows; keep input/sim responsive on the main thread.

## 5. Asset pipeline

| Asset | Format / rule |
|---|---|
| Textures | KTX2 + Basis Universal (ETC1S/UASTC), transcoded at load; atlas UI/sprites |
| Meshes | glTF/GLB + meshopt (preferred) or Draco; quantization; meshlets for dense scenes |
| Audio | compressed streams for music; audio sprites for short SFX; unlock on gesture |
| Fonts | subset to used glyphs; WOFF2; avoid huge CJK sets unless needed |
| Loading | manifest + progress; first gameplay ≤20 s on portal hardware; preload next scene only |

- Compress transfer (Brotli/gzip), set long-lived cache headers, version asset
  URLs. Self-host production JavaScript (three module/addons); import maps cannot
  carry SRI, so do not ship a public CDN import map as-is.
- Budget per scene: texture memory, triangle count, draw calls, audio decode
  memory. Test on a 4 GB Chromebook and a mid-tier Android.
- Use `createImageBitmap`/workers for decode off the main thread where supported.

## 6. Mobile and thermal reality

- Sustained performance beats peak: run 10+ minutes and log fps, GPU temp, and
  battery impact. Thermal throttling can halve frame rate.
- Backgrounding suspends rAF/timers/sockets; pause the sim and treat multiplayer
  as disconnected with a reconnection window.
- iOS Safari: audio context interruptions, tighter canvas memory, no WebTransport
  before 26.4. Test on a real device, not only the simulator.
- Avoid unbounded caches; use explicit LRU eviction for textures/audio.

## 7. Profiling toolkit

| Tool | Use |
|---|---|
| Chrome DevTools Performance | Main-thread tasks, long tasks, GC, layout/paint |
| Rendering overlay | FPS, dropped frames, GPU memory used/max |
| WebGPU timestamp queries | Pass-level GPU cost (relative, 100 µs quantized) |
| Spector.js | WebGL/WebGL2 frame capture: draw calls, state, textures (not WebGPU) |
| WebGPU Inspector (browser extension) / PIX (Windows) / RenderDoc | Pipeline/command inspection, resource and timestamp detail |
| Engine profiler | Phaser/Pixi/three/Babylon scene stats, draw calls, batch counts |
| `performance.mark/measure` | Custom sim/render/network budgets in production telemetry |

**Method:** reproduce worst case → profile release build → name one bottleneck →
fix → re-measure same scene/hardware → record before/after. Never optimize an
unmeasured hotspot.

## 8. S-tier engineering checklist

- [ ] Fixed-step sim + interpolation; clamped accumulator; max catch-up steps.
- [ ] Seedable RNG; state hash + input-log replay reproduces in CI.
- [ ] Frame budget instrumented per subsystem; p95 gate in CI.
- [ ] Zero steady-state allocation in sim/render hot paths; pools pre-warmed.
- [ ] Batched/instanced draws; atlas; culling; LOD; pixel-ratio cap.
- [ ] KTX2/Basis + meshopt + audio sprites + subset fonts.
- [ ] WebGPU path with WebGL2 fallback and context/device-loss recovery.
- [ ] OffscreenCanvas or worker offload where measured to help.
- [ ] WASM SIMD/threads only for measured hot loops; COOP/COEP implications known.
- [ ] Sustained 10-minute run on mid-tier Android + 4 GB Chromebook.
- [ ] Bundle/asset/GPU-memory budgets enforced; adaptive resolution on overrun.
- [ ] Production telemetry for load time, fps buckets, and error/context loss.

## Sources

- https://gafferongames.com/post/fix_your_timestep/
- https://web.dev/articles/rendering-performance ; https://web.dev/articles/speed-rendering
- https://developer.chrome.com/blog/new-in-webgpu-121
- https://webgpufundamentals.org/webgpu/lessons/webgpu-timing.html
- https://web.dev/articles/offscreen-canvas
- https://v8.dev/features/simd ; https://webassembly.org/roadmap/
- https://github.com/KhronosGroup/KTX-Software ; https://github.com/zeux/meshoptimizer
- https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
- https://v8.dev/blog/trash-talk ; https://toji.dev/webgpu-best-practices/
- https://developer.chrome.com/docs/devtools/rendering/performance
