import { CARDS } from '../cards/catalog';
import { defaultSettings, type SoundSettings } from '../audio/synth';
import type { Room } from '../game/types';
import {
  normalizeWallet,
  normalizePreparation,
  weaponId,
  type Wallet,
  type Preparation,
} from '../economy/catalog';
import type { WeaponId } from '../game/types';
import { expedition } from '../rooms/expedition';
import { RELICS, LORE, BOSSES } from '../progression/catalog';
import { ENEMIES } from '../data/enemies';
export interface Checkpoint {
  campaign?: 'legacy' | 'pilgrimage';
  route?: string[];
  forms?: WeaponId[];
  relics?: string[];
  eventDone?: boolean;
  weapon?: WeaponId;
  preparation?: Preparation;
  wallet?: Wallet;
  campUsed?: string[];
  rerolls?: number;
  banked?: number;
  shield?: number;
  progress?: 'entry' | 'reward' | 'map' | 'event';
  seed: number;
  room: Room;
  cards: string[];
  hp: number;
  level: number;
  xp: number;
  elapsed: number;
  kills: number;
  totalDamage: number;
  damageTaken: number;
}
export interface SaveData {
  version: 1;
  settings: SoundSettings;
  meta: {
    runs: number;
    wins: number;
    bestRoom: number;
    bestTime: number;
    totalKills: number;
    discovered: string[];
    shards: number;
    preparation: Preparation;
    weapon: WeaponId;
    unlocked: string[];
    equipped: string | null;
    bosses: string[];
    lore: string[];
    enemies: string[];
  };
  checkpoint: Checkpoint | null;
}
export const blankSave = (): SaveData => ({
  version: 1,
  settings: { ...defaultSettings },
  meta: {
    runs: 0,
    wins: 0,
    bestRoom: 0,
    bestTime: 0,
    totalKills: 0,
    discovered: [],
    shards: 0,
    preparation: normalizePreparation(null),
    weapon: 'arc',
    unlocked: [],
    equipped: null,
    bosses: [],
    lore: [],
    enemies: [],
  },
  checkpoint: null,
});
const finite = (v: unknown, defaultValue = 0) =>
  typeof v === 'number' && Number.isFinite(v) ? v : defaultValue;
const known = (value: unknown, ids: readonly string[]) =>
  Array.isArray(value)
    ? [
        ...new Set<string>(
          value.filter((x) => typeof x === 'string' && ids.includes(x)),
        ),
      ]
    : [];
