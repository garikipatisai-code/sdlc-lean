# Plan — Research Protocol Implementation (SDLC-Lean)

**Goal:** implement the approved design (`docs/plans/2026-10-11-empirical-research-enhancement.md`) with the 8 review corrections, as a zero-dependency, backward-compatible addition: one `research-protocol` skill, three skill edits, one stdlib-only module + CLI, one installer source, hermetic tests.

**Spec:** approved design + corrections (below). **Status:** executing (approval granted 2026-10-11).

## Review corrections → task mapping

| Correction | Task |
|---|---|
| 1. Real paired-question clustering test (not seed-recording) | T5 |
| 2. Shared device-scoped locks; competing child processes | T4 |
| 3. Post-final-test amendments vs scoring-corrections | T3 |
| 4. Cache binding to data + model artifacts + scorer + eval settings | T2 |
| 5. Remove HMAC; stream SHA-256 | T2, T3 (no HMAC anywhere) |
| 6. Explicit research routing + global/local executable discovery | T6, T7 |
| 7. Repair progress ledger; archive upstream evidence | T1 |
| 8. Line counts are hints, not contracts | all |

## Architecture

```mermaid
flowchart LR
    A[scripts/research/protocol.mjs<br/>stdlib-only module + CLI] --> B[tests/scripts/research/test-*.mjs<br/>node --test, hermetic]
    C[research-protocol SKILL.md<br/>new] --> A
    D[using-sdlc-lean +research route] --> C
    E[autonomous-loop +research-mode section] --> C
    F[acquiring-capabilities +audit workflow] -.standalone.-> C
    G[install-global.mjs +scripts/research source] --> A
    H[discover(): env > project-local > global > bundled-self] --> A
```

- **Module contract** (`scripts/research/protocol.mjs`, ESM, stdlib only — `node:crypto`, `node:fs`, `node:path`, `node:child_process`):
  - `hashFile(p)` → sha256 hex, **streamed** (`fs.createReadStream`), stable for large files
  - `hashObject(o)` → sha256 hex, stable-JSON (sorted keys)
  - `digestArtifactSet({dataset[], model[], scorer[]})` → `{dataset, model, scorer}` digests
  - `bindScore(entry, digests, protocolHash)` / `cacheHit(entry, digests, protocolHash)` → boolean; binding covers dataset, model artifact, scorer, protocol (eval settings live in the frozen protocol)
  - `createProtocol(fields)` / `verifyProtocol(p)` → protocol hash over frozen fields incl. `seeds`
  - `classifyOutcome({cancelled, errors, resultKind})` → `{status: completed|errored|cancelled, outcome: positive|null|negative|inconclusive}` — null/negative ⇒ `completed`
  - `createRunLog(protocol)` / `recordAmendment(log, kind, detail, approver)` / `assertAmendmentAllowed(log, kind)` — kinds: `repair` (always allowed), `correction` (allowed post-results; flags dependent claims for re-check), `protocol` (blocked while final results exist)
  - `acquireDeviceLock(lockRoot, device)` / `releaseDeviceLock(h)` / `isLockStale(lockFile)` — O_EXCL lockfile per device scope (`gpu:0`, `cpu`), PID + timestamp, dead-PID reclaim; default lockRoot = `$XDG_CACHE_HOME|~/.cache/sdlc-lean/locks`, overridable
  - `clusterQuestions(questions, {seed, k})` → deterministic assignments from frozen seed only (canonical tie-breaking), paired-question benchmarkable
  - `resolveProtocolModule({cwd, env})` → path precedence: `SDLC_RESEARCH_PROTOCOL` env → `<cwd>/.opencode/scripts/research/protocol.mjs` → global `~/.config/opencode/scripts/research/protocol.mjs` (XDG honored) → repo-bundled self `scripts/research/protocol.mjs`
  - CLI subcommands: `hash <file>`, `lock <device> [--lock-root dir]`, `unlock <device>`, `cluster <questions.json> [--seed n] [--k n]`, `status <run-dir>`
