# Babylon.js traffic + crowds (Babylon.js 9 + Havok + Recast)

Route: deterministic traffic and instanced crowds for a Babylon.js 9 scene.
WebGL2 is the floor; WebGPU is progressive enhancement, never WebGPU-only.
Sim rules live in `sim/`; presentation lives in `render/` — never mix them.

## 1. Deterministic traffic sim (Havok arcade-kinematic)

- Run traffic on a fixed-step deterministic sim: accumulate real delta time and
  advance the sim in fixed-step ticks (e.g. 1/60 s), then interpolate
  transforms in `render/` between the last two `sim/` ticks.
- Keep all sim state (positions, velocities, lane slots, light phases) in
  `sim/`; `render/` only reads snapshots and writes mesh transforms. Sim
  separated from render code: no physics, lane logic, or spawn/despawn
  decisions inside `render/`.
- Use Havok arcade-kinematic vehicles (kinematic bodies steered by code, not
  full dynamic rigid bodies): Havok resolves collisions while your `sim/`
  code owns acceleration, steering, and lane following.
- Pool every vehicle agent: fixed-size pool, reuse slots, zero per-frame
  allocation on the hot path.

### Vehicle param table (arcade-kinematic ranges)

| Param | Low tier | Mid tier | High tier | Notes |
|---|---|---|---|---|
| accel (m/s^2) | 6–8 | 8–12 | 12–16 | Clamp per vehicle class; scale by surface grip |
| top speed (m/s) | 12–18 | 18–28 | 28–38 | Cap before steering, never after |
| steer rate (rad/s) | 1.2–1.8 | 1.8–2.6 | 2.6–3.2 | Reduce with speed (grip-limited yaw) |
| grip (lateral friction) | 0.7–0.9 | 0.9–1.1 | 1.1–1.3 | Lower on wet/dirt; raise only with tire class |
| drift (slip angle) | 0–8 deg | 8–15 deg | 15–25 deg | Visual slip only; sim heading stays stable |

### Anti-patterns

- Never tie handling to framerate: no per-frame Euler integration with raw
  `deltaTime`, no steering/accel scaled by rendered fps. All handling math
  runs inside the fixed-step `sim/` tick only.
- CCD threshold: enable continuous collision detection (CCD) only for agents
  above the CCD threshold (fast movers, e.g. > 20 m/s or thinner than their
  per-tick travel); cheap discrete checks for everything else.
- Fixed-step sim in `sim/` vs `render/`: `sim/` owns the fixed-step
  accumulator and tick loop; `render/` owns interpolation and mesh sync and
  must never step, fork, or re-time the sim.

## 2. Crowds (Recast + instancing)

- Build order is strict: `createNavMesh` first (bake walkable surfaces), then
  `createCrowd` (attach the crowd manager to that mesh), then add agents.
  Never add agents before `createCrowd`, never query paths before
  `createNavMesh`.
- Render crowds with instancing: one instanced draw per body-part/lod bucket
  (e.g. torso, head, legs), per-instance color variation via instance buffers.
  No per-agent mesh clones, no per-agent materials.
- Animate with animation LOD: full skeletal clip near the camera, reduced
  bone set mid-range, frozen/flow-billboard far (see LOD section).

### Agent caps per tier

| Tier | Traffic agents (caps) | Crowd agents (caps) | Notes |
|---|---|---|---|
| Low (mobile) | 8 vehicle caps | 40 crowd caps | Flow/billboard beyond near band |
| Mid | 16 vehicle caps | 120 crowd caps | Full avoidance near, flow mid |
| High (desktop) | 32 vehicle caps | 300 crowd caps | Full avoidance + full anim near |

- Caps are hard ceilings: spawners queue or cull beyond caps, never grow the
  pool. Measure against the budgets ref and lower caps before touching tick
  rate.

### Crowd LOD (avoidance + presentation)

- Near band (full avoidance + full animation): Recast avoidance on, separation
  + obstacle avoidance per agent, full skeletal clips, per-agent speed/phase.
- Mid band (flow + reduced animation): lane/flow-field following, avoidance
  sampled at reduced rate, reduced bone set or shared clips.
- Far band (flow/billboard): no per-agent avoidance — follow flow vectors,
  render as billboard impostors or frozen low-poly instances, update at
  staggered ticks (e.g. every 4th sim tick).

## 3. Non-color cues

- Never signal agent state by color alone: pair every state (alert, yield,
  blocked, boarding) with a shape/motion/audio cue (icon sprite, brake-light
  mesh toggle, gesture clip, horn blip) so color-blind players get parity.

## Non-goals

- Rendering, PBR, and post live in `babylon-photoreal-rendering.md`.
- World streaming, LOD, and eviction live in `babylon-world-streaming.md`.
- Frame, asset, and GPU-memory budgets live in
  `babylon-photoreal-budgets.md`.
- No engine switch (three.js/PlayCanvas/Godot), no netcode, no shipping or
  PWA changes, no demo scene or asset binaries.
