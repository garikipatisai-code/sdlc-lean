# Web multiplayer

Multiplayer is a server-authority problem, not a transport problem. The server
owns the world state; the client owns input and renders a prediction. Pick the
transport after the authority model; never let the client own state it can cheat.

## Decision tree

```text
Does the game need real-time shared state?
├─ No  → turn-based / async: WebSocket + server validation, or Nakama/Supabase.
└─ Yes
   ├─ 2–8 players, casual/co-op, host trust OK?
   │   → managed rooms (Colyseus/Nakama) + WebSocket default.
   └─ Competitive / 16+ / latency-sensitive
       → authoritative dedicated server near players
         + WebSocket default, WebTransport datagram fallback
         + fixed-tick sim, prediction + reconciliation, lag comp capped
         + interest management + server-side rate limits.
```

## Authority loop

1. Client stamps each input with a sequence number and sends it.
2. Server simulates the authoritative world at a fixed tick (15–20 Hz casual,
   30 Hz competitive).
3. Server broadcasts snapshots (tick, entities, acknowledged input seq).
4. Client rewinds/replays unacknowledged inputs from the last ack (client
   prediction + server reconciliation).
5. Client renders remotes one tick in the past from an interpolation buffer
   (interpolated remotes).
6. Server rewinds targets for lag compensation, capped (~250–500 ms) to limit
   spoofing.

## Sanitized inputs (never trust the wire)

- Clamp/NaN-sanitize all numbers; validate enums and string lengths.
- Reject impossible movement, speed caps, out-of-order/duplicate seqs.
- Server-side rules only: client never kills, spends, grants, or sets health/score/inventory/currency.
- Rate-limit per client; log suspicious input for audit.

## Transport (WebSocket default, fallback)

| Transport | Delivery | Browser support | Use |
|---|---|---|---|
| **WebSocket** | TCP, ordered | Universal | Default: turn-based, lobbies, moderate snapshot rates, fallback |
| **WebTransport** | HTTP/3 datagrams + streams | ~91.6% global; Safari/iOS 26.4+ | Competitive action snapshots; keep WS fallback |
| **WebRTC data channel** | UDP-like | Broad; needs signalling/STUN/TURN | P2P prototypes; relay cost is real |

WebSocket head-of-line blocking is fine at modest snapshot rates, not at 60 Hz
on lossy networks. Always test the WebTransport → WebSocket fallback path.

## Stack defaults

- **Turn-based**: Nakama authoritative match or Supabase Realtime; validate and
  persist moves; no prediction/interpolation.
- **2–4 co-op**: Colyseus on one region, WebSocket, 15–20 Hz, interpolate remotes,
  prediction optional, no lag compensation.
- **Competitive 16+**: Colyseus or custom Node/Go on Edgegap/GameFabric; 30 Hz
  sim; WebSocket default with WebTransport fallback; prediction/reconciliation;
  lag comp capped 250–500 ms; server-side input sanitization and rate limits.

## Checklist

- [ ] Authority model documented; client cannot own health, score, inventory, or currency.
- [ ] Inputs sequenced, validated, rate-limited; impossible values rejected.
- [ ] Prediction + reconciliation for local player; remotes interpolated.
- [ ] Lag compensation capped and logged; no unbounded rewind.
- [ ] Interest management / spatial partitioning for 16+ players.
- [ ] Reconnect restores from last authoritative snapshot, not client state.
- [ ] Transport fallback tested (WebTransport → WebSocket).
- [ ] Load test at target CCU; measure server tick overrun and per-client bandwidth.

## Sources

- https://developer.mozilla.org/en-US/docs/Web/API/WebSockets
- https://docs.colyseus.io/server/transport ; https://docs.colyseus.io/netcode/lag-compensation
- https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html
- https://www.gabrielgambetta.com/entity-interpolation.html
- https://heroiclabs.com/docs/nakama/concepts/multiplayer/authoritative/
