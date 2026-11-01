// Autonomy-by-default installer payload tests (Task 4).
// Hermetic: tmp targets, fixtures in-test, real repo as source (byte parity).
// Mirrors tests/scripts/test-install-global.mjs helper patterns.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

const scriptURL = pathToFileURL(path.resolve(import.meta.dirname, '../../scripts/install-global.mjs')).href;
const mod = await import(scriptURL);

const mkTmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));

const PAYLOAD = [
  { rel: path.join('docs', 'auto-envelope.template.md'), key: 'envelope' },
  { rel: path.join('docs', 'AUTONOMY.md'), key: 'autonomy' },
  { rel: path.join('docs', 'audit-ledger.md'), key: 'ledger' },
];

test('fresh install contains the envelope template byte-identical', (t) => {
  const target = mkTmp('sdlc-autonomy-fresh-template-');
  t.after(() => fs.rmSync(target, { recursive: true, force: true }));
  const summary = mod.installGlobal({ repo: mod.repoRoot, target });
  assert.equal(summary.envelope, 1);
  const installed = fs.readFileSync(path.join(target, 'docs', 'auto-envelope.template.md'));
  const repoCopy = fs.readFileSync(path.join(mod.repoRoot, 'docs', 'auto-envelope.template.md'));
  assert.ok(installed.equals(repoCopy));
});

test('fresh install contains AUTONOMY.md byte-identical', (t) => {
  const target = mkTmp('sdlc-autonomy-fresh-standing-');
  t.after(() => fs.rmSync(target, { recursive: true, force: true }));
  const summary = mod.installGlobal({ repo: mod.repoRoot, target });
  assert.equal(summary.autonomy, 1);
  const installed = fs.readFileSync(path.join(target, 'docs', 'AUTONOMY.md'));
  const repoCopy = fs.readFileSync(path.join(mod.repoRoot, 'docs', 'AUTONOMY.md'));
  assert.ok(installed.equals(repoCopy));
});

test('fresh install contains a header-only audit ledger', (t) => {
  const target = mkTmp('sdlc-autonomy-fresh-ledger-');
  t.after(() => fs.rmSync(target, { recursive: true, force: true }));
  const summary = mod.installGlobal({ repo: mod.repoRoot, target });
  assert.equal(summary.ledger, 1);
  const text = fs.readFileSync(path.join(target, 'docs', 'audit-ledger.md'), 'utf8');
  const repoCopy = fs.readFileSync(path.join(mod.repoRoot, 'docs', 'audit-ledger.md'));
  assert.ok(Buffer.from(text).equals(repoCopy));
  assert.ok(text.includes('| date | tier | check | result | reversal |'));
  const lines = text.split('\n');
  const head = lines.findIndex((l) => l.includes('| date |'));
  assert.ok(head >= 0);
  const dataRows = lines.slice(head + 2).filter((l) => l.trim().startsWith('|'));
  assert.deepEqual(dataRows, []);
});

test('pre-seeded envelope and ledger files are left byte-identical', (t) => {
  const target = mkTmp('sdlc-autonomy-seeded-');
  t.after(() => fs.rmSync(target, { recursive: true, force: true }));
  const seeds = new Map();
  for (const { rel } of PAYLOAD) {
    const dest = path.join(target, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const custom = `# mine ${rel}\n`;
    fs.writeFileSync(dest, custom);
    seeds.set(rel, custom);
  }
  mod.installGlobal({ repo: mod.repoRoot, target });
  for (const { rel } of PAYLOAD) {
    assert.equal(fs.readFileSync(path.join(target, rel), 'utf8'), seeds.get(rel));
  }
});

test('skipped payload files are excluded from the manifest', (t) => {
  const target = mkTmp('sdlc-autonomy-manifest-');
  t.after(() => fs.rmSync(target, { recursive: true, force: true }));
  for (const { rel } of PAYLOAD) {
    const dest = path.join(target, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, `# mine ${rel}\n`);
  }
  const summary = mod.installGlobal({ repo: mod.repoRoot, target });
  assert.equal(summary.envelope, 0);
  assert.equal(summary.autonomy, 0);
  assert.equal(summary.ledger, 0);
  const manifest = JSON.parse(fs.readFileSync(path.join(target, mod.MANIFEST), 'utf8'));
  for (const { rel } of PAYLOAD) {
    assert.ok(!manifest.files.includes(rel));
  }
});

test('skipped payload files produce an already-present report', (t) => {
  const target = mkTmp('sdlc-autonomy-report-');
  t.after(() => fs.rmSync(target, { recursive: true, force: true }));
  for (const { rel } of PAYLOAD) {
    const dest = path.join(target, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, `# mine ${rel}\n`);
  }
  const logged = [];
  const orig = console.log;
  console.log = (...args) => { logged.push(args.join(' ')); };
  try {
    mod.installGlobal({ repo: mod.repoRoot, target });
  } finally {
    console.log = orig;
  }
  assert.ok(logged.some((line) => line.includes('already present, skipped')));
});
