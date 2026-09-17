import { Engine } from '../game/engine';
import { blankSave } from '../core/save';
import { deriveStats } from '../cards/system';
import { makeRoom } from '../rooms/generator';
import type { Input } from '../game/types';
import {
  activityDigest,
  validateActivity,
  type ActivityDefinition,
} from './definition';

export type ActivityReason =
  | 'captured'
  | 'defeated'
  | 'timeout'
  | 'abandoned'
  | 'interrupted';
export interface ActivityAttempt {
  id: string;
  activityId: string;
  revision: number;
  digest: string;
  startedAt: string;
}
export interface ActivityResult {
  attempt: ActivityAttempt;
  mode: 'official' | 'draft';
  reason: ActivityReason;
  metrics: {
    ticks: number;
    holdSeconds: number;
    kills: number;
    damage: number;
    damageTaken: number;
  } | null;
}
export function newAttempt(
  def: ActivityDefinition,
  id: string,
  startedAt = new Date().toISOString(),
): ActivityAttempt {
  return {
    id,
    activityId: def.id,
    revision: def.revision,
    digest: activityDigest(def),
    startedAt,
  };
}
/** One controller around the existing Engine; never copies combat systems. */
export class ActivitySession {
  readonly engine: Engine;
  readonly definition: ActivityDefinition;
  readonly attempt: ActivityAttempt;
  readonly mode: 'official' | 'draft';
  activeTicks = 0;
  result: ActivityResult | null = null;
  constructor(
    definition: ActivityDefinition,
    attempt: ActivityAttempt,
    mode: 'official' | 'draft',
  ) {
    const valid = validateActivity(definition);
    if (!valid.ok) throw Error(valid.errors.join('；'));
    this.definition = valid.value;
    this.attempt = structuredClone(attempt);
    this.mode = mode;
    if (
      attempt.activityId !== definition.id ||
      attempt.revision !== definition.revision ||
      attempt.digest !== activityDigest(definition)
    )
      throw Error('活动记录与规则不匹配');
    const e = (this.engine = new Engine({
      save: blankSave(),
      persistence: false,
      content: this.definition.content,
    }));
    e.start(definition.seed);
    const w = e.world;
    w.weapon = definition.weapon;
    w.forms = [definition.weapon];
    w.cards = [...definition.cards];
    w.level = definition.level;
    w.stats = deriveStats(w.cards, w.level, [], w.content);
    w.player.hp = w.player.maxHp = w.cards.includes('ice-shell') ? 160 : 120;
    w.challengeRules = {
      holdSeconds: definition.holdSeconds,
      captureRadius: definition.captureRadius,
    };
    e.enter({
      ...makeRoom(2, 'challenge', definition.seed),
      nodeId: 'activity-relay',
      biome: 'foundry',
      name: definition.name,
      subtitle: '守住中继点 · 驻留进度离圈保留',
      template: 1,
    });
    w.player.y = 535;
  }
  step(dt: number, input: Input) {
    if (this.result) return;
    if (!Number.isFinite(dt) || Math.abs(dt - 1 / 60) > 1e-10)
      throw Error('Activity requires fixed 60 Hz steps');
    const w = this.engine.world;
    const playing = w.phase === 'playing';
    this.engine.update(dt, input);
    if (playing) this.activeTicks++;
    // Death wins a tie; capture on the final allowed step wins over timeout.
    if (w.player.hp <= 0 || w.phase === 'gameover') this.end('defeated');
    else if (w.challengeTime + 1e-9 >= this.definition.holdSeconds)
      this.end('captured');
    else if (this.activeTicks >= this.definition.timeLimitSeconds * 60)
      this.end('timeout');
  }
  abandon() {
    if (!this.result) this.end('abandoned');
    return this.result!;
  }
  private end(reason: Exclude<ActivityReason, 'interrupted'>) {
    const w = this.engine.world;
    this.result = Object.freeze({
      attempt: this.attempt,
      mode: this.mode,
      reason,
      metrics: Object.freeze({
        ticks: this.activeTicks,
        holdSeconds: Math.min(this.definition.holdSeconds, w.challengeTime),
        kills: w.kills,
        damage: w.totalDamage,
        damageTaken: w.damageTaken,
      }),
    });
    w.phase = reason === 'captured' ? 'victory' : 'gameover';
    if (reason === 'captured')
      w.emit('victory', w.player.x, w.player.y, 0xe3c27d);
  }
}
