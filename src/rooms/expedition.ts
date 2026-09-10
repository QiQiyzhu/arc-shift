import { Random } from '../core/math';
import type { Biome, Room, RoomKind } from '../game/types';
import { makeRoom } from './generator';
export interface RouteNode {
  id: string;
  depth: number;
  lane: number;
  room: Room;
  next: string[];
}
export const BIOMES = {
  sanctum: {
    name: '沉钟圣所',
    en: 'THE HOLLOW BELFRY',
    color: '#d5bc88',
    description: '钟还在响，守门人仍未换班。',
  },
  grove: {
    name: '悼亡林地',
    en: 'THE MOURNING GROVE',
    color: '#9cd5c8',
    description: '她让所有的名字，都长成了树。',
  },
  foundry: {
    name: '余烬铸庭',
    en: 'THE CINDER COURT',
    color: '#e3a18b',
    description: '一座没有居民的城，仍然需要温暖。',
  },
} as const;
const rows: RoomKind[][] = [
  ['combat'],
  ['combat', 'forge', 'archive'],
  ['heal', 'event', 'elite'],
  ['boss'],
  ['combat', 'shop', 'challenge'],
  ['archive', 'treasure', 'event'],
  ['heal', 'forge', 'elite'],
  ['boss'],
  ['combat', 'shop', 'challenge'],
  ['archive', 'treasure', 'event'],
  ['heal', 'forge', 'elite'],
  ['boss'],
];
const special: Partial<Record<RoomKind, string>> = {
  forge: '失温工坊',
  archive: '失落档案',
  event: '逆响遗迹',
  shop: '渡鸦行商',
  challenge: '封缄试场',
  heal: '无名篝火',
  treasure: '封存武库',
};
export function expedition(seed: number): RouteNode[] {
  const result: RouteNode[] = [];
  for (let i = 0; i < rows.length; i++) {
    const depth = i + 1,
      rng = new Random(seed + depth * 7247);
    const kinds = rows[i].length === 1 ? rows[i] : rng.shuffle([...rows[i]]);
    for (let n = 0; n < kinds.length; n++) {
      const lane = kinds.length === 1 ? 1 : n,
        kind = kinds[n],
        id = `${depth}:${lane}`;
      const biome: Biome =
        depth <= 4 ? 'sanctum' : depth <= 8 ? 'grove' : 'foundry';
      const bossKind =
        depth === 4
          ? 'warden'
          : depth === 8
            ? seed % 2 === 0
              ? 'matron'
              : 'forgemaster'
            : 'oracle';
      const room = makeRoom(depth, kind, seed + lane * 31991);
      Object.assign(room, {
        nodeId: id,
        lane,
        biome:
          kind === 'boss' && bossKind === 'forgemaster' ? 'foundry' : biome,
        bossKind: kind === 'boss' ? bossKind : undefined,
        modifier: ['combat', 'elite', 'challenge'].includes(kind)
          ? rng.pick(['none', 'haste', 'thorns', 'fervor'])
          : 'none',
      });
      if (special[kind]) room.name = special[kind]!;
      if (kind === 'boss')
        room.name = {
          warden: '第七守门人',
          matron: '挽歌圣母',
          forgemaster: '灰烬执政官',
          oracle: '零号神谕',
        }[bossKind];
      result.push({ id, depth, lane, room, next: [] });
    }
  }
  for (const n of result)
    n.next = result
      .filter(
        (m) =>
          m.depth === n.depth + 1 &&
          (n.room.kind === 'boss' ||
            m.room.kind === 'boss' ||
            Math.abs(m.lane - n.lane) <= 1),
      )
      .map((m) => m.id);
  return result;
}
export function availableNodes(seed: number, current: string) {
  const map = expedition(seed),
    node = map.find((n) => n.id === current);
  return map.filter((n) => node?.next.includes(n.id));
}
