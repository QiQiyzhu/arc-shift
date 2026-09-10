import { expect, it } from 'vitest';
import { Engine } from '../src/game/engine';
import { World } from '../src/game/world';
import {
  expedition,
  availableNodes,
  type RouteNode,
} from '../src/rooms/expedition';
import { parseSave, type Checkpoint } from '../src/core/save';
import { RELICS, BOSSES } from '../src/progression/catalog';
import { MUSIC, musicProfile } from '../src/audio/profiles';
import { scoreStep } from '../src/audio/score';
import {
  blocked,
  crossesBlock,
  moveOnTerrain,
  updateTerrain,
} from '../src/rooms/terrain';
import { attack, fireSupports, updateWeapon } from '../src/combat/weapons';
import { updateEnemies } from '../src/ai/enemy-ai';
import { deriveStats } from '../src/cards/system';
import { updateProjectiles } from '../src/combat/projectiles';
import { hitEnemy } from '../src/combat/damage';
import { makeRoom } from '../src/rooms/generator';
import type { RoomKind, WeaponId } from '../src/game/types';
const nil = {
  x: 0,
  y: 0,
  aimX: 640,
  aimY: 260,
  fire: false,
  dash: false,
  q: false,
  e: false,
};
function fixture(kind: RoomKind, depth?: number, seed = 20260908) {
  const e = new Engine();
  e.start(seed);
  e.chooseCard('fire-ember');
  const graph = expedition(seed),
    n = graph.find(
      (n) => n.room.kind === kind && (!depth || n.depth === depth),
    )!;
  const path = (n: RouteNode): string[] =>
    n.depth === 1
      ? [n.id]
      : [...path(graph.find((p) => p.next.includes(n.id))!), n.id];
  e.world.route = path(n);
  e.enter(n.room);
  return e;
}
function reload(e: Engine) {
  const n = new Engine();
  n.save = parseSave(JSON.stringify(e.save));
  expect(n.resume()).toBe(true);
  return n;
}
it('seeded twelve-layer graphs are connected, reproducible and converge on three bosses', () => {
  for (let seed = 0; seed < 60; seed++) {
    const g = expedition(seed),
      seen = new Set([g[0].id]);
    expect(g).toEqual(expedition(seed));
    expect(new Set(g.map((n) => n.id)).size).toBe(g.length);
    for (const n of g) {
      expect(seen.has(n.id)).toBe(true);
      for (const id of n.next) {
        const next = g.find((m) => m.id === id)!;
        expect(next.depth).toBe(n.depth + 1);
        seen.add(id);
      }
    }
    expect(g.filter((n) => n.room.kind === 'boss').map((n) => n.depth)).toEqual(
      [4, 8, 12],
    );
    expect(g.at(-1)!.next).toEqual([]);
    expect(g.find((n) => n.depth === 8)!.room.bossKind).toBe(
      seed % 2 === 0 ? 'matron' : 'forgemaster',
    );
  }
});
it('only a connected next node can be entered through travel and route persists', () => {
  const e = fixture('combat', 1),
    w = e.world;
  w.phase = 'playing';
  w.enemies = [];
  e.clear();
  e.chooseCard(w.rewards[0].id);
  const snapshot = JSON.stringify(e.save);
  for (const id of ['12:1', '1:1', 'missing']) expect(e.travel(id)).toBe(false);
  expect(JSON.stringify(e.save)).toBe(snapshot);
  const id = availableNodes(w.seed, w.room.nodeId!)[0].id;
  expect(e.travel(id)).toBe(true);
  expect(e.travel(id)).toBe(false);
  expect(reload(e).world.route).toEqual(['1:1', id]);
});
it('forges retain the primary weapon, grant one free early form, and cannot be replayed', () => {
  const e = fixture('forge', 2);
  expect(e.resolveEvent('form:sword')).toBe(true);
  expect(e.world.forms).toEqual(['arc', 'sword']);
  expect(e.world.wallet.coins).toBe(8);
  expect(e.resolveEvent('form:cannon')).toBe(false);
  const r = reload(e);
  expect(r.world.forms).toEqual(['arc', 'sword']);
  expect(r.resolveEvent('form:cannon')).toBe(false);
});
it('later forge purchases and invalid choices settle atomically', () => {
  const e = fixture('forge', 7),
    w = e.world;
  w.wallet.coins = 17;
  const before = JSON.stringify(w.wallet);
  expect(e.resolveEvent('form:sword')).toBe(false);
  expect(JSON.stringify(w.wallet)).toBe(before);
  w.wallet.coins = 18;
  expect(e.resolveEvent('form:invalid')).toBe(false);
  expect(e.resolveEvent('form:sword')).toBe(true);
  expect(w.wallet.coins).toBe(0);
});
it('blood, archive and bell events preserve their exact choice and reward on reload', () => {
  const blood = fixture('event', 3);
  blood.world.player.hp = 30;
  expect(blood.resolveEvent('blood')).toBe(false);
  blood.world.player.hp = 31;
  expect(blood.resolveEvent('blood')).toBe(true);
  expect(blood.world.player.hp).toBe(1);
  expect(reload(blood).resolveEvent('blood')).toBe(false);
  for (const [kind, choice] of [
    ['archive', 'read'],
    ['event', 'bell'],
  ] as const) {
    const e = fixture(kind);
    e.world.wallet.coins = 30;
    expect(e.resolveEvent(choice)).toBe(true);
    expect(e.world.phase).toBe('reward');
    expect(reload(e).world.rewards).toEqual(e.world.rewards);
  }
});
it('a treasure chest uses keys or bombs independently from its one weapon reward', () => {
  const e = fixture('treasure');
  expect(e.openChest('key')).toBe(true);
  expect(e.openChest('bomb')).toBe(false);
  expect(e.resolveEvent('form:cannon')).toBe(true);
  const r = reload(e);
  expect(r.world.wallet.keys).toBe(0);
  expect(r.world.forms).toContain('cannon');
  expect(r.openChest('key')).toBe(false);
});
it('unfinished events and shop stock survive reload without granting their main reward', () => {
  const e = fixture('shop');
  e.world.wallet.coins = 90;
  e.world.player.hp = 50;
  expect(e.buy('heal')).toBe(true);
  const r = reload(e);
  expect(r.world.phase).toBe('event');
  expect(r.world.eventDone).toBe(false);
  expect(r.world.player.hp).toBe(85);
  expect(r.buy('heal')).toBe(false);
});
it('corrupt route order and contradictory event phases discard only the checkpoint', () => {
  const e = fixture('archive', 6);
  e.save.meta.shards = 123;
  for (const mutate of [
    (c: Checkpoint) => (c.route = ['1:1', c.room.nodeId!]),
    (c: Checkpoint) => (c.progress = 'map'),
    (c: Checkpoint) => (c.eventDone = true),
    (c: Checkpoint) => (c.room.index = 12),
  ]) {
    const v = JSON.parse(JSON.stringify(e.save));
    mutate(v.checkpoint);
    const parsed = parseSave(JSON.stringify(v));
    expect(parsed.checkpoint).toBeNull();
    expect(parsed.meta.shards).toBe(123);
  }
});
it('boss-gated relics require an actual defeat and shards, then affect only new runs', () => {
  const e = new Engine();
  e.save.meta.shards = 100;
  expect(e.unlockRelic('vow-edge')).toBe(false);
  expect(e.equipRelic('hourglass')).toBe(false);
  e.save.meta.bosses.push('warden');
  expect(e.unlockRelic('vow-edge')).toBe(true);
  expect(e.unlockRelic('vow-edge')).toBe(false);
  expect(e.save.meta.shards).toBe(86);
  expect(e.equipRelic('vow-edge')).toBe(true);
  e.start(3);
  expect(e.world.relics).toEqual(['vow-edge']);
});
it('kiln-heart entry shield is not multiplied by repeating resume', () => {
  const e = fixture('combat', 1);
  e.world.relics = ['kiln-heart'];
  e.enter(e.world.room);
  expect(e.world.player.shield).toBe(10);
  const r = reload(e);
  expect(r.world.player.shield).toBe(10);
  expect(reload(r).world.player.shield).toBe(10);
});
it('actual boss deaths award unlocks in new and resumed legacy campaigns',()=>{
  for(const legacy of [false,true]) {
    const e=fixture('boss',4),w=e.world;
    if(legacy){w.campaign='legacy';e.enter(makeRoom(4,'boss',w.seed));}
    w.phase='playing';w.boss!.hp=1;hitEnemy(w,w.boss!,50,false);e.update(1/60,nil);
    expect(e.save.meta.bosses).toContain('warden');expect(e.save.meta.lore).toContain('warden');
    expect(parseSave(JSON.stringify(e.save)).meta.bosses).toContain('warden');
  }
  const e=new Engine();e.save.meta.unlocked=['vow-edge'];e.save.meta.equipped='vow-edge';e.selectWeapon('sword');e.start(7);e.chooseCard('fire-ember');expect(e.world.player.shield).toBe(15);expect(reload(e).world.player.shield).toBe(15);
});
it('all three primaries fire the acquired secondary forms without changing primary cooldown', () => {
  for (const weapon of ['arc', 'sword', 'cannon'] as WeaponId[]) {
    const w = new World();
    w.weapon = weapon;
    w.forms = ['arc', 'sword', 'cannon'];
    w.player.shotCd = 0.7;
    fireSupports(w, 1 / 60, false);
    expect(w.projectiles.count).toBe(0);
    expect(w.swing).toBeNull();
    fireSupports(w, 1 / 60, true);
    expect(w.player.shotCd).toBe(0.7);
    attack(w);
    expect(w.swing).not.toBeNull();
    expect(
      w.projectiles.items.some((p) => p.active && p.shape === 'shell'),
    ).toBe(true);
    expect(
      w.projectiles.items.some((p) => p.active && p.shape !== 'shell'),
    ).toBe(true);
  }
});
it('slow mixed builds retain sword finishers and fragment children never recurse', () => {
  const w = new World();
  w.forms = ['arc', 'sword', 'cannon'];
  w.cards = ['fire-meteor', 'storm-lance', 'void-orbit'];
  w.stats = deriveStats(w.cards);
  let finishers = 0;
  for (let i = 0; i < 300; i++) {
    const old = w.combo;
    fireSupports(w, 1 / 60, true);
    if (w.combo === 2 && old !== 2) finishers++;
    updateWeapon(w, 1 / 60);
    updateProjectiles(w, 1 / 60);
  }
  expect(finishers).toBeGreaterThan(0);
  expect(w.projectiles.misses).toBe(0);
  expect(
    w.projectiles.items
      .filter((p) => p.active && p.generation > 0)
      .every((p) => p.fragment === 0),
  ).toBe(true);
});
it('solid terrain blocks movement, swept projectiles and sword damage across cover', () => {
  const e = fixture('combat', 1),
    w = e.world,
    b = w.terrain.blocks[2];
  w.player.x = b.x - 45;
  w.player.y = b.y + b.h / 2;
  moveOnTerrain(w, w.player, b.x + b.w + 45, w.player.y, 16);
  expect(w.player.x).toBeLessThan(b.x);
  expect(
    crossesBlock(
      b.x - 20,
      b.y + 20,
      b.x + b.w + 20,
      b.y + 20,
      1,
      w.terrain.blocks,
    ),
  ).toBe(true);
  w.player.x = b.x - 18;
  w.player.angle = 0;
  const enemy = w.spawn('sentry', b.x + b.w + 22, w.player.y);
  const hp = enemy.hp;
  attack(w, 'sword');
  updateWeapon(w, 0.06);
  expect(enemy.hp).toBe(hp);
});
it('traps have a grace window, then hurt; blessing accelerates skills', () => {
  const e = fixture('combat', 1),
    w = e.world;
  w.phase = 'playing';
  Object.assign(w.player, { x: 530, y: 260, invulnerable: 0 });
  w.roomTime = 2.7;
  updateTerrain(w, 0.1);
  expect(w.player.hp).toBe(120);
  w.roomTime = 2.9;
  updateTerrain(w, 0.1);
  expect(w.player.hp).toBeLessThan(120);
  Object.assign(w.player, { x: 640, y: 365, qCd: 4, eCd: 5 });
  updateTerrain(w, 0.5);
  expect(w.fieldBuff).toBe(true);
  expect(w.player.qCd).toBeCloseTo(3.7);
});
it('challenge rewards are finite and objective completion is required after the last wave', () => {
  const e = fixture('challenge'),
    w = e.world;
  w.phase = 'playing';
  w.player.x = 640;
  w.player.y = 575;
  w.player.invulnerable = 999;
  for (let i = 0; i < 3600; i++) {
    w.enemies = [];
    e.update(1 / 60, nil);
  }
  expect(w.wave).toBe(5);
  expect(w.phase).toBe('playing');
  w.player.x = 640;
  w.player.y = 365;
  for (let i = 0; i < 1082; i++) e.update(1 / 60, nil);
  expect(w.phase).toBe('reward');
  expect(w.wallet.shards).toBe(5);
});
it('new enemies attack with finite state and remain outside solid terrain', () => {
  const e = fixture('combat', 5),
    w = e.world;
  w.player.invulnerable = 999;
  for (const kind of ['bomber', 'cantor', 'shade'] as const)
    w.spawn(kind, 640, 230);
  for (let i = 0; i < 900; i++) {
    updateEnemies(w, 1 / 60);
    updateProjectiles(w, 1 / 60);
  }
  expect(w.hazards.length + w.projectiles.count).toBeGreaterThan(0);
  expect(
    w.enemies.every(
      (e) =>
        Number.isFinite(e.x) && !blocked(e.x, e.y, e.radius, w.terrain.blocks),
    ),
  ).toBe(true);
});
it('boss and biome scores have distinct motifs, bounded voices and an Oracle release', () => {
  expect(new Set(Object.values(MUSIC).map((p) => p.bpm)).size).toBeGreaterThan(
    5,
  );
  for (const profile of Object.values(MUSIC))
    for (let step = 0; step < 64; step++) {
      const notes = scoreStep(step, 3, profile);
      expect(notes).toEqual(scoreStep(step + 64, 3, profile));
      expect(notes.length).toBeLessThanOrEqual(5);
      expect(notes.every((n) => Number.isFinite(n.note) && n.length > 0)).toBe(
        true,
      );
    }
  expect(musicProfile('grove', 'matron', 2).bpm).toBeGreaterThan(
    MUSIC.matron.bpm,
  );
  expect(musicProfile('foundry', 'oracle', 3).bpm).toBeLessThan(
    MUSIC.oracle.bpm,
  );
  expect(RELICS.filter((r) => r.boss).map((r) => r.boss)).toEqual(BOSSES);
});
