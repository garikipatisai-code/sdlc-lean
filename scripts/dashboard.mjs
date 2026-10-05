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

export const snapshot = () => {
  const out = { status: null, eval: [], progress: [] };
  try { out.status = JSON.parse(fs.readFileSync(statusPath, 'utf8')); } catch {}
  try {
    const dir = path.join(repoRoot, 'eval', 'results');
    if (fs.existsSync(dir)) out.eval = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).slice(-10);
  } catch {}
  try {
    const dir = path.join(repoRoot, 'docs', 'plans');
    if (fs.existsSync(dir)) out.progress = fs.readdirSync(dir).filter((f) => f.endsWith('-progress.md'));
  } catch {}
  return out;
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--check')) {
    const s = snapshot();
    console.log(`dashboard check: status=${s.status ? 'ok' : 'missing'} eval=${s.eval.length} progress=${s.progress.length}`);
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
