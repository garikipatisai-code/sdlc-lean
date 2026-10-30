// Structural assertion engine for eval probes.
// `evaluate(expect, observed)` returns one result per expectation with `ok`.

export function evaluate(expect = [], observed = {}) {
  const text = observed.text || '';
  const skills = observed.skills || [];
  const tools = observed.tools || [];
  const artifacts = observed.artifacts || {};
  const urls = observed.urls || [];
  const artifact = (p) =>
    typeof p === 'string' && Object.hasOwn(artifacts, p) ? artifacts[p] : undefined;

  return expect.map((e) => {
    switch (e.kind) {
      case 'contains':
        return { ...e, ok: text.includes(e.value) };
      case 'not-contains':
        return { ...e, ok: !text.includes(e.value) };
      case 'skill':
        return { ...e, ok: skills.includes(e.value) };
      case 'tool':
        return { ...e, ok: tools.includes(e.value) };
      case 'activated':
        return { ...e, ok: observed.activated === true };
      case 'blocked':
        return { ...e, ok: observed.blocked === true };
      case 'artifact-contains': {
        const body = artifact(e.path);
        if (body === undefined) return { ...e, ok: false, error: `artifact missing: ${e.path}` };
        return { ...e, ok: body.includes(e.value) };
      }
      case 'artifact-matches': {
        const body = artifact(e.path);
        if (body === undefined) return { ...e, ok: false, error: `artifact missing: ${e.path}` };
        try {
          return { ...e, ok: new RegExp(e.value).test(body) };
        } catch (err) {
          return { ...e, ok: false, error: `bad regex: ${err.message}` };
        }
      }
      case 'file-unchanged': {
        const hashes = observed.fileHashes;
        if (
          !hashes ||
          typeof hashes !== 'object' ||
          !hashes.before ||
          typeof hashes.before !== 'object' ||
          !hashes.after ||
          typeof hashes.after !== 'object'
        ) {
          return { ...e, ok: false, error: 'file hash observation missing: fileHashes.before/after' };
        }
        if (!Object.hasOwn(hashes.before, e.path) || !Object.hasOwn(hashes.after, e.path)) {
          return { ...e, ok: false, error: `untracked path: ${e.path}` };
        }
        return { ...e, ok: hashes.before[e.path] === hashes.after[e.path] };
      }
      case 'url-fetched': {
        const body = artifact(e.path);
        if (body === undefined) return { ...e, ok: false, error: `artifact missing: ${e.path}` };
        let re;
        try {
          re = new RegExp(e.value, 'gi');
        } catch (err) {
          return { ...e, ok: false, error: `bad regex: ${err.message}` };
        }
        const matches = [...body.matchAll(re)].map((m) => m[0].replace(/[.,;:]+$/, ''));
        if (matches.length === 0) {
          return { ...e, ok: false, error: `no url matched ${e.value} in ${e.path}` };
        }
        const missing = [...new Set(matches)].filter((u) => !urls.includes(u));
        if (missing.length > 0) {
          return { ...e, ok: false, error: `url not fetched: ${missing.join(', ')}` };
        }
        return { ...e, ok: true };
      }
      case 'command-exit':
        if (typeof observed.commandExit !== 'number') {
          return { ...e, ok: false, error: 'command not run' };
        }
        return { ...e, ok: observed.commandExit === e.value };
      default:
        return { ...e, ok: false, error: `unknown kind: ${e.kind}` };
    }
  });
}

export const passed = (results = []) => results.every((r) => r.ok);
