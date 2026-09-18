import {
  DEFAULT_CONTENT,
  validateContent,
  type ContentPack,
} from '../content/schema';
import { CARDS } from '../cards/catalog';
import { ENEMIES } from '../data/enemies';
import type { EnemyKind, WeaponId } from '../game/types';
export interface TrialOffer {
  id: string;
  cost: number;
  unlock: number;
  role: string;
  tradeoff: string;
}
export interface TrialStage {
  name: string;
  purpose: string;
  budget: number;
  limit: number;
  enemies: { kind: EnemyKind; x: number; y: number }[];
  cover: boolean;
}
export interface TrialConfig {
  schemaVersion: 2;
  weapons: WeaponId[];
  contract: null | {
    supplyHealth: number;
    healthCost: number;
    rewardCapacity: number;
    elite: { kind: 'lancer'; x: number; y: number };
  };
  seed: number;
  slots: number;
  repairCost: number;
  repairHealth: number;
  offers: TrialOffer[];
  stages: TrialStage[];
  content: ContentPack;
}
const content = structuredClone(DEFAULT_CONTENT);
// Give each encounter time to expose movement and telegraphs before a strong build clears it.
for (const row of content.enemies)
  if (['hunter', 'sentry', 'lancer', 'weaver'].includes(row.id))
    row.params.hp = Math.round(row.params.hp * 2.5);
content.enemies.find((e) => e.id === 'warden')!.params.hp = 4200;
const spawn = (kind: EnemyKind, x: number, y: number) => ({ kind, x, y });
export const DEFAULT_TRIAL: TrialConfig = {
  schemaVersion: 2,
  weapons: ['arc', 'sword', 'cannon'],
  contract: {
    supplyHealth: 25,
    healthCost: 20,
    rewardCapacity: 2,
    elite: { kind: 'lancer', x: 640, y: 300 },
  },
  seed: 812831,
  slots: 4,
  repairCost: 2,
  repairHealth: 35,
  content,
  offers: [
    {
      id: 'fire-ember',
      cost: 2,
      unlock: 0,
      role: '持续压制',
      tradeoff: '持续伤害需要时间结算，不能立即清除威胁。',
    },
    {
      id: 'storm-arc',
      cost: 2,
      unlock: 0,
      role: '群体连锁',
      tradeoff: '附近没有额外目标时，连锁收益下降。',
    },
    {
      id: 'ice-touch',
      cost: 1,
      unlock: 0,
      role: '争取空间',
      tradeoff: '提供减速，不直接提高单发基础伤害。',
    },
    {
      id: 'fire-split',
      cost: 3,
      unlock: 0,
      role: '扇形覆盖',
      tradeoff: '每发伤害降至 75%，远处小目标可能只中一发。',
    },
    {
      id: 'storm-surge',
      cost: 2,
      unlock: 0,
      role: '稳定射速',
      tradeoff: '更多射击需要更稳定的瞄准，不扩大覆盖范围。',
    },
    {
      id: 'void-seek',
      cost: 2,
      unlock: 0,
      role: '修正弹道',
      tradeoff: '追踪不保证命中，仍受地形与目标移动影响。',
    },
    {
      id: 'fire-meteor',
      cost: 3,
      unlock: 1,
      role: '重型弹体',
      tradeoff: '基础伤害提高，射击间隔与弹道速度同时付出代价。',
    },
    {
      id: 'ice-pierce',
      cost: 2,
      unlock: 1,
      role: '直线穿透',
      tradeoff: '对单体没有额外穿透目标，不能把穿透次数当伤害倍率。',
    },
    {
      id: 'fire-fuel',
      cost: 3,
      unlock: 2,
      role: '强化燃烧',
      tradeoff: '需先装备余烬，占用两个协议槽。',
    },
  ],
  stages: [
    {
      name: '聚群试炼',
      purpose: '猎手靠近形成群体，检验覆盖、连锁与控制。',
      budget: 6,
      limit: 80,
      cover: false,
      enemies: [
        spawn('hunter', 440, 240),
        spawn('hunter', 525, 205),
        spawn('hunter', 640, 200),
        spawn('hunter', 755, 205),
        spawn('hunter', 840, 240),
        spawn('sentry', 640, 160),
      ],
    },
    {
      name: '交叉火线',
      purpose: '冲锋逼迫移动；用掩体断开射线，再寻找输出位置。',
      budget: 9,
      limit: 100,
      cover: true,
      enemies: [
        spawn('lancer', 360, 205),
        spawn('lancer', 920, 205),
        spawn('sentry', 220, 350),
        spawn('sentry', 1060, 350),
        spawn('hunter', 510, 235),
        spawn('hunter', 770, 235),
        spawn('weaver', 640, 190),
      ],
    },
    {
      name: '守门人',
      purpose: '提前知道下一场是单体：继续对群，还是转向稳定单体？',
      budget: 9,
      limit: 120,
      cover: false,
      enemies: [spawn('warden', 640, 245)],
    },
  ],
};
const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const exact = (v: Record<string, unknown>, ks: string[]) =>
  Object.keys(v).length === ks.length &&
  Object.keys(v).every((k) => ks.includes(k));
const integer = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
const text = (v: unknown, max: number) =>
  typeof v === 'string' && v.length > 0 && v.length <= max && !/[<>]/.test(v);
