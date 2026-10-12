# AUDIT: MLflow — mlflow/mlflow @ 074c0fc (2026-10-11)

Apache-2.0, © 2018 Databricks. Active: 3.17.0 (2026-10-07).

## Mechanism registry (verified path:line)

| id | gap | source | inputs/state/outputs | failure behavior | tests |
|---|---|---|---|---|---|
| M1 run status | G1 | `mlflow/entities/run_status.py:9-15` | FINISHED/FAILED/KILLED enum | — | n/a |
| M2 write gate | G1,G3,G7 | `entities/run_info.py:14-20`, used `file_store.py:1080,1108` | logging to ended run → `MlflowException` | rejected | store tests |
| M3 end_run finalize | G1,G7 | `store/tracking/sqlalchemy_store.py:1257` | status+end_time at termination | — | store tests |
| M4 null metrics | G1 | `file_store.py:1077-1101` | float values, no sign/range restriction — negative/null outcomes loggable | — | — |
| M5 dataset digest | G4 | `mlflow/data/digest_utils.py:12-28` (spot-verified) | df → 8-char md5; **`df.head(MAX_ROWS=10000)` trim + non-string/numeric cols dropped → silent collision risk** | — | `tests/data/test_pandas_dataset.py:61-70` |
| M6 score↔dataset binding | G4,G5 | `file_store.py:1093-1101`; `fluent.py:1152,1179` | metric rows carry `dataset_name dataset_digest` when present | fields omitted if None (silent unbinding) | store tests |
| M7 dataset inputs | G4,G7 | `sqlalchemy_store.py:291,1091-1092`, `mlflow.log_input` | Dataset → run inputs (name/digest/source/profile) | "experimental" API | `tests/data/` |
| M8 metric history | G5 | `sqlalchemy_store.py:1706,1747,1840` | (run, key) → ordered rows; paging/sampling | — | store tests |
| M9 step semantics | G5 | `entities/metric.py:21-22,36-37,54-59` | repeated observations = multiple rows (step, ts) | — | metric entity tests |
| M10 batch limits | G6 | `utils/validation.py:67-71,606` | MAX_*_PER_BATCH caps | `_validate_batch_limit` raises | validation tests |
| M11 GPU metrics | G6 | `system_metrics/system_metrics_monitor.py:70-71,202-215` | GPU memory/utilization per device → run metrics | monitor failure → skip (graceful) | system_metrics tests |
| M12 scheduling | G6 | **verified absent** — no queue/semaphore in stores | MLflow does **not** schedule or queue jobs | — | — |
| M13 local backend | — | `_tracking_service/utils.py:170-174` | default local URI is now **SQLite**; file store in maintenance mode unless env opt-out | — | store tests |

## Reproduction
Read-only only — pip install explicitly not done. All citations from direct file reads at HEAD.

## License obligations
Apache-2.0: include LICENSE.txt, retain Databricks copyright, state modifications, trademark clause. **We copy no code → no obligations triggered.**

## Danger scan
No npm lifecycle hooks; no setup.py (setuptools build_meta). `.pre-commit-config.yaml` present (dev-only, not run).

## Divergences
Default-backend drift: code silently falls back to SQLite while older docs describe `./mlruns`.