export function parseSave(raw: string | null): SaveData {
  const fallback = blankSave();
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw);
    if (v.version !== 1 || !v.meta || !v.settings) return fallback;
    const settings = { ...defaultSettings };
    for (const key of ['master', 'music', 'sfx'] as const)
      settings[key] = Math.max(
        0,
        Math.min(1, finite(v.settings[key], settings[key])),
      );
    settings.muted = v.settings.muted === true;
    settings.reducedMotion = v.settings.reducedMotion === true;
    const ids = new Set(CARDS.map((c) => c.id));
    const meta = {
      unlocked: known(
        v.meta.unlocked,
        RELICS.map((r) => r.id),
      ),
      equipped:
        typeof v.meta.equipped === 'string' &&
        known(
          v.meta.unlocked,
          RELICS.map((r) => r.id),
        ).includes(v.meta.equipped)
          ? v.meta.equipped
          : null,
      bosses: Array.isArray(v.meta.bosses)
        ? known(v.meta.bosses, BOSSES)
        : v.meta.wins > 0
          ? ['warden', 'oracle']
          : [],
      lore: known(
        v.meta.lore,
        LORE.map((l) => l.id),
      ),
      enemies: known(v.meta.enemies, Object.keys(ENEMIES)),
      shards: Math.max(0, Math.min(99999, Math.floor(finite(v.meta.shards)))),
      preparation: normalizePreparation(v.meta.preparation),
      weapon: weaponId(v.meta.weapon),
      runs: Math.max(0, finite(v.meta.runs)),
      wins: Math.max(0, finite(v.meta.wins)),
      bestRoom: Math.max(0, Math.min(12, finite(v.meta.bestRoom))),
      bestTime: Math.max(0, finite(v.meta.bestTime)),
      totalKills: Math.max(0, finite(v.meta.totalKills)),
      discovered: Array.isArray(v.meta.discovered)
        ? v.meta.discovered.filter(
            (x: unknown) => typeof x === 'string' && ids.has(x),
          )
        : [],
    };
    let cp: Checkpoint | null = null;
    const c = v.checkpoint;
    if (
      c &&
      Number.isInteger(c.seed) &&
      c.room &&
      Number.isInteger(c.room.index) &&
      c.room.index >= 1 &&
      c.room.index <= (c.campaign === 'pilgrimage' ? 12 : 8) &&
      [
        'combat',
        'elite',
        'treasure',
        'heal',
        'boss',
        'event',
        'shop',
        'forge',
        'archive',
        'challenge',
      ].includes(c.room.kind) &&
      Array.isArray(c.cards) &&
      c.cards.every((id: unknown) => typeof id === 'string' && ids.has(id)) &&
      typeof c.hp === 'number' &&
      c.hp > 0
    ) {
      cp = {
        campaign: c.campaign === 'pilgrimage' ? 'pilgrimage' : 'legacy',
        route: known(
          c.route,
          expedition(c.seed).map((n) => n.id),
        ),
        forms: [
          ...new Set([
            weaponId(c.weapon),
            ...known(c.forms, ['arc', 'sword', 'cannon']),
          ]),
        ] as WeaponId[],
        relics: known(
          c.relics,
          RELICS.map((r) => r.id),
        ),
        eventDone: c.eventDone === true,
        weapon: weaponId(c.weapon),
        preparation: normalizePreparation(c.preparation),
        wallet: normalizeWallet(c.wallet),
        campUsed: Array.isArray(c.campUsed)
          ? [
              ...new Set<string>(
                c.campUsed.filter(
                  (x: unknown) =>
                    typeof x === 'string' &&
                    [
                      'heal',
                      'tonic',
                      'bomb',
                      'key',
                      'chest',
                      'altar',
                      'bank',
                    ].includes(x),
                ),
              ),
            ]
          : [],
        rerolls: Math.max(0, Math.min(3, Math.floor(finite(c.rerolls)))),
        banked: Math.max(0, Math.min(9999, Math.floor(finite(c.banked)))),
        progress:
          c.progress === 'reward' ||
          c.progress === 'map' ||
          c.progress === 'event'
            ? c.progress
            : 'entry',
        seed: c.seed,
        room: c.room,
        cards: [...new Set<string>(c.cards)],
        hp: Math.min(190, c.hp),
        shield: Math.max(0, Math.min(30, finite(c.shield))),
        level: Math.max(1, Math.min(40, finite(c.level, 1))),
        xp: Math.max(0, finite(c.xp)),
        elapsed: Math.max(0, finite(c.elapsed)),
        kills: Math.max(0, finite(c.kills)),
        totalDamage: Math.max(0, finite(c.totalDamage)),
        damageTaken: Math.max(0, finite(c.damageTaken)),
      };
      if (cp.campaign === 'pilgrimage') {
        const graph = expedition(cp.seed),
          canonical = graph.find((n) => n.id === c.room.nodeId),
          route = cp.route || [];
        const support =
          canonical &&
          ['heal', 'treasure', 'event', 'shop', 'forge', 'archive'].includes(
            canonical.room.kind,
          );
        const validRoute =
          route[0] === graph[0].id &&
          route.at(-1) === canonical?.id &&
          route.every(
            (id, i) =>
              i === 0 ||
              graph.find((n) => n.id === route[i - 1])?.next.includes(id),
          );
        if (
          !canonical ||
          c.room.index !== canonical.depth ||
          !validRoute ||
          (cp.progress === 'event' && (!support || cp.eventDone)) ||
          (support && cp.progress !== 'event' && !cp.eventDone)
        )
          cp = null;
        else cp.room = canonical.room;
      }
    }
    return { version: 1, settings, meta, checkpoint: cp };
  } catch {
    return fallback;
  }
}
export function loadSave(): SaveData {
  try {
    return parseSave(localStorage.getItem('arcshift.save.v1'));
  } catch {
    return blankSave();
  }
}
export function writeSave(save: SaveData) {
  try {
    localStorage.setItem('arcshift.save.v1', JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}
