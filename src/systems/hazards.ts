import { direction, distance } from '../core/math';
import { hitEnemy, hurtPlayer } from '../combat/damage';
import type { World } from '../game/world';
export function updateHazards(w: World, dt: number) {
  for (const h of w.hazards) {
    h.time -= dt;
    h.tick -= dt;
    if (h.friendly) {
      for (const e of w.enemies) {
        const dist = distance(h, e);
        if (dist < h.r + e.radius) {
          if (h.type === 'well' && e.radius < 35) {
            const d = direction(h.x - e.x, h.y - e.y);
            e.x += d.x * 100 * dt;
            e.y += d.y * 100 * dt;
          }
          if (h.tick <= 0) hitEnemy(w, e, h.damage, false);
        }
      }
      if (h.tick <= 0) h.tick = 0.3;
    } else if (h.time <= 0) {
      w.emit('skill', h.x, h.y, 0xff7189, h.r);
      if (distance(h, w.player) < h.r + 12) hurtPlayer(w, h.damage);
    }
  }
  w.hazards = w.hazards.filter((h) => h.time > 0);
}
