# Greybox Starter

Runnable browser greybox starter with a path-scoped split:

- `sim.js` — DOM-free deterministic fixed-step simulation. Seeded RNG (mulberry32), clamped accumulator, fixed `TICK = 1/60`. Runs under Node and in the browser.
- `render.js` — Canvas renderer. Interpolates between sim states with `alpha = acc / dt` (dt == TICK).
- `input.js` — Input action mapping: physical keys (`WASD` / arrow keys) → named actions (`forward`, `back`, `left`, `right`).
- `index.html` — Browser entry point wiring the three modules together.
- Zero dependencies. Vanilla JS.

## Run in browser

Open `games/starter/index.html` in a browser.

## Run the sim under Node (deterministic CLI)

```sh
node games/starter/sim.js --ticks 600 --seed 7
# stateHash:<hex>
```

Same `--seed` and `--ticks` print an identical hash on every run.

## Syntax check

```sh
node --check games/starter/*.js
```

## Notes

- The sim is intentionally DOM-free so it is deterministic and testable under Node.
- Rendering and input are browser-only (DOM/Canvas) and import the sim.
