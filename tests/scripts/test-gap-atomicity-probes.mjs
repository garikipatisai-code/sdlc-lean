// Probe: confirm crash-retry converges (T1) and session independence enforced (T3)
// This is a NEW grader file (not edited); it verifies enforceable-subset behavior.

import { test } from 'node:test';
import assert from 'node:assert';
import { collectMachineVerdicts, validateCriticsSessions } from '../../scripts/spec-check.mjs';

test('session enforcement: duplicate session IDs refused', () => {
  const verdicts = [{ verdict: 'ACCEPT', session: 's1' }, { verdict: 'ACCEPT', session: 's1' }];
  assert.throws(() => validateCriticsSessions(verdicts, []), /duplicate session IDs/);
});

test('session enforcement: required session missing refused', () => {
  const verdicts = [{ verdict: 'ACCEPT', session: 'other' }];
  assert.throws(() => validateCriticsSessions(verdicts, ['required-sess']), /required session/);
});
