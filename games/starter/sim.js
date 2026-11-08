// games/starter/sim.js
//
// DOM-free deterministic fixed-step simulation.
// Runs under Node (CLI) and in the browser (ESM import). Zero dependencies.
//
// CLI: node games/starter/sim.js --ticks 600 --seed 7
//   prints: stateHash:<hex>   (deterministic for a given --seed / --ticks)

export const TICK = 1 / 60;       // fixed step, seconds
const MAX_ACCUMULATOR = 0.25;   // clamped accumulator (spiral-of-death guard)

export function assertNonNegativeInt(name, value) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer (NonNegativeInt), got ${String(value)}`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Seeded RNG: mulberry32. Pure, deterministic, no Math.random / Date.
// ---------------------------------------------------------------------------
export function createRng(seed) {
  assertNonNegativeInt('seed', seed);
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Sim state
// ---------------------------------------------------------------------------
const PLAYER_SPEED = 120; // units per second
const ENTITY_COUNT = 8;
const BOUND = 120;

export function createState(seed = 1) {
  assertNonNegativeInt('seed', seed);
  const rng = createRng(seed);
  const entities = [];
  for (let i = 0; i < ENTITY_COUNT; i += 1) {
    entities.push({
      id: i,
      x: (rng() * 2 - 1) * BOUND,
      y: (rng() * 2 - 1) * BOUND,
      vx: (rng() - 0.5) * 40,
      vy: (rng() - 0.5) * 40,
    });
  }
  return {
    tick: 0,
    x: 0,
    y: 0,
    dir: 0,
    entities,
  };
}

// ---------------------------------------------------------------------------
// Fixed step. Pure: (state, dt, actions) -> next state.
// ---------------------------------------------------------------------------
export function step(state, dt, actions = {}) {
  let mx = 0;
  let my = 0;
  if (actions.forward) my -= 1;
  if (actions.back) my += 1;
  if (actions.left) mx -= 1;
  if (actions.right) mx += 1;

  const len = Math.hypot(mx, my);
  if (len > 0) {
    mx /= len;
    my /= len;
    state.dir = Math.atan2(my, mx);
  }

  state.x += mx * PLAYER_SPEED * dt;
  state.y += my * PLAYER_SPEED * dt;

  for (const e of state.entities) {
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (e.x < -BOUND || e.x > BOUND) e.vx *= -1;
    if (e.y < -BOUND || e.y > BOUND) e.vy *= -1;
  }

  state.tick += 1;
  return state;
}

// ---------------------------------------------------------------------------
// Fixed-step driver with clamped accumulator.
// ---------------------------------------------------------------------------
export function runSim({ ticks = 600, seed = 1, actions = {} } = {}) {
  assertNonNegativeInt('ticks', ticks);
  assertNonNegativeInt('seed', seed);
  const state = createState(seed);
  let acc = 0;
  for (let i = 0; i < ticks; i += 1) {
    acc += TICK; // elapsed time for this frame
    if (acc > MAX_ACCUMULATOR) acc = MAX_ACCUMULATOR; // clamp
    while (acc >= TICK) {
      step(state, TICK, actions);
      acc -= TICK;
    }
  }
  return state;
}

// ---------------------------------------------------------------------------
// Deterministic state hash (FNV-1a 32-bit) -> hex.
// ---------------------------------------------------------------------------
export function hashState(state) {
  const parts = [
    `tick=${state.tick}`,
    `x=${state.x.toFixed(3)}`,
    `y=${state.y.toFixed(3)}`,
    `dir=${state.dir.toFixed(3)}`,
  ];
  for (const e of state.entities) {
    parts.push(
      `e${e.id}=${e.x.toFixed(3)}:${e.y.toFixed(3)}:${e.vx.toFixed(3)}:${e.vy.toFixed(3)}`,
    );
  }
  const str = parts.join('|');

  let h = 0x811c9dc5; // FNV-1a 32-bit offset basis
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// ---------------------------------------------------------------------------
// CLI entry point (Node only). No DOM, no Math.random, no Date.
// Detected via path.resolve(argv[1]) === fileURLToPath(import.meta.url) so
// relative invocations work. node builtins are lazy-loaded so browser ESM
// import (render.js) stays intact. If unresolvable, fail closed (not main).
// ---------------------------------------------------------------------------
let isMain = false;
if (typeof process !== 'undefined' && process.argv[1]) {
  try {
    const { default: path } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    isMain = path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    isMain = false;
  }
}

if (isMain) {
  let ticks = 600;
  let seed = 1;
  const argv = process.argv;
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--ticks' || key === '--seed') {
      const raw = argv[i + 1];
      if (raw === undefined || typeof raw !== 'string' || raw.trim() === '') {
        throw new Error(`${key} must be a non-negative integer (NonNegativeInt)`);
      }
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0) {
        throw new Error(`${key} must be a non-negative integer (NonNegativeInt)`);
      }
      if (key === '--ticks') ticks = n;
      else seed = n;
      i += 1;
    } else if (typeof key === 'string' && (key.startsWith('--ticks=') || key.startsWith('--seed='))) {
      const eq = key.indexOf('=');
      const flag = key.slice(0, eq);
      const raw = key.slice(eq + 1);
      if (raw.trim() === '' || !Number.isInteger(Number(raw)) || Number(raw) < 0) {
        throw new Error(`${flag} must be a non-negative integer (NonNegativeInt)`);
      }
      if (flag === '--ticks') ticks = Number(raw);
      else seed = Number(raw);
    }
  }
  const state = runSim({ ticks, seed });
  console.log(`stateHash:${hashState(state)}`);
}
