# AUDIT: Inspect AI — UKGovernmentBEIS/inspect_ai @ a1dbea8 (2026-10-10)

MIT, © 2024 UK AI Security Institute. Active: 0.3.278 (2026-10-09), releases every few days.

## Mechanism registry (verified path:line)

| id | gap | source | inputs/state/outputs | failure behavior | tests |
|---|---|---|---|---|---|
| M1 model cache key | G3,G4 | `src/inspect_ai/model/_cache.py:177-205` | md5(config minus excluded fields, messages minus ids/cache_breakpoint, base_url, tool_choice, tools, expiry, scopes, optional epoch) | **no model-version pin** (documented staleness); cache read/write failures → miss, never raise (`:252-285`) | `tests/model/test_cache.py:40-445` |
| M2 task identity hash | G3,G4 | `src/inspect_ai/_eval/evalset.py:2089-2100,2128-2134` | `{task_file}@{task_name}#{args_hash}/{model}/{additional_hash}`; partition pinned equal to cache-key partition | identifier-version bumps forced | `tests/test_task_identifier_version.py` |
| M3 dataset identity | G4 | `log/_log.py:107-122` | name/location/samples/sample_ids/shuffled recorded | **no content hash** | `tests/test_sample_id.py` |
| M4 limits/concurrency | G6 | `_cli/eval.py:497-588` | `--limit/--max-tasks/--max-samples/--max-subprocesses/--max-connections/--timeout/--epochs` | `--limit`+`sample_id` conflict raised | `tests/test_sample_limits.py:141-320` |
| M5 sandbox caps | G6 | `util/_sandbox/compose.py:415-425`, `limits.py:8-10` | mem_limit, cpus, default network none; exec output 10MiB / read 100MiB caps | defaults, task compose can raise | docker workflow tests |
| M6 errors vs completion | G1 | `_eval/task/run.py:342,430-525`, `task/error.py:33-78`, `log/_log.py:62,551-552,869` | `completed\|errored\|cancelled` per sample; eval `status` threshold-gated by `fail_on_error`; unscored → NaN sentinel excluded from metrics | **a fully-failed eval can still log `status="success"`** if `fail_on_error=False` — readers must inspect per-sample errors | `tests/test_fail_on_error.py`, `test_score_on_error.py` |
| M7 bootstrap CI | G5 | `scorer/_metrics/std.py:21-50,174-230` | `bootstrap_stderr`, `ci` (t\|bootstrap, clustered); epochs repeat samples | empty score list → 0 not NaN | `tests/scorer/` |
| M8 approval policy | G6 | `approval/_policy.py:62-78` | per-tool glob → approvers; **deny if no approver matches**; default = no policy | opt-in | `tests/approval/` |
| M9 EvalLog provenance | G7 | `log/_log.py:1303-1358,1092-1173,1014-1024` | EvalSpec snapshot, plan, results, stats, revisions (git commit+dirty), config_updates, samples | — | `tests/log/test_config_updates.py` |

## Reproduction
Read-only: `git log`, LICENSE head, CHANGELOG count (105 releases), direct reads of cited paths. No installs (blocker: third-party deps absent from env).

## License obligations
MIT; include copyright + permission notice in substantial copies; `CITATION.cff` for academic citation.

## Danger scan
No lifecycle hooks (standard setuptools backend). Pickle model cache = local-only risk. CI actions pinned by SHA.

## Divergences
Caching docs honestly document alias staleness (matches code). `EvalStatus` doc nuance (M6) is the key reading hazard for G1.
