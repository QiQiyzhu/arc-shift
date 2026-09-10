import type { WeaponId } from '../game/types';
export interface Wallet {
  coins: number;
  keys: number;
  bombs: number;
  tonics: number;
  shards: number;
}
export interface Preparation {
  vitality: number;
  flask: number;
  stipend: number;
}
export const emptyPreparation = (): Preparation => ({
  vitality: 0,
  flask: 0,
  stipend: 0,
});
export const startingWallet = (p = emptyPreparation()): Wallet => ({
  coins: 8 + p.stipend * 6,
  keys: 1,
  bombs: 2,
  tonics: 1 + p.flask,
  shards: 0,
});
export const LIMITS: Wallet = {
  coins: 999,
  keys: 9,
  bombs: 9,
  tonics: 3,
  shards: 999,
};
export const WORKSHOP = [
  {
    id: 'vitality',
    name: '生命刻印',
    text: '新行动生命上限 +10；最多 3 级。',
    max: 3,
    costs: [8, 16, 26],
  },
  {
    id: 'flask',
    name: '行者药匣',
    text: '新行动多携带 1 瓶灵药；最多 2 级。',
    max: 2,
    costs: [10, 22],
  },
  {
    id: 'stipend',
    name: '拾荒契约',
    text: '新行动初始金币 +6；最多 3 级。',
    max: 3,
    costs: [6, 12, 20],
  },
] as const;
export const WEAPONS: {
  id: WeaponId;
  name: string;
  en: string;
  text: string;
  tags: string;
  color: string;
}[] = [
  {
    id: 'arc',
    name: '奥术法器',
    en: 'ARC CATALYST',
    text: '高频远射，把多发、追踪与元素编织成弹幕。',
    tags: '远程 · 高频 · 弹幕',
    color: '#8fe3d4',
  },
  {
    id: 'sword',
    name: '黎明圣剑',
    en: 'DAWNBRINGER',
    text: '三段扇形斩击，终段重劈。挥砍可斩除前方敌弹；弹道协议化为符文剑气。',
    tags: '近战 · 三连斩 · 斩弹',
    color: '#ffe1a0',
  },
  {
    id: 'cannon',
    name: '裂核重炮',
    en: 'RIFT HOWITZER',
    text: '缓慢发射高冲击炮弹，直接命中与范围爆破。穿透、反弹和追踪可同时生效。',
    tags: '重炮 · 低频 · 爆破',
    color: '#ffa57c',
  },
];
export const SHOP = [
  { id: 'heal', name: '战地修复', text: '立即恢复 35 生命', cost: 12 },
  { id: 'tonic', name: '封装灵药', text: '灵药 +1，R 恢复 40 生命', cost: 15 },
  {
    id: 'bomb',
    name: '符文炸弹',
    text: '炸弹 +1，B 投放 / 营地破锁',
    cost: 10,
  },
  { id: 'key', name: '遗迹钥匙', text: '钥匙 +1，解锁额外协议', cost: 14 },
] as const;
export type ShopId = (typeof SHOP)[number]['id'];
export function normalizeWallet(
  value: unknown,
  fallback = startingWallet(),
): Wallet {
  const result = { ...fallback };
  if (!value || typeof value !== 'object') return result;
  for (const key of Object.keys(result) as (keyof Wallet)[]) {
    const n = (value as Record<string, unknown>)[key];
    if (typeof n === 'number' && Number.isFinite(n))
      result[key] = Math.max(0, Math.min(LIMITS[key], Math.floor(n)));
  }
  return result;
}
export function normalizePreparation(value: unknown): Preparation {
  const p = emptyPreparation();
  if (!value || typeof value !== 'object') return p;
  for (const item of WORKSHOP) {
    const n = (value as Record<string, unknown>)[item.id];
    if (typeof n === 'number' && Number.isFinite(n))
      p[item.id] = Math.max(0, Math.min(item.max, Math.floor(n)));
  }
  return p;
}
export const weaponId = (value: unknown): WeaponId =>
  value === 'sword' || value === 'cannon' ? value : 'arc';
