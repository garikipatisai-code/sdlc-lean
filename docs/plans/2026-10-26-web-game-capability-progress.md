# Web-game capability acquisition — progress ledger

Goal: decide whether sdlc-lean can support SOTA web-game builds, and if not,
add the missing capabilities suite-native (reuse-first, no untrusted installs).

## Current evidence (2026-10-25)

- Activation recorded: `~/.local/state/sdlc-lean/status.json` — session
  `ses_e89cc1f7affe43n9Y0FEKjbVRA`, 40 skills, active. Prior supplied record:
  `ses_e8aa05b92ffeLp4FbLX1thrT78` at 2026-10-25T23:22:44.944Z.
- Project: 40 skills, 8 agents, 8 commands. Global: 40/8/8 after install.
- Bootstrap: 5068 bytes (<5120 budget).
- No game-specific skill existed before this change. Closest: `frontend-design`
  (web UI), `ui-review`, `investigating-performance`, `test-driven-development`,
  `brainstorming`.

## Decision

Gap was real: the suite covered generic web UI + engineering discipline, not game
architecture, real-time rendering, game feel, netcode, or game QA. Filled with one
web-first router skill plus a pinned, audited Apache-2.0 reference corpus. No
third-party executable code was installed.

## What shipped

- `.opencode/skills/web-game-development/SKILL.md` — web-first router + S-tier
  gates: engine matrix, fixed-step/WebGPU-WebGL architecture, frame/asset
  budgets, authoritative netcode, game feel/playtest/a11y, PWA/portal shipping.
- Suite-native references: `engine-matrix.md`, `web-architecture-performance.md`,
  `web-netcode.md`, `web-shipping.md`, `game-design-playtest.md`, `VENDORED.md`.
- Vendored Apache-2.0 corpus (`references/vendor/`, commit
  `184b72be02884f782a0058f2eeae2ce4277453e4`): Phaser/Pixi/three engine guides,
  12 disciplines (game feel, perf, levels, saves, shaders, audio, input, physics,
  UI, cameras, procedural, assets), itch publish, prototype-fast. Markdown/JSON
  only; no scripts, hooks, symlinks, or executables.
- `.opencode/commands/game.md` — design → plan → build → review → verify → ship.
- Router line in `using-sdlc-lean` (web game routes before generic feature).
- Docs: README/USAGE counts, CHANGELOG, verify-recipe; trusted-source entry.
- Verification: new static test checks every routed reference exists, the vendor
  tree is inert, the pin is recorded, and `/game` ships; new `routing-web-game`
  eval probe (16 total).

## Review fixes applied

- Poki terms corrected (exclusive preferred/default, non-exclusive flat fee);
  revenue split verified against Poki docs.
- WebTransport wording corrected (WebRTC also has unreliable datagrams);
  Spector.js scoped to WebGL; PlayCanvas editor pricing corrected; Safari
  version made non-stale; Windows/Firefox phrasing fixed.
- Catch-up loop now caps at 4 steps and drops backlog; audio unlock includes
  keyboard/click; prototype row no longer claims game-jam coverage.
- `/game` gained the review pass and the spec-gate precondition.
- Vendored butler CI hardened: no creds-file read, SHA-256 pin, temp-dir
  extraction, step-scoped secret, no `butler upgrade` in CI, `--dereference`
  warning. `create-game-assets` helper-script commands were replaced with a
  project-tooling checklist (scripts are not bundled).
- Trusted-source audit date/wording corrected; VENDORED.md records the two
  modifications, precedence, and refresh procedure.

## Residual review fixes (round 2)

- Removed the remaining "use the bundled scripts" contradiction in vendored
  `create-game-assets`; VENDORED.md now says the omitted helpers generate raster
  QA/preview output (not read-only).
- Added per-file Apache-2.0 §4(b) modification notices to the two modified
  vendored files.
- Poki revenue row now cites the deal-types page and marks 50/50 as typical;
  the SDK doc link is retained.
- Replaced the nonexistent "Chrome DevTools WebGPU inspector" with WebGPU
  Inspector / PIX / RenderDoc.
- Fixed the catch-up guard to `if (acc >= DT) acc = 0;` so the backlog drops
  only when one remains.
- Router row now says to self-host three.js production JS and that import maps
  cannot carry SRI.
- GitLab `BUTLER_API_KEY` guidance scoped to the push job.
- Trusted-source wording now says Markdown/JSON plus Apache LICENSE/NOTICE.
- `/game` test asserts the review, lean-review, spec-gate, and no-implement
  steps.

## Authorization / spec gate

User directive 2026-10-25: "If not then do the needful to gain those
capabilities." No formal spec gate was opened: this is a capability acquisition,
not an approved feature plan, and all changes are additive. If a gate is required
for further expansion, approve a plan before editing beyond this scope.

## Verification

- `npm run verify` → lint `checked 40 skills, 0 failures`; tests `205/205 pass`.
- `npm run eval` (dry) → 16 probes, including `routing-web-game`.
- Link check → all routed `references/...` paths exist (placeholder excluded).
- Vendor scan → 47 files, Markdown/JSON + Apache LICENSE/NOTICE; no scripts,
  hooks, symlinks, or executable bits.
- Independent code review + security review completed; findings fixed above.
- Global install completed: 40 skills / 8 agents / 8 commands; source and
  installed tree identical; checksum verify passed.

## Progress

- [x] Recon + gap confirmation
- [x] Research (5 sub-questions)
- [x] Capability design + references
- [x] Implementation
- [x] Verification + review
- [x] Global install + report
