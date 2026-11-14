#!/usr/bin/env node
// Static skill lint (plugin-eval static layer, deterministic, no model calls).
// Checks: SKILL.md present, frontmatter name+description, name matches
// ^[a-z0-9]+(-[a-z0-9]+)*$ and directory name, description 1-1024 chars,
// names unique, body size <= 5 KB (warn only), references/* links resolve
// relative to the skill dir (fail). Exit non-zero on any failure.
//
// Single-source catalog gate (disk truth):
//   .opencode/skills/*/SKILL.md is the only source of truth for the skill
//   catalog. `available_skills` is externally injected at runtime (0 repo
//   matches) and is NOT consulted here. listSkills (sdlc-lean.js:156-173)
//   reads the same disk dirs, so validator and runtime catalog stay in sync.
// Unknown/missing skill refs are blocked: a dir without SKILL.md, a
// frontmatter name that does not match its directory, a missing description,
// or a duplicate name each fail the gate.
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

// Extract `references/...` tokens from SKILL.md (backtick spans and
// `[text](url)` links). Angle brackets are allowed in the token so that
// `<discipline>`-style placeholders are captured, then filtered out as docs
// (not links) below.
const skillRefs = (content) => {
  const refs = new Set();
  const tokenRe = /references\/[^\s`(),\[\]"'\n]+/g;
  let m;
  while ((m = tokenRe.exec(content)) !== null) {
    let ref = m[0];
    // Strip URL fragment/query so `references/foo.md#sec` resolves to
    // `references/foo.md` relative to the skill dir.
    ref = ref.split(/[#?]/)[0];
    // Strip trailing sentence/path punctuation.
    ref = ref.replace(/[!:/?.,);]+$/, '');
    if (ref.includes('<') || ref.includes('>')) continue; // placeholder, not a link
    refs.add(ref);
  }
  return refs;
};

const dirs = fs.readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('.'));
const seen = new Set();
for (const d of dirs) {
  const file = path.join(skillsDir, d.name, 'SKILL.md');
  if (!fs.existsSync(file)) { fail(`${d.name}: SKILL.md missing`); continue; }
  const content = fs.readFileSync(file, 'utf8');
  const fm = parseFrontmatter(content, d.name);
  if (!fm.name) fail(`${d.name}: frontmatter 'name' missing`);
  else {
    if (fm.name !== d.name) fail(`${d.name}: name "${fm.name}" != directory`);
    if (!NAME_RE.test(fm.name) || fm.name.length > 64) fail(`${d.name}: invalid name "${fm.name}"`);
    if (seen.has(fm.name)) fail(`${d.name}: duplicate name "${fm.name}"`);
    seen.add(fm.name);
  }
  if (!fm.description) fail(`${d.name}: frontmatter 'description' missing`);
  else if (fm.description.length > 1024) fail(`${d.name}: description >1024 chars`);

  // Body thinness gate: warn (never fail) when SKILL.md body exceeds 5 KB,
  // keeping 40/0 green until oversize skills are approved to fail.
  const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  if (Buffer.byteLength(body) > 5120) {
    console.warn(`WARN: ${d.name}: body ${Math.round(Buffer.byteLength(body) / 1024)}KB > 5KB`);
  }

  // Reference integrity: every references/* link must resolve relative to the
  // skill dir; a missing reference fails the gate. Reject path traversal
  // (`..` segments) and any resolved target outside the skill dir before the
  // existsSync existence oracle.
  for (const ref of skillRefs(content)) {
    if (ref.split('/').includes('..')) {
      fail(`${d.name}: traversal reference "${ref}"`);
      continue;
    }
    const target = path.join(skillsDir, d.name, ref);
    if (path.relative(skillsDir, target).startsWith('..')) {
      fail(`${d.name}: reference escapes skill dir "${ref}"`);
      continue;
    }
    if (!fs.existsSync(target)) {
      fail(`${d.name}: missing reference "${ref}"`);
    }
  }
}
console.log(`checked ${dirs.length} skills, ${failures} failures`);
process.exit(failures ? 1 : 0);
