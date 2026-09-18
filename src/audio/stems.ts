import type { Biome, BossKind } from '../game/types';

export const STEM_NAMES = ['bed', 'pulse', 'drive'] as const;
export type MusicMood = {
  biome?: Biome;
  boss?: BossKind;
  bossPhase?: number;
  playing: boolean;
};
export function stemMix(mood: MusicMood) {
  const family: Biome =
    mood.boss === 'forgemaster'
      ? 'foundry'
      : mood.boss === 'matron'
        ? 'grove'
        : mood.boss
          ? 'sanctum'
          : mood.biome || 'sanctum';
  const intensity = mood.playing
    ? mood.boss
      ? mood.bossPhase && mood.bossPhase > 1
        ? 3
        : 2
      : 1
    : 0;
  return {
    family,
    intensity,
    gains: [
      0.74,
      [0, 0.7, 0.84, 0.9][intensity],
      [0, 0.08, 0.52, 0.86][intensity],
    ],
  };
}
type Bank = { family: Biome; buffers: AudioBuffer[]; duration: number };
type Running = {
  bank: Bank;
  sources: AudioBufferSourceNode[];
  gains: GainNode[];
  at: number;
  offset: number;
  targets: number[];
};
type Load = (url: string, signal: AbortSignal) => Promise<ArrayBuffer>;
const load: Load = async (url, signal) => {
  const result = await fetch(url, { signal });
  if (!result.ok) throw new Error('Music unavailable');
  return result.arrayBuffer();
};

/** Three phase-locked stems, independent from the simulation and canvas lifetime. */
export class StemMusic {
  private cache = new Map<Biome, Bank>();
  private pending = new Map<Biome, Promise<void>>();
  private failed = new Set<Biome>();
  private abort = new AbortController();
  private current: Running | null = null;
  private retiring: Running | null = null;
  private resume: { family: Biome; offset: number } | null = null;
  private disposed = false;
  private intensity = 0;
  constructor(
    private context: AudioContext,
    private output: AudioNode,
    private loader: Load = load,
  ) {}
  get sourceCount() {
    return (
      (this.current?.sources.length ?? 0) + (this.retiring?.sources.length ?? 0)
    );
  }
  get diagnostics() {
    let decodedBytes = 0;
    for (const bank of this.cache.values())
      for (const b of bank.buffers)
        decodedBytes += b.length * b.numberOfChannels * 4;
    return {
      family: this.current?.bank.family ?? null,
      intensity: this.intensity,
      sources: this.sourceCount,
      loading: this.pending.size,
      failed: [...this.failed],
      decodedBytes,
      starts: this.current?.sources.map(() => this.current!.at) ?? [],
      offset: this.current?.offset ?? this.resume?.offset ?? 0,
      gains: this.current?.targets ?? [0, 0, 0],
      levels: this.current?.gains.map((g) => g.gain.value) ?? [0, 0, 0],
    };
  }
  private request(family: Biome) {
    if (
      this.cache.has(family) ||
      this.pending.has(family) ||
      this.failed.has(family) ||
      this.disposed
    )
      return;
    const promise = Promise.all(
      STEM_NAMES.map(async (name) => {
        const bytes = await this.loader(
          `/audio/v21/${family}-${name}.ogg`,
          this.abort.signal,
        );
        if (this.disposed) throw new Error('Disposed');
        return this.context.decodeAudioData(bytes);
      }),
    )
      .then((buffers) => {
        if (this.disposed) return;
        const duration = buffers[0].duration;
        if (
          !Number.isFinite(duration) ||
          duration <= 0 ||
          buffers.some(
            (b) => Math.abs(b.duration - duration) > 1 / b.sampleRate,
          )
        )
          throw new Error('Unsynchronized stems');
        this.cache.set(family, { family, buffers, duration });
        // At most two decoded regions are retained; playback has at most one crossfade.
        for (const key of this.cache.keys()) {
          if (this.cache.size <= 2) break;
          if (key !== family && key !== this.current?.bank.family)
            this.cache.delete(key);
        }
      })
      .catch(() => {
        if (!this.disposed) this.failed.add(family);
      })
      .finally(() => this.pending.delete(family));
    this.pending.set(family, promise);
  }
  private stop(run: Running | null) {
    if (!run) return;
    for (const source of run.sources) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
      source.disconnect();
    }
    for (const gain of run.gains) gain.disconnect();
  }
  pause() {
    if (this.current) {
      const r = this.current;
      this.resume = {
        family: r.bank.family,
        offset:
          (r.offset + Math.max(0, this.context.currentTime - r.at)) %
          r.bank.duration,
      };
      this.stop(r);
      this.current = null;
    }
    this.stop(this.retiring);
    this.retiring = null;
  }
  update(mood: MusicMood, paused: boolean) {
    if (this.disposed) return false;
    const mix = stemMix(mood);
    this.intensity = mix.intensity;
    if (paused) {
      this.pause();
      return false;
    }
    this.request(mix.family);
    const bank = this.cache.get(mix.family);
    if (
      bank &&
      this.context.state === 'running' &&
      this.current?.bank !== bank
    ) {
      this.stop(this.retiring);
      this.retiring = this.current;
      if (this.retiring) {
        const retiring = this.retiring;
        for (const gain of retiring.gains) {
          gain.gain.cancelScheduledValues(this.context.currentTime);
          gain.gain.setTargetAtTime(0, this.context.currentTime, 0.22);
        }
        for (const source of retiring.sources)
          source.stop(this.context.currentTime + 1.2);
        retiring.sources[0].onended = () => {
          if (this.retiring === retiring) {
            this.stop(retiring);
            this.retiring = null;
          }
        };
      }
      const at = this.context.currentTime + 0.025;
      const offset =
        this.resume?.family === bank.family ? this.resume.offset : 0;
      const gains = bank.buffers.map(() => this.context.createGain());
      for (const gain of gains) gain.gain.value = 0;
      const sources = bank.buffers.map((buffer, i) => {
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.loopStart = 0;
        source.loopEnd = bank.duration;
        gains[i].gain.setValueAtTime(0, at);
        source.connect(gains[i]);
        gains[i].connect(this.output);
        source.start(at, offset);
        return source;
      });
      this.current = {
        bank,
        sources,
        gains,
        at,
        offset,
        targets: [-1, -1, -1],
      };
      this.resume = null;
    }
    if (this.current) {
      for (let i = 0; i < 3; i++)
        if (this.current.targets[i] !== mix.gains[i]) {
          const gain = this.current.gains[i].gain;
          const held = gain.value;
          gain.cancelScheduledValues(this.context.currentTime);
          gain.setValueAtTime(held, this.context.currentTime);
          gain.setTargetAtTime(
            mix.gains[i],
            Math.max(this.context.currentTime, this.current.at),
            0.32,
          );
          this.current.targets[i] = mix.gains[i];
        }
      return true;
    }
    return false;
  }
  dispose() {
    this.disposed = true;
    this.abort.abort();
    this.pause();
    this.cache.clear();
    this.pending.clear();
    this.resume = null;
  }
}
