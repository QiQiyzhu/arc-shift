import type { Room } from '../game/types';
import type { World } from '../game/world';
import { clamp } from '../core/math';
import { hurtPlayer } from '../combat/damage';
export interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Zone {
  x: number;
  y: number;
  r: number;
  kind: 'spikes' | 'blessing' | 'furnace';
}
export function terrainFor(room: Room): { blocks: Block[]; zones: Zone[] } {
  if (
    !room.nodeId ||
    !['combat', 'elite', 'boss', 'challenge'].includes(room.kind)
  )
    return { blocks: [], zones: [] };
  // Open center and outer lanes remain connected; boss arenas use cut-off corners only.
  const corners =
    room.template % 2 === 0
      ? [
          { x: 76, y: 100, w: 180, h: 90 },
          { x: 1024, y: 542, w: 180, h: 90 },
        ]
      : [
          { x: 1024, y: 100, w: 180, h: 90 },
          { x: 76, y: 542, w: 180, h: 90 },
        ];
  const pillars =
    room.kind === 'boss'
      ? []
      : room.biome === 'grove'
        ? [
            { x: 385, y: 285, w: 80, h: 135 },
            { x: 805, y: 340, w: 80, h: 135 },
          ]
        : [
            { x: 325, y: 240, w: 120, h: 70 },
            { x: 835, y: 470, w: 120, h: 70 },
          ];
  return {
    blocks: [...corners, ...pillars],
    zones: [
      {
        x: 530,
        y: 260,
        r: 48,
        kind: room.biome === 'foundry' ? 'furnace' : 'spikes',
      },
      {
        x: 750,
        y: 490,
        r: 48,
        kind: room.biome === 'foundry' ? 'furnace' : 'spikes',
      },
      { x: 640, y: 365, r: 52, kind: 'blessing' },
    ],
  };
}
export function blocked(x: number, y: number, radius: number, blocks: Block[]) {
  return blocks.some(
    (b) =>
      Math.hypot(x - clamp(x, b.x, b.x + b.w), y - clamp(y, b.y, b.y + b.h)) <
      radius,
  );
}
export function crossesBlock(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number,
  blocks: Block[],
) {
  if (blocks.length === 0) return false;
  const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 6));
  for (let i = 0; i <= steps; i++)
    if (
      blocked(
        x1 + ((x2 - x1) * i) / steps,
        y1 + ((y2 - y1) * i) / steps,
        radius,
        blocks,
      )
    )
      return true;
  return false;
}
export function moveOnTerrain(
  w: World,
  body: { x: number; y: number },
  x: number,
  y: number,
  radius: number,
) {
  const blocks = w.terrain.blocks,
    fromX = body.x,
    fromY = body.y;
  const steps = Math.max(1, Math.ceil(Math.hypot(x - fromX, y - fromY) / 8));
  for (let i = 0; i < steps; i++) {
    const nx = clamp(body.x + (x - fromX) / steps, 76 + radius, 1204 - radius);
    if (!blocked(nx, body.y, radius, blocks)) body.x = nx;
    const ny = clamp(body.y + (y - fromY) / steps, 100 + radius, 632 - radius);
    if (!blocked(body.x, ny, radius, blocks)) body.y = ny;
  }
}
export function safePosition(w: World, x: number, y: number, radius: number) {
  x = clamp(x, 80 + radius, 1200 - radius);
  y = clamp(y, 104 + radius, 628 - radius);
  if (!blocked(x, y, radius, w.terrain.blocks)) return { x, y };
  for (let r = 20; r <= 600; r += 20)
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8,
        nx = clamp(x + Math.cos(a) * r, 80 + radius, 1200 - radius),
        ny = clamp(y + Math.sin(a) * r, 104 + radius, 628 - radius);
      if (!blocked(nx, ny, radius, w.terrain.blocks)) return { x: nx, y: ny };
    }
  return { x: 640, y: 440 };
}
export function zoneActive(w: World) {
  return w.roomTime % 4 >= 2.8;
}
export function updateTerrain(w: World, dt: number) {
  w.terrainTick = Math.max(0, w.terrainTick - dt);
  w.fieldBuff = w.terrain.zones.some(
    (z) =>
      z.kind === 'blessing' &&
      Math.hypot(z.x - w.player.x, z.y - w.player.y) < z.r,
  );
  if (w.fieldBuff) {
    w.player.qCd = Math.max(0, w.player.qCd - dt * 0.6);
    w.player.eCd = Math.max(0, w.player.eCd - dt * 0.6);
  }
  if (w.terrainTick === 0 && zoneActive(w)) {
    w.terrainTick = 0.65;
    for (const z of w.terrain.zones)
      if (
        z.kind !== 'blessing' &&
        Math.hypot(z.x - w.player.x, z.y - w.player.y) < z.r + 10
      )
        hurtPlayer(w, z.kind === 'furnace' ? 16 : 11);
  }
}
