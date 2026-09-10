import { Engine } from '../game/engine';
import { World } from '../game/world';
import { blankSave, parseSave, type SaveData } from '../core/save';
import type { GameCommand, SimulationObserver } from '../core/replay-contract';
import type { Input } from '../game/types';
import { DEFAULT_CONTENT, contentDiff } from '../content/schema';

export const REPLAY_VERSION = 1;
export const GAME_VERSION = '1.0-engineering.1';
export const CONTENT_VERSION = 'builtin-2026-09-10-tuning1';
export const FIXED_DT = 1 / 60;
export const MAX_REPLAY_TICKS = 108000;
export const MAX_REPLAY_BYTES = 32 * 1024 * 1024;
const MAX_EVENTS = 250000;
const encodedSize = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value)).length;
export type ReplayEvent =
  | { kind: 'input'; tick: number; input: Input }
  | {
      kind: 'command';
      tick: number;
      command: GameCommand;
      result: boolean | null;
    }
  | { kind: 'checksum'; tick: number; checksum: string };
export interface Replay {
  version: 1;
  gameVersion: string;
  contentVersion: string;
  seed: number;
  dt: number;
  checksumInterval: number;
  initial: { mode: 'new-run' | 'checkpoint'; save: SaveData };
  events: ReplayEvent[];
  durationTicks: number;
}

/** Stable object keys; array/Set insertion order is retained because order can
 * affect targeting and RNG consumption. No float rounding hides divergence. */
export function canonical(value: unknown): string {
  const normalize = (v: unknown): unknown => {
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) throw Error('Non-finite deterministic state');
      return Object.is(v, -0) ? { number: '-0' } : v;
    }
    if (v instanceof Set) return { set: [...v].map(normalize) };
    if (Array.isArray(v)) return v.map(normalize);
    if (typeof v === 'object') {
      const result: Record<string, unknown> = Object.create(null);
      for (const key of Object.keys(v).sort()) {
        if (
          v instanceof World &&
          ['bus', 'spatial', 'queries', 'collisionMode'].includes(key)
        )
          continue;
        const child = (v as Record<string, unknown>)[key];
        if (child !== undefined) result[key] = normalize(child);
      }
      return result;
    }
    throw Error('Unsupported deterministic value');
  };
  return JSON.stringify(normalize(value));
}
export function checksum(engine: Engine): string {
  const source = canonical(engine.deterministicState());
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i++)
    hash = Math.imul(hash ^ source.charCodeAt(i), 0x01000193);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function boot(engine: Engine, data: Replay) {
  engine.observer = undefined;
  engine.persistenceEnabled = false;
  engine.save = structuredClone(data.initial.save);
  if (data.initial.mode === 'checkpoint') {
    if (!engine.resume()) throw Error('Replay checkpoint is unavailable');
    if (engine.world.seed !== data.seed)
      throw Error('Checkpoint seed mismatch');
  } else engine.start(data.seed);
}

