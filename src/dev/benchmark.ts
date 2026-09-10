import { Engine } from '../game/engine';
import { Random } from '../core/math';
import type { EnemyKind, Input } from '../game/types';
export const stressInput = (tick: number): Input => ({
  x: Math.cos(tick / 110), y: Math.sin(tick / 110),
  aimX: 640 + Math.cos(tick / 40) * 300, aimY: 365 + Math.sin(tick / 40) * 180,
  fire: true, dash: tick % 100 === 0, q: tick % 330 === 0, e: tick % 480 === 0,
});
export function configureStress(engine: Engine, count: number, seed = 73129) {
  engine.startPractice(['fire-split', 'fire-bloom', 'storm-needle', 'ice-prism'], 'arc', true);
  const w = engine.world, rng = new Random(seed);
  w.seed = seed; w.rng = new Random(seed); w.phase = 'playing';
  w.enemies = []; w.wave = 99; w.spawnTimer = 1e9;
  const kinds: EnemyKind[] = ['hunter', 'sentry', 'lancer', 'weaver', 'bomber', 'cantor', 'shade'];
  for (let i = 0; i < count; i++) {
    const e = w.spawn(kinds[i % kinds.length], rng.int(100, 1180), rng.int(125, 610));
    e.hp = e.maxHp = 1e8;
  }
  return w;
}
export function percentiles(values: number[]) {
  const sorted = [...values].sort((a,b)=>a-b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
  return { p50: at(0.5), p95: at(0.95), p99: at(0.99) };
}
