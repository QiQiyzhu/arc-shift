import { expect, it, vi } from 'vitest';
import { ActionInput, type PadSnapshot } from '../src/input/actions';
import {
  DEFAULT_BINDINGS,
  loadBindings,
  persistBindings,
  validateBindings,
} from '../src/input/bindings';
import { Engine } from '../src/game/engine';
import { blankSave } from '../src/core/save';
import { checksum } from '../src/replay/replay';
const pointer = { x: 940, y: 400, fire: false },
  player = { x: 640, y: 400 };
const pad = (): PadSnapshot => ({
  connected: true,
  index: 0,
  mapping: 'standard',
  axes: [0, 0, 0, 0],
  buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
});
function press(p: PadSnapshot, ...ids: number[]) {
  for (const id of ids) p.buttons[id].pressed = true;
}
it('retains an entire down/up between 144 Hz renders until a simulation tick consumes it once', () => {
  const controls = new ActionInput();
  controls.keyDown('Space');
  controls.keyUp('Space');
  let accumulated = 0,
    activations = 0,
    steps = 0;
  for (let frame = 0; frame < 144; frame++) {
    accumulated += 1 / 144;
    const input = controls.sample(pointer, player);
    while (accumulated >= 1 / 60) {
      activations += Number(input.dash);
      steps++;
      controls.consumeStep();
      input.dash = false;
      accumulated -= 1 / 60;
    }
  }
  expect(steps).toBeGreaterThanOrEqual(59);
  expect(activations).toBe(1);
  expect(controls.sample(pointer, player).dash).toBe(false);
});
it('held keys, catch-up steps and independent pause consumption do not repeat skills', () => {
  const controls = new ActionInput();
  controls.keyDown('KeyQ');
  controls.keyDown('Escape');
  expect(controls.consumePause()).toBe(true);
  expect(controls.consumePause()).toBe(false);
  expect(controls.sample(pointer, player).q).toBe(true);
  controls.consumeStep();
  controls.keyDown('KeyQ');
  expect(controls.sample(pointer, player).q).toBe(false);
  controls.keyUp('KeyQ');
  controls.keyDown('KeyQ');
  expect(controls.sample(pointer, player).q).toBe(true);
});
it('applies conflict-free bindings atomically and does not leak mutable configuration references', () => {
  const controls = new ActionInput(),
    next = structuredClone(DEFAULT_BINDINGS);
  next.keys.Dash = ['KeyJ'];
  controls.setBindings(next);
  next.keys.Dash[0] = 'KeyL';
  controls.keyDown('Space');
  expect(controls.sample(pointer, player).dash).toBe(false);
  controls.keyDown('KeyJ');
  expect(controls.sample(pointer, player).dash).toBe(true);
  const conflict = controls.bindings;
  conflict.keys.Dash = ['KeyQ'];
  expect(() => controls.setBindings(conflict)).toThrow('冲突');
  expect(controls.bindings.keys.Dash).toEqual(['KeyJ']);
  for (const patch of [
    { deadzone: NaN },
    { deadzone: 0 },
    { version: 2 },
    { extra: 1 },
  ])
    expect(() => validateBindings({ ...DEFAULT_BINDINGS, ...patch })).toThrow();
  const badPad = structuredClone(DEFAULT_BINDINGS);
  badPad.gamepad.Dash = 7;
  expect(() => validateBindings(badPad)).toThrow('标准按钮');
});
it('uses deadzones, finite axes and a player-relative last aim direction with mouse fallback', () => {
  const controls = new ActionInput(),
    p = pad();
  p.axes = [0.1, -0.1, NaN, Infinity];
  controls.pollGamepad(p);
  expect(controls.sample(pointer, player)).toMatchObject({
    x: 0,
    y: 0,
    aimX: 940,
    aimY: 400,
  });
  p.axes = [0.7, 0, 0, 1];
  controls.pollGamepad(p);
  expect(controls.sample(pointer, player)).toMatchObject({
    x: 0.7,
    y: 0,
    aimX: 640,
    aimY: 700,
  });
  p.axes = [0, 0, 0, 0];
  controls.pollGamepad(p);
  expect(controls.sample(pointer, { x: 800, y: 500 })).toMatchObject({
    aimX: 800,
    aimY: 800,
  });
  controls.pollGamepad(null);
  expect(controls.lastDevice).toBe('keyboard');
  expect(controls.sample(pointer, player)).toMatchObject({
    aimX: 940,
    aimY: 400,
  });
  expect(
    controls.sample({ x: 300, y: 150, fire: false }, player),
  ).toMatchObject({ aimX: 300, aimY: 150 });
  p.mapping = '';
  controls.pollGamepad(p);
  expect(controls.connected).toBe(false);
});
it('polls all standard buttons, ignores hold-repeat and keeps keyboard edges on disconnect', () => {
  const controls = new ActionInput(),
    p = pad();
  press(p, 0, 2, 3, 4, 5, 7, 9);
  controls.pollGamepad(p);
  expect(controls.sample(pointer, player)).toMatchObject({
    fire: true,
    dash: true,
    q: true,
    e: true,
    bomb: true,
    heal: true,
  });
  expect(controls.consumePause()).toBe(true);
  controls.consumeStep();
  controls.pollGamepad(p);
  expect(controls.sample(pointer, player)).toMatchObject({
    fire: true,
    dash: false,
    q: false,
    bomb: false,
  });
  controls.keyDown('KeyQ');
  controls.pollGamepad(null);
  expect(controls.sample(pointer, player)).toMatchObject({
    fire: false,
    q: true,
  });
});
it('dialog suppression clears queued actions and does not reinterpret a held pad button as a new press', () => {
  const controls = new ActionInput(),
    p = pad();
  press(p, 0);
  controls.keyDown('KeyD');
  controls.keyDown('KeyQ');
  controls.pollGamepad(p);
  controls.suppress();
  controls.pollGamepad(p);
  expect(controls.sample(pointer, player)).toMatchObject({
    x: 0,
    q: false,
    dash: false,
  });
  p.buttons[0].pressed = false;
  controls.pollGamepad(p);
  p.buttons[0].pressed = true;
  controls.pollGamepad(p);
  expect(controls.sample(pointer, player).dash).toBe(true);
});
it('rebaselines a held pad after a focus polling gap without swallowing a new keyboard action', () => {
  const controls = new ActionInput(),
    p = pad();
  controls.pollGamepad(p);
  controls.suppress(); // The window loses focus; polling may now be suspended.
  controls.keyDown('Space'); // A real key press after focus, before the next RAF.
  press(p, 9, 2);
  controls.pollGamepad(p, true);
  expect(controls.consumePause()).toBe(false);
  expect(controls.sample(pointer, player)).toMatchObject({
    dash: true,
    bomb: false,
  });
  controls.consumeStep();
  controls.pollGamepad(p);
  expect(controls.consumePause()).toBe(false);
  p.buttons[9].pressed = false;
  controls.pollGamepad(p);
  p.buttons[9].pressed = true;
  controls.pollGamepad(p);
  expect(controls.consumePause()).toBe(true);
});
it('reconnecting or replacing a held controller does not repeat pause or spend another bomb', () => {
  const controls = new ActionInput(),
    p = pad();
  controls.pollGamepad(p);
  press(p, 9, 2);
  controls.pollGamepad(p);
  expect(controls.consumePause()).toBe(true);
  expect(controls.sample(pointer, player).bomb).toBe(true);
  controls.consumeStep();
  controls.pollGamepad(null);
  controls.keyDown('KeyQ');
  controls.pollGamepad(p);
  expect(controls.consumePause()).toBe(false);
  expect(controls.sample(pointer, player)).toMatchObject({
    q: true,
    bomb: false,
  });
  controls.consumeStep();
  p.index = 1;
  controls.pollGamepad(p);
  expect(controls.consumePause()).toBe(false);
  expect(controls.sample(pointer, player).bomb).toBe(false);
  p.buttons[2].pressed = p.buttons[9].pressed = false;
  controls.pollGamepad(p);
  press(p, 9, 2);
  controls.pollGamepad(p);
  expect(controls.consumePause()).toBe(true);
  expect(controls.sample(pointer, player).bomb).toBe(true);
});
it('preserves core simulation results for the same legacy keyboard/mouse actions', () => {
  const a = new Engine({ save: blankSave(), persistence: false }),
    b = new Engine({ save: blankSave(), persistence: false });
  for (const engine of [a, b]) {
    engine.startPractice(['fire-ember'], 'arc', true);
    engine.world.phase = 'playing';
  }
  const controls = new ActionInput();
  controls.keyDown('KeyD');
  controls.keyDown('Space');
  controls.keyDown('KeyQ');
  controls.keyDown('KeyE');
  for (let tick = 0; tick < 120; tick++) {
    const mouse = { ...pointer, fire: true };
    a.update(1 / 60, controls.sample(mouse, a.world.player));
    controls.consumeStep();
    b.update(1 / 60, {
      x: 1,
      y: 0,
      aimX: mouse.x,
      aimY: mouse.y,
      fire: true,
      dash: tick === 0,
      q: tick === 0,
      e: tick === 0,
      bomb: false,
      heal: false,
    });
  }
  expect(checksum(a)).toBe(checksum(b));
});
it('falls back safely for corrupt or inaccessible binding storage without touching gameplay saves', () => {
  vi.stubGlobal('localStorage', {
    getItem: () => '{bad',
    setItem: () => {
      throw Error('denied');
    },
  });
  try {
    expect(loadBindings()).toEqual(DEFAULT_BINDINGS);
    expect(persistBindings(DEFAULT_BINDINGS)).toBe(false);
  } finally {
    vi.unstubAllGlobals();
  }
});
