# Web asset pipeline

Use this reference when a project needs a single source of truth for game assets: an art-bible anchor, an asset spec with generation prompts, and an audit that checks naming, formats, and size budgets. Generated output is source material; dimensions, grids, alpha, anchors, and import settings remain deterministic engineering concerns.

## 1. Purpose and scope

- One manifest drives the asset catalog: every shipped asset has a stable ID, a repository path, a format, a size budget, and a source/prompt record.
- The audit (`scripts/asset-audit.mjs`) runs against the manifest and fails the build on naming, format, or budget violations.
- This reference covers 2D and 3D web-game assets (textures, sprites, models, audio, fonts). It does not cover engine runtime code, netcode, or shipping portal mechanics.

## 2. Art-bible anchor — 9 style axes

Define the visual system as 9 observable axes before generating any asset. Avoid mood words ("beautiful", "cinematic") without constraints; do not name a living artist as the style definition.

| # | Axis | What to lock |
|---|------|--------------|
| 1 | Shape | Rounded, angular, chunky, slender, geometric, organic; which shapes signal friendly / dangerous / rare / interactive |
| 2 | Silhouette | What must read at game scale; which parts may never merge into the body mass |
| 3 | Value | How many value bands; is the subject readable in grayscale against common backgrounds |
| 4 | Color | Semantic roles: accent, danger, reward, neutral, environment, UI; carry explicit palette values |
| 5 | Edge | Hard pixel clusters, clean vector edges, ink line, painterly lost edges, soft 3D bevels |
| 6 | Material | How metal, cloth, skin, stone, foliage, glass, and magic differ |
| 7 | Light | Direction, softness, contrast, ambient color, rim light, baked-shading policy |
| 8 | Detail | Where detail is concentrated; what disappears at the native viewing size |
| 9 | Camera | Orthographic/perspective, angle, focal length, horizon, facing and turn conventions |

The approved art-bible (seed + palette + do/don't) is a contract. Later outputs are compared against it at the same size and under the same background/light assumptions.

## 3. Art-bible — visual target and coherence

1. Capture the real game viewport and native resolution.
2. Place a representative character/object, environment patch, effect, and HUD fragment together.
3. Show common and worst-case backgrounds.
4. Add a small palette with semantic roles, not an unlabelled color cloud.
5. Record do/don't examples: acceptable silhouette, forbidden outline drift, allowed texture noise.
6. Approve the target before producing a large catalog.
7. Reuse one approved seed/reference for related variants; keep a stable prompt card with invariant blocks separate from asset-specific blocks.
8. Change one variable per edit pass; broad "make it better" edits increase drift.
9. Reject outputs that are attractive alone but belong to a different visual system.

Evaluate at three distances: thumbnail/native game scale (identity reads immediately), working scale (edges, seams, material cues inspectable), and context (asset sits in a real gameplay capture with lighting, effects, UI, neighbors).

## 4. Asset spec — naming and identity

- **Asset ID**: kebab-case, lowercase alphanumerics joined by single hyphens, e.g. `player-idle`, `env-crate-a`, `ui-button-primary`. Matches `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- **Path**: deterministic, under `content/assets/` or `src/content/assets/`, category folder first, e.g. `content/assets/textures/env-crate-a.ktx2`.
- **Stable ID**: never reuse an ID for a different asset; retire, don't rename.
- **Role**: one-line human description of what the asset is and where it appears.
- **Status**: `planned` \| `generated` \| `reviewed` \| `approved` \| `rejected`.

## 5. Asset spec — formats and size budgets

| Category | Primary formats | Fallback | Size cap |
|----------|----------------|----------|----------|
| Texture (2D/3D albedo, normal) | KTX2 + Basis Universal | PNG / WebP | 20 MB |
| Model | glTF / GLB (+ meshopt) | Draco | 10 MB |
| Audio (SFX, music, ambience) | OGG / MP3 | WAV only for <1 s UI | 5 MB |
| Font | WOFF2 (subsetted) | — | 2 MB |
| Image / UI / sprite | PNG / WebP / SVG | — | 10 MB |
| Other | — | — | 50 MB default |

- Compress transfer (Brotli/gzip), version asset URLs, set long-lived cache headers.
- Transcode KTX2 off the main thread (worker / `createImageBitmap`).
- Quantize glTF attributes; atlas UI/sprites to cut draw calls.
- Size cap is enforced on the shipped file bytes by `scripts/asset-audit.mjs`.

## 6. Asset spec — source records and generation prompts

Every asset records its provenance in the manifest `source` block:

- kind: `generated-or-authored` \| `purchased` \| `commissioned` \| `open` \| `remixed`
- url_or_tool: source URL, vendor order, or tool name/version
- creator, created_at, license, attribution
- prompt_or_source_record: the exact prompt or reference IDs used to generate it

**Prompt card structure** (keep invariant and asset-specific blocks separate):

- Invariant block (never changes across the family): art-bible axes 1–9, palette hex values, canvas size, anchor, padding, facing, light direction, output format.
- Asset-specific block (changes per asset): subject, pose, expression, props, background, framing.
- Generate related items in small batches when shared scale and lighting matter.
- Carry explicit color values or a palette image when color identity matters.

## 7. Prompts — prompt cards

A prompt card is the prompt source of truth for one asset family:

```
# Prompt card — <family>
Invariant:
- style axes: <shape, silhouette, value, color, edge, material, light, detail, camera>
- palette: <semantic roles + hex values>
- canvas: <size>; anchor: <bottom-center|center|...>; padding: <px>
- facing: <...>; light direction: <...>; format: <png|ktx2|...>
Asset:
- subject: <...>; pose: <...>; props: <...>; background: <...>
- framing: <...>; output: <single|strip|sheet>
```

One variable per edit pass. Reject drifted derivatives; return to the approved seed.

## 8. Audit — naming, format, budget rules

Run `scripts/asset-audit.mjs <manifest.json>`. It fails (non-zero exit) when any asset:

- **Naming**: `id` is not kebab-case, or `path` lacks a category folder.
- **Format**: file extension is not in the allowed set for its category (from §5).
- **Budget**: shipped file bytes exceed the category size cap (from §5), or the asset file is missing.
- **Schema**: manifest lacks `schema_version` or `assets`, or an asset lacks `id`/`path`.

The audit reads file bytes from disk relative to the manifest's directory, so size caps are enforced on real shipped files, not declarations.

## 9. Verification checklist and non-goals

- [ ] Art-bible axes 1–9 approved before catalog production.
- [ ] Every asset ID is kebab-case and stable.
- [ ] Every asset format is in the §5 allowed set.
- [ ] Every asset file is at or under its category size cap.
- [ ] Every asset has a source/prompt record.
- [ ] Audit (`scripts/asset-audit.mjs`) exits 0 on the committed manifest.

**Non-goals**: render look (PBR/IBL/post) lives in `babylon-photoreal-rendering.md`; world streaming and eviction in `babylon-world-streaming.md`; traffic and crowds in `babylon-traffic-crowds.md`; budgets in `babylon-photoreal-budgets.md`. No engine switch, no demo scene, no asset binaries.

Related: `references/vendor/create-game-assets/references/art-direction.md`, `references/vendor/create-game-assets/references/raster-pipeline.md`, `references/vendor/create-game-assets/references/provenance.md`, `references/vendor/create-game-assets/assets/asset-manifest.json`.
