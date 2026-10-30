# Eval run — 2026-10-30

Model: opencode-go/deepseek-v4.1-flash · probes: 1 · 
structural: 0/0 passed · advisory: 0/1

| probe | group | result | detail |
|---|---|---|---|
| merge-gate | execution | FAIL (advisory) | artifact-contains:spec-check verify, artifact-contains:spec-check close |

## Telemetry (from the run stream)

| metric | value |
|---|---|
| input tokens | 16989 |
| output tokens | 821 |
| reasoning tokens | 181 |
| cache read / write | 54272 / 0 |
| cost (USD) | 0 |
