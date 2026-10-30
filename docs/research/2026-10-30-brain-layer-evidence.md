# Brain-layer hardening — evidence review

**Date**: 2026-10-30
**Mode**: deep (2 rounds, 8 researcher subagents, 34 sources)
**Question**: Which enhancements to the pre-implementation "brain" layer
(`brainstorming`, `deep-research`, `writing-plans`, `option-selection`, and their
subagents) are supported by measured evidence — and which are folklore?

**Method**: Round 1 ran 5 parallel researchers on independent sub-questions;
round 2 ran 3 gap-filling researchers. Each fetched and read its sources and
returned distilled claim/source/confidence rows. The orchestrator independently
re-fetched the load-bearing sources and checked the cited claims against the
abstract or full text ([1], [7], [11], [18], [24], [25], [26], [29], [8]).
No source is cited from a search snippet. Sources are numbered in `## Sources`.

## Executive summary

1. **Do not add brain agents.** Role-specialized multi-agent systems range from
   +80.8% to −70.0% versus a single agent depending on task shape; sequential
   planning is the worst case, and coordination stops paying once the
   single-agent baseline is high (≈45%) [25]. MAST finds 14 failure modes across
   1,600+ traces in 7 frameworks [24]. Debate bought +2 points for ~6× cost [22].
2. **External verification is the strongest lever.** Reflection without a test
   signal went 0.60 → 0.52; tests plus reflection reached 0.68 [26]. Execution
   feedback gave +8 to +12 points [27]. A lint gate that *rejects* an invalid
   edit and forces a retry gave +3 points (+20% relative) [28].
3. **The cost-of-defect curve is not supported.** Across 171 projects there was
   no delayed-issue effect [1]. Design docs, RFCs, and KEPs are justified by
   early issue identification and a durable decision record — not by a proven
   rework multiplier [2][3].
4. **Research quality comes from closing the loop, not personas.** Generating
   the next query from what was just retrieved is the measured active
   ingredient; adding perspectives moved results ~0–2 points, non-significant
   [11]. Citation support is mechanizable, and frontier agents sit at 78–90%
   citation accuracy [12][13].
5. **Prompt volume is a liability.** The best of 20 frontier models follows 68%
   of instructions at 500 instructions, with an early-instruction bias [18];
   mid-context material is neglected [17]; unaided self-correction degrades
   [20]; LLM judges carry position, verbosity, and self-enhancement biases [19].
6. **Therefore "highest level" means fewer, front-loaded rules plus external
   checks and structural measurement** — not longer prompts and not more agents.

## Evidence by decision

### D1. Should we add more brain subagents (debate, critic, planner swarm)?

**No.** The evidence is negative or cost-prohibitive for this use case.

| Finding | Evidence | Confidence |
|---|---|---|
| MAS relative change vs single agent: +80.8% (decomposable finance) to −70.0% (sequential planning); 45% saturation threshold; tool-heavy tasks pay a coordination tax; centralized verification cuts error amplification 17.2× | [25] | high (260 configs, 6 benchmarks) |
| 14 failure modes in 3 categories (system design, inter-agent misalignment, task verification) across 1,600+ traces, 7 frameworks, κ=0.88; benchmark gains often minimal | [24] | high |
| 3-agent/2-round debate: 0.70 at $2.59 vs single-agent CoT 0.68 at $0.43 (~6× cost); hyperparameter-sensitive; did not reliably beat self-consistency | [22] | medium |
| N-sample voting helps (GSM8K 73→85 at N=40) but costs 40× tokens; it is sampling, not role specialization | [23] | medium |
| AlphaCode's stated lever was large-scale sampling followed by behavior-based filtering, not agent roles | [30] | medium |
| A fixed localize→repair→validate pipeline with **no LLM-decided planning** reached 32.00% on SWE-bench Lite at $0.70/issue, beating open-source agents at publication | [8] | high for the number |

**Design rule**: keep `researcher` and `planner` thin and stateless. Fan out
only for independent sub-questions. Never add a critic that only sees the
model's own output; a critic needs a verifier, test, or tool signal.

