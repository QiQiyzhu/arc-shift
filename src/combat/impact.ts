import type { World } from '../game/world';
import type { Enemy } from '../game/types';
import { isBoss } from '../progression/catalog';
import { moveOnTerrain } from '../rooms/terrain';

/** Fixed-step local resistance: the player and unrelated enemies keep moving. */
export function impact(
  w: World,
  enemy: Enemy,
  angle: number,
  push: number,
  pause: number,
) {
  if (isBoss(enemy.kind)) return;
  const resistance = enemy.elite ? 0.5 : 1;
  moveOnTerrain(
    w,
    enemy,
    enemy.x + Math.cos(angle) * push * resistance,
    enemy.y + Math.sin(angle) * push * resistance,
    enemy.radius,
  );
  if (enemy.impactCooldown <= 0) {
    enemy.stagger = pause * resistance;
    enemy.impactCooldown = 0.2;
  }
}
