import { describe, expect, it } from 'vitest';
import { Engine } from '../src/game/engine';
import { blankSave } from '../src/core/save';
import { DEFAULT_CONTENT } from '../src/content/schema';
import {
  analyze,
  captureBuild,
  measure,
  snapshotKey,
  type BuildSnapshot,
} from '../src/coach/simulation';
import {
  retrieveStrategies,
  validateCards,
  validateStrategy,
} from '../src/coach/knowledge';
import library from '../src/coach/strategy-library.json';

const build = (): BuildSnapshot => ({
  cards: [],
  relics: [],
  forms: ['arc'],
  weapon: 'arc',
  level: 4,
  content: structuredClone(DEFAULT_CONTENT),
  offered: [],
  source: 'camp',
});
const candidate = { id: 'plain', label: '无协议', cards: [] as string[] };

describe('coach model output acceptance', () => {
  it('accepts all nine reviewed recipes with complete prerequisites and grounded references', () => {
    expect(library.plans).toHaveLength(9);
    expect(
      new Set(library.plans.map((p) => `${p.weapon}:${p.goal}`)).size,
    ).toBe(9);
    for (const plan of library.plans)
      expect(validateStrategy(plan)).toEqual(plan);
  });
  it('rejects a synergy masquerading as a card, missing prerequisites, and unsupported evidence', () => {
    const p = library.plans[0];
    expect(validateCards(['plasma'])).toBe(false);
    expect(validateCards(['storm-conduct'])).toBe(false);
    expect(() =>
      validateStrategy({ ...p, cards: [...p.cards.slice(0, 4), 'plasma'] }),
    ).toThrow();
    expect(() =>
      validateStrategy({ ...p, evidence: ['thermal', p.cards[0]] }),
    ).toThrow();
    expect(() => validateStrategy({ ...p, runCommand: 'anything' })).toThrow();
  });
  it('retrieves only the chosen weapon and exposes the reason for a movement request', () => {
    const plans = library.plans.map((p) => validateStrategy(p));
    const found = retrieveStrategies(
      plans,
      '跃迁 移动',
      'mobility',
      'cannon',
      [],
    );
    expect(found).toHaveLength(3);
    expect(found.every((r) => r.plan.weapon === 'cannon')).toBe(true);
    expect(found[0].plan.id).toBe('cannon-mobility');
    expect(found[0].reasons).toContain('匹配「跃迁」');
  });
});
describe('coach independent engine measurement', () => {
  it('reproduces actual fixed-tick combat, uses ready skills, and leaves the campaign untouched', () => {
    const e = new Engine({ save: blankSave(), persistence: false });
    e.start(91731);
    e.chooseCard(e.world.rewards[0].id);
    e.checkpoint();
    const originalWorld = e.world;
    const original = JSON.stringify({
      save: e.save,
      tick: e.world.tick,
      player: e.world.player,
      cards: e.world.cards,
    });
    const b = captureBuild(e);
    const first = measure(b, candidate),
      second = measure(b, candidate);
    expect(first).toEqual(second);
    expect(first.single).toBeGreaterThan(0);
    expect(first.swarm).toBeGreaterThan(first.single);
    expect(first.samples).toHaveLength(6);
    for (const sample of first.samples) {
      expect(sample.ticks).toBe(720);
      expect(sample.casts).toEqual({ pulse: 2, well: 2, dash: 0 });
      expect(sample.poolMisses).toBe(0);
      expect(Number.isFinite(sample.damage)).toBe(true);
    }
    expect(e.world).toBe(originalWorld);
    expect(
      JSON.stringify({
        save: e.save,
        tick: e.world.tick,
        player: e.world.player,
        cards: e.world.cards,
      }),
    ).toBe(original);
  });
  it('compares one offered card at equal budget and ranks mobility by movement statistics', () => {
    const b = build();
    b.offered = ['shift-quick', 'fire-ember'];
    const result = analyze(
      b,
      b.offered.map((id) => ({ id, label: id, nextCard: id, cards: [id] })),
      'mobility',
    );
    expect(result.rows[0].candidate.id).toBe('shift-quick');
    expect(result.rows[0].dash).toBeLessThan(result.baseline.dash);
    expect(result.rows[0].samples.every((s) => s.casts.dash === 0)).toBe(true);
  });
  it.each([
    { level: NaN },
    { level: '4' },
    { forms: ['arc', 'arc', 'arc'] },
    { forms: ['sword'] },
    { relics: ['invented'] },
    { offered: ['plasma'] },
  ])('rejects malformed build %j before simulation', (patch) => {
    expect(() =>
      measure({ ...build(), ...patch } as BuildSnapshot, candidate),
    ).toThrow();
  });
  it('rejects a fabricated or stale offered action and invalid ranking goals', () => {
    const b = build();
    b.offered = ['fire-ember'];
    expect(() =>
      measure(b, { ...candidate, nextCard: 'fire-ember' }),
    ).toThrow();
    expect(() =>
      measure(b, {
        ...candidate,
        nextCard: 'shift-quick',
        cards: ['shift-quick'],
      }),
    ).toThrow();
    expect(() => analyze(b, [candidate], 'arbitrary' as never)).toThrow();
    expect(() => analyze(b, [candidate, candidate], 'single')).toThrow();
  });
  it('freezes rule snapshots and notices a later content or reward change', () => {
    const e = new Engine({
      save: blankSave(),
      persistence: false,
      content: structuredClone(DEFAULT_CONTENT),
    });
    const before = captureBuild(e),
      key = snapshotKey(before);
    const replacement = structuredClone(e.content);
    replacement.weapons[0].params.damage = 1.2;
    Object.defineProperty(e, 'content', { value: replacement });
    expect(snapshotKey(before)).toBe(key);
    expect(snapshotKey(captureBuild(e))).not.toBe(key);
    e.start(123);
    const rewards = snapshotKey(captureBuild(e));
    e.world.rewards.reverse();
    expect(snapshotKey(captureBuild(e))).not.toBe(rewards);
  });
});
