import { expect, it } from 'vitest';
import { World } from '../src/game/world';
import { Engine } from '../src/game/engine';
import { deriveStats } from '../src/cards/system';
import { CARDS } from '../src/cards/catalog';
import { TRIAL_BUILDS } from '../src/cards/synergies';
import { attack, inSwordArc, updateWeapon } from '../src/combat/weapons';
import { shoot, updateProjectiles } from '../src/combat/projectiles';
import type { WeaponId } from '../src/game/types';
function world(weapon: WeaponId, cards: string[] = []) {
  const w = new World();
  w.phase = 'playing';
  w.weapon = weapon;
  w.cards = cards;
  w.stats = deriveStats(cards);
  w.stats.crit = 0;
  w.player.angle = 0;
  return w;
}
it('sword sector includes target radius at its edges and rejects rear or distant targets', () => {
  const s = { x: 0, y: 0, angle: 0, range: 120, arc: 2 };
  expect(inSwordArc(120, 0, 8, s)).toBe(true);
  expect(inSwordArc(129, 0, 8, s)).toBe(false);
  expect(inSwordArc(-50, 0, 8, s)).toBe(false);
  expect(inSwordArc(4, 0, 8, s)).toBe(true);
  expect(inSwordArc(Math.cos(1.05) * 100, Math.sin(1.05) * 100, 8, s)).toBe(
    true,
  );
});
it('sword has a real windup, locks aim, hits only once per swing and cuts front bullets', () => {
  const w = world('sword'),
    front = w.spawn('sentry', 710, 410),
    rear = w.spawn('sentry', 570, 410);
  front.hp = rear.hp = 1000;
  attack(w);
  w.player.angle = Math.PI;
  const a = shoot(w, 710, 410, 0, true)!,
    b = shoot(w, 570, 410, 0, true)!;
  updateWeapon(w, 0.04);
  expect(front.hp).toBe(1000);
  updateWeapon(w, 0.02);
  const hp = front.hp;
  expect(hp).toBeLessThan(1000);
  expect(rear.hp).toBe(1000);
  expect(a.active).toBe(false);
  expect(b.active).toBe(true);
  for (let i = 0; i < 12; i++) updateWeapon(w, 1 / 60);
  expect(front.hp).toBe(hp);
  expect(w.projectiles.items.filter((p) => p.active && !p.enemy)).toHaveLength(
    0,
  );
});
it('sword rejects circles outside the curved sector corner', () => {
  const s = { x: 0, y: 0, angle: 0, range: 120, arc: 1.9 };
  for (const side of [-1, 1])
    expect(
      inSwordArc(Math.cos(1.02) * 129, side * Math.sin(1.02) * 129, 10, s),
    ).toBe(false);
});
it('a pierce-only protocol creates a penetrating rune blade alongside the sword', () => {
  const w = world('sword', ['storm-needle']);
  attack(w);
  const b = w.projectiles.items.find((p) => p.active)!;
  expect(w.swing).not.toBeNull();
  expect(b.shape).toBe('blade');
  expect(b.pierce).toBeGreaterThan(0);
});
it('third slash is a stronger wider finisher and a broken combo resets', () => {
  const w = world('sword');
  attack(w);
  const first = { ...w.swing! };
  attack(w);
  attack(w);
  expect(w.swing!.combo).toBe(2);
  expect(w.swing!.damage).toBeGreaterThan(first.damage);
  expect(w.swing!.range).toBeGreaterThan(first.range);
  updateWeapon(w, 1.3);
  attack(w);
  expect(w.swing!.combo).toBe(0);
});
it('sword trajectory cards add secondary rune blades without replacing melee', () => {
  const w = world('sword', [
    'fire-split',
    'void-orbit',
    'ice-prism',
    'void-seek',
    'fire-ember',
  ]);
  attack(w);
  expect(w.swing).not.toBeNull();
  const blades = w.projectiles.items.filter((b) => b.active);
  expect(blades).toHaveLength(3);
  expect(
    blades.every(
      (b) =>
        b.generation === 1 && b.orbit && b.bounce === 2 && b.shape === 'blade',
    ),
  ).toBe(true);
});
it('cannon uses slower larger rounds and secondary splash damages neighbours once', () => {
  const w = world('cannon'),
    direct = w.spawn('sentry', 692, 410),
    splash = w.spawn('sentry', 695, 470);
  direct.hp = splash.hp = 1000;
  attack(w);
  const b = w.projectiles.items.find((p) => p.active)!;
  expect(b.shape).toBe('shell');
  expect(b.speed).toBeLessThan(720);
  expect(b.radius).toBeGreaterThan(4);
  expect(w.player.shotCd).toBeGreaterThan(0.6);
  for (let i = 0; i < 5; i++) updateProjectiles(w, 1 / 60);
  expect(direct.hp).toBe(1000 - Math.round(16 * 3.8));
  expect(splash.hp).toBe(1000 - Math.round(16 * 3.8 * 0.45));
});
it('cannon state is fully reset when a pooled round is reused by an enemy', () => {
  const w = world('cannon');
  attack(w);
  const b = w.projectiles.items.find((p) => p.active)!;
  for (const slot of w.projectiles.items) slot.active = true;
  b.active = false;
  const next = shoot(w, 700, 400, 0, true)!;
  expect(next).toBe(b);
  expect(next.blastRadius).toBe(0);
  expect(next.shape).toBe('bolt');
});
it('all three weapons combine with all trial recipes and the maximal stack without exhausting the projectile pool', () => {
  for (const weapon of ['arc', 'sword', 'cannon'] as const)
    for (const cards of [
      ...TRIAL_BUILDS.map((b) => [...b.cards]),
      CARDS.map((c) => c.id),
    ]) {
      const e = new Engine();
      e.startPractice(cards, weapon);
      for (let i = 0; i < 1200; i++) {
        const w = e.world,
          target = w.enemies.find((n) => n.hp > 0);
        e.update(1 / 60, {
          x:
            weapon === 'sword' && target ? Math.sign(target.x - w.player.x) : 0,
          y:
            weapon === 'sword' && target ? Math.sign(target.y - w.player.y) : 0,
          aimX: target?.x || 1000,
          aimY: target?.y || 400,
          fire: true,
          dash: i % 150 === 0,
          q: i % 300 === 0,
          e: i % 450 === 0,
        });
      }
      expect(e.world.kills).toBeGreaterThan(0);
      expect(e.world.projectiles.misses).toBe(0);
      expect(e.world.pickups.length).toBeLessThanOrEqual(96);
      for (const b of e.world.projectiles.items)
        if (b.active) expect(Number.isFinite(b.x + b.y + b.damage)).toBe(true);
    }
});
