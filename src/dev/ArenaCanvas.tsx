import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { ArcScene } from '../game/scene';
import type { Engine } from '../game/engine';
import type { Input } from '../game/types';
export function ArenaCanvas({
  engine,
  step,
  onScene,
}: {
  engine: Engine;
  step: (dt: number, input: Input) => void;
  onScene?: (scene: ArcScene | null) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    driver = useRef(step),
    notify = useRef(onScene);
  driver.current = step;
  notify.current = onScene;
  useEffect(() => {
    const scene = new ArcScene(engine, false);
    scene.externalSimulation = (dt, input) => driver.current(dt, input);
    scene.onReady = () => notify.current?.(scene);
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current!,
      width: 1280,
      height: 720,
      backgroundColor: '#080e14',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene,
      audio: { noAudio: true },
    });
    return () => {
      notify.current?.(null);
      scene.release();
      game.destroy(true);
    };
  }, [engine]);
  return (
    <div className="dev-arena" ref={host} aria-label="QA simulation arena" />
  );
}
