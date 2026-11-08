// games/starter/input.js
//
// Input action mapping: maps physical keys to named actions.
// DOM-dependent (browser only). Zero dependencies.

const KEY_TO_ACTION = {
  ArrowUp: 'forward',
  KeyW: 'forward',
  ArrowDown: 'back',
  KeyS: 'back',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

const ACTIONS = ['forward', 'back', 'left', 'right'];

export function createInput() {
  const held = new Set();

  const onDown = (event) => {
    const action = KEY_TO_ACTION[event.code];
    if (action) held.add(action);
  };
  const onUp = (event) => {
    const action = KEY_TO_ACTION[event.code];
    if (action) held.delete(action);
  };

  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);

  return {
    get: () => ({
      forward: held.has('forward'),
      back: held.has('back'),
      left: held.has('left'),
      right: held.has('right'),
    }),
    actions: () => ACTIONS.filter((a) => held.has(a)),
    off: () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    },
  };
}