export class ReplayRecorder implements SimulationObserver {
  readonly data: Replay;
  active = true;
  error = '';
  private commandTick = -1;
  private commandsAtTick = 0;
  private encodedBytes = 0;
  constructor(
    readonly engine: Engine,
    seed: number,
    save: SaveData = blankSave(),
    mode: Replay['initial']['mode'] = 'new-run',
    readonly interval = 120,
  ) {
    if (contentDiff(DEFAULT_CONTENT, engine.content).length)
      throw Error(
        'Custom sandbox content cannot be recorded with the built-in replay version',
      );
    if (!Number.isInteger(seed) || seed < 0 || seed > 1e8)
      throw Error('Invalid replay seed');
    seed = seed === 0 ? 0 : seed;
    if (!Number.isInteger(interval) || interval < 1 || interval > 3600)
      throw Error('Invalid checksum interval');
    if (engine.observer) throw Error('An observer is already attached');
    const initialSave = parseSave(JSON.stringify(save));
    validateInitialTree(initialSave);
    this.data = {
      version: REPLAY_VERSION,
      gameVersion: GAME_VERSION,
      contentVersion: CONTENT_VERSION,
      seed,
      dt: FIXED_DT,
      checksumInterval: interval,
      initial: { mode, save: structuredClone(initialSave) },
      events: [],
      durationTicks: 0,
    };
    this.encodedBytes = encodedSize(this.data) + 512;
    boot(engine, this.data);
    this.mark();
    engine.observer = this;
  }
  private mark() {
    this.append({
      kind: 'checksum',
      tick: this.engine.world.tick,
      checksum: checksum(this.engine),
    });
  }
  private append(event: ReplayEvent) {
    this.encodedBytes += encodedSize(event) + 1;
    this.data.events.push(event);
  }
  private hasSpace(event: ReplayEvent) {
    return this.encodedBytes + encodedSize(event) + 1024 < MAX_REPLAY_BYTES;
  }
  beforeStep(dt: number, input: Input) {
    if (dt !== FIXED_DT)
      throw Error('Replay requires the actual fixed 1/60 timestep');
    if (!validateInput(input))
      throw Error('Input is outside the replay contract');
    const event: ReplayEvent = {
      kind: 'input',
      tick: this.engine.world.tick,
      input: structuredClone(input),
    };
    if (
      this.engine.world.tick >= MAX_REPLAY_TICKS ||
      this.data.events.length >= MAX_EVENTS - 2 ||
      !this.hasSpace(event)
    ) {
      this.error =
        'Recording size or duration limit reached; completed prefix retained';
      this.stop();
      return;
    }
    this.append(event);
  }
  afterStep() {
    if (this.engine.world.tick % this.interval === 0) this.mark();
  }
  beforeCommand(command: GameCommand) {
    if (this.commandTick !== this.engine.world.tick) {
      this.commandTick = this.engine.world.tick;
      this.commandsAtTick = 0;
    }
    if (
      this.data.events.length >= MAX_EVENTS - 2 ||
      this.commandsAtTick >= 64 ||
      !this.hasSpace({
        kind: 'command',
        tick: this.engine.world.tick,
        command,
        result: false,
      })
    ) {
      this.error = 'Recording limit reached; completed prefix retained';
      this.stop();
    }
  }
  command(command: GameCommand, result: boolean | void) {
    this.commandsAtTick++;
    this.append({
      kind: 'command',
      tick: this.engine.world.tick,
      command: structuredClone(command),
      result: result ?? null,
    });
  }
  reset() {
    this.error = 'Recording ended because the simulation was restarted';
    this.stop();
  }
  stop(): Replay {
    if (this.active) {
      this.mark();
      this.data.durationTicks = this.engine.world.tick;
      this.active = false;
      this.engine.observer = undefined;
    }
    return structuredClone(this.data);
  }
}

