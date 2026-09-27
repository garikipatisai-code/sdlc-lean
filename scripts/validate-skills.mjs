#!/usr/bin/env node
// Static skill lint (plugin-eval static layer, deterministic, no model calls).
// Checks: SKILL.md present, frontmatter name+description, name matches
// ^[a-z0-9]+(-[a-z0-9]+)*$ and directory name, description 1-1024 chars,
// names unique. Exit non-zero on any failure.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillsDir = path.resolve(__dirname, '..', '.opencode', 'skills');
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

let failures = 0;
const fail = (msg) => { failures++; console.error(`FAIL: ${msg}`); };

const parseFrontmatter = (content, file) => {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) { fail(`${file}: missing YAML frontmatter`); return {}; }
  const fm = {};
  let last = null;
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0 && !/^\s/.test(line)) { last = line.slice(0, i).trim(); fm[last] = line.slice(i + 1).trim(); }
    else if (last && line.trim()) fm[last] += ` ${line.trim()}`;
  }
  for (const k of Object.keys(fm)) fm[k] = fm[k].replace(/^(["'])([\s\S]*)\1$/, '$2');
  return fm;
};

const dirs = fs.readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('.'));
const seen = new Set();
for (const d of dirs) {
  const file = path.join(skillsDir, d.name, 'SKILL.md');
  if (!fs.existsSync(file)) { fail(`${d.name}: SKILL.md missing`); continue; }
  const fm = parseFrontmatter(fs.readFileSync(file, 'utf8'), d.name);
  if (!fm.name) fail(`${d.name}: frontmatter 'name' missing`);
  else {
    if (fm.name !== d.name) fail(`${d.name}: name "${fm.name}" != directory`);
    if (!NAME_RE.test(fm.name) || fm.name.length > 64) fail(`${d.name}: invalid name "${fm.name}"`);
    if (seen.has(fm.name)) fail(`${d.name}: duplicate name "${fm.name}"`);
    seen.add(fm.name);
  }
  if (!fm.description) fail(`${d.name}: frontmatter 'description' missing`);
  else if (fm.description.length > 1024) fail(`${d.name}: description >1024 chars`);
}
console.log(`checked ${dirs.length} skills, ${failures} failures`);
process.exit(failures ? 1 : 0);
