#!/usr/bin/env node
// sdlc-lean live eval harness.
//
// Dry by default. Live model calls run only with `--run` and are capped by
// `--max-probes`. Each probe runs in a throwaway project with a copy of
// `.opencode`, is parsed structurally, and the run's tokens/cost are recorded.
//
// Usage:
//   node eval/run.mjs                      # dry: print the plan, spend nothing
//   node eval/run.mjs --run --max-probes 4 # run at most 4 probes
//   node eval/run.mjs --run --filter safety --model provider/model
//
// Zero dependencies; shells out to the installed `opencode` CLI.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PROBES } from './probes.mjs';
import { parseArgs, selectProbes } from './lib/plan.mjs';
import { parseEvents } from './lib/parse.mjs';
import { evaluate, passed } from './lib/assert.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const statusPath = () =>
  path.join(
    process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state'),
    'sdlc-lean',
    'status.json',
  );

// Keep persisted transcripts free of the local home path.
const redact = (value) => {
  const home = os.homedir();
  return home ? String(value).split(home).join('~') : String(value);
};

function summarize(probes) {
  const byGroup = {};
  for (const p of probes) byGroup[p.group] = (byGroup[p.group] || 0) + 1;
  return byGroup;
}

function printDry(opts, probes) {
  const groups = summarize(probes);
  console.log('sdlc-lean eval — DRY RUN (no model calls)');
  console.log(`model:   ${opts.model || 'configured default'}`);
  console.log(`probes:  ${probes.length}  (${Object.entries(groups).map(([g, n]) => `${g}=${n}`).join(', ')})`);
  for (const p of probes) console.log(`  - ${p.id} [${p.group}]${p.advisory ? ' (advisory)' : ''}`);
  console.log(`\nrun for real with: node eval/run.mjs --run --max-probes ${probes.length}`);
}

function copySuite(scratch) {
  fs.cpSync(path.join(repoRoot, '.opencode'), path.join(scratch, '.opencode'), {
    recursive: true,
    filter: (src) => !src.includes(`${path.sep}node_modules`),
  });
  fs.writeFileSync(path.join(scratch, 'package.json'), '{"name":"sdlc-eval-fixture","private":true}\n');
  fs.mkdirSync(path.join(scratch, 'src'), { recursive: true });
  fs.writeFileSync(path.join(scratch, 'src', 'index.js'), 'export const hello = 1;\n');
}

function runProbe(scratch, probe, opts) {
  const probeStart = Date.now();
  const args = ['run', '--standalone', '--format', 'json', '--auto', '--title', `eval:${probe.id}`];
  if (opts.model) args.push('--model', opts.model);
  args.push(probe.prompt);
  const res = spawnSync('opencode', args, {
    cwd: scratch,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    timeout: 180_000,
  });
  const observed = parseEvents(res.stdout || '');
  if (res.error) observed.error = String(res.error.message || res.error);
  else if (res.status !== 0 && !observed.text) {
    observed.error = String(res.stderr || '').slice(0, 500) || `exit ${res.status}`;
  }
  try {
    observed.activated = fs.statSync(statusPath()).mtimeMs >= probeStart;
  } catch {
    observed.activated = false;
  }
  const expect = evaluate(probe.expect, observed);
  return {
    id: probe.id,
    group: probe.group,
    advisory: !!probe.advisory,
    ok: passed(expect),
    expect,
    text: redact(observed.text || '').slice(0, 2000),
    usage: observed.usage,
    error: observed.error,
  };
}

function sumUsage(results) {
  return results.reduce(
    (acc, r) => {
      const u = r.usage || {};
      const t = u.tokens || {};
      acc.cost += u.cost || 0;
      acc.input += t.input || 0;
      acc.output += t.output || 0;
      acc.reasoning += t.reasoning || 0;
      acc.cacheRead += (t.cache && t.cache.read) || 0;
      acc.cacheWrite += (t.cache && t.cache.write) || 0;
      return acc;
    },
    { cost: 0, input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0 },
  );
}

function renderMarkdown({ date, opts, probes, results, totals }) {
  const hard = results.filter((r) => !r.advisory);
  const passedCount = hard.filter((r) => r.ok).length;
  const advisory = results.filter((r) => r.advisory);
  const lines = [
    `# Eval run — ${date}`,
    '',
    `Model: ${opts.model || 'configured default'} · probes: ${probes.length} · `,
    `structural: ${passedCount}/${hard.length} passed` + (advisory.length ? ` · advisory: ${advisory.filter((r) => r.ok).length}/${advisory.length}` : ''),
    '',
    '| probe | group | result | detail |',
    '|---|---|---|---|',
  ];
  for (const r of results) {
    const failed = r.expect.filter((e) => !e.ok).map((e) => e.kind + (e.value ? `:${e.value}` : ''));
    lines.push(`| ${r.id} | ${r.group} | ${r.ok ? 'PASS' : 'FAIL'}${r.advisory ? ' (advisory)' : ''} | ${failed.join(', ') || 'ok'} |`);
  }
  if (totals) {
    lines.push(
      '',
      '## Telemetry (from the run stream)',
      '',
      '| metric | value |',
      '|---|---|',
      `| input tokens | ${totals.input} |`,
      `| output tokens | ${totals.output} |`,
      `| reasoning tokens | ${totals.reasoning} |`,
      `| cache read / write | ${totals.cacheRead} / ${totals.cacheWrite} |`,
      `| cost (USD) | ${totals.cost} |`,
    );
  }
  return lines.join('\n') + '\n';
}

function runLive(opts, probes) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-eval-'));
  let results = [];
  try {
    copySuite(scratch);
    for (const p of probes) {
      process.stderr.write(`[eval] ${p.id} …\n`);
      results.push(runProbe(scratch, p, opts));
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }

  const totals = sumUsage(results);
  const date = new Date().toISOString().slice(0, 10);
  const slug = opts.filter || 'all';
  const outDir = path.isAbsolute(opts.outDir) ? opts.outDir : path.join(repoRoot, opts.outDir);
  fs.mkdirSync(outDir, { recursive: true });
  const base = path.join(outDir, `${date}-${slug}-eval`);
  const payload = { date, model: opts.model || null, probes: probes.length, results, totals };
  fs.writeFileSync(`${base}.json`, JSON.stringify(payload, null, 2) + '\n');
  fs.writeFileSync(`${base}.md`, renderMarkdown({ date, opts, probes, results, totals }));

  const hard = results.filter((r) => !r.advisory);
  const okCount = hard.filter((r) => r.ok).length;
  console.log(`sdlc-lean eval: ${okCount}/${hard.length} structural probes passed`);
  console.log(`results: ${base}.json  ${base}.md`);
  return okCount === hard.length ? 0 : 1;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const probes = selectProbes(PROBES, opts);
  if (opts.dry) {
    printDry(opts, probes);
    return 0;
  }
  return runLive(opts, probes);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) process.exit(main());
