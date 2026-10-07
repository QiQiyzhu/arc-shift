import { Engine } from '../game/engine';
import { blankSave } from '../core/save';
import { deriveStats } from '../cards/system';
import { makeRoom } from '../rooms/generator';
import { hitEnemy } from '../combat/damage';
import type { Biome, EnemyKind, Input, WeaponId } from '../game/types';
import type { Block, Zone } from '../rooms/terrain';

export type FrontierRoute = 'grove' | 'foundry';
export type FrontierMission = 'relay' | 'salvage' | 'escort' | 'boss';
export interface Point {
  x: number;
  y: number;
}
export interface ControlNode extends Point {
  charge: number;
  active: boolean;
  contested: boolean;
}
export type FrontierObjective =
  | { kind: 'relay'; nodes: ControlNode[] }
  | { kind: 'boss'; nodes: ControlNode[] }
  | {
      kind: 'salvage';
      relics: (Point & { delivered: boolean })[];
      base: Point;
      cargo: number | null;
      delivered: number;
      contested: boolean;
    }
  | {
      kind: 'escort';
      cart: Point;
      path: Point[];
      waypoint: number;
      travelled: number;
      total: number;
      moving: boolean;
      contested: boolean;
    };
export interface FrontierResult {
  mission: FrontierMission;
  outcome: 'clear' | 'defeated' | 'timeout';
  seconds: number;
  kills: number;
  damage: number;
  damageTaken: number;
  hp: number;
  objectives: number;
}
export const FRONTIER_RULES = {
  version: '2.3-frontier.1',
  captureRadius: 78,
  captureSeconds: 3.2,
  contestRadius: 92,
  relicRadius: 35,
  depositRadius: 68,
  cargoSpeed: 0.72,
  escortRadius: 124,
  escortSpeed: 64,
  limits: { relay: 120, salvage: 150, escort: 150, boss: 150 },
} as const;
export const FRONTIER_LOADOUTS: Record<WeaponId, string[]> = {
  arc: ['storm-arc', 'storm-surge', 'ice-touch'],
  sword: ['fire-ember', 'shift-quick', 'ice-touch'],
  cannon: ['fire-meteor', 'fire-blast', 'shift-quick'],
};
const nodes = (points: Point[]): ControlNode[] =>
  points.map((p) => ({
    ...p,
    charge: 0,
    active: false,
    contested: false,
  }));
const near = (a: Point, b: Point, radius: number) =>
  Math.hypot(a.x - b.x, a.y - b.y) < radius;

