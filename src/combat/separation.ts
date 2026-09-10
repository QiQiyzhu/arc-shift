import type { World } from '../game/world';
import type { Enemy } from '../game/types';
import { distance } from '../core/math';
import { sweptAABB } from '../core/spatial-grid';
function separatePair(w: World, a: Enemy, b: Enemy) {
  if (a.hp <= 0 || b.hp <= 0 || a.radius > 30 || b.radius > 30) return false;
  w.queries.separation++;
  const dist = distance(a, b),
    overlap = a.radius + b.radius - dist;
  if (overlap <= 0 || dist === 0) return false;
  // Keep the original sequential floating-point operations, including updated a.x/a.y.
  const p = overlap * 0.08;
  a.x += ((a.x - b.x) / dist) * p;
  a.y += ((a.y - b.y) / dist) * p;
  b.x -= ((a.x - b.x) / dist) * p;
  b.y -= ((a.y - b.y) / dist) * p;
  return true;
}
/** Intentionally simple correctness oracle, selectable by QA/benchmarks. */
export function separateBruteForce(w: World) {
  for (let i = 0; i < w.enemies.length; i++)
    for (let j = i + 1; j < w.enemies.length; j++)
      separatePair(w, w.enemies[i], w.enemies[j]);
}
export function separateWithGrid(w: World) {
  const grid = w.spatial;
  grid.rebuild(w.enemies);
  for (let i = 0; i < w.enemies.length; i++) {
    const a = w.enemies[i];
    if (a.hp <= 0 || a.radius > 30) continue;
    let after = i;
    while (true) {
      const candidates = grid.query(sweptAABB(a.x, a.y, a.x, a.y, a.radius));
      let moved = false;
      for (const b of candidates) {
        const order = grid.order(b);
        if (order <= after) continue;
        after = order;
        if (separatePair(w, a, b)) {
          const changed = grid.update(a);
          grid.update(b);
          if (changed) {
            moved = true;
            break;
          }
        }
      }
      // A change of occupied cells can uncover later pairs. Re-query without
      // revisiting pairs the brute-force traversal has already processed.
      if (!moved) break;
    }
  }
}
