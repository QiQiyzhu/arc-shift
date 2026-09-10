import type { Biome, BossKind } from '../game/types';
export interface MusicProfile {
  id: string;
  bpm: number;
  tonic: number;
  roots: number[];
  chords: number[][];
  motif: (number | null)[];
  percussion: number;
  kick: number[];
  snare: number[];
  hatEvery: number;
}
const sanctum: MusicProfile = {
  id: 'sanctum',
  bpm: 88,
  tonic: 62,
  roots: [38, 34, 43, 45],
  chords: [
    [53, 57, 64],
    [53, 58, 62],
    [55, 58, 62],
    [52, 57, 62],
  ],
  motif: [7, null, 3, 2, 0, null, 2, null],
  percussion: 0.25,
  kick: [0, 8],
  snare: [12],
  hatEvery: 4,
};
const grove: MusicProfile = {
  ...sanctum,
  id: 'grove',
  bpm: 78,
  tonic: 64,
  roots: [40, 36, 45, 35],
  chords: [
    [55, 59, 66],
    [55, 60, 64],
    [57, 60, 64],
    [54, 59, 64],
  ],
  motif: [7, null, 3, 2, 0, null, -2, null],
  percussion: 0.12,
  kick: [0],
  snare: [],
};
const foundry: MusicProfile = {
  ...sanctum,
  id: 'foundry',
  bpm: 116,
  tonic: 60,
  roots: [36, 36, 32, 31],
  chords: [
    [51, 55, 62],
    [51, 55, 60],
    [51, 56, 60],
    [50, 55, 60],
  ],
  motif: [0, 0, null, 7, 0, 3, 2, null],
  percussion: 0.58,
  kick: [0, 6, 8],
  snare: [4, 12],
  hatEvery: 2,
};
export const MUSIC: Record<Biome | BossKind, MusicProfile> = {
  sanctum,
  grove,
  foundry,
  warden: {
    ...sanctum,
    id: 'warden',
    bpm: 108,
    motif: [0, null, 7, null, 10, 7, 5, 2],
    percussion: 0.65,
    snare: [4, 12],
    hatEvery: 2,
  },
  matron: {
    ...grove,
    id: 'matron',
    bpm: 94,
    percussion: 0.38,
    kick: [0, 10],
    snare: [12],
    hatEvery: 2,
  },
  forgemaster: {
    ...foundry,
    id: 'forgemaster',
    bpm: 132,
    roots: [36, 32, 29, 31],
    chords: [
      [51, 55, 60],
      [51, 56, 60],
      [53, 56, 60],
      [50, 55, 60],
    ],
    motif: [0, 7, 0, null, 3, 2, 0, -2],
    percussion: 0.84,
    kick: [0, 6, 8, 14],
  },
  oracle: {
    ...sanctum,
    id: 'oracle',
    bpm: 102,
    motif: [7, null, 3, 2, 0, 2, -2, null],
    percussion: 0.52,
    hatEvery: 2,
  },
};
export function musicProfile(
  biome: Biome = 'sanctum',
  boss?: BossKind,
  phase = 1,
): MusicProfile {
  const base = MUSIC[boss || biome];
  if (!boss || phase <= 1) return base;
  if (boss === 'oracle' && phase >= 3)
    return {
      ...base,
      id: 'oracle-release',
      bpm: 86,
      percussion: 0.15,
      roots: [38, 34, 43, 38],
      chords: [
        [53, 57, 64],
        [53, 58, 64],
        [55, 58, 62],
        [57, 62, 64],
      ],
      motif: [7, null, 3, null, 2, null, 0, null],
      kick: [0],
      snare: [],
      hatEvery: 4,
    };
  return {
    ...base,
    id: `${boss}-escalation`,
    bpm: base.bpm + 12,
    tonic: base.tonic + (['matron', 'oracle'].includes(boss) ? 12 : 0),
    percussion: Math.min(1, base.percussion + 0.2),
    kick: [0, 6, 8, 14],
  };
}
