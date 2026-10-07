import type Phaser from 'phaser';
import type { Enemy } from '../game/types';
import { clamp } from '../core/math';
import { laserGeometry } from '../combat/geometry';
import { strokeRing } from './discs';
import { ARC_PALETTE, drawDangerSeal } from '../effects/arcane';

/** Nominal unobstructed travel. Terrain can stop movement sooner; the corridor
 * intentionally includes the player's contact radius, rather than just the art. */
export function chargeCue(e: Enemy) {
  if (
    e.kind !== 'lancer' &&
    !(['warden', 'forgemaster'].includes(e.kind) && e.attackIndex % 3 === 2)
  )
    return null;
  const length =
    e.kind === 'lancer'
      ? 640 * (0.48 + 2 / 60)
      : e.kind === 'warden'
        ? 650 * (0.55 + 2 / 60)
        : 560 * (0.6 + 2 / 60);
  const a = Math.atan2(e.aimY - e.y, e.aimX - e.x);
  return {
    x: e.x + Math.cos(a) * length,
    y: e.y + Math.sin(a) * length,
    halfWidth: e.radius + 13,
  };
}
export function bossActionLabel(e: Enemy) {
  if (e.state === 'recover' || e.state === 'cooldown') return '恢复窗口';
  if (e.state === 'idle') return '接近中';
  if (chargeCue(e)) return e.state === 'attack' ? '冲锋中' : '冲锋蓄势';
  if (e.kind === 'oracle' && e.attackIndex % 3 === 2) return '旋转光束';
  if (e.kind === 'warden' && e.attackIndex % 3 === 1) return '扇形齐射';
  if (blastCues(e).length) return '落点轰击';
  return e.attackIndex % 3 === 1 ? '环形弹幕' : '落点轰击';
}
/** Forecasts only locked blast positions; rotating radial bullets get a ring cue,
 * not false promises about their exact future direction. */
