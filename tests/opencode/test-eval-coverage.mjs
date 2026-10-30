// Coverage contract: every top-level skill and every slash command maps to
// exactly one probe, group, or reasoned exemption. Structural evidence, not
// runtime enforcement (AC8, AC11; audit P1 "Measurement", Wave 3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  SKILLS,
  COMMANDS,
  GENERIC_EXEMPTIONS,
  CALIBRATION,
} from '../../eval/coverage.mjs';
import { PROBES } from '../../eval/probes.mjs';

const root = path.resolve(import.meta.dirname, '../..');

const skillNames = fs
  .readdirSync(path.join(root, '.opencode/skills'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const commandNames = fs
  .readdirSync(path.join(root, '.opencode/commands'))
  .filter((name) => name.endsWith('.md'))
  .map((name) => name.slice(0, -'.md'.length))
  .sort();

const probeById = new Map(PROBES.map((probe) => [probe.id, probe]));
const isOneLine = (value) =>
  typeof value === 'string' && value.trim() !== '' && !/[\r\n]/.test(value);

function mappingProblems(label, entry) {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    return [`${label}: mapping is not an object`];
  }
  const kinds = ['probe', 'group', 'exempt'].filter((kind) => Object.hasOwn(entry, kind));
  if (kinds.length !== 1) {
    return [`${label}: expected exactly one of probe/group/exempt, found ${kinds.length}`];
  }
  const [kind] = kinds;
  if (kind === 'probe' && !probeById.has(entry.probe)) {
    return [`${label}: unknown probe ${JSON.stringify(entry.probe)}`];
  }
  if (kind === 'group' && !PROBES.some((probe) => probe.group === entry.group)) {
    return [`${label}: group ${JSON.stringify(entry.group)} has no probes`];
  }
  if (kind === 'exempt' && !isOneLine(entry.reason)) {
    return [`${label}: exempt needs a non-empty one-line reason`];
  }
  return [];
}

test('skills: exactly 40 top-level directories, all mapped', () => {
  assert.equal(
    skillNames.length,
    40,
    `expected 40 top-level skill directories, found ${skillNames.length}`,
  );
  const mapped = Object.keys(SKILLS).sort();
  const missing = skillNames.filter((name) => !mapped.includes(name));
  const unknown = mapped.filter((name) => !skillNames.includes(name));
  assert.deepEqual(missing, [], `unmapped skill(s): ${missing.join(', ')}`);
  assert.deepEqual(unknown, [], `unknown skill(s) in SKILLS: ${unknown.join(', ')}`);
});

test('commands: exactly 9 .md stems, all mapped', () => {
  assert.equal(
    commandNames.length,
    9,
    `expected 9 command files, found ${commandNames.length}`,
  );
  const mapped = Object.keys(COMMANDS).sort();
  const missing = commandNames.filter((name) => !mapped.includes(name));
  const unknown = mapped.filter((name) => !commandNames.includes(name));
  assert.deepEqual(missing, [], `unmapped command(s): ${missing.join(', ')}`);
  assert.deepEqual(unknown, [], `unknown command(s) in COMMANDS: ${unknown.join(', ')}`);
});

test('mappings: exactly one of probe/group/exempt and resolvable', () => {
  const problems = [
    ...Object.entries(SKILLS).flatMap(([name, entry]) =>
      mappingProblems(`skill ${name}`, entry),
    ),
    ...Object.entries(COMMANDS).flatMap(([name, entry]) =>
      mappingProblems(`command ${name}`, entry),
    ),
  ];
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('mappings: no skill carries pending', () => {
  const pending = Object.entries(SKILLS)
    .filter(([, entry]) => entry && typeof entry === 'object' && Object.hasOwn(entry, 'pending'))
    .map(([name]) => name);
  assert.deepEqual(pending, [], `skills still carry pending: ${pending.join(', ')}`);
});

test('coverage: release and writing-release-notes map to command-release', () => {
  assert.equal(
    COMMANDS.release?.probe,
    'command-release',
    'COMMANDS.release must map to command-release',
  );
  assert.equal(
    SKILLS['writing-release-notes']?.probe,
    'command-release',
    "SKILLS['writing-release-notes'] must map to command-release",
  );
});

test('generic exemptions: real skills with rule and reason', () => {
  const problems = [];
  for (const [name, exemption] of Object.entries(GENERIC_EXEMPTIONS)) {
    if (!skillNames.includes(name)) {
      problems.push(`GENERIC_EXEMPTIONS: ${name} is not a top-level skill`);
    }
    if (!exemption || typeof exemption !== 'object') {
      problems.push(`GENERIC_EXEMPTIONS: ${name} entry is not an object`);
      continue;
    }
    if (!isOneLine(exemption.rule)) {
      problems.push(`GENERIC_EXEMPTIONS: ${name} needs a non-empty one-line rule`);
    }
    if (!isOneLine(exemption.reason)) {
      problems.push(`GENERIC_EXEMPTIONS: ${name} needs a non-empty one-line reason`);
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('calibration: real probe ids and known statuses', () => {
  const statuses = new Set(['uncalibrated', 'stable', 'unstable']);
  const problems = [];
  for (const [id, status] of Object.entries(CALIBRATION)) {
    if (!probeById.has(id)) {
      problems.push(`CALIBRATION: ${id} is not a known probe id`);
    }
    if (!statuses.has(status)) {
      problems.push(`CALIBRATION: ${id} has invalid status ${JSON.stringify(status)}`);
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});