### D2. What should the design gate require?

The gate survives, but its justification changes: it is a decision-quality and
defect-detection mechanism, not a proven rework multiplier.

| Finding | Evidence | Confidence |
|---|---|---|
| No delayed-issue effect in 171 projects (2006–2014); the 40×–100× cost curve traces to unpublished 1970s data | [1] | high |
| Google design docs: value is early identification of design issues; template requires goals/non-goals, alternatives, trade-offs, cross-cutting concerns; no outcome metrics reported | [2] | high (as description) |
| Kubernetes KEP: structured proposal + SIG review for non-trivial changes; benefit stated as communication and durable record, not measured rework | [3] | high (as description) |
| Formal inspection vs walkthrough: 38% fewer defects in the final product, 90% of lifecycle defects detected, 9% lower cost (single retrospective, no control group) | [5] | medium |
| ~90% of detected defects are found in individual preparation; the meeting contributes ~10% and is not cost-effective | [5] | medium |
| Generic checklists were no better than ad hoc reading; scenario/perspective-based reading won once (+35%) and failed to replicate in two later experiments | [5] | medium |
| Pre-mortem is a plausible debiasing ritual with no measured effect on rework or defects | [4] | high (absence of data) |

**Design rule**: require a written artifact (goal, non-goals, ≥2 alternatives
with why-rejected, trade-offs, trace links), written individual review findings
before approval, and perspective-based review assignments. Record leading
indicators (issues caught pre-implementation, review coverage). Do not promise
cost savings.

### D3. What should the plan gate require?

| Finding | Evidence | Confidence |
|---|---|---|
| Explicit decomposition helps multi-step reasoning (Plan-and-Solve beat zero-shot CoT on 10 datasets) | [6] | medium |
| Repo-wide interdependent edits: a synthesized multi-step edit plan passed validity checks on 5/6 repositories; identical-context baselines without planning passed 0/6 (changes spanned 2–97 files) | [7] | high |
| A fixed pipeline without autonomous planning beat agentic planners on SWE-bench Lite | [8] | high for the number |
| Auto-regressive LLMs cannot reliably self-verify; pair generation with external verifiers (LLM-Modulo) | [9] | medium (position paper) |
| TDD: 30-subject longitudinal study found no significant quality (p=0.88) or productivity (p=0.80) effect, only more tests written (p=0.0002); meta-analyses disagree on productivity | [10] | medium-high |
| "Tasks should be 2–5 minutes" has no controlled empirical support | — | insufficient data found |

**Design rule**: scale plan depth to task shape. Localized single-file work gets
a light plan; multi-file interdependent work gets an explicit dependency and
impact plan. Each task carries one verifiable outcome, exact files, and an
external verification command. Never let the agent self-certify completion.
Remove the minute-granularity rule.

### D4. What should deep-research change?

| Finding | Evidence | Confidence |
|---|---|---|
| Closing the loop is the active ingredient: removing multi-turn, retrieval-grounded question generation dropped outline soft-recall 86.26→77.97 (GPT-3.5) and 92.73→88.75 (GPT-4), and unique sources 99.83→39.56 | [11] | high (ablation) |
| Perspective/persona multiplication is nearly free and nearly worthless: 84.49 vs 86.26 and 92.39 vs 92.73, not significant | [11] | high |
| Best models lack complete citation support ~50% of the time on ELI5; NLI entailment checking correlates with humans at κ=0.698 recall / 0.525 precision | [12] | high |
| Frontier deep-research citation accuracy: 81.44% (111.21 citations), 90.24% (31.26), 77.96% (40.79) — volume and accuracy trade off | [13] | high |
| Distill subagent output before fan-in; parallel section writing produced disjoint reports, so writing moved to one final call | [14] | medium (engineering report) |
| BrowseComp is single-short-answer by design; correlation with open-ended user distribution is unknown; the top score came from training on that task | [15] | high |

**Design rule**: make loop-closing explicit (each round's queries derive from
what was just read), demote personas to optional, verify per-claim entailment
against fetched pages, use one writer at fan-in, and state benchmark caveats.

