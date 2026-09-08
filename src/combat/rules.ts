import type { Stats } from '../game/types';
export const baseStats = (): Stats => ({
  damage: 16,
  rate: 0.18,
  speed: 250,
  crit: 0.08,
  critPower: 1.8,
  dashCooldown: 1.2,
  dashDuration: 0.16,
  qCooldown: 6,
  eCooldown: 10,
  projectiles: 1,
  pierce: 0,
  bounce: 0,
  burn: 0,
  chain: 0,
  slow: 0,
  explosion: 0,
  homing: 0,
  lifesteal: 0,
});
export function calculateDamage(
  base: number,
  critChance: number,
  critPower: number,
  roll: number,
) {
  const critical = roll < critChance;
  return { damage: Math.round(base * (critical ? critPower : 1)), critical };
}
export const cooldown = (remaining: number, dt: number) =>
  Math.max(0, remaining - dt);
export function segmentHits(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  x: number,
  y: number,
  r: number,
) {
  const dx = bx - ax,
    dy = by - ay;
  const t = Math.max(
    0,
    Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)),
  );
  return Math.hypot(ax + dx * t - x, ay + dy * t - y) < r;
}
