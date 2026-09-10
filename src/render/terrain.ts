import type Phaser from 'phaser';
import type { World } from '../game/world';
import { zoneActive } from '../rooms/terrain';
import { polygon } from './arena';
export function drawTerrain(g: Phaser.GameObjects.Graphics, w: World) {
  const color =
    w.room.biome === 'grove'
      ? 0x7ba99c
      : w.room.biome === 'foundry'
        ? 0xc28a68
        : 0xaba280;
  for (const b of w.terrain.blocks) {
    g.fillStyle(0x020609, 0.8);
    g.fillRect(b.x - 5, b.y + 5, b.w + 10, b.h + 7);
    g.fillStyle(0x11191b, 1);
    g.fillRect(b.x, b.y, b.w, b.h);
    g.lineStyle(2, color, 0.58);
    g.strokeRect(b.x, b.y, b.w, b.h);
    g.lineStyle(1, color, 0.16);
    g.strokeRect(b.x + 7, b.y + 7, b.w - 14, b.h - 14);
    for (let x = b.x + 15; x < b.x + b.w - 10; x += 23) {
      g.lineBetween(x, b.y + 5, x - 8, b.y + 13);
      g.lineBetween(x, b.y + b.h - 13, x - 8, b.y + b.h - 5);
    }
    g.lineStyle(1, color, 0.4);
    g.fillStyle(color, 0.08);
    polygon(g, b.x + b.w / 2, b.y + b.h / 2, 15, 4, Math.PI / 4);
  }
  for (const z of w.terrain.zones) {
    const friendly = z.kind === 'blessing',
      active = zoneActive(w),
      c = friendly ? 0x94dcc0 : active ? 0xff6e68 : 0xc7a17a;
    g.fillStyle(c, friendly ? 0.045 : active ? 0.24 : 0.045);
    g.fillCircle(z.x, z.y, z.r);
    g.lineStyle(active && !friendly ? 3 : 1, c, friendly ? 0.5 : 0.7);
    g.strokeCircle(z.x, z.y, z.r);
    g.strokeCircle(z.x, z.y, z.r - 7);
    if (friendly) {
      g.lineStyle(1, c, 0.55);
      polygon(g, z.x, z.y, 27, 6, w.roomTime * 0.08);
      g.lineBetween(z.x - 9, z.y, z.x + 9, z.y);
      g.lineBetween(z.x, z.y - 9, z.x, z.y + 9);
      if (w.room.kind === 'challenge') {
        g.lineStyle(1, c, 0.25);
        g.strokeCircle(z.x, z.y, 100);
        g.lineStyle(4, c, 0.9);
        g.beginPath();
        g.arc(
          z.x,
          z.y,
          100,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * Math.min(1, w.challengeTime / 18),
          false,
        );
        g.strokePath();
      }
    } else {
      g.lineStyle(2, c, 0.65);
      g.beginPath();
      g.arc(
        z.x,
        z.y,
        z.r + 5,
        -Math.PI / 2,
        -Math.PI / 2 + (Math.PI * 2 * (w.roomTime % 4)) / 4,
        false,
      );
      g.strokePath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        g.fillStyle(c, active ? 0.8 : 0.3);
        polygon(
          g,
          z.x + Math.cos(a) * 23,
          z.y + Math.sin(a) * 23,
          active ? 8 : 4,
          3,
          a,
        );
      }
    }
  }
}
