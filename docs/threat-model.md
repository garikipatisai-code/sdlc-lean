# Threat model

Design-time threat model for trust-boundary changes. Risk is binary: high or low.

## 2026-10-30 — V2-native brain

Scope: persisted bootstrap injection, TUI plan discovery/approval, hash-only host evidence, strict guards. Native permission `ask` is deferred because `--auto` can auto-approve it.

| boundary | threat | risk | mitigation | residual owner |
|---|---|---|---|---|
| Human → TUI approval | A plugin, automation, or agent-reachable endpoint dispatches approval without a deliberate human act | high | Typed `/approve` and picker are user-invoked; plan SHA-256 is shown and required; marker re-read and validated; `approved_via` distinguishes picker/command; pre-flight U2 falls back to preview-only if agent bash can reach the endpoint | host user |
| User prompt → plugin | User text suppresses router injection with the bootstrap marker | low | Persisted `session.context` check, not a text marker; append once; child sessions skipped; lookup failure skips injection | plugin |
| Plugin → project root | `cwd` or the global install directory is used instead of the session location, so the gate fails open | high | `ctx.location.directory` first, then `ctx.directory`; never `cwd`; mutating file tools fail closed when the root is unknown; compaction injects nothing | plugin |
| Agent → destructive/secret guard | Agent adds `#nosafety` or obfuscates a command to bypass the guard | high | `#nosafety` removed; destructive, secret, and Colab guards always throw; no permission hook; no OS sandbox | host user |
| Agent → host evidence | Agent appends or edits `.sdlc/host-evidence.jsonl` to forge a passing row | high | Hash-only rows; plan SHA-256 stamped; `--require-host` is opt-in; advisory default; document that the log is not tamper-proof | host user |
| Host evidence → secrets | Command arguments or output contain tokens, passwords, or URLs with credentials | high | Never store the raw command or output; store `argv0`, `command_sha256`, `output_sha256`, byte count; mode 0600; `.sdlc` 0700 | plugin |
| Evidence file → process | `.sdlc` or the log is a symlink/FIFO, causing an out-of-repo write or a server stall | high | `lstat` both paths; `O_NOFOLLOW`; `fstat` regular-file check; bounded append; skip and log otherwise | plugin |
| TUI → filesystem | A crafted plan name escapes `docs/plans`, follows a symlink, or exhausts memory | low | Immediate `*.md` only; regular-file and size checks; control-character stripping; realpath containment; server re-validates | plugin |
| TUI → command endpoint | The picker invokes approval in the wrong session or a non-human caller reaches the endpoint | high | Resolve the current session only; refuse otherwise; absolute path; plan hash; pre-flight U2; preview-only fallback | host user |
| Active-gate summary → system prompt | A forged marker injects instructions into the system prompt | high | `validateGate` before injection; emit only validated plan/spec and a short count; invalid marker emits `gate invalid` only | plugin |
| Installer → V1 | V1 loads the TUI directory and breaks startup | low | V1 loads plugin files, not directories; installer test asserts the server file stays a file; V1 hooks unchanged | plugin |
| Host evidence script → close | Malformed/oversized lines throw or block close | low | Skip malformed lines with a count; cap line length; script is read-only; default advisory; `--require-host` opt-in | plugin |

## 2026-10-31 — Popup approval (TUI direct write)

Scope: palette/keybind picker lists plans, shows files/allow plus plan SHA-256 and spec, and the TUI process writes `.sdlc/spec-gate.json` directly with `approved_via: tui-popup`. No `session.command`, no agent write, no CLI change.

| boundary | threat | risk | mitigation | residual owner |
|---|---|---|---|---|
| Human → TUI popup | A spoofed dialog, automation, or second plugin clicks Approve without a deliberate human act | high | Palette/keybind plus `dialog.select`/`dialog.confirm` are user-invoked; no agent or `session.command` path; shown hash is compared before write; marker is re-read and validated; `approved_via: tui-popup` distinguishes the path | host user |
| Agent → gate file | An agent with bash writes `.sdlc/spec-gate.json` directly, forging a popup approval | high | Agent bypass (D-013) remains; close validates plan/spec hashes against files; host evidence stays advisory; documented as not tamper-proof, no sandbox claimed | host user |
| TUI → filesystem | A crafted plan name escapes `docs/plans`, follows a symlink, or exhausts memory | low | Immediate `*.md` only; skip progress/evidence/symlink/non-regular/>1MB/control/whitespace; realpath containment under the project root; import the installed CLI | plugin |
| TUI → wrong project | The popup resolves the wrong root or session and approves another checkout | high | Root from the TUI location only, never `cwd`; current session route only, refuse otherwise; absolute plan path; hash compare before write | plugin |
| Marker → user | A tampered marker or changed plan file is displayed as valid | high | Verify `plan_sha256`/`spec_sha256` against file bytes before display; mismatch returns invalid and the status shows `gate invalid` only | plugin |

## 2026-10-31 auto-tier pilot

Scope: ENVELOPE-AUTHORIZED MACHINE-CLOSED loop — the agent writes its own reference plan AND closes its own gate on machine authority (zero human keystrokes inside the envelope). Standing envelope (authorized once, version-controlled) is the only human act; irreversible-external acts stay ALWAYS-human. Design: `docs/design/0001-auto-tier-pilot.md`. This round is docs-only; zero code changed.

