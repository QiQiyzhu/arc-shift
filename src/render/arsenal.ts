import type Phaser from 'phaser';
import type { World } from '../game/world';
import { polygon } from './arena';
export function drawSupplies(
  g: Phaser.GameObjects.Graphics,
  w: World,
  t: number,
) {
  for (const p of w.pickups) {
    const y = p.y + Math.sin(t * 5 + p.x) * 2,
      c =
        p.kind === 'shards'
          ? 0xc6a4ff
          : p.kind === 'bombs'
            ? 0xffae85
            : p.kind === 'keys'
              ? 0x83e6dd
              : 0xffd78b;
    g.fillStyle(0x06090c, 0.7);
    g.fillEllipse(p.x, p.y + 8, 18, 5);
    g.fillStyle(c, 0.12);
    g.fillCircle(p.x, y, 14);
    g.lineStyle(2, c, 0.95);
    g.fillStyle(0x16242a, 1);
    if (p.kind === 'coins') {
      g.fillCircle(p.x, y, 6);
      g.strokeCircle(p.x, y, 6);
      g.lineBetween(p.x, y - 3, p.x, y + 3);
    } else if (p.kind === 'keys') {
      g.strokeCircle(p.x - 3, y - 3, 4);
      g.lineBetween(p.x, y, p.x + 6, y + 6);
      g.lineBetween(p.x + 4, y + 5, p.x + 7, y + 2);
    } else
      polygon(
        g,
        p.x,
        y,
        p.kind === 'shards' ? 8 : 7,
        p.kind === 'shards' ? 4 : 6,
        t * 0.3,
      );
  }
  for (const b of w.bombs) {
    const pulse = 1 - b.time / 0.8;
    g.lineStyle(1, 0xffd59e, 0.55);
    g.strokeCircle(b.x, b.y, 170);
    g.fillStyle(0xffb16c, 0.04 + pulse * 0.12);
    g.fillCircle(b.x, b.y, 170 * pulse);
    g.fillStyle(0x232838, 1);
    g.lineStyle(2, 0xffda9e, 1);
    polygon(g, b.x, b.y, 13, 6, t * 3);
    g.fillStyle(0xffe8ac, 0.5 + Math.sin(t * 40) * 0.5);
    g.fillCircle(b.x, b.y, 5);
  }
}
export function drawSwordArc(g: Phaser.GameObjects.Graphics, w: World) {
  const s = w.swing;
  if (!s) return;
  const anticipation = s.age < 0.055,
    fade = anticipation ? 0.2 : Math.max(0, 1 - (s.age - 0.055) / 0.225);
  const color = s.combo === 2 ? 0xffebad : 0xffd991;
  const points = [{ x: s.x, y: s.y }];
  for (let i = 0; i <= 24; i++) {
    const a = s.angle - s.arc / 2 + (s.arc * i) / 24;
    points.push({
      x: s.x + Math.cos(a) * s.range,
      y: s.y + Math.sin(a) * s.range,
    });
  }
  g.fillStyle(w.stats.primary, fade * 0.12);
  g.fillPoints(points, true);
  for (const [width, radius, alpha, c] of [
    [18, s.range - 4, 0.16, w.stats.primary],
    [6, s.range, 0.65, color],
    [2, s.range + 3, 1, 0xffffe8],
    [2, s.range * 0.72, 0.6, w.stats.accent],
  ]) {
    g.lineStyle(width, c, fade * alpha);
    g.beginPath();
    g.arc(s.x, s.y, radius, s.angle - s.arc / 2, s.angle + s.arc / 2, false);
    g.strokePath();
  }
  if (s.combo === 2 && !anticipation) {
    for (let i = 0; i < 7; i++) {
      const a = s.angle - 1.2 + i * 0.4,
        r = s.range + s.age * 110;
      g.lineStyle(2, color, fade);
      g.lineBetween(
        s.x + Math.cos(a) * r,
        s.y + Math.sin(a) * r,
        s.x + Math.cos(a) * (r + 17),
        s.y + Math.sin(a) * (r + 17),
      );
    }
  }
}
export function drawHeldWeapon(g: Phaser.GameObjects.Graphics, w: World) {
  const p = w.player;
  let a = p.angle;
  if (w.weapon === 'sword') {
    if (w.swing) {
      const s = w.swing,
        progress = Math.max(0, Math.min(1, (s.age - 0.03) / 0.15));
      a = s.angle + (progress - 0.5) * s.arc * (s.combo % 2 ? -1 : 1);
    }
    const point = (x: number, y: number) => ({
      x: p.x + Math.cos(a) * x - Math.sin(a) * y,
      y: p.y + Math.sin(a) * x + Math.cos(a) * y,
    });
    const blade = [
      point(24, -5),
      point(66, -3),
      point(82, 0),
      point(66, 3),
      point(24, 5),
    ];
    g.lineStyle(8, 0xffce83, 0.16);
    const tip = point(82, 0),
      grip = point(13, 0);
    g.lineBetween(grip.x, grip.y, tip.x, tip.y);
    g.fillStyle(0xffffeb, 0.98);
    g.fillPoints(blade, true);
    g.lineStyle(1, w.stats.primary, 0.9);
    g.strokePoints(blade, true);
    const l = point(24, -13),
      r = point(24, 13);
    g.lineStyle(4, 0xe6b972, 1);
    g.lineBetween(l.x, l.y, r.x, r.y);
    const h = point(25, 0);
    g.lineStyle(5, 0x877857, 1);
    g.lineBetween(grip.x, grip.y, h.x, h.y);
  } else if (w.weapon === 'cannon') {
    const ox = p.x + Math.cos(a) * 42,
      oy = p.y + Math.sin(a) * 42;
    g.lineStyle(19, 0xc89777, 1);
    g.lineBetween(p.x + Math.cos(a) * 13, p.y + Math.sin(a) * 13, ox, oy);
    g.lineStyle(13, 0x1f2935, 1);
    g.lineBetween(p.x + Math.cos(a) * 13, p.y + Math.sin(a) * 13, ox, oy);
    g.lineStyle(3, w.stats.primary, 0.9);
    g.lineBetween(p.x + Math.cos(a) * 20, p.y + Math.sin(a) * 20, ox, oy);
    g.fillStyle(0x111c24);
    g.fillCircle(ox, oy, 8);
    g.lineStyle(2, 0xffc38d, 1);
    g.strokeCircle(ox, oy, 8);
  } else {
    const ox = p.x + Math.cos(a) * 25,
      oy = p.y + Math.sin(a) * 25;
    g.lineStyle(2, w.stats.primary, 0.8);
    g.lineBetween(p.x, p.y, ox, oy);
    g.fillStyle(0x183b3e);
    polygon(g, ox, oy, 8, 4, a);
    g.fillStyle(0xe1fff6);
    g.fillCircle(ox, oy, 3);
  }
}
