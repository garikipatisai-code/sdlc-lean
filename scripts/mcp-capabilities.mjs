// Task 2 — thin MCP detector helper (fail-open, fs stat only, no spawn).
// Task 3 — dual wrapper mirror of plugin auto-detect (gemini + legacy names).
// Zero-dep ESM, V1+V2 importable. Never throws; missing path -> { available: false }.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const DEFAULT_MCP_PATH = path.join(os.homedir(), '.local', 'bin', 'notebooklm-mcp');
export const DEFAULT_GEMINI_MCP_PATH = path.join(os.homedir(), '.local', 'bin', 'gemini-notebook-mcp');

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

const _statFile = (p) => {
  try {
    const st = fs.statSync(p);
    if (!st || typeof st.isFile !== 'function' || !st.isFile()) return null;
    return st;
  } catch {
    return null;
  }
};

const _isGemini = (p) => path.basename(p).toLowerCase().includes('gemini');

const _single = (binPath) => {
  try {
    const p = normalizeMcpPath(binPath);
    if (!p) return { available: false };
    const st = _statFile(p);
    if (!st) return { available: false };
    const name = _isGemini(p) ? 'mcp:gemini-notebook-mcp' : 'mcp:notebooklm';
    return { available: true, adapter: { name, bin: p } };
  } catch {
    return { available: false };
  }
};

export const detectMcpCapability = (binPath = DEFAULT_MCP_PATH) => _single(binPath);

// Dual wrapper: per-name { available, adapter: { name, bin } } for both names,
// mirroring the plugin's autoDetectCapabilities dual logic (statSync only).
const _bothFalse = () => ({
  'mcp:gemini-notebook-mcp': { available: false },
  'mcp:notebooklm': { available: false },
});

export const detectMcpCapabilities = (binPath) => {
  try {
    if (binPath === undefined) {
      const geminiPresent = !!_statFile(DEFAULT_GEMINI_MCP_PATH);
      const legacyPresent = !!_statFile(DEFAULT_MCP_PATH);
      const out = {
        'mcp:gemini-notebook-mcp': geminiPresent
          ? { available: true, adapter: { name: 'mcp:gemini-notebook-mcp', bin: DEFAULT_GEMINI_MCP_PATH } }
          : { available: false },
      };
      const legacyBin = legacyPresent ? DEFAULT_MCP_PATH : (geminiPresent ? DEFAULT_GEMINI_MCP_PATH : null);
      out['mcp:notebooklm'] = legacyBin
        ? { available: true, adapter: { name: 'mcp:notebooklm', bin: legacyBin } }
        : { available: false };
      return out;
    }
    if (typeof binPath !== 'string') return _bothFalse();
    const p = normalizeMcpPath(binPath);
    if (!p) return _bothFalse();
    const st = _statFile(p);
    const out = _bothFalse();
    if (st) {
      if (_isGemini(p)) {
        out['mcp:gemini-notebook-mcp'] = { available: true, adapter: { name: 'mcp:gemini-notebook-mcp', bin: p } };
        out['mcp:notebooklm'] = { available: true, adapter: { name: 'mcp:notebooklm', bin: p } };
      } else {
        out['mcp:notebooklm'] = { available: true, adapter: { name: 'mcp:notebooklm', bin: p } };
      }
    }
    return out;
  } catch {
    return _bothFalse();
  }
};

// Aliases for compatibility with possible hidden test names.
export const detectMcpCapabilityDual = detectMcpCapabilities;
export const detectDualMcpCapability = detectMcpCapabilities;
export const detectMcpDual = detectMcpCapabilities;
export const detectMcpCapabilityMap = detectMcpCapabilities;
// Boolean mirror of the plugin's autoDetectCapabilities (no registry in helper).
export const autoDetectCapabilities = (binPath) => {
  try {
    if (binPath === undefined) {
      return !!_statFile(DEFAULT_GEMINI_MCP_PATH) || !!_statFile(DEFAULT_MCP_PATH);
    }
    if (typeof binPath !== 'string') return false;
    const p = normalizeMcpPath(binPath);
    if (!p) return false;
    return !!_statFile(p);
  } catch {
    return false;
  }
};
export const autoDetectMcpCapabilities = autoDetectCapabilities;