- Assets: uncommitted work (loss/corruption), `main` (bad merge landing), gate integrity (forged or weakened approval), audit trail (missing or false rows hiding a scope break).
- Entry points: agent tool calls acting under the standing envelope (file edits, test/check runs, ledger writes); reference-plan MDs the agent authors itself.
- Trust boundaries: envelope edge (declared paths vs. everything else); machine-close (criteria check before close); merge (branch → shared remote/PR); release/publish/spend/prod-writes; grader (assertions and pass bars).

Attacker paths (input → sink → impact):

1. Agent self-authorization — writing its own plan AND closing its own gate = approving its own work (top threat: spoofing-by-trust / elevation).
2. Prompt-injection via tool results → out-of-envelope file write sink → unapproved code lands inside an "envelope-authorized" run (tampering / elevation) — out-of-envelope writes blocked by gate hooks.
3. Agent self-widening scope mid-run ("just one more file") → gate-hook/file-scope sink → authorization boundary crossed without envelope cover (elevation / tampering).
4. Forged audit row or weakened check covering a scope break → `docs/audit-ledger.md` / check sink → repudiation: the record claims a clean machine-close while hiding the break (repudiation / tampering); reward-hacking variant: new behavior with no pre-declared expected outcome graded by an agent-edited check.
5. Rubber-stamped plan approval → false-trust sink → REJECTED path (not taken): the human approves a plan they cannot judge; this design removes that gate entirely — plans are reference output, never authorization inputs.

| boundary | threat | risk | mitigation | residual owner |
|---|---|---|---|---|
| Agent → own gate (TOP THREAT) | Agent authors its reference plan AND closes its own gate = approving its own work (spoofing-by-trust / elevation) | high | Separation of powers — plan-author, implementer, critic, and closer are FRESH independent subagents (existing subagent-driven-development rule), never the implementer reviewing itself; closer is a MECHANICAL check only (evidence + hashes + critic verdicts present, no judgment); grader-immutability (agent never edits its own grading tests); envelope hooks enforce scope technically; reward-hacking guards (checks pre-existing or reviewer-owned; new behavior needs a pre-declared expected outcome) | human operator (sampling; correlated-model-failure risk below) |
|---|---|---|---|---|
| Human → plan approval | Human approves a plan they cannot judge (experimental domain) → rubber stamp → false trust (top threat in the OLD shape) | high | Path REMOVED by design: no human hash approvals, no per-plan accept waits, no approval prompts the human can't judge; plans/specs are reference output, never authorization inputs; human authorizes the risk envelope only | human operator (envelope choice) |
|---|---|---|---|---|
| Envelope edge | Injected or self-added instruction widens the run beyond declared paths (spoofing/elevation) | high | Envelope enforced TECHNICALLY by gate hooks, not promises: anything outside the envelope (and any active plan `files`/`allow`) is refused as a deviation; escalate (stop + report with evidence, no retry) | human operator |
| Envelope edge | Tool-result content smuggles an out-of-envelope write or destructive command (tampering) | high | Out-of-envelope writes blocked by hooks; destructive patterns still throw (guards not negotiable); escalate on destructive/irreversible act or unclear scope/reversibility; validate at the boundary, once | human operator |
| Audit trail | Agent writes a false pass row or omits the break (repudiation) | high | Audit row + reversal commit per run: exactly one row per run naming the reverting commit; reviewer reconciles row against `git log` before trusting it; ledger kept human-readable for outer-loop sampling | human operator |
| Fix loop | Same check fails twice with same output yet the loop retries silently, burning budget or drifting (denial of service on operator attention / tampering-by-drift) | high | Escalate on 2×same-failure: stop + report, no retry; iteration budget caps the run; strategy change only, never the same fix again | human operator |
| Grader | Check says pass while grader/assertion says fail (or agent weakens an assertion to go green) — conflicting signals (tampering) | high | Grader-immutability (load-bearing): grader conflict escalates — stop + report, no retry; grader assertion changes are ALWAYS-human; never loosen a bar to go green | human operator |
| Merge / release / external | Envelope-authorized run merges to a shared remote, opens a shared PR, publishes, spends, or writes to prod/external (elevation across the irreversible-external boundary) | high | Irreversible-external acts are ALWAYS-human (explicit list: shared-remote merge/PR, publish/release, spend, prod/external network writes, grader changes, red close); a run attempting them stops and reports; no envelope covers them | human operator |
| Run output → operator | Over-long or secret-bearing run output leaks tokens into the ledger or logs (information disclosure) | low | Secrets never enter the model context or logs; ledger rows carry only date/tier/check/result/reversal, never raw output | human operator |

Residual risks (accepted by human operator): a correctly-scoped but wrong-headed run can still land bad-but-revertible work (bounded by budget + named check + reversal commit); the audit ledger is a detection control, not tamper-proof; prompt-injection via tool results is mitigated at the scope/destructive boundaries, not eliminated; CORRELATED MODEL FAILURE across supposedly-independent agents (same family sharing a blind spot) can defeat separation of powers — owned by the human operator via outer-loop sampling; unknown-unknown domain risk is accepted explicitly by the envelope choice. Envelope sizing on unknown risk remains human-owned: too wide risks blast radius, too narrow stalls runs.

## Rules

- No finding without a traced path.
- Secrets never enter the model context or logs.
- Residual risk is accepted by the named owner; this model does not claim an OS sandbox.
