# Debt ledger

Format: see `lean-review` → `references/debt-ledger.md`.

| id | date | area | finding | trigger | est. saving | status |
|---|---|---|---|---|---|---|
| D-001 | 2026-10-04 | plugin/safety | `DESTRUCTIVE_PATTERNS` are literal-only: `rm -rf $HOME`, `rm -rf ${HOME}`, `rm -rf /*`, `rm -rf /tmp/../../` (resolves to `/`) pass (`sdlc-lean.js:219`) | next safety-hardening pass | ~15 lines | open |
| D-002 | 2026-10-04 | plugin/safety | secret-read guard is an allowlist of readers; `grep`/`sed`/`awk`/`cp`/`tee`/redirection on `.env` bypass it (`sdlc-lean.js:232`) | next safety-hardening pass | ~10 lines | open |
| D-003 | 2026-10-04 | plugin/safety | `#nosafety` is in-band text the model can append to defeat every guard (`sdlc-lean.js:265`) | redesign opt-out to a human-only channel (env var / confirmation) | ~10 lines | open |
| D-004 | 2026-10-04 | plugin/safety | `SENSITIVE_PATH_RE` is case-sensitive and misses basenames like `config.env`; also blocks `write`/`edit` that legitimately regenerate `.env` (`sdlc-lean.js:229`) | next safety-hardening pass | ~5 lines | open |
| D-005 | 2026-10-04 | plugin/router | bootstrap budget is 5116/5120 bytes (4-byte headroom); any router wording edit trips the test | next router edit must trim an equal number of bytes | 0 | open |
