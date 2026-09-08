import type Phaser from 'phaser';
import { Pool } from '../core/pool';
import type { EffectEvent } from '../core/events';
export class Effects {
  particles = new Pool(650, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 1,
    size: 2,
    color: 0xffffff,
    ring: false,
    ghost: false,
  }));
  labels: Phaser.GameObjects.Text[] = [];
  beams: {
    x: number;
    y: number;
    x2: number;
    y2: number;
    life: number;
    color: number;
  }[] = [];
  constructor(private scene: Phaser.Scene) {
    for (let i = 0; i < 40; i++)
      this.labels.push(
        scene.add
          .text(0, 0, '', {
            fontFamily: 'Consolas,monospace',
            fontSize: '18px',
            color: '#e4fcff',
            fontStyle: 'bold',
          })
          .setDepth(8)
          .setVisible(false),
      );
  }
  emit(e: EffectEvent) {
    if (e.x2 !== undefined) {
      this.beams.push({
        x: e.x,
        y: e.y,
        x2: e.x2,
        y2: e.y2!,
        life: 0.22,
        color: e.color,
      });
      return;
    }
    const count =
      e.kind === 'dash'
        ? 2
        : e.kind === 'shot'
          ? 3
          : e.kind === 'kill'
            ? 19
            : e.kind === 'phase' || e.kind === 'victory'
              ? 65
              : 9;
    for (let i = 0; i < count; i++) {
      const p = this.particles.acquire();
      if (!p) break;
      const a = Math.random() * Math.PI * 2;
      const speed =
        e.kind === 'dash'
          ? 0
          : e.kind === 'shot'
            ? 40
            : 40 + Math.random() * 170;
      Object.assign(p, {
        x: e.x,
        y: e.y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0.2 + Math.random() * 0.45,
        maxLife: 0.65,
        size: e.kind === 'dash' ? 8 : 1 + Math.random() * 3,
        color: e.color,
        ring: false,
        ghost: e.kind === 'dash' && i === 0,
      });
    }
    if (['skill', 'reward', 'phase', 'kill', 'victory'].includes(e.kind)) {
      const p = this.particles.acquire();
      if (p)
        Object.assign(p, {
          x: e.x,
          y: e.y,
          vx: 0,
          vy: 0,
          life: 0.5,
          maxLife: 0.5,
          size: e.amount || 75,
          color: e.color,
          ring: true,
          ghost: false,
        });
    }
    if (
      (e.kind === 'hit' || e.kind === 'crit' || e.kind === 'hurt') &&
      e.amount
    ) {
      const t = this.labels.find((t) => !t.visible);
      if (t) {
        t.setPosition(e.x + (Math.random() - 0.5) * 20, e.y - 22)
          .setText(e.kind === 'hurt' ? `−${e.amount}` : String(e.amount))
          .setColor(
            e.kind === 'crit'
              ? '#e0ffa5'
              : e.kind === 'hurt'
                ? '#ff849b'
                : '#c6eff0',
          )
          .setFontSize(e.kind === 'crit' ? 25 : 17)
          .setVisible(true)
          .setAlpha(1);
        t.setData('life', 0.65);
      }
    }
  }
  draw(g: Phaser.GameObjects.Graphics, dt: number) {
    for (const p of this.particles.items) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const alpha = Math.min(1, p.life / p.maxLife);
      if (p.ghost) {
        g.fillStyle(p.color, alpha * 0.16);
        g.lineStyle(1, p.color, alpha * 0.45);
        const pts = [
          { x: p.x, y: p.y - 21 },
          { x: p.x + 12, y: p.y - 8 },
          { x: p.x + 17, y: p.y + 16 },
          { x: p.x + 2, y: p.y + 12 },
          { x: p.x, y: p.y + 21 },
          { x: p.x - 16, y: p.y + 15 },
          { x: p.x - 10, y: p.y - 9 },
        ];
        g.fillPoints(pts, true);
        g.strokePoints(pts, true);
      } else if (p.ring) {
        g.lineStyle(2, p.color, alpha * 0.6);
        g.strokeCircle(p.x, p.y, p.size * (1 - alpha * 0.7));
      } else {
        g.fillStyle(p.color, alpha * 0.12);
        g.fillCircle(p.x, p.y, p.size * 3);
        g.fillStyle(p.color, alpha);
        g.fillRect(p.x, p.y, p.size, p.size);
      }
    }
    for (const t of this.labels) {
      if (!t.visible) continue;
      const life = t.getData('life') - dt;
      t.setData('life', life);
      t.y -= dt * 34;
      t.setAlpha(Math.min(1, life * 3));
      if (life <= 0) t.setVisible(false);
    }
    this.beams = this.beams.filter((b) => b.life > 0);
    for (const b of this.beams) {
      b.life -= dt;
      g.lineStyle(8, b.color, b.life * 0.7);
      g.lineBetween(b.x, b.y, b.x2, b.y2);
      g.lineStyle(2, 0xf0eaff, b.life * 4);
      g.beginPath();
      g.moveTo(b.x, b.y);
      for (let i = 1; i < 7; i++)
        g.lineTo(
          b.x + ((b.x2 - b.x) * i) / 7 + (Math.random() - 0.5) * 18,
          b.y + ((b.y2 - b.y) * i) / 7 + (Math.random() - 0.5) * 18,
        );
      g.lineTo(b.x2, b.y2);
      g.strokePath();
    }
  }
  clear() {
    this.particles.clear();
    this.beams = [];
    this.labels.forEach((t) => t.setVisible(false));
  }
}
