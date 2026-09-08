import { describe, it, expect } from 'vitest';
import { World } from '../src/game/world';
import { calculateDamage, cooldown, segmentHits } from '../src/combat/rules';
import { updatePlayer } from '../src/systems/player';
import { updateEnemies } from '../src/ai/enemy-ai';
import { hitEnemy, hurtPlayer } from '../src/combat/damage';
import { shoot, updateProjectiles } from '../src/combat/projectiles';
import { updateHazards } from '../src/systems/hazards';
import { laserGeometry } from '../src/combat/geometry';
import { Engine } from '../src/game/engine';
import type { Input } from '../src/game/types';
const idle: Input = {
  x: 0,
  y: 0,
  aimX: 900,
  aimY: 400,
  fire: false,
  dash: false,
  q: false,
  e: false,
};
function world() {
  const w = new World();
  w.phase = 'playing';
  return w;
}
describe('damage and collision', () => {
  it('applies critical boundary and scales damage once', () => {
    expect(calculateDamage(20, 0.2, 1.8, 0.199)).toEqual({
      damage: 36,
      critical: true,
    });
    expect(calculateDamage(20, 0.2, 1.8, 0.2)).toEqual({
      damage: 20,
      critical: false,
    });
  });
  it('prevents tunnelling for a fast projectile', () => {
    expect(segmentHits(0, 100, 1000, 100, 500, 104, 5)).toBe(true);
    expect(segmentHits(0, 100, 1000, 100, 500, 106, 5)).toBe(false);
  });
  it('uses shield first and ignores damage during invulnerability', () => {
    const w = world();
    w.player.shield = 8;
    hurtPlayer(w, 15);
    expect(w.player.hp).toBe(113);
    expect(w.player.shield).toBe(0);
    hurtPlayer(w, 100);
    expect(w.player.hp).toBe(113);
  });
  it('does not allow post-mortem lifesteal', () => {
    const w = world();
    const e = w.spawn('hunter', 700, 400);
    w.stats.lifesteal = 10;
    w.player.hp = 1;
    hurtPlayer(w, 5);
    hitEnemy(w, e, 1000);
    expect(w.player.hp).toBe(0);
    expect(w.kills).toBe(0);
    expect(w.phase).toBe('gameover');
  });
  it('keeps a bounced shot inside the arena on its first collision', () => {
    const w = world();
    w.stats.bounce = 2;
    shoot(w, 1214, 300, 0);
    updateProjectiles(w, 1 / 60);
    const b = w.projectiles.items.find((b) => b.active)!;
    expect(b.vx).toBeLessThan(0);
    expect(b.x).toBeLessThan(1210);
    updateProjectiles(w, 1 / 60);
    expect(b.active).toBe(true);
    expect(b.x).toBeLessThan(1209);
  });
  it('hits each target once per piercing projectile', () => {
    const w = world();
    const e = w.spawn('hunter', 660, 410);
    w.stats.crit = 0;
    w.stats.pierce = 3;
    shoot(w, 640, 410, 0, false, 10, 100);
    for (let i = 0; i < 20; i++) updateProjectiles(w, 1 / 60);
    expect(e.hp).toBe(e.maxHp - 10);
  });
});
describe('movement, skills and hazards', () => {
  it('normalizes diagonal speed and brakes promptly', () => {
    const a = world(),
      b = world();
    for (let i = 0; i < 20; i++) {
      updatePlayer(a, { ...idle, x: 1 }, 1 / 60);
      updatePlayer(b, { ...idle, x: 1, y: 1 }, 1 / 60);
    }
    expect(Math.hypot(a.player.vx, a.player.vy)).toBeCloseTo(
      Math.hypot(b.player.vx, b.player.vy),
      8,
    );
    for (let i = 0; i < 8; i++) updatePlayer(a, idle, 1 / 60);
    expect(a.player.vx).toBeLessThan(3);
  });
  it('dash preserves a longer pre-existing invincibility window', () => {
    const w = world();
    w.player.invulnerable = 0.7;
    updatePlayer(w, { ...idle, x: 1, dash: true }, 1 / 60);
    expect(w.player.invulnerable).toBeGreaterThan(0.6);
    expect(w.player.dashCd).toBe(w.stats.dashCooldown);
  });
  it('cannot dash again during cooldown and cannot cross walls', () => {
    const w = world();
    w.player.x = 1180;
    updatePlayer(w, { ...idle, x: 1, dash: true }, 1 / 60);
    for (let i = 0; i < 30; i++) updatePlayer(w, { ...idle, x: 1 }, 1 / 60);
    const cd = w.player.dashCd;
    updatePlayer(w, { ...idle, dash: true }, 1 / 60);
    expect(w.player.x).toBeLessThanOrEqual(1192);
    expect(w.player.dashCd).toBeLessThan(cd);
  });
  it('basic pulse damages, slows, and cancels enemy projectiles', () => {
    const w = world();
    const e = w.spawn('hunter', 730, 410);
    e.state = 'chase';
    shoot(w, 680, 410, 0, true);
    updatePlayer(w, { ...idle, q: true }, 1 / 60);
    expect(e.hp).toBeLessThan(e.maxHp);
    expect(e.slow).toBeGreaterThan(0);
    expect(w.projectiles.count).toBe(0);
    const x = e.x;
    updateEnemies(w, 1 / 60);
    expect(Math.abs(e.x - x)).toBeLessThan(e.speed / 60);
  });
  it('fire dash at a wall cannot stack a hazard every tick', () => {
    const w = world();
    w.cards = ['fire-dash'];
    w.player.x = 1192;
    for (let i = 0; i < 10; i++)
      updatePlayer(w, { ...idle, x: 1, dash: i === 0 }, 1 / 60);
    expect(w.hazards.length).toBe(1);
  });
  it('hostile circle only damages after its telegraph ends', () => {
    const w = world();
    w.hazards.push({
      x: 640,
      y: 410,
      r: 70,
      time: 1,
      duration: 1,
      damage: 20,
      friendly: false,
      type: 'blast',
      tick: 0,
    });
    updateHazards(w, 0.5);
    expect(w.player.hp).toBe(120);
    updateHazards(w, 0.51);
    expect(w.player.hp).toBe(100);
    expect(w.hazards.length).toBe(0);
  });
  it('cooldowns clamp exactly to zero', () => {
    expect(cooldown(0.01, 0.03)).toBe(0);
    expect(cooldown(1, 0.25)).toBe(0.75);
  });
});
describe('AI and terminal state', () => {
  it('charger snapshots aim and recovers after a charge', () => {
    const w = world();
    const e = w.spawn('lancer', 400, 410);
    e.state = 'chase';
    e.timer = 0;
    updateEnemies(w, 1 / 60);
    expect(e.state).toBe('telegraph');
    const locked = e.aimY;
    w.player.y = 600;
    for (let i = 0; i < 55; i++) updateEnemies(w, 1 / 60);
    expect(e.aimY).toBe(locked);
    expect(e.state).toBe('attack');
    for (let i = 0; i < 32; i++) updateEnemies(w, 1 / 60);
    expect(e.state).toBe('recover');
  });
  it('boss phase cancels old hazards and hostile bullets', () => {
    const w = world();
    const e = w.spawn('oracle', 640, 240);
    e.hp = e.maxHp * 0.6;
    e.state = 'telegraph';
    e.timer = 0.1;
    shoot(w, 400, 300, 0, true);
    w.hazards.push({
      x: 400,
      y: 300,
      r: 80,
      time: 1,
      duration: 1,
      damage: 20,
      type: 'blast',
      friendly: false,
      tick: 0,
    });
    updateEnemies(w, 1 / 60);
    expect(e.phase).toBe(2);
    expect(e.state).toBe('recover');
    expect(w.projectiles.count).toBe(0);
    expect(w.hazards.length).toBe(0);
  });
  it('laser geometry warns on both sides with shared width', () => {
    const w = world();
    const e = w.spawn('oracle', 640, 300);
    e.aimX = 900;
    e.aimY = 300;
    e.state = 'telegraph';
    const b = laserGeometry(e);
    expect(segmentHits(b.x1, b.y1, b.x2, b.y2, 200, 300, b.halfWidth)).toBe(
      true,
    );
    expect(segmentHits(b.x1, b.y1, b.x2, b.y2, 1100, 300, b.halfWidth)).toBe(
      true,
    );
    expect(segmentHits(b.x1, b.y1, b.x2, b.y2, 640, 330, b.halfWidth)).toBe(
      false,
    );
  });
  it('paused and reward states freeze all simulation timers', () => {
    const engine = new Engine();
    const w = engine.world;
    for (const phase of ['paused', 'reward', 'map'] as const) {
      w.phase = phase;
      w.player.qCd = 3;
      const before = w.elapsed;
      engine.update(1, idle);
      expect(w.elapsed).toBe(before);
      expect(w.player.qCd).toBe(3);
    }
  });
  it('engine resolves death once without later combat updates', () => {
    const engine = new Engine();
    const w = engine.world;
    w.phase = 'playing';
    w.player.hp = 1;
    w.player.invulnerable = 0;
    const e = w.spawn('hunter', 640, 410);
    e.state = 'chase';
    engine.update(1 / 60, idle);
    expect(w.phase).toBe('gameover');
    expect(engine.save.meta.bestRoom).toBe(1);
    const saved = JSON.stringify(engine.save.meta);
    engine.update(1, idle);
    expect(JSON.stringify(engine.save.meta)).toBe(saved);
  });
});
