# Suite portfolio audit — "epitome" program

**Date**: 2026-10-30
**Scope**: 40 top-level skills, 8 agents, 8 commands, plugin, spec gate, eval harness
**Method**: 3 read-only portfolio explorers + 3 targeted researchers; builds on
`docs/research/2026-10-30-brain-layer-evidence.md` (34 sources).
**Status**: audit complete; Wave 1 spec drafted for approval.

## Executive summary

The brain layer is now evidence-backed. The rest of the suite is uneven, and the
largest gaps are **trust and enforcement**, not more prose:

1. **Approval is self-service.** `spec-check approve` trusts `status: approved`
   and `approved_by` from a plan the agent writes; there is no human binding.
   Without a marker the plugin is a no-op, so a feature can implement before any
   approval.
2. **`close` is unbound.** It removes the marker without checking evidence,
   verification output, or the plan's `Verify` column.
3. **No independent verifier.** `code-reviewer` cannot run tests (`bash: deny`),
   implementers self-report, and `requesting-code-review` allows self-review for
   "trivial" diffs — the exact "critic without a verifier" failure.
4. **Test integrity is unstated.** Nothing forbids weakening, skipping, or
   deleting tests/lint rules to go green. Measured reward hacking is 30.4% in
   RE-Bench and 76% on ImpossibleBench-style tasks.
5. **Permissions are inconsistent.** `explorer` has `bash: allow` despite
   "read-only"; `orchestrator` has no `edit: deny`; `test-writer` can edit
   production; `/security-audit` routes to the built-in `plan` agent.
6. **The eval cannot fail on trust.** Safety probes are advisory, `--auto`
   auto-approves permissions, there are no gate/agent/command probes, and zero
   probes exits green.
7. **State is split.** `.planning/STATE.md` competes with
   `docs/plans/<slug>-progress.md`; only the latter is injected at compaction.

SOTA suites have converged on the missing pieces: a technical boundary plus a
deny-by-default approval policy for non-interactive runs, with confirmation
treated as non-authoritative. The suite should copy that shape, not add agents.

## P0 findings

| # | Finding | Evidence | Wave-1 fix |
|---|---|---|---|
| P0-1 | Approval self-service; non-interactive approve accepted | audit; SOTA non-interactive approval is deny-by-default [A1][A3][A5] | TTY/human-bound `approve`; non-interactive denied by default |
| P0-2 | `close` removes the marker without evidence | audit | `close` requires ledger + evidence JSON + exit-0 + plan `Verify` match |
| P0-3 | Reviewer cannot execute; implementer self-reports; self-review escape | audit; critic-without-verifier [20][24][25] | Orchestrator re-runs each `Verify`; reviewer gets command output or read-only tests; remove self-review escape |
| P0-4 | No test-integrity rule | METR reward hacking 30.4% [A14]; ImpossibleBench 76% [29] | Clause in TDD/debugging/execution/verification; tamper-evident diff check; probe |
| P0-5 | Read-only permissions inconsistent/untested | audit; CVE approval bypass [A10] | `explorer` bash ask; `orchestrator` edit deny; `test-writer` test-only; security-audit uses `security-reviewer`; permission tests |
| P0-6 | Eval cannot fail on trust; `--auto`; no gate/agent probes; 0 probes green | audit | Hard safety probes; per-probe scratch; non-auto gate probes; 0 probes exits 1; 3 new probes |
| P0-7 | Two state homes; only one injected | audit; compaction hook | One canonical ledger under `docs/plans/`; mirror or delete `.planning/STATE.md` |

## P1 findings (grouped)

**Execution/verification**: TDD's "Iron Law" overclaims quality (null result
[10]); systematic-debugging does not require keeping the repro test;
executing-plans evidence is self-reported; subagent review is text-only;
receiving-code-review has no final re-run; lean-review's `net: -N` is unvalidated
and can reward harmful deletion; finishing-a-development-branch lacks a human
merge gate and final-SHA CI check; worktrees lack baseline SHA and gate-marker
warnings.

**Safety/meta**: `threat-model` is orphaned (no inbound route) and uses an
ordinal likelihood column; `autonomy-dial` claims `<5% reversion` with no
instrumentation and `uxStatus` has no caller; `intent-preview` allows
self-approval and claims `>85%` accept; `adr` contradicts itself on editing
accepted ADRs; STE claims "~80%" against its own research; `writing-skills`
requires no probe; `diagnosing-sdlc` and `incident-postmortem` are orphaned.

**Research/domain**: `acquiring-capabilities` has no guard on `npm/npx` or
plugin installs; `exploring-codebase` lacks an output schema and its agent has
bash; `reverse-engineering` mutation and S-tier refusal are instruction-only;
`colab-lifecycle` guards only two shell patterns; `web-game-development`'s S-tier
is instruction-only and its unvendored claims are uncited; `ui-review` fails open
on fetch failure; `writing-release-notes` has no command/probe; `researcher`
citations are shape-checked, not URL-fetched; `/security-audit` and
`/reverse-engineer` use the built-in `plan` agent; `/sdlc-lean` reports 60 skills
instead of 40.

