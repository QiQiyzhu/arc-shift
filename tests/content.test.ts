import { expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import {
  DEFAULT_CONTENT,
  importContent,
  validateContent,
  contentDiff,
} from '../src/content/schema';
import { Engine } from '../src/game/engine';
import { World } from '../src/game/world';
import { blankSave } from '../src/core/save';
import { Random } from '../src/core/math';
import { CARDS } from '../src/cards/catalog';
import { deriveStats, rewardChoices } from '../src/cards/system';
import { attack } from '../src/combat/weapons';
import { updateEnemies } from '../src/ai/enemy-ai';
import { ReplayRecorder, ReplayPlayer } from '../src/replay/replay';

it('preserves 500 pre-editor build derivations byte for byte', () => {
  // Oracle executed from git 434ea9a:src/cards/system.ts before parameter extraction.
  const results = [];
  for (let seed = 0; seed < 500; seed++) {
    const rng = new Random(seed + 9173);
    const cards = CARDS.filter(() => rng.next() < 0.45).map((c) => c.id);
    results.push(
      deriveStats(
        cards,
        1 + (seed % 12),
        seed % 2 ? ['hourglass', 'oracle-eye'] : [],
      ),
    );
  }
  expect(
    createHash('sha256').update(JSON.stringify(results)).digest('hex'),
  ).toBe('812ecf8db5844c8c49d18c086187b236e904a6f72481a4e6884bfaeb88d4f651');
});
it('round trips, canonicalizes record order, and detaches/freezes valid content', () => {
  const source = structuredClone(DEFAULT_CONTENT);
  source.cards.reverse();
  const result = importContent(JSON.stringify(source));
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value).toEqual(DEFAULT_CONTENT);
  source.enemies[0].params.hp = 9;
  expect(result.value.enemies[0].params.hp).toBe(52);
  expect(Object.isFrozen(result.value.enemies[0].params)).toBe(true);
});
it('rejects duplicate IDs, unknown fields, missing values, bounds and bad JSON before apply', () => {
  const changes = [
    (p: typeof DEFAULT_CONTENT) => {
      p.enemies[1].id = p.enemies[0].id;
    },
    (p: typeof DEFAULT_CONTENT) => {
      p.weapons[0].params.damage = Infinity;
    },
    (p: typeof DEFAULT_CONTENT) => {
      p.cards[0].params.surprise = 2;
    },
    (p: typeof DEFAULT_CONTENT) => {
      delete p.enemies[0].params.radius;
    },
    (p: typeof DEFAULT_CONTENT) => {
      p.encounters[0].params.baseCount = 1.5;
    },
    (p: typeof DEFAULT_CONTENT) => {
      p.bosses[0].params.phase3At = 0.9;
    },
  ];
  for (const change of changes) {
    const p = structuredClone(DEFAULT_CONTENT);
    change(p);
    expect(validateContent(p).ok).toBe(false);
  }
  expect(importContent('{').ok).toBe(false);
  expect(importContent(' '.repeat(256 * 1024 + 1)).ok).toBe(false);
});
it('rejects missing, self, cyclic and prototype-chain references', () => {
  const p = structuredClone(DEFAULT_CONTENT);
  p.cards[0].requires = 'unknown';
  expect(validateContent(p).ok).toBe(false);
  p.cards[0].requires = p.cards[0].id;
  expect(validateContent(p).ok).toBe(false);
  p.cards[0].requires = p.cards[1].id;
  p.cards[1].requires = p.cards[0].id;
  expect(validateContent(p).ok).toBe(false);
  p.cards[0].requires = null;
  p.cards[1].requires = null;
  for (const kind of ['warden', '__proto__', 'toString', 'missing']) {
    p.encounters[0].pool = [kind as 'hunter'];
    expect(validateContent(p).ok).toBe(false);
  }
});
it('applies enemy, weapon, protocol and encounter edits through the real engine', () => {
  const content = structuredClone(DEFAULT_CONTENT);
  content.enemies[0].params.hp = 100;
  content.weapons[0].params.damage = 2;
  content.cards.find((r) => r.id === 'fire-ember')!.params.burn = 42;
  content.encounters[0].params.baseCount = 10;
  const e = new Engine({ save: blankSave(), persistence: false, content });
  e.startPractice(['fire-ember']);
  const w = e.world;
  expect(w.stats.burn).toBe(42);
  expect(w.spawn('hunter', 800, 350).maxHp).toBe(130);
  attack(w);
  const shot = w.projectiles.items.find((p) => p.active)!;
  expect(shot.damage).toBe(w.stats.damage * 2);
  w.enemies = [];
  e.spawnWave();
  expect(w.enemies.length).toBe(13);
  e.start(123);
  expect(e.world.content.enemies[0].params.hp).toBe(100);
  e.chooseCard('fire-ember');
  expect(e.world.stats.burn).toBe(42);
  expect(e.resume()).toBe(true);
  expect(e.world.stats.burn).toBe(42);
  expect(DEFAULT_CONTENT.enemies[0].params.hp).toBe(52);
});
it('tuned sword sectors and cannon explosions reach live attack geometry', () => {
  const content = structuredClone(DEFAULT_CONTENT);
  content.weapons.find((r) => r.id === 'sword')!.params.range = 1.5;
  content.weapons.find((r) => r.id === 'cannon')!.params.blast = 2;
  const w = new World(content);
  attack(w, 'sword');
  expect(w.swing!.range).toBe(180);
  attack(w, 'cannon');
  expect(w.projectiles.items.find((p) => p.active)!.blastRadius).toBe(144);
});
it('tuned Boss thresholds and recovery change the real state machine', () => {
  const content = structuredClone(DEFAULT_CONTENT);
  content.bosses[0].params.phase2At = 0.9;
  content.bosses[0].params.phaseRecovery = 3;
  const w = new World(content),
    boss = w.spawn('warden', 800, 350);
  boss.hp = boss.maxHp * 0.8;
  updateEnemies(w, 1 / 60);
  expect(boss.phase).toBe(2);
  expect(boss.state).toBe('recover');
  expect(boss.timer).toBe(3);
});
it('edited prerequisite gates actual reward offers and appears in the semantic diff', () => {
  const p = structuredClone(DEFAULT_CONTENT);
  p.cards.find((c) => c.id === 'fire-ember')!.requires = 'shift-stride';
  for (let seed = 0; seed < 100; seed++)
    expect(
      rewardChoices([], seed, 1, false, false, p).map((c) => c.id),
    ).not.toContain('fire-ember');
  expect(contentDiff(DEFAULT_CONTENT, p)).toEqual([
    'cards.fire-ember.requires: null → "shift-stride"',
  ]);
});
it('rejects custom replay packs while allowing normalized default imports', () => {
  const custom = structuredClone(DEFAULT_CONTENT);
  custom.enemies[0].params.hp = 500;
  expect(
    () =>
      new ReplayRecorder(
        new Engine({ save: blankSave(), persistence: false, content: custom }),
        3,
      ),
  ).toThrow('Custom sandbox');
  const defaults = structuredClone(DEFAULT_CONTENT);
  defaults.cards.reverse();
  const recorder = new ReplayRecorder(
    new Engine({ save: blankSave(), persistence: false, content: defaults }),
    3,
  );
  expect(new ReplayPlayer(recorder.stop()).desync).toBeNull();
});
