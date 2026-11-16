// Task 2 — thin MCP detector helper (fail-open, fs stat only, no spawn).
// Zero-dep ESM, V1+V2 importable. Never throws; missing path -> { available: false }.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const DEFAULT_MCP_PATH = path.join(os.homedir(), '.local', 'bin', 'notebooklm-mcp');

export const normalizeMcpPath = (input) => {
  try {
    if (typeof input !== 'string') return '';
    let p = input.trim();
    if (!p) return '';
    if (p === '~') return os.homedir();
    if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
    return p;
  } catch {
    return '';
  }
};

export const detectMcpCapability = (binPath = DEFAULT_MCP_PATH) => {
  try {
    const p = normalizeMcpPath(binPath);
    if (!p) return { available: false };
    let st;
    try {
      st = fs.statSync(p);
    } catch {
      return { available: false };
    }
    if (!st || typeof st.isFile !== 'function' || !st.isFile()) return { available: false };
    return { available: true, adapter: { name: 'mcp:notebooklm', bin: p } };
  } catch {
    return { available: false };
  }
};

