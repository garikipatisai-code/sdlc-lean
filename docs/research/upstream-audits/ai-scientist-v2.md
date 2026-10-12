# AUDIT: AI-Scientist-v2 — SakanaAI/AI-Scientist-v2 @ 96bd516 (2025-12-19)

**Custom license**: "AI Scientist Source Code License v1.0" (RAIL v1.1-based), no SPDX ID (`LicenseRef-`). Stale: last commit was the license change itself (PR #78); no releases ever.

## Mechanism registry (verified path:line)

| id | gap | source | inputs/state/outputs | failure behavior | tests |
|---|---|---|---|---|---|
| M1 stage pipeline | G1,G2 | `ai_scientist/treesearch/agent_manager.py:143-169,389-426` | task_desc + cfg → 4 Stage objects | stage-1 without working impl aborts whole run (`:415-426`) | none |
| M2 writeup-always | G1 | `launch_scientist_bfts.py:271-299` | `perform_writeup` runs unconditionally (only `--skip_writeup` opts out) | **paper written even on null/negative results** — the one G1-positive mechanism | none |
| M3 review-advisory | G1,G5 | `launch_scientist_bfts.py:304-323` | review saved to files; **no accept/reject gating** | review failure = missing files only | none |
| M4 novelty check | G1,G5 | `perform_ideation_temp_free.py:113`; `tools/semantic_scholar.py:66,118` | S2 key optional; no novelty gate at review time | no key → reduced checking | none |
| M5 repair vs change | G2 | `journal.py` (Node.is_buggy); `agent_manager.py:156-166` | stage-2 freeze "DO NOT change model architecture" = **prompt-level soft guidance** | LLM can deviate | none |
| M6 hypothesis freeze | G3 | `agent_manager.py:126-134` | task_desc template keys enforced (ValueError if missing) | missing key = crash | none |
| M7 seeds/CV/budgets | G3 | `bfts_config.yaml` (`num_seeds: 3`, `k_fold_validation: 1`, stage max_iters); `parallel_agent.py:1261-1272,389-391` | config injected as **instructions to the coding LLM, not enforced** | generated code can ignore seeds/CV | none |
| M8 result caching | G4 | **absent**; only run-state pickles (`agent_manager.py:249-272`); `copy_data` copies without checksums | no identity hashing anywhere | none |
| M9 review rubric | G5 | `perform_llm_review.py:60-130,237-242` | NeurIPS form (Soundness/Presentation/Contribution 1-4, Overall 1-10, Confidence 1-5) | generic; **no statistical/leakage review** | none |
| M10 GPU selection | G6 | `treesearch/parallel_agent.py:1091-1136,1179-1180` | `nvidia-smi --query-gpu` → `GPUManager.acquire/release`; workers capped to GPU count | **parallel by design** (`num_workers: 4`); two divergent GPU-count paths (launcher uses torch) | none |
| M11 budget | G6 | `exec.timeout: 3600` enforced `interpreter.py:85,276-311`; token tracker records only | no total cost cap; `wandb` in requirements but unused | none |
| M12 provenance | G7 | `launch:179-248,314-319`; `utils/config.py:219-260` | per-run dir, idea.md/json, journal.json, best_solution, review files, checkpoint.pkl | **not saved**: dataset checksums, seed values per eval, exec logs, prompts | none |

**Tests: zero** (`find`/`grep` verified). No setup.py/pyproject/Makefile/.github.

## Reproduction
Read-only. Shallow clone = 1 commit (history unavailable).

## License obligations (extraction BLOCKER)
§3.2(e) "AI Scientist Clause": generated manuscripts must prominently disclose machine generation; §3.3: §3.2 restrictions MUST be carried as enforceable provisions into downstream agreements; prohibited-use list §3.2(a-d). **We copy nothing.**

## Danger scan
No lifecycle hooks. Destructive `shutil.rmtree` on run dirs (scoped); unsandboxed subprocess execution of generated code.

## Divergences
"Fully autonomous" vs required API keys/GPU; "removes reliance on human-authored templates" vs mandatory enforced task_desc template + shipped fewshot examples; review "part of the loop" but write-only advisory.
