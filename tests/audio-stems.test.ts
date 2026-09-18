import { expect, it, vi } from 'vitest';
import { StemMusic, stemMix } from '../src/audio/stems';
function fixture() {
  const sources: Array<{
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }> = [];
  const context = {
    currentTime: 2,
    state: 'running',
    createGain: () => ({
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    createBufferSource: () => {
      const s = {
        start: vi.fn(),
        stop: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        onended: null,
      };
      sources.push(s);
      return s;
    },
    decodeAudioData: vi.fn(async () => ({
      duration: 20,
      sampleRate: 48000,
      length: 960000,
      numberOfChannels: 2,
    })),
  };
  const loader = vi.fn(async () => new ArrayBuffer(1));
  const music = new StemMusic(
    context as unknown as AudioContext,
    {} as AudioNode,
    loader,
  );
  return { music, context, sources, loader };
}
const mood = { biome: 'sanctum' as const, playing: true };
it('starts three decoded stems at the same audio time and offset; intensity changes never restart them', async () => {
  const { music, sources, loader } = fixture();
  for (let i = 0; i < 10; i++) music.update(mood, false);
  await vi.waitFor(() => expect(music.diagnostics.loading).toBe(0));
  expect(loader).toHaveBeenCalledTimes(3);
  expect(music.update(mood, false)).toBe(true);
  expect(sources).toHaveLength(3);
  expect(music.diagnostics.levels).toEqual([0, 0, 0]);
  for (const s of sources) expect(s.start).toHaveBeenCalledWith(2.025, 0);
  for (let i = 0; i < 100; i++)
    music.update({ ...mood, boss: 'warden', bossPhase: 3 }, false);
  expect(sources).toHaveLength(3);
  expect(music.diagnostics.gains).toEqual([0.74, 0.9, 0.86]);
  expect(music.diagnostics.decodedBytes).toBe(23040000);
  music.dispose();
});
it('pause stops every source and resumes all stems with the same preserved position', async () => {
  const { music, context, sources } = fixture();
  music.update(mood, false);
  await vi.waitFor(() => expect(music.diagnostics.loading).toBe(0));
  music.update(mood, false);
  context.currentTime = 7;
  music.update(mood, true);
  expect(music.sourceCount).toBe(0);
  for (const s of sources) expect(s.stop).toHaveBeenCalled();
  context.currentTime = 17;
  music.update(mood, false);
  for (const s of sources.slice(3))
    expect(s.start).toHaveBeenCalledWith(17.025, 4.975);
  music.dispose();
  expect(music.sourceCount).toBe(0);
  expect(music.diagnostics.decodedBytes).toBe(0);
});
it('disposal aborts downloads and late completion cannot decode or resurrect a bank', async () => {
  const { context } = fixture();
  let done!: (b: ArrayBuffer) => void;
  const wait = new Promise<ArrayBuffer>((resolve) => {
    done = resolve;
  });
  const signals: AbortSignal[] = [];
  const music = new StemMusic(
    context as unknown as AudioContext,
    {} as AudioNode,
    (_url, signal) => {
      signals.push(signal);
      return wait;
    },
  );
  music.update(mood, false);
  music.dispose();
  done(new ArrayBuffer(1));
  await Promise.resolve();
  await Promise.resolve();
  expect(signals.every((s) => s.aborted)).toBe(true);
  expect(context.decodeAudioData).not.toHaveBeenCalled();
  expect(music.update(mood, false)).toBe(false);
  expect(music.sourceCount).toBe(0);
});
it('a malformed loop bank stays on fallback and does not retry on every frame', async () => {
  const { music, context, loader } = fixture();
  context.decodeAudioData.mockResolvedValueOnce({
    duration: 19,
    sampleRate: 48000,
    length: 912000,
    numberOfChannels: 2,
  });
  music.update(mood, false);
  await vi.waitFor(() => expect(music.diagnostics.loading).toBe(0));
  for (let i = 0; i < 50; i++) expect(music.update(mood, false)).toBe(false);
  expect(loader).toHaveBeenCalledTimes(3);
  expect(music.diagnostics.failed).toEqual(['sanctum']);
  music.dispose();
});
it('rapid region changes bound sources to one crossfade and decoded cache to two regions', async () => {
  const { music } = fixture();
  for (const biome of ['sanctum', 'grove', 'foundry', 'sanctum'] as const) {
    music.update({ biome, playing: true }, false);
    await vi.waitFor(() => expect(music.diagnostics.loading).toBe(0));
    music.update({ biome, playing: true }, false);
    expect(music.sourceCount).toBeLessThanOrEqual(6);
    expect(music.diagnostics.decodedBytes).toBeLessThanOrEqual(46080000);
  }
  music.dispose();
  expect(music.sourceCount).toBe(0);
});
it('noncombat removes rhythmic layers and actual boss identity selects its regional theme', () => {
  expect(stemMix({ ...mood, playing: false }).gains).toEqual([0.74, 0, 0]);
  expect(stemMix({ ...mood, boss: 'matron' }).family).toBe('grove');
  expect(stemMix({ ...mood, boss: 'forgemaster' }).family).toBe('foundry');
  expect(stemMix({ ...mood, boss: 'oracle' }).family).toBe('sanctum');
});
