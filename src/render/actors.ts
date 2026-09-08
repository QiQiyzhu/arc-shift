import { laserGeometry } from '../combat/geometry';
import type Phaser from 'phaser';
import type { World } from '../game/world';
import { ENEMIES } from '../data/enemies';
import { polygon } from './arena';
export function glow(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  r: number,
  c: number,
  a = 0.15,
) {
  for (let i = 4; i > 0; i--) {
    g.fillStyle(c, a / i);
    g.fillCircle(x, y, r * i * 0.5);
  }
}
export function drawActors(
  g: Phaser.GameObjects.Graphics,
  w: World,
  t: number,
) {
  for (const h of w.hazards) {
    const c = h.friendly ? (h.type === 'well' ? 0xb3a0ff : 0xffa36b) : 0xff5977;
    g.lineStyle(2, c, 0.7);
    g.strokeCircle(h.x, h.y, h.r);
    g.fillStyle(c, h.friendly ? 0.1 : 0.12);
    g.fillCircle(h.x, h.y, h.r);
    if (!h.friendly) {
      g.fillStyle(c, 0.22);
      g.fillCircle(h.x, h.y, h.r * (1 - h.time / h.duration));
      g.lineStyle(1, c, 0.4);
      g.lineBetween(h.x - 12, h.y, h.x + 12, h.y);
      g.lineBetween(h.x, h.y - 12, h.x, h.y + 12);
    } else if (h.type === 'well') {
      for (let i = 0; i < 4; i++) {
        g.lineStyle(1, c, 0.55 - i * 0.08);
        g.strokeEllipse(h.x, h.y, h.r * (1 + i * 0.3), h.r * (0.4 + i * 0.2));
      }
      glow(g, h.x, h.y, 20, c, 0.12);
    }
  }
  for (const e of w.enemies) {
    const c = e.flash > 0 ? 0xffffff : ENEMIES[e.kind].color;
    const boss = e.radius > 35;
    g.fillStyle(0x010508, 0.65);
    g.fillEllipse(e.x, e.y + e.radius * 0.9, e.radius * 2.6, e.radius * 0.7);
    if (
      e.kind === 'oracle' &&
      e.attackIndex % 3 === 2 &&
      e.state === 'telegraph'
    ) {
      const b = laserGeometry(e);
      g.lineStyle(b.halfWidth * 2, 0xe5a0ff, 0.18);
      g.lineBetween(b.x1, b.y1, b.x2, b.y2);
      g.lineStyle(2, 0xe5a0ff, 0.8);
      g.lineBetween(b.x1, b.y1, b.x2, b.y2);
    }
    if (e.state === 'telegraph') {
      const a = Math.atan2(e.aimY - e.y, e.aimX - e.x);
      const charge =
        e.kind === 'lancer' || (e.kind === 'warden' && e.attackIndex % 3 === 2);
      g.lineStyle(charge ? 24 : 2, 0xff677f, charge ? 0.13 : 0.65);
      g.lineBetween(
        e.x,
        e.y,
        e.x + Math.cos(a) * (charge ? 400 : 530),
        e.y + Math.sin(a) * (charge ? 400 : 530),
      );
      g.lineStyle(1, 0xff91a3, 0.85);
      g.lineBetween(e.x, e.y, e.x + Math.cos(a) * 530, e.y + Math.sin(a) * 530);
      g.lineStyle(2, 0xff7189, 0.8);
      g.strokeCircle(e.x, e.y, e.radius + 12 + Math.sin(t * 8) * 3);
    }
    if (e.kind === 'oracle' && e.state === 'attack') {
      const a = Math.atan2(e.aimY - e.y, e.aimX - e.x) + (2.6 - e.timer) * 0.42;
      g.lineStyle(32, 0xe5a0ff, 0.12);
      g.lineBetween(
        e.x - Math.cos(a) * 1100,
        e.y - Math.sin(a) * 1100,
        e.x + Math.cos(a) * 1100,
        e.y + Math.sin(a) * 1100,
      );
      g.lineStyle(8, 0xdc9fff, 0.7);
      g.lineBetween(
        e.x - Math.cos(a) * 1100,
        e.y - Math.sin(a) * 1100,
        e.x + Math.cos(a) * 1100,
        e.y + Math.sin(a) * 1100,
      );
      g.lineStyle(2, 0xffeaff, 1);
      g.lineBetween(
        e.x - Math.cos(a) * 1100,
        e.y - Math.sin(a) * 1100,
        e.x + Math.cos(a) * 1100,
        e.y + Math.sin(a) * 1100,
      );
    }
    glow(g, e.x, e.y, e.radius, c, 0.065);
    const angle = boss
      ? t * 0.12
      : Math.atan2(w.player.y - e.y, w.player.x - e.x);
    g.lineStyle(2, c, 0.8);
    g.fillStyle(e.flash > 0 ? 0xfaffff : 0x18242e, 0.95);
    if (e.kind === 'hunter') {
      polygon(g, e.x, e.y, e.radius, 4, angle);
      g.fillStyle(c);
      polygon(
        g,
        e.x + Math.cos(angle) * 4,
        e.y + Math.sin(angle) * 4,
        6,
        3,
        angle,
      );
    } else if (e.kind === 'lancer') {
      polygon(g, e.x, e.y, e.radius, 3, angle);
      g.lineStyle(1, c, 0.8);
      polygon(
        g,
        e.x - 5 * Math.cos(angle),
        e.y - 5 * Math.sin(angle),
        e.radius * 0.5,
        3,
        angle,
      );
    } else if (e.kind === 'sentry') {
      polygon(g, e.x, e.y, e.radius, 6, t * 0.4);
      g.fillStyle(c, 0.9);
      polygon(g, e.x, e.y, 7, 4, Math.PI / 4);
    } else if (e.kind === 'conduit') {
      polygon(g, e.x, e.y, e.radius, 4, Math.PI / 4);
      g.lineStyle(3, c);
      g.lineBetween(e.x - 8, e.y, e.x + 8, e.y);
      g.lineBetween(e.x, e.y - 8, e.x, e.y + 8);
      for (const n of w.enemies)
        if (n !== e && Math.hypot(n.x - e.x, n.y - e.y) < 210) {
          g.lineStyle(1, c, 0.15);
          g.lineBetween(e.x, e.y, n.x, n.y);
        }
    } else if (e.kind === 'weaver') {
      polygon(g, e.x, e.y, e.radius, 5, -t * 0.4);
      g.lineStyle(1, c, 0.7);
      g.strokeCircle(e.x, e.y, 9);
    } else {
      polygon(
        g,
        e.x,
        e.y,
        e.radius,
        boss && e.kind === 'oracle' ? 8 : 6,
        angle,
      );
      g.lineStyle(3, c);
      polygon(g, e.x, e.y, e.radius * 0.72, 4, -angle);
      g.fillStyle(c, 0.3);
      polygon(g, e.x, e.y, e.radius * 0.38, 4, Math.PI / 4);
      glow(g, e.x, e.y, 12, c, 0.3);
      g.fillStyle(0xffffff);
      g.fillCircle(e.x, e.y, 5);
      for (let i = 0; i < 6; i++) {
        const a = t * 0.4 + (i * Math.PI) / 3;
        g.fillStyle(0x172531);
        g.lineStyle(2, c, 0.7);
        polygon(
          g,
          e.x + Math.cos(a) * (e.radius + 16),
          e.y + Math.sin(a) * (e.radius + 16),
          7,
          4,
          a,
        );
      }
    }
    if (e.elite) {
      g.lineStyle(1, 0xeaffad, 0.7);
      g.strokeCircle(e.x, e.y, e.radius + 7);
    }
    if (e.slow > 0) {
      g.lineStyle(1, 0x9bdeff, 0.6);
      g.strokeCircle(e.x, e.y, e.radius + 3);
    }
    if (e.burn > 0) {
      glow(g, e.x, e.y + 10, 12, 0xff8e4c, 0.12);
    }
    if (e.hp < e.maxHp && !boss) {
      g.fillStyle(0x070b0f, 0.8);
      g.fillRect(e.x - 18, e.y - e.radius - 11, 36, 3);
      g.fillStyle(c, 0.8);
      g.fillRect(e.x - 18, e.y - e.radius - 11, (36 * e.hp) / e.maxHp, 3);
    }
  }
  for (const b of w.projectiles.items) {
    if (!b.active) continue;
    const a = Math.atan2(b.vy, b.vx);
    g.lineStyle(b.enemy ? 10 : 9, b.color, 0.08);
    g.lineBetween(b.x - Math.cos(a) * 27, b.y - Math.sin(a) * 27, b.x, b.y);
    g.lineStyle(b.enemy ? 4 : 3, b.color, 0.9);
    g.lineBetween(b.x - Math.cos(a) * 15, b.y - Math.sin(a) * 15, b.x, b.y);
    glow(g, b.x, b.y, b.radius, b.color, 0.14);
    g.fillStyle(b.enemy ? b.color : 0xe3fffa);
    g.fillCircle(b.x, b.y, b.radius * 0.65);
  }
  const p = w.player;
  const c = p.invulnerable > 0 ? 0xe4ffde : 0x83efdb;
  g.fillStyle(0x010508, 0.8);
  g.fillEllipse(p.x, p.y + 20, 53, 17);
  glow(g, p.x, p.y, 22, c, 0.09);
  g.lineStyle(1, c, 0.25);
  g.strokeEllipse(p.x, p.y + 15, 51, 24);
  g.fillStyle(0x163c40);
  g.lineStyle(2, c, 0.9);
  // A hooded geometric arcanist: split coat, shoulder plates, face slit, floating catalyst.
  const points = [
    { x: p.x, y: p.y - 21 },
    { x: p.x + 12, y: p.y - 8 },
    { x: p.x + 18, y: p.y + 17 },
    { x: p.x + 3, y: p.y + 12 },
    { x: p.x, y: p.y + 21 },
    { x: p.x - 16, y: p.y + 15 },
    { x: p.x - 10, y: p.y - 9 },
  ];
  g.fillPoints(points, true);
  g.strokePoints(points, true);
  g.fillStyle(0x07141d);
  polygon(g, p.x, p.y - 8, 9, 4, Math.PI / 4);
  g.lineStyle(3, 0xc9fff2);
  g.lineBetween(p.x - 5, p.y - 8, p.x + 5, p.y - 8);
  const ox = p.x + Math.cos(p.angle) * 25,
    oy = p.y + Math.sin(p.angle) * 25;
  g.lineStyle(2, c, 0.8);
  g.lineBetween(p.x, p.y, ox, oy);
  g.fillStyle(0x183b3e);
  polygon(g, ox, oy, 8, 4, p.angle);
  g.fillStyle(0xe1fff6);
  g.fillCircle(ox, oy, 3);
  if (p.shield > 0) {
    g.lineStyle(2, 0xd3f5a3, 0.5);
    g.strokeCircle(p.x, p.y, 29);
  }
  if (p.dashTime > 0) {
    g.lineStyle(2, c, 0.7);
    g.strokeCircle(p.x, p.y, 28);
  }
}
