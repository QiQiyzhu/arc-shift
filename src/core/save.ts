import { CARDS } from '../cards/catalog';
import { defaultSettings, type SoundSettings } from '../audio/synth';
import type { Room } from '../game/types';
export interface Checkpoint {
  shield?: number;
  progress?: 'entry' | 'reward' | 'map';
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
  },
  checkpoint: null,
});
const finite = (v: unknown, defaultValue = 0) =>
  typeof v === 'number' && Number.isFinite(v) ? v : defaultValue;
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
      runs: Math.max(0, finite(v.meta.runs)),
      wins: Math.max(0, finite(v.meta.wins)),
      bestRoom: Math.max(0, Math.min(8, finite(v.meta.bestRoom))),
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
      c.room.index <= 8 &&
      ['combat', 'elite', 'treasure', 'heal', 'boss'].includes(c.room.kind) &&
      Array.isArray(c.cards) &&
      c.cards.every((id: unknown) => typeof id === 'string' && ids.has(id)) &&
      typeof c.hp === 'number' &&
      c.hp > 0
    ) {
      cp = {
        progress:
          c.progress === 'reward' || c.progress === 'map'
            ? c.progress
            : 'entry',
        seed: c.seed,
        room: c.room,
        cards: [...new Set<string>(c.cards)],
        hp: Math.min(160, c.hp),
        shield: Math.max(0, Math.min(30, finite(c.shield))),
        level: Math.max(1, Math.min(40, finite(c.level, 1))),
        xp: Math.max(0, finite(c.xp)),
        elapsed: Math.max(0, finite(c.elapsed)),
        kills: Math.max(0, finite(c.kills)),
        totalDamage: Math.max(0, finite(c.totalDamage)),
        damageTaken: Math.max(0, finite(c.damageTaken)),
      };
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
