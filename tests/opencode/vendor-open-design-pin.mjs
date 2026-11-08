// Vendor pin: nexu-io/open-design commit + Apache-2.0 license verification.
// Asserts PIN.json SHA is 40-hex, every SHA256SUMS entry recomputes from
// bytes on disk (tolerates future Task2/3 entries by iterating all lines),
// and ATTRIBUTION.md names upstream + Apache-2.0 + SHA with refs-only note.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '../..');
const vendorDir = path.join(root, '.opencode/skills/frontend-design/references/vendor/open-design');
const pinPath = path.join(vendorDir, 'PIN.json');
const sumsPath = path.join(vendorDir, 'SHA256SUMS');
const attrPath = path.join(vendorDir, 'ATTRIBUTION.md');

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

test('pin: PIN.json exists with 40-hex commit SHA and Apache-2.0', () => {
  assert.ok(fs.existsSync(pinPath), 'PIN.json must exist');
  const pin = JSON.parse(fs.readFileSync(pinPath, 'utf8'));
  assert.equal(pin.repo ?? pin.upstream ?? '', 'nexu-io/open-design');
  const sha = pin.sha ?? pin.commit ?? '';
  assert.match(sha, /^[0-9a-f]{40}$/, `sha must be 40-hex, got ${JSON.stringify(sha)}`);
  assert.match(JSON.stringify(pin), /Apache-2\.0/, 'PIN.json must record Apache-2.0');
});

test('pin: every SHA256SUMS entry recomputes from disk', () => {
  assert.ok(fs.existsSync(sumsPath), 'SHA256SUMS must exist');
  const lines = fs.readFileSync(sumsPath, 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  assert.ok(lines.length >= 2, 'SHA256SUMS must list at least PIN.json and ATTRIBUTION.md');
  for (const line of lines) {
    const m = line.match(/^([0-9a-f]{64})\s+(.+)$/);
    assert.ok(m, `malformed SHA256SUMS line: ${JSON.stringify(line)}`);
    const [, expected, rel] = m;
    const fp = path.join(vendorDir, rel.trim());
    assert.ok(fs.existsSync(fp), `SHA256SUMS entry missing on disk: ${rel}`);
    assert.equal(sha256(fs.readFileSync(fp)), expected, `SHA mismatch for ${rel}`);
  }
});

test('pin: ATTRIBUTION.md names upstream + Apache-2.0 + SHA + refs-only', () => {
  assert.ok(fs.existsSync(attrPath), 'ATTRIBUTION.md must exist');
  const pin = JSON.parse(fs.readFileSync(pinPath, 'utf8'));
  const sha = pin.sha ?? pin.commit ?? '';
  const text = fs.readFileSync(attrPath, 'utf8');
  assert.ok(text.includes('nexu-io/open-design'), 'must name upstream nexu-io/open-design');
  assert.ok(text.includes('Apache-2.0'), 'must name Apache-2.0');
  assert.ok(sha && text.includes(sha), 'must name pinned SHA');
  assert.ok(/refs-only/i.test(text), 'must carry refs-only note');
});

test('pin: Task 3b vendored manifest extractor + contract dep (adapted import)', () => {
  const extractorPath = path.join(vendorDir, 'extract-components-manifest.ts');
  const depPath = path.join(vendorDir, 'contracts/components-manifest.ts');
  const contractPath = path.join(vendorDir, 'contracts/components-manifest.contract.json');
  assert.ok(fs.existsSync(depPath), 'contracts/components-manifest.ts must exist');
  assert.ok(fs.existsSync(extractorPath), 'extract-components-manifest.ts must exist');
  const extractor = fs.readFileSync(extractorPath, 'utf8');
  assert.ok(extractor.includes('./contracts/components-manifest.ts'), 'extractor must import adapted ./contracts/components-manifest.ts');
  assert.ok(!extractor.includes('../packages/contracts/src/design-systems/components-manifest.ts'), 'extractor must not keep upstream ../packages import');
  const dep = fs.readFileSync(depPath, 'utf8');
  assert.ok(dep.includes('export type ComponentsManifest'), 'dep must export ComponentsManifest');
  assert.ok(fs.existsSync(contractPath), 'contracts/components-manifest.contract.json must exist');
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  assert.equal(contract.derived, true, 'contract must be marked derived');
  assert.ok(contract.derivedDate, 'contract must carry derived date');
  const required = JSON.stringify(contract);
  for (const field of ['schemaVersion', 'brandId', 'source', 'fixture', 'tokens', 'selectors', 'classes', 'elements', 'groups', 'literals']) {
    assert.ok(required.includes(field), `contract must cover field: ${field}`);
  }
});

test('pin: checker has no dangling ../ import (adapted to ./token-schema.ts)', () => {
  const checkerPath = path.join(vendorDir, 'check-tokens-fixture-sync.ts');
  assert.ok(fs.existsSync(checkerPath), 'check-tokens-fixture-sync.ts must exist');
  // No ../ import remains in any vendor/open-design/*.ts
  for (const name of fs.readdirSync(vendorDir).filter((f) => f.endsWith('.ts'))) {
    const content = fs.readFileSync(path.join(vendorDir, name), 'utf8');
    for (const line of content.split('\n')) {
      if (/^\s*import\b/.test(line) || /from\s+['"]\.\.\//.test(line)) {
        assert.ok(!/\.\.\//.test(line), `${name} must not contain ../ import: ${line.trim()}`);
      }
    }
    assert.ok(!content.includes('"../') && !content.includes("'../"), `${name} must not contain "../ import`);
  }
  const checker = fs.readFileSync(checkerPath, 'utf8');
  assert.ok(checker.includes('./token-schema.ts'), 'checker must import adapted ./token-schema.ts');
  assert.ok(!checker.includes('../design-systems/_schema/tokens.schema.ts'), 'checker must not keep dangling ../design-systems import');
});
