// Digest + cache-binding tests for scripts/research/protocol.mjs (node --test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const modURL = pathToFileURL(path.resolve(import.meta.dirname, '../../../scripts/research/protocol.mjs')).href;
const mod = await import(modURL);

const mkTmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));

test('hashFile streams and matches readFileSync sha256 for a 2MB file', async (t) => {
  const dir = mkTmp('sdlc-hashfile-');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'big.bin');
  fs.writeFileSync(file, crypto.randomBytes(2 * 1024 * 1024));
  const expected = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const got = await mod.hashFile(file);
  assert.equal(got, expected);
});

test('hashFile is symlink-safe (hashes target content)', async (t) => {
  const dir = mkTmp('sdlc-symlink-');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'real.bin');
  fs.writeFileSync(file, 'symlink target payload');
  const link = path.join(dir, 'link.bin');
  fs.symlinkSync(file, link);
  assert.equal(await mod.hashFile(link), await mod.hashFile(file));
});

test('hashObject is key-order-insensitive', () => {
  assert.equal(mod.hashObject({ a: 1, b: 2 }), mod.hashObject({ b: 2, a: 1 }));
});

test('hashObject differs when values differ', () => {
  assert.notEqual(mod.hashObject({ a: 1 }), mod.hashObject({ a: 2 }));
});

test('hashObject sorts nested object keys recursively', () => {
  const left = { x: { a: 1, b: 2 } };
  const right = { x: { b: 2, a: 1 } };
  assert.equal(mod.hashObject(left), mod.hashObject(right));
  assert.notEqual(mod.hashObject(left), mod.hashObject({ x: { a: 1, b: 3 } }));
});

test('hashObject preserves array order', () => {
  assert.notEqual(mod.hashObject([1, 2]), mod.hashObject([2, 1]));
});

test('hashObject drops undefined properties but keeps null', () => {
  assert.equal(mod.hashObject({ a: 1, gone: undefined }), mod.hashObject({ a: 1 }));
  assert.notEqual(mod.hashObject({ a: null }), mod.hashObject({ a: 1 }));
  assert.equal(mod.hashObject([1, undefined, 2]), mod.hashObject([1, 2]));
});

test('digestArtifactSet category-prefixes: same file in dataset vs model gives different digests', async (t) => {
  const dir = mkTmp('sdlc-prefix-');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'shared.jsonl');
  fs.writeFileSync(file, '{"q":1}\n{"q":2}\n');
  const digests = await mod.digestArtifactSet({ dataset: [file], model: [file], scorer: [file] });
  assert.notEqual(digests.dataset, digests.model);
  assert.notEqual(digests.model, digests.scorer);
  assert.notEqual(digests.dataset, digests.scorer);
  for (const field of ['dataset', 'model', 'scorer']) {
    assert.match(digests[field], /^[0-9a-f]{64}$/);
  }
});

test('digestArtifactSet changes when any file content changes', async (t) => {
  const dir = mkTmp('sdlc-change-');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const dataset = path.join(dir, 'dataset.jsonl');
  const scorer = path.join(dir, 'scorer.mjs');
  fs.writeFileSync(dataset, 'v1');
  fs.writeFileSync(scorer, 'score v1');
  const before = await mod.digestArtifactSet({ dataset: [dataset], scorer: [scorer] });
  fs.writeFileSync(dataset, 'v2');
  const afterDataset = await mod.digestArtifactSet({ dataset: [dataset], scorer: [scorer] });
  assert.notEqual(before.dataset, afterDataset.dataset);
  assert.equal(before.scorer, afterDataset.scorer, 'untouched category must be unchanged');
  fs.writeFileSync(scorer, 'score v2');
  const afterScorer = await mod.digestArtifactSet({ dataset: [dataset], scorer: [scorer] });
  assert.notEqual(before.scorer, afterScorer.scorer);
});

test('digestArtifactSet is order-sensitive across its file list and deterministic', async (t) => {
  const dir = mkTmp('sdlc-order-');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const f1 = path.join(dir, 'a.txt');
  const f2 = path.join(dir, 'b.txt');
  fs.writeFileSync(f1, 'alpha');
  fs.writeFileSync(f2, 'beta');
  const ab = await mod.digestArtifactSet({ model: [f1, f2] });
  const ba = await mod.digestArtifactSet({ model: [f2, f1] });
  assert.notEqual(ab.model, ba.model, 'file order must affect the digest');
  const again = await mod.digestArtifactSet({ model: [f1, f2] });
  assert.equal(ab.model, again.model, 'same inputs must give the same digest');
});

