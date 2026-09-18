import type { EffectEvent } from '../core/events';
import type { Phase, RoomKind, Biome, BossKind } from '../game/types';
import { midi, scoreStep, stepSeconds } from './score';
import { MUSIC, musicProfile } from './profiles';
import { StemMusic } from './stems';
export interface SoundSettings {
  master: number;
  music: number;
  sfx: number;
  muted: boolean;
  reducedMotion: boolean;
  focusedEffects?: boolean;
}
export const defaultSettings: SoundSettings = {
  master: 0.6,
  music: 0.42,
  sfx: 0.65,
  muted: false,
  reducedMotion: false,
};
type Voice = {
  source: AudioScheduledSourceNode;
  nodes: AudioNode[];
  music: boolean;
};
export class Synth {
  context: AudioContext | null = null;
  settings = { ...defaultSettings };
  masterGain: GainNode | null = null;
  musicGain: GainNode | null = null;
  sfxGain: GainNode | null = null;
  private musicDuck: GainNode | null = null;
  private stems: StemMusic | null = null;
  private foreground = true;
  private duckUntil = 0;
  private ducked = false;
  private pan = 0;
  private urgent = false;
  private shotIndex = 0;
  private onBlur = () => {
    this.foreground = false;
    this.stems?.pause();
    this.syncMix(true);
  };
  private onFocus = () => {
    this.foreground = !document.hidden;
  };
  private onVisibility = () => {
    if (document.hidden) this.onBlur();
    else this.onFocus();
  };
  private active = new Set<Voice>();
  get voices() {
    return this.active.size + (this.stems?.sourceCount ?? 0);
  }
  get musicVoices() {
    let count = this.stems?.sourceCount ?? 0;
    for (const voice of this.active) if (voice.music) count++;
    return count;
  }
  get musicState() {
    return this.stems?.diagnostics ?? null;
  }
  private noiseBuffer: AudioBuffer | null = null;
  private lastShot = -1;
  private lastHit = -1;
  private lastDash = -1;
  private lastSkill = -1;
  private nextStep = 0;
  private step = 0;
  private score = MUSIC.sanctum;
  private scoreRoom = '';
  get nowPlaying() {
    return this.score.id;
  }
  private mixStamp = '';
  private wasPaused = false;
  unlock() {
    this.foreground = !document.hidden;
    if (!this.context) {
      const c = new AudioContext();
      this.context = c;
      this.lastShot = this.lastHit = this.lastDash = this.lastSkill = -Infinity;
      this.step = 0;
      this.wasPaused = false;
      this.masterGain = c.createGain();
      this.musicGain = c.createGain();
      this.sfxGain = c.createGain();
      this.musicDuck = c.createGain();
      this.musicDuck.connect(this.musicGain);
      this.stems = new StemMusic(c, this.musicDuck);
      this.foreground = !document.hidden;
      this.duckUntil = 0;
      this.ducked = false;
      window.addEventListener('blur', this.onBlur);
      window.addEventListener('focus', this.onFocus);
      document.addEventListener('visibilitychange', this.onVisibility);
      const compressor = c.createDynamicsCompressor();
      compressor.threshold.value = -12;
      compressor.knee.value = 18;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.16;
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(compressor);
      compressor.connect(c.destination);
      const delay = c.createDelay(1),
        feedback = c.createGain(),
        wet = c.createGain();
      delay.delayTime.value = 0.19;
      feedback.gain.value = 0.16;
      wet.gain.value = 0.08;
      this.musicGain.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wet);
      wet.connect(this.masterGain);
      this.noiseBuffer = c.createBuffer(1, c.sampleRate * 0.2, c.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.mixStamp = '';
      this.nextStep = c.currentTime + 0.03;
      this.syncMix(false);
    }
    if (this.context.state === 'suspended')
      void this.context.resume().catch(() => {});
  }
  private syncMix(paused: boolean) {
    const c = this.context;
    if (!c) return;
    const s = this.settings,
      stamp = `${s.master}/${s.music}/${s.sfx}/${s.muted}/${paused}`;
    if (stamp === this.mixStamp) return;
    this.mixStamp = stamp;
    const targets: [
      [GainNode | null, number],
      [GainNode | null, number],
      [GainNode | null, number],
    ] = [
      [this.masterGain, s.muted ? 0 : s.master],
      [this.musicGain, s.music * (paused ? 0 : 1)],
      [this.sfxGain, s.sfx],
    ];
    for (const [node, value] of targets)
      if (node) {
        const p = node.gain;
        p.cancelScheduledValues(c.currentTime);
        // A suspended audio clock cannot advance a ramp; pause must latch now.
        if (paused && node === this.musicGain) {
          p.value = 0;
          p.setValueAtTime(0, c.currentTime);
          continue;
        }
        p.setValueAtTime(p.value, c.currentTime);
        p.linearRampToValueAtTime(value, c.currentTime + 0.012);
      }
  }
  private connect(
    source: AudioScheduledSourceNode,
    length: number,
    volume: number,
    music: boolean,
    at: number,
    attack = 0.008,
    filter?: BiquadFilterNode,
  ) {
    const c = this.context;
    if (
      !c ||
      this.active.size >= (this.urgent ? 24 : 20) ||
      (music && this.musicVoices >= 12)
    ) {
      source.disconnect();
      filter?.disconnect();
      return false;
    }
    const gain = c.createGain(),
      bus = music ? this.musicDuck || this.musicGain : this.sfxGain;
    if (!bus) return false;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, volume),
      at + attack,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    if (filter) {
      source.connect(filter);
      filter.connect(gain);
    } else source.connect(gain);
    const pan = !music && this.pan !== 0 ? c.createStereoPanner() : null;
    if (pan) {
      pan.pan.value = this.pan;
      gain.connect(pan);
      pan.connect(bus);
    } else gain.connect(bus);
    const voice: Voice = {
      source,
      nodes: [gain, ...(filter ? [filter] : []), ...(pan ? [pan] : [])],
      music,
    };
    this.active.add(voice);
    source.onended = () => {
      if (!this.active.delete(voice)) return;
      source.disconnect();
      voice.nodes.forEach((n) => n.disconnect());
    };
    source.start(at);
    source.stop(at + length + 0.015);
    return true;
  }
  tone(
    freq: number,
    end: number,
    length: number,
    volume: number,
    type: OscillatorType = 'sine',
    music = false,
    at = this.context?.currentTime || 0,
  ) {
    const c = this.context;
    if (
      !c ||
      c.state !== 'running' ||
      this.settings.muted ||
      this.active.size >= (this.urgent ? 24 : 20) ||
      !this.foreground ||
      (music && this.musicVoices >= 12)
    )
      return;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, end), at + length);
    this.connect(
      o,
      length,
      volume,
      music,
      at,
      music && length > 1 ? 0.16 : 0.008,
    );
  }
  private noise(
    length: number,
    volume: number,
    freq: number,
    music = false,
    at = this.context?.currentTime || 0,
  ) {
    const c = this.context;
    if (
      !c ||
      c.state !== 'running' ||
      !this.noiseBuffer ||
      this.active.size >= (this.urgent ? 24 : 20) ||
      !this.foreground ||
      this.settings.muted
    )
      return;
    const src = c.createBufferSource(),
      filter = c.createBiquadFilter();
    src.buffer = this.noiseBuffer;
    filter.type = 'highpass';
    filter.frequency.value = freq;
    this.connect(src, length, volume, music, at, 0.003, filter);
  }
  event(e: EffectEvent) {
    // Four short-voice slots for danger cues, six for a region crossfade.
    this.urgent =
      e.kind === 'hurt' || e.kind === 'phase' || e.kind === 'victory';
    const now = this.context?.currentTime || 0;
    this.pan = Math.max(-0.6, Math.min(0.6, (e.x - 640) / 850));
    if (
      e.kind === 'hurt' ||
      e.kind === 'bomb' ||
      e.kind === 'phase' ||
      (e.kind === 'shot' && e.weapon === 'cannon')
    )
      this.duckUntil = now + 0.16;
    if (e.kind === 'shot') {
      if (now - this.lastShot < 0.08 || this.voices >= 25) return;
      this.lastShot = now;
      const variation = [1, 1.018, 0.986, 1.008][this.shotIndex++ % 4];
      if (e.weapon === 'cannon') {
        this.tone(145 * variation, 38, 0.32, 0.2, 'sine');
        this.tone(330, 82, 0.11, 0.055, 'triangle');
        this.noise(0.12, 0.09, 520);
        this.tone(850, 390, 0.045, 0.022, 'triangle', false, now + 0.065);
        return;
      }
      const sounds = {
        fire: [220, 65, 0.12, 'sawtooth'],
        storm: [1250, 280, 0.065, 'triangle'],
        frost: [1100, 880, 0.14, 'sine'],
        void: [170, 48, 0.19, 'sine'],
        shift: [420, 1250, 0.07, 'triangle'],
      } as const;
      const [f, end, length, type] = sounds[e.element || 'shift'];
      this.tone(
        f * variation,
        end,
        length,
        e.element === 'storm' ? 0.05 : 0.075,
        type,
      );
      this.tone(420 * variation, 210, 0.045, 0.027, 'triangle');
      if (e.element === 'void' || e.element === 'shift')
        this.tone(
          1320 * variation,
          760,
          0.11,
          0.019,
          'sine',
          false,
          now + 0.012,
        );
      if (e.element === 'fire') this.noise(0.04, 0.025, 800);
      if (e.element === 'frost') this.tone(1650, 1400, 0.09, 0.02);
    } else if (e.kind === 'slash') {
      this.noise(0.16, 0.09, 1600);
      this.tone(680, 180, 0.16, 0.065, 'triangle');
      this.tone(1600, 660, 0.055, 0.025, 'sine', false, now + 0.025);
    } else if (e.kind === 'impact') {
      this.tone(115, 48, 0.045, 0.07, 'triangle');
      if (e.weapon === 'sword' && (e.amount ?? 0) >= 30) {
        this.noise(0.08, 0.035, 1700);
        this.tone(520, 180, 0.12, 0.025, 'triangle');
      }
    } else if (e.kind === 'pickup') {
      if (now - this.lastHit < 0.07) return;
      this.lastHit = now;
      this.tone(1450, 1950, 0.065, 0.025);
    } else if (e.kind === 'bomb') {
      if (now - this.lastSkill < 0.1) return;
      this.lastSkill = now;
      this.tone(100, 30, 0.38, 0.12, 'triangle');
      this.noise(0.18, 0.07, 550);
    } else if (e.kind === 'dash') {
      if (now - this.lastDash < 0.19) return;
      this.lastDash = now;
      this.tone(120, 900, 0.16, 0.08, 'sine');
      this.noise(0.12, 0.035, 2800);
    } else if (e.kind === 'hit' || e.kind === 'crit') {
      if (now - this.lastHit < 0.05 || this.voices >= 27) return;
      this.lastHit = now;
      this.tone(
        e.kind === 'crit' ? 800 : 210,
        65,
        0.08,
        e.kind === 'crit' ? 0.1 : 0.045,
        'triangle',
      );
    } else if (e.kind === 'hurt') {
      this.tone(120, 38, 0.22, 0.17, 'sawtooth');
      this.noise(0.12, 0.07, 700);
    } else if (e.kind === 'kill') {
      if (this.voices < 25) this.tone(280, 42, 0.15, 0.06, 'triangle');
    } else if (e.kind === 'skill') {
      if (now - this.lastSkill < 0.09) return;
      this.lastSkill = now;
      this.tone(e.reaction ? 520 : 140, 70, 0.35, 0.1, 'triangle');
      this.tone(280, 680, 0.32, 0.04);
    } else if (e.kind === 'reward') {
      [62, 65, 69, 76].forEach((n) => this.tone(midi(n), midi(n), 0.8, 0.035));
    } else if (e.kind === 'phase') {
      this.tone(55, 110, 1.1, 0.12, 'sawtooth');
      this.noise(0.16, 0.06, 450);
    } else if (e.kind === 'victory') {
      [50, 57, 62, 64].forEach((n) => this.tone(midi(n), midi(n), 2.5, 0.035));
    }
  }
  update(
    _dt: number,
    playing: boolean,
    mood?: {
      phase: Phase;
      kind: RoomKind;
      bossPhase: number;
      biome?: Biome;
      boss?: BossKind;
    },
  ) {
    const c = this.context;
    if (!c) return;
    const paused =
      !this.foreground ||
      mood?.phase === 'paused' ||
      mood?.phase === 'gameover' ||
      mood?.phase === 'victory';
    this.syncMix(paused);
    if (this.musicDuck && this.ducked !== this.duckUntil > c.currentTime) {
      this.ducked = this.duckUntil > c.currentTime;
      this.musicDuck.gain.setTargetAtTime(
        this.ducked ? 0.66 : 1,
        c.currentTime,
        this.ducked ? 0.025 : 0.18,
      );
    }
    const stemActive =
      this.stems?.update(
        {
          biome: mood?.biome,
          boss: mood?.kind === 'boss' ? mood.boss : undefined,
          bossPhase: mood?.bossPhase,
          playing,
        },
        paused || this.settings.muted,
      ) ?? false;
    if (c.state !== 'running') return;
    const boss = mood?.kind === 'boss' ? mood.boss : undefined;
    const roomKey = `${mood?.biome || 'sanctum'}/${boss || ''}`;
    const requested = musicProfile(mood?.biome, boss, mood?.bossPhase);
    if (roomKey !== this.scoreRoom) {
      this.scoreRoom = roomKey;
      this.score = requested;
      this.step = 0;
      this.nextStep = c.currentTime + 0.03;
    }
    if (paused || this.settings.muted) {
      this.nextStep = c.currentTime + 0.03;
      this.wasPaused = true;
      return;
    }
    if (this.wasPaused || this.nextStep < c.currentTime - 0.25)
      this.nextStep = c.currentTime + 0.03;
    this.wasPaused = false;
    if (stemActive) {
      // Retire the oscillator fallback once decoded music is ready; SFX continue.
      for (const voice of this.active)
        if (voice.music) {
          voice.source.onended = null;
          try {
            voice.source.stop();
          } catch {
            /* already ended */
          }
          voice.source.disconnect();
          voice.nodes.forEach((n) => n.disconnect());
          this.active.delete(voice);
        }
      this.score = requested;
      this.nextStep = c.currentTime + 0.03;
      return;
    }
    const intensity = playing
      ? mood?.kind === 'boss'
        ? 2 + (mood.bossPhase > 1 ? 1 : 0)
        : 1
      : 0;
    let scheduled = 0;
    while (this.nextStep < c.currentTime + 0.1 && scheduled++ < 4) {
      const at = Math.max(c.currentTime, this.nextStep);
      if (this.step % 16 === 0) this.score = requested;
      for (const n of scoreStep(this.step, intensity, this.score))
        this.tone(
          midi(n.note),
          midi(n.note),
          n.length,
          n.volume,
          n.type,
          true,
          at,
        );
      const beat = this.step % 16;
      if (intensity > 0) {
        const percussion = this.score.percussion;
        if (this.score.kick.includes(beat))
          this.tone(125, 42, 0.16, 0.18 * percussion, 'sine', true, at);
        if (this.score.snare.includes(beat))
          this.noise(0.09, 0.055 * percussion, 1300, true, at);
        if (beat % this.score.hatEvery === 0)
          this.noise(0.025, 0.02 * percussion, 6500, true, at);
      }
      this.step++;
      this.nextStep += stepSeconds(this.score);
    }
  }
  ui() {
    this.urgent = false;
    this.pan = 0;
    this.tone(720, 960, 0.08, 0.06);
  }
  dispose() {
    const c = this.context;
    this.context = null;
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('focus', this.onFocus);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.stems?.dispose();
    this.stems = null;
    for (const v of this.active) {
      v.source.onended = null;
      try {
        v.source.stop();
      } catch {
        /* already ended */
      }
      v.source.disconnect();
      v.nodes.forEach((n) => n.disconnect());
    }
    this.active.clear();
    this.masterGain = this.musicGain = this.sfxGain = null;
    this.musicDuck = null;
    this.noiseBuffer = null;
    if (c) void c.close().catch(() => {});
  }
}
