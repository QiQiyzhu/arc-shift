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
  generation = 0,
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
    radius: enemy ? 6 : w.stats.shotSize * (generation ? 0.65 : 1),
    life: enemy ? 5 : w.stats.orbit ? 2.6 : w.stats.returning ? 2.1 : 1.5,
    damage,
    enemy,
    color,
    pierce: enemy ? 0 : w.stats.pierce,
    bounce: enemy ? 0 : w.stats.bounce,
    age: 0,
    angle,
    speed,
    generation,
    bounced: false,
    blastRadius: 0,
    returningStarted: false,
    wave: enemy ? 0 : w.stats.wave,
    orbit: !enemy && w.stats.orbit && generation === 0,
    returning: !enemy && w.stats.returning,
    shape: enemy
      ? 'bolt'
      : w.stats.shotSize > 4
        ? 'meteor'
        : w.stats.lance
          ? 'lance'
          : w.stats.slow
            ? 'crystal'
            : 'bolt',
    accent: enemy ? 0xffe8e8 : w.stats.accent,
  });
  b.initialLife = b.life;
  b.hits.clear();
  return b;
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
    b.age += dt;
    if (b.orbit && b.age < 1.05) {
      const a = b.angle + b.age * 5.6;
      const r = 32 + b.age * 160 + Math.sin(b.age * 14) * b.wave * 12;
      b.x = w.player.x + Math.cos(a) * r;
      b.y = w.player.y + Math.sin(a) * r;
      b.vx = -Math.sin(a) * b.speed;
      b.vy = Math.cos(a) * b.speed;
    } else if (!b.enemy) {
      let e: { x: number; y: number } | undefined;
      if (b.returning && b.age > Math.min(0.45, b.initialLife * 0.42))
        b.returningStarted = true;
      const returning = b.returningStarted;
      if (returning) e = w.player;
      else if (w.stats.homing) {
        let nearest = Infinity;
        for (const n of w.enemies) {
          if (n.hp <= 0 || b.hits.has(n.id)) continue;
          const d = (n.x - b.x) ** 2 + (n.y - b.y) ** 2;
          if (d < nearest) {
            nearest = d;
            e = n;
          }
        }
      }
      if (e) {
        const a = Math.atan2(e.y - b.y, e.x - b.x);
        const t = Math.min(
          1,
          dt * (returning ? 9 : b.bounced && w.has('ice-prism') ? 7 : 3),
        );
        b.vx = b.vx * (1 - t) + Math.cos(a) * b.speed * t;
        b.vy = b.vy * (1 - t) + Math.sin(a) * b.speed * t;
        if (returning && distance(b, w.player) < 20) {
          b.active = false;
          continue;
        }
      }
      if (b.wave) {
        const a = Math.atan2(b.vy, b.vx) + Math.cos(b.age * 16) * dt * 2.7;
        const speed = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(a) * speed;
        b.vy = Math.sin(a) * speed;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    } else {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    if (b.x < 70 || b.x > 1210 || b.y < 90 || b.y > 640) {
      if (b.bounce > 0) {
        if (b.x < 70) b.vx = Math.abs(b.vx);
        if (b.x > 1210) b.vx = -Math.abs(b.vx);
        if (b.y < 90) b.vy = Math.abs(b.vy);
        if (b.y > 640) b.vy = -Math.abs(b.vy);
        b.x = Math.max(71, Math.min(1209, b.x));
        b.y = Math.max(91, Math.min(639, b.y));
        b.bounce--;
        b.orbit = false;
        if (w.has('ice-prism') && w.has('void-seek')) {
          if (!b.bounced) b.life += 0.25;
          b.damage *= 0.85;
        }
        b.bounced = true;
      } else if (b.returning && !b.enemy) {
        // Walls start the return early, before fast rounds expire outside the arena.
        b.x = Math.max(71, Math.min(1209, b.x));
        b.y = Math.max(91, Math.min(639, b.y));
        b.orbit = false;
        b.returningStarted = true;
        const a = Math.atan2(w.player.y - b.y, w.player.x - b.x);
        b.vx = Math.cos(a) * b.speed;
        b.vy = Math.sin(a) * b.speed;
      } else b.active = false;
    }
    if (!b.active) continue;
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
          hitEnemy(w, e, b.damage, b.generation === 0);
          if (b.blastRadius > 0) {
            w.emit('bomb', b.x, b.y, b.color, b.blastRadius);
            for (const n of w.enemies)
              if (
                n !== e &&
                n.hp > 0 &&
                distance(n, b) < b.blastRadius + n.radius
              ) {
                hitEnemy(w, n, b.damage * 0.45, false);
                if (w.stats.burn) n.burn = Math.max(n.burn, 2);
                if (w.has('ice-touch')) n.slow = Math.max(n.slow, 1.5);
              }
          }
          if (b.generation > 0) {
            if (w.stats.burn) e.burn = Math.max(e.burn, 2);
            if (w.has('ice-touch')) e.slow = Math.max(e.slow, 1.5);
          }
          if (b.generation === 0 && w.stats.fragment && b.hits.size === 1) {
            for (let i = 0; i < w.stats.fragment; i++) {
              const child = shoot(
                w,
                b.x,
                b.y,
                Math.atan2(b.vy, b.vx) + (i - 1) * 0.85,
                false,
                b.damage * 0.28,
                b.speed * 0.8,
                b.color,
                1,
              );
              if (child) {
                child.hits.add(e.id);
                child.life = Math.min(child.life, 0.85);
                child.initialLife = child.life;
              }
            }
          }
          if (b.pierce-- <= 0) {
            b.active = false;
            break;
          }
        }
      }
    }
  }
}
