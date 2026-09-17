import { describe, it, expect, vi } from 'vitest';
import {
  RELAY_ACTIVITY as definition,
  RELAY_AWARD,
  activityDigest,
  importActivity,
  validateActivity,
} from '../src/activities/definition';
import {
  ActivitySession,
  newAttempt,
  type ActivityResult,
} from '../src/activities/session';
import {
  ActivityStore,
  ACTIVITY_KEY,
  blankActivitySave,
  parseActivitySave,
  validResult,
} from '../src/activities/store';
import { ReplayRecorder } from '../src/replay/replay';
import type { Input } from '../src/game/types';
const input: Input = {
  x: 0,
  y: 0,
  aimX: 900,
  aimY: 360,
  fire: false,
  dash: false,
  q: false,
  e: false,
};
const dt = 1 / 60;
const attempt = () =>
  newAttempt(definition, 'test-attempt', '2026-09-17T08:00:00.000Z');
function session() {
  return new ActivitySession(definition, attempt(), 'official');
}
function quiet(s: ActivitySession) {
  const w = s.engine.world;
  w.phase = 'playing';
  w.enemies = [];
  w.wave = 99;
  w.player.invulnerable = 200;
  return w;
}
const win = (): ActivityResult => ({
  attempt: attempt(),
  mode: 'official',
  reason: 'captured',
  metrics: {
    ticks: 1200,
    holdSeconds: 18,
    kills: 4,
    damage: 100,
    damageTaken: 10,
  },
});
function storage() {
  const data = new Map<string, string>();
  let fail = false;
  const api = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: vi.fn((k: string, v: string) => {
      if (fail) throw Error('QuotaExceeded');
      data.set(k, v);
    }),
  };
  return {
    data,
    api,
    store: new ActivityStore(api),
    fail: (v: boolean) => {
      fail = v;
    },
  };
}
describe('challenge configuration and shared combat', () => {
  it('validates a complete pack, normalizes key order and isolates caller edits', () => {
    const raw = structuredClone(definition);
    const valid = validateActivity(raw);
    expect(valid.ok).toBe(true);
    raw.captureRadius = 65;
    expect(valid.ok && valid.value.captureRadius).toBe(100);
    const reordered = Object.fromEntries(Object.entries(definition).reverse());
    expect(activityDigest(reordered as typeof definition)).toBe(
      activityDigest(definition),
    );
  });
  it.each([
    { weapon: ['arc'] },
    { weapon: {} },
    { weapon: 1 },
    { schemaVersion: 2 },
    { captureRadius: NaN },
    { holdSeconds: 75 },
    { holdSeconds: 2 },
    { timeLimitSeconds: 181 },
    { cards: ['fire-fuel'] },
    { cards: ['unknown'] },
    { cards: ['fire-ember', 'fire-ember'] },
    { extra: 1 },
  ])('rejects invalid config %j', (patch) => {
    expect(validateActivity({ ...definition, ...patch }).ok).toBe(false);
  });
  it('rejects invalid JSON, oversized input and broken nested content', () => {
    expect(importActivity('{').ok).toBe(false);
    expect(importActivity(' '.repeat(262145)).ok).toBe(false);
    const d = structuredClone(definition);
    d.content.enemies[0].params.hp = -1;
    expect(validateActivity(d).ok).toBe(false);
  });
  it('uses real combat, isolated persistence, and rejects ordinary replay recording', () => {
    const s = session();
    expect(s.engine.practice).toBe(false);
    expect(s.engine.world.challengeRules).toEqual({
      holdSeconds: 18,
      captureRadius: 100,
    });
    expect(() => new ReplayRecorder(s.engine, definition.seed)).toThrow(
      /Activity/,
    );
    const w = quiet(s);
    w.player.hp = 1;
    w.player.invulnerable = 0;
    const enemy = w.spawn('hunter', w.player.x, w.player.y);
    enemy.state = 'chase';
    s.step(dt, input);
    expect(s.result?.reason).toBe('defeated');
  });
  it('intro and pause do not consume deadline; terminal steps do not advance', () => {
    const s = session();
    s.step(dt, input);
    expect(s.activeTicks).toBe(0);
    s.engine.pause();
    for (let i = 0; i < 30; i++) s.step(dt, input);
    expect(s.activeTicks).toBe(0);
    const result = s.abandon(),
      tick = s.engine.world.tick;
    s.step(dt, input);
    expect(s.engine.world.tick).toBe(tick);
    expect(s.abandon()).toBe(result);
    expect(() => session().step(NaN, input)).toThrow(/60 Hz/);
  });
  it('configurable hold and radius affect existing capture logic', () => {
    const d = { ...definition, holdSeconds: 3, captureRadius: 60 };
    const s = new ActivitySession(d, newAttempt(d, 'draft'), 'draft');
    const w = quiet(s);
    w.player.x = 710;
    w.player.y = 365;
    s.step(dt, input);
    expect(w.challengeTime).toBe(0);
    w.player.x = 640;
    for (let i = 0; i < 180; i++) s.step(dt, input);
    expect(s.result?.reason).toBe('captured');
    expect(s.result?.metrics?.ticks).toBe(181);
    expect(s.result?.mode).toBe('draft');
  });
  it('capture on last permitted step wins, but death wins a simultaneous finish', () => {
    const s = session(),
      w = quiet(s);
    w.player.x = 640;
    w.player.y = 365;
    s.activeTicks = 4499;
    w.challengeTime = 18 - dt;
    s.step(dt, input);
    expect(s.result?.reason).toBe('captured');
    const dead = session(),
      d = quiet(dead);
    dead.activeTicks = 4499;
    d.challengeTime = 18;
    d.player.hp = 0;
    dead.step(dt, input);
    expect(dead.result?.reason).toBe('defeated');
  });
  it('timeout fires at exactly 4500 playing steps while outside the ring', () => {
    const s = session();
    quiet(s);
    s.activeTicks = 4499;
    s.step(dt, input);
    expect(s.result).toMatchObject({
      reason: 'timeout',
      metrics: { ticks: 4500, holdSeconds: 0 },
    });
  });
});
describe('local activity transactions', () => {
  it('preserves main save bytes across the entire challenge and award path', () => {
    const m = storage();
    m.data.set('arcshift.save.v1', 'old-main-checkpoint');
    const s = session();
    m.store.begin(s.attempt);
    m.store.saveResult(win());
    m.store.acknowledge(s.attempt.id);
    expect(m.data.get('arcshift.save.v1')).toBe('old-main-checkpoint');
    expect(m.api.setItem.mock.calls.every(([k]) => k === ACTIVITY_KEY)).toBe(
      true,
    );
  });
  it('failed start leaves no active attempt', () => {
    const m = storage();
    m.fail(true);
    expect(() => m.store.begin(attempt())).toThrow('Quota');
    expect(m.store.read()).toEqual(blankActivitySave());
  });
  it('result and reward writes can retry without awarding twice', () => {
    const m = storage();
    m.store.begin(attempt());
    m.fail(true);
    expect(() => m.store.saveResult(win())).toThrow();
    expect(m.store.read().active).toEqual(attempt());
    m.fail(false);
    m.store.saveResult(win());
    const calls = m.api.setItem.mock.calls.length;
    m.store.saveResult(win());
    expect(m.api.setItem).toHaveBeenCalledTimes(calls);
    m.fail(true);
    expect(() => m.store.acknowledge(attempt().id)).toThrow();
    expect(m.store.read().awards).toEqual([]);
    m.fail(false);
    m.store.acknowledge(attempt().id);
    m.store.acknowledge(attempt().id);
    m.store.saveResult(win());
    expect(m.store.read()).toMatchObject({
      awards: [RELAY_AWARD],
      bestTicks: 1200,
      terminal: { acknowledged: true },
    });
  });
  it('rejects conflicting same-ID results and late results from old attempts', () => {
    const m = storage();
    m.store.begin(attempt());
    m.store.saveResult(win());
    expect(() => m.store.saveResult({ ...win(), reason: 'abandoned' })).toThrow(
      /不同/,
    );
    m.store.acknowledge(attempt().id);
    m.store.begin({ ...attempt(), id: 'next' });
    expect(() => m.store.saveResult(win())).toThrow(/过期/);
    expect(m.store.read().active?.id).toBe('next');
  });
  it('requires pending result acknowledgement before a new attempt', () => {
    const m = storage();
    m.store.begin(attempt());
    expect(() => m.store.begin({ ...attempt(), id: 'next' })).toThrow();
    m.store.saveResult(win());
    expect(() => m.store.begin({ ...attempt(), id: 'next' })).toThrow();
  });
  it('recovers an interrupted run once with no fabricated metrics or award', () => {
    const m = storage();
    m.store.begin(attempt());
    const recovered = m.store.recover();
    expect(recovered.terminal?.result).toMatchObject({
      reason: 'interrupted',
      metrics: null,
    });
    const calls = m.api.setItem.mock.calls.length;
    expect(m.store.recover()).toEqual(recovered);
    expect(m.api.setItem).toHaveBeenCalledTimes(calls);
    m.store.acknowledge(attempt().id);
    expect(m.store.read().awards).toEqual([]);
  });
  it.each([
    '{',
    '{"version":2}',
    JSON.stringify({ ...blankActivitySave(), extra: 1 }),
    JSON.stringify({
      ...blankActivitySave(),
      awards: [RELAY_AWARD],
      bestTicks: 0,
    }),
  ])('preserves unsupported/corrupt records %s', (raw) => {
    const m = storage();
    m.data.set(ACTIVITY_KEY, raw);
    expect(() => m.store.recover()).toThrow();
    expect(m.data.get(ACTIVITY_KEY)).toBe(raw);
    expect(m.api.setItem).not.toHaveBeenCalled();
  });
  it('validates result types, plausible timing, deadline and official identity', () => {
    const r = win();
    expect(validResult(r)).toBe(true);
    for (const bad of [
      { ...r, reason: ['captured'] },
      { ...r, mode: 'draft' },
      { ...r, reason: 'timeout' },
      { ...r, metrics: { ...r.metrics, ticks: 0 } },
      { ...r, attempt: { ...r.attempt, digest: 'wrong' } },
    ])
      expect(validResult(bad)).toBe(false);
    expect(() =>
      parseActivitySave(
        JSON.stringify({
          ...blankActivitySave(),
          terminal: { result: r, acknowledged: true },
        }),
      ),
    ).toThrow();
  });
});
