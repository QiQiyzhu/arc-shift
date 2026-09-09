export const SYNERGIES = [
  {
    id: 'plasma',
    name: '电浆回路',
    color: '#ffb477',
    requires: ['fire-ember', 'storm-arc'],
    description: '电弧命中燃烧目标时，将 1 秒燃烧转化为小范围电浆爆发。',
  },
  {
    id: 'superconductor',
    name: '超导棱晶',
    color: '#90dbf4',
    requires: ['ice-touch', 'storm-arc'],
    description: '电弧优先连接寒冷目标，并可额外跳跃一次。',
  },
  {
    id: 'thermal',
    name: '热裂变',
    color: '#ffc99b',
    requires: ['fire-ember', 'ice-touch'],
    description:
      '再次命中燃烧且寒冷的敌人，消耗旧状态引发热冲击；每目标 1.2 秒一次。',
  },
  {
    id: 'prism',
    name: '星轨棱镜',
    color: '#cca9ff',
    requires: ['ice-prism', 'void-seek'],
    description: '反弹后追踪更强；首次反弹延长寿命，每次反弹伤害衰减 15%。',
  },
  {
    id: 'collapse',
    name: '坍缩火种',
    color: '#eea2e9',
    requires: ['fire-blast', 'void-horizon'],
    description: '奇点内的命中将溅射转移到奇点中心，形成更大的坍缩爆发。',
  },
  {
    id: 'afterimage',
    name: '瞬电残响',
    color: '#d0ed9e',
    requires: ['shift-reload', 'storm-arc'],
    description: 'Dash 后的前 3 次射击，在起点额外发射一枚继承弹道的电针。',
  },
] as const;
export function activeSynergies(ids: readonly string[]) {
  return SYNERGIES.filter((s) => s.requires.every((id) => ids.includes(id)));
}
export function newSynergies(ids: readonly string[], candidate: string) {
  return activeSynergies([...ids, candidate]).filter(
    (s) => !s.requires.every((id) => ids.includes(id)),
  );
}
export const TRIAL_BUILDS = [
  {
    name: '三相炼星',
    subtitle: '重弹 · 扇射 · 热裂变',
    description: '橙色陨星携带冰霜，连续命中引爆冷热冲击。',
    cards: [
      'fire-ember',
      'ice-touch',
      'fire-split',
      'fire-meteor',
      'fire-blast',
      'ice-pierce',
    ],
  },
  {
    name: '折光星群',
    subtitle: '追踪 · 反弹 · 分裂',
    description: '分裂弹追逐目标，在墙边折回并延长星轨。',
    cards: [
      'fire-split',
      'ice-prism',
      'void-seek',
      'fire-bloom',
      'storm-needle',
      'frost-wave',
    ],
  },
  {
    name: '电浆圣歌',
    subtitle: '连锁 · 燃烧 · 浮游炮',
    description: '浮游使魔同步开火，将燃烧敌群变成电浆回路。',
    cards: [
      'storm-arc',
      'fire-ember',
      'storm-familiar',
      'storm-conduct',
      'storm-static',
      'fire-bloom',
    ],
  },
  {
    name: '冰环天体',
    subtitle: '环绕 · 寒冷 · 波动',
    description: '弹体沿身周星轨旋转，再追向附近目标。',
    cards: [
      'void-orbit',
      'ice-touch',
      'frost-fan',
      'frost-wave',
      'void-seek',
      'ice-brittle',
    ],
  },
  {
    name: '裂隙光矛',
    subtitle: '高速光矛 · 穿透 · 坍缩',
    description: '用 E 聚拢敌群，让穿透光矛在奇点中央引爆。',
    cards: [
      'storm-lance',
      'fire-blast',
      'void-horizon',
      'void-seek',
      'ice-prism',
      'storm-needle',
    ],
  },
  {
    name: '相位织雨',
    subtitle: '回旋 · 残响 · 全向闪避',
    description: 'Dash 留下射击残像，双向弹幕在回程再次压制敌人。',
    cards: [
      'shift-reload',
      'storm-arc',
      'void-return',
      'shift-rear',
      'shift-echo',
      'shift-quick',
    ],
  },
] as const;
