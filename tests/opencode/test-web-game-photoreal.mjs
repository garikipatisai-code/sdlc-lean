// Photoreal contract (Tasks 1-5): rendering reference keywords + tier table
// (Task 1, AC-1/AC-8/AC-10) plus streaming, traffic/crowds, budgets, and
// SKILL.md routes (Tasks 2-5, AC-2..AC-7/AC-9). Task 1 assertions below are
// pinned — later tasks only activate the Task 2-5 tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const refDir = path.join(root, '.opencode/skills/web-game-development/references');
const renderingRef = path.join(refDir, 'babylon-photoreal-rendering.md');

const read = (file) => fs.readFileSync(file, 'utf8');
const lower = (text) => text.toLowerCase();

test('rendering ref exists', () => {
  assert.ok(fs.existsSync(renderingRef), 'babylon-photoreal-rendering.md must exist');
});

test('rendering ref covers PBR materials and IBL', () => {
  const text = lower(read(renderingRef));
  for (const needle of ['pbrmaterial', 'pbr', 'ibl']) {
    assert.ok(text.includes(needle), `rendering ref must mention ${needle}`);
  }
});

test('rendering ref covers baked GI lightmaps and probes', () => {
  const text = lower(read(renderingRef));
  for (const needle of ['lightmap', 'reflection probe', 'gi probe']) {
    assert.ok(text.includes(needle), `rendering ref must mention ${needle}`);
  }
});

test('rendering ref covers volumetrics opt-in and tier-gated post', () => {
  const text = lower(read(renderingRef));
  for (const needle of ['volumetric', 'ssr', 'bloom', 'depth of field']) {
    assert.ok(text.includes(needle), `rendering ref must mention ${needle}`);
  }
});

test('rendering ref states WebGL2 floor plus WebGPU enhancement', () => {
  const text = lower(read(renderingRef));
  assert.ok(text.includes('webgl2'), 'rendering ref must state the WebGL2 floor');
  assert.ok(text.includes('webgpu'), 'rendering ref must mention WebGPU progressive enhancement');
  assert.ok(
    text.includes('progressive enhancement') || text.includes('fallback'),
    'rendering ref must state fallback, never WebGPU-only',
  );
});

test('rendering ref covers context-loss recovery', () => {
  const text = lower(read(renderingRef));
  assert.ok(
    text.includes('device.lost') || text.includes('webglcontextlost'),
    'rendering ref must cover device.lost / webglcontextlost recovery',
  );
});

test('rendering ref has a WebGPU-full / WebGL2-reduced tier table', () => {
  const text = read(renderingRef);
  assert.ok(text.includes('|'), 'rendering ref must include a tier table');
  const low = text.toLowerCase();
  assert.ok(low.includes('webgpu') && low.includes('webgl2'), 'tier table must name both tiers');
});

test('streaming ref covers chunk/HLOD/PVS/eviction/EgWg', () => {
  const file = path.join(refDir, 'babylon-world-streaming.md');
  assert.ok(fs.existsSync(file), 'babylon-world-streaming.md must exist');
  const text = lower(read(file));
  for (const needle of ['chunk', 'hlod', 'pvs', 'evict', 'egwg']) {
    assert.ok(text.includes(needle), `streaming ref must mention ${needle}`);
  }
  for (const needle of ['lod', 'culling', 'tile streaming', 'eviction']) {
    assert.ok(text.includes(needle), `streaming ref must mention ${needle}`);
  }
  assert.ok(
    text.includes('onchunkloadobservable') && text.includes('onchunkunloadobservable'),
    'streaming ref must state distance-X load/unload observables',
  );
});

test('traffic-crowds ref covers deterministic sim separation', () => {
  const file = path.join(refDir, 'babylon-traffic-crowds.md');
  assert.ok(fs.existsSync(file), 'babylon-traffic-crowds.md must exist');
  const text = lower(read(file));
  for (const needle of ['havok', 'fixed-step', 'deterministic']) {
    assert.ok(text.includes(needle), `traffic-crowds ref must mention ${needle}`);
  }
  const raw = read(file);
  assert.ok(raw.includes('sim/'), 'traffic sim must live in sim/');
  assert.ok(raw.includes('render/'), 'traffic render sync must live in render/');
});

test('traffic-crowds ref covers instanced crowds with caps', () => {
  const file = path.join(refDir, 'babylon-traffic-crowds.md');
  const raw = read(file);
  const text = lower(raw);
  assert.ok(raw.includes('createNavMesh'), 'crowds ref must state createNavMesh order');
  assert.ok(raw.includes('createCrowd'), 'crowds ref must state createCrowd order');
  assert.ok(text.includes('instanc'), 'crowds ref must cover instancing');
  assert.ok(text.includes('caps'), 'crowds ref must state agent caps');
});

test('budgets ref states frame, asset, GPU-memory budgets', () => {
  const file = path.join(refDir, 'babylon-photoreal-budgets.md');
  assert.ok(fs.existsSync(file), 'babylon-photoreal-budgets.md must exist');
  const raw = read(file);
  const text = lower(raw);
  assert.ok(raw.includes('|'), 'budgets ref must include a format table');
  for (const needle of ['frame', 'asset', 'gpu memory']) {
    assert.ok(text.includes(needle), `budgets ref must mention ${needle}`);
  }
  assert.ok(text.includes('lcp') && text.includes('2.5'), 'budgets ref must state LCP ≤2.5s');
  assert.ok(text.includes('500mb'), 'budgets ref must state the ≤500MB portal cap');
  assert.ok(text.includes('vram'), 'budgets ref must state VRAM caps');
  assert.ok(text.includes('multi-gb'), 'budgets ref must state the multi-GB pattern');
  assert.ok(text.includes('ktx2'), 'budgets ref must state the KTX2 rule');
});

test('SKILL.md routes all four refs at or under 155 lines', () => {
  const skill = path.join(root, '.opencode/skills/web-game-development/SKILL.md');
  const text = read(skill);
  for (const needle of [
    'babylon-photoreal-rendering',
    'babylon-world-streaming',
    'babylon-traffic-crowds',
    'babylon-photoreal-budgets',
  ]) {
    assert.ok(text.includes(needle), `SKILL.md must route ${needle}`);
  }
  const lines = text.split('\n').length;
  assert.ok(lines <= 155, `SKILL.md must stay at or under 155 lines (got ${lines})`);
});
