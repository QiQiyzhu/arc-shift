import type { Enemy } from '../game/types';
/** Both telegraph and collision use the same two-sided beam, measured in world pixels. */
export function laserGeometry(e: Enemy) {
  const a =
    Math.atan2(e.aimY - e.y, e.aimX - e.x) +
    (e.state === 'attack' ? (2.6 - e.timer) * 0.42 : 0);
  return {
    x1: e.x - Math.cos(a) * 1100,
    y1: e.y - Math.sin(a) * 1100,
    x2: e.x + Math.cos(a) * 1100,
    y2: e.y + Math.sin(a) * 1100,
    halfWidth: 14,
  };
}
