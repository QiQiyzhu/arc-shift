import type Phaser from 'phaser';
import { Pool } from '../core/pool';
import type { EffectEvent } from '../core/events';
import { fillDisc, strokeRing, renderDiagnostics } from '../render/discs';
import { BurstSprites } from './bursts';
import { translateCopy, type Language } from '../ui/i18n';

function labelContent(
  t: Phaser.GameObjects.Text,
  value: string,
  color: string,
  size: number,
) {
  if (import.meta.env.DEV && renderDiagnostics.legacyLabels) {
    t.setText(value).setColor(color).setFontSize(size);
    return;
  }
  // Pooled Text still uploads a canvas texture on every style mutation, even
  // when the value is unchanged. Update a changed style once, then the text.
  if (t.style.color !== color || t.style.fontSize !== `${size}px`)
    t.setStyle({ color, fontSize: `${size}px` });
  t.setText(value);
}
export class Effects {
  readonly bursts: BurstSprites;
  reduced = false;
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
    spark: false,
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
  constructor(
    private scene: Phaser.Scene,
    private language: () => Language = () => 'zh',
  ) {
    this.bursts = new BurstSprites(scene);
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
  emit(e: EffectEvent, angle = 0) {
    this.bursts.emit(e, angle, this.reduced);
    if (e.x2 !== undefined) {
      if (this.beams.length >= (this.reduced ? 12 : 48)) return;
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
      e.kind === 'pickup'
        ? 3
        : e.kind === 'bomb'
          ? 32
          : e.kind === 'dash'
            ? 2
            : e.kind === 'shot'
              ? e.weapon === 'cannon'
                ? 7
                : 2
              : e.kind === 'kill'
                ? 19
                : e.kind === 'phase' || e.kind === 'victory'
                  ? 65
                  : 9;
    for (let i = 0; i < Math.ceil(count * (this.reduced ? 0.25 : 1)); i++) {
      const p = this.particles.acquire();
      if (!p) break;
      const a =
        e.kind === 'shot'
          ? angle + (Math.random() - 0.5) * 0.7
          : Math.random() * Math.PI * 2;
      const speed =
        e.kind === 'dash'
          ? 0
          : e.kind === 'shot'
            ? e.weapon === 'cannon'
              ? 120 + Math.random() * 150
              : 100 + Math.random() * 80
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
        spark:
          e.kind === 'shot' ||
          e.kind === 'hit' ||
          e.kind === 'crit' ||
          e.kind === 'impact',
      });
    }
    if (
      [
        'skill',
        'reward',
        'phase',
        'kill',
        'victory',
        'bomb',
        'impact',
      ].includes(e.kind)
    ) {
      const p = this.particles.acquire();
      if (p)
        Object.assign(p, {
          x: e.x,
          y: e.y,
          vx: 0,
          vy: 0,
          life: e.kind === 'impact' ? 0.12 : 0.5,
          maxLife: e.kind === 'impact' ? 0.12 : 0.5,
          size: e.amount || 75,
          color: e.color,
          ring: true,
          ghost: false,
          spark: false,
        });
    }
    if (
      (e.kind === 'hit' || e.kind === 'crit' || e.kind === 'hurt') &&
      (!this.reduced || e.kind !== 'hit') &&
      e.amount
    ) {
      const t = this.labels.find((t) => !t.visible);
      if (t) {
        labelContent(
          t,
          e.kind === 'hurt' ? `−${e.amount}` : String(e.amount),
          e.kind === 'crit'
            ? '#e0ffa5'
            : e.kind === 'hurt'
              ? '#ff849b'
              : '#c6eff0',
          e.kind === 'crit' ? 25 : 17,
        );
        t.setPosition(e.x + (Math.random() - 0.5) * 20, e.y - 22)
          .setVisible(true)
          .setAlpha(1);
        t.setData('life', 0.65);
        t.setData('reaction', null);
      }
    }
    if (e.reaction) {
      const label = this.labels.find((t) => !t.visible);
      if (label) {
        labelContent(label, translateCopy(this.language(), e.reaction), '#ffe0b2', 14);
        label
          .setPosition(e.x - 24, e.y - 34)
          .setVisible(true)
          .setAlpha(1);
        label.setData('life', 0.75);
        label.setData('reaction', e.reaction);
      }
    }
  }
  draw(g: Phaser.GameObjects.Graphics, dt: number) {
    this.bursts.update(dt, this.reduced);
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
        strokeRing(
          g,
          p.x,
          p.y,
          p.size * (1 - alpha * 0.7),
          p.color,
          alpha * 0.6,
        );
      } else if (p.spark) {
        g.lineStyle(Math.max(1, p.size * 0.55), p.color, alpha * 0.8);
        g.lineBetween(p.x, p.y, p.x - p.vx * 0.035, p.y - p.vy * 0.035);
      } else {
        if (!this.reduced) {
          g.fillStyle(p.color, alpha * 0.12);
          fillDisc(g, p.x, p.y, p.size * 3);
        }
        g.fillStyle(p.color, alpha);
        g.fillRect(p.x, p.y, p.size, p.size);
      }
    }
    for (const t of this.labels) {
      if (!t.visible) continue;
      const reaction = t.getData('reaction') as string | null;
      if (reaction) {
        const translated = translateCopy(this.language(), reaction);
        if (t.text !== translated) t.setText(translated);
      }
      const life = t.getData('life') - dt;
      t.setData('life', life);
      t.y -= dt * 34;
      t.setAlpha(Math.min(1, life * 3));
      if (life <= 0) t.setVisible(false);
    }
    let live = 0;
    for (const beam of this.beams) if (beam.life > 0) this.beams[live++] = beam;
    this.beams.length = live;
    for (const b of this.beams) {
      b.life -= dt;
      g.lineStyle(8, b.color, b.life * 0.7);
      g.lineBetween(b.x, b.y, b.x2, b.y2);
      g.lineStyle(2, 0xf0eaff, b.life * 4);
      g.beginPath();
      g.moveTo(b.x, b.y);
      for (let i = 1; i < 7; i++)
        g.lineTo(
          b.x +
            ((b.x2 - b.x) * i) / 7 +
            (this.reduced ? 0 : (Math.random() - 0.5) * 18),
          b.y +
            ((b.y2 - b.y) * i) / 7 +
            (this.reduced ? 0 : (Math.random() - 0.5) * 18),
        );
      g.lineTo(b.x2, b.y2);
      g.strokePath();
    }
  }
  clear() {
    this.bursts.clear();
    this.particles.clear();
    this.beams = [];
    this.labels.forEach((t) => t.setVisible(false));
  }
  dispose() {
    this.bursts.dispose();
    for (const label of this.labels) label.destroy();
    this.labels = [];
    this.beams = [];
    this.particles.clear();
  }
}
