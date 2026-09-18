import { expect, it, vi } from 'vitest';
import { Synth } from '../src/audio/synth';
it('ordinary voices reserve critical cue slots plus six loop sources during a region crossfade', () => {
  const parameter = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  });
  const node = () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: parameter(),
  });
  const context = {
    currentTime: 2,
    state: 'running',
    createGain: node,
    createOscillator: () => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: parameter(),
      onended: null,
    }),
  };
  const synth = new Synth();
  synth.context = context as unknown as AudioContext;
  synth.sfxGain = node() as unknown as GainNode;
  let streams = 0;
  Object.defineProperty(synth, 'stems', {
    value: {
      get sourceCount() {
        return streams;
      },
    },
  });
  for (let i = 0; i < 60; i++) synth.tone(220, 110, 0.5, 0.1);
  expect(synth.voices).toBe(20);
  for (let i = 0; i < 8; i++)
    synth.event({ kind: 'hurt', x: 640, y: 360, color: 0xffffff });
  expect(synth.voices).toBe(24);
  streams = 6;
  expect(synth.voices).toBe(30);
  synth.event({ kind: 'phase', x: 640, y: 360, color: 0xffffff });
  expect(synth.voices).toBe(30);
});