- **No HMAC, no pickle, no new dependency, no plugin change.**

## Task table

| # | Task | Files | Test | Expected | Verify |
|---|---|---|---|---|---|
| 1 | Repair progress ledger; archive upstream evidence | `docs/plans/empirical-research-enhancement-progress.md`, `docs/research/upstream-audits/*.md` (6 files) | n/a (docs) | Ledger reflects implementation stage + corrections; audit archives carry pinned commits, registries, licenses | read |
| 2 | Digests + streaming sha256 + cache binding | `scripts/research/protocol.mjs`, `tests/scripts/research/test-digest.mjs` | RED: binding rejects mismatched scorer/settings; streaming equals readFileSync for a 2MB temp file | Cache hit iff dataset+model+scorer+protocol digests all match; scorer-settings change → miss | `node --test tests/scripts/research/` |
| 3 | Protocol lock + outcome taxonomy + run log + amendment gate | `protocol.mjs`, `test-protocol.mjs`, `test-outcome.mjs`, `test-amendments.mjs` | Seed mutation → hash mismatch; null result → `completed+null`; post-results `protocol` amendment rejected, `correction` accepted + claims flagged | All behaviors per contract | same |
| 4 | Device-scoped lock + child-process competition + staleness | `protocol.mjs`, `test-lock.mjs` | Two forked child processes race for `gpu:0`: exactly one holds, other exits blocked (distinct exit code); after release a third acquires; dead-PID lock reclaimed | Same | same |
| 5 | Paired-question clustering + frozen seed | `scripts/research/cluster.mjs` (or protocol.mjs), `test-clustering.mjs` | Real clustering on a small paired-question set: pairs co-clustered; assignments identical across two runs with different ambient RNG; seed recorded in run log | Same | same |
| 6 | Skill additions/edits: `research-protocol` (new), research route in `using-sdlc-lean`, research-mode section in `autonomous-loop`, audit workflow in `acquiring-capabilities` | `.opencode/skills/research-protocol/SKILL.md`, 3 SKILL.md edits | lint only | All additive; default-mode text untouched; lint passes | `npm run lint` |
| 7 | Installer source + discovery | `scripts/install-global.mjs`, `tests/scripts/test-install-global.mjs` (+ discovery tests in `test-digest.mjs` or `test-discover.mjs`) | Installer test: `scripts/research` appears under target, manifest tracks, prune works; discovery precedence test | Same | `npm run test` |
| 8 | Critic pass: code + security + research-validity reviews, fix findings | — | — | Findings addressed with evidence | `npm run verify` |

## Constraints

- **Global:** AGENTS.md conventions — skills minimal, `name`==dir, lint gate; plugin untouched (stays V1+V2 compatible); safety guards unchanged; human-facing output per `communicating-concisely`.
- **Lean:** rung 2 for skill edits (instruction adaptation); rungs 3–5 for the module (stdlib); no new abstraction beyond the contract; no server/db/daemon.
- **Hard limits:** no runtime deps, no global install run, no remote writes, no GPU workloads, no live research runs, no sudo.

## Review focus

- Cache binding completeness (all four identity inputs), no HMAC leftovers, streamed hashing actually streams.
- Lock races: O_EXCL exclusivity, staleness reclaim safety, release-only-by-holder.
- Amendment ordering: post-final-test `protocol` blocked, `correction` never mutates frozen fields.
- Clustering determinism given frozen seed; no ambient-RNG dependence.
- Installer: manifest prune safety for the new source; backward compatibility.
- Skills: additive-only edits; `research-protocol` passes the 1024-char trigger rule.

## Self-review

Every approved design mechanism + correction maps to ≥1 task; contract frozen before skill tasks; sequential stream for `protocol.mjs` tasks; independent reviewer stream after implementation.
