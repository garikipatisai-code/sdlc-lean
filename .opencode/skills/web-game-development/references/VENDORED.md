# Vendored game-development references

Source: [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
Commit: `184b72be02884f782a0058f2eeae2ce4277453e4` (2026-10-24)
License: Apache-2.0 (see `LICENSE-APACHE-2.0` and `NOTICE` in this directory)

Copied from `skills/` into `vendor/` for on-demand reference, with two
documented modifications (below); all other files are byte-identical:

- `web-engines/`: `phaser-core`, `phaser-arcade-physics`, `pixijs-rendering`,
  `threejs-scene-setup`, `threejs-materials-lighting`, `threejs-gltf-loading`
- `disciplines/`: `game-feel`, `performance-optimization`, `level-design`,
  `save-systems`, `shader-programming`, `audio-design`, `input-systems`,
  `physics-tuning`, `game-ui-ux`, `camera-systems`, `procedural-gen`,
  `create-game-assets`
- `workflows/`: `itch-publish`, `prototype-fast`

Omitted deliberately (trust surface / relevance):

- Upstream `router/` — this skill is the web-first router.
- Engine packs for Godot, Unity, Unreal, Roblox, Defold, LÖVE, pygame, Bevy,
  Ebitengine — outside the web-game scope.
- Genre templates — useful, but engine-specific examples would need translation;
  design guidance lives in `game-design-playtest.md`.
- Python helper scripts in `create-game-assets` (they generate raster QA output
  and preview images, so they do more than read; this suite does not vendor
  executable helpers). Use the art-direction/raster/3D references directly.
- Claude plugin metadata and marketplace files.

Notes:

- The vendored files are engine-neutral or web-engine references. Discipline
  examples use Godot/Unity APIs to explain concepts; translate them to the
  target web engine (Phaser/Pixi/three/Babylon).
- Some "Related skills" links point to upstream skills not vendored here. Treat
  them as further reading; they are not required dependencies.
## Documented modifications

- `vendor/itch-publish/references/butler-ci.md` — credential guidance no longer
  reads `butler_creds` into an agent/shell session; CI install now requires a
  SHA-256 pin, temp-dir extraction, a step-scoped `BUTLER_API_KEY`, and no
  `butler upgrade` in CI; a `--dereference` exfiltration warning was added.
- `vendor/create-game-assets/SKILL.md` — replaced the raster-QA helper-script
  commands and `pip install` step with a "not vendored in this suite" warning and
  project-tooling checklist.

## Precedence and refresh

`vendor/SHA256SUMS` pins every vendored file; verify with
`cd references/vendor && sha256sum -c SHA256SUMS`. The suite test also checks it.

Suite-native references (`engine-matrix`, `web-architecture-performance`,
`web-netcode`, `web-shipping`, `game-design-playtest`) are authoritative for
this suite. Vendored files are drill-down detail; if they conflict, follow the
suite-native file and record the upstream drift for the next refresh.

To refresh: re-audit upstream at a new commit (license, hooks, scripts), copy the
same 20 directories, re-apply the two documented modifications, regenerate
`vendor/SHA256SUMS`, update the commit here and in
`acquiring-capabilities/references/trusted-sources.md`, then run `npm run verify`.

Except for the two documented modifications, no upstream text was modified. The
suite's MIT license does not cover the vendored files; Apache-2.0 governs them.

Upstream NOTICE:

> awesome-gamedev-agent-skills
> Copyright 2026 Abhishek Barali and the awesome-gamedev-agent-skills contributors
>
> This product is licensed under the Apache License, Version 2.0 (see LICENSE).
>
> All skills in this repository are original works. They were authored from
> primary documentation (engine and framework docs, language references, and
> platform specifications). Third-party sources and other skill collections were
> studied for general patterns only; no text or code was copied from them.
>
> Game engine, framework, and platform names referenced in this repository are
> trademarks of their respective owners and are used for identification and
> descriptive purposes only. Their use does not imply any affiliation with or
> endorsement by those owners.
