import type { EnemyKind } from '../game/types';
export const ENEMIES: Record<
  EnemyKind,
  {
    name: string;
    hp: number;
    speed: number;
    damage: number;
    radius: number;
    color: number;
  }
> = {
  hunter: {
    name: '蚀刻者',
    hp: 52,
    speed: 100,
    damage: 9,
    radius: 17,
    color: 0xf386ad,
  },
  sentry: {
    name: '棱镜哨兵',
    hp: 65,
    speed: 64,
    damage: 10,
    radius: 19,
    color: 0xffc178,
  },
  lancer: {
    name: '裂隙冲锋者',
    hp: 95,
    speed: 70,
    damage: 17,
    radius: 22,
    color: 0xff667f,
  },
  weaver: {
    name: '咒域编织者',
    hp: 105,
    speed: 52,
    damage: 18,
    radius: 21,
    color: 0xbda0ff,
  },
  conduit: {
    name: '修复中继',
    hp: 86,
    speed: 70,
    damage: 7,
    radius: 18,
    color: 0xa5eb93,
  },
  warden: {
    name: '第七守门人',
    hp: 3600,
    speed: 62,
    damage: 22,
    radius: 49,
    color: 0xffb275,
  },
  oracle: {
    name: '零号神谕',
    hp: 6500,
    speed: 55,
    damage: 24,
    radius: 52,
    color: 0xc8a5ff,
  },
};
