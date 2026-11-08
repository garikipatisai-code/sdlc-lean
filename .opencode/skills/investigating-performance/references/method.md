# Measurement method for investigating performance

Detail for `investigating-performance`. The body defers here so the trigger
stays routable. Read the sections matching the task before probing.

## 0. Provenance (paraphrased, not quoted)

- **Brendan Gregg, systems performance and flame graphs** — in his books
  and talks Gregg popularizes workflow where profiling (especially stack
  sampling) comes before reasoning, flame graphs expose where time actually
  accumulates, and a utilization/saturation/errors view structures the hunt.
  The tables and habits below restate those ideas in original wording.
- **Google Site Reliability Engineering (SRE) practice** — in the SRE
  books SRE work defines measurable service-level indicators and objectives,
  describes the offered workload explicitly, and treats budgets as agreements
  about how much degradation is tolerable. Restated here as workload-first
  probing with percentile budgets.
- **Web-vitals interaction latency (INP)** — in web-vitals and Chrome
  guidance, interaction responsiveness is judged at the field percentile
  (commonly the 75th) with thresholds around 200 ms for the response-to-next-
  paint span. The user-facing thresholds below paraphrase that posture;
  check current web-vitals docs for the live numbers before quoting them.

No verbatim source text is reproduced. Where this file states a number, it
is a target to re-verify against the live spec for the project.

## 1. Define the probe before running it

A probe is reproducible only if a peer can rerun it and land near the same
numbers. Record all of these up front:

