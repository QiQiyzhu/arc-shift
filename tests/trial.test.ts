import { describe, it, expect } from 'vitest';
import { BuildTrialSession } from '../src/trial/session';
import { DEFAULT_TRIAL, validateTrial, importTrial } from '../src/trial/config';
import { hitEnemy } from '../src/combat/damage';
import { shoot } from '../src/combat/projectiles';
import { ReplayRecorder } from '../src/replay/replay';
const input = {
  x: 0,
  y: 0,
  aimX: 640,
  aimY: 200,
  fire: false,
  dash: false,
  q: false,
  e: false,
};
const dt = 1 / 60;
function clear(s: BuildTrialSession) {
  const w = s.engine.world;
  w.phase = 'playing';
  for (const e of w.enemies) hitEnemy(w, e, 1e6, false);
  s.step(dt, input);
}
describe('build trial: economic and settlement boundaries', () => {
  it('validates and copies rules, rejects malformed, unsafe and impossible opening packs', () => {
    expect(validateTrial(DEFAULT_TRIAL).ok).toBe(true);
    expect(importTrial('{').ok).toBe(false);
    expect(importTrial(' '.repeat(262145)).ok).toBe(false);
    for (const change of [
      (c: typeof DEFAULT_TRIAL) => {
        c.stages[0].budget = 1;
        c.offers = c.offers.filter((o) => o.id !== 'ice-touch');
      },
      (c: typeof DEFAULT_TRIAL) => {
        c.offers[0].id = 'ice-shell';
      },
      (c: typeof DEFAULT_TRIAL) => {
        c.offers[0].id = 'void-leech';
      },
      (c: typeof DEFAULT_TRIAL) => {
        c.offers[0].cost = NaN;
      },
      (c: typeof DEFAULT_TRIAL) => {
        c.stages[1].budget = 1;
      },
    ]) {
      const c = structuredClone(DEFAULT_TRIAL);
      change(c);
      expect(validateTrial(c).ok).toBe(false);
    }
    const c = structuredClone(DEFAULT_TRIAL),
      s = new BuildTrialSession(c);
    c.stages[0].budget = 99;
    expect(s.capacity).toBe(6);
    s.dispose();
  });
  it('enforces price, slot, unlock and prerequisites without refund exploits', () => {
    const s = new BuildTrialSession();
    expect(s.start()).toBe(false);
    expect(s.toggle('fire-fuel')).toBe(false);
    expect(s.toggle('fire-split')).toBe(true);
    expect(s.toggle('fire-ember')).toBe(true);
    expect(s.toggle('storm-surge')).toBe(false);
    expect(s.toggle('ice-touch')).toBe(true);
    expect(s.remaining).toBe(0);
    expect(s.toggle('fire-split')).toBe(true);
    expect(s.remaining).toBe(3);
    expect(s.toggle('fire-split')).toBe(true);
    expect(s.remaining).toBe(0);
    expect(s.start()).toBe(true);
    expect(s.start()).toBe(false);
    expect(s.toggle('fire-ember')).toBe(false);
    clear(s);
    s.next();
    s.start();
    clear(s);
    s.next();
    s.toggle('ice-touch');
    expect(s.toggle('fire-fuel')).toBe(true);
    expect(s.toggle('fire-ember')).toBe(false);
    expect(s.cards).toContain('fire-ember');
    s.dispose();
  });
  it('settles once through real damage, counts kills and avoids main-mode loot, XP and persistence', () => {
    const s = new BuildTrialSession();
    s.activate();
    s.activate();
    s.toggle('ice-touch');
    s.start();
    clear(s);
    expect(s.results).toHaveLength(1);
    expect(s.results[0].kills).toBe(6);
    expect(s.results[0].damage).toBe(813);
    const w = s.engine.world;
    expect(w.xp).toBe(0);
    expect(w.pickups).toHaveLength(0);
    expect(w.wallet.coins).toBe(0);
    expect(s.engine.persistenceEnabled).toBe(false);
    s.step(dt, input);
    expect(s.results).toHaveLength(1);
    expect(() => new ReplayRecorder(s.engine, DEFAULT_TRIAL.seed)).toThrow();
    s.dispose();
  });
  it('keeps injury and repair cost across stages; blocks empty-build repair softlocks', () => {
    const s = new BuildTrialSession();
    s.toggle('ice-touch');
    s.start();
    clear(s);
    s.engine.world.player.hp = 50;
    s.next();
    s.toggle('ice-touch');
    expect(s.repair()).toBe(false);
    s.toggle('ice-touch');
    expect(s.repair()).toBe(true);
    expect(s.repair()).toBe(false);
    expect(s.capacity).toBe(7);
    expect(s.engine.world.player.hp).toBe(85);
    s.start();
    expect(s.engine.world.player.hp).toBe(85);
    clear(s);
    s.next();
    expect(s.capacity).toBe(10);
    s.dispose();
  });
  it('counts simulation ticks only during play, freezes pause and records timeout', () => {
    const c = structuredClone(DEFAULT_TRIAL);
    c.stages[0].limit = 20;
    const s = new BuildTrialSession(c);
    s.toggle('ice-touch');
    s.start();
    s.step(dt, input);
    expect(s.ticks).toBe(0);
    s.engine.world.phase = 'playing';
    s.engine.pause();
    s.step(dt, input);
    expect(s.ticks).toBe(0);
    s.engine.pause();
    s.ticks = 1199;
    s.step(dt, input);
    expect(s.results[0].outcome).toBe('timeout');
    expect(s.results[0].ticks).toBe(1200);
    s.dispose();
  });
  it('accepts an actual projectile kill on the final allowed tick', () => {
    const s = new BuildTrialSession();
    s.toggle('ice-touch');
    s.start();
    const w = s.engine.world;
    w.phase = 'playing';
    w.enemies = [w.enemies[0]];
    const target = w.enemies[0];
    target.hp = 1;
    target.speed = 0;
    target.state = 'recover';
    target.timer = 99;
    shoot(w, target.x, target.y, 0, false, 999, 0);
    s.ticks = s.config.stages[0].limit * 60 - 1;
    s.step(dt, input);
    expect(s.results[0].outcome).toBe('clear');
    expect(s.results[0].kills).toBe(1);
    s.dispose();
  });
  it('prioritizes defeat and permits one final summary with detached export', () => {
    const s = new BuildTrialSession();
    s.toggle('ice-touch');
    s.start();
    const w = s.engine.world;
    w.phase = 'playing';
    w.player.hp = 0;
    w.enemies = [];
    s.step(dt, input);
    expect(s.results[0].outcome).toBe('defeated');
    expect(s.next()).toBe(false);
    s.dispose();
    const success = new BuildTrialSession();
    success.toggle('ice-touch');
    for (let i = 0; i < 3; i++) {
      success.start();
      clear(success);
      success.next();
    }
    expect(success.state).toBe('finished');
    expect(success.next()).toBe(false);
    const dump = success.export();
    dump.results[0].cards.push('bad');
    expect(success.results[0].cards).not.toContain('bad');
    success.dispose();
  });
});
