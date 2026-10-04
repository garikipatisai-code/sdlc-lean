// Event-parser tests: tolerant of partial and unknown lines.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEvents } from '../../eval/lib/parse.mjs';

test('joins text and collects skills and tools', () => {
  const fixture = [
    JSON.stringify({ type: 'text', part: { type: 'text', text: 'hello' } }),
    JSON.stringify({ type: 'tool_use', part: { type: 'tool', tool: 'skill', state: { input: { id: 'brainstorming' }, output: '<skill_content name="brainstorming">' } } }),
    JSON.stringify({ type: 'tool_use', part: { type: 'tool', tool: 'read', state: { input: { filePath: 'a' }, output: 'ok' } } }),
    '',
    'not json at all',
    '{"partial":',
    JSON.stringify({ type: 'text', part: { type: 'text', text: 'world' } }),
  ].join('\n');
  const obs = parseEvents(fixture);
  assert.match(obs.text, /hello/);
  assert.match(obs.text, /world/);
  assert.ok(obs.skills.includes('brainstorming'));
  assert.ok(obs.tools.includes('read'));
  assert.equal(obs.blocked, false);
});

test('detects a guard block from any text', () => {
  const obs = parseEvents('{"type":"text","text":"[sdlc-lean] Refusing destructive command."}');
  assert.equal(obs.blocked, true);
});

test('accepts an array of already-parsed events', () => {
  const obs = parseEvents([{ type: 'text', text: 'hi' }]);
  assert.match(obs.text, /hi/);
});

test('sums per-step token usage and cost from the stream', () => {
  const fixture = [
    JSON.stringify({ type: 'step_finish', part: { type: 'step-finish', cost: 0.002, tokens: { input: 100, output: 20, reasoning: 0, cache: { read: 5, write: 0 } } } }),
    JSON.stringify({ type: 'step_finish', part: { type: 'step-finish', cost: 0.001, tokens: { input: 50, output: 10, reasoning: 0, cache: { read: 0, write: 0 } } } }),
  ].join('\n');
  const obs = parseEvents(fixture);
  assert.equal(obs.usage.cost, 0.003);
  assert.equal(obs.usage.tokens.input, 150);
  assert.equal(obs.usage.tokens.output, 30);
  assert.equal(obs.usage.tokens.cache.read, 5);
});

test('detects skills from a skill_content marker in text', () => {
  const obs = parseEvents('{"type":"text","text":"Using it.\\n<skill_content name=\\"systematic-debugging\\">"}');
  assert.ok(obs.skills.includes('systematic-debugging'));
});
