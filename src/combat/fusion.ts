import type { WeaponId } from '../game/types';
export function fusionDescription(
  weapon: WeaponId,
  forms: readonly WeaponId[],
) {
  const modifiers = forms.filter((f) => f !== weapon);
  if (!modifiers.length) return '协议决定弹道、命中与攻击节奏';
  const text = {
    arc: {
      sword: '弹体化为穿透刃，射击间隔略增',
      cannon: '弹体获得小范围爆破，弹速降低',
    },
    sword: { arc: '第三斩携带符文剑气', cannon: '第一处斩击命中引出冲击波' },
    cannon: {
      arc: '炮弹命中后碎成微型弹',
      sword: '炮弹化为穿甲刃，爆破范围缩小',
    },
  };
  return modifiers
    .map((f) => (text[weapon] as Record<string, string>)[f])
    .join('；');
}
