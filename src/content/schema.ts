import { ENEMIES } from '../data/enemies';
import { CARDS, REQUIREMENTS } from '../cards/catalog';
import type { EnemyKind, WeaponId } from '../game/types';

// One schema supplies the editor controls AND runtime/import validation.
// Bounds describe supported tuning, not arbitrary programmable mechanics.
export type NumberSpec = readonly [
  initial: number,
  min: number,
  max: number,
  integer?: boolean,
];
export const CARD_PARAMETERS: Record<string, Record<string, NumberSpec>> = {
  'fire-ember': { burn: [8, 0, 100] },
  'fire-fuel': { burn: [18, 0, 100] },
  'fire-split': { projectiles: [3, 1, 9, true], damage: [0.75, 0.1, 3] },
  'fire-blast': { explosion: [1, 0, 3, true] },
  'storm-arc': { chain: [2, 0, 8, true] },
  'storm-conduct': { chain: [2, 0, 8, true] },
  'storm-critical': { crit: [0.22, 0, 1] },
  'storm-surge': { rate: [0.78, 0.2, 3] },
  'storm-needle': { pierce: [2, 0, 8, true] },
  'ice-touch': { slow: [0.35, 0, 0.85] },
  'shift-ice': { slow: [0.35, 0, 0.85] },
  'ice-pierce': { pierce: [1, 0, 8, true], damage: [4, 0, 40] },
  'ice-prism': { bounce: [2, 0, 8, true] },
  'void-seek': { homing: [1, 0, 3] },
  'void-leech': { lifesteal: [1, 0, 5] },
  'void-singularity': { eCooldown: [0.65, 0.2, 3] },
  'void-echo': { qCooldown: [0.65, 0.2, 3], damage: [4, 0, 40] },
  'shift-quick': { dashCooldown: [0.7, 0.2, 3] },
  'shift-stride': { speed: [1.18, 0.5, 2] },
  'fire-meteor': {
    shotSize: [9, 2, 20],
    shotSpeed: [0.66, 0.2, 3],
    damage: [1.65, 0.1, 4],
    rate: [1.4, 0.2, 4],
  },
  'fire-bloom': { fragment: [3, 0, 8, true] },
  'storm-lance': {
    shotSpeed: [2.4, 0.2, 4],
    pierce: [3, 0, 8, true],
    rate: [1.35, 0.2, 4],
    damage: [1.15, 0.1, 4],
  },
  'frost-wave': { wave: [1, 0, 3] },
  'frost-fan': { projectiles: [2, 0, 6, true], damage: [0.7, 0.1, 3] },
  'void-orbit': { pierce: [2, 0, 8, true], rate: [1.2, 0.2, 4] },
  'void-return': { damage: [0.9, 0.1, 3] },
};
export const WEAPON_PARAMETERS: Record<string, NumberSpec> = {
  damage: [1, 0.1, 4],
  cooldown: [1, 0.2, 4],
  projectileSpeed: [1, 0.2, 3],
  range: [1, 0.5, 2],
  arc: [1, 0.5, 1.5],
  blast: [1, 0.5, 2],
};
export const ENCOUNTER_PARAMETERS: Record<string, NumberSpec> = {
  combatWaves: [3, 1, 12, true],
  eliteWaves: [4, 1, 12, true],
  challengeWaves: [5, 1, 12, true],
  interval: [9, 1, 30],
  baseCount: [4, 1, 20, true],
  eliteBonus: [3, 0, 10, true],
};
export const BOSS_PARAMETERS: Record<string, NumberSpec> = {
  phase2At: [0.65, 0.1, 0.95],
  phase3At: [0.3, 0.05, 0.9],
  phaseRecovery: [1.8, 0.2, 8],
};
export type ParameterRow = { id: string; params: Record<string, number> };
export interface ContentPack {
  schemaVersion: 1;
  enemies: ParameterRow[];
  weapons: ParameterRow[];
  cards: (ParameterRow & { requires: string | null })[];
  encounters: (ParameterRow & { pool: EnemyKind[] })[];
  bosses: ParameterRow[];
}
export const BOSS_IDS = ['warden', 'matron', 'forgemaster', 'oracle'];
const values = (spec: Record<string, NumberSpec>) =>
  Object.fromEntries(Object.entries(spec).map(([k, v]) => [k, v[0]]));
