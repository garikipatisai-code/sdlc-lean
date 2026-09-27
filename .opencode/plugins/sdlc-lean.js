/**
 * sdlc-lean plugin for OpenCode (V1 + V2 dual-compatible, zero dependencies).
 *
 * Combines the strengths surveyed upstream:
 * - obra/superpowers: bootstrap-injection pattern (cached per-mapping bootstrap,
 *   child-session suppression, double-inject guard, per-skill fail-open
 *   registration), skill-router discipline, Red-Flags table.
 * - DietrichGebert/ponytail: 7-rung lean ladder, safety carve-outs that stay on.
 * - wshobson/agents: tiered model hints, composable install-only-what-you-need.
 * - ClaudeTools: safety-always-on.
 *
 * No option-picking: the suite auto-routes. The router skill
 * (using-sdlc-lean) infers intent from the request and selects the
 * pipeline, skills, and scrutiny level itself.
 *
 * V1 (OpenCode 1.x, e.g. 1.18.x): named export SdlcLeanPlugin — config hook
 * registers the skills dir; experimental.chat.messages.transform injects the
 * bootstrap into the first user message of top-level sessions.
 * V2 (OpenCode 2.x): default export { id, setup } — ctx.skill.transform()
 * registers skills natively; ctx.session.hook("context") injects bootstrap.
 *
 * No external dependencies — pure JS works on both flavors.
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Skills live next to the plugin: <repo>/.opencode/skills
const skillsDir = path.resolve(__dirname, '..', 'skills');

// Minimal frontmatter parser (name/description only) — avoids dependencies.
const extractAndStripFrontmatter = (content) => {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, content };
  const frontmatter = {};
  let lastKey = null;
  for (const rawLine of match[1].split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0 && !/^\s/.test(line)) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      frontmatter[key] = /^(>[+-]?|\|[+-]?)$/.test(value) ? '' : value;
      lastKey = key;
    } else if (lastKey !== null && line.trim() !== '') {
      frontmatter[lastKey] = `${frontmatter[lastKey]} ${line.trim()}`.trim();
    }
  }
  for (const key of Object.keys(frontmatter)) {
    frontmatter[key] = frontmatter[key].replace(/^(["'])([\s\S]*)\1$/, '$2');
  }
  return { frontmatter, content: match[2] };
};

// V1 built-ins: todowrite, task, skill, read, apply_patch, bash, grep, glob,
// webfetch. Superset wording covers both so one mapping serves V1; V2 flavor
// differences (task->subagent, apply_patch->patch, bash->shell) are noted.
export const V1_MAPPING = `**Tool Mapping for OpenCode:**
When skills request actions, substitute OpenCode equivalents:
- Create or update todos → \`todowrite\` (V1) or a markdown tracking file (V2, no todo tool)
- \`Subagent (general-purpose):\` → \`task\` with \`subagent_type: "general"\` (V1) or \`subagent\` with \`agent: "general"\` (V2)
- Invoke a skill → OpenCode's native \`skill\` tool
- Read files → \`read\`
- Create, edit, or delete files → \`apply_patch\` (V1) or \`patch\`/\`write\`/\`edit\` (V2)
- Run shell commands → \`bash\` (V1) or \`shell\` (V2)
- Search files → \`grep\`, \`glob\`
- Fetch a URL → \`webfetch\`

Use OpenCode's native \`skill\` tool to list and load skills.`;

// Bootstrap cached once (router file does not change mid-session).
let _bootstrapCache = null; // null = uncomputed; false = router missing

export const getBootstrapContent = () => {
  if (_bootstrapCache !== null) return _bootstrapCache || null;
  const routerPath = path.join(skillsDir, 'using-sdlc-lean', 'SKILL.md');
  if (!fs.existsSync(routerPath)) {
    _bootstrapCache = false;
    return null;
  }
  const { content } = extractAndStripFrontmatter(fs.readFileSync(routerPath, 'utf8'));
  _bootstrapCache = `<EXTREMELY_IMPORTANT>
You have an SDLC suite.

**IMPORTANT: The using-sdlc-lean skill content below is ALREADY LOADED — do NOT load "using-sdlc-lean" again via the skill tool.**

${content}

${V1_MAPPING}
</EXTREMELY_IMPORTANT>`;
  return _bootstrapCache;
};

// --- Child-session detection (superpowers #2160 pattern) ----------------------
// Task subagents carry a parentID; injecting the controller bootstrap there
// restarts design/approval cycles the parent already authorised. Skills stay
// registered for every session — workers keep execution skills.
const CHILD_CACHE_MAX = 512;
const _childCache = new Map();

const _cacheChild = (id, isChild) => {
  if (_childCache.size >= CHILD_CACHE_MAX) {
    let drop = Math.ceil(CHILD_CACHE_MAX / 4);
    for (const key of _childCache.keys()) {
      if (drop-- <= 0) break;
      _childCache.delete(key);
    }
  }
  _childCache.set(id, isChild);
};

export const isChildSession = async (fetchSession, sessionID) => {
  if (!sessionID) return false;
  if (_childCache.has(sessionID)) return _childCache.get(sessionID);
  let isChild = false;
  try {
    const result = await fetchSession(sessionID);
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('bad session record');
    if (result.error != null || result.response?.ok === false) throw new Error('session lookup failed');
    const session = 'data' in result ? result.data : result;
    if (!session || typeof session !== 'object' || session.id !== sessionID) throw new Error('bad session identity');
    isChild = session.parentID !== undefined;
  } catch (err) {
    console.error('[sdlc-lean] session lookup failed, treating as top-level:', err);
    return false; // fail open, do not cache
  }
  _cacheChild(sessionID, isChild);
  return isChild;
};

// List skills on disk: [{ id, name, description, path, content }]
export const listSkills = () => {
  const out = [];
  if (!fs.existsSync(skillsDir)) return out;
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillPath)) continue;
    const { frontmatter, content } = extractAndStripFrontmatter(fs.readFileSync(skillPath, 'utf8'));
    out.push({
      id: entry.name,
      name: frontmatter.name || entry.name,
      ...(frontmatter.description ? { description: frontmatter.description } : {}),
      path: skillPath,
      content,
    });
  }
  return out;
};

// --- Activation signal -------------------------------------------------------
// Deterministic proof the suite is live:
//  1. a status file (always, version-independent) the /sdlc-lean command reads;
//  2. a structured log entry (best effort);
//  3. a one-time TUI toast (best effort; only when a TUI is attached).
// Disable the toast with SDLC_LEAN_NO_TOAST=1.
const statusDir = path.join(
  process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state'),
  'sdlc-lean',
);
const statusPath = path.join(statusDir, 'status.json');

export const activationMessage = () => `sdlc-lean active - ${listSkills().length} skills`;

export const writeStatus = (sessionID) => {
  try {
    fs.mkdirSync(statusDir, { recursive: true });
    fs.writeFileSync(statusPath, JSON.stringify({
      at: new Date().toISOString(),
      sessionID: sessionID || 'default',
      skills: listSkills().length,
      active: true,
    }));
  } catch (err) {
    // Best effort only; never break the request pipeline.
  }
};

// Announce at most once per session (bounded set, like the child-session cache).
const ANNOUNCED_MAX = 512;
const _announced = new Set();

export const announceActivation = async (client, sessionID = 'default') => {
  if (_announced.has(sessionID)) return;
  if (_announced.size >= ANNOUNCED_MAX) {
    for (const key of _announced) { _announced.delete(key); break; }
  }
  _announced.add(sessionID);
  const message = activationMessage();
  writeStatus(sessionID);
  try {
    await client?.app?.log?.({ body: { service: 'sdlc-lean', level: 'info', message } });
  } catch (err) {
    // Best effort only.
  }
  if (process.env.SDLC_LEAN_NO_TOAST === '1') return;
  try {
    await client?.tui?.showToast?.({ body: { title: 'sdlc-lean', message, variant: 'info', duration: 4000 } });
  } catch (err) {
    // Best effort only; never break the request pipeline.
  }
};

export const getStatus = () => {
  try {
    return JSON.parse(fs.readFileSync(statusPath, 'utf8'));
  } catch (err) {
    return null;
  }
};

// --- Safety guards (ALWAYS ON) --------------
// Fail-open: only exact-known destructive patterns throw; everything else
// passes untouched. Errors explain the safe alternative.
const DESTRUCTIVE_PATTERNS = [
  /\brm\s+(-[^;\s]*r[^;\s]*\s+)?(-{0,2}\s*\/(\s|$|;))/, // rm -rf / variants
  /\brm\s+(-[^;\s]*r[^;\s]*\s+)?~(\s|$|;|\/)/, // rm -rf ~ variants
  /:\(\)\s*\{\s*:\|\:&\s*\}\s*;/, // fork bomb
  /\bmkfs(\.|$|\s)/,
  /\bdd\s+.*of=\/dev\/(sd|hd|nvme)/,
];

export const checkSafety = (tool, args = {}) => {
  if (tool === 'read' || tool === 'edit' || tool === 'write') {
    const p = String(args.filePath || args.path || '');
    if (/(^|\/)\.env(\.|$)/.test(p) || /\.pem$|\.key$|id_rsa/.test(p)) {
      throw new Error(
        `[sdlc-lean] Refusing to open sensitive file "${p}". Inspect keys/fingerprints via a safe command instead; never load secrets into context.`,
      );
    }
  }
  if (tool === 'bash' || tool === 'shell') {
    const cmd = String(args.command || '');
    if (/#nosafety/.test(cmd)) return; // explicit human/audited opt-out
    for (const re of DESTRUCTIVE_PATTERNS) {
      if (re.test(cmd)) {
        throw new Error(
          `[sdlc-lean] Refusing destructive command. Narrow the target path or confirm intent explicitly with #nosafety.`,
        );
      }
    }
  }
};

/** V1 plugin (named export, OpenCode 1.x). */
export const SdlcLeanPlugin = async ({ client } = {}) => {
  return {
    config: async (config) => {
      if (Array.isArray(config.skills)) return; // V2 shape — setup() handles it
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes(skillsDir)) config.skills.paths.push(skillsDir);
    },

    // First-user-message injection (superpowers pattern: avoids per-turn
    // system-message bloat and multi-system-message model breakage).
    'experimental.chat.messages.transform': async (_input, output) => {
      const bootstrap = getBootstrapContent();
      if (!bootstrap || !output.messages.length) return;
      const firstUser = output.messages.find((m) => m.info.role === 'user');
      if (!firstUser || !firstUser.parts.length) return;
      if (firstUser.parts.some((p) => p.type === 'text' && p.text.includes('EXTREMELY_IMPORTANT'))) return;
      if (client && (await isChildSession((id) => client.session.get({ path: { id } }), firstUser.info.sessionID))) return;
      const ref = firstUser.parts[0];
      firstUser.parts.unshift({ ...ref, type: 'text', text: bootstrap });
      await announceActivation(client, firstUser.info.sessionID);
    },

    // Safety net: destructive commands + sensitive files. Always on.
    'tool.execute.before': async (input, output) => {
      checkSafety(input.tool, output.args);
    },
  };
};

