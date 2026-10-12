# AUDIT: AgentLaboratory — SamuelSchmidgall/AgentLaboratory @ d9017d9 (2025-08-20)

MIT, © 2025 Samuel Schmidgall. **Unmaintained**: no commits since 2025-08-20, no releases ever, no tests, no CI, no version metadata.

## Mechanism registry (verified path:line)

| id | gap | source | inputs/state/outputs | failure behavior | tests |
|---|---|---|---|---|---|
| M1 phase pipeline | G1,G7 | `ai_lab_repo.py:60-65,139-205` | `phase_status` dict; agent attrs | **no try/except anywhere in the loop** (grep-verified) — any exception aborts the whole run; report/interpretation never execute. Null experiment results flow to interpretation as text | none |
| M2 state persistence | G7 | `ai_lab_repo.py:106-113` | pickles **entire self incl. API key** to `state_saves/Paper{N}.pkl` | **no restore path exists** (`load_previous` parsed at `:722`, never used) | none |
| M3 handoff context | G7 | `agents.py:370-380` | second-round plan formulation receives prev results/interpretation/report/reviewer_response | `reset_agents()` wipes dialogue each phase — attrs only | none |
| M4 code execution | G1,G6 | `tools.py:289-330` | `exec()` of LLM-generated code in bare process, 600s timeout; blocklist (pubmed, `exit(`) trivially bypassable | timeout → SIGTERM + error text | none |
| M5 repair vs protocol | G2 | `mlesolver.py:152-183,341-407` | `code_repair` retries `GLOBAL_REPAIR_ATTEMPTS`; prompt demands fix "without affecting the code output"; plan read-only input to `get_score` | failure → "Code was reverted back to original state", never raises, plan untouched | none |
| M6 protocol-change gate | G2,G3 | `ai_lab_repo.py:181-199,207-238` | human y/n to loop back to plan formulation | reviewer scores are LLM text | none |
| M7 freezing | G3 | (grep: `seed\|random_state` = 0 hits; `constraints_autogen` = 0 hits in code) | free-text plan; **no seed/split/metric/control freeze exists** | plan can be silently reformulated each round | none |
| M8 budgets | G3,G6 | `ai_lab_repo.py:20,686-689` | `max_steps=100`/phase; mlesolver 3, papersolver 5 | "Max tries" raises → aborts everything (M1) | none |
| M9 score caching | G4 | **absent** — fresh LLM judgment per call; HF index re-downloaded each instantiation | no identity/hash checks anywhere | none |
| M10 review/interpretation | G5 | `agents.py:36-180,431-433` | NeurIPS rubric, 3 personas, weighted composite; interpretation asks for "measures of significance" | **no statistical tests, no estimand/leakage checks** | none |
| M11 resource limits | G6 | **none** (grep gpu/cuda/device = 0 hits in exec path); `ThreadPoolExecutor` parallel labs | `parallelized` else-branch raises NotImplementedError | none |

## Reproduction
Read-only: git metadata, direct reads. No setup scripts exist, so no lifecycle-hook surface.

## License obligations
MIT; nothing copied.

## Danger scan
Import side effect: `from app import *` builds Flask+SQLite on import; hardcoded `SECRET_KEY='your-secret-key'`; API keys into `os.environ` + plaintext pickle; unsandboxed `exec()` by design.

## Divergences
README "three phases" vs 4 phases/7 subtasks in code; "autonomous" claim vs human y/n gate (`:218`); paper's `constraints_autogen` has no code counterpart; AgentRxiv claim ≈ optional arXiv scrape + upload flag; `load-previous` YAML key dead.
