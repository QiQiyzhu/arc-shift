export type Phase =
  | 'menu'
  | 'playing'
  | 'paused'
  | 'reward'
  | 'map'
  | 'transition'
  | 'bossIntro'
  | 'victory'
  | 'gameover';
export type Element = 'fire' | 'storm' | 'frost' | 'void' | 'shift';
export type EnemyKind =
  | 'hunter'
  | 'sentry'
  | 'lancer'
  | 'weaver'
  | 'conduit'
  | 'warden'
  | 'oracle';
export type AIState =
  | 'idle'
  | 'chase'
  | 'telegraph'
  | 'attack'
  | 'cooldown'
  | 'recover'
  | 'dead';
export type RoomKind = 'combat' | 'elite' | 'heal' | 'treasure' | 'boss';
export interface Input {
  x: number;
  y: number;
  aimX: number;
  aimY: number;
  fire: boolean;
  dash: boolean;
  q: boolean;
  e: boolean;
}
export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
  maxHp: number;
  shield: number;
  invulnerable: number;
  dashTime: number;
  dashCd: number;
  qCd: number;
  eCd: number;
  shotCd: number;
}
export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  radius: number;
  speed: number;
  damage: number;
  state: AIState;
  timer: number;
  age: number;
  aimX: number;
  aimY: number;
  flash: number;
  slow: number;
  burn: number;
  burnTick: number;
  phase: number;
  attackIndex: number;
  elite: boolean;
}
export interface Projectile {
  active: boolean;
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  damage: number;
  enemy: boolean;
  color: number;
  pierce: number;
  bounce: number;
  hits: Set<number>;
}
export interface Hazard {
  x: number;
  y: number;
  r: number;
  time: number;
  duration: number;
  damage: number;
  type: 'blast' | 'fire' | 'well';
  friendly: boolean;
  tick: number;
}
export interface Room {
  index: number;
  kind: RoomKind;
  name: string;
  subtitle: string;
  template: number;
  seed: number;
}
export interface Stats {
  damage: number;
  rate: number;
  speed: number;
  crit: number;
  critPower: number;
  dashCooldown: number;
  dashDuration: number;
  qCooldown: number;
  eCooldown: number;
  projectiles: number;
  pierce: number;
  bounce: number;
  burn: number;
  chain: number;
  slow: number;
  explosion: number;
  homing: number;
  lifesteal: number;
}
export interface Upgrade {
  id: string;
  name: string;
  en: string;
  description: string;
  preview: string;
  rarity: 'common' | 'rare' | 'epic';
  element: Element;
  icon: string;
}
