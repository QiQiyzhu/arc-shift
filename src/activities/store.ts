import { RELAY_ACTIVITY, RELAY_DIGEST, RELAY_AWARD } from './definition';
import type { ActivityAttempt, ActivityResult } from './session';

export const ACTIVITY_KEY = 'arcshift.activities.v1';
export const ACTIVITY_LOCK = 'arcshift.activities.exclusive';
export interface ActivitySave {
  version: 1;
  active: ActivityAttempt | null;
  terminal: { result: ActivityResult; acknowledged: boolean } | null;
  awards: string[];
  bestTicks: number | null;
}
export const blankActivitySave = (): ActivitySave => ({
  version: 1,
  active: null,
  terminal: null,
  awards: [],
  bestTicks: null,
});
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const keys = (v: Record<string, unknown>, allowed: string[]) =>
  Object.keys(v).every((k) => allowed.includes(k));
export function validAttempt(v: unknown): v is ActivityAttempt {
  return (
    object(v) &&
    keys(v, ['id', 'activityId', 'revision', 'digest', 'startedAt']) &&
    typeof v.id === 'string' &&
    /^[a-zA-Z0-9-]{1,80}$/.test(v.id) &&
    v.activityId === RELAY_ACTIVITY.id &&
    v.revision === RELAY_ACTIVITY.revision &&
    v.digest === RELAY_DIGEST &&
    typeof v.startedAt === 'string' &&
    v.startedAt.length <= 30 &&
    Number.isFinite(Date.parse(v.startedAt))
  );
}
export function validResult(v: unknown): v is ActivityResult {
  if (
    !object(v) ||
    !keys(v, ['attempt', 'mode', 'reason', 'metrics']) ||
    !validAttempt(v.attempt) ||
    v.mode !== 'official' ||
    typeof v.reason !== 'string' ||
    !['captured', 'defeated', 'timeout', 'abandoned', 'interrupted'].includes(
      v.reason,
    )
  )
    return false;
  if (v.reason === 'interrupted') return v.metrics === null;
  const m = v.metrics;
  if (
    !object(m) ||
    !keys(m, ['ticks', 'holdSeconds', 'kills', 'damage', 'damageTaken'])
  )
    return false;
  const finite = (key: string, max: number, integer = false) =>
    typeof m[key] === 'number' &&
    Number.isFinite(m[key]) &&
    m[key] >= 0 &&
    m[key] <= max &&
    (!integer || Number.isInteger(m[key]));
  if (
    !finite('ticks', RELAY_ACTIVITY.timeLimitSeconds * 60, true) ||
    !finite('holdSeconds', RELAY_ACTIVITY.holdSeconds) ||
    !finite('kills', 10000, true) ||
    !finite('damage', 1e9) ||
    !finite('damageTaken', 1e7)
  )
    return false;
  if (
    v.reason === 'captured' &&
    Number(m.holdSeconds) + 1e-9 < RELAY_ACTIVITY.holdSeconds
  )
    return false;
  if (Number(m.holdSeconds) > Number(m.ticks) / 60 + 1e-8) return false;
  if (
    v.reason === 'timeout' &&
    m.ticks !== RELAY_ACTIVITY.timeLimitSeconds * 60
  )
    return false;
  return true;
}
export function parseActivitySave(raw: string | null): ActivitySave {
  if (raw === null) return blankActivitySave();
  if (raw.length > 64 * 1024)
    throw Error('活动记录过大，已保留原文件，暂不写入。');
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    throw Error('活动记录无法解析，原记录已保留。');
  }
  if (!object(v) || v.version !== 1)
    throw Error('活动记录版本不受支持，原记录已保留。');
  if (
    !keys(v, ['version', 'active', 'terminal', 'awards', 'bestTicks']) ||
    !(v.active === null || validAttempt(v.active)) ||
    !Array.isArray(v.awards) ||
    v.awards.length > 1 ||
    v.awards.some((k) => k !== RELAY_AWARD) ||
    !(
      v.bestTicks === null ||
      (Number.isInteger(v.bestTicks) &&
        Number(v.bestTicks) >= RELAY_ACTIVITY.holdSeconds * 60 &&
        Number(v.bestTicks) <= RELAY_ACTIVITY.timeLimitSeconds * 60)
    )
  )
    throw Error('活动记录不匹配当前规则，原记录已保留。');
  if (v.terminal !== null) {
    const t = v.terminal;
    if (
      !object(t) ||
      !keys(t, ['result', 'acknowledged']) ||
      !validResult(t.result) ||
      typeof t.acknowledged !== 'boolean' ||
      v.active !== null
    )
      throw Error('活动结算记录损坏，原记录已保留。');
    if (
      t.acknowledged &&
      t.result.reason === 'captured' &&
      !v.awards.includes(RELAY_AWARD)
    )
      throw Error('活动奖励记录不完整，原记录已保留。');
  }
  if ((v.awards.length === 0) !== (v.bestTicks === null))
    throw Error('活动最佳成绩与徽章不匹配，原记录已保留。');
  return structuredClone(v) as unknown as ActivitySave;
}
/** All production access occurs while ActivityApp holds ACTIVITY_LOCK across tabs.
 * Each mutation fresh-reads and uses ONE setItem; only a successful write commits. */
export class ActivityStore {
  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'>) {}
  read() {
    return parseActivitySave(this.storage.getItem(ACTIVITY_KEY));
  }
  private write(s: ActivitySave) {
    parseActivitySave(JSON.stringify(s));
    this.storage.setItem(ACTIVITY_KEY, JSON.stringify(s));
    return s;
  }
  recover() {
    const s = this.read();
    if (!s.active) return s;
    s.terminal = {
      result: {
        attempt: s.active,
        mode: 'official',
        reason: 'interrupted',
        metrics: null,
      },
      acknowledged: false,
    };
    s.active = null;
    return this.write(s);
  }
  begin(attempt: ActivityAttempt) {
    if (!validAttempt(attempt)) throw Error('只接受当前正式活动');
    const s = this.read();
    if (s.active || (s.terminal && !s.terminal.acknowledged))
      throw Error('请先处理上一次活动结果');
    s.active = structuredClone(attempt);
    s.terminal = null;
    return this.write(s);
  }
  saveResult(result: ActivityResult) {
    if (!validResult(result)) throw Error('结果不属于当前正式活动');
    const s = this.read();
    if (s.terminal?.result.attempt.id === result.attempt.id) {
      if (JSON.stringify(s.terminal.result) !== JSON.stringify(result))
        throw Error('同次活动存在不同结算结果，原记录已保留');
      return s;
    }
    if (
      s.active?.id !== result.attempt.id ||
      JSON.stringify(s.active) !== JSON.stringify(result.attempt)
    )
      throw Error('结果已过期，不能覆盖新的活动');
    s.active = null;
    s.terminal = { result: structuredClone(result), acknowledged: false };
    return this.write(s);
  }
  acknowledge(attemptId: string) {
    const s = this.read(),
      t = s.terminal;
    if (!t || t.result.attempt.id !== attemptId) throw Error('结算已过期');
    if (t.acknowledged) return s;
    if (t.result.reason === 'captured') {
      if (!s.awards.includes(RELAY_AWARD)) s.awards.push(RELAY_AWARD);
      s.bestTicks = Math.min(s.bestTicks ?? Infinity, t.result.metrics!.ticks);
    }
    t.acknowledged = true;
    return this.write(s);
  }
}
