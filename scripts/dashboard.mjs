#!/usr/bin/env node
// Static companion dashboard (read-only, zero-dep, no auth/sync).
// Reads status file, eval/results, progress ledgers; serves docs/dashboard.html snapshot.
// Usage: npm run dashboard [-- --check | --port N]
import fs from 'fs';
import http from 'http';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const statusPath = path.join(process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state'), 'sdlc-lean', 'status.json');

const STALE_AFTER_SEC = 300;

export const snapshot = () => {
  const out = { status: null, eval: [], progress: [], mtime: null, ageSec: null, stale: true, badge: 'stale' };
  let latest = 0;
  const touch = (p) => { try { const m = fs.statSync(p).mtimeMs; if (m > latest) latest = m; } catch {} };
  try { out.status = JSON.parse(fs.readFileSync(statusPath, 'utf8')); } catch {}
  touch(statusPath);
  try {
    const dir = path.join(repoRoot, 'eval', 'results');
    if (fs.existsSync(dir)) {
      out.eval = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).slice(-10);
      for (const f of out.eval) touch(path.join(dir, f));
    }
  } catch {}
  try {
    const dir = path.join(repoRoot, 'docs', 'plans');
    if (fs.existsSync(dir)) {
      out.progress = fs.readdirSync(dir).filter((f) => f.endsWith('-progress.md'));
      for (const f of out.progress) touch(path.join(dir, f));
    }
  } catch {}
  if (latest > 0) {
    out.mtime = new Date(latest).toISOString();
    out.ageSec = Math.max(0, Math.round((Date.now() - latest) / 1000));
    out.stale = out.ageSec > STALE_AFTER_SEC;
    out.badge = out.stale ? 'stale' : 'fresh';
  }
  return out;
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--check')) {
    const s = snapshot();
    console.log(`dashboard check: status=${s.status ? 'ok' : 'missing'} eval=${s.eval.length} progress=${s.progress.length} age=${s.ageSec ?? 'unknown'}s stale=${s.stale} badge=${s.badge} mtime=${s.mtime ?? 'unknown'}`);
    process.exit(0);
  }
  const port = Number(args[args.indexOf('--port') + 1]) || 18749;
  const server = http.createServer((req, res) => {
    if (req.url === '/api/snapshot') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(snapshot()));
      return;
    }
    const file = path.join(repoRoot, 'docs', 'dashboard.html');
    try {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(fs.readFileSync(file, 'utf8'));
    } catch {
      res.writeHead(404); res.end('dashboard.html missing');
    }
  });
  server.listen(port, '127.0.0.1', () => console.log(`dashboard at http://localhost:${port}`));
}
