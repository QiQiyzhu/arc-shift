import { expect, it } from 'vitest';
import { Engine } from '../src/game/engine';
import { World } from '../src/game/world';
import { blankSave } from '../src/core/save';
import { deriveStats } from '../src/cards/system';
import { attack, updateWeapon } from '../src/combat/weapons';
import { shoot, updateProjectiles } from '../src/combat/projectiles';
import { updateEnemies } from '../src/ai/enemy-ai';
import { impact } from '../src/combat/impact';
import { blocked } from '../src/rooms/terrain';
import { activeSynergies } from '../src/cards/synergies';
import {
  ReplayRecorder,
  ReplayPlayer,
  exportReplay,
} from '../src/replay/replay';
const nil = {
  x: 0,
  y: 0,
  aimX: 760,
  aimY: 410,
  fire: false,
  dash: false,
  q: false,
  e: false,
};
function sword() {
  const w = new World();
  w.phase = 'playing';
  w.weapon = 'sword';
  w.forms = ['sword'];
  w.stats.crit = 0;
  return w;
}
it('near sword contact pushes further than ranged hits and pauses only the struck enemy and blade', () => {
  const w = sword(),
    enemy = w.spawn('sentry', 695, 410),
    far = w.spawn('hunter', 400, 300);
  enemy.hp = 1000;
  far.state = 'chase';
  attack(w);
  updateWeapon(w, 0.06);
  expect(enemy.x - 695).toBeGreaterThanOrEqual(30);
  expect(enemy.stagger).toBeGreaterThan(0);
  const age = w.swing!.age,
    hp = enemy.hp,
    position = far.x;
  updateWeapon(w, 1 / 60);
  updateEnemies(w, 1 / 60);
  expect(w.swing!.age).toBe(age);
  expect(far.x).not.toBe(position);
  expect(enemy.hp).toBe(hp);
});
it('knockback respects solid cover, elites resist, and bosses cannot be stun locked', () => {
  const w = sword();
  w.terrain.blocks = [
    { x: 730, y: 330, w: 40, h: 160, style: 'pillar' } as never,
  ];
  const enemy = w.spawn('sentry', 700, 410);
  enemy.hp = 1000;
  attack(w);
  updateWeapon(w, 0.06);
  expect(blocked(enemy.x, enemy.y, enemy.radius, w.terrain.blocks)).toBe(false);
  const boss = w.spawn('warden', 900, 410),
    x = boss.x;
  impact(w, boss, 0, 50, 0.1);
  expect(boss.x).toBe(x);
  expect(boss.stagger).toBe(0);
  const elite = w.spawn('hunter', 500, 410, true);
  impact(w, elite, 0, 40, 0.06);
  expect(elite.x).toBe(520);
  expect(elite.stagger).toBeCloseTo(0.03);
});
it('meteor + lance pauses a piercing projectile locally without duplicate contact damage, and pooled enemies reset it', () => {
  const w = new World();
  w.phase = 'playing';
  w.cards = ['fire-meteor', 'storm-lance'];
  w.stats = deriveStats(w.cards);
  w.stats.crit = 0;
  const enemy = w.spawn('sentry', 700, 410);
  enemy.hp = 10000;
  const b = shoot(w, 660, 410, 0)!;
  for (let i = 0; i < 10 && !b.hits.size; i++) updateProjectiles(w, 1 / 60);
  expect(b.hits.has(enemy.id)).toBe(true);
  expect(b.impactPause).toBeCloseTo(0.05);
  const hp = enemy.hp,
    x = b.x;
  updateProjectiles(w, 1 / 60);
  expect(b.x).toBe(x);
  expect(enemy.hp).toBe(hp);
  for (let i = 0; i < 2; i++) updateProjectiles(w, 1 / 60);
  expect(b.x).toBe(x);
  expect(b.impactPause).toBe(0);
  updateProjectiles(w, 1 / 60);
  expect(b.x).toBeGreaterThan(x);
  expect(enemy.hp).toBe(hp);
  for (const slot of w.projectiles.items) slot.active = true;
  b.active = false;
  b.impactPause = 0.05;
  expect(shoot(w, 800, 410, Math.PI, true)).toBe(b);
  expect(b.impactPause).toBe(0);
});
it('weapon-specific combinations cannot be labelled active on the wrong primary', () => {
  const cards = ['void-return', 'ice-touch', 'fire-meteor', 'storm-lance'];
  expect(activeSynergies(cards, 'sword').map((s) => s.id)).toEqual([
    'frost-return',
  ]);
  expect(activeSynergies(cards, 'arc').map((s) => s.id)).toEqual(['pinning']);
  expect(activeSynergies(cards, 'cannon').map((s) => s.id)).toEqual([
    'pinning',
  ]);
});
it('frost return replaces only the third melee sector with one returning blade and loses its bullet sweep', () => {
  const w = sword();
  w.cards = ['void-return', 'ice-touch'];
  w.stats = deriveStats(w.cards);
  attack(w);
  expect(w.swing).not.toBeNull();
  attack(w);
  expect(w.swing).not.toBeNull();
  w.projectiles.clear();
  const enemyBullet = shoot(w, 715, 410, Math.PI, true)!;
  attack(w);
  expect(w.combo).toBe(2);
  expect(w.swing).toBeNull();
  const blades = w.projectiles.items.filter((b) => b.active && !b.enemy);
  expect(blades).toHaveLength(1);
  expect(blades[0].returning).toBe(true);
  expect(blades[0].shape).toBe('blade');
  updateWeapon(w, 0.08);
  expect(enemyBullet.active).toBe(true);
});
it('new-run weapons are seed reproducible, varied and independent of camp preference; resume preserves the result', () => {
  const found = new Set<string>();
  for (let seed = 0; seed < 60; seed++) {
    const a = new Engine({ save: blankSave(), persistence: false }),
      b = new Engine({ save: blankSave(), persistence: false });
    a.save.meta.weapon = 'sword';
    b.save.meta.weapon = 'cannon';
    a.start(seed);
    b.start(seed);
    expect(a.world.weapon).toBe(b.world.weapon);
    found.add(a.world.weapon);
    a.chooseCard(a.world.rewards[0].id);
    a.checkpoint();
    const before = a.world.weapon;
    a.world.phase = 'menu';
    a.save.meta.weapon = 'arc';
    expect(a.resume()).toBe(true);
    expect(a.world.weapon).toBe(before);
  }
  expect(found.size).toBe(3);
});
it('new random-start histories reproduce fixed-step combat exactly', () => {
  const engine = new Engine({ save: blankSave(), persistence: false });
  const recorder = new ReplayRecorder(engine, 513, blankSave());
  engine.chooseCard(engine.world.rewards[0].id);
  for (let i = 0; i < 360; i++)
    engine.update(1 / 60, { ...nil, fire: true, x: i < 80 ? 1 : 0 });
  const replay = new ReplayPlayer(exportReplay(recorder.stop()));
  while (!replay.finished && !replay.desync) replay.step();
  expect(replay.desync).toBeNull();
  expect(replay.finished).toBe(true);
});
