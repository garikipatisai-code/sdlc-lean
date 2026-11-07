# Babylon.js photoreal budgets (Babylon.js 9)

Route: budget numbers for a photoreal Babylon.js 9 scene — frame, asset, and
GPU-memory budgets. WebGL2 is the floor; WebGPU is progressive enhancement
with a tested fallback. Never ship a WebGPU-only claim.

## 1. Frame budget

- 60 fps target: 16.67 ms frame, ~10 ms usable budget (browser compositor and
  other tabs take the rest). Split per frame: sim 4–5 ms · render submit
  3–4 ms · UI/audio 1–2 ms · 2 ms slack. Measure the split; never allocate
  by hope.
- 30 fps is the mobile floor (33.3 ms frame, ~20 ms usable budget), acceptable
  only for slow scenes; sustained overrun triggers adaptive resolution (drop
  pixel ratio, then volumetrics, then post) before dropping frames.
- Gate p95 frame time in CI on the mid-tier-mobile measurement bar (see §5);
  fail the build on regression.

## 2. Asset budget

- Initial-load budget: LCP ≤ 2.5 s on the mid-tier-mobile bar; first gameplay
  ≤ 20 s on portal hardware. Everything else streams after first frame.
- Portal package budget: itch.io total ≤ 500MB (500 MB). Anything larger ships as a
  chunked portal payload (see §4) — never one 2 GB download.
- Per-scene asset budget: ≤ 150 MB textures + ≤ 50 MB geometry on desktop,
  ≤ 60 MB textures + ≤ 25 MB geometry on mobile. Compress transfer
  (Brotli/gzip), version asset URLs, set long-lived cache headers.

## 3. GPU-memory budget (VRAM / texture caps per tier)

| Tier | VRAM budget | Texture cap | Texture size rule |
|---|---|---|---|
| High (desktop WebGPU full) | ≤ 1 GB GPU memory | ≤ 512 MB textures | 2048 px hero, 1024 px standard |
| Standard (desktop WebGL2) | ≤ 512 MB GPU memory | ≤ 256 MB textures | 1024 px hero, 512 px standard |
| Mobile (mid-tier WebGL2) | ≤ 256 MB GPU memory | ≤ 128 MB textures | 1024 px hero max, 512 px standard |

- Enforce with explicit LRU eviction for textures/audio; no unbounded caches.
- Restore all GPU resources on `device.lost` / `webglcontextlost`.

## 4. Compression decision table

| Asset | Primary | Fallback | When-to-use rule |
|---|---|---|---|
| Color/albedo textures | KTX2 + Basis Universal ETC1S | plain PNG/JPG only for tiny UI icons | ETC1S for diffuse/albedo where small size beats fidelity |
| Normal/specular/hero textures | KTX2 + Basis Universal UASTC | ETC1S if package size overruns | UASTC where quality matters (normals, hero albedo); accept ~2× size vs ETC1S |
| Meshes | glTF/GLB + meshopt | Draco | meshopt primary (fast decode, GPU-friendly); Draco fallback only when its extra ratio is needed and decode cost is profiled |
| Short SFX | audio sprites (one atlas + cue map) | individual files only for >5 s clips | sprites for UI/shots/hits; compressed streams for music/ambience; unlock on gesture |
| Fonts | subset WOFF2 (used glyphs only) | full font never ships | subset per locale; avoid huge CJK sets unless that locale is active |

- Transcode KTX2 at load (worker/`createImageBitmap` off the main thread).
- Quantize glTF attributes; atlas UI/sprites to cut draw calls.

## 5. Mid-tier-mobile measurement bar

- The bar: a mid-tier Android phone plus a 4 GB Chromebook, release build,
  sustained 10+ minute run. Record p50/p95/p99 frame time, fps buckets, GPU
  memory used/max, load time (LCP), and battery/thermal behavior.
- Budgets are met only when measured on this bar — never on a dev machine,
  dev server, or single FPS counter.

## 6. Multi-GB to portal translation

- Desktop multi-GB scenes never ship as one download: split into a chunk manifest plus progressive download (preload boot + first-scene chunks, stream the rest by priority). Manifest is JSON: chunk id, URL, bytes, hash, priority.
- Cache chunks in IndexedDB with versioned keys; verify hash on read, evict
  LRU by chunk priority. Resume interrupted downloads per chunk, not per game.
- Rule: first gameplay from cached boot chunks ≤ 20 s on portal hardware;
  never one 2GB download (2 GB) — cap any single fetch at one chunk (≤ 50 MB).

## Non-goals

- Rendering look (PBR/IBL/post) lives in `babylon-photoreal-rendering.md`.
- World streaming, LOD, and eviction live in `babylon-world-streaming.md`.
- Traffic and crowd systems live in `babylon-traffic-crowds.md`.
- No engine switch (three.js/PlayCanvas/Godot), no netcode, no demo scene or
  asset binaries.
