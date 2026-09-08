import { EventBus, type EffectEvent } from '../core/events';
import { Pool } from '../core/pool';
import { Random } from '../core/math';
import { baseStats } from '../combat/rules';
import { ENEMIES } from '../data/enemies';
import { makeRoom } from '../rooms/generator';
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
  spawn(kind: EnemyKind, x: number, y: number, elite = false) {
    const d = ENEMIES[kind];
    const boss = kind === 'warden' || kind === 'oracle';
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
    };
    this.enemies.push(e);
    this.emit('room', x, y, d.color);
    return e;
  }
  get boss() {
    return this.enemies.find((e) => e.kind === 'warden' || e.kind === 'oracle');
  }
}
