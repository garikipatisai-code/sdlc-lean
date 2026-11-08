# Attribution — vendored open-design refs (refs-only at Task 1)

- Upstream: `nexu-io/open-design` (`https://github.com/nexu-io/open-design`)
- Pinned commit: `87a4f91c308170a8270458fc40fc66a86ed69aac` (main, 2026-11-06). Fetched 2026-11-08.
- License: Apache-2.0 (verified via upstream `LICENSE` — Apache License Version 2.0, January 2004; copyright 2026 Open Design contributors). This adapter retains all upstream copyright/attribution notices per Apache-2.0 §4c; changes are marked here.
- Vendored (refs-only upstream copies, pinned SHA above): `token-schema.ts`, `check-tokens-fixture-sync.ts` (fixture-sync), `extract-components-manifest.ts` (extractor), `contracts/components-manifest.ts` (contracts dep, byte-identical upstream; extractor import adapted in exactly one line: `../packages/contracts/src/design-systems/components-manifest.ts` → `./contracts/components-manifest.ts`), `contracts/components-manifest.contract.json` (derived contract: `derived: true`, `derivedDate: 2026-11-08`; no upstream JSON at pinned SHA; covers all 10 `ComponentsManifest` top-level fields). All listed under `SHA256SUMS` (every line must recompute via `sha256sum -c`).
- Do not remove this file (Apache-2.0 §4c).
