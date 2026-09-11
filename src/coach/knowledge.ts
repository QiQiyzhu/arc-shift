import { CARDS } from '../cards/catalog';
import { SYNERGIES, synergyApplies } from '../cards/synergies';
import { DEFAULT_CONTENT, type ContentPack } from '../content/schema';
import type { WeaponId } from '../game/types';

export const GOALS = {
  single: {
    name: '单体输出',
    keywords: ['首领', '单体', 'boss', '伤害', '输出'],
  },
  swarm: {
    name: '清理敌群',
    keywords: ['清怪', '敌群', '包围', '群体', '连锁', '弹幕'],
  },
  mobility: {
    name: '灵活走位',
    keywords: ['闪避', '走位', '跃迁', '移动', '灵活', '逃离'],
  },
} as const;
export type Goal = keyof typeof GOALS;
export interface Strategy {
  id: string;
  title: string;
  weapon: WeaponId;
  goal: Goal;
  cards: string[];
  evidence: string[];
  explanation: string;
  caution: string;
}
export function facts(content: ContentPack = DEFAULT_CONTENT) {
  return [
    ...CARDS.map((c) => ({
      kind: 'card',
      id: c.id,
      title: c.name,
      text: c.description,
      requires: content.cards.find((r) => r.id === c.id)!.requires,
      parameters: content.cards.find((r) => r.id === c.id)!.params,
    })),
    ...SYNERGIES.map((s) => ({
      kind: 'synergy',
      id: s.id,
      title: s.name,
      text: s.description,
      requires: [...s.requires],
      weapons: 'weapons' in s ? [...s.weapons] : ['arc', 'sword', 'cannon'],
      parameters: {},
    })),
  ];
}
/** Closed game vocabulary and recursive prerequisites, independent of model JSON syntax. */
export function validateCards(
  cards: unknown,
  content: ContentPack = DEFAULT_CONTENT,
): cards is string[] {
  if (
    !Array.isArray(cards) ||
    cards.length > CARDS.length ||
    new Set(cards).size !== cards.length
  )
    return false;
  return cards.every(
    (id) =>
      typeof id === 'string' &&
      CARDS.some((c) => c.id === id) &&
      (!content.cards.find((c) => c.id === id)?.requires ||
        cards.includes(content.cards.find((c) => c.id === id)!.requires)),
  );
}
export function validateStrategy(
  value: unknown,
  content = DEFAULT_CONTENT,
): Strategy {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Strategy must be an object');
  const s = value as Strategy;
  const fields = [
    'id',
    'title',
    'weapon',
    'goal',
    'cards',
    'evidence',
    'explanation',
    'caution',
  ];
  if (
    Object.keys(s).some((k) => !fields.includes(k)) ||
    fields.some((k) => !(k in s))
  )
    throw Error('Unexpected strategy fields');
  if (
    typeof s.id !== 'string' ||
    !/^[a-z0-9-]{3,40}$/.test(s.id) ||
    !['arc', 'sword', 'cannon'].includes(s.weapon) ||
    !Object.hasOwn(GOALS, s.goal)
  )
    throw Error('Unknown weapon, goal or id');
  for (const key of ['title', 'explanation', 'caution'] as const)
    if (
      typeof s[key] !== 'string' ||
      !s[key].trim() ||
      s[key].length > (key === 'title' ? 22 : 140) ||
      /[<>]/.test(s[key])
    )
      throw Error(`Invalid ${key}`);
  if (
    !validateCards(s.cards, content) ||
    s.cards.length < 4 ||
    s.cards.length > 6
  )
    throw Error('Invalid cards or missing prerequisites');
  if (
    !Array.isArray(s.evidence) ||
    s.evidence.length < 2 ||
    s.evidence.length > 6 ||
    new Set(s.evidence).size !== s.evidence.length
  )
    throw Error('Invalid evidence list');
  for (const id of s.evidence) {
    const synergy = SYNERGIES.find((x) => x.id === id);
    if (
      !s.cards.includes(id) &&
      !(
        synergy &&
        synergyApplies(synergy, s.weapon) &&
        synergy.requires.every((c) => s.cards.includes(c))
      )
    )
      throw Error(`Unsupported evidence: ${id}`);
  }
  return s;
}
/** Sparse terms + exact weapon/goal/build matching. No vector model or learned ranking is claimed. */
export function retrieveStrategies(
  plans: Strategy[],
  query: string,
  goal: Goal,
  weapon: WeaponId,
  owned: string[],
) {
  const tokens = query.toLowerCase().match(/[a-z]+|[\u4e00-\u9fff]{2}/g) || [];
  return plans
    .filter((p) => p.weapon === weapon)
    .map((p) => {
      const text =
        `${p.title} ${p.explanation} ${p.caution} ${GOALS[p.goal].keywords.join(' ')}`.toLowerCase();
      const matched = tokens.filter((t) => text.includes(t));
      const overlap = p.cards.filter((id) => owned.includes(id));
      return {
        plan: p,
        score:
          (p.goal === goal ? 12 : 0) + matched.length * 2 + overlap.length * 3,
        reasons: [
          p.goal === goal ? '目标一致' : '备选打法',
          ...overlap.map((id) => `已有${CARDS.find((c) => c.id === id)!.name}`),
          ...matched.map((t) => `匹配「${t}」`),
        ],
      };
    })
    .sort((a, b) => b.score - a.score || a.plan.id.localeCompare(b.plan.id))
    .slice(0, 3);
}
