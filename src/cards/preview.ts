import type { World } from '../game/world';
import type { Stats } from '../game/types';
import { CARDS, ELEMENTS } from './catalog';
import { buildCounts, deriveStats } from './system';
import { newSynergies, SYNERGIES } from './synergies';

/** Uses the same validated parameters as gameplay, including relics and level.
 * Values are protocol base stats, not a misleading estimate of combat DPS. */
export function protocolPreview(w: World, id: string) {
  const before = deriveStats(w.cards, w.level, w.relics, w.content);
  const after = deriveStats([...w.cards, id], w.level, w.relics, w.content);
  const fields: {
    key: keyof Stats;
    label: string;
    unit?: string;
    scale?: number;
    lower?: boolean;
  }[] = [
    { key: 'damage', label: '基础伤害' },
    { key: 'rate', label: '协议基础间隔', unit: 's', lower: true },
    { key: 'projectiles', label: '发射数' },
    { key: 'burn', label: '燃烧强度' },
    { key: 'chain', label: '连锁跳数' },
    { key: 'pierce', label: '穿透次数' },
    { key: 'bounce', label: '反弹次数' },
    { key: 'slow', label: '减速', unit: '%', scale: 100 },
    { key: 'crit', label: '暴击率', unit: '%', scale: 100 },
    { key: 'speed', label: '移速' },
    { key: 'dashCooldown', label: '跃迁冷却', unit: 's', lower: true },
    { key: 'qCooldown', label: '脉冲冷却', unit: 's', lower: true },
    { key: 'eCooldown', label: '引力冷却', unit: 's', lower: true },
    { key: 'shotSpeed', label: '弹速' },
  ];
  const changes = fields.flatMap((f) => {
    const a = Number(before[f.key]),
      b = Number(after[f.key]);
    if (Math.abs(a - b) < 0.00001) return [];
    const format = (n: number) =>
      `${Number((n * (f.scale ?? 1)).toFixed(2))}${f.unit || ''}`;
    return [
      {
        label: f.label,
        before: format(a),
        after: format(b),
        benefit: f.lower ? b < a : b > a,
      },
    ];
  });
  const card = CARDS.find((c) => c.id === id)!;
  const count = buildCounts(w.cards)[card.element];
  const enabled =
    card.element === 'fire'
      ? after.burn > 0
      : card.element === 'storm'
        ? after.chain > 0
        : card.element === 'frost'
          ? after.slow > 0
          : true;
  if (id === 'ice-shell')
    changes.unshift({
      label: '最大生命',
      before: String(w.player.maxHp),
      after: String(w.player.maxHp + 40),
      benefit: true,
    });
  const threshold =
    count >= 2
      ? `${ELEMENTS[card.element].name} ${count} → ${count + 1}：${enabled ? ELEMENTS[card.element].synergy : '已集齐同系协议；还需获得对应基础状态效果才能触发加成。'}`
      : '';
  const active = newSynergies(w.cards, id);
  const pending = SYNERGIES.filter(
    (s) =>
      s.requires.includes(id as never) && !active.some((a) => a.id === s.id),
  )
    .map((s) => ({
      name: s.name,
      missing: s.requires
        .filter((c) => c !== id && !w.cards.includes(c))
        .map((c) => CARDS.find((card) => card.id === c)!.name),
    }))
    .filter((s) => s.missing.length);
  const trajectoryNote =
    id === 'void-orbit'
      ? '弹体先绕身运行；需要靠近目标，让轨道覆盖敌人。'
      : id === 'void-return'
        ? '弹体飞出后折回，可命中去程漏过的敌人；同一弹体不会重复命中同一目标。'
        : id === 'fire-meteor'
          ? '弹体更重、更慢；提前瞄准移动敌人的去向。'
          : '';
  const weaponNote =
    w.weapon === 'sword'
      ? '数值先作用于协议；圣剑将多发、弹道转为剑气，挥砍有独立倍率。'
      : w.weapon === 'cannon'
        ? '数值先作用于协议；重炮再应用独立伤害、弹速和攻击间隔倍率。'
        : '';
  const tradeoff = [trajectoryNote, weaponNote].filter(Boolean).join(' ');
  return { changes, threshold, active, pending, tradeoff };
}
