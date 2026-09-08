import { Random } from '../core/math';
import type { Room, RoomKind } from '../game/types';
const names = [
  '静默矩阵',
  '遗忘回廊',
  '破碎档案',
  '星屑祭坛',
  '回声熔炉',
  '边界花园',
];
export function makeRoom(index: number, kind: RoomKind, seed: number): Room {
  const r = new Random(seed + index * 9127);
  return {
    index,
    kind,
    name:
      kind === 'boss'
        ? index === 4
          ? '守门人协议'
          : '零号神谕'
        : kind === 'heal'
          ? '修复圣所'
          : kind === 'treasure'
            ? '遗失的缓存'
            : r.pick(names),
    subtitle:
      kind === 'elite'
        ? '高危异常 · 双重协议'
        : kind === 'boss'
          ? '核心实体 · 访问受限'
          : '异常区域 · 清除入侵实体',
    template: r.int(0, 3),
    seed,
  };
}
export const roomWaveCount = (index: number) => (index === 1 ? 4 : 8);
export function roomChoices(index: number, seed: number): Room[] {
  if (index === 4 || index === 8) return [makeRoom(index, 'boss', seed)];
  return [
    makeRoom(index, 'combat', seed),
    makeRoom(
      index,
      index === 3 ? 'heal' : index === 6 ? 'treasure' : 'elite',
      seed + 7,
    ),
  ];
}
