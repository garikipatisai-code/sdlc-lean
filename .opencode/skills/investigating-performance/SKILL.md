---
name: investigating-performance
description: Use when facing a performance problem or optimization request. Measurement names the bottleneck before any code changes
---

# Investigating Performance

**Refusal: an optimization without a measurement that names the bottleneck.**
No speculative speedups, no "should be faster" refactors.

Measure first, then infer. Read `references/method.md` before choosing a
profiler — it carries the full method, budget tables, flamegraph guide, and
the `scripts/perf-gate.mjs` wiring.

1. **Characterize the workload**: what is slow, under what load, and under
   which budget (p50/p95/p99 plus a named budget; web interaction gates at
   p75 INP near the ~200 ms good band — see `references/method.md`).
   Pin dataset size, seed,
   RPS/fps, and build mode — if any of those is missing, the number is not yet
   a measurement.
2. **Probe for the hotspot**: capture one profiler or trace that names a
   single dominant cost with its share (see flamegraph guide in
   `references/method.md`). Tail-latency suspects first: N+1 queries,
   unbounded pages, serial awaits, missing indexes, sync I/O on hot paths.
3. **Predict, then change minimally**: state the expected gain in the same
   units as the budget before touching code. Smallest fix aimed at the
   hotspot; no adjacent refactor.
4. **Confirm with the same probe**: re-measure identical workload. Report
   before/after p50/p95/p99 and gate result, or revert.

Gate rule: wire a frame or latency budget to `scripts/perf-gate.mjs` when a
real log exists (exact flags and fail-closed behavior in
`references/method.md`). A missing log that seeds a starter sample is not a
pass — rerun against measured data.
