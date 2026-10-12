# AUDIT: RD-Agent — microsoft/RD-Agent @ 484776c (2026-09-23, v1.0.0)

MIT, © Microsoft Corporation. Active: v1.0.0 released 2026-09-23; daily commits.

## Mechanism registry (verified path:line)

| id | gap | source | inputs/state/outputs | failure behavior | tests |
|---|---|---|---|---|---|
| M1 loop scheduler | G1,G3 | `rdagent/utils/workflow/loop.py:314-352` | loop_idx/step_idx; `loop_prev_out[li][step]` | unhandled exception re-raised (`:273-274`); `skip_loop_error` jumps to feedback (`:249-264`) | none direct |
| M2 budget-only termination | G1 | `loop.py:173-193` (spot-verified), `:319-324` | step_n decrement / timer timeout → `LoopTerminationError`; `loop_n` | loop ends "complete" on budget exhaustion — **result quality irrelevant** | none |
| M3 no LLM quit signal | G1 | (grep-verified absence); `rd_loop.py:222-236` sets `decision` trace nodes | negative results recorded (`decision=False`) but nothing gates on them | — | none |
| M4 CoSTEER repair loop | G2 | `rdagent/core/evolving_agent.py:140-198` | repair confined to code workspace; trace/hypothesis changed only at record step | failure → skip to feedback | test/qlib (mocked) |
| M5 withdraw/rollback | G2,G7 | `loop.py:101-103,265-272,407-425` | `withdraw_loop` restores previous step dump | LoopResumeError resumes loop | none |
| M6 config freeze | G3 | `rdagent/core/conf.py:14-44` | pydantic-settings frozen at import; source precedence init>env>dotenv>secrets | seeds NOT frozen in protocol (only `pdf_loader.py:400` np.seed(42)) | test/utils/test_conf.py |
| M7 HMAC-signed pickle | G4,G7 | `rdagent/core/serialization.py:64-91` | HMAC-SHA256 over payload; verify before load; auto key 0600 | `UntrustedArtifactError` before deserialization; unsigned cache = miss | test/core/test_serialization.py:40-124 (offline) |
| M8 pickle result cache | G4 | `rdagent/core/utils.py:159-199` | md5 key from `hash_func`; factor key hashes **only factor.py source** (`factor_coder/factor.py:95-105`) — data/checkpoint identity not in key | corrupted/unsigned cache deleted + recomputed | test_serialization.py:91-112 |
| M9 resource limits | G6 | `conf.py:67,92-100` | `multi_proc_n=1`, step semaphores; feedback/record forced to 1 | — | none |
| M10 GPU pinning | G6 | `rdagent/utils/env.py:1273-1290` | CUDA_VISIBLE_DEVICES → docker device_ids | **no global one-GPU-job scheduler** | test/utils/test_env.py |
| M11 trace dirs | G7 | `log/conf.py:13,19-28`, `logger.py:132` | per-run `log/<timestamp>/`, per-step traces, optional mlflow | — | test/log |
| M12 session resume | G7 | `loop.py:427-433,454-528` | dump after each step; load/checkout/truncation | missing session → FileNotFoundError | none |

## Reproduction
Read-only: git log/tags/status, direct reads of ~15 cited files. No installs. Spot-verified: `loop.py:173-193` terminates only on step/timer budget.

## License obligations
MIT; include copyright + permission notice in substantial copies. `web/` Vue app has no license file — flagged, not redistributed.

## Danger scan
No lifecycle hooks. `.env.example` ships plausible-looking placeholder keys pointing at a bogus host. Docker execution in `utils/env.py` (not run).

## Divergences
"Development Status :: 3 - Alpha" classifier vs v1.0.0 tag. `Feedback.finished()` docstring vs default `__bool__` returning True unconditionally; RDLoop never calls it.
