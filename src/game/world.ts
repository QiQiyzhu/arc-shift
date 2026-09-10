import { EventBus, type EffectEvent } from '../core/events';
import { Pool } from '../core/pool';
import { Random } from '../core/math';
import { baseStats } from '../combat/rules';
import { ENEMIES } from '../data/enemies';
import { makeRoom } from '../rooms/generator';
import { terrainFor, safePosition } from '../rooms/terrain';
import { isBoss } from '../progression/catalog';
import { newQueryMetrics } from '../core/metrics';
import { UniformGrid } from '../core/spatial-grid';
import {
  emptyPreparation,
  startingWallet,
  type Wallet,
} from '../economy/catalog';
import type { WeaponId } from './types';
import type {
  Enemy,
  EnemyKind,
  Hazard,
  Phase,
  Player,
  Projectile,
  Room,
  Stats,
  Upgrade,
} from './types';
export class World {
  queries = newQueryMetrics();
  collisionMode: 'grid' | 'brute' = 'grid';
  spatial = new UniformGrid<Enemy>();
  campaign: 'legacy' | 'pilgrimage' = 'legacy';
  route: string[] = [];
  forms: WeaponId[] = [];
  relics: string[] = [];
  supportCd = { arc: 0, sword: 0, cannon: 0 };
  terrain = terrainFor(makeRoom(1, 'combat', 7));
  terrainTick = 0;
  fieldBuff = false;
  eventDone = false;
  challengeTime = 0;
  encountered = new Set<EnemyKind>();
  weapon: WeaponId = 'arc';
  preparation = emptyPreparation();
  wallet = startingWallet();
  pickups: {
    x: number;
    y: number;
    kind: keyof Wallet;
    amount: number;
    age: number;
  }[] = [];
  campUsed: string[] = [];
  rerolls = 0;
  campMessage = '';
  banked = 0;
  roomCoinDrops = 0;
  settlement = 0;
  bombCd = 0;
  bombs: { x: number; y: number; time: number }[] = [];
  swing: {
    x: number;
    y: number;
    angle: number;
    age: number;
    range: number;
    arc: number;
    damage: number;
    combo: number;
    hits: Set<number>;
    fragmented: boolean;
  } | null = null;
  combo = 0;
  comboTime = 0;
  phase: Phase = 'menu';
  bus = new EventBus<EffectEvent>();
  rng = new Random(7);
  seed = 7;
  elapsed = 0;
  roomTime = 0;
  kills = 0;
  xp = 0;
  level = 1;
  totalDamage = 0;
  damageTaken = 0;
  wave = 0;
  spawnTimer = 1.5;
  clearTimer = 0;
  transitionTimer = 0;
  reactionBudget = 12;
  reactionCount = 0;
  companionCd = 0;
  echo = { x: 0, y: 0, time: 0, shots: 0 };
  player: Player = {
    x: 640,
    y: 410,
    vx: 0,
    vy: 0,
    angle: 0,
    hp: 120,
    maxHp: 120,
    shield: 0,
    invulnerable: 0,
    dashTime: 0,
    dashCd: 0,
    qCd: 0,
    eCd: 0,
    shotCd: 0,
  };
  stats: Stats = baseStats();
  room: Room = makeRoom(1, 'combat', 7);
  enemies: Enemy[] = [];
  hazards: Hazard[] = [];
  cards: string[] = [];
  rewards: Upgrade[] = [];
  rewardContext: 'start' | 'clear' = 'clear';
  projectiles = new Pool<Projectile>(420, () => ({
    active: false,
    x: 0,
    y: 0,
    oldX: 0,
    oldY: 0,
    vx: 0,
    vy: 0,
    radius: 4,
    life: 0,
    damage: 0,
    enemy: false,
    color: 0x89eee2,
    pierce: 0,
    bounce: 0,
    hits: new Set(),
    age: 0,
    initialLife: 0,
    angle: 0,
    speed: 0,
    generation: 0,
    wave: 0,
    orbit: false,
    returning: false,
    bounced: false,
    returningStarted: false,
    shape: 'bolt',
    accent: 0xe3fffa,
    blastRadius: 0,
    fragment: 0,
  }));
  nextId = 0;
  has(id: string) {
    return this.cards.includes(id);
  }
  emit(
    kind: EffectEvent['kind'],
    x: number,
    y: number,
    color = 0x8cf1dc,
    amount?: number,
  ) {
    this.bus.emit({ kind, x, y, color, amount });
  }
  spawn(
    kind: EnemyKind,
    x: number,
    y: number,
    elite = false,
    summoned = false,
  ) {
    const d = ENEMIES[kind];
    const boss = isBoss(kind);
    const mult = boss ? 1 : 1 + (this.room.index - 1) * 0.15;
    const hp = d.hp * mult * (elite ? 1.65 : 1);
    const e: Enemy = {
      id: this.nextId++,
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      hp,
      maxHp: hp,
      radius: d.radius * (elite ? 1.18 : 1),
      speed: d.speed,
      damage: d.damage * (elite ? 1.3 : 1),
      state: 'idle',
      timer: 1,
      age: 0,
      aimX: x,
      aimY: y,
      flash: 0,
      slow: 0,
      burn: 0,
      burnTick: 0,
      phase: 1,
      attackIndex: 0,
      elite,
      summoned,
      reactionCd: 0,
      shield: 0,
    };
    if (this.campaign === 'pilgrimage') {
      Object.assign(e, safePosition(this, x, y, e.radius));
      if (this.room.modifier === 'haste') e.speed *= 1.2;
      if (this.room.modifier === 'thorns') e.shield = 18;
      if (this.room.modifier === 'fervor') e.damage *= 1.15;
    }
    this.encountered.add(kind);
    this.enemies.push(e);
    this.emit('room', x, y, d.color);
    return e;
  }
  get boss() {
    return this.enemies.find((e) => isBoss(e.kind));
  }
}
