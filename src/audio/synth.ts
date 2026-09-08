import type { EffectEvent } from '../core/events';
export interface SoundSettings {
  master: number;
  music: number;
  sfx: number;
  muted: boolean;
  reducedMotion: boolean;
}
export const defaultSettings: SoundSettings = {
  master: 0.6,
  music: 0.22,
  sfx: 0.65,
  muted: false,
  reducedMotion: false,
};
export class Synth {
  context: AudioContext | null = null;
  settings = { ...defaultSettings };
  voices = 0;
  private lastShot = 0;
  private lastHit = 0;
  private timer = 0;
  private noteIndex = 0;
  unlock() {
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === 'suspended')
      void this.context.resume().catch(() => {});
  }
  tone(
    freq: number,
    end: number,
    length: number,
    volume: number,
    type: OscillatorType = 'sine',
    music = false,
  ) {
    const c = this.context;
    if (!c || c.state !== 'running' || this.settings.muted || this.voices >= 30)
      return;
    const level =
      volume *
      this.settings.master *
      (music ? this.settings.music : this.settings.sfx);
    if (level <= 0) return;
    this.voices++;
    const o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(
      Math.max(20, end),
      c.currentTime + length,
    );
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(level, c.currentTime + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + length);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + length + 0.01);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
      this.voices--;
    };
  }
  event(e: EffectEvent) {
    const now = this.context?.currentTime || 0;
    if (e.kind === 'shot') {
      if (now - this.lastShot < 0.07) return;
      this.lastShot = now;
      this.tone(620, 190, 0.09, 0.1, 'triangle');
    } else if (e.kind === 'hit') {
      if (now - this.lastHit < 0.04) return;
      this.lastHit = now;
      this.tone(180, 60, 0.06, 0.085, 'triangle');
    } else if (e.kind === 'crit') {
      this.tone(920, 120, 0.13, 0.13, 'triangle');
    } else if (e.kind === 'dash') {
      if (now - this.lastShot < 0.08) return;
      this.lastShot = now;
      this.tone(100, 840, 0.13, 0.07, 'sine');
    } else if (e.kind === 'hurt') {
      this.tone(115, 40, 0.2, 0.22, 'sawtooth');
    } else if (e.kind === 'kill') {
      this.tone(260, 40, 0.16, 0.09, 'triangle');
    } else if (e.kind === 'skill') {
      this.tone(140, 620, 0.45, 0.13, 'sine');
      this.tone(285, 125, 0.3, 0.04, 'triangle');
    } else if (e.kind === 'reward') {
      [330, 440, 660].forEach((f) => this.tone(f, f, 0.6, 0.06));
    } else if (e.kind === 'phase') {
      this.tone(65, 130, 0.9, 0.2, 'sawtooth');
    } else if (e.kind === 'victory') {
      [261.6, 329.6, 392, 523].forEach((f) => this.tone(f, f, 2, 0.08));
    }
  }
  update(dt: number, playing: boolean) {
    if (!playing) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.42;
    const notes = [130.81, 196, 261.63, 293.66, 196, 164.81, 261.63, 196];
    const f = notes[this.noteIndex++ % notes.length];
    this.tone(f, f, 1.5, 0.11, 'sine', true);
    if (this.noteIndex % 4 === 0) this.tone(65.4, 65.4, 2, 0.1, 'sine', true);
  }
  ui() {
    this.tone(720, 960, 0.08, 0.08);
  }
  dispose() {
    void this.context?.close();
    this.context = null;
  }
}
