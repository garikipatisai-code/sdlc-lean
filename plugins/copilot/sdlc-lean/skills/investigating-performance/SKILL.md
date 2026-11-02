---
name: investigating-performance
description: Use when facing a performance problem or optimization request. Measurement names the bottleneck before any code changes
---

# Investigating Performance

**Refusal: an optimization without a measurement that names the bottleneck.**
No speculative speedups, no "should be faster" refactors.

1. **Characterize**: what is slow, under what load, measured how (profiler, benchmark, trace — command + numbers).
2. **Bottleneck**: one named hotspot with its share of cost. Tail-latency suspects: N+1 queries, unbounded pages, serial awaits, missing indexes, sync I/O on hot paths.
3. **Change minimally**: smallest fix addressing the hotspot. Predict the gain in advance.
4. **Confirm**: re-measure with the same method. Report before/after numbers or revert.
