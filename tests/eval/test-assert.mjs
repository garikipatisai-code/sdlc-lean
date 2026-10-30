// Assertion-engine tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, passed } from '../../eval/lib/assert.mjs';

test('contains and not-contains', () => {
  const obs = { text: 'routed to brainstorming' };
  assert.ok(passed(evaluate([{ kind: 'contains', value: 'brainstorming' }], obs)));
  assert.ok(passed(evaluate([{ kind: 'not-contains', value: 'error' }], obs)));
  assert.ok(!passed(evaluate([{ kind: 'contains', value: 'missing' }], obs)));
});

test('skill and tool', () => {
  const obs = { skills: ['deep-research'], tools: ['read'] };
  assert.ok(passed(evaluate([{ kind: 'skill', value: 'deep-research' }], obs)));
  assert.ok(passed(evaluate([{ kind: 'tool', value: 'read' }], obs)));
  assert.ok(!passed(evaluate([{ kind: 'skill', value: 'brainstorming' }], obs)));
});

test('activated and blocked', () => {
  assert.ok(passed(evaluate([{ kind: 'activated' }], { activated: true })));
  assert.ok(passed(evaluate([{ kind: 'blocked' }], { blocked: true })));
  assert.ok(!passed(evaluate([{ kind: 'blocked' }], { blocked: false })));
});

test('unknown kind fails without throwing', () => {
  const r = evaluate([{ kind: 'nope' }], {});
  assert.equal(r[0].ok, false);
});

test('artifact-contains pass and fail', () => {
  const obs = { artifacts: { 'docs/design.md': '## Non-goals\nno code' } };
  const expect = [{ kind: 'artifact-contains', path: 'docs/design.md', value: '## Non-goals' }];
  const [ok] = evaluate(expect, obs);
  assert.equal(ok.ok, true);
  assert.equal(ok.path, 'docs/design.md');

  const [bad] = evaluate(
    [{ kind: 'artifact-contains', path: 'docs/design.md', value: 'Trade-offs' }],
    obs,
  );
  assert.equal(bad.ok, false);
  assert.equal(bad.error, undefined);
});

test('artifact-matches pass and fail', () => {
  const obs = { artifacts: { 'docs/plan.md': '# Plan\n| Task | Files |\n' } };
  assert.ok(
    passed(evaluate([{ kind: 'artifact-matches', path: 'docs/plan.md', value: '\\|\\s*Files\\s*\\|' }], obs)),
  );
  assert.ok(
    !passed(evaluate([{ kind: 'artifact-matches', path: 'docs/plan.md', value: '\\|\\s*Verify\\s*\\|' }], obs)),
  );
});

test('missing artifact fails with an error', () => {
  const expect = [
    { kind: 'artifact-contains', path: 'docs/nope.md', value: 'x' },
    { kind: 'artifact-matches', path: 'docs/nope.md', value: 'x' },
  ];
  for (const [i, r] of evaluate(expect, { artifacts: {} }).entries()) {
    assert.equal(r.ok, false);
    assert.equal(r.error, `artifact missing: ${expect[i].path}`);
  }
  // No artifacts map at all is the same as every artifact missing.
  const [r] = evaluate([{ kind: 'artifact-contains', path: 'docs/x.md', value: 'x' }], {});
  assert.equal(r.ok, false);
  assert.equal(r.error, 'artifact missing: docs/x.md');
});

test('empty-string artifact is present, not missing', () => {
  const obs = { artifacts: { 'docs/empty.md': '' } };
  const [contains] = evaluate(
    [{ kind: 'artifact-contains', path: 'docs/empty.md', value: 'x' }],
    obs,
  );
  assert.equal(contains.ok, false);
  assert.equal(contains.error, undefined);

  const [matches] = evaluate([{ kind: 'artifact-matches', path: 'docs/empty.md', value: '^$' }], obs);
  assert.equal(matches.ok, true);
  assert.equal(matches.error, undefined);
});

test('invalid regex fails without throwing', () => {
  const obs = { artifacts: { 'docs/x.md': 'anything' } };
  let results;
  assert.doesNotThrow(() => {
    results = evaluate([{ kind: 'artifact-matches', path: 'docs/x.md', value: '[' }], obs);
  });
  assert.equal(results[0].ok, false);
  assert.match(results[0].error, /^bad regex: /);
});

test('file-unchanged passes when the hash is identical', () => {
  const obs = {
    fileHashes: {
      before: { 'src/index.js': 'sha256:aaa' },
      after: { 'src/index.js': 'sha256:aaa' },
    },
  };
  const [r] = evaluate([{ kind: 'file-unchanged', path: 'src/index.js' }], obs);
  assert.equal(r.ok, true);
  assert.equal(r.error, undefined);
});