export function specsFor(
  section: keyof Omit<ContentPack, 'schemaVersion'>,
  id: string,
): Record<string, NumberSpec> {
  if (section === 'cards') return CARD_PARAMETERS[id] ?? {};
  if (section === 'weapons')
    return Object.fromEntries(
      Object.entries(WEAPON_PARAMETERS).filter(
        ([key]) =>
          ['damage', 'cooldown', 'projectileSpeed'].includes(key) ||
          (id === 'sword' && ['range', 'arc'].includes(key)) ||
          (id === 'cannon' && key === 'blast'),
      ),
    );
  if (section === 'encounters') return ENCOUNTER_PARAMETERS;
  if (section === 'bosses') return BOSS_PARAMETERS;
  const e = ENEMIES[id as EnemyKind];
  return {
    hp: [e?.hp ?? 1, 1, 30000],
    speed: [e?.speed ?? 1, 0, 400],
    damage: [e?.damage ?? 1, 0, 100],
    radius: [e?.radius ?? 1, 4, 70],
  };
}
function freeze<T>(v: T): T {
  if (v && typeof v === 'object') {
    Object.freeze(v);
    for (const child of Object.values(v)) freeze(child);
  }
  return v;
}
export const DEFAULT_CONTENT: ContentPack = freeze({
  schemaVersion: 1,
  enemies: Object.keys(ENEMIES).map((id) => ({
    id,
    params: values(specsFor('enemies', id)),
  })),
  weapons: (['arc', 'sword', 'cannon'] satisfies WeaponId[]).map((id) => ({
    id,
    params: values(specsFor('weapons', id)),
  })),
  cards: CARDS.map((c) => ({
    id: c.id,
    requires: REQUIREMENTS[c.id] ?? null,
    params: values(CARD_PARAMETERS[c.id] ?? {}),
  })),
  encounters: [
    {
      id: 'standard',
      pool: ['hunter', 'sentry', 'lancer'],
      params: values(ENCOUNTER_PARAMETERS),
    },
  ],
  bosses: BOSS_IDS.map((id) => ({ id, params: values(BOSS_PARAMETERS) })),
});
export const CONTENT_SECTIONS = [
  'enemies',
  'weapons',
  'cards',
  'encounters',
  'bosses',
] as const;
export type ContentSection = (typeof CONTENT_SECTIONS)[number];
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
export type Validation =
  | { ok: true; value: ContentPack; errors: [] }
  | { ok: false; errors: string[] };
