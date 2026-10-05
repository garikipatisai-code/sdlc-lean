import { test } from 'node:test';
import assert from 'node:assert/strict';

test('ux status helper records tier and confidence fail-open', async () => {
  const plugin = await import('../../.opencode/plugins/sdlc-lean.js');
  assert.equal(typeof plugin.uxStatus, 'function');
  const s = plugin.uxStatus({ tier: 'Assist', confidence: 'high' });
  assert.ok(s && typeof s === 'object');
  await plugin.uxStatus(null); // must not throw
});