export function applyCommand(engine: Engine, command: GameCommand) {
  switch (command.type) {
    case 'reward':
      return engine.chooseCard(command.id);
    case 'route':
      return engine.travel(command.id);
    case 'legacyRoute':
      return engine.travelLegacy(command.kind);
    case 'event':
      return engine.resolveEvent(command.id);
    case 'shop':
      return engine.buy(command.id);
    case 'chest':
      return engine.openChest(command.method);
    case 'pact':
      return engine.bloodPact();
    case 'bank':
      return engine.bankShards();
    case 'reroll':
      return engine.reroll();
    case 'pause':
      return engine.pause();
  }
}

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
function validateCommand(value: unknown) {
  if (!object(value)) return false;
  if (['reward', 'route', 'event'].includes(String(value.type)))
    return (
      typeof value.id === 'string' &&
      value.id.length > 0 &&
      value.id.length <= 128
    );
  if (value.type === 'legacyRoute')
    return [
      'combat',
      'elite',
      'heal',
      'treasure',
      'boss',
      'event',
      'shop',
      'forge',
      'archive',
      'challenge',
    ].includes(String(value.kind));
  if (value.type === 'shop')
    return ['heal', 'tonic', 'bomb', 'key'].includes(String(value.id));
  if (value.type === 'chest')
    return ['key', 'bomb'].includes(String(value.method));
  return ['pact', 'bank', 'reroll', 'pause'].includes(String(value.type));
}
function validateInput(value: unknown) {
  if (!object(value)) return false;
  for (const key of ['x', 'y', 'aimX', 'aimY'])
    if (
      typeof value[key] !== 'number' ||
      !Number.isFinite(value[key]) ||
      Math.abs(value[key] as number) > (key.length === 1 ? 1 : 4096)
    )
      return false;
  for (const key of ['fire', 'dash', 'q', 'e'])
    if (typeof value[key] !== 'boolean') return false;
  for (const key of ['bomb', 'heal'])
    if (value[key] !== undefined && typeof value[key] !== 'boolean')
      return false;
  return true;
}
function validateInitialTree(
  value: unknown,
  depth = 0,
  counter = { count: 0 },
): void {
  if (depth > 20 || ++counter.count > 5000)
    throw Error('Initial profile exceeds structural limits');
  if (
    typeof value === 'number' &&
    (!Number.isFinite(value) || Math.abs(value) > 1e9)
  )
    throw Error('Initial profile numeric value is outside QA limits');
  if (typeof value === 'string' && value.length > 4096)
    throw Error('Initial profile string is too long');
  if (value && typeof value === 'object')
    for (const child of Object.values(value))
      validateInitialTree(child, depth + 1, counter);
}
export function importReplay(raw: string): Replay {
  if (
    raw.length > MAX_REPLAY_BYTES ||
    new TextEncoder().encode(raw).length > MAX_REPLAY_BYTES
  )
    throw Error('Replay exceeds 32 MiB import limit');
  const data: unknown = JSON.parse(raw);
  if (
    !object(data) ||
    data.version !== REPLAY_VERSION ||
    data.gameVersion !== GAME_VERSION ||
    data.contentVersion !== CONTENT_VERSION ||
    data.dt !== FIXED_DT
  )
    throw Error('Incompatible replay / game / content version or timestep');
  if (
    !Number.isInteger(data.seed) ||
    Number(data.seed) < 0 ||
    Number(data.seed) > 1e8
  )
    throw Error('Invalid replay seed');
  if (
    !Number.isInteger(data.checksumInterval) ||
    Number(data.checksumInterval) < 1 ||
    Number(data.checksumInterval) > 3600
  )
    throw Error('Invalid checksum interval');
  if (
    !object(data.initial) ||
    !['new-run', 'checkpoint'].includes(String(data.initial.mode)) ||
    !object(data.initial.save)
  )
    throw Error('Invalid initial profile');
  validateInitialTree(data.initial.save);
  const save = parseSave(JSON.stringify(data.initial.save));
  if (canonical(save) !== canonical(data.initial.save))
    throw Error('Initial profile failed save validation');
  if (save.checkpoint?.campaign === 'legacy') {
    const room = save.checkpoint.room;
    if (
      !Number.isInteger(room.seed) ||
      Math.abs(room.seed) > 1e8 ||
      !Number.isInteger(room.template) ||
      room.template < 0 ||
      room.template > 3 ||
      typeof room.name !== 'string' ||
      typeof room.subtitle !== 'string' ||
      (room.bossKind !== undefined &&
        (room.kind !== 'boss' ||
          !['warden', 'matron', 'forgemaster', 'oracle'].includes(
            room.bossKind,
          ))) ||
      (room.biome !== undefined &&
        !['sanctum', 'grove', 'foundry'].includes(room.biome)) ||
      (room.modifier !== undefined &&
        !['none', 'haste', 'thorns', 'fervor'].includes(room.modifier))
    )
      throw Error('Invalid legacy room configuration');
  }
  if (
    data.initial.mode === 'checkpoint' &&
    (!save.checkpoint || save.checkpoint.seed !== data.seed)
  )
    throw Error('Invalid initial checkpoint');
  if (
    !Array.isArray(data.events) ||
    data.events.length > MAX_EVENTS ||
    data.events.length < 2
  )
    throw Error('Invalid event count');
  let tick = 0,
    lastCheck = 0,
    checksAtTick = 0,
    commandsAtTick = 0;
  for (const event of data.events) {
    if (!object(event) || event.tick !== tick)
      throw Error('Replay events are out of simulation order');
    if (event.kind === 'input') {
      if (!validateInput(event.input)) throw Error('Invalid input');
      tick++;
      checksAtTick = commandsAtTick = 0;
    } else if (event.kind === 'command') {
      if (!validateCommand(event.command)) throw Error('Invalid command');
      if (event.result !== null && typeof event.result !== 'boolean')
        throw Error('Missing command result');
      if (++commandsAtTick > 64) throw Error('Too many commands at one tick');
    } else {
      if (
        event.kind !== 'checksum' ||
        typeof event.checksum !== 'string' ||
        !/^[a-f0-9]{8}$/.test(event.checksum)
      )
        throw Error('Invalid checksum event');
      if (++checksAtTick > 2) throw Error('Too many checksums at one tick');
      lastCheck = tick;
    }
    if (tick - lastCheck > Number(data.checksumInterval))
      throw Error('Missing periodic checksum');
    if (tick > MAX_REPLAY_TICKS) throw Error('Replay tick limit exceeded');
  }
  if (
    data.events[0].kind !== 'checksum' ||
    data.events.at(-1).kind !== 'checksum' ||
    data.durationTicks !== tick
  )
    throw Error('Missing boundary checksum or invalid duration');
  return data as unknown as Replay;
}
export const exportReplay = (data: Replay) => JSON.stringify(data);

