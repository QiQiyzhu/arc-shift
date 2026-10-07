import { describe, expect, it } from 'vitest';
import {
  FRONTIER_RULES,
  FrontierSession,
  type FrontierObjective,
} from '../src/frontier/session';
import { blocked } from '../src/rooms/terrain';
import { hitEnemy } from '../src/combat/damage';
import { ReplayRecorder } from '../src/replay/replay';
import { CARDS } from '../src/cards/catalog';
import type { Input } from '../src/game/types';

const input: Input = {
  x: 0,
  y: 0,
  aimX: 640,
  aimY: 250,
  fire: false,
  dash: false,
  q: false,
  e: false,
};
const dt = 1 / 60;
function frame(
  s: FrontierSession,
  count = 1,
  peaceful = true,
  command = input,
) {
  for (let i = 0; i < count; i++) {
    if (peaceful) s.engine.world.enemies = [];
    s.step(dt, command);
  }
}
function ready(s: FrontierSession) {
  expect(s.start()).toBe(true);
  s.engine.world.phase = 'playing';
  s.engine.world.enemies = [];
}
function relay(s: FrontierSession) {
  if (s.objective.kind !== 'relay') throw Error('Expected relay');
  for (const node of s.objective.nodes) {
    Object.assign(s.engine.world.player, node, { vx: 0, vy: 0 });
    frame(s, 193);
  }
}
function route(s: FrontierSession, path: 'grove' | 'foundry') {
  ready(s);
  relay(s);
  expect(s.state).toBe('route');
  expect(s.chooseRoute(path)).toBe(true);
  ready(s);
}
describe('frontier operations: objective rules and state boundaries', () => {
  it('isolates progression and rejects legacy replay recording without changing the main rules', () => {
    const s = new FrontierSession();
    expect(s.engine.persistenceEnabled).toBe(false);
    expect(s.engine.world.scenario).toBe('frontier');
    expect(() => new ReplayRecorder(s.engine, s.seed)).toThrow(
      'Activity sessions',
    );
    expect(s.chooseRoute('grove')).toBe(false);
    expect(s.next()).toBe(false);
    expect(s.chooseWeapon('sword')).toBe(true);
    expect(s.setAssisted(true)).toBe(true);
    ready(s);
    expect(s.chooseWeapon('cannon')).toBe(false);
    expect(s.setAssisted(false)).toBe(false);
    expect(s.start()).toBe(false);
    expect(
      s.engine.world.cards.every((id) => CARDS.some((c) => c.id === id)),
    ).toBe(true);
    expect(() => s.step(1 / 30, input)).toThrow('Fixed 60 Hz');
    s.dispose();
  });
  it('requires proximity and uncontested time; activation grants shield exactly once', () => {
    const s = new FrontierSession();
    ready(s);
    if (s.objective.kind !== 'relay') throw Error('relay');
    const node = s.objective.nodes[0],
      w = s.engine.world;
    frame(s, 120);
    expect(node.charge).toBe(0);
    Object.assign(w.player, { x: node.x, y: node.y });
    const foe = w.spawn('hunter', node.x + 45, node.y, false, true);
    foe.speed = 0;
    frame(s, 30, false);
    expect(node.contested).toBe(true);
    expect(node.charge).toBe(0);
    frame(s, 192);
    expect(node.active).toBe(true);
    expect(w.player.shield).toBe(12);
    frame(s, 100);
    expect(w.player.shield).toBe(12);
    expect(s.state).toBe('combat');
    s.dispose();
  });
  it('pauses objectives and clock, permits free capture order and settles the first stage once', () => {
    const s = new FrontierSession();
    ready(s);
    if (s.objective.kind !== 'relay') throw Error('relay');
    Object.assign(s.engine.world.player, s.objective.nodes[2]);
    s.engine.pause();
    frame(s, 120);
    expect(s.ticks).toBe(0);
    expect(s.objective.nodes[2].charge).toBe(0);
    s.engine.pause();
    for (const node of [...s.objective.nodes].reverse()) {
      Object.assign(s.engine.world.player, node);
      frame(s, 193);
    }
    expect(s.state).toBe('route');
    expect(s.results).toHaveLength(1);
    frame(s, 100);
    expect(s.results).toHaveLength(1);
    expect(s.results[0].objectives).toBe(3);
    expect(s.chooseRoute('grove')).toBe(true);
    expect(s.chooseRoute('foundry')).toBe(false);
    expect(s.engine.world.cards).toContain('shift-stride');
    expect(s.engine.world.forms).toContain('sword');
    s.dispose();
  });
  it('carries only one relic, applies a non-stacking speed penalty and requires a clear extraction bay', () => {
    const s = new FrontierSession();
    route(s, 'grove');
    if (s.objective.kind !== 'salvage') throw Error('salvage');
    const o = s.objective,
      w = s.engine.world,
      speed = w.stats.speed;
    Object.assign(w.player, o.relics[0]);
    frame(s);
    expect(o.cargo).toBe(0);
    Object.assign(w.player, o.relics[1]);
    frame(s);
    expect(o.cargo).toBe(0);
    Object.assign(w.player, { x: 625, y: 300, vx: 0, vy: 0 });
    frame(s, 60, true, { ...input, y: -1 });
    expect(w.stats.speed).toBe(speed);
    expect(Math.abs(w.player.vy)).toBeCloseTo(
      speed * FRONTIER_RULES.cargoSpeed,
      3,
    );
    Object.assign(w.player, { ...o.base, vx: 0, vy: 0 });
    const enemy = w.spawn('hunter', o.base.x + 55, o.base.y, false, true);
    enemy.speed = 0;
    frame(s, 5, false);
    expect(o.delivered).toBe(0);
    expect(o.contested).toBe(true);
    frame(s);
    expect(o.delivered).toBe(1);
    expect(o.cargo).toBeNull();
    for (let i = 1; i < 3; i++) {
      Object.assign(w.player, o.relics[i]);
      frame(s);
      Object.assign(w.player, o.base);
      frame(s);
    }
    expect(s.state).toBe('interlude');
    expect(s.results[1].objectives).toBe(3);
    expect(w.stats.speed).toBe(speed);
    s.dispose();
  });
  it('halts escort when abandoned or contested and advances all connected rail segments', () => {
    const s = new FrontierSession();
    route(s, 'foundry');
    if (s.objective.kind !== 'escort') throw Error('escort');
    const o = s.objective,
      w = s.engine.world;
    Object.assign(w.player, { x: 1040, y: 500 });
    frame(s, 30);
    expect(o.travelled).toBe(0);
    expect(o.moving).toBe(false);
    Object.assign(w.player, o.cart);
    const enemy = w.spawn('hunter', o.cart.x + 55, o.cart.y, false, true);
    enemy.speed = 0;
    frame(s, 30, false);
    expect(o.travelled).toBe(0);
    expect(o.contested).toBe(true);
    for (let i = 0; i < 1200 && s.state === 'combat'; i++) {
      Object.assign(w.player, o.cart, { vx: 0, vy: 0 });
      frame(s);
    }
    expect(s.state).toBe('interlude');
    expect(o.cart).toEqual(o.path[o.path.length - 1]);
    expect(o.travelled).toBeCloseTo(o.total, 8);
    expect(s.results[1].objectives).toBe(100);
    expect(w.cards).toContain('fire-fuel');
    expect(w.forms).toContain('cannon');
    s.dispose();
  });
  it('uses optional boss suppression nodes, real damage, inherited loadout and final settlement', () => {
    const s = new FrontierSession();
    route(s, 'foundry');
    if (s.objective.kind !== 'escort') throw Error('escort');
    for (let i = 0; i < 1200 && s.state === 'combat'; i++) {
      Object.assign(s.engine.world.player, s.objective.cart);
      frame(s);
    }
    const cards = [...s.engine.world.cards];
    expect(s.next()).toBe(true);
    expect(s.next()).toBe(false);
    expect(s.start()).toBe(true);
    const w = s.engine.world;
    expect(w.phase).toBe('bossIntro');
    expect(w.boss?.kind).toBe('forgemaster');
    expect(w.cards).toEqual(cards);
    const objective = s.objective as FrontierObjective;
    if (objective.kind !== 'boss') throw Error('boss');
    const boss = w.boss!;
    boss.speed = 0;
    boss.timer = 1000;
    w.phase = 'playing';
    Object.assign(w.player, objective.nodes[0]);
    frame(s, 192, false);
    expect(objective.nodes[0].active).toBe(true);
    expect(boss.hp).toBeCloseTo(boss.maxHp * 0.82, 8);
    const damaged = boss.hp;
    frame(s, 50, false);
    expect(boss.hp).toBe(damaged);
    hitEnemy(w, boss, 1e5, false);
    frame(s, 1, false);
    expect(s.state).toBe('finished');
    expect(w.phase).toBe('victory');
    expect(s.results).toHaveLength(3);
    expect(s.results[2].kills).toBe(1);
    expect(s.export()).toMatchObject({
      rulesVersion: '2.3-frontier.1',
      route: 'foundry',
      assisted: false,
      state: 'finished',
    });
    frame(s, 20);
    expect(s.results).toHaveLength(3);
    s.dispose();
  });
  it('fails on death and timeout without completing objectives', () => {
    const dead = new FrontierSession();
    ready(dead);
    dead.engine.world.player.hp = 0;
    frame(dead);
    expect(dead.state).toBe('failed');
    expect(dead.results[0].outcome).toBe('defeated');
    const timeout = new FrontierSession();
    ready(timeout);
    timeout.ticks = timeout.limit * 60 - 1;
    frame(timeout);
    expect(timeout.state).toBe('failed');
    expect(timeout.results[0].outcome).toBe('timeout');
    dead.dispose();
    timeout.dispose();
  });
  it('keeps every objective reachable through walkable map space', () => {
    for (const path of ['grove', 'foundry'] as const) {
      const s = new FrontierSession();
      route(s, path);
      const w = s.engine.world,
        o = s.objective;
      const targets =
        o.kind === 'salvage'
          ? [o.base, ...o.relics]
          : o.kind === 'escort'
            ? o.path
            : [];
      for (const point of targets)
        expect(blocked(point.x, point.y, 20, w.terrain.blocks)).toBe(false);
      // Flood-fill the actual collision grid, then verify each interaction point connects to deployment.
      const step = 10,
        pending = [{ x: 640, y: 500 }],
        seen = new Set<string>();
      while (pending.length) {
        const p = pending.pop()!,
          key = `${p.x}:${p.y}`;
        if (
          seen.has(key) ||
          p.x < 100 ||
          p.x > 1180 ||
          p.y < 120 ||
          p.y > 610 ||
          blocked(p.x, p.y, 13, w.terrain.blocks)
        )
          continue;
        seen.add(key);
        pending.push(
          { x: p.x + step, y: p.y },
          { x: p.x - step, y: p.y },
          { x: p.x, y: p.y + step },
          { x: p.x, y: p.y - step },
        );
      }
      for (const p of targets)
        expect(
          seen.has(
            `${Math.round(p.x / step) * step}:${Math.round(p.y / step) * step}`,
          ),
        ).toBe(true);
      s.dispose();
    }
  });
});