export function validateTrial(
  v: unknown,
): { ok: true; value: TrialConfig } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  // Legacy imports retain their original arc-only, no-contract meaning.
  if (
    obj(v) &&
    v.schemaVersion === 1 &&
    !('weapons' in v) &&
    !('contract' in v)
  )
    v = { ...v, schemaVersion: 2, weapons: ['arc'], contract: null };
  if (
    !obj(v) ||
    !exact(v, [
      'schemaVersion',
      'weapons',
      'contract',
      'seed',
      'slots',
      'repairCost',
      'repairHealth',
      'offers',
      'stages',
      'content',
    ])
  )
    return { ok: false, errors: ['配置字段不完整或包含未知字段'] };
  if (
    v.schemaVersion !== 2 ||
    !integer(v.seed, 0, 1e8) ||
    !integer(v.slots, 1, 6) ||
    !integer(v.repairCost, 1, 6) ||
    !integer(v.repairHealth, 10, 60)
  )
    errors.push('版本、种子、槽位或维修规则无效');
  if (
    !Array.isArray(v.weapons) ||
    v.weapons.length < 1 ||
    v.weapons.length > 3 ||
    new Set(v.weapons).size !== v.weapons.length ||
    v.weapons.some((w) => !['arc', 'sword', 'cannon'].includes(w))
  )
    errors.push('武装列表需包含 1–3 种不同的合法武器');
  if (v.contract !== null) {
    const c = v.contract;
    if (
      !obj(c) ||
      !exact(c, ['supplyHealth', 'healthCost', 'rewardCapacity', 'elite']) ||
      !integer(c.supplyHealth, 1, 60) ||
      !integer(c.healthCost, 1, 60) ||
      !integer(c.rewardCapacity, 1, 6) ||
      !obj(c.elite) ||
      !exact(c.elite, ['kind', 'x', 'y']) ||
      c.elite.kind !== 'lancer' ||
      !integer(c.elite.x, 500, 780) ||
      !integer(c.elite.y, 180, 330)
    )
      errors.push('合约恢复、奖励或精英出生点无效（出生点须在中央安全区域）');
    if (
      Array.isArray(v.stages) &&
      obj(v.stages[2]) &&
      obj(c) &&
      Number(v.stages[2].budget) + Number(c.rewardCapacity) > 24
    )
      errors.push('末关额度与合约奖励合计不可超过 24');
  }
  if (!Array.isArray(v.offers) || v.offers.length < 3 || v.offers.length > 12)
    errors.push('协议目录需为 3–12 项');
  else {
    const ids = new Set<string>();
    for (const o of v.offers) {
      if (
        !obj(o) ||
        !exact(o, ['id', 'cost', 'unlock', 'role', 'tradeoff']) ||
        typeof o.id !== 'string' ||
        !CARDS.some((c) => c.id === o.id) ||
        ['ice-shell', 'void-leech'].includes(o.id) ||
        !integer(o.cost, 1, 8) ||
        !integer(o.unlock, 0, 2) ||
        !text(o.role, 20) ||
        !text(o.tradeoff, 100) ||
        ids.has(o.id)
      )
        errors.push(
          '协议 ID、价格、开放阶段或说明无效（装甲与击杀吸血不参与本试炼）',
        );
      else ids.add(o.id);
    }
  }
  if (!Array.isArray(v.stages) || v.stages.length !== 3)
    errors.push('需要三个阶段');
  else
    v.stages.forEach((s, i) => {
      if (
        !obj(s) ||
        !exact(s, ['name', 'purpose', 'budget', 'limit', 'enemies', 'cover']) ||
        !text(s.name, 20) ||
        !text(s.purpose, 100) ||
        !integer(s.budget, 1, 24) ||
        !integer(s.limit, 20, 180) ||
        typeof s.cover !== 'boolean' ||
        !Array.isArray(s.enemies) ||
        s.enemies.length < 1 ||
        s.enemies.length > 12
      ) {
        errors.push(`阶段 ${i + 1} 无效`);
        return;
      }
      if (
        i > 0 &&
        Number(s.budget) < Number((v.stages as TrialStage[])[i - 1]?.budget)
      )
        errors.push('累计额度不能递减');
      for (const e of s.enemies)
        if (
          !obj(e) ||
          !exact(e, ['kind', 'x', 'y']) ||
          typeof e.kind !== 'string' ||
          !Object.hasOwn(ENEMIES, e.kind) ||
          !integer(e.x, 190, 1090) ||
          !integer(e.y, 155, 555)
        )
          errors.push(`阶段 ${i + 1} 出生配置无效`);
    });
  const content = validateContent(v.content);
  if (!content.ok) errors.push(...content.errors);
  if (content.ok && Array.isArray(v.offers))
    for (const o of v.offers) {
      if (!obj(o)) continue;
      const required = content.value.cards.find((c) => c.id === o.id)?.requires;
      if (
        required &&
        !v.offers.some(
          (p) =>
            obj(p) && p.id === required && Number(p.unlock) <= Number(o.unlock),
        )
      )
        errors.push(`${String(o.id)} 缺少可用前置协议`);
    }
  const firstBudget =
    Array.isArray(v.stages) && obj(v.stages[0])
      ? Number(v.stages[0].budget)
      : 0;
  if (
    content.ok &&
    Array.isArray(v.offers) &&
    !v.offers.some(
      (o) =>
        obj(o) &&
        o.unlock === 0 &&
        typeof o.cost === 'number' &&
        o.cost <= firstBudget &&
        content.value.cards.some((c) => c.id === o.id && !c.requires),
    )
  )
    errors.push('开局至少需要一项无需前置、可支付的协议');
  return errors.length || !content.ok
    ? { ok: false, errors: errors.slice(0, 20) }
    : {
        ok: true,
        value: {
          ...structuredClone(v),
          content: content.value,
        } as unknown as TrialConfig,
      };
}
export function importTrial(raw: string) {
  if (new TextEncoder().encode(raw).length > 262144)
    return { ok: false as const, errors: ['配置超过 256 KiB'] };
  try {
    return validateTrial(JSON.parse(raw));
  } catch {
    return { ok: false as const, errors: ['JSON 格式错误'] };
  }
}
