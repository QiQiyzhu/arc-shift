import { MUSIC, type MusicProfile } from './profiles';
export const stepSeconds = (profile: MusicProfile) => 60 / profile.bpm / 4;
export const STEP_SECONDS = stepSeconds(MUSIC.sanctum);
export const midi = (note: number) => 440 * 2 ** ((note - 69) / 12);
export interface ScoreNote {
  note: number;
  length: number;
  volume: number;
  type: OscillatorType;
}
/** Original four-bar motifs; boss transformations retain their region's musical memory. */
export function scoreStep(
  step: number,
  intensity: number,
  profile: MusicProfile = MUSIC.sanctum,
): ScoreNote[] {
  const bar = Math.floor(step / 16) % 4,
    beat = step % 16,
    root = profile.roots[bar];
  const duration = stepSeconds(profile);
  const notes: ScoreNote[] = [];
  if (beat === 0)
    for (const note of profile.chords[bar])
      notes.push({
        note,
        length: duration * 14,
        volume: 0.027,
        type: 'triangle',
      });
  if (intensity > 0 && beat % 4 === 0)
    notes.push({
      note: root + (beat === 8 ? 7 : 0),
      length: duration * 1.4,
      volume: 0.09,
      type: 'triangle',
    });
  if (beat % (intensity > 1 ? 2 : 4) === 0) {
    const melody = profile.motif[Math.floor(beat / 2)];
    if (melody !== null)
      notes.push({
        note: profile.tonic + melody + (bar === 3 ? -2 : 0),
        length: duration * 1.6,
        volume: 0.06,
        type: 'sine',
      });
  }
  return notes;
}
