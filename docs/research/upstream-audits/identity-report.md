# UPSTREAM IDENTITY REPORT (web-verified, 2026-10-11)

| repo | canonical URL (evidence) | status | last commit | last release | license | stars/forks | PyPI | confidence |
|---|---|---|---|---|---|---|---|---|
| microsoft/RD-Agent | GitHub + PyPI `rdagent` homepage | **active** | 2026-09-23 | v1.0.0, 2026-09-23 | MIT | 14,901/1,959 | `rdagent` 1.0.0 | high |
| SamuelSchmidgall/AgentLaboratory | GitHub, README self-link | **unmaintained** | 2025-08-20 | none ever | MIT | 5,900/804 | none | high |
| Inspect AI | `UKGovernmentBEIS/inspect_ai` — own docs "Code"/citation links + PyPI metadata | **active** | 2026-10-10 | 0.3.278, 2026-10-09 | MIT | 2,984/800 | `inspect-ai` 0.3.278 | high |
| mlflow/mlflow | GitHub + PyPI `mlflow` | **active** | 2026-10-11 | 3.17.0, 2026-10-07 | Apache-2.0 | 28,346/6,441 | `mlflow` 3.17.0 | high |
| SakanaAI/AI-Scientist-v2 | GitHub | **stale** | 2025-12-19 (license change, PR #78) | none ever | custom RAIL-based, no SPDX | 7,299/998 | none official | high |

## Inspect canonical resolution
Docs site (fetched live) links Code/Changelog/License/Issues → `UKGovernmentBEIS/inspect_ai`; on-page BibTeX citation same; PyPI `inspect-ai` Source Code/Issue Tracker same; API confirms `fork:false`. `uk-ai-safety-institute` org → 404. `meridianlabs-ai/inspect_ai` exists as an active dev fork/ecosystem hub (17+ `inspect_*` repos) but releases ship from BEIS. **Canonical = UKGovernmentBEIS/inspect_ai.**

## Notes
- RD-Agent v1.0.0 (2026-09-23): breaking changes (UI auth token required; report-file uploads), new AutoRL-Bench + web UI + LLM-finetune scenario.
- PyPI `ai-scientist` (0.1.0, 2025-02-13) is **unrelated** to SakanaAI. AgentLaboratory has no PyPI package under any name.
- No public statement on a future BEIS→meridianlabs-ai redirect; as of 2026-10, BEIS is where releases originate.

## Sources (all fetched)
api.github.com/repos/{microsoft/RD-Agent (+releases/tags/v1.0.0), SamuelSchmidgall/AgentLaboratory, UKGovernmentBEIS/inspect_ai, meridianlabs-ai/inspect_ai, mlflow/mlflow, SakanaAI/AI-Scientist-v2}; raw CHANGELOG.md (inspect_ai), README.md (AgentLaboratory), LICENSE (AI-Scientist-v2); inspect.ai-safety-institute.org.uk; pypi.org/pypi/{rdagent,inspect-ai,mlflow,ai-scientist}/json; 404 checks (uk-ai-safety-institute, meridianlabs, aisi orgs; agentlaboratory/agent-laboratory/sakana-ai-scientist PyPI).