test('file-unchanged fails when the hash changed', () => {
  const obs = {
    fileHashes: {
      before: { 'src/index.js': 'sha256:aaa' },
      after: { 'src/index.js': 'sha256:bbb' },
    },
  };
  const [r] = evaluate([{ kind: 'file-unchanged', path: 'src/index.js' }], obs);
  assert.equal(r.ok, false);
  // A changed file is a result, not an evaluation error.
  assert.equal(r.error, undefined);
});

test('file-unchanged passes when the file was absent before and after', () => {
  const obs = {
    fileHashes: {
      before: { '.sdlc/spec-gate.json': null },
      after: { '.sdlc/spec-gate.json': null },
    },
  };
  const [r] = evaluate([{ kind: 'file-unchanged', path: '.sdlc/spec-gate.json' }], obs);
  assert.equal(r.ok, true);
  assert.equal(r.error, undefined);
});

test('file-unchanged fails for an untracked path', () => {
  const obs = {
    fileHashes: {
      before: { 'src/index.js': 'sha256:aaa' },
      after: { 'src/index.js': 'sha256:aaa' },
    },
  };
  const [r] = evaluate([{ kind: 'file-unchanged', path: 'tests/example.test.mjs' }], obs);
  assert.equal(r.ok, false);
  assert.match(r.error, /untracked|not tracked/i);
  assert.match(r.error, /tests\/example\.test\.mjs/);
});

test('file-unchanged fails without a fileHashes observation', () => {
  for (const obs of [{}, { fileHashes: {} }, { fileHashes: { before: { 'src/index.js': 'a' } } }]) {
    const [r] = evaluate([{ kind: 'file-unchanged', path: 'src/index.js' }], obs);
    assert.equal(r.ok, false);
    assert.match(r.error, /fileHashes|file hash/i);
  }
});

test('passed() is unchanged', () => {
  assert.equal(passed([]), true);
  assert.equal(passed([{ ok: true }, { ok: true }]), true);
  assert.equal(passed([{ ok: true }, { ok: false }]), false);
});

// AC3: every URL cited in the artifact must appear in observed.urls.
test('url-fetched passes when every matched URL was fetched', () => {
  const obs = {
    artifacts: {
      'docs/report.md': '## Sources\n- https://example.com/one.\n- https://example.com/two\n',
    },
    urls: ['https://example.com/one', 'https://example.com/two'],
  };
  const [r] = evaluate(
    [{ kind: 'url-fetched', path: 'docs/report.md', value: 'https?://[^\\s)\\]]+' }],
    obs,
  );
  assert.equal(r.ok, true);
  assert.equal(r.error, undefined);
});

test('url-fetched fails on an unfetched URL', () => {
  const obs = {
    artifacts: { 'docs/report.md': 'Source: https://example.com/fake' },
    urls: ['https://example.com/real'],
  };
  const [r] = evaluate(
    [{ kind: 'url-fetched', path: 'docs/report.md', value: 'https?://[^\\s)\\]]+' }],
    obs,
  );
  assert.equal(r.ok, false);
  assert.match(r.error, /https:\/\/example\.com\/fake/);
});

test('url-fetched fails when no URL matches', () => {
  const obs = {
    artifacts: { 'docs/report.md': '## Sources\nnone cited' },
    urls: ['https://example.com/real'],
  };
  const [r] = evaluate(
    [{ kind: 'url-fetched', path: 'docs/report.md', value: 'https?://[^\\s)\\]]+' }],
    obs,
  );
  assert.equal(r.ok, false);
  assert.match(r.error, /no url|no match/i);
});

test('url-fetched fails when the artifact is missing', () => {
  const [r] = evaluate(
    [{ kind: 'url-fetched', path: 'docs/nope.md', value: 'https?://[^\\s)\\]]+' }],
    { urls: [] },
  );
  assert.equal(r.ok, false);
  assert.equal(r.error, 'artifact missing: docs/nope.md');
});

test('url-fetched invalid regex fails without throwing', () => {
  const obs = { artifacts: { 'docs/report.md': 'anything' }, urls: [] };
  let results;
  assert.doesNotThrow(() => {
    results = evaluate([{ kind: 'url-fetched', path: 'docs/report.md', value: '[' }], obs);
  });
  assert.equal(results[0].ok, false);
  assert.match(results[0].error, /^bad regex: /);
});

// AC3: a declared command must have actually run and exited as expected.
test('command-exit passes for the expected code', () => {
  const [r] = evaluate([{ kind: 'command-exit', value: 0 }], { commandExit: 0 });
  assert.equal(r.ok, true);
  assert.equal(r.error, undefined);
});

test('command-exit fails for a different code', () => {
  const [r] = evaluate([{ kind: 'command-exit', value: 0 }], { commandExit: 1 });
  assert.equal(r.ok, false);
});

test('command-exit fails with an error when the command did not run', () => {
  const [r] = evaluate([{ kind: 'command-exit', value: 0 }], {});
  assert.equal(r.ok, false);
  assert.match(r.error, /command not run/);
});
