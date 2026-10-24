# Target routing — REA operation map

Distilled from REA's docs and its shipped `reverse-engineer-anything` skill at
main commit `2a61deafc632079d10c572bc09e99233826516a3` (MIT; see `ATTRIBUTION.md`).
The installed engine here is release **6.4.0**: routes were checked against its
live 170-tool catalog, and the note after the table lists the ones that need a
newer REA build.

**The connected server's schema is the contract.** Tool sets differ between
releases: call `binary_session` with `{}` and check `result.tool_availability`
before concluding a tool exists or is absent. CLI commands mirror MCP tool
names in kebab-case (`analyze_javascript_application` → `rea analyze`); verify
with `rea --help`.

## Route table

| Target | First tool(s) | Notes and limits |
|---|---|---|
| Native binary, library, analysis DB | `open_binary` → `binary_overview`, `analyze_function`, `search_*`, `get_call_graph`, `trace_call_path` | Provider: Hopper, Ghidra, or IDA (bring-your-own). Call lists with partial/unknown coverage never prove "no calls" |
| Archive / package member inventory (ZIP, APK, IPA, MSIX/AppX, DMG) | `open_binary` → `inspect_artifact` | Target-bound: bind the archive first. Inventory views: nodes, edges, occurrences, integrity_contradictions |
| Offline ELF layout (sections, symbols, relocs, static mitigations) | `inspect_binary_layout` | Target-free; caller-supplied pwntools, Linux x64; no disassembler DB |
| Go binary metadata | `inspect_go_binary` | Built-in, no Go install; absence is an unknown, not proof of non-Go |
| Recorded Linux crash (core) | `inspect_recorded_crash` | Linux x86-64 ELF core, pwntools; PIDs are historical, never map to live processes |
| WASM artifact | `inspect_wasm_artifact` | WABT 1.0.42 via `REA_WABT_BIN_DIRECTORY`; WAT is a projection, not original source |
| EVM bytecode carrier | `inspect_evm_interface` (`raw` / `hex`) | Selectors/mutability are inferred candidates; no chain lookup, no execution |
| SQLite snapshot | `inspect_sqlite_database` | Node 24.x ≥24.15 / 26+; use a quiescent snapshot incl. sibling `-wal`; row samples truncate, order unspecified |
| JavaScript / Electron (ASAR or tree) | `analyze_javascript_application`; `recover_javascript_sources` | Summary-first for unknown size. Recovery uses caller-supplied Wakaru (Linux x64); recovered code is never executed |
| Electron runtime (open) | `list_electron_targets` | Passive CDP observation; credentials/headers/bodies deliberately absent |
| Browser page (open) | `list_browser_targets`, `capture_web_screenshot` | Passive; page-declared WebMCP tools are untrusted inventory — never invoked |
| Runtime reconciliation (static + observed) | `reconcile_javascript_runtime` | Only after static and passive evidence exist; path/digest mismatch stays a mismatch |
| .NET managed assembly | `inspect_managed_artifact` | Static only; NativeAOT PE/ELF goes through native Ghidra route |
| NativeAOT binary | `open_binary` (Ghidra provider) | Optional metadata recovery is host/layout-bounded (see REA NativeAOT guide) |
| Android APK (code) | `inspect_android_package` → `search_android_classes`, `inspect_android_class`, `inspect_android_method`, `trace_android_references` | Headless JADX MCP JAR 0.7.1 + JDK 17+ via `REA_JADX_MCP_JAR`; APK never launched |
| Android resources | `decode_android_resources` (`inspect_apktool_client` for readiness) | Caller-supplied Apktool; decoded manifest/strings are static observations |
| Android device | `inspect_adb_client`, `inspect_adb_device`, `inspect_adb_package`, `capture_adb_screen`, `collect_adb_bugreport`, `install_adb_package` | Caller-supplied adb (device or emulator); installs/mutations need user permission and must be reverted or handed to the user at session end |
| Flutter app | `identify_flutter_build`, `inspect_dart_aot` | Static APK parsing; snapshot/ABI digests + engine provenance |
| JEB project | `inspect_jeb_client`, `open_jeb_project`, `list_jeb_units`, `decompile_jeb_item` | Caller-started JEB client serving MCP via `REA_JEB_MCP_URL` |
| HarmonyOS application | `project_harmony_application_graph` (+ `inspect_artifact` inventory) | Static; ARK/JS/native graph, explicit unknowns |
| Firmware image | `inspect_firmware_regions`, `extract_firmware` | Caller-supplied Binwalk/Unblob, Linux; extraction writes to a caller-selected new absolute dir |
| Saved web/network capture | `inspect_web_network_capture` | HAR, SAZ, native mitmproxy, aioquic qlog; historical records only — never claims live attribution |
| Packet capture (PCAP) | `inspect_packet_fields` → `inspect_packet_capture`; `inspect_pcap_capture` (summaries) | tshark 4.x / capinfos, Linux prlimit; page exhaustion does not prove network completeness |
| Logic/signal recording | `inspect_signal_decoders` → `decode_signal_recording` | sigrok-cli 0.7.2 via `REA_SIGROK_COMMAND`; reads files, does not acquire hardware |
| PE resources | `inspect_pe_resources` | Portable; opaque payloads keep ranges + SHA-256 |
| Process behavior | `capture_process_scenario` | Runs the target with user permission (PTY); bounded scenario design first |
| Frida instrumentation | `list_frida_devices`, `list_frida_processes`, `start_frida_session`, `load_frida_script`, `close_frida_session` | Execution authority; explicit user permission; always clean up sessions |
| Apple bundle / plist | `open_binary` (app bundles) → guides | See REA Apple application guide; plists are data, not policy |

