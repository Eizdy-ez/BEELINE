// Keyboard and mouse input: held keys steer the bee, discrete presses become actions the
// game loop consumes once. Nothing here knows the rules; it only reports what the player did.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_MUTE = 8;

const KEY_ACTIONS = {
  Enter: ACTION_CONFIRM,
  Space: ACTION_CONFIRM | ACTION_DASH,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  ShiftLeft: ACTION_DASH,
  ShiftRight: ACTION_DASH,
  KeyM: ACTION_MUTE,
};

export function createInput(target) {
  const held = new Set();
  let pending = 0;
  let pointer = null;

  function onKeyDown(event) {
    if (event.repeat) return;
    held.add(event.code);
    const action = KEY_ACTIONS[event.code];
    if (action) pending |= action;
    if (event.code.startsWith('Arrow') || event.code === 'Space') event.preventDefault();
  }
  function onKeyUp(event) {
    held.delete(event.code);
  }
  function onPointerDown(event) {
    pointer = { x: event.clientX, y: event.clientY };
    pending |= ACTION_CONFIRM | ACTION_DASH;
  }
  function onPointerMove(event) {
    if (pointer) pointer = { x: event.clientX, y: event.clientY };
  }
  function onPointerUp() {
    pointer = null;
  }
  function onBlur() {
    held.clear();
    pointer = null;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  target.addEventListener('pointerdown', onPointerDown);
  target.addEventListener('pointermove', onPointerMove);
  target.addEventListener('pointerup', onPointerUp);

  return {
    /** Held-key flight direction as a unit-ish vector: WASD and the arrow keys both fly. */
    direction() {
      let x = 0;
      let y = 0;
      if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
      if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
      if (held.has('KeyW') || held.has('ArrowUp')) y -= 1;
      if (held.has('KeyS') || held.has('ArrowDown')) y += 1;
      return { x, y };
    },
    /** Where the pointer is held, in canvas pixels, or null: the bee steers toward it. */
    pointer() {
      return pointer;
    },
    /** Consume the discrete presses since the last call (confirm, pause, dash, mute). */
    takeActions() {
      const actions = pending;
      pending = 0;
      return actions;
    },
  };
}
