# Toolchain matrix — SOTA primary and fallbacks

REA covers most classes through its providers. Drop below it when (a) REA lacks
the capability, (b) a provider is unavailable, (c) the job is corpus-scale, or
(d) validation needs a second engine. Licenses are listed to pick compliant
options; installs still follow `acquiring-capabilities` approval.

## Capability gaps — things REA does not provide

| Capability | Tools | License | Use when |
|---|---|---|---|
| Symbolic / concolic execution | [angr](https://github.com/angr/angr), [Triton](https://github.com/JonathanSalwan/Triton), [miasm](https://github.com/cea-sec/miasm) | BSD-2, Apache-2.0, GPL-2.0 | Path exploration, key/constraint recovery, input synthesis. Manticore is archived (Jun 2026) — do not plan on it |
| Coverage-guided fuzzing | [AFL++](https://github.com/AFLplusplus/AFLplusplus), [honggfuzz](https://github.com/google/honggfuzz), libFuzzer | AGPL-3.0, Apache-2.0, Apache-2.0 | Corpus generation for differential validation, crash triage |
| OS-less / foreign emulation | [Qiling](https://github.com/qilingframework/qiling), [Unicorn](https://github.com/unicorn-engine/unicorn), [Speakeasy](https://github.com/mandiant/speakeasy), QEMU | GPL-2.0, GPL-2.0, MIT, GPL-2.0 | Run code without its OS; build equivalence harnesses |
| Dynamic instrumentation beyond sessions | [Frida](https://frida.re/) raw scripting | custom license (LGPL-style; GitHub reports NOASSERTION) | Hooking when REA's session tools are too coarse |
| Corpus diffing / similarity | [BinDiff](https://github.com/google/bindiff) + [BinExport](https://github.com/google/binexport), [Ghidra BSim](https://github.com/NationalSecurityAgency/ghidra), [Diaphora](https://github.com/joxeankoret/diaphora), ssdeep/TLSH | Apache-2.0, Apache-2.0, Apache-2.0, AGPL-3.0, GPL-2.0/BSD | Patch analysis, n-day diffing, zoo dedup |
| Malware triage at scale | [capa](https://github.com/mandiant/capa), [YARA-X](https://github.com/VirusTotal/yara-x), FLARE-VM, REMnux | Apache-2.0, BSD-3, Apache-2.0, free distro | Capability ID, rules, isolated lab |
| Hardware I/O | [OpenOCD](https://github.com/openocd-org/openocd), [sigrok/PulseView](https://sigrok.org/), SVD maps | GPL-2.0, GPL-3.0, varies | JTAG/SWD dump, live capture (REA only decodes recordings) |
| Game / asset reversal | [AssetRipper](https://github.com/AssetRipper/AssetRipper), [UABEA](https://github.com/nesrak1/UABEA), [Il2CppDumper](https://github.com/Perfare/Il2CppDumper), [UnityPy](https://github.com/K0lb3/UnityPy), [RE-UE4SS](https://github.com/UE4SS-RE/RE-UE4SS), [CUE4Parse](https://github.com/FabianFG/CUE4Parse), [gdsdecomp](https://github.com/GDRETools/gdsdecomp), [quickbms](https://aluigi.altervista.org/quickbms.htm) | GPL-3.0, MIT, MIT, MIT, MIT, Apache-2.0, MIT, GPL-2.0 | Unity / Unreal / Godot / mixed game formats |
| Protector devirtualization | none reliable in OSS | — | VMProtect/Themida-class: manual + dynamic tracing only; deliver declared-partial |
| Kernel / crash-debug tooling | WinDbg, gdb + [pwndbg](https://github.com/pwndbg/pwndbg), lldb | free-closed, GPL-3.0, Apache-2.0 (LLVM ex.) | Live/kernel debugging beyond recorded cores |

## Drop-in per class when the REA route is unavailable

| Class | Tool | License | Note |
|---|---|---|---|
| Native decompile | [Ghidra](https://github.com/NationalSecurityAgency/ghidra) headless | Apache-2.0 | Default OSS engine; scriptable |
| Native, agent bridge | [LaurieWired/GhidraMCP](https://github.com/LaurieWired/GhidraMCP) · [bethington/ghidra-mcp](https://github.com/bethington/ghidra-mcp) | Apache-2.0 | 209 tools, P-code emulation in the latter |
| Native, IDA | [Hex-Rays ida-mcp](https://github.com/HexRaysSA/ida-mcp) · [mrexodia/ida-pro-mcp](https://github.com/mrexodia/ida-pro-mcp) | MIT | IDA license required; prefer official server |
| Native, FOSS CLI | [radare2](https://github.com/radareorg/radare2) + [r2mcp](https://github.com/radareorg/radare2-mcp) / [r2ai](https://github.com/radareorg/r2ai); [Rizin](https://github.com/rizinorg/rizin) | LGPL-3.0 / MIT | Readonly/sandbox modes available |
| Native, alternative decompiler | [rev.ng](https://github.com/revng/revng), [RetDec](https://github.com/avast/retdec) | GPL-2.0 + commercial UI, MIT | Cross-check engine for contested pseudocode |
| Android | [jadx](https://github.com/skylot/jadx), [apktool](https://github.com/iBotPeaches/Apktool), [jadx-ai-mcp](https://github.com/zinja-coder/jadx-ai-mcp), [MobSF](https://github.com/MobSF/Mobile-Security-Framework-MobSF), [objection](https://github.com/sensepost/objection), [Medusa](https://github.com/Ch0pin/medusa), [APKiD](https://github.com/rednaga/APKiD) | Apache-2.0, Apache-2.0, Apache-2.0, GPL-3.0, GPL-3.0, GPL-3.0, GPL-3.0 | APKiD first: packer detection picks the counter-tool |
| iOS / Apple | [ipsw](https://github.com/blacktop/ipsw), [libimobiledevice](https://github.com/libimobiledevice/libimobiledevice), plistlib | MIT, LGPL-2.1, stdlib | Mach-O, dyld cache, IPSW parsing |
| .NET | [dnSpyEx](https://github.com/dnSpyEx/dnSpy), [ILSpy](https://github.com/icsharpcode/ILSpy), [NETReactorSlayer](https://github.com/SychicBoy/NETReactorSlayer) | GPL-3.0, MIT, varies | dnSpy (original) and de4dot are archived — use these successors |
| Python bytecode | [pycdc](https://github.com/zrax/pycdc), [uncompyle6](https://github.com/rocky/python-uncompyle6) | GPL-3.0 | pycdc for modern versions |
| JS / Electron | [asar](https://github.com/electron/asar), [webcrack](https://github.com/j4k0xb/webcrack), [obfuscator-io-deobfuscator](https://github.com/ben-sb/obfuscator-io-deobfuscator), [wakaru](https://github.com/pionxzh/wakaru) | MIT, MIT, Apache-2.0, Apache-2.0 | wakaru is the same recovery engine REA uses — prefer REA's wrapper |
| JVM | [Vineflower](https://github.com/Vineflower/vineflower), [CFR](https://github.com/leibnitz27/cfr) | Apache-2.0, MIT | Java/Kotlin bytecode |
| WASM | [wabt](https://github.com/WebAssembly/wabt), [wasm-tools](https://github.com/bytecodealliance/wasm-tools), [Binaryen](https://github.com/WebAssembly/binaryen) | Apache-2.0 | wasm2c output can reuse C decompilers and emulators |
| EVM | [heimdall-rs](https://github.com/Jon-Becker/heimdall-rs), [whatsabi](https://github.com/shazow/whatsabi), [Panoramix fork](https://github.com/shooksphere/panoramix), [Slither](https://github.com/crytic/slither), [Foundry](https://github.com/foundry-rs/foundry), [Halmos](https://github.com/a16z/halmos) | MIT, MIT, MIT, AGPL-3.0, MIT/Apache-2.0, AGPL-3.0 | ABI/proxy recovery, static + symbolic checks |
| Firmware | [unblob](https://github.com/onekey-sec/unblob), [binwalk v3](https://github.com/ReFirmLabs/binwalk), [EMBA](https://github.com/e-m-b-a/emba), [FACT_core](https://github.com/fkie-cad/FACT_core), [FirmAE](https://github.com/pr0v3rbs/FirmAE), QEMU | MIT, MIT, GPL-3.0, GPL-3.0, MIT, GPL-2.0 | unblob is the modern default extractor; binwalk v2 fork is EOL |
| Network | [Wireshark/tshark](https://www.wireshark.org/), [mitmproxy](https://github.com/mitmproxy/mitmproxy), [Scapy](https://github.com/secdev/scapy) | GPL-2.0, MIT, GPL-2.0 | SAZ is a ZIP — parse directly when needed |

## Engines REA drives (bring-your-own)

Hopper, Ghidra, IDA, JADX, JEB (providers) · binwalk/unblob (firmware) · tshark
(captures) · sigrok-cli (signals) · pwntools (ELF layout, crash cores) · WABT
(WASM) · Apktool (Android resources) · adb (devices) · Frida (instrumentation).
Setup never installs these; report the missing prerequisite for the specific
task and continue with routes that work without it.

## Status corrections (verified 2026-10-13)

Archived or dead — never design around: Snowman (2023), de4dot (2020), dnSpy
(2020, use dnSpyEx), Manticore (Jun 2026). Superseded: binwalk v2 fork (EOL
2025-12) → binwalk v3; decompyle3 → rocky/python-decompile3. Low activity but
usable: RetDec (May 2026). Actively maintained despite age: FACT_core, rev.ng,
FirmAE, quickbms-adjacent tooling. Stale upstreams (checked 2026-10-13):
Il2CppDumper (last push 2024-08 — still the il2cpp metadata standard, verify
before new work); palkeo/panoramix (2024-08 — use the maintained fork
shooksphere/panoramix).

Treat license/activity claims here as pointers, not guarantees: re-verify a
tool's repository before installing or recommending it.