test('bindScore stamps dataset/model/scorer/protocol digests and returns the entry', () => {
  const entry = { score: 0.5, notes: 'prior run' };
  const digests = { dataset: 'd1', model: 'm1', scorer: 's1' };
  const protocolHash = 'p1';
  const bound = mod.bindScore(entry, digests, protocolHash);
  assert.equal(bound, entry, 'must return the same entry object');
  assert.deepEqual(
    { dataset: entry.dataset, model: entry.model, scorer: entry.scorer, protocol: entry.protocol },
    { dataset: 'd1', model: 'm1', scorer: 's1', protocol: 'p1' },
  );
});

test('cacheHit is true when all bound digests and protocol match, false otherwise', async (t) => {
  const dir = mkTmp('sdlc-bind-');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const dataset = path.join(dir, 'dataset.jsonl');
  const model = path.join(dir, 'model.txt');
  const scorer = path.join(dir, 'scorer.mjs');
  fs.writeFileSync(dataset, 'rows v1');
  fs.writeFileSync(model, 'weights v1');
  fs.writeFileSync(scorer, 'score v1');

  const digests = await mod.digestArtifactSet({ dataset: [dataset], model: [model], scorer: [scorer] });
  const protocolHash = 'protocol-frozen-v1';
  const entry = { score: 0.5 };
  mod.bindScore(entry, digests, protocolHash);

  assert.equal(mod.cacheHit(entry, digests, protocolHash), true, 'unchanged identity must hit');

  fs.writeFileSync(scorer, 'score v2');
  const scorerChanged = await mod.digestArtifactSet({ dataset: [dataset], model: [model], scorer: [scorer] });
  assert.equal(mod.cacheHit(entry, scorerChanged, protocolHash), false, 'scorer change must miss');
  fs.writeFileSync(scorer, 'score v1');

  fs.writeFileSync(dataset, 'rows v2');
  const datasetChanged = await mod.digestArtifactSet({ dataset: [dataset], model: [model], scorer: [scorer] });
  assert.equal(mod.cacheHit(entry, datasetChanged, protocolHash), false, 'dataset change must miss');
  fs.writeFileSync(dataset, 'rows v1');

  fs.writeFileSync(model, 'weights v2');
  const modelChanged = await mod.digestArtifactSet({ dataset: [dataset], model: [model], scorer: [scorer] });
  assert.equal(mod.cacheHit(entry, modelChanged, protocolHash), false, 'model change must miss');
  fs.writeFileSync(model, 'weights v1');

  assert.equal(mod.cacheHit(entry, digests, 'protocol-frozen-v2'), false, 'protocol change must miss');
});

test('cacheHit is false for an unbound entry', async () => {
  const digests = await mod.digestArtifactSet({});
  assert.equal(mod.cacheHit({ score: 0.5 }, digests, 'p1'), false);
});

test('empty artifact lists yield deterministic category digests', async () => {
  const omitted = await mod.digestArtifactSet({});
  const explicit = await mod.digestArtifactSet({ dataset: [], model: [], scorer: [] });
  assert.deepEqual(omitted, explicit, 'omitted and explicit-empty must agree');
  const again = await mod.digestArtifactSet({});
  assert.deepEqual(omitted, again, 'empty digests must be stable across calls');
  for (const field of ['dataset', 'model', 'scorer']) {
    assert.match(omitted[field], /^[0-9a-f]{64}$/);
  }
  assert.notEqual(omitted.dataset, omitted.model, 'empty categories must stay distinct');
  assert.notEqual(omitted.model, omitted.scorer);
});

test('cacheHit works for entries bound with empty artifact lists', async () => {
  const digests = await mod.digestArtifactSet({});
  const entry = mod.bindScore({ outcome: 'completed' }, digests, 'p-empty');
  assert.equal(mod.cacheHit(entry, digests, 'p-empty'), true);
  assert.equal(mod.cacheHit(entry, digests, 'p-other'), false);
});