/** An isolated objective director. Every hit, enemy and input still uses Engine. */
export class FrontierSession {
  readonly engine: Engine;
  state: 'briefing' | 'combat' | 'route' | 'interlude' | 'finished' | 'failed' =
    'briefing';
  stage = 0;
  route: FrontierRoute | null = null;
  objective: FrontierObjective = { kind: 'relay', nodes: [] };
  results: FrontierResult[] = [];
  assisted = false;
  ticks = 0;
  kills = 0;
  private spawnClock = 0;
  private off?: () => void;
  private counters = { damage: 0, damageTaken: 0 };
  constructor(readonly seed = 230923) {
    this.engine = new Engine({ save: blankSave(), persistence: false });
    this.engine.start(seed);
    const w = this.engine.world;
    w.scenario = 'frontier';
    w.weapon = 'arc';
    w.level = 4;
    w.forms = ['arc'];
    w.player.hp = w.player.maxHp = 180;
    w.wallet = { coins: 0, shards: 0, keys: 0, bombs: 2, tonics: 2 };
    w.cards = [...FRONTIER_LOADOUTS.arc];
    w.stats = deriveStats(w.cards, w.level, [], w.content);
    w.phase = 'menu';
    this.activate();
  }
  activate() {
    if (!this.off)
      this.off = this.engine.world.bus.on((event) => {
        if (this.state === 'combat' && event.kind === 'kill') this.kills++;
      });
  }
  get mission(): FrontierMission {
    return this.stage === 0
      ? 'relay'
      : this.stage === 2
        ? 'boss'
        : this.route === 'grove'
          ? 'salvage'
          : 'escort';
  }
  get biome(): Biome {
    return this.stage === 0 ? 'sanctum' : (this.route ?? 'grove');
  }
  get seconds() {
    return this.ticks / 60;
  }
  get limit() {
    return FRONTIER_RULES.limits[this.mission];
  }
  get progress() {
    const o = this.objective;
    if (o.kind === 'relay') return o.nodes.filter((n) => n.active).length / 3;
    if (o.kind === 'salvage') return o.delivered / 3;
    if (o.kind === 'escort') return o.travelled / o.total;
    const boss = this.engine.world.boss;
    return boss
      ? Math.max(0, Math.min(1, 1 - boss.hp / boss.maxHp))
      : this.state === 'finished'
        ? 1
        : 0;
  }
  chooseWeapon(weapon: WeaponId) {
    if (
      this.state !== 'briefing' ||
      this.stage !== 0 ||
      !FRONTIER_LOADOUTS[weapon]
    )
      return false;
    const w = this.engine.world;
    w.weapon = weapon;
    w.forms = [weapon];
    w.cards = [...FRONTIER_LOADOUTS[weapon]];
    w.stats = deriveStats(w.cards, w.level, [], w.content);
    return true;
  }
  setAssisted(value: boolean) {
    if (this.state !== 'briefing' || this.stage !== 0) return false;
    this.assisted = value;
    this.engine.practice = value;
    return true;
  }
  chooseRoute(route: FrontierRoute) {
    if (
      this.state !== 'route' ||
      this.route ||
      !['grove', 'foundry'].includes(route)
    )
      return false;
    this.route = route;
    const w = this.engine.world;
    const rewards =
      route === 'grove'
        ? ['ice-pierce', 'shift-stride']
        : ['fire-ember', 'fire-fuel'];
    w.cards = [...new Set([...w.cards, ...rewards])];
    const form = route === 'grove' ? 'sword' : 'cannon';
    if (!w.forms.includes(form)) w.forms.push(form);
    w.stats = deriveStats(w.cards, w.level, [], w.content);
    w.player.hp = Math.min(w.player.maxHp, w.player.hp + 35);
    w.wallet.tonics = Math.min(3, w.wallet.tonics + 1);
    this.stage = 1;
    this.state = 'briefing';
    return true;
  }
  next() {
    if (this.state !== 'interlude' || this.stage !== 1) return false;
    const w = this.engine.world;
    this.stage = 2;
    this.state = 'briefing';
    w.player.hp = Math.min(w.player.maxHp, w.player.hp + 35);
    w.wallet.bombs = Math.min(3, w.wallet.bombs + 1);
    return true;
  }
  start() {
    if (this.state !== 'briefing') return false;
    const w = this.engine.world,
      mission = this.mission;
    this.engine.enter({
      ...makeRoom(this.stage + 1, 'combat', this.seed),
      nodeId: `frontier-${mission}`,
      name: mission,
      subtitle: 'FRONTIER OPERATIONS',
      biome: this.biome,
      template: this.stage,
    });
    w.spawnTimer = 1e9;
    w.wave = 0;
    w.enemies = [];
    w.terrain = this.terrain();
    w.stats = deriveStats(w.cards, w.level, [], w.content);
    this.objective = this.createObjective();
    Object.assign(
      w.player,
      mission === 'salvage'
        ? { x: 225, y: 490 }
        : mission === 'escort'
          ? { x: 250, y: 490 }
          : { x: 640, y: 495 },
    );
    this.ticks = this.kills = 0;
    this.spawnClock = 6;
    this.counters = { damage: w.totalDamage, damageTaken: w.damageTaken };
    this.state = 'combat';
    if (mission === 'boss') {
      const boss = w.spawn(
        this.route === 'grove' ? 'matron' : 'forgemaster',
        640,
        270,
        false,
        true,
      );
      boss.hp = boss.maxHp = 2350;
      w.phase = 'bossIntro';
      w.transitionTimer = 2.4;
    } else this.spawnPatrol(true);
    return true;
  }
  private createObjective(): FrontierObjective {
    if (this.mission === 'relay')
      return {
        kind: 'relay',
        nodes: nodes([
          { x: 300, y: 250 },
          { x: 640, y: 430 },
          { x: 990, y: 255 },
        ]),
      };
    if (this.mission === 'boss')
      return {
        kind: 'boss',
        nodes: nodes([
          { x: 255, y: 480 },
          { x: 1025, y: 480 },
        ]),
      };
    if (this.mission === 'salvage')
      return {
        kind: 'salvage',
        relics: [
          { x: 315, y: 210 },
          { x: 1000, y: 230 },
          { x: 975, y: 545 },
        ].map((p) => ({ ...p, delivered: false })),
        base: { x: 225, y: 495 },
        cargo: null,
        delivered: 0,
        contested: false,
      };
    const path = [
      { x: 250, y: 490 },
      { x: 535, y: 490 },
      { x: 535, y: 235 },
      { x: 1010, y: 235 },
    ];
    return {
      kind: 'escort',
      cart: { ...path[0] },
      path,
      waypoint: 1,
      travelled: 0,
      total: path
        .slice(1)
        .reduce(
          (sum, p, i) => sum + Math.hypot(p.x - path[i].x, p.y - path[i].y),
          0,
        ),
      moving: false,
      contested: false,
    };
  }
  private terrain(): { blocks: Block[]; zones: Zone[] } {
    const corners = [
      { x: 76, y: 100, w: 125, h: 55 },
      { x: 1080, y: 577, w: 124, h: 55 },
    ];
    if (this.mission === 'relay')
      return {
        blocks: [
          ...corners,
          { x: 410, y: 225, w: 90, h: 155 },
          { x: 780, y: 225, w: 90, h: 155 },
        ],
        zones: [{ x: 640, y: 250, r: 45, kind: 'blessing' }],
      };
    if (this.mission === 'salvage')
      return {
        blocks: [
          ...corners,
          { x: 400, y: 270, w: 95, h: 170 },
          { x: 690, y: 345, w: 195, h: 75 },
        ],
        zones: [
          { x: 620, y: 205, r: 48, kind: 'spikes' },
          { x: 640, y: 530, r: 45, kind: 'blessing' },
        ],
      };
    if (this.mission === 'escort')
      return {
        blocks: [
          ...corners,
          { x: 315, y: 260, w: 110, h: 115 },
          { x: 695, y: 375, w: 125, h: 120 },
        ],
        zones: [
          { x: 900, y: 475, r: 55, kind: 'furnace' },
          { x: 620, y: 570, r: 40, kind: 'blessing' },
        ],
      };
    return {
      blocks: corners,
      zones: [
        {
          x: 640,
          y: 475,
          r: 60,
          kind: this.route === 'grove' ? 'spikes' : 'furnace',
        },
      ],
    };
  }
  private contested(point: Point) {
    return this.engine.world.enemies.some(
      (e) => e.hp > 0 && near(e, point, FRONTIER_RULES.contestRadius),
    );
  }
  private spawnPatrol(initial = false) {
    const w = this.engine.world;
    if (w.enemies.filter((e) => e.hp > 0).length >= 9) return;
    const pool: EnemyKind[] =
      this.mission === 'relay'
        ? ['hunter', 'sentry', 'lancer']
        : this.mission === 'salvage'
          ? ['hunter', 'cantor', 'shade']
          : ['hunter', 'bomber', 'sentry'];
    const points = [
      { x: 185, y: 230 },
      { x: 1090, y: 260 },
      { x: 650, y: 160 },
      { x: 1000, y: 550 },
    ];
    const count = initial ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const candidates = points.filter((p) => !near(p, w.player, 200));
      const p = w.rng.pick(candidates.length ? candidates : points);
      const enemy = w.spawn(w.rng.pick(pool), p.x, p.y, false, true);
      enemy.hp = enemy.maxHp = enemy.maxHp * 0.8;
    }
  }
  step(dt: number, input: Input) {
    if (this.state !== 'combat') return;
    if (!Number.isFinite(dt) || Math.abs(dt - 1 / 60) > 1e-10)
      throw Error('Fixed 60 Hz required');
    const w = this.engine.world,
      playing = w.phase === 'playing';
    const carrying =
      this.objective.kind === 'salvage' && this.objective.cargo !== null;
    // Scale only during this simulation step, so pausing, death and restarting cannot stack the penalty.
    const speed = w.stats.speed;
    if (carrying) w.stats.speed *= FRONTIER_RULES.cargoSpeed;
    this.engine.update(dt, input);
    w.stats.speed = speed;
    if (!playing) return;
    this.ticks++;
    if (w.player.hp <= 0 || w.phase === 'gameover') {
      this.settle('defeated');
      return;
    }
    this.updateObjective(dt);
    if (this.state !== 'combat') return;
    if (this.mission === 'boss') {
      if (!w.boss || w.boss.hp <= 0) this.settle('clear');
    } else {
      this.spawnClock -= dt;
      if (this.spawnClock <= 0) {
        this.spawnPatrol();
        this.spawnClock = 8;
      }
    }
    if (this.state === 'combat' && this.seconds >= this.limit)
      this.settle('timeout');
  }
  private updateObjective(dt: number) {
    const o = this.objective,
      w = this.engine.world,
      p = w.player;
    if (o.kind === 'relay' || o.kind === 'boss') {
      for (const node of o.nodes) {
        node.contested = !node.active && this.contested(node);
        if (
          node.active ||
          node.contested ||
          !near(node, p, FRONTIER_RULES.captureRadius)
        )
          continue;
        node.charge = Math.min(FRONTIER_RULES.captureSeconds, node.charge + dt);
        if (node.charge + 1e-9 >= FRONTIER_RULES.captureSeconds) {
          node.active = true;
          w.player.shield = Math.min(40, w.player.shield + 12);
          w.emit('skill', node.x, node.y, 0x9de7d1, 130);
          if (o.kind === 'boss' && w.boss)
            hitEnemy(w, w.boss, w.boss.maxHp * 0.18, false);
        }
      }
      if (o.kind === 'relay' && o.nodes.every((n) => n.active))
        this.settle('clear');
    } else if (o.kind === 'salvage') {
      o.contested = this.contested(o.base);
      if (o.cargo === null) {
        const i = o.relics.findIndex(
          (relic) =>
            !relic.delivered && near(relic, p, FRONTIER_RULES.relicRadius),
        );
        if (i >= 0) {
          o.cargo = i;
          w.emit('reward', p.x, p.y, 0xa7dcea);
        }
      } else if (
        near(o.base, p, FRONTIER_RULES.depositRadius) &&
        !o.contested
      ) {
        o.relics[o.cargo].delivered = true;
        o.cargo = null;
        o.delivered++;
        p.hp = Math.min(p.maxHp, p.hp + 12);
        w.emit('skill', o.base.x, o.base.y, 0xa7dcea, 105);
        if (o.delivered === o.relics.length) this.settle('clear');
      }
    } else {
      o.contested = this.contested(o.cart);
      o.moving = near(o.cart, p, FRONTIER_RULES.escortRadius) && !o.contested;
      if (!o.moving || o.waypoint >= o.path.length) return;
      const target = o.path[o.waypoint],
        dx = target.x - o.cart.x,
        dy = target.y - o.cart.y;
      const distance = Math.hypot(dx, dy),
        step = Math.min(distance, FRONTIER_RULES.escortSpeed * dt);
      if (distance > 0) {
        o.cart.x += (dx / distance) * step;
        o.cart.y += (dy / distance) * step;
      }
      o.travelled = Math.min(o.total, o.travelled + step);
      if (distance - step < 1e-8) o.waypoint++;
      if (o.waypoint >= o.path.length) this.settle('clear');
    }
  }
  private settle(outcome: FrontierResult['outcome']) {
    if (this.state !== 'combat') return;
    const w = this.engine.world,
      o = this.objective;
    this.results.push({
      mission: this.mission,
      outcome,
      seconds: this.seconds,
      kills: this.kills,
      damage: w.totalDamage - this.counters.damage,
      damageTaken: w.damageTaken - this.counters.damageTaken,
      hp: Math.max(0, w.player.hp),
      objectives:
        o.kind === 'relay' || o.kind === 'boss'
          ? o.nodes.filter((n) => n.active).length
          : o.kind === 'salvage'
            ? o.delivered
            : Math.floor(this.progress * 100),
    });
    this.state =
      outcome !== 'clear'
        ? 'failed'
        : this.stage === 0
          ? 'route'
          : this.stage === 1
            ? 'interlude'
            : 'finished';
    w.phase =
      outcome !== 'clear'
        ? 'gameover'
        : this.stage === 0
          ? 'map'
          : this.stage === 1
            ? 'reward'
            : 'victory';
    w.projectiles.clear();
    w.hazards = [];
    w.bombs = [];
    w.swing = null;
    w.emit(
      outcome === 'clear' ? (this.stage === 2 ? 'victory' : 'reward') : 'hurt',
      w.player.x,
      w.player.y,
      0xa5e8d3,
    );
  }
  export() {
    return {
      kind: 'frontier-results',
      rulesVersion: FRONTIER_RULES.version,
      seed: this.seed,
      assisted: this.assisted,
      weapon: this.engine.world.weapon,
      route: this.route,
      cards: [...this.engine.world.cards],
      forms: [...this.engine.world.forms],
      results: structuredClone(this.results),
      state: this.state,
    };
  }
  dispose() {
    this.off?.();
    this.off = undefined;
  }
}
