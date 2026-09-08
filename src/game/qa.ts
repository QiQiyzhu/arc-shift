import type { Engine } from './engine';
import type { Synth } from '../audio/synth';
import { makeRoom } from '../rooms/generator';
/** Explicit development-only fixtures. Vite removes this import from production builds. */
export function installQA(engine: Engine, synth: Synth) {
  const harness = {
    engine,
    synth,
    room: (
      index: number,
      kind: 'combat' | 'elite' | 'heal' | 'treasure' | 'boss',
    ) => engine.enter(makeRoom(index, kind, engine.world.seed)),
    snapshot: () => {
      const w = engine.world;
      return {
        phase: w.phase,
        player: { ...w.player },
        room: w.room.index,
        kills: w.kills,
        time: w.elapsed,
        enemyCount: w.enemies.length,
        projectiles: w.projectiles.count,
        voiceCount: synth.voices,
        audioState: synth.context?.state,
        cards: [...w.cards],
      };
    },
  };
  Object.assign(window, { arcQA: harness });
  return harness;
}