/** V2 setup (default export, OpenCode 2.x). No-ops gracefully on V1 ctx. */
async function setup(ctx) {
  if (!ctx || !ctx.skill || typeof ctx.skill.transform !== 'function' || !ctx.session || typeof ctx.session.hook !== 'function') {
    return; // V1-shaped ctx — named export serves V1
  }
  try {
    const skills = listSkills();
    await ctx.skill.transform((draft) => {
      for (const s of skills) {
        try {
          draft.add(s);
        } catch (err) {
          console.error(`[sdlc-lean] skill "${s.id}" rejected by host, skipping:`, err);
        }
      }
    });
  } catch (err) {
    console.error('[sdlc-lean] skill registration failed:', err);
  }
  try {
    await ctx.session.hook('context', async (event) => {
      try {
        const bootstrap = getBootstrapContent();
        if (!bootstrap || !event.messages || !event.messages.length) return;
        const firstUser = event.messages.find((m) => m.role === 'user');
        if (firstUser && (!firstUser.content || !firstUser.content.length)) return;
        if (firstUser?.content.some((p) => p.type === 'text' && p.text && p.text.includes('EXTREMELY_IMPORTANT'))) return;
        if (typeof ctx.session.get === 'function' && (await isChildSession((id) => ctx.session.get({ sessionID: id }), event.sessionID))) return;
        if (firstUser) firstUser.content.unshift({ type: 'text', text: bootstrap });
        else event.messages.push({ role: 'user', content: [{ type: 'text', text: bootstrap }] });
        await announceActivation(ctx.client || ctx, event.sessionID);
      } catch (err) {
        console.error('[sdlc-lean] context hook failed:', err);
      }
    });
  } catch (err) {
    console.error('[sdlc-lean] session hook registration failed:', err);
  }
}

export default { id: 'sdlc-lean', server: SdlcLeanPlugin, setup };