- **Workload**: request count or frame count, payload and dataset sizes,
  concurrency or target fps, seed or fixed input, cold vs warm cache. One
  sentence of shape (for example, "GET /search over 10k docs, 20 rps,
  release build") beats a prose paragraph.
- **Build under test**: commit or version, release vs dev, flags that change
  cost (minify, source maps, strict-mode double render). Profile production-
  like builds; dev servers inflate numbers.
- **Environment**: machine class, OS, single-run host noise. Note when the
  host was shared or throttled.
- **Budget**: the percentile plus limit the probe must meet (for example,
  p95 frame time at or under 16.7 ms, or p75 INP at or under 200 ms). Without
  a budget there is no pass or fail, only an observation.

Workload secrecy is not a reason to skip this: use a synthetic workload
shaped like production when real data is unavailable, and say so.

Data handling: use synthetic, non-secret workloads by default. Scrub URLs,
tokens, and PII from captured logs/traces before saving them. Never commit
raw production dumps — keep them local, restrict access, and limit retention.

## 2. Pick a profiler, then sample

Match the tool to the question:

| Question | Probe family | Typical tools |
|---|---|---|
| Where does CPU time go? | Sampling profiler, CPU profile | Node `--cpu-prof`, Go `pprof`, Python `py-spy`/`cProfile`, perf flamegraph |
| Where does wall time go (I/O, locks)? | Trace, event log, wait graph | Chrome trace, Lighthouse, DTrace/eBPF tracing, APM spans |
| How does the user experience it? | Field vitals, lab trace | web-vitals, Performance API marks, frame-log telemetry |
| Is this a gate or a one-off? | Percentile gate over a log | `scripts/perf-gate.mjs` (frame logs) or equivalent CI check |

Sampling beats instrumentation for discovery because it changes behavior
less. For a quick CPU profile in Node, the built-in profiler emits a V8
profile; in Go, `pprof` captures CPU or heap; on Linux, `perf` with a
flamegraph renderer visualizes stacks. Whichever is used, run it on the
same workload twice before believing a shape: two runs that disagree are a
warning that the workload or host is unstable.

Do not tune while the profiler is still running a different shape. If the
probe used a tiny dataset, a result for large data is an extrapolation, not
a measurement.

### Shell safety

- Treat workload, log, and profiler arguments as untrusted input — never
  interpolate them into shell strings.
- Pass arguments as arrays (exec argv) with proper quoting/escaping; avoid
  `sh -c` with string-built commands.
- Reject shell metacharacters (`; & | $ \`` `\\n` and friends) in paths and
  flags; validate that every path resolves where you expect before use.

## 3. Report percentiles, not averages

Latency and frame time are skewed: a fast average can hide a damaging tail.
Report at least p50, p95, and p99 with the sample count, and name the method
for computing them.

- **p50 (median)**: typical experience. Useful for regression deltas.
- **p95**: the tail most users feel and most budgets bind. This is the
  default gate percentile.
- **p99**: rare but real events (jank, cold paths, retry storms). Keep it
  visible even when the budget binds at p95.

Nearest-rank is the simplest contract (sort the samples, take the item at
the ceiling of percentile times count) and is what the bundled gate uses.
Whatever method is chosen, state it next to the numbers so a reader can
recompute the percentile from the log. A percentile without `n` is not
auditable: small samples move wildly between runs.

## 4. Read a flame graph

A flame graph is a stack view where the horizontal span encodes how often a
path appears in samples. Width is cost; height is call depth. To read one:

1. **Start from the widest frame.** The broadest tower at the bottom is the
   cost center. Narrow towers are noise for a bottleneck hunt.
2. **Follow the broadest branch upward.** Cost chains from a broad ancestor
   through its widest child. A thin child under a broad parent is not the
   lever.
3. **Distinguish self time from child time.** Total width includes callees;
   a frame that is wide mostly because of its children points at the child,
   not the frame itself.
4. **Use differential builds when available.** Two profiles side by side
   (colored by growth) show what a change actually moved versus ambient
   variation. Without differential data, rerun the same workload after a
   hypothesized fix and compare widths.
5. **Sanity-check against the budget.** If the widest tower is a small share
   of the budget, the probe measured the wrong workload. Return to section 1
   rather than optimizing a negligible cost.

Noise discipline: fold samples from test setup, timers, or unrelated
threads out of the picture. If a frame appears due to profiler overhead
itself, note it and move on — overhead rarely dominates a real hotspot.

## 5. Budgets: what to aim at

Use the budget that matches the surface. When in doubt, bind the gate at the
tail (p95 or p75 in the field) and keep the median for diagnosis.

### Backend and service latency

- State an SLO in percentile terms (for example, p95 at or under a latency
  that the product promises) rather than a mean.
- Keep an error or lateness budget: how often the target may be missed before
  it becomes a defect rather than noise.
- Pair latency with throughput when concurrency matters: a budget met only
  at one request per second does not protect the queued case.

### Web interaction and rendering

- **INP (Interaction to Next Paint)**: judge at the 75th percentile over
  field data. Around 200 ms or under is the commonly cited good band;
  above roughly 500 ms is the poor band. Paraphrase of current web-vitals
  posture; verify live thresholds before gating.
- **LCP, CLS** alongside INP: render cost and layout shift move user
  experience even when input is fast. Report all three at the same
  percentile so a fix that helps one and hurts another is visible.
- **Frame budget**: 60 fps implies about 16.7 ms per frame, with roughly 10 ms
  usable after compositor and browser overhead. 120 fps implies about
  8.3 ms. Gate frame logs at p95, not the mean frame time.

### Game or media frame logs

- Gate on p95 frame time against the frame budget (for example, 16.67 ms at
  60 fps). Report p50 and p99 beside it so a median improvement that leaves
  the tail broken is still visible.
- Define the scene that produced the log (entity counts, resolution,
  device class). A gate over a trivial scene proves nothing about the
  heavy scene.

## 6. Wire `scripts/perf-gate.mjs`

The repository ships a small p95 frame-time gate that is intentionally
fail-closed. Invoke it exactly as:

```sh
node scripts/perf-gate.mjs --log games/starter/frame-log.json --budget-ms 16.67
```

Behavior worth knowing before trusting a run:

- It reads a JSON frame log (array of numbers, objects with `ms`, or an
  object with `frames`) and computes p95 by nearest-rank.
- Exit `0` means p95 at or under the budget (pass). Exit `1` means over
  budget (fail). Exit `2` means the gate itself errored (bad args, bad
  path, unparseable log) and the run must not be treated as a pass.
- The `--log` path must stay inside the repo root, relative, without `..`
  segments or symlinks escaping the root. Absolute paths and traversals
  are rejected by design. Log trust: use fixed repo-relative allowlisted
  paths only (for example `games/starter/frame-log.json`) — verify the
  exact containment rules against `scripts/perf-gate.mjs` (`containLogPath`)
  before wiring a new path.
- If the log is missing, the gate creates it with a small deterministic
  starter sample and exits `0` with a "log missing" message. That exit is
  a seeding event, **not verification**: the budget cannot be checked until
  a real telemetry log exists. Rerun against measured data before any
  correctness claim.
- An empty frame list fails closed (exits `1` — no measured data to pass).
  Never hand-edit the log to make the gate green; regenerate it from
  the workload.

Example gate wiring in CI:

```sh
node scripts/perf-gate.mjs --log <telemetry-log> --budget-ms <budget>
```

where `<telemetry-log>` is written by the frame telemetry in the same
workload the probe profiled. Record the gate line verbatim in the report
so the reader can rerun it.

For non-frame surfaces (API latency, bundle size), mirror the same shape:
a log of samples, a stated percentile and budget, and a fail-closed
checker. Do not reuse the frame gate for a different unit.

## 7. Confirm or revert

After the minimal fix:

1. Rerun the identical workload and the same profiler or gate command.
2. Report p50/p95/p99 before and after with `n`, the budget, and the exact
   commands. Quote the gate line, not a summary of it.
3. If the tail did not move, the wrong component was changed: revert and
   return to the flame graph rather than stacking more fixes.
4. If the fix regresses a neighboring percentile or a neighboring budget
   (median better, tail worse), that is a regression: report it and revert
   or re-scope.

## 8. Report checklist

A performance report is complete when it contains:

- workload sentence, build, and environment
- profiler or gate command verbatim
- p50/p95/p99 with `n` and the percentile method
- the named hotspot and its share of cost
- the budget and whether it passed
- before/after numbers or an explicit revert

Anything missing from that list is a measurement gap, not a detail.
