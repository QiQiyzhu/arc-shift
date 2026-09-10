import { expect, it } from 'vitest';
import { Engine } from '../src/game/engine';
import { makeRoom } from '../src/rooms/generator';
import { blankSave, parseSave } from '../src/core/save';
import {
  normalizePreparation,
  normalizeWallet,
  startingWallet,
} from '../src/economy/catalog';
import { hitEnemy } from '../src/combat/damage';
import { updatePickups } from '../src/economy/loot';
import { throwBomb, drinkTonic, updateWeapon } from '../src/combat/weapons';
function camp(index = 1) {
  const e = new Engine();
  e.start(31337);
  e.chooseCard('fire-ember');
  e.world.campaign = 'legacy';
  e.enter(makeRoom(index, 'combat', 31337));
  e.world.phase = 'playing';
  e.world.enemies = [];
  e.clear();
  e.chooseCard(e.world.rewards[0].id);
  return e;
}
function reload(e: Engine) {
  const next = new Engine();
  next.save = parseSave(JSON.stringify(e.save));
  expect(next.resume()).toBe(true);
  return next;
}
it('v0.2 saves preserve progress and receive safe v0.3 defaults', () => {
  const legacy = JSON.parse(JSON.stringify(camp().save));
  for (const key of ['shards', 'preparation', 'weapon'])
    delete legacy.meta[key];
  for (const key of [
    'wallet',
    'preparation',
    'weapon',
    'campUsed',
    'banked',
    'rerolls',
  ])
    delete legacy.checkpoint[key];
  const save = parseSave(JSON.stringify(legacy));
  expect(save.meta.shards).toBe(0);
  expect(save.meta.weapon).toBe('arc');
  expect(save.checkpoint?.wallet).toEqual(startingWallet());
  expect(save.checkpoint?.cards).toEqual(legacy.checkpoint.cards);
  expect(save.checkpoint?.progress).toBe('map');
});
it('wallets and preparations reject nonfinite, fractional and oversized values', () => {
  expect(
    normalizeWallet({
      coins: -9,
      keys: 1.8,
      bombs: 100,
      shards: Infinity,
      tonics: 50,
    }),
  ).toEqual({ coins: 0, keys: 1, bombs: 9, shards: 0, tonics: 3 });
  expect(
    normalizePreparation({ vitality: 900, flask: -1, stipend: NaN }),
  ).toEqual({ vitality: 3, flask: 0, stipend: 0 });
});
it('keys grant one extra protocol and a chest cannot also be bombed or refreshed', () => {
  const e = camp(),
    n = e.world.cards.length;
  expect(e.openChest('key')).toBe(true);
  expect(e.world.cards).toHaveLength(n + 1);
  expect(e.world.wallet.keys).toBe(0);
  const saved = JSON.stringify(e.save);
  expect(e.openChest('bomb')).toBe(false);
  expect(JSON.stringify(e.save)).toBe(saved);
  const restored = reload(e);
  expect(restored.openChest('key')).toBe(false);
  expect(restored.openChest('bomb')).toBe(false);
  expect(restored.world.cards).toEqual(e.world.cards);
});
it('bombing a chest consumes the shared battle inventory and destroys its protocol', () => {
  const e = camp(),
    before = { ...e.world.wallet },
    n = e.world.cards.length;
  expect(e.openChest('bomb')).toBe(true);
  expect(e.world.wallet.bombs).toBe(before.bombs - 1);
  expect(e.world.wallet.coins).toBe(before.coins + 18);
  expect(e.world.wallet.shards).toBe(before.shards + 2);
  expect(e.world.cards).toHaveLength(n);
  expect(e.openChest('key')).toBe(false);
});
it('shop stock, affordability, health and consumable caps survive continuation', () => {
  const e = camp(2),
    w = e.world;
  w.wallet.coins = 80;
  expect(e.buy('heal')).toBe(false);
  expect(w.wallet.coins).toBe(80);
  w.player.hp = 60;
  expect(e.buy('heal')).toBe(true);
  expect(w.player.hp).toBe(95);
  expect(e.buy('heal')).toBe(false);
  expect(e.buy('tonic')).toBe(true);
  expect(e.buy('bomb')).toBe(true);
  expect(e.buy('key')).toBe(true);
  const next = reload(e);
  expect(next.world.wallet).toEqual(w.wallet);
  expect(next.buy('tonic')).toBe(false);
  const offsite = camp(1);
  offsite.world.wallet.coins = 99;
  expect(offsite.buy('key')).toBe(false);
});
it('blood pact is optional, cannot kill, bypasses shield and is once per altar', () => {
  const e = camp(3),
    w = e.world;
  w.player.hp = 30;
  w.player.shield = 30;
  expect(e.bloodPact()).toBe(false);
  w.player.hp = 31;
  expect(e.bloodPact()).toBe(true);
  expect(w.player.hp).toBe(1);
  expect(w.player.shield).toBe(30);
  const next = reload(e);
  expect(next.bloodPact()).toBe(false);
  expect(next.world.player.hp).toBe(1);
});
it('bank transfer is atomic with the checkpoint and cannot be claimed again after reload', () => {
  const e = camp(4),
    w = e.world;
  w.wallet.coins = 30;
  w.wallet.shards = 11;
  expect(e.bankShards()).toBe(true);
  expect(e.save.meta.shards).toBe(11);
  expect(w.wallet.shards).toBe(0);
  expect(w.wallet.coins).toBe(22);
  const next = reload(e);
  expect(next.bankShards()).toBe(false);
  expect(next.save.meta.shards).toBe(11);
  next.world.wallet.shards = 5;
  next.world.phase = 'gameover';
  next.finish();
  next.finish();
  expect(next.save.meta.shards).toBe(13);
  expect(next.save.checkpoint).toBeNull();
});
it('victory returns all carried shards plus its bonus exactly once', () => {
  const e = camp(7);
  e.world.wallet.shards = 9;
  e.world.phase = 'victory';
  e.finish();
  e.finish();
  expect(e.save.meta.shards).toBe(17);
  expect(e.world.settlement).toBe(17);
  expect(e.save.meta.wins).toBe(1);
});
it('workshop preparation affects a new run but never retroactively changes an old checkpoint', () => {
  const e = camp(2);
  e.world.phase = 'menu';
  e.save.meta.shards = 30;
  expect(e.upgradePreparation('vitality')).toBe(true);
  expect(e.selectWeapon('sword')).toBe(true);
  expect(e.save.meta.shards).toBe(22);
  expect(e.resume()).toBe(true);
  expect(e.world.player.maxHp).toBe(120);
  expect(e.world.weapon).toBe('arc');
  e.start(9);
  expect(e.world.weapon).toBe('sword');
  expect(e.world.player.maxHp).toBe(130);
  expect(e.upgradePreparation('vitality')).toBe(false);
});
it('paid rerolls are capped and the purchased hand is identical after reload', () => {
  const e = camp();
  e.world.phase = 'reward';
  e.world.wallet.coins = 100;
  expect(e.reroll()).toBe(true);
  const ids = e.world.rewards.map((c) => c.id);
  const next = reload(e);
  expect(next.world.rewards.map((c) => c.id)).toEqual(ids);
  expect(next.world.wallet.coins).toBe(88);
  expect(next.reroll()).toBe(true);
  expect(next.reroll()).toBe(true);
  expect(next.reroll()).toBe(false);
  expect(next.world.wallet.coins).toBe(46);
});
it('trial kills and economic actions never write resources into the real profile', () => {
  const e = camp(),
    before = JSON.stringify(e.save);
  e.startPractice(['fire-ember'], 'cannon');
  e.world.phase = 'playing';
  const enemy = e.world.spawn('warden', 640, 410);
  hitEnemy(e.world, enemy, 1e6);
  updatePickups(e.world, 0, true);
  expect(e.world.wallet.shards).toBeGreaterThan(0);
  e.world.phase = 'map';
  expect(e.openChest('key')).toBe(false);
  expect(e.bankShards()).toBe(false);
  expect(e.bloodPact()).toBe(false);
  expect(e.buy('bomb')).toBe(false);
  e.checkpoint();
  e.finish();
  expect(JSON.stringify(e.save)).toBe(before);
});
it('ordinary enemies have a per-room gold budget and bounded pickups', () => {
  const e = new Engine();
  const w = e.world;
  w.phase = 'playing';
  w.stats.crit = 0;
  for (let i = 0; i < 500; i++) {
    const n = w.spawn('hunter', 400, 300);
    hitEnemy(w, n, 1e6);
  }
  expect(w.pickups.length).toBeLessThanOrEqual(96);
  updatePickups(w, 0, true);
  expect(w.wallet.coins).toBe(28);
});
it('boss reinforcements cannot farm loot, experience, level healing or lifesteal', () => {
  const w = new Engine().world;
  w.phase = 'playing';
  w.player.hp = 30;
  w.stats.lifesteal = 2;
  const wallet = { ...w.wallet };
  for (let i = 0; i < 110; i++)
    hitEnemy(w, w.spawn('hunter', 400, 300, false, true), 1e6);
  updatePickups(w, 0, true);
  expect(w.wallet).toEqual(wallet);
  expect(w.kills).toBe(0);
  expect(w.level).toBe(1);
  expect(w.xp).toBe(0);
  expect(w.player.hp).toBe(30);
});
it('bomb fuse pauses outside simulation and tonic consumption respects health', () => {
  const e = new Engine(),
    w = e.world;
  w.phase = 'playing';
  w.stats.crit = 0;
  expect(drinkTonic(w)).toBe(false);
  w.player.hp = 50;
  expect(drinkTonic(w)).toBe(true);
  expect(w.player.hp).toBe(90);
  expect(w.wallet.tonics).toBe(0);
  expect(throwBomb(w, 700, 410)).toBe(true);
  expect(throwBomb(w, 700, 410)).toBe(false);
  const enemy = w.spawn('sentry', 700, 410);
  enemy.hp = 1000;
  updateWeapon(w, 0.79);
  expect(enemy.hp).toBe(1000);
  updateWeapon(w, 0.02);
  expect(enemy.hp).toBeLessThan(1000);
  expect(w.player.hp).toBe(90);
  expect(w.bombs).toHaveLength(0);
  w.phase = 'paused';
  expect(drinkTonic(w)).toBe(false);
  expect(throwBomb(w, 640, 410)).toBe(false);
});
it('a blank profile requires no account, migration reward or automatic starting grant', () => {
  expect(blankSave().meta.shards).toBe(0);
  expect(blankSave().meta.preparation).toEqual({
    vitality: 0,
    flask: 0,
    stipend: 0,
  });
});
