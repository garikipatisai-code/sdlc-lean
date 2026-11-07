# Verify recipe (sdlc-lean)

Write-once-reuse verification for this project. Every completion claim in this
repo must cite fresh output of these commands (see `verification-before-completion`).

```sh
npm run verify        # skill lint + node --test (counts as of 2026-11-01: 40 skills / 9 commands / 538 tests)
npm run eval          # dry eval plan, 44 probes (23 core + 21 routing), zero spend — must list all probes
node scripts/spec-check.mjs verify --require-active   # active spec gate: no drift, no malformed marker # bare close skips drift (skipDrift escape hatch); approve/verify/keep full drift enforcement
```

Routing verify (free-only, no paid — live smoke is opt-in, never required for completion claims):

```sh
npm run eval          # exit 0; confirm 44 probes listed, routing group = 21 (super-vl pins)
# super-vl smoke, both accounts, $0:
opencode run --archived --model console-openrouter/nvidia/nemotron-3.5-super-vl:free "ping: reply ok"
opencode run --archived --model console-openrouter2/nvidia/nemotron-3.5-super-vl:free "ping: reply ok"
```

Catalog re-probe procedure (documented, not automated — never auto-switch pins):

```sh
curl -s -H "Authorization: Bearer $OPENROUTER_API_KEY" https://openrouter.ai/api/v1/models | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{for(const m of JSON.parse(d).data){if(/north-mini-code|flint-v1\.0|dots-3-note|nemotron-3-ultra|nemotron-3.5-super-vl|gpt-oss-120b|laguna|inkling|lfm-2\.5|content-safety/i.test(m.id))console.log(m.id,'|',m.expiration_date??'no-expiry');}})"
```

1. Compare each pinned/denylisted ID's `expiration_date` against the
   `docs/AUTONOMY.md` mapping table; refresh expiry notes by hand.
2. Expired or vanished free ID → stop + escalate (new pin = plan task,
   never a silent edit).

Live probes are opt-in and never required for completion claims:
`node eval/run.mjs --run --max-probes N` (spends tokens; manual only).

Discovery aid (not a completion claim): `node scripts/spec-check.mjs envelope check <file>` + `close --machine` criteria (see `docs/design/0001-auto-tier-pilot.md`).
Discovery aid (not a required claim): `approve --machine` criteria (see `docs/design/0002-machine-approve.md`) — `approve --machine` opens the gate under envelope ceiling; critic sessions must be independent (validateCriticsSessions refuses duplicate/self-review sessions).
