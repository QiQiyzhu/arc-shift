export const STEP_SECONDS = 60 / 112 / 4;
export const midi = (note: number) => 440 * 2 ** ((note - 69) / 12);
const roots = [38, 34, 43, 33];
const voicings = [
  [53, 60, 64],
  [53, 57, 62],
  [53, 58, 62],
  [52, 59, 61],
];
export interface ScoreNote {
  note: number;
  length: number;
  volume: number;
  type: OscillatorType;
}
/** Original 112 BPM, four-bar progression. No sampled commercial composition. */
export function scoreStep(step: number, intensity: number): ScoreNote[] {
  const bar = Math.floor(step / 16) % 4,
    beat = step % 16,
    root = roots[bar];
  const notes: ScoreNote[] = [];
  if (beat === 0)
    for (const note of voicings[bar])
      notes.push({
        note,
        length: STEP_SECONDS * 18,
        volume: 0.022,
        type: 'triangle',
      });
  if (intensity > 0 && beat % 4 === 0)
    notes.push({
      note: root + (beat === 8 ? 7 : 0),
      length: 0.25,
      volume: 0.1,
      type: 'triangle',
    });
  if (beat % (intensity > 1 ? 2 : 4) === 0) {
    const melody = [12, 19, 24, 26, 19, 15, 22, 19][Math.floor(beat / 2)];
    notes.push({
      note: root + melody + (intensity > 2 ? 12 : 0),
      length: 0.28,
      volume: 0.037,
      type: 'sine',
    });
  }
  return notes;
}