export class ReplayPlayer {
  readonly engine: Engine;
  readonly data: Replay;
  index = 0;
  paused = true;
  lastGoodTick = 0;
  speed: 1 | 2 | 4 = 1;
  desync: {
    tick: number;
    event: number;
    expected: string;
    actual: string;
  } | null = null;
  constructor(data: Replay | string) {
    this.data = importReplay(
      typeof data === 'string' ? data : JSON.stringify(data),
    );
    this.engine = new Engine({ save: blankSave(), persistence: false });
    boot(this.engine, this.data);
    this.consumeBoundaries();
  }
  get finished() {
    return this.index >= this.data.events.length;
  }
  private consumeBoundaries() {
    while (!this.finished && !this.desync) {
      const event = this.data.events[this.index];
      if (event.kind === 'input') break;
      if (event.tick !== this.engine.world.tick)
        throw Error('Playback tick mismatch');
      if (event.kind === 'command') {
        const result = applyCommand(this.engine, event.command) ?? null;
        if (result !== event.result) {
          this.desync = {
            tick: event.tick,
            event: this.index,
            expected: 'command result ' + String(event.result),
            actual: 'command result ' + String(result),
          };
          this.paused = true;
          break;
        }
      } else {
        const actual = checksum(this.engine);
        if (actual !== event.checksum) {
          this.desync = {
            tick: event.tick,
            event: this.index,
            expected: event.checksum,
            actual,
          };
          this.paused = true;
          break;
        }
        this.lastGoodTick = event.tick;
      }
      this.index++;
    }
  }
  step() {
    if (this.finished || this.desync) return false;
    const event = this.data.events[this.index];
    if (event.kind !== 'input' || event.tick !== this.engine.world.tick)
      throw Error('Playback input order mismatch');
    this.engine.update(FIXED_DT, structuredClone(event.input));
    this.index++;
    this.consumeBoundaries();
    if (this.finished) this.paused = true;
    return true;
  }
  frame() {
    if (!this.paused)
      for (let i = 0; i < this.speed; i++) if (!this.step()) break;
  }
}