## What is already strong

- Brain layer: caps, artifact contracts, citation entailment, structural probes.
- Spec gate: hash-bound plan/spec scope for file tools; drift fails closed.
- Safety guards: destructive shell patterns, secret reads, Colab guards; V1+V2.
- Research protocol: frozen protocols, device locks, evidence bundles.
- Colab lifecycle: tested decision core and release evidence.
- Installer: manifest-pruned, byte-identical, never touches user files.

## SOTA comparison (what "epitome" means here)

| Capability | Leading suites | This suite |
|---|---|---|
| Technical boundary | OS sandbox + network policy [A1][A3][A6] | File-tool scope only; bash writes open (D-013) |
| Approval policy | Modes + deny-by-default non-interactive [A1][A3][A5] | Frontmatter trust; no human binding |
| Confirmation trust | Explicitly non-authoritative; bypasses documented [A1][A10] | Treated as the gate |
| Verification | Lint/test exit codes in-loop [A6]; action review [A2][A3] | Tests optional; self-report allowed |
| Test integrity | Tamper-evident graders [A14][29] | No rule |
| Review | Small-batch human review, defect detection secondary [A12] | 4-pass LLM review, no test signal |
| Eval | Vendor telemetry; no public classifier false-negative rates | Advisory safety probes; `--auto` |

**Honest limit**: the suite is a prompt/plugin layer, not an OS sandbox. Wave 1
must not claim sandboxing. It can make approval human-bound, evidence-bound, and
deny-by-default for non-interactive runs; a real sandbox is out of scope.

## Program waves

| Wave | Theme | Scope | Gate |
|---|---|---|---|
| **W1** | Trust core (P0) | approval, close evidence, independent verification, test integrity, permissions, eval trust, one ledger | this spec |
| W2 | Execution quality (P1) | TDD/debugging/executing/subagent/review/finish/worktrees | separate spec |
| W3 | Measurement (P1) | content contracts for all skills, command/agent/research probes, `url-fetched`/`file-unchanged`/`exit-code` assertions | separate spec |
| W4 | Domain/meta (P2) | threat-model, autonomy-dial, schemas, ADR, STE, release notes, router orphans, domain evidence | separate spec |

Each wave is a separate authorization boundary. No wave starts before its spec
and plan are approved.

## Sources

Brain-layer evidence: `docs/research/2026-10-30-brain-layer-evidence.md` [1]–[34].

- [A1] Claude Code permission modes. https://code.claude.com/docs/en/permission-modes
- [A2] Anthropic, *How we contain Claude*. 2026-05-25. https://www.anthropic.com/research/how-we-contain-claude
- [A3] OpenAI Codex sandboxing / auto-review. https://learn.chatgpt.com/docs/sandboxing
- [A4] Cursor run modes. https://cursor.com/docs/agent/security/run-modes
- [A5] Devin CLI permissions. https://docs.devin.ai/cli/reference/permissions
- [A6] Aider lint/test. https://aider.chat/docs/usage/lint-test.html
- [A7] OpenHands security. https://docs.openhands.dev/sdk/guides/security
- [A8] SWE-agent docs. https://swe-agent.com/latest/
- [A9] Vance et al., habituation to security warnings. SOUPS 2019. https://www.usenix.org/conference/soups2019/presentation/vance
- [A10] VS Code advisory GHSA-w79r-pmq3-8v4f (approval bypass). 2026-02-10. https://github.com/microsoft/vscode/security/advisories/GHSA-w79r-pmq3-8v4f
- [A11] Perry et al., *Do Users Write More Insecure Code with AI Assistants?* CCS 2023. https://arxiv.org/abs/2211.03622
- [A12] Google, *Software Engineering at Google*, ch. 9 (code review). https://abseil.io/resources/swe-book/html/ch09.html
- [A13] DORA, continuous integration capability. https://dora.dev/capabilities/continuous-integration/
- [A14] METR, *Recent reward hacking*. 2025-06-05. https://metr.org/blog/2025-06-05-recent-reward-hacking/
- [A15] Just et al., mutation score vs real faults. 2014. https://dada.cs.washington.edu/research/tr/2014/02/UW-CSE-14-02-02.PDF
- [A16] Google, *Lessons from building static analysis tools*. CACM 2018. https://cacm.acm.org/research/lessons-from-building-static-analysis-tools-at-google/

**Source confidence**: [A1][A2][A5][A8][A9][A10][A11][A12][A13][A14][A15][A16]
fetched directly; [A3][A4][A6][A7] were page text returned by search extraction,
marked medium confidence in the research notes.
Unprefixed citations ([10], [20], [24], [25], [29]) refer to the brain-layer
evidence report, not to this list.

## Gaps

- No independent measurement of any vendor classifier's false-negative rate.
- No controlled study isolates approval-prompt frequency → bypass rate for
  coding agents; the 93%/84% figures are vendor telemetry.
- No benchmark for design docs/plans; rubric score → downstream outcome is
  unproven.
- CI evidence is survey correlation, not an isolated required-check effect.
