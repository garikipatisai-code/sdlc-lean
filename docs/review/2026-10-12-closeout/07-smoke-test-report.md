# Smoke-test report — isolated installation at 07f1ebc

- Tested commit: `07f1ebcd69ab25af5c1ed70498bb2bd1c3e65d25`
- Working tree at test time: clean (`git status --porcelain` empty)
- Target: disposable `/tmp/opencode/smoke-UABtWm/opencode` (removed after test)
- Real `~/.config/opencode`: untouched (installer always run with explicit `--target`; XDG/HOME overrides passed per-call, never exported)
- No paid model calls, GPU jobs, remote writes, or enhancements

## 1. Install

`node scripts/install-global.mjs --target $T/opencode`
→ `skills 37 · agents 8 · commands 6 · plugin yes · research 2 · pruned 0` — PASS

## 2. Installed artifacts

| Check | Result |
|---|---|
| `skills/research-protocol/SKILL.md` present | PASS |
| `scripts/research/protocol.mjs` + `cluster.mjs` together | PASS |
| Manifest lists both helpers (`scripts/research/*.mjs`, count 2) | PASS |
| Installed module imports; `hashFile/acquireDeviceLock/createProtocol/checkEvidenceBundle/resolveProtocolModule` all functions | PASS |
| CLI `hash` fixture (`printf 'abc'`, no newline) → `ba7816bf…20015ad` (matches `sha256('abc')`) | PASS |
| Discovery, `XDG_CONFIG_HOME=$T` + bare cwd → `$T/opencode/scripts/research/protocol.mjs` | PASS |
| Discovery, project-local `<cwd>/.opencode/scripts/research/protocol.mjs` wins | PASS |
| Discovery, `SDLC_RESEARCH_PROTOCOL` env wins | PASS |

## 3. Installed-helper behavior (temp lock root `$T/locks`)

| Check | Result |
|---|---|
| acquire (pid 567028) → release ok | PASS |
| Competing CLI contender → exit 7, `locked-by:567028`, lockfile byte-identical after | PASS |
| CLI `lock` prints `held:<pid> (probe only)`; usage carries `(probe only; protects nothing after exit)` | PASS |
| `createProtocol({seeds:{training:7}})` → mutate to 8 → `verifyProtocol` false | PASS |
| `cacheHit` true before change; false after dataset byte change; false after model byte change | PASS |

## 4. Reinstall into same target

Second install: user file `notes/mine.md` (`user content`) intact; installed `protocol.mjs` byte-identical to repo (`cmp` clean); `pruned 0` — PASS

## 5. Routing instructions (STATIC checks — not proof of live model routing)

- Installed `using-sdlc-lean/SKILL.md:39`: empirical-experiment → `research-protocol` — PRESENT
- Same file `:38`: external-evidence → `deep-research` — PRESENT (non-research route intact)
- Installed `autonomous-loop/SKILL.md:67`: `## Research mode` section — PRESENT

## Verdict: PASS — no blockers
