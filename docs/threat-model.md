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

## Rules

- No finding without a traced path.
- Secrets never enter the model context or logs.
- Residual risk is accepted by the named owner; this model does not claim an OS sandbox.
