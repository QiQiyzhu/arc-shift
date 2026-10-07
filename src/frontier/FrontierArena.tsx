import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { ArcScene } from '../game/scene';
import { Synth } from '../audio/synth';
import { isBoss } from '../progression/catalog';
import { FrontierRenderer } from './render';
import type { FrontierSession } from './session';
import { copy, type Language } from '../ui/i18n';

declare global {
  interface Window {
    frontierQA?: { session: FrontierSession; scene: ArcScene; sound: Synth };
  }
}
export function FrontierArena({
  session,
  sound,
  language,
  onTick,
  blocked,
}: {
  session: FrontierSession;
  sound: Synth;
  language: Language;
  onTick: () => void;
  blocked: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    notify = useRef(onTick),
    locale = useRef(language),
    scene = useRef<ArcScene | null>(null),
    isBlocked = useRef(blocked);
  notify.current = onTick;
  locale.current = language;
  isBlocked.current = blocked;
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
    s.reducedMotion = sound.settings.reducedMotion;
    s.inputBlocked = isBlocked.current;
    s.pauseBlocked = isBlocked.current;
    s.simulationDriver = (dt, input) => session.step(dt, input);
    let objectives: FrontierRenderer | undefined,
      last = 0;
    const off = w.bus.on((event) => sound.event(event));
    s.onReady = () => {
      objectives = new FrontierRenderer(s);
      if (import.meta.env.DEV && new URLSearchParams(location.search).has('qa'))
        window.frontierQA = { session, scene: s, sound };
      notify.current();
    };
    s.onSuspend = () =>
      sound.update(0, false, { phase: 'paused', kind: 'combat', bossPhase: 0 });
    s.onTick = () => {
      s.reducedMotion = sound.settings.reducedMotion;
      objectives?.draw(session, locale.current, s.reducedMotion);
      sound.update(1 / 60, w.phase === 'playing', {
        phase: w.phase,
        kind: w.boss ? 'boss' : 'combat',
        boss: w.boss && isBoss(w.boss.kind) ? w.boss.kind : undefined,
        bossPhase: w.boss?.phase ?? 0,
        biome: session.biome,
      });
      if (performance.now() - last >= 80) {
        last = performance.now();
        notify.current();
      }
    };
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current!,
      width: 1280,
      height: 720,
      backgroundColor: '#07141a',
      antialias: true,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      fps: { smoothStep: false },
      scene: s,
      audio: { noAudio: true },
      render: { powerPreference: 'high-performance' },
    });
    return () => {
      off();
      objectives?.dispose();
      s.release();
      game.destroy(true);
      scene.current = null;
      if (window.frontierQA?.session === session) delete window.frontierQA;
    };
  }, [session, sound, session.stage]);
  return (
    <div
      className="frontier-canvas"
      ref={host}
      aria-label={copy(language, '边境行动战场', 'Frontier operations arena')}
    />
  );
}
