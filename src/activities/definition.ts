import {
  DEFAULT_CONTENT,
  validateContent,
  type ContentPack,
} from '../content/schema';
import { CARDS } from '../cards/catalog';
import type { WeaponId } from '../game/types';

export interface ActivityDefinition {
  schemaVersion: 1;
  id: string;
  revision: number;
  name: string;
  seed: number;
  weapon: WeaponId;
  cards: string[];
  level: number;
  timeLimitSeconds: number;
  holdSeconds: number;
  captureRadius: number;
  content: ContentPack;
}
export const ACTIVITY_FIELDS = {
  timeLimitSeconds: { label: '时限（秒）', min: 10, max: 180 },
  holdSeconds: { label: '驻留目标（秒）', min: 3, max: 60 },
  captureRadius: { label: '占领半径', min: 60, max: 140 },
} as const;
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
export function validateActivity(
  input: unknown,
):
  | { ok: true; value: ActivityDefinition; errors: [] }
  | { ok: false; errors: string[] } {
  if (!object(input)) return { ok: false, errors: ['活动必须是 JSON 对象'] };
  const errors: string[] = [];
  const allowed = [
    'schemaVersion',
    'id',
    'revision',
    'name',
    'seed',
    'weapon',
    'cards',
    'level',
    ...Object.keys(ACTIVITY_FIELDS),
    'content',
  ];
  for (const key of Object.keys(input))
    if (!allowed.includes(key)) errors.push(`未知字段：${key}`);
  if (input.schemaVersion !== 1) errors.push('仅支持活动 schemaVersion 1');
  if (typeof input.id !== 'string' || !/^[-a-z0-9]{1,40}$/.test(input.id))
    errors.push('活动 id 格式错误');
  if (
    typeof input.name !== 'string' ||
    input.name.length < 1 ||
    input.name.length > 24 ||
    /[<>]/.test(input.name)
  )
    errors.push('活动名称需为 1–24 字纯文本');
  const integer = (key: string, min: number, max: number) => {
    const n = input[key];
    if (typeof n !== 'number' || !Number.isInteger(n) || n < min || n > max)
      errors.push(`${key}：需为 ${min}–${max} 的整数`);
  };
  integer('revision', 1, 9999);
  integer('seed', 0, 100000000);
  integer('level', 1, 10);
  for (const [key, spec] of Object.entries(ACTIVITY_FIELDS))
    integer(key, spec.min, spec.max);
  if (Number(input.holdSeconds) >= Number(input.timeLimitSeconds))
    errors.push('驻留目标必须小于时限');
  if (
    typeof input.weapon !== 'string' ||
    !['arc', 'sword', 'cannon'].includes(input.weapon)
  )
    errors.push('未知武器');
  const content = validateContent(input.content);
  if (!content.ok) errors.push(...content.errors.map((e) => `战斗内容：${e}`));
  const cards = input.cards;
  if (
    !Array.isArray(cards) ||
    cards.length < 1 ||
    cards.length > 8 ||
    new Set(cards).size !== cards.length ||
    cards.some((id) => !CARDS.some((c) => c.id === id))
  )
    errors.push('请选择 1–8 张不重复的有效协议');
  else if (content.ok)
    for (const id of cards) {
      const required = content.value.cards.find((c) => c.id === id)?.requires;
      if (required && !cards.includes(required))
        errors.push(`${id} 缺少前置 ${required}`);
    }
  if (errors.length || !content.ok)
    return { ok: false, errors: errors.slice(0, 30) };
  return {
    ok: true,
    value: Object.freeze({
      ...structuredClone(input),
      content: content.value,
      cards: Object.freeze([...(cards as string[])]),
    }) as unknown as ActivityDefinition,
    errors: [],
  };
}
export function importActivity(json: string) {
  if (new TextEncoder().encode(json).length > 256 * 1024)
    return { ok: false as const, errors: ['活动配置超过 256 KiB'] };
  try {
    return validateActivity(JSON.parse(json));
  } catch {
    return { ok: false as const, errors: ['JSON 格式错误'] };
  }
}
/** Display/compatibility fingerprint, not a signature or anti-cheat proof. */
export function activityDigest(definition: ActivityDefinition) {
  const normalized = validateActivity(definition);
  if (!normalized.ok) throw Error(normalized.errors.join('；'));
  const d = normalized.value;
  const text = JSON.stringify([
    d.schemaVersion,
    d.id,
    d.revision,
    d.seed,
    d.weapon,
    d.cards,
    d.level,
    d.timeLimitSeconds,
    d.holdSeconds,
    d.captureRadius,
    d.content,
  ]);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++)
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}
const official = validateActivity({
  schemaVersion: 1,
  id: 'relay-hold',
  revision: 1,
  name: '中继争夺',
  seed: 73129,
  weapon: 'arc',
  cards: ['fire-ember', 'fire-split', 'storm-arc', 'ice-touch'],
  level: 3,
  timeLimitSeconds: 75,
  holdSeconds: 18,
  captureRadius: 100,
  content: DEFAULT_CONTENT,
});
if (!official.ok) throw Error(official.errors.join('；'));
export const RELAY_ACTIVITY = official.value;
export const RELAY_DIGEST = activityDigest(RELAY_ACTIVITY);
export const RELAY_AWARD = `${RELAY_ACTIVITY.id}@${RELAY_ACTIVITY.revision}`;
