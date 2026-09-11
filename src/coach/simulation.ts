import { Engine } from '../game/engine';
import { blankSave } from '../core/save';
import { deriveStats } from '../cards/system';
import { activeSynergies } from '../cards/synergies';
import { Random } from '../core/math';
import { validateContent, type ContentPack } from '../content/schema';
import type { WeaponId } from '../game/types';
import { RELICS } from '../progression/catalog';
import { GOALS, validateCards, type Goal } from './knowledge';
import { GAME_VERSION } from '../replay/replay';

export const SCENARIO_VERSION = 'coach-range-2';
export const SEEDS = [73129, 41717, 90311] as const;
export const TICKS = 720;
export interface BuildSnapshot {
  cards: string[];
  relics: string[];
  forms: WeaponId[];
  weapon: WeaponId;
  level: number;
  content: ContentPack;
  offered: string[];
  source: 'current' | 'checkpoint' | 'camp';
}
export interface Candidate {
  id: string;
  label: string;
  cards: string[];
  nextCard?: string;
}
export interface Sample {
  seed: number;
  scene: 'single' | 'swarm';
  damage: number;
  dps: number;
  reactions: number;
  ticks: number;
  poolMisses: number;
  casts: { pulse: number; well: number; dash: number };
}
export interface Measurement {
  candidate: Candidate;
  samples: Sample[];
  single: number;
  swarm: number;
  dash: number;
  speed: number;
  maxHpBonus: number;
  synergies: string[];
}
export interface Analysis {
  gameVersion: string;
  version: string;
  seeds: readonly number[];
  ticks: number;
  baseline: Measurement;
  rows: Measurement[];
}
export function captureBuild(e: Engine): BuildSnapshot {
  const w = e.world,
    c = w.phase === 'menu' ? e.save.checkpoint : null;
  const camp = w.phase === 'menu' && !c;
  const weapon = camp ? e.save.meta.weapon : c?.weapon || w.weapon;
  return {
    cards: [...(camp ? [] : c?.cards || w.cards)],
    relics: [
      ...(camp
        ? e.save.meta.equipped
          ? [e.save.meta.equipped]
          : []
        : c?.relics || w.relics),
    ],
    forms: [...(camp ? [weapon] : c?.forms || w.forms)],
    weapon,
    level: camp ? 4 : c?.level || w.level,
    content: structuredClone(e.content),
    offered: w.phase === 'reward' ? w.rewards.map((r) => r.id) : [],
    source: camp ? 'camp' : c ? 'checkpoint' : 'current',
  };
}
export const snapshotKey = (b: BuildSnapshot) => JSON.stringify(b);
function validateBuild(b: BuildSnapshot) {
  const weapons = ['arc', 'sword', 'cannon'];
  if (
    !validateContent(b.content).ok ||
    !validateCards(b.cards, b.content) ||
    !Number.isInteger(b.level) ||
    b.level < 1 ||
    b.level > 100 ||
    !weapons.includes(b.weapon) ||
    !Array.isArray(b.forms) ||
    !b.forms.includes(b.weapon) ||
    new Set(b.forms).size !== b.forms.length ||
    b.forms.some((id) => !weapons.includes(id)) ||
    !Array.isArray(b.relics) ||
    new Set(b.relics).size !== b.relics.length ||
    b.relics.some((id) => !RELICS.some((r) => r.id === id)) ||
    !Array.isArray(b.offered) ||
    b.offered.length > 3 ||
    new Set(b.offered).size !== b.offered.length ||
    b.offered.some((id) => !validateCards([...b.cards, id], b.content))
  )
    throw Error('Unsupported build snapshot');
}
export function measure(b: BuildSnapshot, candidate: Candidate): Measurement {
  validateBuild(b);
  if (
    !validateCards(candidate.cards, b.content) ||
    (candidate.nextCard !== undefined &&
      (!b.offered.includes(candidate.nextCard) ||
        JSON.stringify(candidate.cards) !==
          JSON.stringify([...b.cards, candidate.nextCard])))
  )
    throw Error('Unsupported simulation input');
  const samples: Sample[] = [];
  for (const scene of ['single', 'swarm'] as const)
    for (const seed of SEEDS) {
      const e = new Engine({
        save: blankSave(),
        persistence: false,
        content: b.content,
      });
      e.startPractice(candidate.cards, b.weapon);
      const w = e.world;
      w.forms = [...b.forms];
      w.relics = [...b.relics];
      w.level = b.level;
      w.stats = deriveStats(w.cards, w.level, w.relics, w.content);
      w.seed = seed;
      w.rng = new Random(seed);
      w.phase = 'playing';
      w.spawnTimer = 1e9;
      w.wave = 99;
      w.terrain = { ...w.terrain, blocks: [], zones: [] };
      w.enemies = [];
      w.player.x = 640;
      w.player.y = 430;
      const positions =
        scene === 'single'
          ? [[640, 350]]
          : [
              [640, 350],
              [604, 342],
              [676, 342],
              [568, 330],
              [712, 330],
              [592, 304],
              [688, 304],
              [640, 280],
            ];
      const targets = positions.map(([x, y]) => {
        const enemy = w.spawn('sentry', x, y);
        enemy.hp = enemy.maxHp = 1e8;
        enemy.speed = 0;
        enemy.damage = 0;
        return { enemy, x, y };
      });
      const casts = { pulse: 0, well: 0, dash: 0 };
      const unsubscribe = w.bus.on((event) => {
        if (event.kind === 'dash') casts.dash++;
        if (
          event.kind === 'skill' &&
          !event.reaction &&
          event.color === 0x8cf1dc &&
          event.amount === 185
        )
          casts.pulse++;
        if (
          event.kind === 'skill' &&
          !event.reaction &&
          event.color === 0xb7a0ff &&
          event.amount === 50
        )
          casts.well++;
      });
      for (let tick = 0; tick < TICKS; tick++) {
        // Fix targets and their attack timers; real weapons, collision, statuses and reactions still run.
        for (const t of targets) {
          t.enemy.x = t.x;
          t.enemy.y = t.y;
          t.enemy.vx = t.enemy.vy = 0;
          t.enemy.state = 'recover';
          t.enemy.timer = 1e6;
        }
        w.player.x = 640;
        w.player.y = 430;
        e.update(1 / 60, {
          x: 0,
          y: 0,
          aimX: 640,
          aimY: 350,
          fire: true,
          dash: false,
          q: true,
          e: true,
        });
      }
      unsubscribe();
      samples.push({
        seed,
        scene,
        damage: w.totalDamage,
        dps: w.totalDamage / (TICKS / 60),
        reactions: w.reactionCount,
        ticks: w.tick,
        poolMisses: w.projectiles.misses,
        casts,
      });
    }
  const stats = deriveStats(candidate.cards, b.level, b.relics, b.content);
  const mean = (scene: string) =>
    samples
      .filter((s) => s.scene === scene)
      .reduce((sum, s) => sum + s.dps, 0) / SEEDS.length;
  return {
    candidate,
    samples,
    single: mean('single'),
    swarm: mean('swarm'),
    dash: stats.dashCooldown,
    speed: stats.speed,
    maxHpBonus: candidate.cards.includes('ice-shell') ? 40 : 0,
    synergies: activeSynergies(candidate.cards, b.weapon).map((s) => s.id),
  };
}
export function rank(rows: Measurement[], goal: Goal) {
  return [...rows].sort((a, b) =>
    goal === 'mobility'
      ? a.dash - b.dash || b.speed - a.speed || b.single - a.single
      : b[goal] - a[goal],
  );
}
export function analyze(
  b: BuildSnapshot,
  candidates: Candidate[],
  goal: Goal,
  onProgress?: (completed: number, total: number) => void,
): Analysis {
  if (
    !Object.hasOwn(GOALS, goal) ||
    !Array.isArray(candidates) ||
    candidates.length < 1 ||
    candidates.length > 3 ||
    new Set(candidates.map((c) => c.id)).size !== candidates.length ||
    candidates.some(
      (c) => !/^[a-z0-9-]{1,40}$/.test(c.id) || c.id === 'baseline',
    )
  )
    throw Error('Invalid goal or candidate set');
  const baseline = measure(b, {
    id: 'baseline',
    label: '当前构筑',
    cards: b.cards,
  });
  onProgress?.(1, candidates.length + 1);
  const rows = candidates.map((c, i) => {
    const result = measure(b, c);
    onProgress?.(i + 2, candidates.length + 1);
    return result;
  });
  return {
    gameVersion: GAME_VERSION,
    version: SCENARIO_VERSION,
    seeds: SEEDS,
    ticks: TICKS,
    baseline,
    rows: rank(rows, goal),
  };
}
