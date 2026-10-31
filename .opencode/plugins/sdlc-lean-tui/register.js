// sdlc-lean TUI part: pure helpers plus fail-open palette registration.
// Plain JS, no JSX, no npm imports. node:fs is loaded dynamically so a host
// that cannot provide it still lets the prompt fallback work.
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PLAN_DIR = 'docs/plans';
const MARKER_REL = '.sdlc/spec-gate.json';
const EVIDENCE_REL = '.sdlc/host-evidence.jsonl';

const MAX_PLAN_BYTES = 1024 * 1024;
const MAX_MARKER_BYTES = 64 * 1024;
const MAX_LINE_BYTES = 64 * 1024;

const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g;

let fsModule = null;

const loadFs = async () => {
  try {
    fsModule = (await import('node:fs')).default;
  } catch {
    fsModule = null;
  }
  return fsModule;
};

await loadFs();

let activationToastShown = false;
let tuiRegistered = false;

const EXCERPT_CHARS = 2000;

const sanitize = (value) => (typeof value === 'string' ? value.replace(CONTROL_CHARS, '') : '');

const log = (context, message) => {
  for (const target of [context?.app, context?.client?.app]) {
    try {
      const result = target?.log?.(message);
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch {
      /* fail open */
    }
  }
};

const showToast = async (context, message, variant = 'info') => {
  try {
    if (typeof context?.toast?.show === 'function') {
      await context.toast.show({ message, variant });
      return;
    }
  } catch {
    /* fall back to a log line */
  }
  log(context, message);
};

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

const isSafeRel = (value) => {
  if (typeof value !== 'string' || value === '' || value !== value.trim()) return false;
  if (value.startsWith('/') || /^[A-Za-z]:/.test(value) || value.includes('\\')) return false;
  return value.split('/').every((part) => part !== '' && part !== '.' && part !== '..');
};

// Resolve a project-relative path, reject symlinks/non-regular/oversize files,
// and prove the real path stays under the real project root.
const containedFile = (root, rel, maxBytes) => {
  const rootAbs = path.resolve(root);
  const abs = path.resolve(rootAbs, rel);
  const st = fsModule.lstatSync(abs);
  if (st.isSymbolicLink() || !st.isFile()) throw new Error(`not a regular file: ${rel}`);
  if (st.size > maxBytes) throw new Error(`file is too large: ${rel}`);
  const realRoot = fsModule.realpathSync(rootAbs);
  const realAbs = fsModule.realpathSync(abs);
  if (realAbs !== realRoot && !realAbs.startsWith(`${realRoot}${path.sep}`)) {
    throw new Error(`path escapes the project root: ${rel}`);
  }
  return { abs, size: st.size };
};

const cleanScalar = (value) => sanitize(String(value).trim().replace(/^(["'])([\s\S]*)\1$/, '$2'));

const parsePlanSummary = (text) => {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error('plan is missing YAML frontmatter');
  const summary = { spec: '', status: '', files: [], allow: [] };
  let listKey = null;
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const item = line.match(/^\s*-\s+(.+)$/);
    if (item) {
      if (listKey) summary[listKey].push(cleanScalar(item[1]));
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) {
      listKey = null;
      continue;
    }
    const [, key, value] = kv;
    if (value === '') {
      listKey = key === 'files' || key === 'allow' ? key : null;
      continue;
    }
    listKey = null;
    if (key === 'spec' || key === 'status') summary[key] = cleanScalar(value);
  }
  return summary;
};

export const listPlans = (root) => {
  if (!fsModule || !root) return [];
  const dir = path.resolve(root, PLAN_DIR);
  let names;
  try {
    names = fsModule.readdirSync(dir);
  } catch {
    return [];
  }
  const plans = [];
  for (const name of names) {
    if (typeof name !== 'string') continue;
    if (!name.endsWith('.md')) continue;
    if (name.endsWith('-progress.md') || name.endsWith('-evidence.md')) continue;
    if (/[\u0000-\u001f\u007f-\u009f]/.test(name) || /\s/.test(name)) continue;
    const abs = path.join(dir, name);
    let st;
    try {
      st = fsModule.lstatSync(abs);
    } catch {
      continue;
    }
    if (st.isSymbolicLink() || !st.isFile()) continue;
    if (st.size > MAX_PLAN_BYTES) continue;
    plans.push({ rel: `${PLAN_DIR}/${name}`, abs, name, size: st.size });
  }
  return plans.sort((a, b) => (a.rel < b.rel ? 1 : a.rel > b.rel ? -1 : 0));
};

export const planDetails = (root, rel) => {
  if (!fsModule) throw new Error('filesystem unavailable');
  if (!root) throw new Error('project root unknown');
  const rootAbs = path.resolve(root);
  const plansDir = path.resolve(rootAbs, PLAN_DIR);
  const abs = path.resolve(rootAbs, String(rel ?? ''));
  if (path.dirname(abs) !== plansDir) throw new Error(`plan must be an immediate ${PLAN_DIR}/*.md file: ${rel}`);
  if (!abs.endsWith('.md')) throw new Error(`plan must be a Markdown file: ${rel}`);
  const { abs: fileAbs } = containedFile(rootAbs, path.relative(rootAbs, abs), MAX_PLAN_BYTES);
  const bytes = fsModule.readFileSync(fileAbs);
  const summary = parsePlanSummary(bytes.toString('utf8'));
  if (!summary.spec) throw new Error(`plan has no spec frontmatter: ${rel}`);
  return {
    plan: path.relative(rootAbs, fileAbs).split(path.sep).join('/'),
    spec: summary.spec,
    status: summary.status,
    files: summary.files.filter(Boolean),
    allow: summary.allow.filter(Boolean),
    plan_sha256: sha256(bytes),
  };
};

export const gateSummary = (root) => {
  if (!fsModule || !root) return { active: false };
  const markerAbs = path.resolve(root, MARKER_REL);
  let raw;
  try {
    const st = fsModule.lstatSync(markerAbs);
    if (st.isSymbolicLink() || !st.isFile() || st.size > MAX_MARKER_BYTES) {
      return { active: true, invalid: true };
    }
    raw = fsModule.readFileSync(markerAbs, 'utf8');
  } catch (err) {
    if (err?.code === 'ENOENT') return { active: false };
    return { active: true, invalid: true };
  }

  let gate;
  try {
    gate = JSON.parse(raw);
  } catch {
    return { active: true, invalid: true };
  }
  if (!gate || typeof gate !== 'object' || Array.isArray(gate)) return { active: true, invalid: true };

  const plan = sanitize(gate.plan);
  const spec = sanitize(gate.spec);
  const planHash = typeof gate.plan_sha256 === 'string' ? gate.plan_sha256 : '';
  const specHash = typeof gate.spec_sha256 === 'string' ? gate.spec_sha256 : '';
  const files = Array.isArray(gate.files) ? gate.files : null;
  const allow = Array.isArray(gate.allow) ? gate.allow : [];
  if (!plan || !spec || !planHash || !specHash || !files) return { active: true, invalid: true };
  if (!isSafeRel(plan) || !isSafeRel(spec)) return { active: true, invalid: true };

  try {
    const planFile = containedFile(root, plan, MAX_PLAN_BYTES);
    const specFile = containedFile(root, spec, MAX_PLAN_BYTES);
    if (sha256(fsModule.readFileSync(planFile.abs)) !== planHash) return { active: true, invalid: true };
    if (sha256(fsModule.readFileSync(specFile.abs)) !== specHash) return { active: true, invalid: true };
    return {
      active: true,
      plan,
      spec,
      files,
      allow,
      plan_sha256: planHash,
      spec_sha256: specHash,
    };
  } catch {
    return { active: true, invalid: true };
  }
};

export const hostEvidenceSummary = (root, gate) => {
  if (!fsModule || !root) return { rows: 0, matched: 0, malformed: 0 };
  const logAbs = path.resolve(root, EVIDENCE_REL);
  let raw;
  try {
    const st = fsModule.lstatSync(logAbs);
    if (st.isSymbolicLink() || !st.isFile()) return { rows: 0, matched: 0, malformed: 0 };
    raw = fsModule.readFileSync(logAbs, 'utf8');
  } catch {
    return { rows: 0, matched: 0, malformed: 0 };
  }
  const target = typeof gate?.plan_sha256 === 'string' ? gate.plan_sha256 : null;
  let rows = 0;
  let matched = 0;
  let malformed = 0;
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (Buffer.byteLength(line, 'utf8') > MAX_LINE_BYTES) {
      malformed += 1;
      continue;
    }
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      malformed += 1;
      continue;
    }
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      malformed += 1;
      continue;
    }
    rows += 1;
    if (target && row.plan_sha256 === target) matched += 1;
  }
  return { rows, matched, malformed };
};

export const resolveSessionID = (context) => {
  let route;
  try {
    route = context?.ui?.router?.current?.();
  } catch {
    return null;
  }
  if (!route || route.type !== 'session') return null;
  if (typeof route.sessionID !== 'string' || route.sessionID === '') return null;
  return route.sessionID;
};

export const buildApproveCommand = (root, rel, hash) => `/approve ${path.resolve(root, rel)} sha256:${hash}`;

export const activationText = (count) => (
  `sdlc-lean: ${count} skill${count === 1 ? '' : 's'} active; palette: sdlc.approve / sdlc.status`
);

export const resetTuiState = () => {
  activationToastShown = false;
  tuiRegistered = false;
};

// Per-open project root: only the TUI location counts. Never the process
// working directory and never a setup-time capture, so a stale checkout
// cannot receive the gate.
export const resolveTuiRoot = (context) => {
  const dir = context?.data?.location?.directory ?? context?.location?.directory;
  return typeof dir === 'string' && dir !== '' ? dir : null;
};

const refuse = (reason) => new Error(`refused: ${reason}`);

const refuseTui = async (context, reason) => {
  log(context, `sdlc-lean: refused: ${reason}`);
  await showToast(context, 'refused — see session message', 'error');
};

// Global-first contract import: the installed global copy wins, the project
// copy is used only when no global exists, and two differing copies refuse
// instead of risking cli drift. Display must come from buildGate output.
const loadContractCli = async (root) => {
  if (!fsModule) throw refuse('filesystem unavailable; cannot load the spec-check contract');
  const base = process.env.XDG_CONFIG_HOME
    ? process.env.XDG_CONFIG_HOME
    : (process.env.HOME ? path.join(process.env.HOME, '.config') : null);
  const globalCli = base ? path.join(base, 'opencode', 'scripts', 'spec-check.mjs') : null;
  const projectCli = path.join(root, 'scripts', 'spec-check.mjs');

  const inspectCli = (candidate) => {
    if (!candidate) return null;
    let st;
    try {
      st = fsModule.lstatSync(candidate);
    } catch (err) {
      if (err?.code === 'ENOENT') return null;
      throw refuse(`cannot inspect the spec-check cli: ${err?.message || err}`);
    }
    if (st.isSymbolicLink()) throw refuse(`spec-check cli must not be a symlink: ${candidate} (cli parity refused)`);
    if (!st.isFile()) return null;
    return candidate;
  };

  const globalFound = inspectCli(globalCli);
  const projectFound = inspectCli(projectCli);
  if (globalFound && projectFound) {
    const globalBytes = fsModule.readFileSync(globalFound);
    const projectBytes = fsModule.readFileSync(projectFound);
    if (!globalBytes.equals(projectBytes)) {
      throw refuse('global and project spec-check copies differ (cli parity refused); make them byte-identical or remove one');
    }
  }
  let chosen = globalFound || projectFound;
  if (!chosen) {
    const bundled = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'scripts', 'spec-check.mjs');
    if (!inspectCli(bundled)) {
      throw refuse('no spec-check cli found (global or project copy required); approve in a terminal instead');
    }
    chosen = bundled;
  }
  let mod;
  try {
    mod = await import(pathToFileURL(chosen).href);
  } catch (err) {
    throw refuse(`cannot import the spec-check cli: ${err?.message || err}`);
  }
  for (const fn of ['buildGate', 'readGate', 'writeGate', 'validateGate']) {
    if (typeof mod[fn] !== 'function') throw refuse(`spec-check cli is missing the ${fn} contract`);
  }
  return mod;
};

