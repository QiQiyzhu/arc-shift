import { it, expect } from 'vitest';
import { Engine } from '../src/game/engine';
import { World } from '../src/game/world';
import { deriveStats, rewardChoices } from '../src/cards/system';
import { hitEnemy } from '../src/combat/damage';
import { roomChoices } from '../src/rooms/generator';
import { parseSave } from '../src/core/save';
it('pausing an entry or boss introduction freezes and restores its exact stage', () => {
  const e = new Engine();
  const input = {
    x: 0,
    y: 0,
    aimX: 0,
    aimY: 0,
    fire: false,
    dash: false,
    q: false,
    e: false,
  };
  for (const phase of ['transition', 'bossIntro', 'playing'] as const) {
    e.world.phase = phase;
    e.world.transitionTimer = 2;
    const elapsed = e.world.elapsed;
    e.pause();
    for (let i = 0; i < 400; i++) e.update(1 / 60, input);
    expect(e.world.phase).toBe('paused');
    expect(e.world.transitionTimer).toBe(2);
    expect(e.world.elapsed).toBe(elapsed);
    e.pause();
    expect(e.world.phase).toBe(phase);
  }
});
it('level-up and resume derive identical split-shot damage', () => {
  const e = new Engine();
  e.start(4);
  e.chooseCard('fire-ember');
  const w = e.world;
  w.phase = 'playing';
  w.cards.push('fire-split');
  w.stats = deriveStats(w.cards, w.level);
  w.xp = 54;
  const enemy = w.spawn('hunter', 600, 350);
  hitEnemy(w, enemy, 999);
  expect(w.level).toBe(2);
  const live = w.stats.damage;
  e.checkpoint();
  e.resume();
  expect(e.world.stats.damage).toBe(live);
});
it('checkpoint retains shields and reward/map stages', () => {
  const e = new Engine();
  e.start(5);
  e.chooseCard('storm-arc');
  e.world.phase = 'playing';
  e.world.player.shield = 30;
  e.clear();
  const reward = e.world.rewards.map((c) => c.id);
  e.save = parseSave(JSON.stringify(e.save));
  e.resume();
  expect(e.world.phase).toBe('reward');
  expect(e.world.player.shield).toBe(30);
  expect(e.world.rewards.map((c) => c.id)).toEqual(reward);
  e.chooseCard(reward[0]);
  const cards = [...e.world.cards];
  e.resume();
  expect(e.world.phase).toBe('map');
  expect(e.world.cards).toEqual(cards);
});
it('failed resume cannot unlock a terminal settlement', () => {
  const e = new Engine();
  e.world.phase = 'victory';
  e.finish();
  expect(e.resume()).toBe(false);
  e.finish();
  expect(e.save.meta.wins).toBe(1);
});
it('shift ice only applies its state through dash', () => {
  const w = new World();
  w.phase = 'playing';
  w.cards = ['shift-ice'];
  w.stats = deriveStats(w.cards);
  const e = w.spawn('hunter', 700, 400);
  hitEnemy(w, e, 1);
  expect(e.slow).toBe(0);
});
it('elite rewards guarantee at least one rare or epic option', () => {
  for (let seed = 0; seed < 200; seed++)
    expect(
      rewardChoices([], seed, 2, false, true).some(
        (c) => c.rarity !== 'common',
      ),
    ).toBe(true);
});
it('an eight-area run offers only two optional safe rooms', () => {
  for (let seed = 0; seed < 30; seed++) {
    let safe = 0;
    for (let index = 2; index <= 8; index++)
      if (
        roomChoices(index, seed).some(
          (r) => r.kind === 'heal' || r.kind === 'treasure',
        )
      )
        safe++;
    expect(safe).toBe(2);
  }
});