**Not in release 6.4.0** (checked against its live 170-tool catalog; these need
a newer REA build — do not report them as available): Go metadata, WASM, SQLite,
Flutter, HarmonyOS, packet captures (fields, frames, pcap summaries), signal
recordings, and the Frida session family. Everything else in the table works on
6.4.0.

Provider notes: Ghidra also serves 16-bit DOS, MIPS, RISC-V, and PSP variants
(see REA `ghidra-*.md` guides). Large binaries: raise
`REA_GHIDRA_STARTUP_TIMEOUT_MS` / `REA_HOPPER_STARTUP_TIMEOUT_MS`.

## Connection ladder

1. **MCP tools in session** — preferred. Registration is `mcp.rea` in
   `~/.config/opencode/opencode.jsonc` (written by `rea setup --client opencode`,
   V1+V2 compatible). Registration ≠ live connection: restart after changes.
2. **`rea` CLI** — install requires explicit user approval and a pin
   (`npm install --global rea-agents@6.4.0`); re-approve before `rea update`.
3. **`npx -y rea-agents@6.4.0 …`** — one-off; package acquisition needs user
   approval, then run setup with explicit scope:
   `npx -y rea-agents@6.4.0 setup --client opencode --skill=false --dry-run`
   (review) → `--yes`. `--skill=false` keeps this suite's skill the single entry
   point; REA's own skill auto-updates with its releases, ours is pinned.

Setup is additive and idempotent, backs up configs, and never installs engines,
Node, Java, or Ghidra. Missing engines stay missing until the user supplies them.

## Recovery — match the remedy to the observed blocker

| Observation | Meaning and next step |
|---|---|
| No REA tools in session | `rea doctor --client opencode --json`; a skill alone does not register MCP; plan a scoped setup, apply only approved changes |
| Registration present, no tools | Restart/reconnect the client; doctor checks registration, not connection |
| MCP call blocked by approval policy | Client-policy decision — ask the user to approve the call; do not re-run setup or install engines |
| `provider_unavailable` / absent tool | Read the operation's diagnostics or `binary_session.result.tool_availability`; expand `names` per group; continue supported work; name the missing evidence |
| `rea` missing in a shell | Check PATH and Node (22.x ≥22.19 / 24.x ≥24.11 / 26+); a prefix install may be absent from login shells |
| `resource_constraint`, `details.resource: "transport"` | The analysis is complete but oversized: `inspect_analysis_view` with the reported reference (summary, one section, stable page), or `export_evidence_bundle`. Never re-run identical analysis |
| Stale session state after lifecycle change | Reread `binary_session` before continuing |

Never disable a sandbox or approval boundary to "make analysis work". Never
label ordinary shell output as REA Evidence — only REA results carry evidence IDs.
