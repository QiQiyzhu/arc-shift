import { useEffect, useRef } from 'react';
import { useTranslation } from '../ui/i18n';
import Phaser from 'phaser';
import { ArcScene } from '../game/scene';
import { Synth } from '../audio/synth';
import type { ActivitySession } from './session';

declare global {
  interface Window {
    activityQA?: { session: ActivitySession; scene: ArcScene };
  }
}
export function ActivityArena({
  session,
  sound,
  onTick,
  blocked = false,
}: {
  session: ActivitySession;
  sound: Synth;
  onTick: () => void;
  blocked?: boolean;
}) {
  const t = useTranslation();
  const host = useRef<HTMLDivElement>(null),
    notify = useRef(onTick),
    scene = useRef<ArcScene | null>(null);
  notify.current = onTick;
  useEffect(() => {
    if (scene.current) {
      scene.current.pauseBlocked = blocked;
      scene.current.inputBlocked = blocked || !!session.result;
    }
  }, [blocked, session]);
  useEffect(() => {
    const e = session.engine,
      s = new ArcScene(e, false);
    scene.current = s;
    let last = 0,
      lastSound = performance.now(),
      phase = e.world.phase,
      ended = false;
    s.simulationDriver = (dt, input) => session.step(dt, input);
    s.reducedMotion = e.save.settings.reducedMotion;
    sound.settings = e.save.settings;
    const off = e.world.bus.on((event) => sound.event(event));
    s.onSuspend = () =>
      sound.update(0, false, {
        phase: 'paused',
        kind: 'challenge',
        bossPhase: 0,
      });
    s.onReady = () => {
      if (import.meta.env.DEV && new URLSearchParams(location.search).has('qa'))
        window.activityQA = { session, scene: s };
      notify.current();
    };
    s.onTick = () => {
      const now = performance.now();
      if (session.result) s.inputBlocked = true;
      sound.update(
        Math.min(0.1, (now - lastSound) / 1000),
        e.world.phase === 'playing',
        {
          phase: e.world.phase,
          kind: 'challenge',
          bossPhase: 0,
          biome: 'foundry',
        },
      );
      lastSound = now;
      if (
        now - last >= 100 ||
        phase !== e.world.phase ||
        ended !== !!session.result
      ) {
        last = now;
        phase = e.world.phase;
        ended = !!session.result;
        notify.current();
      }
    };
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current!,
      width: 1280,
      height: 720,
      backgroundColor: '#080e14',
      antialias: true,
      fps: { smoothStep: false },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: s,
      audio: { noAudio: true },
      render: { powerPreference: 'high-performance' },
    });
    return () => {
      off();
      s.release();
      game.destroy(true);
      scene.current = null;
      if (window.activityQA?.session === session) delete window.activityQA;
    };
  }, [session, sound]);
  return (
    <div
      className="activity-canvas"
      ref={host}
      aria-label={t('中继争夺战场')}
    />
  );
}
