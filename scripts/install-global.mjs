#!/usr/bin/env node
// Global installer/updater for sdlc-lean (zero dependencies).
//
// Copies skills, agents, commands, and the plugin into the OpenCode global
// config dir (~/.config/opencode by default, XDG_CONFIG_HOME honored). Files
// this installer placed previously are tracked in a manifest and pruned when
// they no longer exist in the repo — user-authored files are never touched.
//
// Usage:
//   node scripts/install-global.mjs            # install/update
//   npm run install:global                     # same via npm
//   node scripts/install-global.mjs --target <dir>   # custom target (tests)
//
// Update flow on any machine with a clone:  git pull && npm run install:global
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(__dirname, '..');

export const MANIFEST = '.sdlc-lean-install.json';

export const defaultTarget = () => path.join(
  process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
  'opencode',
);

const SOURCES = [
  { from: '.opencode/skills', to: 'skills', kind: 'dir', key: 'skills' },
  { from: '.opencode/agents', to: 'agents', kind: 'dir', key: 'agents' },
  { from: '.opencode/commands', to: 'commands', kind: 'dir', key: 'commands' },
  { from: '.opencode/plugins/sdlc-lean.js', to: 'plugins/sdlc-lean.js', kind: 'file', key: 'plugin' },
];

// All files under a directory, relative to it.
const walk = (base, rel = '') => {
  const out = [];
  for (const e of fs.readdirSync(path.join(base, rel), { withFileTypes: true })) {
    const r = rel ? path.join(rel, e.name) : e.name;
    if (e.isDirectory()) out.push(...walk(base, r));
    else if (e.isFile()) out.push(r);
  }
  return out;
};

// Top-level entry count (skill dirs, agent files, ...).
const countTop = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .filter((e) => e.isDirectory() || e.isFile()).length;

const readManifest = (target) => {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(target, MANIFEST), 'utf8'));
    return Array.isArray(parsed.files) ? parsed.files : [];
  } catch (err) {
    return []; // first run or corrupt manifest — nothing to prune
  }
};

const writeManifest = (target, files) => {
  fs.writeFileSync(path.join(target, MANIFEST), JSON.stringify({
    at: new Date().toISOString(),
    files,
  }, null, 2) + '\n');
};

// Remove empty parent dirs left behind by pruning, up to (not including) target.
const pruneEmptyDirs = (dir, target) => {
  let cur = dir;
  while (cur !== target && cur.startsWith(target + path.sep)) {
    try {
      if (fs.readdirSync(cur).length > 0) break;
      fs.rmdirSync(cur);
      cur = path.dirname(cur);
    } catch (err) {
      break;
    }
  }
};

export const installGlobal = ({ repo = repoRoot, target = defaultTarget() } = {}) => {
  const previous = readManifest(target);
  const installed = [];
  const summary = { skills: 0, agents: 0, commands: 0, plugin: 0, pruned: 0 };

  for (const src of SOURCES) {
    const from = path.join(repo, src.from);
    if (!fs.existsSync(from)) continue;
    if (src.kind === 'file') {
      const dest = path.join(target, src.to);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(from, dest);
      installed.push(src.to);
      summary[src.key] = 1;
      continue;
    }
    summary[src.key] = countTop(from);
    for (const rel of walk(from)) {
      const destRel = path.join(src.to, rel);
      const dest = path.join(target, destRel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(from, rel), dest);
      installed.push(destRel);
    }
  }

  // Prune only files this installer placed before (manifest), never user files.
  // Containment guard: a corrupt manifest must never delete outside target.
  const installedSet = new Set(installed);
  const targetAbs = path.resolve(target);
  for (const rel of previous) {
    if (installedSet.has(rel)) continue;
    const abs = path.resolve(target, rel);
    if (abs !== targetAbs && !abs.startsWith(targetAbs + path.sep)) continue;
    try {
      const st = fs.lstatSync(abs);
      if (st.isFile() && !st.isSymbolicLink()) {
        fs.unlinkSync(abs);
        pruneEmptyDirs(path.dirname(abs), target);
        summary.pruned++;
      }
    } catch (err) {
      // already gone or unreadable — nothing to prune
    }
  }

  writeManifest(target, installed);
  return summary;
};

// --- CLI ---------------------------------------------------------------------
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const ti = args.indexOf('--target');
  const target = ti >= 0 ? path.resolve(args[ti + 1] || '') : defaultTarget();
  try {
    const s = installGlobal({ target });
    console.log(`sdlc-lean -> ${target}`);
    console.log(`  skills ${s.skills} · agents ${s.agents} · commands ${s.commands} · plugin ${s.plugin ? 'yes' : 'no'} · pruned ${s.pruned}`);
    console.log('restart OpenCode to pick up changes');
  } catch (err) {
    console.error(`[sdlc-lean] install failed: ${err.message}`);
    process.exit(1);
  }
}