export function validateContent(input: unknown): Validation {
  const errors: string[] = [];
  function keys(
    value: Record<string, unknown>,
    allowed: string[],
    path: string,
  ) {
    for (const key of Object.keys(value))
      if (!allowed.includes(key)) errors.push(`${path}.${key}: unknown field`);
  }
  if (!object(input))
    return { ok: false, errors: ['content: expected object'] };
  keys(input, ['schemaVersion', ...CONTENT_SECTIONS], 'content');
  if (input.schemaVersion !== 1) errors.push('schemaVersion: expected 1');
  for (const section of CONTENT_SECTIONS) {
    const rows = input[section],
      expected = DEFAULT_CONTENT[section].map((r) => r.id);
    if (!Array.isArray(rows) || rows.length !== expected.length) {
      errors.push(
        `${section}: expected exactly ${expected.length} supported IDs`,
      );
      continue;
    }
    const seen = new Set<string>();
    for (const [i, row] of rows.entries()) {
      const path = `${section}[${i}]`;
      if (
        !object(row) ||
        typeof row.id !== 'string' ||
        !expected.includes(row.id)
      ) {
        errors.push(`${path}.id: unknown ID`);
        continue;
      }
      if (seen.has(row.id)) errors.push(`${path}.id: duplicate ${row.id}`);
      seen.add(row.id);
      keys(
        row,
        [
          'id',
          'params',
          ...(section === 'cards'
            ? ['requires']
            : section === 'encounters'
              ? ['pool']
              : []),
        ],
        path,
      );
      const spec = specsFor(section, row.id);
      if (!object(row.params)) {
        errors.push(`${path}.params: expected object`);
        continue;
      }
      keys(row.params, Object.keys(spec), `${path}.params`);
      for (const [key, [, min, max, integer]] of Object.entries(spec)) {
        const v = row.params[key];
        if (
          typeof v !== 'number' ||
          !Number.isFinite(v) ||
          v < min ||
          v > max ||
          (integer && !Number.isInteger(v))
        )
          errors.push(
            `${path}.params.${key}: expected ${integer ? 'integer ' : ''}${min}..${max}`,
          );
      }
      if (
        section === 'cards' &&
        row.requires !== null &&
        (typeof row.requires !== 'string' ||
          !DEFAULT_CONTENT.cards.some((c) => c.id === row.requires) ||
          row.requires === row.id)
      )
        errors.push(`${path}.requires: invalid card reference`);
      if (
        section === 'encounters' &&
        (!Array.isArray(row.pool) ||
          row.pool.length < 1 ||
          row.pool.length > 8 ||
          new Set(row.pool).size !== row.pool.length ||
          row.pool.some(
            (k) =>
              typeof k !== 'string' ||
              !Object.hasOwn(ENEMIES, k) ||
              BOSS_IDS.includes(k),
          ))
      )
        errors.push(`${path}.pool: expected unique non-Boss enemy references`);
      if (
        section === 'bosses' &&
        !(Number(row.params.phase3At) < Number(row.params.phase2At))
      )
        errors.push(`${path}: phase3At must be below phase2At`);
    }
  }
  if (!errors.length) {
    const pack = input as unknown as ContentPack;
    for (const card of pack.cards) {
      const visited = new Set([card.id]);
      let next = card.requires;
      while (next) {
        if (visited.has(next)) {
          errors.push(`cards.${card.id}: cyclic prerequisite`);
          break;
        }
        visited.add(next);
        next = pack.cards.find((c) => c.id === next)?.requires ?? null;
      }
    }
  }
  if (errors.length) return { ok: false, errors: errors.slice(0, 100) };
  const normalized = structuredClone(input as unknown as ContentPack);
  for (const section of CONTENT_SECTIONS)
    normalized[section].sort(
      (a, b) =>
        DEFAULT_CONTENT[section].findIndex((r) => r.id === a.id) -
        DEFAULT_CONTENT[section].findIndex((r) => r.id === b.id),
    );
  return { ok: true, value: freeze(normalized), errors: [] };
}
export function importContent(json: string): Validation {
  if (new TextEncoder().encode(json).length > 256 * 1024)
    return { ok: false, errors: ['File exceeds 256 KiB'] };
  try {
    return validateContent(JSON.parse(json));
  } catch {
    return { ok: false, errors: ['Invalid JSON'] };
  }
}
export function contentDiff(before: ContentPack, after: ContentPack): string[] {
  const result: string[] = [];
  for (const section of CONTENT_SECTIONS)
    for (const row of after[section]) {
      const original = before[section].find((r) => r.id === row.id)!;
      for (const key of Object.keys(row) as (keyof typeof row)[]) {
        if (key === 'params')
          for (const name of Object.keys(row.params)) {
            if (original.params[name] !== row.params[name])
              result.push(
                `${section}.${row.id}.${name}: ${original.params[name]} → ${row.params[name]}`,
              );
          }
        else if (JSON.stringify(original[key]) !== JSON.stringify(row[key]))
          result.push(
            `${section}.${row.id}.${key}: ${JSON.stringify(original[key])} → ${JSON.stringify(row[key])}`,
          );
      }
    }
  return result;
}
