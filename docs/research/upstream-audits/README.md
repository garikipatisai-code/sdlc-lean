# Upstream audit archive

Read-only audits of 5 candidate implementations, performed 2026-10-11 via shallow clones in `/tmp/opencode/upstream`. Every mechanism claim was read at path:line; five load-bearing claims were re-verified by the orchestrator. These archives preserve the evidence behind `docs/plans/2026-10-11-empirical-research-enhancement.md`.

| File | Repo | Pinned commit | License | Verdict |
|---|---|---|---|---|
| [inspect-ai.md](inspect-ai.md) | UKGovernmentBEIS/inspect_ai | a1dbea8 | MIT | adapt patterns |
| [rd-agent.md](rd-agent.md) | microsoft/RD-Agent | 484776c | MIT | adapt patterns |
| [mlflow.md](mlflow.md) | mlflow/mlflow | 074c0fc | Apache-2.0 | reference-only |
| [agentlaboratory.md](agentlaboratory.md) | SamuelSchmidgall/AgentLaboratory | d9017d9 | MIT | reject dependency |
| [ai-scientist-v2.md](ai-scientist-v2.md) | SakanaAI/AI-Scientist-v2 | 96bd516 | LicenseRef (RAIL) | reference-only, extraction blocked |
| [identity-report.md](identity-report.md) | all 5 | — | — | canonical identity + maintenance |

Safety note: clones were read-only. No installs, lifecycle hooks, or setup scripts were run (untrusted-input policy).
