# Systematic debugging method (reference)

Paraphrased guidance. Non-sensitive. Attribution: 8D problem-solving (containment,
root cause, corrective action, prevent recurrence), SRE incident response
(containment/mitigation, clear ownership, escalation, verification after
change), and systematic-debugging practice including superpowers-style
fail-before-fix proof. Do not copy source text; apply the ideas.

## Containment and escalation (8D/SRE posture)

Containment reduces harm while root cause is unknown. It is reversible and owned.

| Situation | Containment examples | Exit condition |
|---|---|---|
| Production regression | feature flag off, rollback, traffic shed, rate limit, circuit break | repro fixed + verified in target env |
| Data risk | pause writer, quarantine path, read-only mode | data path proven safe |
| Local/dev only | isolate test, pin seed/input, disable flaky path temporarily | root cause fixed; temporary pin removed or justified |

Rules:
- Record: symptom, containment action, owner, blast radius, removal condition.
- Do not "contain" by weakening assertions or hiding failures.
- Escalate early when impact, uncertainty, or authority boundary exceeds scope.
- Two-strike escalation stays: two failed fix attempts → re-trace + restate
  hypothesis; third identical diagnosis → `diagnosing-sdlc` and escalate.

## Bisect and diff narrowing

Use history when "it used to work" or the cause is not local:

```bash
git bisect start
git bisect bad HEAD
git bisect good <known-good>
# run the smallest repro script/test at each step
git bisect run <repro-command>
```

Constraints:
- Repro command must be deterministic enough for bisect; if flaky, stabilize first
  (pin seed, isolate, reduce concurrency) or use repeated-run evidence.
- After bisect, inspect the culprit diff and re-run fail-before-fix proof on the
  actual root cause, not just the blamed commit.
- For non-git or generated artifacts, compare minimal before/after inputs,
  configs, versions, and environment diffs.

## Failure taxonomies

Classify first; the wrong playbook wastes cycles.

### Deterministic

- Same input/environment fails the same way.
- Playbook: smallest repro, trace callers/data flow, one-sentence hypothesis,
  minimal fix, fail-before-fix proof.

### Flaky

- Pass/fail varies across runs with no intentional change.
- Suspects: shared state, order dependence, time, randomness, external services,
  resource exhaustion, filesystem/network timing.
- Playbook: run repeatedly (`N` runs) to measure rate; fix isolation (reset
  globals, unique temp paths, fixed clock/seed where appropriate); quarantine
  only with owner + expiry, never as silent ignore.

### Race/timing

- Depends on scheduling, concurrency, async ordering, or deadlines.
- Suspects: missing await, unsynchronized shared mutable state, callback order,
  lock inversion, test polling with tight deadlines.
- Playbook: make ordering explicit; add synchronization or deterministic waits on
  observable state (not arbitrary sleeps as a primary fix); stress with
  controlled concurrency; prove with repeated runs and, when available,
  race-aware tooling.

### Performance regression

- Correctness holds but latency/throughput/resource use degrades.
- Suspects: algorithmic change, N+1/query growth, allocation churn, lock
  contention, cache miss, payload growth, cold-start path.
- Playbook: capture baseline and workload, measure before/after with the same
  probe, localize hotspot, change one variable, verify budget/percentile impact.
  Hand off to `investigating-performance` for deep profiling/budgets.

## Fail-before-fix proof (required)

1. Reproduce failure with a stable command/test; record reason.
2. Implement minimal fix.
3. Temporarily revert production change (not the repro test); rerun repro and
   confirm it fails for the same reason.
4. Reapply fix; confirm repro passes.
5. Run the relevant/full suite as scope requires.

Record: repro command, fail reason, revert-fail evidence, reapply-pass evidence,
suite result. Keep the repro test. If the failure is not locally reproducible,
record the strongest available evidence (logs, trace, bisect result, canary) and
mark residual uncertainty explicitly.

**Secret-safe repro:** pass secrets via env vars only (never inline in commands,
code, or logs). Redact inline credentials/tokens before writing ledger entries or
evidence rows. Treat all recorded rows as public/shareable artifacts.

## Handoff

- Repeated failed diagnosis / scope confusion: `diagnosing-sdlc`.
- Production incident completed: `incident-postmortem`.
- Performance hotspot/budget work: `investigating-performance`.
- Security boundary involved: `reviewing-security` / `threat-model` as applicable.
