import { clamp, direction, distance } from '../core/math';
import { cooldown } from '../combat/rules';
import { shoot } from '../combat/projectiles';
import { hitEnemy } from '../combat/damage';
import type { Input } from '../game/types';
import type { World } from '../game/world';
export function updatePlayer(w: World, input: Input, dt: number) {
  const p = w.player,
    s = w.stats;
  for (const key of [
    'invulnerable',
    'dashTime',
    'dashCd',
    'qCd',
    'eCd',
    'shotCd',
  ] as const)
    p[key] = cooldown(p[key], dt);
  p.angle = Math.atan2(input.aimY - p.y, input.aimX - p.x);
  const d = direction(input.x, input.y);
  if (input.dash && p.dashCd === 0) {
    let a = d;
    if (!a.x && !a.y) a = { x: Math.cos(p.angle), y: Math.sin(p.angle) };
    p.vx = a.x * 1100;
    p.vy = a.y * 1100;
    p.dashTime = s.dashDuration;
    p.invulnerable = Math.max(p.invulnerable, s.dashDuration + 0.06);
    p.dashCd = s.dashCooldown;
    w.emit('dash', p.x, p.y);
    if (w.has('shift-shield')) p.shield = Math.min(30, p.shield + 12);
    if (w.has('shift-reload')) p.shotCd = 0;
    if (w.has('shift-nova'))
      for (const e of w.enemies)
        if (distance(e, p) < 120) hitEnemy(w, e, 28, false);
    if (w.has('shift-ice'))
      for (const e of w.enemies) if (distance(e, p) < 150) e.slow = 3;
  }
  if (p.dashTime === 0) {
    const t = 1 - Math.exp(-dt * (d.x || d.y ? 28 : 34));
    p.vx += (d.x * s.speed - p.vx) * t;
    p.vy += (d.y * s.speed - p.vy) * t;
  } else {
    w.emit('dash', p.x, p.y);
    if (
      w.has('fire-dash') &&
      !w.hazards.some((h) => h.type === 'fire' && distance(h, p) < 25)
    )
      w.hazards.push({
        x: p.x,
        y: p.y,
        r: 23,
        time: 1.5,
        duration: 1.5,
        damage: 9,
        type: 'fire',
        friendly: true,
        tick: 0.1,
      });
  }
  p.x = clamp(p.x + p.vx * dt, 88, 1192);
  p.y = clamp(p.y + p.vy * dt, 112, 620);
  if (input.fire && p.shotCd === 0) {
    p.shotCd =
      s.rate *
      (w.has('shift-reload') && p.dashCd > s.dashCooldown - 0.7 ? 0.5 : 1);
    const color = s.burn
      ? 0xffb477
      : s.chain
        ? 0xba9aff
        : s.slow
          ? 0x8cdeff
          : s.homing
            ? 0xbb9aff
            : 0x8cf1dc;
    for (let i = 0; i < s.projectiles; i++)
      shoot(
        w,
        p.x + Math.cos(p.angle) * 22,
        p.y + Math.sin(p.angle) * 22,
        p.angle + (i - (s.projectiles - 1) / 2) * 0.15,
        false,
        s.damage,
        720,
        color,
      );
    w.emit(
      'shot',
      p.x + Math.cos(p.angle) * 24,
      p.y + Math.sin(p.angle) * 24,
      color,
    );
  }
  if (input.q && p.qCd === 0) {
    p.qCd = s.qCooldown;
    w.emit('skill', p.x, p.y, 0x8cf1dc, 185);
    for (const e of w.enemies)
      if (distance(e, p) < 190 + e.radius) {
        hitEnemy(w, e, s.damage * 3);
        e.slow = Math.max(e.slow, 1);
      }
    for (const b of w.projectiles.items)
      if (b.active && b.enemy && distance(b, p) < 200) b.active = false;
  }
  if (input.e && p.eCd === 0) {
    p.eCd = s.eCooldown;
    const a = direction(input.aimX - p.x, input.aimY - p.y);
    const reach = Math.min(260, Math.hypot(input.aimX - p.x, input.aimY - p.y));
    w.hazards.push({
      x: clamp(p.x + a.x * reach, 90, 1190),
      y: clamp(p.y + a.y * reach, 115, 615),
      r: w.has('void-horizon') ? 155 : 115,
      time: 3,
      duration: 3,
      damage: s.damage * 0.65,
      type: 'well',
      friendly: true,
      tick: 0,
    });
    w.emit('skill', p.x, p.y, 0xb7a0ff, 50);
  }
}
