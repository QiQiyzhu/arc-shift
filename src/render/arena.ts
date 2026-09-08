import type Phaser from 'phaser';
import { Random } from '../core/math';
export function polygon(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  r: number,
  sides: number,
  angle = 0,
  sy = 1,
) {
  const points = [];
  for (let i = 0; i < sides; i++) {
    const a = angle + (i * Math.PI * 2) / sides;
    points.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * sy });
  }
  g.fillPoints(points, true);
  g.strokePoints(points, true);
}
export function drawArena(g: Phaser.GameObjects.Graphics, template = 0) {
  g.clear();
  g.fillStyle(0x070d13);
  g.fillRect(0, 0, 1280, 720);
  // Chamfered floating arena and layered bevel, cached as static GPU geometry.
  const edge = [
    { x: 130, y: 82 },
    { x: 1146, y: 82 },
    { x: 1220, y: 154 },
    { x: 1220, y: 590 },
    { x: 1146, y: 656 },
    { x: 130, y: 656 },
    { x: 58, y: 590 },
    { x: 58, y: 154 },
  ];
  g.fillStyle(0x020609);
  g.fillPoints(
    edge.map((p) => ({ x: p.x, y: p.y + 16 })),
    true,
  );
  g.fillStyle(0x17262d);
  g.lineStyle(2, 0x42534c, 0.5);
  g.fillPoints(edge, true);
  g.strokePoints(edge, true);
  const inner = edge.map((p) => ({
    x: 640 + (p.x - 640) * 0.966,
    y: 365 + (p.y - 365) * 0.942,
  }));
  g.fillStyle(0x0c171e);
  g.lineStyle(1, 0x8bab8e, 0.2);
  g.fillPoints(inner, true);
  g.strokePoints(inner, true);
  const r = new Random(922 + template);
  for (let y = 130; y < 616; y += 36)
    for (let x = 97; x < 1185; x += 42) {
      g.lineStyle(1, 0x416471, 0.1 + r.next() * 0.05);
      g.fillStyle(r.next() > 0.8 ? 0x15262c : 0x102029, 0.28);
      polygon(
        g,
        x + (Math.floor(y / 36) % 2) * 21,
        y,
        23.4,
        6,
        Math.PI / 6,
        0.86,
      );
    }
  for (let i = 0; i < 180; i++) {
    const x = r.int(100, 1180),
      y = r.int(120, 620);
    g.fillStyle(0x93b5a1, r.next() * 0.11);
    g.fillRect(x, y, r.int(1, 3), 1);
  }
  for (const x of [90, 1190]) {
    g.lineStyle(2, 0x7bccbe, 0.28);
    g.lineBetween(x, 210, x, 520);
    for (let y = 220; y < 520; y += 12) {
      g.lineStyle(1, 0x7bccbe, 0.2);
      g.lineBetween(x - 5, y, x + 5, y + 4);
    }
  }
  for (const y of [104, 631]) {
    g.lineStyle(1, 0xa7bea0, 0.25);
    g.lineBetween(245, y, 1035, y);
    for (let x = 565; x < 715; x += 14) {
      g.lineStyle(2, 0xcdeb9e, 0.35);
      g.lineBetween(x, y - 3, x + 5, y + 3);
    }
  }
  // The ritual is navigable floor decoration; silhouettes never hide collision walls.
  g.lineStyle(1, 0x79ad9c, 0.15);
  g.strokeCircle(640, 365, 178);
  g.strokeCircle(640, 365, 183);
  g.strokeCircle(640, 365, 136);
  g.fillStyle(0x19322f, 0.09);
  polygon(g, 640, 365, 124, 6, Math.PI / 6);
  g.lineStyle(1, 0xaed7a4, 0.17);
  polygon(g, 640, 365, 162, 3, -Math.PI / 2);
  polygon(g, 640, 365, 162, 3, Math.PI / 2);
  for (let i = 0; i < 48; i++) {
    const a = (i * Math.PI) / 24;
    g.lineStyle(i % 4 === 0 ? 2 : 1, 0x9ac0a8, 0.25);
    g.lineBetween(
      640 + Math.cos(a) * 187,
      365 + Math.sin(a) * 187,
      640 + Math.cos(a) * (i % 4 === 0 ? 196 : 190),
      365 + Math.sin(a) * (i % 4 === 0 ? 196 : 190),
    );
  }
  for (const [x, y] of [
    [169, 182],
    [1110, 182],
    [169, 551],
    [1110, 551],
  ]) {
    g.fillStyle(0x030a0e, 0.6);
    g.fillEllipse(x, y + 12, 94, 36);
    g.fillStyle(0x25373b);
    g.lineStyle(1, 0x617b74, 0.45);
    polygon(g, x, y, 35, 6, Math.PI / 6, 0.66);
    g.fillStyle(0x111c23);
    polygon(g, x, y - 9, 27, 6, Math.PI / 6, 0.66);
    g.fillStyle(0x89c9b0, 0.5);
    g.fillRect(x - 14, y - 10, 28, 2);
  }
  for (const [x, y] of [
    [370, 175],
    [905, 557],
  ]) {
    g.lineStyle(1, 0x759b8d, 0.18);
    g.strokeRect(x - 42, y - 16, 84, 32);
    g.lineBetween(x - 56, y, x + 56, y);
  }
}
