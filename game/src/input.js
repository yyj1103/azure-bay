// Keyboard and mouse input. Held keys give steering and movement; one-shot
// presses (start, pause, enter car, shoot, switch weapon, radio, horn) are queued
// as bit flags and taken once by the loop, so a press between frames is never
// lost and never counted twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER_CAR = 4;
export const ACTION_SHOOT = 8;
export const ACTION_HORN = 16;
export const ACTION_RADIO = 32;
export const ACTION_CREW = 64;

const FORWARD = new Set(['KeyW', 'ArrowUp']);
const BACK = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER_CAR = new Set(['KeyE', 'KeyF']);
const HORN = new Set(['KeyH']);
const RADIO = new Set(['KeyR']);
const CREW = new Set(['KeyQ']);
const WEAPON_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'];

export function createInput(canvas) {
  let fwd = false; let back = false; let left = false; let right = false;
  let shift = false; let actions = 0; let weaponSlot = -1;
  let mouseDown = false; let mouseX = 0;

  window.addEventListener('keydown', (event) => {
    if (FORWARD.has(event.code)) fwd = true;
    else if (BACK.has(event.code)) back = true;
    else if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') shift = true;
    else if (CONFIRM.has(event.code)) { if (!event.repeat) actions |= ACTION_CONFIRM; }
    else if (PAUSE.has(event.code)) { if (!event.repeat) actions |= ACTION_PAUSE; }
    else if (ENTER_CAR.has(event.code)) { if (!event.repeat) actions |= ACTION_ENTER_CAR; }
    else if (HORN.has(event.code)) { if (!event.repeat) actions |= ACTION_HORN; }
    else if (RADIO.has(event.code)) { if (!event.repeat) actions |= ACTION_RADIO; }
    else if (CREW.has(event.code)) { if (!event.repeat) actions |= ACTION_CREW; }
    else if (WEAPON_KEYS.includes(event.code)) { weaponSlot = WEAPON_KEYS.indexOf(event.code); }
    else return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (FORWARD.has(event.code)) fwd = false;
    else if (BACK.has(event.code)) back = false;
    else if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') shift = false;
  });
  window.addEventListener('blur', () => { fwd = back = left = right = shift = mouseDown = false; });
  canvas.addEventListener('mousedown', (event) => { mouseDown = true; mouseX = event.clientX; });
  window.addEventListener('mouseup', () => { mouseDown = false; });
  canvas.addEventListener('click', () => { actions |= ACTION_CONFIRM; });

  return {
    drive() { return { throttle: (fwd ? 1 : 0) - (back ? 0.7 : 0), steer: (left ? 1 : 0) - (right ? 1 : 0), brake: back, boost: shift }; },
    walk() { return { x: (right ? 1 : 0) - (left ? 1 : 0), z: (back ? 1 : 0) - (fwd ? 1 : 0), run: shift }; },
    shooting() { return mouseDown; },
    takeActions() { const t = actions; actions = 0; return t; },
    takeWeaponSlot() { const t = weaponSlot; weaponSlot = -1; return t; },
  };
}
