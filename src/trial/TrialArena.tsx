import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { ArcScene } from '../game/scene';
import { Synth } from '../audio/synth';
import type { BuildTrialSession } from './session';
import { isBoss } from '../progression/catalog';
declare global {
  interface Window {
    buildTrialQA?: {
      session: BuildTrialSession;
      scene: ArcScene;
      sound: Synth;
    };
  }
}
export function TrialArena({
  session,
  sound,
  onTick,
  blocked,
}: {
  session: BuildTrialSession;
  sound: Synth;
  onTick: () => void;
  blocked: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    notify = useRef(onTick),
    scene = useRef<ArcScene | null>(null);
  notify.current = onTick;
  useEffect(() => {
    if (scene.current) {
      scene.current.inputBlocked = blocked;
      scene.current.pauseBlocked = blocked;
    }
  }, [blocked]);
  useEffect(() => {
    const w = session.engine.world,
      s = new ArcScene(session.engine, false);
    scene.current = s;
    s.arenaSkin = 'observatory';
    s.reducedMotion = sound.settings.reducedMotion;
    s.simulationDriver = (dt, input) => session.step(dt, input);
    let last = 0,
      signature = '';
    const off = w.bus.on((e) => sound.event(e));
    s.onReady = () => {
      if (import.meta.env.DEV && new URLSearchParams(location.search).has('qa'))
        window.buildTrialQA = { session, scene: s, sound };
      notify.current();
    };
    s.onSuspend = () =>
      sound.update(0, false, { phase: 'paused', kind: 'combat', bossPhase: 0 });
    s.onTick = () => {
      sound.update(1 / 60, w.phase === 'playing', {
        phase: w.phase,
        kind: w.boss ? 'boss' : 'combat',
        boss: w.boss && isBoss(w.boss.kind) ? w.boss.kind : undefined,
        bossPhase: w.boss?.phase ?? 0,
        biome: 'sanctum',
      });
      const now = performance.now(),
        stamp = [
          session.state,
          w.phase,
          Math.ceil(w.player.hp),
          Math.floor(session.ticks / 6),
          w.enemies.length,
          w.totalDamage,
          w.player.qCd.toFixed(1),
          w.player.eCd.toFixed(1),
        ].join('/');
      if (now - last > 100 && signature !== stamp) {
        last = now;
        signature = stamp;
        notify.current();
      }
    };
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current!,
      width: 1280,
      height: 720,
      backgroundColor: '#09131d',
      antialias: true,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      fps: { smoothStep: false },
      scene: s,
      audio: { noAudio: true },
      render: { powerPreference: 'high-performance' },
    });
    return () => {
      off();
      s.release();
      game.destroy(true);
      scene.current = null;
      if (window.buildTrialQA?.session === session) delete window.buildTrialQA;
    };
  }, [session, sound, session.stage]);
  return <div className="trial-canvas" ref={host} aria-label="构筑试炼战场" />;
}
