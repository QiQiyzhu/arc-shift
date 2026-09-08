import { segmentHits } from './rules';
import { distance } from '../core/math';
import { hitEnemy, hurtPlayer } from './damage';
import type { World } from '../game/world';
export function shoot(
  w: World,
  x: number,
  y: number,
  angle: number,
  enemy = false,
  damage = w.stats.damage,
  speed = 720,
  color = 0x8cf1dc,
) {
  const b = w.projectiles.acquire();
  if (!b) return;
  Object.assign(b, {
    x,
    y,
    oldX: x,
    oldY: y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: enemy ? 6 : 4,
    life: enemy ? 5 : 1.5,
    damage,
    enemy,
    color,
    pierce: enemy ? 0 : w.stats.pierce,
    bounce: enemy ? 0 : w.stats.bounce,
  });
  b.hits.clear();
}
export function updateProjectiles(w: World, dt: number) {
  for (const b of w.projectiles.items) {
    if (!b.active) continue;
    b.life -= dt;
    if (b.life <= 0) {
      b.active = false;
      continue;
    }
    b.oldX = b.x;
    b.oldY = b.y;
    if (!b.enemy && w.stats.homing) {
      const e = w.enemies
        .filter((e) => e.hp > 0 && !b.hits.has(e.id))
        .sort((a, c) => distance(a, b) - distance(c, b))[0];
      if (e) {
        const a = Math.atan2(e.y - b.y, e.x - b.x);
        const speed = Math.hypot(b.vx, b.vy);
        const t = Math.min(1, dt * 3);
        b.vx = b.vx * (1 - t) + Math.cos(a) * speed * t;
        b.vy = b.vy * (1 - t) + Math.sin(a) * speed * t;
      }
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x < 70 || b.x > 1210 || b.y < 90 || b.y > 640) {
      if (b.bounce > 0) {
        if (b.x < 70 || b.x > 1210) b.vx *= -1;
        if (b.y < 90 || b.y > 640) b.vy *= -1;
        b.x = Math.max(71, Math.min(1209, b.x));
        b.y = Math.max(91, Math.min(639, b.y));
        b.bounce--;
      } else b.active = false;
    }
    if (b.enemy) {
      if (
        segmentHits(
          b.oldX,
          b.oldY,
          b.x,
          b.y,
          w.player.x,
          w.player.y,
          14 + b.radius,
        )
      ) {
        hurtPlayer(w, b.damage);
        b.active = false;
      }
    } else {
      for (const e of w.enemies) {
        if (e.hp <= 0 || b.hits.has(e.id)) continue;
        if (
          segmentHits(b.oldX, b.oldY, b.x, b.y, e.x, e.y, e.radius + b.radius)
        ) {
          b.hits.add(e.id);
          hitEnemy(w, e, b.damage);
          if (b.pierce-- <= 0) {
            b.active = false;
            break;
          }
        }
      }
    }
  }
}
