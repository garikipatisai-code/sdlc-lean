import { test } from 'node:test';
import assert from 'node:assert/strict';

test('ux status helper records tier and confidence fail-open', async () => {
  const plugin = await import('../../.opencode/plugins/sdlc-lean.js');
  assert.equal(typeof plugin.uxStatus, 'function');
  const s = plugin.uxStatus({ tier: 'Assist', confidence: 'high' });
  assert.ok(s && typeof s === 'object');
  await plugin.uxStatus(null); // must not throw
});

test('Phase C T4 pin: recordUxStatus caller plus getSdlcStatus shape', async () => {
  const plugin = await import('../../.opencode/plugins/sdlc-lean.js');
  assert.equal(typeof plugin.recordUxStatus, 'function');
  assert.equal(typeof plugin.getSdlcStatus, 'function');
  await plugin.recordUxStatus({ result: 'fail', tier: 'Assist', confidence: 'high' });
  await plugin.recordUxStatus(null);
  await plugin.recordUxStatus({ result: 'pass', tier: '', confidence: 'high' });
  await plugin.recordUxStatus({ result: 'pass', tier: 'Assist', confidence: '' });
  const s = plugin.recordUxStatus({ result: 'pass', tier: 'Assist', confidence: 'high' });
  assert.ok(s && typeof s === 'object');
  assert.deepEqual(s.ux, { tier: 'Assist', confidence: 'high' });
  const st = plugin.getSdlcStatus('/nonexistent-root');
  assert.ok(st && typeof st === 'object');
  assert.equal(st.gate, null);
  assert.equal(typeof st.skills, 'number');
  const st2 = plugin.getSdlcStatus('/nonexistent-root');
  assert.ok('status' in st2);
});

test('Phase C T4 seam pin: single uxStatus call site, hooks unwired, tasks 1-3 intact', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const root = path.resolve(import.meta.dirname, '../..');
  const text = fs.readFileSync(path.join(root, '.opencode/plugins/sdlc-lean.js'), 'utf8');
  assert.equal((text.match(/uxStatus\(/g) || []).length, 1, 'exactly one uxStatus( call site');
  const v1Start = text.indexOf("'tool.execute.before'");
  assert.ok(!text.slice(v1Start, v1Start + 500).includes('recordUxStatus'), 'V1 hook stays unwired');
  const plugin = await import('../../.opencode/plugins/sdlc-lean.js');
  assert.throws(() => plugin.checkAgentPathScope('test-writer', 'edit', 'src/app.js'), /outside tests/);
  assert.equal(plugin.checkReviewerBash('code-reviewer', 'node --test tests/x.mjs'), true);
  assert.throws(() => plugin.checkReviewerBash('code-reviewer', 'rm -rf /'), /refused/);
  assert.equal(plugin.checkPhaseLedgerGate({}, undefined), null);
  assert.throws(() => plugin.checkPhaseLedgerGate(null, { phaseId: 'p1' }), /ledger-unreadable/);
});
