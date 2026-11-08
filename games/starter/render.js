// games/starter/render.js
//
// Canvas renderer for the greybox starter. DOM-dependent (browser only).
// Fixed-step sim + interpolation: render alpha = acc / dt (dt == TICK).
// Imports the DOM-free sim from ./sim.js.
//
// Canonical state: replay seed+input -> hash (scripts/game-replay.mjs).
// Render is presentation only, not canonical.

import { createState, step, TICK } from './sim.js';
import { createInput } from './input.js';

const CANVAS_W = 640;
const CANVAS_H = 480;
const MAX_ACC = 0.25;

// Deep-copy snapshot of the full sim state for interpolation/rendering.
export function snapshotState(s) {
  return {
    x: s.x,
    y: s.y,
    dir: s.dir,
    tick: s.tick,
    entities: s.entities.map((e) => ({ id: e.id, x: e.x, y: e.y, vx: e.vx, vy: e.vy })),
  };
}

const hasDom = typeof document !== 'undefined' && typeof window !== 'undefined'
  && typeof performance !== 'undefined';

function createCanvas() {
  const existing = document.querySelector('canvas');
  const canvas = existing ?? document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  canvas.style.border = '1px solid #333';
  if (!existing) document.body.appendChild(canvas);
  return canvas;
}

const canvas = hasDom ? createCanvas() : null;
if (hasDom) {
  document.body.style.margin = '0';
  document.body.style.background = '#0b0c10';
}
const ctx = canvas ? canvas.getContext('2d') : null;
const input = hasDom ? createInput() : null;

const state = createState(1);
let prev = snapshotState(state);
let acc = 0;
let last = hasDom ? performance.now() : 0;

function actionsFromInput() {
  if (!input) return {};
  const a = input.get();
  return {
    forward: a.forward,
    back: a.back,
    left: a.left,
    right: a.right,
  };
}

export function draw(snapshot = snapshotState(state), alpha = acc / TICK) {
  // Interpolation alpha = acc / dt (dt == TICK), clamped to [0, 1].
  let a = alpha;
  if (a > 1) a = 1;
  if (a < 0) a = 0;

  const ix = prev.x + (snapshot.x - prev.x) * a;
  const iy = prev.y + (snapshot.y - prev.y) * a;

  if (!ctx) return { x: ix, y: iy, tick: snapshot.tick, alpha: a };

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#d8d8d8';
  for (const e of snapshot.entities) {
    ctx.fillRect(CANVAS_W / 2 + e.x - 2, CANVAS_H / 2 + e.y - 2, 4, 4);
  }
  ctx.fillStyle = '#1ea7a8';
  ctx.fillRect(CANVAS_W / 2 + ix - 6, CANVAS_H / 2 + iy - 6, 12, 12);
  ctx.fillStyle = '#d8d8d8';
  ctx.font = '14px monospace';
  ctx.fillText(`tick ${snapshot.tick}  alpha ${a.toFixed(2)}`, 10, 20);
  return { x: ix, y: iy, tick: snapshot.tick, alpha: a };
}

export function frame(now = hasDom ? performance.now() : 0) {
  if (!hasDom) return;
  const dt = (now - last) / 1000;
  last = now;
  acc += dt;
  if (acc > MAX_ACC) acc = MAX_ACC; // clamp

  let steps = 0;
  while (acc >= TICK && steps < 6) {
    prev = snapshotState(state);
    step(state, TICK, actionsFromInput());
    acc -= TICK;
    steps += 1;
  }

  draw();
  requestAnimationFrame(frame);
}

if (hasDom) requestAnimationFrame(frame);
