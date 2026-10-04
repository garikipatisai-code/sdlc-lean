// Tolerant parser for `opencode run --format json` output.
//
// The exact event shape is confirmed against a real run; this walker accepts a
// single JSON document, JSON-per-line, or already-parsed objects, and ignores
// anything it cannot parse. It extracts:
//   text    - all string values under a `text` key, joined
//   skills  - skill names from skill events or skill tool calls
//   tools   - tool names from tool events
//   blocked - true if any string carries the guard marker

const GUARD_MARKER = '[sdlc-lean]';

export function parseEvents(input) {
  const events = [];
  const lines = Array.isArray(input) ? input : String(input).split(/\r?\n/);
  for (const line of lines) {
    if (line && typeof line === 'object') {
      events.push(line);
      continue;
    }
    const s = String(line || '').trim();
    if (!s) continue;
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start === -1 || end <= start) continue;
    try {
      events.push(JSON.parse(s.slice(start, end + 1)));
    } catch {
      // partial or non-JSON line: ignore
    }
  }

  const text = [];
  const skills = [];
  const tools = [];
  let blocked = false;
  const usage = {
    cost: 0,
    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
  };

  const note = (value) => {
    if (typeof value !== 'string') return;
    if (value.includes(GUARD_MARKER)) blocked = true;
    const re = /<skill_content name="([^"]+)"/g;
    let m;
    while ((m = re.exec(value)) !== null) skills.push(m[1]);
  };

  const walk = (node) => {
    if (node == null) return;
    if (typeof node === 'string') {
      note(node);
      return;
    }
    if (Array.isArray(node)) {
      for (const n of node) walk(n);
      return;
    }
    if (typeof node !== 'object') return;

    const type = typeof node.type === 'string' ? node.type : '';
    if (typeof node.cost === 'number' && node.tokens && typeof node.tokens === 'object') {
      usage.cost += node.cost;
      usage.tokens.input += node.tokens.input || 0;
      usage.tokens.output += node.tokens.output || 0;
      usage.tokens.reasoning += node.tokens.reasoning || 0;
      const c = node.tokens.cache || {};
      usage.tokens.cache.read += c.read || 0;
      usage.tokens.cache.write += c.write || 0;
    }
    if (typeof node.tool === 'string') {
      tools.push(node.tool);
      if (node.tool === 'skill') {
        const input = (node.state && node.state.input) || {};
        const s = input.id || input.name || input.skill;
        if (typeof s === 'string') skills.push(s);
      }
    }
    if (typeof node.name === 'string') {
      if (node.tool === 'skill' || /skill/i.test(type)) skills.push(node.name);
      else if (/tool/i.test(type)) tools.push(node.name);
    }

    for (const [k, v] of Object.entries(node)) {
      const key = k.toLowerCase();
      if (typeof v === 'string') {
        if (key === 'text') text.push(v);
        else if (key === 'skill' || key === 'skillid') skills.push(v);
        else if (key === 'tool') tools.push(v);
        note(v);
      } else {
        walk(v);
      }
    }
  };

  walk(events);
  return { text: text.join('\n'), skills: [...new Set(skills)], tools, blocked, usage };
}
