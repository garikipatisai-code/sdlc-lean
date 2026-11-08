#!/usr/bin/env node
// Asset audit — validate a game asset manifest for naming, format, and size caps.
// Zero deps, vanilla JS.
//
// Usage:
//   node scripts/asset-audit.mjs [manifest.json]        # audit one manifest (exit 0 = conforms)
//   node scripts/asset-audit.mjs --self-test            # run built-in conformance checks
//
// The audit reads a manifest (schema_version + assets[].{id, path, ...}), then for
// each asset checks: id is kebab-case, path extension is an allowed format for its
// category, and the shipped file bytes are at or under the category size cap.
// Missing asset files fail the audit. Size caps are enforced on real bytes.

import fs from 'fs';
import path from 'path';

const DEFAULT_MANIFEST = 'content/asset-manifest.json';
const SELF_TEST_DIR = '/tmp/opencode/asset-audit-self-test';

// Allowed extensions per category (lowercase, leading dot).
const FORMATS = {
  texture: ['.ktx2', '.png', '.jpg', '.jpeg', '.webp'],
  model: ['.glb', '.gltf'],
  audio: ['.mp3', '.ogg', '.wav', '.m4a'],
  font: ['.woff2', '.woff'],
  image: ['.png', '.jpg', '.jpeg', '.webp', '.svg'],
};

// Size caps in bytes per category.
const CAPS = {
  texture: 20 * 1024 * 1024, // 20 MB
  model: 10 * 1024 * 1024,   // 10 MB
  audio: 5 * 1024 * 1024,    // 5 MB
  font: 2 * 1024 * 1024,     // 2 MB
  image: 10 * 1024 * 1024,   // 10 MB
};
const DEFAULT_CAP = 50 * 1024 * 1024; // 50 MB

// Category folder name expected to appear as a path segment (spec §4/§8).
const CATEGORY_FOLDER = {
  texture: 'textures',
  model: 'models',
  audio: 'audio',
  font: 'fonts',
  image: 'images',
};

// Asset id: kebab-case, lowercase alphanumerics joined by single hyphens.
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const REQUIRED_ASSET_KEYS = ['id', 'path'];

let failures = 0;
const fail = (msg) => { failures++; console.error(`FAIL: ${msg}`); };
const pass = (msg) => { console.log(`ok: ${msg}`); };

function categoryFor(ext) {
  const e = ext.toLowerCase();
  for (const [category, exts] of Object.entries(FORMATS)) {
    if (exts.includes(e)) return category;
  }
  if (e === '.svg' || e === '.png' || e === '.jpg' || e === '.jpeg' || e === '.webp') return 'image';
  return null;
}

function capFor(category) {
  return CAPS[category] ?? DEFAULT_CAP;
}

function formatList(category) {
  return (FORMATS[category] || []).join(', ');
}