// Host username comes from a dynamic node:os import. Refuse when the host
// cannot provide it instead of recording a forged or empty owner.
const readOsUsername = async () => {
  let userInfo;
  try {
    const osMod = await import('node:os');
    userInfo = osMod.userInfo();
  } catch (err) {
    throw refuse(`host username unavailable (node:os userInfo failed: ${err?.message || err})`);
  }
  const name = typeof userInfo?.username === 'string' ? userInfo.username : '';
  if (name === '') throw refuse('host username unavailable (node:os returned an empty username)');
  return name;
};

const activationCount = async (context) => {
  const location = context?.location ?? context?.data?.location?.default?.();
  const skill = context?.data?.location?.skill;
  try {
    await skill?.sync?.(location);
    const skills = await skill?.list?.(location);
    return Array.isArray(skills) ? skills.length : 0;
  } catch (err) {
    log(context, `sdlc-lean: activation check failed: ${err?.message || err}`);
    return 0;
  }
};

export const setupTui = async (context) => {
  const keymap = context?.keymap;
  if (!keymap || typeof keymap.layer !== 'function') {
    log(context, 'sdlc-lean: TUI keymap unavailable; palette commands not registered');
    return;
  }

  try {
    const count = await activationCount(context);
    if (count > 0) {
      if (!activationToastShown) {
        activationToastShown = true;
        await showToast(context, activationText(count), 'info');
      }
    } else {
      log(context, activationText(0));
    }
  } catch (err) {
    log(context, `sdlc-lean: activation failed: ${err?.message || err}`);
  }

  if (tuiRegistered) {
    log(context, 'sdlc-lean: palette already registered; skipping duplicate layer');
    return;
  }

  const openPicker = async () => {
    try {
      const sessionID = resolveSessionID(context);
      if (!sessionID) throw refuse('no current session; refusing to pick a plan');
      const root = resolveTuiRoot(context);
      if (!root) throw refuse('TUI location unknown; refusing to approve without a project root');
      if (!fsModule) throw refuse('filesystem unavailable (gate status unknown); approve in a terminal with /approve <absolute plan path> sha256:<plan hash>');
      const cli = await loadContractCli(root);
      const username = await readOsUsername();
      const plans = listPlans(root);
      if (plans.length === 0) throw refuse('no plans found in docs/plans');

      if (!context?.dialog || typeof context.dialog.select !== 'function') {
        const fallback = cli.buildGate(root, plans[0].rel);
        const exact = buildApproveCommand(root, fallback.plan, fallback.plan_sha256);
        log(context, `sdlc-lean: dialog unavailable; approve in a terminal: ${exact}`);
        await showToast(context, exact, 'info');
        return;
      }

      const selected = await context.dialog.select({
        title: 'Approve SDLC plan',
        options: plans.map((plan) => ({ label: plan.rel, value: plan.rel })),
      });
      const rel = typeof selected === 'string'
        ? selected
        : selected?.value ?? selected?.rel ?? selected?.label;
      if (!rel) return;

      if (resolveSessionID(context) !== sessionID) {
        throw refuse('session changed since the plan list; aborting approve');
      }

      const gate = cli.buildGate(root, rel);
      const shownPlanHash = gate.plan_sha256;
      const shownSpecHash = gate.spec_sha256;
      const planFile = containedFile(root, gate.plan, MAX_PLAN_BYTES);
      const excerpt = fsModule.readFileSync(planFile.abs, 'utf8').slice(0, EXCERPT_CHARS);
      const message = [
        `plan: ${gate.plan}`,
        `spec: ${gate.spec}`,
        `files (${gate.files.length}):`,
        ...gate.files.map((file) => `  - ${file}`),
        `allow (${(gate.allow || []).length}):`,
        ...(gate.allow || []).map((file) => `  - ${file}`),
        `plan sha256: ${shownPlanHash}`,
        `spec sha256: ${shownSpecHash}`,
        `excerpt (first ${EXCERPT_CHARS} chars):`,
        excerpt,
        '',
        'Approve writes .sdlc/spec-gate.json here (preview-only retired).',
        `Fallback: ${buildApproveCommand(root, gate.plan, shownPlanHash)}`,
      ].join('\n');

      if (typeof context.dialog.confirm !== 'function') {
        const exact = buildApproveCommand(root, gate.plan, shownPlanHash);
        log(context, `sdlc-lean: confirm unavailable; approve in a terminal: ${exact}`);
        await showToast(context, exact, 'info');
        return;
      }
      const confirmed = await context.dialog.confirm({ title: 'Approve SDLC plan', message });
      if (!confirmed) return;

      if (resolveSessionID(context) !== sessionID) {
        throw refuse('session changed after confirm; aborting approve');
      }
      const liveRoot = resolveTuiRoot(context);
      if (!liveRoot || path.resolve(liveRoot) !== path.resolve(root)) {
        throw refuse('project root changed after confirm; aborting approve');
      }

      // Hash chain: the shown hashes must equal a fresh re-read, for the plan
      // and the spec alike. Anything else is drift or tampering: refuse before
      // touching the marker.
      const planAgain = containedFile(liveRoot, gate.plan, MAX_PLAN_BYTES);
      const specAgain = containedFile(liveRoot, gate.spec, MAX_PLAN_BYTES);
      const planHashAgain = sha256(fsModule.readFileSync(planAgain.abs));
      const specHashAgain = sha256(fsModule.readFileSync(specAgain.abs));
      if (planHashAgain !== shownPlanHash || specHashAgain !== shownSpecHash) {
        throw refuse('plan changed after details (hash mismatch); preexisting marker kept');
      }

      // Realpath containment for the marker home: a symlinked .sdlc would
      // redirect the write outside the project, so refuse instead of writing.
      const sdlcAbs = path.resolve(liveRoot, '.sdlc');
      const realRoot = fsModule.realpathSync(path.resolve(liveRoot));
      try {
        const sdlcSt = fsModule.lstatSync(sdlcAbs);
        if (sdlcSt.isSymbolicLink()) throw refuse('.sdlc must not be a symlink (escape refused)');
        const realSdlc = fsModule.realpathSync(sdlcAbs);
        if (realSdlc !== realRoot && !realSdlc.startsWith(`${realRoot}${path.sep}`)) {
          throw refuse('.sdlc escapes the project root (realpath escape refused)');
        }
      } catch (err) {
        if (err?.message?.startsWith('refused:')) throw err;
        if (err?.code !== 'ENOENT') throw refuse(`cannot inspect .sdlc: ${err?.message || err}`);
      }

      const markerAbs = path.resolve(liveRoot, MARKER_REL);
      let preexisting = false;
      try {
        const markerSt = fsModule.lstatSync(markerAbs);
        if (markerSt.isSymbolicLink()) throw refuse('spec-gate marker must not be a symlink (escape refused)');
        if (markerSt.isFile()) preexisting = true;
      } catch (err) {
        if (err?.message?.startsWith('refused:')) throw err;
        if (err?.code !== 'ENOENT') throw refuse(`cannot inspect the spec-gate marker: ${err?.message || err}`);
      }

      if (preexisting) {
        let current = null;
        let currentValid = false;
        try {
          current = cli.readGate(liveRoot);
          cli.validateGate(liveRoot, current);
          currentValid = true;
        } catch {
          currentValid = false;
        }
        if (currentValid) {
          const oldPlan = typeof current?.plan === 'string' ? current.plan : 'unknown plan';
          const oldHash = typeof current?.plan_sha256 === 'string' ? current.plan_sha256 : 'unknown hash';
          const overwrite = await context.dialog.confirm({
            title: 'Overwrite active spec gate',
            message: [
              `gate active for ${oldPlan} (sha256 ${oldHash}).`,
              `Approve ${gate.plan} instead? Confirm again to overwrite,`,
              'or run spec-check close first.',
            ].join('\n'),
          });
          if (!overwrite) {
            throw refuse(`active gate for ${oldPlan} kept; run spec-check close before approving ${gate.plan}`);
          }
        }
      }

      const gateToWrite = {
        ...gate,
        approved_by: username,
        approved_at: new Date().toISOString(),
        approved_via: 'tui-popup',
      };
      cli.writeGate(liveRoot, gateToWrite);

      // Re-read and validate through the full contract. On mismatch, unlink
      // only a marker this invocation wrote with matching content; a
      // preexisting marker is never deleted.
      const writtenRaw = `${JSON.stringify(gateToWrite, null, 2)}\n`;
      const rereadRaw = fsModule.readFileSync(markerAbs, 'utf8');
      let reread;
      try {
        reread = JSON.parse(rereadRaw);
        cli.validateGate(liveRoot, reread);
      } catch (err) {
        if (!preexisting && rereadRaw === writtenRaw) {
          try { fsModule.unlinkSync(markerAbs); } catch { /* best effort */ }
        }
        throw refuse(`gate re-read failed validation (${err?.message || err}); marker ${preexisting ? 'kept' : 'removed'}`);
      }
      if (reread.plan_sha256 !== shownPlanHash || reread.spec_sha256 !== shownSpecHash) {
        if (!preexisting && rereadRaw === writtenRaw) {
          try { fsModule.unlinkSync(markerAbs); } catch { /* best effort */ }
        }
        throw refuse('gate re-read hash mismatch; refusing to claim an approval');
      }

      const done = `sdlc-lean: active spec gate ${reread.plan} -> ${reread.spec} (${reread.files.length} files, sha256 ${reread.plan_sha256.slice(0, 12)}) via tui-popup`;
      log(context, done);
      await showToast(context, done, 'info');
    } catch (err) {
      await refuseTui(context, err?.message?.replace(/^refused:\s*/, '') || err);
    }
  };

  const showStatus = async () => {
    try {
      const liveRoot = resolveTuiRoot(context);
      if (!liveRoot) throw refuse('TUI location unknown; no project root for status');
      if (!fsModule) {
        await showToast(context, 'sdlc-lean: gate status unknown (filesystem unavailable)', 'warning');
        return;
      }
      const gate = gateSummary(liveRoot);
      if (gate?.active && gate.invalid) {
        await showToast(context, 'gate invalid', 'error');
        return;
      }
      if (!gate?.active) {
        await showToast(context, 'no active spec gate', 'info');
        return;
      }
      const evidence = hostEvidenceSummary(liveRoot, gate);
      const message = [
        'gate: active',
        `plan: ${gate.plan}`,
        `spec: ${gate.spec}`,
        `files: ${gate.files.length}`,
        `allow: ${gate.allow.length}`,
        `host evidence: ${evidence.matched}/${evidence.rows} rows (advisory)`,
      ].join('\n');
      await showToast(context, message, 'info');
    } catch (err) {
      await refuseTui(context, err?.message?.replace(/^refused:\s*/, '') || err);
    }
  };

  const commands = [
    { id: 'sdlc.approve', title: 'Approve SDLC plan', palette: true, bind: 'ctrl+shift+a', run: openPicker },
    { id: 'sdlc.status', title: 'SDLC status', palette: true, run: showStatus },
  ];

  const registerLayer = (layerCommands) => {
    keymap.layer(() => ({ mode: 'global', commands: layerCommands }));
    tuiRegistered = true;
  };

  try {
    registerLayer(commands);
  } catch (err) {
    log(context, `sdlc-lean: keymap bind rejected (${err?.message || err}); retrying palette-only`);
    const paletteOnly = commands.map(({ bind, ...command }) => command);
    try {
      registerLayer(paletteOnly);
    } catch (retryErr) {
      log(context, `sdlc-lean: TUI palette registration failed: ${retryErr?.message || retryErr}`);
    }
  }
};
