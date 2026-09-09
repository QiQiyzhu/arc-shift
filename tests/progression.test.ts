import { describe, it, expect } from 'vitest';
import { CARDS, REQUIREMENTS } from '../src/cards/catalog';
import { deriveStats, buildCounts, rewardChoices } from '../src/cards/system';
import { roomChoices, makeRoom } from '../src/rooms/generator';
import { Random } from '../src/core/math';
import { Pool } from '../src/core/pool';
import { EventBus } from '../src/core/events';
import { parseSave, blankSave } from '../src/core/save';
import { Engine } from '../src/game/engine';
describe('data-driven builds', () => {
  it('contains 40 unique protocols evenly across five branches', () => {
    expect(CARDS.length).toBe(40);
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(40);
    expect(Object.values(buildCounts(CARDS.map((c) => c.id)))).toEqual([
      8, 8, 8, 8, 8,
    ]);
  });
  it('never offers owned or unusable dependent cards across 100 seeds', () => {
    for (let seed = 0; seed < 100; seed++) {
      const ids: string[] = [];
      for (let room = 1; room < 8; room++) {
        const cs = rewardChoices(ids, seed, room);
        expect(cs.length).toBe(3);
        expect(new Set(cs.map((c) => c.id)).size).toBe(3);
        for (const c of cs) {
          expect(ids).not.toContain(c.id);
          if (REQUIREMENTS[c.id]) expect(ids).toContain(REQUIREMENTS[c.id]);
        }
        ids.push(cs[0].id);
      }
    }
  });
  it('keeps reward randomness independent from combat RNG', () => {
    const before = rewardChoices(['storm-arc'], 123, 3);
    const r = new Random(123);
    for (let i = 0; i < 1000; i++) r.next();
    expect(rewardChoices(['storm-arc'], 123, 3)).toEqual(before);
  });
  it('three same-element protocols activate a real mechanical synergy', () => {
    expect(deriveStats(['fire-ember', 'fire-fuel', 'fire-dash']).burn).toBe(22);
    expect(
      deriveStats(['storm-arc', 'storm-conduct', 'storm-static']).chain,
    ).toBe(5);
    expect(
      deriveStats(['ice-touch', 'ice-pierce', 'ice-shell']).slow,
    ).toBeCloseTo(0.45);
    expect(
      deriveStats(['void-seek', 'void-horizon', 'void-execute']).eCooldown,
    ).toBe(8);
    expect(
      deriveStats(['shift-quick', 'shift-shield', 'shift-nova']).damage,
    ).toBe(20);
  });
  it('invalid or double card picks cannot grant rewards', () => {
    const e = new Engine();
    e.start(77);
    expect(e.chooseCard('invalid')).toBe(false);
    expect(e.chooseCard('fire-ember')).toBe(true);
    expect(e.chooseCard('fire-ember')).toBe(false);
    expect(e.world.cards).toEqual(['fire-ember']);
  });
});
describe('run generation and persistence', () => {
  it('always routes through both bosses', () => {
    for (let seed = 0; seed < 50; seed++) {
      for (const index of [4, 8]) {
        const r = roomChoices(index, seed);
        expect(r.length).toBe(1);
        expect(r[0].kind).toBe('boss');
      }
    }
  });
  it('room templates reproduce by seed and expose legal alternatives', () => {
    expect(roomChoices(3, 12)).toEqual(roomChoices(3, 12));
    expect(roomChoices(3, 12).map((r) => r.kind)).toEqual(['combat', 'heal']);
    expect(
      roomChoices(2, 12).every((r) => r.template >= 0 && r.template <= 3),
    ).toBe(true);
  });
  it('recovers safely from malformed, future, or corrupt saves', () => {
    for (const raw of [
      'bad',
      'null',
      '{}',
      '{"version":12}',
      '{"version":1,"settings":{},"meta":{}}',
    ])
      expect(() => parseSave(raw)).not.toThrow();
    expect(parseSave('bad')).toEqual(blankSave());
  });
  it('clamps settings and rejects invalid checkpoint', () => {
    const s = blankSave();
    s.settings.master = 5;
    s.checkpoint = {
      seed: 1,
      room: makeRoom(9, 'boss', 1),
      cards: ['hacked'],
      hp: 200,
      level: 2,
      xp: 0,
      elapsed: 0,
      kills: 0,
      totalDamage: 0,
      damageTaken: 0,
    };
    const parsed = parseSave(JSON.stringify(s));
    expect(parsed.settings.master).toBe(1);
    expect(parsed.checkpoint).toBe(null);
  });
  it('resumes with identical checkpoint build and health', () => {
    const e = new Engine();
    e.start(531);
    e.chooseCard('storm-arc');
    e.world.player.hp = 87;
    e.enter(makeRoom(3, 'combat', 531));
    const cp = JSON.parse(JSON.stringify(e.save.checkpoint));
    const next = new Engine();
    next.save.checkpoint = cp;
    expect(next.resume()).toBe(true);
    expect(next.world.cards).toEqual(['storm-arc']);
    expect(next.world.player.hp).toBe(87);
    expect(next.world.stats.chain).toBe(2);
    expect(next.world.room.index).toBe(3);
  });
});
describe('bounded resources and events', () => {
  it('pool never allocates past capacity, reuses released objects, and reports saturation', () => {
    const pool = new Pool(2, () => ({ active: false, n: 0 }));
    const a = pool.acquire()!;
    pool.acquire();
    expect(pool.acquire()).toBeUndefined();
    expect(pool.misses).toBe(1);
    a.active = false;
    expect(pool.acquire()).toBe(a);
    pool.clear();
    expect(pool.count).toBe(0);
  });
  it('unsubscribed event listeners cannot accumulate effects', () => {
    const bus = new EventBus<number>();
    let calls = 0;
    const off = bus.on((n) => (calls += n));
    bus.emit(2);
    off();
    bus.emit(3);
    expect(calls).toBe(2);
  });
});
