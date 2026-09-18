import { describe, it, expect } from 'vitest';
import { BuildTrialSession } from '../src/trial/session';
import { DEFAULT_TRIAL, validateTrial } from '../src/trial/config';
import { hitEnemy } from '../src/combat/damage';
import { attack } from '../src/combat/weapons';
import { weaponProfile } from '../src/combat/weapon-profile';
import { chargeCue, blastCues } from '../src/render/telegraphs';
import { updateEnemies } from '../src/ai/enemy-ai';
import { readFileSync } from 'node:fs';
import { deriveStats } from '../src/cards/system';
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
function clear(s: BuildTrialSession) {
  const w = s.engine.world;
  w.phase = 'playing';
  for (const e of w.enemies) hitEnemy(w, e, 1e6, false);
  s.step(1 / 60, input);
}
function contract(s: BuildTrialSession) {
  s.toggle('ice-touch');
  s.start();
  clear(s);
  expect(s.next()).toBe(true);
  expect(s.state).toBe('contract');
}
describe('v2 contracts and actual weapon information', () => {
  it('replays the actual v1 configuration without introducing contracts', () => {
    const old = JSON.parse(
      readFileSync('docs/qa/planning-portfolio/recorded-run.json', 'utf8'),
    ).config;
    const valid = validateTrial(old);
    expect(valid.ok).toBe(true);
    if (!valid.ok) return;
    expect(valid.value.content).toEqual(old.content);
    expect(valid.value.stages).toEqual(old.stages);
    const s = new BuildTrialSession(valid.value);
    s.toggle('ice-touch');
    for (let i = 0; i < 3; i++) {
      s.start();
      clear(s);
      s.next();
      expect(s.state).not.toBe('contract');
    }
    expect(s.state).toBe('finished');
    expect(s.engine.world.weapon).toBe('arc');
    s.dispose();
  });
  it('cannot buy overload with lethal health or refund it by clicking again', () => {
    const s = new BuildTrialSession();
    contract(s);
    s.engine.world.player.hp = 20;
    expect(s.chooseContract('overload')).toBe(false);
    expect(s.contract).toBeNull();
    expect(s.chooseContract('supply')).toBe(true);
    expect(s.engine.world.player.hp).toBe(45);
    s.dispose();
    const paid = new BuildTrialSession();
    contract(paid);
    paid.chooseContract('overload');
    expect(paid.engine.world.player.hp).toBe(100);
    expect(paid.healthPaid).toBe(20);
    paid.chooseContract('supply');
    expect(paid.engine.world.player.hp).toBe(100);
    paid.dispose();
  });
  it('describes replacement finishers and cannon blade blast penalties', () => {
    const s = new BuildTrialSession();
    s.chooseWeapon('sword');
    const w = s.engine.world;
    w.cards = ['void-return', 'ice-touch', 'fire-split'];
    w.stats = deriveStats(w.cards, 3, [], w.content);
    attack(w);
    attack(w);
    const profile = weaponProfile(w, true);
    attack(w);
    expect(w.swing).toBeNull();
    const blade = w.projectiles.items.find(
      (b) => b.active && b.returning && b.damage > 20,
    )!;
    expect(blade.damage).toBeCloseTo(profile.damage, 10);
    w.projectiles.clear();
    w.weapon = 'cannon';
    w.forms = ['cannon', 'sword'];
    attack(w);
    expect(w.projectiles.items.find((b) => b.active)!.blastRadius).toBe(
      weaponProfile(w).reach,
    );
    s.dispose();
  });
  it.each(['lancer', 'warden', 'forgemaster'] as const)(
    'covers the complete actual %s charge including its last step',
    (kind) => {
      const s = new BuildTrialSession();
      const w = s.engine.world;
      w.enemies = [];
      w.terrain = { blocks: [], zones: [] };
      w.player.x = 1190;
      w.player.y = 600;
      const e = w.spawn(kind, 350, 300);
      e.state = 'telegraph';
      e.timer = 0;
      e.attackIndex = 2;
      e.aimX = 1000;
      e.aimY = 300;
      const cue = chargeCue(e)!;
      updateEnemies(w, 1 / 60);
      let guard = 0;
      while ((e.state as string) === 'attack' && guard++ < 100) {
        expect(e.x + e.radius + 13).toBeLessThanOrEqual(
          cue.x + cue.halfWidth + 0.001,
        );
        updateEnemies(w, 1 / 60);
      }
      expect(e.x + e.radius + 13).toBeLessThanOrEqual(
        cue.x + cue.halfWidth + 0.001,
      );
      s.dispose();
    },
  );
  it('migrates old config without introducing new gameplay and rejects invalid rules', () => {
    const old = structuredClone(DEFAULT_TRIAL) as unknown as Record<
      string,
      unknown
    >;
    old.schemaVersion = 1;
    delete old.weapons;
    delete old.contract;
    const v = validateTrial(old);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.value.weapons).toEqual(['arc']);
      expect(v.value.contract).toBeNull();
    }
    for (const c of [
      { ...DEFAULT_TRIAL, weapons: ['sword', 'sword'] },
      {
        ...DEFAULT_TRIAL,
        contract: { ...DEFAULT_TRIAL.contract, rewardCapacity: 99 },
      },
      {
        ...DEFAULT_TRIAL,
        contract: {
          ...DEFAULT_TRIAL.contract,
          elite: { kind: 'warden', x: 640, y: 300 },
        },
      },
    ])
      expect(validateTrial(c).ok).toBe(false);
  });
  it('locks the weapon for the whole run and counts slash attacks', () => {
    const s = new BuildTrialSession();
    expect(s.chooseWeapon('sword')).toBe(true);
    s.toggle('ice-touch');
    s.start();
    expect(s.chooseWeapon('cannon')).toBe(false);
    attack(s.engine.world);
    expect(s.shots).toBe(1);
    clear(s);
    s.next();
    s.chooseContract('overload');
    expect(s.chooseWeapon('arc')).toBe(false);
    s.dispose();
  });
  it('settles supply once, reports effective healing and preserves permanent repair expenditure', () => {
    const s = new BuildTrialSession();
    contract(s);
    s.engine.world.player.hp = 50;
    expect(s.start()).toBe(false);
    expect(s.repair()).toBe(false);
    expect(s.chooseContract('supply')).toBe(true);
    expect(s.engine.world.player.hp).toBe(75);
    expect(s.supplyRecovered).toBe(25);
    expect(s.chooseContract('supply')).toBe(false);
    expect(s.chooseContract('overload')).toBe(false);
    expect(s.repair()).toBe(true);
    expect(s.capacity).toBe(7);
    s.start();
    clear(s);
    s.next();
    expect(s.capacity).toBe(7);
    s.dispose();
    const full = new BuildTrialSession();
    contract(full);
    full.chooseContract('supply');
    expect(full.supplyRecovered).toBe(0);
    expect(full.engine.world.player.hp).toBe(120);
    full.dispose();
  });
  it('grants overload only after a real clear, only once, with correct elite attributes', () => {
    const s = new BuildTrialSession();
    contract(s);
    s.chooseContract('overload');
    expect(s.capacity).toBe(9);
    s.start();
    const elite = s.engine.world.enemies.find((e) => e.elite)!;
    expect(elite.hp).toBe(238 * 1.65);
    expect(elite.damage).toBe(
      s.config.content.enemies.find((e) => e.id === 'lancer')!.params.damage *
        1.3,
    );
    clear(s);
    expect(s.results.at(-1)?.contractReward).toBe(2);
    s.step(1 / 60, input);
    expect(s.earnedCapacity).toBe(2);
    s.next();
    expect(s.capacity).toBe(11);
    s.dispose();
    const fail = new BuildTrialSession();
    contract(fail);
    fail.chooseContract('overload');
    fail.start();
    fail.engine.world.player.hp = 0;
    fail.step(1 / 60, input);
    expect(fail.earnedCapacity).toBe(0);
    expect(fail.chooseContract('supply')).toBe(false);
    fail.dispose();
  });
  it.each(['arc', 'sword', 'cannon'] as const)(
    'matches %s attack parameters against the real attack function',
    (weapon) => {
      const s = new BuildTrialSession();
      s.chooseWeapon(weapon);
      s.toggle('fire-split');
      s.toggle('storm-surge');
      const w = s.engine.world;
      for (let i = 0; i < 3; i++) {
        const p = weaponProfile(w, weapon === 'sword' && i === 2);
        attack(w);
        expect(w.player.shotCd).toBeCloseTo(p.interval, 10);
        expect(
          weapon === 'sword'
            ? w.swing!.damage
            : w.projectiles.items.filter((b) => b.active).at(-1)!.damage,
        ).toBeCloseTo(p.damage, 10);
      }
      s.dispose();
    },
  );
  it.each([
    'warden',
    'oracle',
    'matron',
    'forgemaster',
    'weaver',
    'bomber',
  ] as const)(
    'shows %s blast locations actually produced by the AI',
    (kind) => {
      const s = new BuildTrialSession();
      const w = s.engine.world;
      w.enemies = [];
      w.phase = 'playing';
      const e = w.spawn(kind, 640, 240, false, true);
      e.aimX = 650;
      e.aimY = 460;
      e.state = 'telegraph';
      e.timer = 0;
      e.attackIndex = kind === 'forgemaster' ? 1 : kind === 'matron' ? 2 : 0;
      const expected = blastCues(e);
      expect(expected.length).toBeGreaterThan(0);
      updateEnemies(w, 1 / 60);
      expect(w.hazards.map(({ x, y, r }) => ({ x, y, r }))).toEqual(expected);
      s.dispose();
    },
  );
  it('covers contact radius and nominal charge travel', () => {
    const s = new BuildTrialSession();
    const e = s.engine.world.spawn('warden', 400, 300);
    e.attackIndex = 2;
    e.aimX = 900;
    e.aimY = 300;
    const cue = chargeCue(e)!;
    expect(cue.halfWidth).toBe(e.radius + 13);
    expect(cue.x - 400).toBeGreaterThanOrEqual(357.5);
    s.dispose();
  });
});
