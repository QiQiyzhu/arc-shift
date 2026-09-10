import type { Input } from '../game/types';
import {
  BUTTON_ACTIONS,
  DEFAULT_BINDINGS,
  KEY_ACTIONS,
  validateBindings,
  type Bindings,
  type ButtonAction,
} from './bindings';
export interface PadSnapshot {
  connected: boolean;
  mapping: string;
  index: number;
  axes: readonly number[];
  buttons: readonly { pressed: boolean; value: number }[];
}
const axis = (v: number | undefined) =>
  Number.isFinite(v) ? Math.max(-1, Math.min(1, v!)) : 0;
const skill = (action: ButtonAction) => action !== 'PrimaryAttack';
/** Device state and latched action edges, independent of Phaser and simulation rules. */
export class ActionInput {
  private config: Bindings;
  private held = new Set<string>();
  private keyboardEdges = new Set<ButtonAction>();
  private padEdges = new Set<ButtonAction>();
  private padHeld = new Set<ButtonAction>();
  private padIndex: number | null = null;
  private padSeen = false;
  private move = { x: 0, y: 0 };
  private aim = { x: 1, y: 0 };
  private aiming = false;
  private aimDevice: 'mouse' | 'gamepad' = 'mouse';
  private pointer?: { x: number; y: number; fire: boolean };
  connected = false;
  lastDevice: 'keyboard' | 'gamepad' = 'keyboard';
  constructor(config = DEFAULT_BINDINGS) {
    this.config = validateBindings(config);
  }
  get bindings() {
    return structuredClone(this.config);
  }
  get mouseAttack() {
    return this.config.mouseAttack;
  }
  setBindings(value: unknown) {
    const next = validateBindings(value);
    this.config = next;
    this.suppress();
    this.padHeld.clear();
  }
  isBound(code: string) {
    return KEY_ACTIONS.some((a) => this.config.keys[a].includes(code));
  }
  keyDown(code: string) {
    if (this.held.has(code) || !this.isBound(code)) return;
    this.held.add(code);
    this.lastDevice = 'keyboard';
    for (const action of BUTTON_ACTIONS)
      if (skill(action) && this.config.keys[action].includes(code))
        this.keyboardEdges.add(action);
  }
  keyUp(code: string) {
    this.held.delete(code);
  }
  private down(action: keyof Bindings['keys']) {
    return this.config.keys[action].some((k) => this.held.has(k));
  }
  pollGamepad(raw: PadSnapshot | null, suppressEdges = false) {
    const pad = raw?.connected && raw.mapping === 'standard' ? raw : null;
    if (!pad && this.connected) {
      this.aimDevice = 'mouse';
      this.lastDevice = 'keyboard';
    }
    const nextIndex = pad?.index ?? null;
    // Reconnecting a held controller establishes levels, not another skill press.
    const baseline =
      suppressEdges || (this.padSeen && nextIndex !== this.padIndex);
    if (nextIndex !== this.padIndex) {
      this.padHeld.clear();
      this.padEdges.clear();
    }
    this.padIndex = nextIndex;
    if (pad) this.padSeen = true;
    this.connected = !!pad;
    const vector = (offset: number) => {
      const x = axis(pad?.axes[offset]),
        y = axis(pad?.axes[offset + 1]);
      return Math.hypot(x, y) > this.config.deadzone
        ? { x, y }
        : { x: 0, y: 0 };
    };
    this.move = vector(0);
    const aim = vector(2);
    this.aiming = !!(aim.x || aim.y);
    if (this.aiming) {
      const n = Math.hypot(aim.x, aim.y);
      this.aim = { x: aim.x / n, y: aim.y / n };
    }
    const next = new Set<ButtonAction>();
    for (const action of BUTTON_ACTIONS) {
      const button = pad?.buttons[this.config.gamepad[action]];
      if (
        button &&
        (button.pressed ||
          (Number.isFinite(button.value) && button.value >= 0.5))
      ) {
        next.add(action);
        if (!baseline && skill(action) && !this.padHeld.has(action))
          this.padEdges.add(action);
      }
    }
    this.padHeld = next;
    if (this.move.x || this.move.y || this.aiming || next.size)
      this.lastDevice = 'gamepad';
  }
  sample(
    pointer: { x: number; y: number; fire: boolean },
    player: { x: number; y: number },
  ): Input {
    const moved =
      this.pointer &&
      (Math.hypot(pointer.x - this.pointer.x, pointer.y - this.pointer.y) >
        0.5 ||
        pointer.fire !== this.pointer.fire);
    if (moved) {
      this.aimDevice = 'mouse';
      this.lastDevice = 'keyboard';
    } else if (this.aiming) this.aimDevice = 'gamepad';
    this.pointer = { ...pointer };
    const x = Number(this.down('MoveRight')) - Number(this.down('MoveLeft'));
    const y = Number(this.down('MoveDown')) - Number(this.down('MoveUp'));
    const edge = (a: ButtonAction) =>
      this.keyboardEdges.has(a) || this.padEdges.has(a);
    return {
      x: x || y ? x : this.move.x,
      y: x || y ? y : this.move.y,
      aimX:
        this.aimDevice === 'gamepad' ? player.x + this.aim.x * 300 : pointer.x,
      aimY:
        this.aimDevice === 'gamepad' ? player.y + this.aim.y * 300 : pointer.y,
      fire:
        pointer.fire ||
        this.down('PrimaryAttack') ||
        this.padHeld.has('PrimaryAttack'),
      dash: edge('Dash'),
      q: edge('Pulse'),
      e: edge('Gravity'),
      bomb: edge('Bomb'),
      heal: edge('Potion'),
    };
  }
  consumePause() {
    const pause = this.keyboardEdges.has('Pause') || this.padEdges.has('Pause');
    this.keyboardEdges.delete('Pause');
    this.padEdges.delete('Pause');
    return pause;
  }
  consumeStep() {
    this.keyboardEdges.clear();
    this.padEdges.clear();
  }
  /** Suppress held keyboard state and pending edges, retain polled pad levels so a
   * held button cannot become a fresh action when a dialog closes. */
  suppress() {
    this.held.clear();
    this.consumeStep();
  }
}
