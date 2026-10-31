// sdlc-lean TUI part: pure helpers plus fail-open palette registration.
// Plain JS, no JSX, no npm imports. node:fs is loaded dynamically so a host
// that cannot provide it still lets the prompt fallback work.
import crypto from 'node:crypto';
import path from 'node:path';

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
  const root = context?.data?.location?.directory
    || context?.location?.directory
    || context?.directory;

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

  const openPicker = async () => {
    try {
      const sessionID = resolveSessionID(context);
      if (!sessionID) {
        await showToast(context, 'sdlc-lean: no current session; refusing to pick a plan', 'warning');
        return;
      }
      const plans = listPlans(root);
      if (plans.length === 0) {
        await showToast(context, 'sdlc-lean: no plans found in docs/plans', 'warning');
        return;
      }
      const selected = await context?.dialog?.select?.({
        title: 'Approve SDLC plan',
        options: plans.map((plan) => ({ label: plan.rel, value: plan.rel })),
      });
      const rel = typeof selected === 'string'
        ? selected
        : selected?.value ?? selected?.rel ?? selected?.label;
      if (!rel) return;

      const details = planDetails(root, rel);
      const command = buildApproveCommand(root, rel, details.plan_sha256);
      const message = [
        `plan: ${details.plan}`,
        `status: ${details.status || 'unknown'}`,
        `spec: ${details.spec}`,
        'files:',
        ...details.files.map((file) => `  - ${file}`),
        'allow:',
        ...details.allow.map((file) => `  - ${file}`),
        `plan sha256: ${details.plan_sha256}`,
        '',
        'preview-only: review the scope, then run this command yourself:',
        command,
      ].join('\n');

      const confirmed = await context?.dialog?.confirm?.({ title: 'Approve SDLC plan', message });
      if (!confirmed) return;
      await showToast(context, 'preview-only: run the command shown', 'info');
    } catch (err) {
      log(context, `sdlc-lean: plan picker refused: ${err?.message || err}`);
      await showToast(context, 'refused — see session message', 'error');
    }
  };

  const showStatus = async () => {
    try {
      const gate = gateSummary(root);
      if (gate?.active && gate.invalid) {
        await showToast(context, 'gate invalid', 'error');
        return;
      }
      if (!gate?.active) {
        await showToast(context, 'no active spec gate', 'info');
        return;
      }
      const evidence = hostEvidenceSummary(root, gate);
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
      log(context, `sdlc-lean: status refused: ${err?.message || err}`);
      await showToast(context, 'refused — see session message', 'error');
    }
  };

  const keymap = context?.keymap;
  if (!keymap || typeof keymap.layer !== 'function') {
    log(context, 'sdlc-lean: TUI keymap unavailable; palette commands not registered');
    return;
  }

  const commands = [
    { id: 'sdlc.approve', title: 'Approve SDLC plan', palette: true, bind: 'ctrl+shift+a', run: openPicker },
    { id: 'sdlc.status', title: 'SDLC status', palette: true, run: showStatus },
  ];

  try {
    keymap.layer(() => ({ mode: 'global', commands }));
  } catch (err) {
    log(context, `sdlc-lean: keymap bind rejected (${err?.message || err}); retrying palette-only`);
    const paletteOnly = commands.map(({ bind, ...command }) => command);
    try {
      keymap.layer(() => ({ mode: 'global', commands: paletteOnly }));
    } catch (retryErr) {
      log(context, `sdlc-lean: TUI palette registration failed: ${retryErr?.message || retryErr}`);
    }
  }
};