function auditManifest(manifestPath) {
  failures = 0;
  const manifestDir = path.dirname(path.resolve(manifestPath));
  // Fail-closed: the manifest directory must resolve; never fall back to
  // lexical containment when realpath fails (missing/unreadable -> reject).
  let realDir;
  try {
    realDir = fs.realpathSync(manifestDir);
  } catch (err) {
    fail(`cannot resolve manifest directory "${manifestDir}": ${err.message}`);
    return failures === 0;
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    fail(`cannot parse manifest "${manifestPath}": ${err.message}`);
    return failures === 0;
  }

  if (typeof manifest !== 'object' || manifest === null || Array.isArray(manifest)) {
    fail(`manifest "${manifestPath}" is not a JSON object`);
    return failures === 0;
  }
  if (manifest.schema_version === undefined) {
    fail(`manifest "${manifestPath}" missing schema_version`);
  } else if (manifest.schema_version !== 1) {
    fail(`manifest "${manifestPath}" schema_version must be 1 (got ${JSON.stringify(manifest.schema_version)})`);
  }
  if (!Array.isArray(manifest.assets)) {
    fail(`manifest "${manifestPath}" missing assets array`);
    return failures === 0;
  }

  const seenIds = new Set();
  for (const asset of manifest.assets) {
    if (typeof asset !== 'object' || asset === null || Array.isArray(asset)) {
      fail(`asset entry is not an object`);
      continue;
    }
    for (const key of REQUIRED_ASSET_KEYS) {
      if (asset[key] === undefined || asset[key] === '') {
        fail(`asset missing required key "${key}": ${JSON.stringify(asset)}`);
      }
    }
    const id = asset.id;
    const p = asset.path;
    if (typeof id === 'string') {
      if (seenIds.has(id)) {
        fail(`asset id "${id}" is a duplicate (duplicate ids rejected)`);
      } else {
        seenIds.add(id);
      }
    }
    if (typeof id === 'string' && !ID_RE.test(id)) {
      fail(`asset id "${id}" is not kebab-case (^[a-z0-9]+(?:-[a-z0-9]+)*$)`);
    }
    if (typeof p === 'string') {
      const ext = path.extname(p);
      const category = categoryFor(ext);
      if (!category) {
        fail(`asset "${id}" path "${p}" has unsupported format "${ext}" (allowed: ${formatList('image')}, ${formatList('texture')}, ${formatList('model')}, ${formatList('audio')}, ${formatList('font')})`);
      } else {
        // Category folder check (spec §8): path must contain the folder
        // matching its category (derived from the extension).
        const expectedFolder = CATEGORY_FOLDER[category];
        const folderSegments = typeof p === 'string' ? p.split(/[\\\\/]/) : [];
        if (expectedFolder && !folderSegments.includes(expectedFolder)) {
          fail(`asset "${id}" path "${p}" lacks category folder "${expectedFolder}"`);
          continue;
        }
        // Path containment: reject traversal before touching the filesystem.
        if (path.isAbsolute(p)) {
          fail(`asset "${id}" path "${p}" must be relative (absolute paths are not allowed)`);
          continue;
        }
        const segments = p.split(/[\\\\/]/);
        if (segments.includes('..')) {
          fail(`asset "${id}" path "${p}" contains a ".." segment (path traversal rejected)`);
          continue;
        }
        const abs = path.resolve(manifestDir, p);
        const rel = path.relative(manifestDir, abs);
        if (rel === '' || rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) {
          fail(`asset "${id}" path "${p}" escapes the manifest directory (path traversal rejected)`);
          continue;
        }
        // Realpath containment: witness the entry with lstat/readlink/realpath
        // before open so a symlink (or symlinked parent) escaping the
        // manifest directory is rejected even though the lexical path is inside.
        let lstat;
        try {
          lstat = fs.lstatSync(abs);
        } catch (err) {
          fail(`asset "${id}" file missing: ${abs}`);
          continue;
        }
        if (lstat.isSymbolicLink()) {
          try {
            fs.readlinkSync(abs);
          } catch (err) {
            fail(`asset "${id}" file missing: ${abs}`);
            continue;
          }
        }
        let realTarget;
        try {
          realTarget = fs.realpathSync(abs);
        } catch (err) {
          fail(`asset "${id}" file missing: ${abs}`);
          continue;
        }
        const relReal = path.relative(realDir, realTarget);
        if (relReal === '' || relReal === '..' || relReal.startsWith('..' + path.sep) || path.isAbsolute(relReal)) {
          fail(`asset "${id}" path "${p}" escapes the manifest directory via symlink (path traversal rejected)`);
          continue;
        }
        // TOCTOU hardening: open with O_NOFOLLOW and fstat the descriptor so
        // a symlink swapped in after realpath containment is rejected at open
        // (ELOOP) and size comes from the opened file, not a re-resolved path.
        // If O_NOFOLLOW is undefined (e.g. Windows) this falls back to the
        // realpath containment above; existing guards are not weakened.
        const O_NOFOLLOW = fs.constants.O_NOFOLLOW ?? 0;
        let fd;
        try {
          fd = fs.openSync(abs, fs.constants.O_RDONLY | O_NOFOLLOW);
        } catch (err) {
          if (err && err.code === 'ELOOP') {
            fail(`asset "${id}" path "${p}" is a symlink (path traversal rejected)`);
          } else {
            fail(`asset "${id}" file missing: ${abs}`);
          }
          continue;
        }
        let stat;
        try {
          stat = fs.fstatSync(fd);
        } catch (err) {
          fail(`asset "${id}" file missing: ${abs}`);
          continue;
        } finally {
          try { fs.closeSync(fd); } catch { /* already closed */ }
        }
        if (!stat.isFile()) {
          fail(`asset "${id}" path "${abs}" is not a regular file`);
          continue;
        }
        const size = stat.size;
        const cap = capFor(category);
        if (size > cap) {
          fail(`asset "${id}" (${category}) is ${size} bytes, over cap ${cap} bytes`);
        } else {
          pass(`asset "${id}" (${category}) ${size} bytes <= cap ${cap} bytes`);
        }
      }
    }
  }

  return failures === 0;
}

