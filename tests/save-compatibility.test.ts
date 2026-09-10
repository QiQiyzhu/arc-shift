import { expect, it } from 'vitest';
import { blankSave, parseSave } from '../src/core/save';
import { Engine } from '../src/game/engine';
import { makeRoom } from '../src/rooms/generator';
import { expedition } from '../src/rooms/expedition';

// Authored fixtures for the documented version-1 shapes, not exported player data.
function oldSave() {
  return {
    version: 1, settings: { master: 0.4, music: 0.3, sfx: 0.6 },
    meta: { runs: 3, wins: 1, bestRoom: 8, bestTime: 400, totalKills: 43, discovered: ['fire-ember'] },
    checkpoint: { seed: 51, room: makeRoom(4, 'boss', 58), cards: ['fire-ember'], hp: 81,
      level: 3, xp: 4, elapsed: 25, kills: 12, totalDamage: 650, damageTaken: 39 },
  };
}
it('migrates the original v1 shape without changing its legacy Boss or offset room seed', () => {
  const save = parseSave(JSON.stringify(oldSave()));
  expect(save.meta.runs).toBe(3);
  expect(save.meta.bosses).toEqual(['warden', 'oracle']);
  expect(save.checkpoint?.campaign).toBe('legacy');
  expect(save.checkpoint?.room).toEqual(makeRoom(4, 'boss', 58));
  const engine = new Engine({ save, persistence: false });
  expect(engine.resume()).toBe(true);
  expect(engine.world.boss?.kind).toBe('warden');
  expect(engine.world.player.hp).toBe(81);
  expect(engine.world.weapon).toBe('arc');
});
it('retains economy-era resources and progression across normalize/resume/re-save', () => {
  const save = parseSave(JSON.stringify(oldSave()));
  Object.assign(save.checkpoint!, { weapon: 'cannon', forms: ['cannon', 'sword'],
    wallet: { coins: 32, keys: 2, bombs: 1, tonics: 2, shards: 9 }, shield: 17,
    preparation: { vitality: 2, flask: 1, stipend: 1 }, progress: 'map' });
  save.meta.shards = 82;
  const normalized = parseSave(JSON.stringify(save));
  expect(parseSave(JSON.stringify(normalized))).toEqual(normalized);
  const engine = new Engine({ save: normalized, persistence: false });
  engine.resume(); engine.checkpoint();
  expect(engine.world.forms).toEqual(['cannon', 'sword']);
  expect(engine.world.wallet).toEqual(save.checkpoint!.wallet);
  expect(engine.world.player.shield).toBe(17);
  expect(engine.save.meta.shards).toBe(82);
});
it('rebuilds pilgrimage geometry from its deterministic graph and rejects an impossible route', () => {
  const engine = new Engine({ save: blankSave(), persistence: false });
  engine.start(773); engine.chooseCard(engine.world.rewards[0].id);
  const raw = structuredClone(engine.save);
  raw.checkpoint!.room.template = 999;
  raw.checkpoint!.room.bossKind = 'corrupt' as never;
  expect(parseSave(JSON.stringify(raw)).checkpoint!.room).toEqual(expedition(773)[0].room);
  raw.checkpoint!.route = [expedition(773)[2].id];
  expect(parseSave(JSON.stringify(raw)).checkpoint).toBeNull();
});
it('drops a corrupt legacy checkpoint without losing valid settings or meta progression', () => {
  for (const patch of [{ bossKind: 'unknown' }, { template: -1 }, { template: 0.5 },
    { seed: 1e30 }, { biome: 'missing' }, { modifier: 'missing' }, { name: null }]) {
    const raw = oldSave(); Object.assign(raw.checkpoint.room, patch);
    const parsed = parseSave(JSON.stringify(raw));
    expect(parsed.checkpoint).toBeNull();
    expect(parsed.meta.totalKills).toBe(43);
    expect(parsed.settings.master).toBe(0.4);
    expect(new Engine({ save: parsed, persistence: false }).resume()).toBe(false);
  }
  const overflow = JSON.stringify(oldSave()).replace('"hp":81', '"hp":1e400');
  expect(parseSave(overflow).checkpoint).toBeNull();
  expect(parseSave('{broken')).toEqual(blankSave());
  expect(parseSave(JSON.stringify({ ...oldSave(), version: 99 }))).toEqual(blankSave());
});
