import type { World } from '../game/world';
import type { Enemy } from '../game/types';
import { LIMITS, type Wallet } from './catalog';
export function grant(w: World, kind: keyof Wallet, amount: number) {
  w.wallet[kind] = Math.min(LIMITS[kind], w.wallet[kind] + amount);
}
export function dropLoot(w: World, e: Enemy) {
  if (e.summoned) return;
  const boss = e.kind === 'warden' || e.kind === 'oracle';
  const drop = (kind: keyof Wallet, amount: number, offset = 0) => {
    if (kind === 'coins' && !boss) {
      amount = Math.min(
        amount,
        (w.room.kind === 'elite' ? 32 : 20) - w.roomCoinDrops,
      );
      if (amount <= 0) return;
      w.roomCoinDrops += amount;
    }
    // A full pickup buffer grants directly instead of losing gameplay resources.
    if (w.pickups.length >= 96) grant(w, kind, amount);
    else w.pickups.push({ x: e.x + offset, y: e.y, kind, amount, age: 0 });
  };
  if (boss) {
    drop('coins', 20);
    drop('shards', 6, 18);
    drop('keys', 1, -18);
  } else if (e.elite) {
    drop('coins', 4);
    drop('shards', 2, 16);
  } else if (w.kills % 3 === 0) drop('coins', 1);
  if (!boss && w.kills % 55 === 0) drop('bombs', 1, -16);
}
export function updatePickups(w: World, dt: number, collectAll = false) {
  for (let i = w.pickups.length - 1; i >= 0; i--) {
    const p = w.pickups[i];
    p.age += dt;
    const dx = w.player.x - p.x,
      dy = w.player.y - p.y,
      d = Math.hypot(dx, dy);
    if (collectAll || d < 22) {
      grant(w, p.kind, p.amount);
      w.pickups.splice(i, 1);
      if (!collectAll)
        w.bus.emit({
          kind: 'pickup',
          x: p.x,
          y: p.y,
          color: p.kind === 'shards' ? 0xbfb0ff : 0xf5d185,
        });
    } else if (d < 125 && p.age > 0.12) {
      const step = Math.min(d, dt * 430);
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
    }
  }
}
