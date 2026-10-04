// Structural assertion engine for eval probes.
// `evaluate(expect, observed)` returns one result per expectation with `ok`.

export function evaluate(expect = [], observed = {}) {
  const text = observed.text || '';
  const skills = observed.skills || [];
  const tools = observed.tools || [];

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
      default:
        return { ...e, ok: false, error: `unknown kind: ${e.kind}` };
    }
  });
}

export const passed = (results = []) => results.every((r) => r.ok);