### D5. How should the skills themselves be written?

| Finding | Evidence | Confidence |
|---|---|---|
| Best of 20 models follows 68% of 500 simultaneous instructions; bias toward earlier instructions; distinct degradation curves | [18] | high |
| Retrieval accuracy is highest at the start or end of context and degrades in the middle, even for long-context models | [17] | high |
| LLM judges reach >80% human agreement but carry position, verbosity, and self-enhancement biases | [19] | high |
| Without external feedback, LLMs struggle to self-correct; performance sometimes degrades | [20] | high |
| Rubric-based rewards beat holistic Likert judges by up to +31% HealthBench / +7% GPQA-Diamond — but in RL post-training, not prompt-time | [21] | medium |
| Agent Skills uses progressive disclosure; the page claims scalability and token economy, **not** a measured quality gain | [16] | high (absence of metric) |

**Design rule**: front-load must-follow rules; cap hard constraints; keep the
body procedural and move templates to references; write binary criteria, not
1–10 scores; never use self-review as the only gate.

### D6. What can be measured and gated?

| Finding | Evidence | Confidence |
|---|---|---|
| Reference-anchored analytic rubrics reached 71.82% human alignment vs a 68.78% human inter-annotator baseline | [31] | medium-high |
| Binary rubric items scale: HealthBench used 48,562 physician-written criteria; DeepResearch Bench II used 9,430 binary rubrics; WritingBench corroborates query-generated dynamic criteria | [32][31][34] | medium-high |
| Position bias is systematic and strongest on near-ties; swap-averaging is the standard mitigation | [33] | high |
| Judge-version changes break score comparability; pin the judge | [31] | high (operational fact) |
| Citation support, requirement coverage, and structural lint are mechanizable; "insight/depth" is the lowest-agreement dimension | [12][31] | medium-high |
| No benchmark exists for design docs or implementation plans; rubric score → downstream code outcome is unproven | — | insufficient data found |

**Design rule**: gate on mechanical checks (citations resolve, requirements
covered, structure valid); keep quality scores advisory; pin judge versions;
use swap-averaged pairwise only for ranking two candidates.

## Folklore / do-not-ship list

- The 40×–100× cost-of-defect curve as a justification [1].
- "Tasks should be 2–5 minutes" — no evidence found.
- Generic review checklists as a quality lever; scenario/perspective reading is
  mixed and failed to replicate [5].
- Persona/perspective multiplication in research [11].
- Self-critique as a quality gate without an external signal [20][26].
- "More agents = better" [24][25].
- Absolute LLM-judge scores as hard gates [19][31][33].
- Progressive disclosure as a proven quality gain — it is a token-economy
  rationale [16].

## Gaps and conflicts

- No controlled study links design-document completeness to rework or defect
  rates. The design gate is justified by inspection evidence and decision
  quality, not by an outcome multiplier.
- No benchmark for design docs or plans; a higher rubric score has not been
  shown to predict better downstream code.
- Requirement-traceability evidence is secondary and low-confidence [5].
- In-loop test execution at repo scale is supported by proxies (lint gate,
  function-level benchmarks), not a clean SWE-bench A/B.
- Most multi-agent and self-correction evidence is GPT-3.5/GPT-4-era; frontier
  models may narrow the gaps, but the direction (external signal > introspection)
  is consistent across studies.
- BrowseComp-style benchmarks reward narrow retrieval persistence; do not
  optimize the skill for them [15].

## Sources

