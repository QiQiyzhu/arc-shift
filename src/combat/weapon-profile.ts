import type { World } from '../game/world';

/** Read-only presentation of the current attack. Verified against attack() in tests.
 * Excludes critical/status/explosion damage and conditional next-hit effects. */
export function weaponProfile(w: World, finisher = false) {
  const s = w.stats,
    t = w.content.weapons.find((r) => r.id === w.weapon)!.params;
  const damage =
    s.damage *
    (w.relics.includes('oracle-eye') && w.forms.length === 3 ? 1.15 : 1) *
    (w.relics.includes('glass-engine') && w.forms.length > 1 ? 1.12 : 1) *
    t.damage;
  const returningFinisher =
    finisher && w.has('void-return') && w.has('ice-touch');
  if (w.weapon === 'sword')
    return {
      damage:
        damage *
        (finisher ? 3.3 : 2.1) *
        (returningFinisher ? 1 : 1 + (s.projectiles - 1) * 0.12),
      interval: Math.max(0.24, s.rate * (finisher ? 3.3 : 2.5)) * t.cooldown,
      reach:
        ((finisher ? 155 : 120) +
          (s.shotSize > 4 ? 22 : 0) +
          (w.relics.includes('vow-edge') ? 24 : 0)) *
        t.range,
      area: '挥砍距离',
    };
  return {
    damage: damage * (w.weapon === 'cannon' ? 3.8 : 1),
    interval:
      s.rate *
      (w.weapon === 'cannon' ? 4.2 : w.forms.includes('sword') ? 1.18 : 1) *
      t.cooldown,
    reach:
      w.weapon === 'cannon'
        ? (72 + (s.shotSize > 4 ? 18 : 0)) *
          t.blast *
          (w.forms.includes('sword') ? 0.7 : 1)
        : s.projectiles,
    area: w.weapon === 'cannon' ? '爆破半径' : '每次弹数',
  };
}

export const WEAPON_IDENTITY = {
  arc: {
    name: '法器',
    en: 'ARC',
    verb: '保持距离，持续压制',
    cost: '弹道需要追踪目标；用减速与引力创造命中窗口。',
    protocol: '多发改变覆盖角，穿透与追踪直接改写弹道。',
  },
  sword: {
    name: '圣剑',
    en: 'EDGE',
    verb: '贴近破阵，第三击收割',
    cost: '挥砍能扫除敌弹；重击后恢复更久，需要预留退路。',
    protocol: '多发扩展扇面并产生剑气；燃烧与连锁由近身命中触发。',
  },
  cannon: {
    name: '重炮',
    en: 'SIEGE',
    verb: '聚拢敌人，一发破局',
    cost: '弹体慢、回膛久；爆破奖励预判与目标聚集。',
    protocol: '重弹放大爆破半径；追踪与控制弥补慢弹的命中代价。',
  },
} as const;
