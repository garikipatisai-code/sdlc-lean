# Attribution — reverse-engineering

- Engine: `morluto/rea` (REA), npm package `rea-agents` — MIT (repo root).
  Docs distilled at main commit `2a61deafc632079d10c572bc09e99233826516a3`
  (2026-10-13); the engine verified live in-session is release 6.4.0, whose
  170-tool catalog covers a subset — routes needing a newer build are listed
  in `target-routing.md`. Fetched 2026-10-13.
- Use: **not vendored**. Distilled from REA's docs and its shipped
  `reverse-engineer-anything` skill (main metadata version "41"; 6.4.0 ships an
  earlier skill revision). The connected server's schema is the contract;
  re-verify after REA updates.
  Upstream docs: <https://github.com/morluto/rea/tree/main/docs>.
- Adapted design patterns (models, not upstream code): independent
  verification pass from Binary Ninja Sidekick (commercial);
  small-tool/context-rot discipline from ReVa (Apache-2.0); read/write tool
  annotation from GhidrAssistMCP (MIT); readonly/sandbox modes from r2mcp
  (MIT); closed-loop emulate→analyze→patch archetype from Trail of Bits
  Buttercup (AGPL-3.0 — archetype only, no code).
- Validation-method sources: dx-ball (`N0zoM1z0/dx-ball`) counts from
  `PROGRESS.md` @ `76ac55e`; oracle pattern from `ORACLES.md`/`BUILD_MATCHING.md`
  @ `a55dca27`; DecompileBench (`arXiv:2505.11340`); Decompile-Diverge
  (`arXiv:2609.05370`); ReSym (CCS'24,
  <https://www.cs.purdue.edu/homes/lintan/publications/resym-ccs24.pdf>);
  GENNM (NDSS'25,
  <https://www.ndss-symposium.org/wp-content/uploads/2025-276-paper.pdf>);
  EnIGMA (`arXiv:2409.16165`).
- Tool citations carry URL + license inline in `toolchain-matrix.md`; verify a
  tool's repository before installing.

Live `main` only to check for updates; routing and gates run against the pinned
commit above. Re-pin deliberately, then re-run the trigger pressure test.
