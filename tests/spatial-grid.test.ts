import { expect, it } from 'vitest';
import { UniformGrid, sweptAABB } from '../src/core/spatial-grid';
import { Random } from '../src/core/math';
import { segmentHits } from '../src/combat/rules';
import { World } from '../src/game/world';
import { Engine } from '../src/game/engine';
import { shoot, updateProjectiles } from '../src/combat/projectiles';
import { separateBruteForce, separateWithGrid } from '../src/combat/separation';
import { configureStress, stressInput } from '../src/dev/benchmark';
const snapshot = (w: World) =>
  JSON.stringify({
    enemies: w.enemies,
    player: w.player,
    projectiles: w.projectiles.items.map((p) => ({ ...p, hits: [...p.hits] })),
    rng: w.rng.seed,
    kills: w.kills,
    damage: w.totalDamage,
    hazards: w.hazards,
    wallet: w.wallet,
  });
it('random swept queries contain every narrow-phase hit, including negative cells and large circles', () => {
  for (let seed = 0; seed < 100; seed++) {
    const rng = new Random(seed),
      bodies = Array.from({ length: 250 }, (_, id) => ({
        id,
        x: rng.int(-2000, 2000),
        y: rng.int(-1000, 1000),
        radius: rng.int(1, 150),
      }));
    const grid = new UniformGrid<(typeof bodies)[number]>(
      [32, 96, 160][seed % 3],
    );
    grid.rebuild(bodies);
    for (let i = 0; i < 30; i++) {
      const x1 = rng.int(-2100, 2100),
        y1 = rng.int(-1100, 1100),
        x2 = rng.int(-2100, 2100),
        y2 = rng.int(-1100, 1100),
        r = rng.int(1, 25);
      const hit = (e: (typeof bodies)[number]) =>
        segmentHits(x1, y1, x2, y2, e.x, e.y, e.radius + r);
      expect(
        grid
          .query(sweptAABB(x1, y1, x2, y2, r))
          .filter(hit)
          .map((e) => e.id),
      ).toEqual(bodies.filter(hit).map((e) => e.id));
    }
  }
});
it('moving across cell boundaries removes stale membership and retains source order', () => {
  const a = { id: 88, x: 95, y: 0, radius: 2 },
    b = { id: 1, x: 96, y: 0, radius: 3 };
  const grid = new UniformGrid<typeof a>();
  grid.rebuild([a, b]);
  expect(grid.query(sweptAABB(96, 0, 96, 0, 1))).toEqual([a, b]);
  a.x = -500;
  grid.update(a);
  expect(grid.query(sweptAABB(96, 0, 96, 0, 1))).toEqual([b]);
  expect(grid.query(sweptAABB(-500, 0, -500, 0, 1))).toEqual([a]);
});
it('dynamic separation exactly matches the sequential brute oracle across dense random layouts', () => {
  for (let seed = 0; seed < 80; seed++) {
    const rng = new Random(seed),
      a = new World(),
      b = new World();
    for (let n = 0; n < 120; n++) {
      const x = rng.int(450, 750),
        y = rng.int(250, 550);
      a.spawn('hunter', x, y);
      b.spawn('hunter', x, y);
    }
    for (let step = 0; step < 5; step++) {
      separateBruteForce(a);
      separateWithGrid(b);
      expect(b.enemies).toEqual(a.enemies);
    }
  }
});
it('high speed, piercing, knockback, fragments and pool reuse retain identical damage semantics', () => {
  for (let seed = 0; seed < 50; seed++) {
    const worlds = [new World(), new World()];
    worlds[0].collisionMode = 'brute';
    const rng = new Random(seed);
    const points = Array.from({ length: 35 }, () => [
      rng.int(100, 1160),
      rng.int(120, 600),
    ]);
    for (const w of worlds) {
      w.phase = 'playing';
      w.player.invulnerable = 999;
      w.rng = new Random(seed);
      w.stats.pierce = 5;
      w.stats.fragment = 3;
      for (const [x, y] of points) {
        const e = w.spawn('sentry', x, y);
        e.hp = e.maxHp = 10000;
      }
      for (let i = 0; i < 15; i++)
        shoot(w, 80, 140 + i * 28, 0, false, 16, 16000);
    }
    for (let step = 0; step < 20; step++) {
      for (const w of worlds) updateProjectiles(w, 1 / 60);
      expect(snapshot(worlds[1])).toBe(snapshot(worlds[0]));
    }
  }
});
it('complete seeded engine steps match with the grid and brute-force collision modes', () => {
  for (const count of [28, 100, 250])
    for (const seed of [73, 851]) {
      const a = new Engine(),
        b = new Engine();
      configureStress(a, count, seed);
      configureStress(b, count, seed);
      a.world.collisionMode = 'brute';
      for (let tick = 0; tick < 360; tick++) {
        const input = stressInput(tick);
        a.update(1 / 60, input);
        b.update(1 / 60, input);
        if (tick % 60 === 0) expect(snapshot(b.world)).toBe(snapshot(a.world));
      }
      expect(snapshot(b.world)).toBe(snapshot(a.world));
      expect(b.world.queries.projectile).toBeLessThan(
        a.world.queries.projectile,
      );
    }
});