function writeFileSyncBytes(file, bytes) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, Buffer.alloc(bytes));
}

function selfTest() {
  fs.rmSync(SELF_TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(SELF_TEST_DIR, { recursive: true });

  const conformingDir = path.join(SELF_TEST_DIR, 'conforming');
  const oversizedDir = path.join(SELF_TEST_DIR, 'oversized');
  const badFormatDir = path.join(SELF_TEST_DIR, 'bad-format');
  const badIdDir = path.join(SELF_TEST_DIR, 'bad-id');
  const traversalDir = path.join(SELF_TEST_DIR, 'traversal');
  const absoluteDir = path.join(SELF_TEST_DIR, 'absolute');
  const symlinkDir = path.join(SELF_TEST_DIR, 'symlink-escape');
  const missingDir = path.join(SELF_TEST_DIR, 'missing-file');
  const noFolderDir = path.join(SELF_TEST_DIR, 'no-folder');
  const duplicateDir = path.join(SELF_TEST_DIR, 'duplicate-id');
  const badSchemaDir = path.join(SELF_TEST_DIR, 'bad-schema');
  fs.mkdirSync(conformingDir, { recursive: true });
  fs.mkdirSync(oversizedDir, { recursive: true });
  fs.mkdirSync(badFormatDir, { recursive: true });
  fs.mkdirSync(badIdDir, { recursive: true });
  fs.mkdirSync(traversalDir, { recursive: true });
  fs.mkdirSync(absoluteDir, { recursive: true });
  fs.mkdirSync(symlinkDir, { recursive: true });
  fs.mkdirSync(missingDir, { recursive: true });
  fs.mkdirSync(noFolderDir, { recursive: true });
  fs.mkdirSync(duplicateDir, { recursive: true });
  fs.mkdirSync(badSchemaDir, { recursive: true });

  // 1. Conforming manifest: one small asset per category, all within caps.
  const conformingAssets = [
    { id: 'env-crate-a', path: 'textures/env-crate-a.png', category: 'image', bytes: 1000 },
    { id: 'hero-texture', path: 'textures/hero-texture.ktx2', category: 'texture', bytes: 1000 },
    { id: 'level-01', path: 'models/level-01.glb', category: 'model', bytes: 1000 },
    { id: 'shot-hit', path: 'audio/shot-hit.ogg', category: 'audio', bytes: 1000 },
    { id: 'ui-font', path: 'fonts/ui-font.woff2', category: 'font', bytes: 1000 },
  ];
  for (const a of conformingAssets) {
    writeFileSyncBytes(path.join(conformingDir, a.path), a.bytes);
  }
  const conformingManifest = {
    schema_version: 1,
    assets: conformingAssets.map((a) => ({
      id: a.id,
      role: `conforming ${a.category}`,
      path: a.path,
      status: 'approved',
    })),
  };
  fs.writeFileSync(path.join(conformingDir, 'manifest.json'), JSON.stringify(conformingManifest, null, 2));

  // 2. Oversized: one texture over its 20 MB cap.
  writeFileSyncBytes(path.join(oversizedDir, 'textures/big.png'), 21 * 1024 * 1024);
  const oversizedManifest = {
    schema_version: 1,
    assets: [{ id: 'big-texture', path: 'textures/big.png', status: 'planned' }],
  };
  fs.writeFileSync(path.join(oversizedDir, 'manifest.json'), JSON.stringify(oversizedManifest, null, 2));

  // 3. Bad format: an .exe referenced as an asset.
  writeFileSyncBytes(path.join(badFormatDir, 'models/bad.exe'), 1000);
  const badFormatManifest = {
    schema_version: 1,
    assets: [{ id: 'bad-exe', path: 'models/bad.exe', status: 'planned' }],
  };
  fs.writeFileSync(path.join(badFormatDir, 'manifest.json'), JSON.stringify(badFormatManifest, null, 2));

  // 4. Bad id: CamelCase id fails kebab-case.
  writeFileSyncBytes(path.join(badIdDir, 'textures/GoodId.png'), 1000);
  const badIdManifest = {
    schema_version: 1,
    assets: [{ id: 'GoodId', path: 'textures/GoodId.png', status: 'planned' }],
  };
  fs.writeFileSync(path.join(badIdDir, 'manifest.json'), JSON.stringify(badIdManifest, null, 2));

  // 5. Traversal: "../" segment must fail closed.
  const traversalManifest = {
    schema_version: 1,
    assets: [{ id: 'traversal-asset', path: '../outside.png', status: 'planned' }],
  };
  fs.writeFileSync(path.join(traversalDir, 'manifest.json'), JSON.stringify(traversalManifest, null, 2));

  // 6. Absolute path must fail closed.
  const absoluteManifest = {
    schema_version: 1,
    assets: [{ id: 'absolute-asset', path: '/tmp/opencode/absolute.png', status: 'planned' }],
  };
  fs.writeFileSync(path.join(absoluteDir, 'manifest.json'), JSON.stringify(absoluteManifest, null, 2));

  // 7. Symlink escape: link inside manifest dir points outside it.
  const outsideFile = path.join(SELF_TEST_DIR, 'outside-secret.png');
  writeFileSyncBytes(outsideFile, 1000);
  const symlinkTexDir = path.join(symlinkDir, 'textures');
  fs.mkdirSync(symlinkTexDir, { recursive: true });
  fs.symlinkSync(outsideFile, path.join(symlinkTexDir, 'evil.png'));
  const symlinkManifest = {
    schema_version: 1,
    assets: [{ id: 'evil-link', path: 'textures/evil.png', status: 'planned' }],
  };
  fs.writeFileSync(path.join(symlinkDir, 'manifest.json'), JSON.stringify(symlinkManifest, null, 2));

  // 8. Missing file must fail closed.
  const missingManifest = {
    schema_version: 1,
    assets: [{ id: 'missing-asset', path: 'textures/missing.png', status: 'planned' }],
  };
  fs.writeFileSync(path.join(missingDir, 'manifest.json'), JSON.stringify(missingManifest, null, 2));

  // 9. Missing category folder must fail closed.
  writeFileSyncBytes(path.join(noFolderDir, 'orphan.png'), 1000);
  const noFolderManifest = {
    schema_version: 1,
    assets: [{ id: 'orphan-asset', path: 'orphan.png', status: 'planned' }],
  };
  fs.writeFileSync(path.join(noFolderDir, 'manifest.json'), JSON.stringify(noFolderManifest, null, 2));

  // 10. Duplicate ids must fail closed.
  writeFileSyncBytes(path.join(duplicateDir, 'textures/a.png'), 1000);
  writeFileSyncBytes(path.join(duplicateDir, 'textures/b.png'), 1000);
  const duplicateManifest = {
    schema_version: 1,
    assets: [
      { id: 'dup-asset', path: 'textures/a.png', status: 'planned' },
      { id: 'dup-asset', path: 'textures/b.png', status: 'planned' },
    ],
  };
  fs.writeFileSync(path.join(duplicateDir, 'manifest.json'), JSON.stringify(duplicateManifest, null, 2));

  // 11. Bad schema_version must fail closed.
  writeFileSyncBytes(path.join(badSchemaDir, 'textures/x.png'), 1000);
  const badSchemaManifest = {
    schema_version: 2,
    assets: [{ id: 'schema-asset', path: 'textures/x.png', status: 'planned' }],
  };
  fs.writeFileSync(path.join(badSchemaDir, 'manifest.json'), JSON.stringify(badSchemaManifest, null, 2));

  // 12. manifestDir realpath failure must fail closed (no lexical fallback).
  // Conforming content, but realpath of the manifest directory is forced to
  // throw (simulates missing/unreadable dir): audit must reject, not pass via
  // lexical containment.
  const manifestDirFailDir = path.join(SELF_TEST_DIR, 'bad-manifest-dir');
  fs.mkdirSync(manifestDirFailDir, { recursive: true });
  writeFileSyncBytes(path.join(manifestDirFailDir, 'textures/ok.png'), 1000);
  const manifestDirFailManifest = {
    schema_version: 1,
    assets: [{ id: 'ok-asset', path: 'textures/ok.png', status: 'planned' }],
  };
  fs.writeFileSync(path.join(manifestDirFailDir, 'manifest.json'), JSON.stringify(manifestDirFailManifest, null, 2));

  let selfFailures = 0;
  const check = (label, manifestPath, expectPass) => {
    failures = 0;
    const ok = auditManifest(manifestPath);
    const passed = ok === expectPass;
    if (!passed) {
      selfFailures++;
      console.error(`SELF-TEST FAIL: "${label}" expected pass=${expectPass} got ok=${ok} (failures=${failures})`);
    } else {
      pass(`self-test "${label}" (expect pass=${expectPass}, got ok=${ok})`);
    }
  };

  check('conforming', path.join(conformingDir, 'manifest.json'), true);
  check('oversized', path.join(oversizedDir, 'manifest.json'), false);
  check('bad-format', path.join(badFormatDir, 'manifest.json'), false);
  check('bad-id', path.join(badIdDir, 'manifest.json'), false);
  check('traversal', path.join(traversalDir, 'manifest.json'), false);
  check('absolute', path.join(absoluteDir, 'manifest.json'), false);
  check('symlink-escape', path.join(symlinkDir, 'manifest.json'), false);
  check('missing-file', path.join(missingDir, 'manifest.json'), false);
  check('no-folder', path.join(noFolderDir, 'manifest.json'), false);
  check('duplicate-id', path.join(duplicateDir, 'manifest.json'), false);
  check('bad-schema', path.join(badSchemaDir, 'manifest.json'), false);

  // Mocked manifestDir realpath failure: must reject (false), never pass via
  // lexical fallback.
  {
    const realpathOrig = fs.realpathSync;
    try {
      const targetDir = path.resolve(manifestDirFailDir);
      fs.realpathSync = (p, ...rest) => {
        if (p === targetDir) {
          const err = new Error(`EACCES: permission denied, realpath '${p}'`);
          err.code = 'EACCES';
          throw err;
        }
        return realpathOrig.call(fs, p, ...rest);
      };
      failures = 0;
      const ok = auditManifest(path.join(manifestDirFailDir, 'manifest.json'));
      const passed = ok === false;
      if (!passed) {
        selfFailures++;
        console.error(`SELF-TEST FAIL: "manifest-dir-realpath" expected pass=false got ok=${ok} (failures=${failures})`);
      } else {
        pass(`self-test "manifest-dir-realpath" (expect pass=false, got ok=${ok})`);
      }
    } finally {
      fs.realpathSync = realpathOrig;
    }
  }

  fs.rmSync(SELF_TEST_DIR, { recursive: true, force: true });

  if (selfFailures > 0) {
    console.error(`SELF-TEST: ${selfFailures} check(s) failed`);
    process.exit(1);
  }
  console.log('SELF-TEST: all checks passed');
  process.exit(0);
}

const manifestPath = process.argv[2];
if (manifestPath === '--self-test') {
  selfTest();
} else {
  const ok = auditManifest(manifestPath || DEFAULT_MANIFEST);
  process.exit(ok ? 0 : 1);
}
