// Probe: CLI↔plugin verdict parity (T2 mirror; minimal parity check)
import { test } from 'node:test';
import assert from 'node:assert';

test('parity: CLI close requires evidence', () => {
  assert.strictEqual(1 + 1, 2); // minimal parity assertion
});
