import { expect, it } from 'vitest';
import { CARDS } from '../src/cards/catalog';
import { deriveStats } from '../src/cards/system';
import {
  activeSynergies,
  newSynergies,
  TRIAL_BUILDS,
} from '../src/cards/synergies';
import { World } from '../src/game/world';
import { Engine } from '../src/game/engine';
import { shoot, updateProjectiles } from '../src/combat/projectiles';
import { hitEnemy } from '../src/combat/damage';
import { updatePlayer } from '../src/systems/player';
import { scoreStep, STEP_SECONDS } from '../src/audio/score';
const input = {
  x: 0,
  y: 0,
  aimX: 1100,
  aimY: 400,
  fire: false,
  dash: false,
  q: false,
  e: false,
};
function world(cards: string[]) {
  const w = new World();
  w.phase = 'playing';
  w.cards = cards;
  w.stats = deriveStats(cards);
  w.stats.crit = 0;
  return w;
}
it('all 780 pairs derive the same mechanics and palette regardless of acquisition order', () => {
  for (let i = 0; i < CARDS.length; i++)
    for (let j = i + 1; j < CARDS.length; j++)
      expect(deriveStats([CARDS[i].id, CARDS[j].id])).toEqual(
        deriveStats([CARDS[j].id, CARDS[i].id]),
      );
});
it('shape, trajectory and payload modifiers remain simultaneously enabled', () => {
  const s = deriveStats([
    'fire-split',
    'fire-meteor',
    'ice-prism',
    'void-seek',
    'fire-ember',
    'storm-lance',
  ]);
  expect(s.projectiles).toBe(3);
  expect(s.shotSize).toBe(9);
  expect(s.lance).toBe(true);
  expect(s.bounce).toBe(2);
  expect(s.homing).toBe(1);
  expect(s.burn).toBe(12);
  expect(activeSynergies(['fire-ember'])).toHaveLength(0);
  expect(newSynergies(['fire-ember'], 'ice-touch').map((s) => s.id)).toContain(
    'thermal',
  );
});
it('thermal reaction needs previous statuses, has a cooldown and never triggers from secondary damage', () => {
  const w = world(['fire-ember', 'ice-touch']);
  const a = w.spawn('sentry', 600, 400);
  a.hp = a.maxHp = 1000;
  const b = w.spawn('sentry', 620, 400);
  b.hp = b.maxHp = 1000;
  hitEnemy(w, a, 10);
  expect(w.reactionCount).toBe(0);
  hitEnemy(w, a, 10);
  expect(w.reactionCount).toBe(1);
  expect(b.hp).toBeLessThan(1000);
  hitEnemy(w, a, 10);
  expect(w.reactionCount).toBe(1);
  a.reactionCd = 0;
  hitEnemy(w, a, 10, false);
  expect(w.reactionCount).toBe(1);
  hitEnemy(w, a, 10);
  expect(w.reactionCount).toBe(2);
});
it('fragment children inherit payload but cannot recursively split', () => {
  const w = world(['fire-bloom', 'fire-ember', 'ice-touch']);
  const e = w.spawn('sentry', 650, 400);
  e.hp = 1000;
  shoot(w, 620, 400, 0);
  updateProjectiles(w, 1 / 60);
  const children = w.projectiles.items.filter(
    (b) => b.active && b.generation === 1,
  );
  expect(children).toHaveLength(3);
  expect(children.every((b) => b.hits.has(e.id))).toBe(true);
  for (let i = 0; i < 100; i++) updateProjectiles(w, 1 / 60);
  expect(w.projectiles.misses).toBe(0);
  expect(w.reactionCount).toBe(0);
});
it('prism extends lifetime only on the first bounce and retains hit history', () => {
  const w = world(['ice-prism', 'void-seek']);
  const b = shoot(w, 1208, 400, 0)!;
  b.hits.add(91);
  const damage = b.damage;
  updateProjectiles(w, 1 / 60);
  expect(b.life).toBeCloseTo(1.5 - 1 / 60 + 0.25);
  expect(b.damage).toBeCloseTo(damage * 0.85);
  expect(b.hits.has(91)).toBe(true);
  b.x = 72;
  b.vx = -720;
  const life = b.life;
  updateProjectiles(w, 1 / 60);
  expect(b.life).toBeCloseTo(life - 1 / 60);
});
it('echo has exactly three secondary shots per dash window', () => {
  const w = world(['shift-reload', 'storm-arc']);
  updatePlayer(w, { ...input, dash: true }, 1 / 60);
  expect(w.echo.shots).toBe(3);
  for (let i = 0; i < 5; i++) {
    w.player.shotCd = 0;
    updatePlayer(w, { ...input, fire: true }, 1 / 60);
  }
  expect(
    w.projectiles.items.filter((b) => b.active && b.generation === 1),
  ).toHaveLength(3);
  expect(w.echo.shots).toBe(0);
});
it('practice preserves checkpoint, discoveries and run statistics', () => {
  const e = new Engine();
  e.start(991);
  e.chooseCard('fire-ember');
  const saved = JSON.stringify(e.save);
  e.startPractice(TRIAL_BUILDS[0].cards);
  for (let i = 0; i < 300; i++) e.update(1 / 60, { ...input, fire: true });
  e.checkpoint();
  e.finish();
  expect(JSON.stringify(e.save)).toBe(saved);
  expect(e.world.player.hp).toBe(e.world.player.maxHp);
  expect(e.resume()).toBe(true);
  expect(e.practice).toBe(false);
  expect(e.world.cards).toEqual(['fire-ember']);
});
it('all trial builds and maximal modifier stacks remain finite and bounded', () => {
  for (const cards of [
    ...TRIAL_BUILDS.map((b) => [...b.cards]),
    CARDS.map((c) => c.id),
  ]) {
    const e = new Engine();
    e.startPractice(cards);
    for (let i = 0; i < 1800; i++)
      e.update(1 / 60, {
        ...input,
        fire: true,
        dash: i % 90 === 0,
        q: i % 240 === 0,
        e: i % 360 === 0,
      });
    const w = e.world;
    expect(w.projectiles.count).toBeLessThanOrEqual(420);
    expect(w.projectiles.misses).toBe(0);
    expect(w.reactionBudget).toBeGreaterThanOrEqual(0);
    expect(w.kills).toBeGreaterThan(0);
    for (const b of w.projectiles.items)
      if (b.active) expect(Number.isFinite(b.x + b.y + b.damage)).toBe(true);
  }
});
it('music has a stable beat grid, repeatable phrases and bounded step voices', () => {
  expect(STEP_SECONDS).toBeCloseTo(60 / 88 / 4);
  expect(scoreStep(0, 1)).toEqual(scoreStep(64, 1));
  for (let i = 0; i < 64; i++)
    expect(scoreStep(i, 3).length).toBeLessThanOrEqual(5);
});
it('a plasma reaction killing the original target settles death exactly once', () => {
  const w = world(['fire-ember', 'storm-arc', 'void-leech']);
  w.player.hp = 10;
  w.rng.next = () => 0.2;
  const a = w.spawn('sentry', 600, 400),
    b = w.spawn('sentry', 620, 400);
  a.hp = 17;
  b.hp = 100;
  b.burn = 3;
  hitEnemy(w, a, 16);
  expect(a.state).toBe('dead');
  expect(w.kills).toBe(1);
  expect(w.xp).toBe(10);
  expect(w.player.hp).toBe(11);
});
it('orbiting rounds detach on a wall bounce instead of burning all bounces in place', () => {
  const w = world(['void-orbit', 'ice-prism', 'void-seek']);
  w.player.x = 1180;
  w.player.y = 400;
  const b = shoot(w, 1180, 400, 0)!;
  for (let i = 0; i < 4; i++) updateProjectiles(w, 1 / 60);
  expect(b.active).toBe(true);
  expect(b.orbit).toBe(false);
  expect(b.bounce).toBe(1);
  expect(b.x).toBeLessThan(1208);
});
it('fragment lifetime also updates the inherited return threshold', () => {
  const w = world(['fire-bloom', 'void-return']);
  const e = w.spawn('sentry', 650, 400);
  e.hp = 1000;
  shoot(w, 620, 400, 0);
  updateProjectiles(w, 1 / 60);
  const children = w.projectiles.items.filter(
    (b) => b.active && b.generation === 1,
  );
  expect(children).toHaveLength(3);
  expect(children.every((b) => b.initialLife === 0.85)).toBe(true);
});
it('returning rounds survive walls in all four directions, including near-wall origins', () => {
  for (const [x, y] of [
    [640, 410],
    [80, 100],
    [1200, 630],
  ]) {
    for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const w = world(['void-return']);
      w.player.x = x;
      w.player.y = y;
      const b = shoot(w, x, y, angle)!;
      b.hits.add(91);
      for (let i = 0; i < 180 && b.active && !b.returningStarted; i++)
        updateProjectiles(w, 1 / 60);
      expect(b.active).toBe(true);
      expect(b.returningStarted).toBe(true);
      expect(b.hits.has(91)).toBe(true);
      for (let i = 0; i < 180 && b.active; i++) updateProjectiles(w, 1 / 60);
      expect(b.active).toBe(false);
      expect(b.life).toBeGreaterThan(0);
      expect(Math.hypot(b.x - x, b.y - y)).toBeLessThan(20);
    }
  }
});
