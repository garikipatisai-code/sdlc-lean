# Babylon.js world streaming (Babylon.js 9)

Route: large-scene streaming for a Babylon.js 9 scene — chunks, LOD,
culling, tile streaming, and eviction. Keeps frame time flat as the world
grows; pairs with `babylon-photoreal-rendering.md` (look) and
`babylon-photoreal-budgets.md` (memory caps).

## 1. Chunk format

- World is divided into square chunks (tiles): each chunk is one glTF-backed
  asset set (meshes + materials + lightmap slice + probe anchor) with a
  manifest entry: `{ id, bounds, lodLevels, neighbors }`.
- Chunk granularity is fixed at author time; runtime streams whole chunks,
  never individual meshes. Tile streaming always moves in chunk units so
  load/unload stays observable and budgeted.
- Neighbor links in the manifest drive prefetch: when a chunk loads, queue
  its edge neighbors at the lowest HLOD level first.

## 2. HLOD levels

- Every chunk ships three HLOD levels: HLOD0 (full meshes + full materials),
  HLOD1 (merged meshes, simplified materials, no shadows), HLOD2 (billboard /
  impostor shell for distant views).
- LOD selection is distance-driven per chunk: near chunks render HLOD0, mid
  range drops to HLOD1, far range to HLOD2. Never pop more than one HLOD
  level per frame per chunk; cross-fade or dither the swap.
- Author HLOD1/HLOD2 with the chunk so streaming a far tile never pulls
  full-resolution assets into VRAM.

## 3. Culling rule: frustum + PVS/occlusion

- Frustum culling runs first every frame: chunks fully outside the camera
  frustum are skipped before any draw submission.
- Occlusion culling follows the PVS/occlusion rule: a chunk renders only if
  it is in the frustum AND (it is in the precomputed PVS for the camera's
  current cell OR it passes a runtime occlusion query). PVS (potentially
  visible set) is baked per zone; dynamic occluders only demote HLOD, never
  promote visibility PVS denies.
- Culling is hierarchical: zone → chunk → HLOD mesh. A culled parent skips
  all children with no per-mesh test.

## 4. Tile streaming: adaptive radius/density (3D-Tiles-style)

- Stream tiles 3D-Tiles-style: each chunk carries a geometric error / density
  score, and the runtime refines the visible set until the error budget is
  met — near/high-density chunks refine first.
- Load radius is adaptive, not fixed: `radius = baseRadius * perfScale`, where
  `perfScale` drops when frame time exceeds budget and recovers when headroom
  returns. Density caps bound the refined set: at most N HLOD0 chunks, M
  HLOD1 chunks; everything else stays at HLOD2 or unloaded.
- Prefetch along velocity: extend the adaptive radius in the camera move
  direction by one chunk ring so turns never expose unstreamed holes.

## 5. VRAM eviction policy with distance-X load/unload observables

- Eviction policy is LRU-by-distance: when VRAM usage passes the budget bar,
  evict the farthest HLOD0/HLOD1 chunk assets first, keeping HLOD2 shells
  until the chunk leaves the evict radius entirely.
- Load/unload thresholds use distance-X bands: load band (inside adaptive
  radius → fetch), hold band (keep resident, demote HLOD with distance),
  unload band (past evict distance → release GPU resources). Every crossing
  fires distance-X load/unload observables: `onChunkLoadObservable` and
  `onChunkUnloadObservable` notify budgeting and traffic/crowd systems so
  they can park agents before assets vanish.
These `onChunk*Observable` names are a project-level convention following the Babylon Observable pattern, not Babylon built-ins.
- Unload is deferred one frame behind the observable so no system reads a
  chunk mid-release; reload of a held chunk is an HLOD promote, never a
  re-fetch.

## 6. EgWg corridor migration note (no API break)

- General 1-chunk -> N-chunk contract: keep the seed chunk's id and bounds as the anchor tile, then append neighbor chunk manifests under the same HLOD/PVS/occlusion and distance-X load/unload observables contract — no API break, only more tiles (the EgWg corridor hallway-to-arcade migration is one example).
- Callers keep subscribing to `onChunkLoadObservable` /
  `onChunkUnloadObservable`; migration only adds chunk ids, it
  never renames events or manifest fields.

## Non-goals

- Material, lighting, and post look live in `babylon-photoreal-rendering.md`.
- Traffic and crowd agent rules live in `babylon-traffic-crowds.md`.
- Frame, asset, and GPU-memory numbers live in
  `babylon-photoreal-budgets.md`; this file states the streaming mechanism,
  not the budget values.
