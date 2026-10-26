# Web game netcode

Multiplayer is a server-authority problem, not a transport problem. Pick the
transport after the authority model; never let the client own state it can cheat.

## Decision tree

```text
Does the game need real-time shared state?
├─ No  → turn-based / async: WebSocket + server validation, or Supabase/Nakama.
└─ Yes
   ├─ 2–8 players, casual/co-op, host trust acceptable?
   │   → managed rooms (Colyseus/Nakama/Playroom) + WebSocket.
   └─ Competitive / 16+ / latency-sensitive
       → authoritative dedicated server near players
         + WebTransport datagrams (WebSocket fallback)
         + 30 Hz sim, prediction + reconciliation, lag compensation
         + interest management + server-side rate limits.
```

## Transport reality (2026-10)

| Transport | Delivery | Browser support | Use |
|---|---|---|---|
| **WebSocket** | TCP, ordered | Universal | Default: turn-based, lobbies, moderate snapshot rates, fallback |
| **WebTransport** | HTTP/3 datagrams + streams | ~91.6% global; Safari/iOS 26.4+ | Competitive action; unreliable snapshots; always keep WS fallback |
| **WebRTC data channel** | UDP-like, ordered/unordered | Broad, but signalling + STUN/TURN ops | P2P/low-latency prototypes; NAT/relay cost is real |

WebSocket head-of-line blocking is tolerable at modest snapshot rates, not at
60 Hz action on lossy networks. WebTransport is the only HTTP/3-based API for
unreliable datagrams; WebRTC data channels also support unreliable/unordered
delivery but need signalling/STUN/TURN, and older iOS still needs the WebSocket
fallback.

## Authority loop

1. Client stamps each input with a sequence number and sends it.
2. Server simulates the authoritative world at a fixed tick.
3. Server broadcasts snapshots (tick, entities, acknowledged input seq).
4. Client rewinds/replays unacknowledged inputs from the last ack (prediction).
5. Client renders remotes one tick in the past with an interpolation buffer.
6. Server rewinds targets for lag compensation, capped (~250–500 ms) to limit
   spoofing; validate every field and rate-limit.

```text
client: input(seq) → predict locally → send
server: validate → simulate tick → snapshot(ackSeq)
client: drop acked inputs → replay pending inputs → interpolate remotes
```

- **Never trust the wire**: clamp/NaN-sanitize numbers, validate enums and
  lengths, reject impossible movement, never let the client kill, spend, or grant.
- **Tick rate**: 15–20 Hz for casual co-op, 30 Hz for competitive action; render
  interpolation hides the gap. Do not confuse tick rate with render rate.
- **Interest management**: per-client visibility/priority; spatial partition or
  grid; do not broadcast the whole world to every client.
- **Reconnect**: mobile backgrounding kills sockets; allow a reconnection window
  and restore from the last authoritative snapshot, not client state.
- **Anti-cheat basics**: server-side rules, input sanitization, rate limits,
  sequence validation, movement speed caps, and audit logs. Client obfuscation is
  not security.

## Framework / service matrix

| Option | Transport | Authority model | License | Best fit |
|---|---|---|---|---|
| **Colyseus 0.18** | WS/uWS/WebTransport/Bun | Authoritative rooms; prediction + lag comp built in | MIT | 2–16 player real-time JS |
| **Nakama** | WS (+ gRPC/REST meta) | Authoritative match handler, fixed tick; relayed mode | Apache-2.0 | Meta + turn-based + session servers |
| **Geckos.io** | WebRTC datachannel | None; you write it | BSD-3 | Low-level UDP prototyping |
| **Playroom Kit** | Managed WS | Host-authoritative default | Unverified | 2–8 player casual/co-op/jams |
| **Photon** | WS/UDP cloud | Relay or server-authoritative plugins | Proprietary | Unity/web cross-play |
| **Edgegap / GameFabric** | Your server's transport | Hosts dedicated servers | Commercial | Orchestration at 16+ players |
| **Supabase Realtime** | WS | None (DB rules) | OSS/commercial | Turn-based, lobbies, chat |
| **Firebase RTDB** | WS | None (rules) | Proprietary | Async/turn-based only |

**Hathora shut down 2026-05-05** (team joined Fireworks AI; customers moved to
Nitrado GameFabric). Do not design around it.

## Stack defaults

- **Turn-based**: Nakama authoritative match or Supabase Realtime; validate and
  persist moves; no prediction/interpolation.
- **2–4 co-op**: Colyseus on one region, WebSocket, 15–20 Hz, interpolate remotes,
  prediction optional, no lag compensation.
- **Competitive 16+**: Colyseus or custom Node/Go on Edgegap/GameFabric; 30 Hz
  sim; WebTransport + WS fallback; prediction/reconciliation; lag comp capped
  250–500 ms; `StateView`/AOI; region-aware matchmaking; server-side input
  sanitization and rate limits.

## S-tier netcode checklist

- [ ] Authority model documented; client cannot own health, score, inventory, or currency.
- [ ] Inputs sequenced, validated, rate-limited; impossible values rejected.
- [ ] Prediction + reconciliation for the local player; remotes interpolated.
- [ ] Lag compensation capped and logged; no unbounded rewind.
- [ ] Interest management / spatial partitioning for 16+ players.
- [ ] Reconnect path for mobile backgrounding; server restores state.
- [ ] Transport fallback tested (WebTransport → WebSocket).
- [ ] Load test at target CCU; measure server tick overrun and bandwidth/client.
- [ ] Matchmaking/region strategy; observability for RTT, loss, tick drift.
- [ ] Anti-cheat rules server-side; audit trail for suspicious input.

## Sources

- https://developer.mozilla.org/en-US/docs/Web/API/WebTransport ; https://caniuse.com/webtransport
- https://docs.colyseus.io/server/transport ; https://docs.colyseus.io/netcode/lag-compensation
- https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html
- https://www.gabrielgambetta.com/entity-interpolation.html
- https://heroiclabs.com/docs/nakama/concepts/multiplayer/authoritative/
- https://github.com/geckosio/geckos.io
- https://www.gamespress.com/en-US/Nitrado-and-Hathora-collaborate-on-customer-transition-to-GameFabric
- https://edgegap.com/pricing ; https://www.photonengine.com/pricing
- https://supabase.com/docs/guides/realtime
