# Babylon.js photoreal rendering (Babylon.js 9)

Route: photoreal look for a Babylon.js 9 scene — materials, lights, shadows,
post. WebGL2 is the floor; WebGPU is progressive enhancement with a tested
fallback. Never ship a WebGPU-only claim.

## 1. PBR materials + IBL

- Use `PBRMaterial` (metallic-roughness workflow): albedo, `metallic`,
  `roughness`, normal, and ambient-occlusion maps. Keep PBR values physical —
  non-metals `metallic` 0, roughness driven by texture, not magic numbers.
- Light every PBR scene with image-based lighting (IBL): a `.env` environment
  texture sets ambient diffuse + specular so metals read correctly even with
  few direct lights. Swap the environment per biome/time-of-day, not per mesh.
- Match environment intensity to direct lights; if reflections blow out, lower
  environment intensity before touching exposure.

## 2. Baked GI: lightmaps + probes

- Bake static lighting into lightmaps (baked GI) for floors, walls, and other
  non-moving geometry; reserve real-time lights for the sun/key light plus a
  small set of dynamic fills.
- Place reflection probes at gameplay-relevant volumes (rooms, street
  segments) for specular reflections; add GI probes where baked bounce needs
  a runtime anchor. Bake probes with the lightmap pass, refresh only on
  scene state change — never per frame.
- Keep dynamic-light count inside budget: one shadow-casting key light, the
  rest shadowless fills.

## 3. Shadows

- One shadow-casting directional (sun) light with tight shadow-camera bounds
  around the camera target; cascaded maps only for large outdoor views.
- PCF soft shadows at 1024–2048 px on desktop, 1024 px on mobile; fade shadows
  with distance rather than growing the map.

## 4. Volumetrics (opt-in)

- Volumetric fog and light shafts are opt-in: enable for hero interiors or
  set-piece exteriors, disable for open-world traversal and all mobile tiers.
- Prefer a cheap height-fog + shaft-billboard combination before true
  volumetric scattering; profile before committing.

## 5. Tier-gated post-processing

- Gate costly post per tier: screen-space reflections (SSR), bloom, and depth of field (DoF) ship on the high tier only; the reduced tier keeps tone
  mapping + antialiasing and drops the rest.
- Order: render → SSR → bloom → DoF → tone map → output. Each stage must be
  independently toggleable for tier switches and perf triage.

## Tier table

| Feature | WebGPU full tier | WebGL2 reduced tier |
|---|---|---|
| Materials | `PBRMaterial` + IBL `.env`, full probe set | `PBRMaterial` + IBL, fewer probes |
| Lighting | Baked GI lightmaps + key + fills | Baked GI lightmaps + key + fewer fills |
| Shadows | 2048 px PCF cascades (large views) | 1024 px PCF, tight bounds, distance fade |
| Volumetrics | Volumetric fog + shafts on hero scenes | Height fog + billboards only |
| Post | SSR + bloom + DoF, tone map, AA | Tone map + AA; SSR/bloom/DoF off |
| Fallback/recovery | WebGPU path with WebGL2 fallback | WebGL2 floor; rebuild GPU resources on `device.lost` / `webglcontextlost` |

## Non-goals

- World streaming, LOD, and eviction live in `babylon-world-streaming.md`.
- Traffic and crowd systems live in `babylon-traffic-crowds.md`.
- Frame, asset, and GPU-memory budgets live in `babylon-photoreal-budgets.md`.
- No engine switch (three.js/PlayCanvas/Godot), no netcode, no shipping or
  PWA changes, no demo scene or asset binaries.