1. Menzies, Nichols, Shull, Layman. *Are Delayed Issues Harder to Resolve?* EMSE 2017. https://arxiv.org/abs/1609.04886
2. *Design Docs at Google* (Malte Ubl). 2020-07-06. https://www.industrialempathy.com/posts/design-docs-at-google/
3. Kubernetes Enhancements (KEP) README. Accessed 2026-10-30. https://github.com/kubernetes/enhancements/blob/master/keps/README.md
4. Klein. *Performing a Project Premortem*. HBR 2007-09. https://hbr.org/2007/09/performing-a-project-premortem
5. Aurum, Petersson, Wohlin. *Software inspection: a state-of-the-art review*. STVR 12(3), 2002. https://www.wohlin.eu/stvr02-2.pdf
6. Wang et al. *Plan-and-Solve Prompting*. ACL 2023. https://arxiv.org/abs/2305.04091
7. Bairi et al. *CodePlan: Repository-level Coding using LLMs and Planning*. 2023. https://arxiv.org/abs/2309.12499
8. Xia et al. *Agentless: Demystifying LLM-based Software Engineering Agents*. 2024. https://arxiv.org/abs/2407.01489
9. Kambhampati et al. *LLMs Can't Plan, But Can Help Planning in LLM-Modulo Frameworks*. ICML 2024. https://arxiv.org/abs/2402.01817
10. Fucci et al. *A Longitudinal Study on the Effect of Test-Driven Development*. ESEM 2018. https://arxiv.org/html/1807.02971v1
11. Shao et al. *STORM: Assisting in Writing Wikipedia-like Articles From Scratch*. NAACL 2024. https://arxiv.org/abs/2402.14207
12. Gao et al. *Enabling Large Language Models to Generate Text with Citations* (ALCE). EMNLP 2023. https://arxiv.org/html/2305.14627
13. *DeepResearch Bench* evaluation. 2025-06-13. https://arxiv.org/html/2506.11763
14. LangChain. *Open Deep Research*. 2025-07-16. https://blog.langchain.com/open-deep-research/
15. OpenAI. *BrowseComp*. 2025-04-10. https://openai.com/index/browsecomp/
16. Anthropic. *Equipping agents for the real world with Agent Skills*. 2025-10-16. https://www.anthropic.com/research/equipping-agents-for-the-real-world-with-agent-skills
17. Liu et al. *Lost in the Middle*. TACL 2024. https://arxiv.org/abs/2307.03172
18. Jaroslawicz et al. *How Many Instructions Can LLMs Follow at Once?* 2025-07-15. https://arxiv.org/abs/2507.11538
19. Zheng et al. *Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena*. NeurIPS 2023 D&B. https://arxiv.org/abs/2306.05685
20. Huang et al. *Large Language Models Cannot Self-Correct Reasoning Yet*. ICLR 2024. https://arxiv.org/abs/2310.01798
21. *Rubrics as Rewards* (RaR). 2025-07-23. https://arxiv.org/abs/2507.17746
22. *Should we be going MAD?* 2024-03-14. https://arxiv.org/html/2311.17371v2
23. Li et al. *More Agents Is All You Need*. 2024. https://arxiv.org/html/2402.05120v2
24. Cemri et al. *Why Do Multi-Agent LLM Systems Fail?* 2025-10-26. https://arxiv.org/abs/2503.13657
25. Kim et al. *Towards a Science of Scaling Agent Systems*. 2026-04-08. https://arxiv.org/abs/2512.08296
26. Shinn et al. *Reflexion*. NeurIPS 2023. https://arxiv.org/html/2303.11366v4
27. Chen et al. *Teaching Large Language Models to Self-Debug*. 2023. https://arxiv.org/html/2304.05128v2
28. Yang et al. *SWE-agent: Agent-Computer Interfaces*. 2024. https://arxiv.org/html/2405.15793v1
29. Zhong, Raghunathan, Carlini. *ImpossibleBench*. 2025-10-23. https://arxiv.org/abs/2510.20270
30. Li et al. *Competition-Level Code Generation with AlphaCode*. 2022. https://arxiv.org/abs/2203.07814
31. *DeepResearch Bench* repository (RACE/FACT). 2026-05-11. https://github.com/Ayanami0730/deep_research_bench
32. Arora et al. *HealthBench*. 2025-05. https://arxiv.org/abs/2505.08775
33. Shi et al. *Judging the Judges: A Systematic Study of Position Bias*. AACL-IJCNLP 2025. https://arxiv.org/abs/2406.07791
34. Wu et al. *WritingBench*. 2025-03. https://arxiv.org/abs/2503.05244

**Sources reviewed**: 34.
