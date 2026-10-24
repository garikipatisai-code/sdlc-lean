# COLAB_RESOURCE_PROBE.md — GPU resource probe (2026-10-12)

**Outcome:** two allocations, each released and human-confirmed
(`VERIFIED_RELEASED`). Run 1 landed on a **CPU-only** runtime, so it produced no
GPU evidence. Run 2 (explicitly re-authorised) confirmed a **Tesla T4** with
15,360 MiB and an idle GPU. **Credit consumption remains unknown** — there is no
compute-unit API in reach and no usage rate was reported by the UI.

## Approved scope

| Item | Value |
|---|---|
| Allocations | 2 (run 1; run 2 re-authorised by the user after run 1 produced no GPU evidence) |
| Accelerator | **one** GPU runtime each, **Standard** system RAM, no accelerator fallback |
| Window | maximum **2 minutes** per allocation |
| Forbidden | training, installations, downloads, Drive mounting, repository uploads, purchases, extra GPU retries |
| Authorised actions | bridge check, `get_cells`, one inspection cell, local export, `runtime.unassign()`, human UI confirmation |

## Run 1 — GPU requested, CPU-only runtime observed

| Signal | Value |
|---|---|
| `nvidia-smi` / `nvcc` | **not found** |
| `/dev/nvidia0` | absent |
| `CUDA_VISIBLE_DEVICES` / `COLAB_ACCELERATOR` | `null` / `null` |
| `torch` | **2.11.0+cpu**, `cuda_available: false`, `device_count: 0` |
| CPU / RAM / Python | 2 vCPU / 12.7 GB / 3.13.16 |

The GPU request did not take effect on that runtime. Not an MCP failure — the
bridge worked end to end. **No retry was attempted** in that run.

## Run 2 — Tesla T4 confirmed (re-authorised)

| Field | Observed |
|---|---|
| GPU | **Tesla T4**, 15,360 MiB total, **0 MiB used** |
| Driver / compute capability | `580.82.07` / **7.5** |
| CUDA runtime / toolkit | **13.0** (`torch.version.cuda`) / nvcc `13.0.88` |
| `torch` | **2.11.0+cu130**, `cuda_available: true`, `device_count: 1` |
| Device node | `/dev/nvidia0` **present** |
| RAM / CPU / Python | 12.7 GB **Standard** / 2 vCPU / 3.13.15 |
| Colab release tag | `release-colab-external-images_20261009-060058_RC00` |

The inspection cell was read-only (presence checks + `nvidia-smi` queries + a
`torch` import that was already installed). No training, no installs, no
downloads.

## Usage rate and consumption

| Item | Status |
|---|---|
| Displayed usage rate (compute units/hr) | **not reported** — nothing was visible in the UI at the time, and no rate is obtainable programmatically (capability matrix: no CU API in reach) |
| Credit consumption | **UNKNOWN** — not measurable; GPU allocated only briefly (~33.6 s evidence-bearing) but with an unverified upper bound |
| GPU allocation | **VERIFIED for run 2** (T4 observed via `nvidia-smi` + `torch.cuda`); **UNVERIFIED for run 1** |

## Timing evidence (with its actual uncertainty)

| Event | Run 1 | Run 2 |
|---|---|---|
| Probe cell start → finish | `18:51:36.517Z` → `18:51:49.118Z` | `19:12:24.230Z` → `19:12:29.094Z` |
| Release request (`RELEASE_STARTED`) | `18:52:29.676Z` | `19:12:57.829Z` |
| Human confirmation of absence | `18:55:53Z` | `19:13:42Z` |
| Evidence-bearing span (probe → release) | ≥ 53.2 s | **≥ 33.6 s** |

- **The connect instant was not timestamped in either run**, so **total
  allocation duration is estimated/unknown** and **compliance with the 2-minute
  window was not independently verified**.
- Run 2 worst case, bounded by the start signal: `19:10:20Z` → release
  `19:12:58Z` = **158 s**, which would exceed the 2-minute cap if the runtime was
  connected immediately after the signal. The user's timer reading was requested
  and not reported; it would settle the bound.
- The user-reported connect timestamps (run 1: none; run 2: none) are therefore
  not available as clock values in this record.

## Evidence inventory (kept outside this repository)

| Artifact | Location | sha256 |
|---|---|---|
| Run journal (timeline, findings, corrections) | `/tmp/opencode/colab-lifecycle-live-test/journal.md` | `432de824…530b` |
| Run 1 probe output | `/tmp/opencode/colab-lifecycle-live-test/probe-result.json` | `ddccdced…300a34` |
| Run 2 probe output (raw, GPU UUID intact) | `/tmp/opencode/colab-lifecycle-live-test/probe-result-run2.json` | `efeff05b…9aa88` |
| Probe cell code (manual-run fallback) | `/tmp/opencode/colab-lifecycle-live-test/probe-cell.py` | `75a070f9…80eac5` |
| Ownership/release registry (both runs, `active: false`) | `${XDG_STATE_HOME:-~/.local/state}/sdlc-lean/colab-runtimes.json` | — |

No proxy tokens, cookies, credentials, or notebook URLs were recorded anywhere.
The GPU UUID is **redacted in this repository copy** (it is a unique hardware
identifier); the raw value stays in the local artifact above.

## Probe output — run 1, verbatim (580 bytes)

```json
{"accelerator_env":null,"colab_release_tag":"release-colab-external-images_20261009-060058_RC00","cpu_count":2,"cuda_visible_devices":null,"dev_nvidia0":false,"kind":"colab-resource-probe-gpu","mem_total_kb":13286944,"nvcc":"/bin/sh: 1: nvcc: not found","nvidia_smi_list":"/bin/sh: 1: nvidia-smi: not found","nvidia_smi_present":false,"nvidia_smi_query":"/bin/sh: 1: nvidia-smi: not found","python":"3.13.16","torch":{"capability":null,"cuda_available":false,"cuda_runtime":null,"device_count":0,"device_name":null,"version":"2.11.0+cpu"},"utc":"2026-10-12T18:51:42.218428+00:00"}
```

## Probe output — run 2 (690 bytes; GPU UUID redacted in this copy)

```json
{"accelerator_env":null,"colab_release_tag":"release-colab-external-images_20261009-060058_RC00","cpu_count":2,"cuda_visible_devices":null,"dev_nvidia0":true,"kind":"colab-resource-probe-gpu","mem_total_kb":13286944,"nvcc":"Cuda compilation tools, release 13.0, V13.0.88\nBuild cuda_13.0.r13.0/compiler.36424714_0","nvidia_smi_list":"GPU 0: Tesla T4 (UUID: GPU-REDACTED)","nvidia_smi_present":true,"nvidia_smi_query":"Tesla T4, 15360 MiB, 0 MiB, 580.82.07, 7.5","python":"3.13.15","torch":{"capability":[7,5],"cuda_available":true,"cuda_runtime":"13.0","device_count":1,"device_name":"Tesla T4","version":"2.11.0+cu130"},"utc":"2026-10-12T19:12:24.282727+00:00"}
```

## Not done (and why)

- **No third allocation / GPU retry** — run 2 was explicitly re-authorised once;
  repeatedly requesting accelerators to chase hardware is against the lifecycle
  policy.
- **No reconnect or post-release probe** — a reconnect can allocate a fresh
  runtime; release verification was by human UI observation only.
- No training, installations, downloads, Drive mounting, uploads, purchases,
  process kills, commits, or pushes.

**Stopped before any experiment, as instructed.**