export function blastCues(e: Enemy) {
  const p = e.attackIndex % 3;
  if (e.kind === 'weaver')
    return [{ x: e.aimX, y: e.aimY, r: e.elite ? 95 : 72 }];
  if (e.kind === 'warden' && p === 0)
    return Array.from({ length: 3 + e.phase }, (_, i) => {
      const a = (i * Math.PI * 2) / (3 + e.phase);
      return {
        x: clamp(e.aimX + Math.cos(a) * 110, 110, 1170),
        y: clamp(e.aimY + Math.sin(a) * 110, 125, 605),
        r: 80,
      };
    });
  if (e.kind === 'oracle' && p === 0)
    return Array.from({ length: 4 }, (_, i) => ({
      x: clamp(e.aimX + (i - 1.5) * 110, 100, 1180),
      y: e.aimY,
      r: 65,
    }));
  const blast = (x: number, y: number, r: number) => ({
    x: clamp(x, 110, 1170),
    y: clamp(y, 130, 600),
    r,
  });
  if (e.kind === 'matron' && p === 2)
    return Array.from({ length: 6 }, (_, i) =>
      blast(
        e.aimX + Math.cos((i * Math.PI) / 3) * 115,
        e.aimY + Math.sin((i * Math.PI) / 3) * 115,
        60,
      ),
    );
  if (e.kind === 'matron' && p === 0) return [blast(e.aimX, e.aimY, 90)];
  if (e.kind === 'forgemaster' && p === 1)
    return Array.from({ length: 5 }, (_, i) => [
      blast(e.aimX + (i - 2) * 100, e.aimY, 52),
      blast(e.aimX, e.aimY + (i - 2) * 100, 52),
    ]).flat();
  if (e.kind === 'forgemaster' && p === 0)
    return Array.from({ length: 3 }, (_, i) =>
      blast(e.aimX + (i - 1) * 115, e.aimY, 68),
    );
  if (e.kind === 'bomber') {
    const a = Math.atan2(e.aimY - e.y, e.aimX - e.x) + Math.PI / 2;
    return [-1, 0, 1].map((i) =>
      blast(e.aimX + Math.cos(a) * i * 90, e.aimY + Math.sin(a) * i * 90, 52),
    );
  }
  return [];
}
export function drawTelegraph(
  g: Phaser.GameObjects.Graphics,
  e: Enemy,
  _time: number,
  reduced: boolean,
) {
  if (e.state !== 'telegraph') return;
  // Stable high-contrast borders encode danger even with all motion disabled.
  // Enemy timers have different windup lengths: this only accents the final
  // second, and does not claim to be a normalized attack progress meter.
  const c = ARC_PALETTE.danger,
    urgency = clamp(1 - e.timer, 0, 1),
    pulse = 0.94,
    accent = reduced ? 0.08 : 0.07 + urgency * 0.05;
  const charge = chargeCue(e);
  if (charge) {
    g.lineStyle(charge.halfWidth * 2, c, accent);
    g.lineBetween(e.x, e.y, charge.x, charge.y);
    const a = Math.atan2(charge.y - e.y, charge.x - e.x),
      nx = -Math.sin(a) * charge.halfWidth,
      ny = Math.cos(a) * charge.halfWidth;
    g.lineStyle(5, ARC_PALETTE.ink, 0.8);
    g.lineBetween(e.x + nx, e.y + ny, charge.x + nx, charge.y + ny);
    g.lineBetween(e.x - nx, e.y - ny, charge.x - nx, charge.y - ny);
    g.lineStyle(2, c, pulse);
    // Rounded end caps include contact at both endpoints. Two steps of length
    // margin covers the update that moves before expiring the attack timer.
    strokeRing(g, e.x, e.y, charge.halfWidth, c, pulse, 2);
    strokeRing(g, charge.x, charge.y, charge.halfWidth, c, pulse, 2);
    g.lineBetween(e.x + nx, e.y + ny, charge.x + nx, charge.y + ny);
    g.lineBetween(e.x - nx, e.y - ny, charge.x - nx, charge.y - ny);
    for (let i = 1; i <= 3; i++) {
      const x = e.x + ((charge.x - e.x) * i) / 4,
        y = e.y + ((charge.y - e.y) * i) / 4;
      g.lineStyle(2, ARC_PALETTE.dangerEdge, 0.9);
      g.lineBetween(
        x + nx * 0.25,
        y + ny * 0.25,
        x + Math.cos(a) * 14,
        y + Math.sin(a) * 14,
      );
      g.lineBetween(
        x - nx * 0.25,
        y - ny * 0.25,
        x + Math.cos(a) * 14,
        y + Math.sin(a) * 14,
      );
    }
  } else if (e.kind === 'oracle' && e.attackIndex % 3 === 2) {
    const b = laserGeometry(e);
    g.lineStyle(b.halfWidth * 2, c, 0.13);
    g.lineBetween(b.x1, b.y1, b.x2, b.y2);
    const a = Math.atan2(b.y2 - b.y1, b.x2 - b.x1),
      nx = -Math.sin(a) * b.halfWidth,
      ny = Math.cos(a) * b.halfWidth;
    g.lineStyle(2, c, pulse);
    g.lineBetween(b.x1 + nx, b.y1 + ny, b.x2 + nx, b.y2 + ny);
    g.lineBetween(b.x1 - nx, b.y1 - ny, b.x2 - nx, b.y2 - ny);
    g.lineStyle(1, ARC_PALETTE.dangerEdge, 0.65);
    g.lineBetween(b.x1, b.y1, b.x2, b.y2);
  } else {
    const blasts = blastCues(e);
    if (blasts.length)
      for (const b of blasts)
        drawDangerSeal(g, b.x, b.y, b.r, urgency, reduced);
    else if (e.radius > 35) {
      if (e.kind === 'warden' && e.attackIndex % 3 === 1) {
        const a = Math.atan2(e.aimY - e.y, e.aimX - e.x);
        for (let i = -3; i <= 3; i++) {
          g.lineStyle(i === 0 ? 2 : 1, c, 0.7);
          g.lineBetween(
            e.x,
            e.y,
            e.x + Math.cos(a + i * 0.18) * 530,
            e.y + Math.sin(a + i * 0.18) * 530,
          );
        }
      } else {
        drawDangerSeal(g, e.x, e.y, e.radius + 42, urgency, reduced);
      }
    } else if (e.kind === 'sentry' || e.kind === 'cantor') {
      const a = Math.atan2(e.aimY - e.y, e.aimX - e.x),
        n = e.kind === 'cantor' ? 2 : e.elite ? 1 : 0,
        spread = e.kind === 'cantor' ? 0.35 : 0.17;
      g.lineStyle(1, c, 0.6);
      for (let i = -n; i <= n; i++)
        g.lineBetween(
          e.x,
          e.y,
          e.x + Math.cos(a + i * spread) * 430,
          e.y + Math.sin(a + i * spread) * 430,
        );
    }
  }
  g.lineStyle(2, c, pulse);
  strokeRing(g, e.x, e.y, e.radius + 9, c, pulse, 2);
}
