export const BUTTON_ACTIONS = [
  'PrimaryAttack',
  'Dash',
  'Pulse',
  'Gravity',
  'Bomb',
  'Potion',
  'Pause',
] as const;
export type ButtonAction = (typeof BUTTON_ACTIONS)[number];
export type Action = 'Move' | 'Aim' | ButtonAction;
export const KEY_ACTIONS = [
  'MoveUp',
  'MoveDown',
  'MoveLeft',
  'MoveRight',
  ...BUTTON_ACTIONS,
] as const;
export type KeyAction = (typeof KEY_ACTIONS)[number];
export interface Bindings {
  version: 1;
  keys: Record<KeyAction, string[]>;
  mouseAttack: 0 | 2;
  gamepad: Record<ButtonAction, number>;
  deadzone: number;
}
export const DEFAULT_BINDINGS: Bindings = {
  version: 1,
  keys: {
    MoveUp: ['KeyW', 'ArrowUp'],
    MoveDown: ['KeyS', 'ArrowDown'],
    MoveLeft: ['KeyA', 'ArrowLeft'],
    MoveRight: ['KeyD', 'ArrowRight'],
    PrimaryAttack: [],
    Dash: ['Space'],
    Pulse: ['KeyQ'],
    Gravity: ['KeyE'],
    Bomb: ['KeyB'],
    Potion: ['KeyR'],
    Pause: ['Escape'],
  },
  mouseAttack: 0,
  gamepad: {
    PrimaryAttack: 7,
    Dash: 0,
    Pulse: 4,
    Gravity: 5,
    Bomb: 2,
    Potion: 3,
    Pause: 9,
  },
  deadzone: 0.2,
};
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const exactKeys = (v: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(v).length === keys.length &&
  Object.keys(v).every((k) => keys.includes(k));
const validCode = (code: unknown): code is string =>
  typeof code === 'string' &&
  /^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|Escape|Shift(Left|Right))$/.test(
    code,
  );
export function validateBindings(value: unknown): Bindings {
  if (
    !record(value) ||
    !exactKeys(value, [
      'version',
      'keys',
      'mouseAttack',
      'gamepad',
      'deadzone',
    ]) ||
    value.version !== 1 ||
    !record(value.keys) ||
    !exactKeys(value.keys, KEY_ACTIONS) ||
    !record(value.gamepad) ||
    !exactKeys(value.gamepad, BUTTON_ACTIONS) ||
    ![0, 2].includes(value.mouseAttack as number) ||
    typeof value.deadzone !== 'number' ||
    !Number.isFinite(value.deadzone) ||
    value.deadzone < 0.1 ||
    value.deadzone > 0.5
  )
    throw Error('输入配置格式或死区无效。');
  const used = new Set<string>();
  for (const action of KEY_ACTIONS) {
    const codes = value.keys[action];
    if (
      !Array.isArray(codes) ||
      codes.length > 2 ||
      (action !== 'PrimaryAttack' && !codes.length)
    )
      throw Error(`${action} 需要 1–2 个按键。`);
    for (const code of codes) {
      if (!validCode(code) || used.has(code))
        throw Error('按键无效或与其他操作冲突。');
      used.add(code);
    }
  }
  const gamepad = value.gamepad;
  const buttons = BUTTON_ACTIONS.map((a) => gamepad[a]);
  if (
    buttons.some(
      (b) => !Number.isInteger(b) || (b as number) < 0 || (b as number) > 16,
    ) ||
    new Set(buttons).size !== buttons.length
  )
    throw Error('手柄按键必须为不同的标准按钮编号 0–16。');
  return structuredClone(value) as unknown as Bindings;
}
export const BINDINGS_KEY = 'arcshift.bindings.v1';
export function loadBindings(): Bindings {
  try {
    const raw = localStorage.getItem(BINDINGS_KEY);
    if (raw && raw.length < 16384) return validateBindings(JSON.parse(raw));
  } catch {
    /* Missing, corrupt or unavailable storage uses ordinary defaults. */
  }
  return structuredClone(DEFAULT_BINDINGS);
}
export function persistBindings(bindings: Bindings): boolean {
  try {
    localStorage.setItem(
      BINDINGS_KEY,
      JSON.stringify(validateBindings(bindings)),
    );
    return true;
  } catch {
    return false;
  }
}
export const keyLabel = (key: string) =>
  ({ ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' })[key] ||
  key
    .replace(/^Key|^Digit/, '')
    .replace('Space', 'SPACE')
    .replace('Escape', 'ESC');
export const padLabel = (button: number) =>
  [
    'A / ×',
    'B / ○',
    'X / □',
    'Y / △',
    'LB / L1',
    'RB / R1',
    'LT / L2',
    'RT / R2',
    'BACK',
    'START',
    'L3',
    'R3',
    '↑',
    '↓',
    '←',
    '→',
    'HOME',
  ][button];
