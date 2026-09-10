import type { Engine } from './engine';
import type { Synth } from '../audio/synth';
import { expedition } from '../rooms/expedition';
import { makeRoom } from '../rooms/generator';
/** Explicit development-only fixtures. Vite removes this import from production builds. */
export function installQA(engine: Engine, synth: Synth) {
  const harness = {
    engine,
    synth,
    nodes: () => expedition(engine.world.seed),
    room: (
      index: number,
      kind: 'combat' | 'elite' | 'heal' | 'treasure' | 'boss',
    ) => {
      engine.world.campaign = 'legacy';
      engine.enter(makeRoom(index, kind, engine.world.seed));
    },
    node: (id: string) => {
      const graph = expedition(engine.world.seed),
        target = graph.find((n) => n.id === id);
      if (!target) throw Error('Invalid QA node');
      const path = (node: typeof target): string[] => {
        if (node.depth === 1) return [node.id];
        const prev = graph.find((n) => n.next.includes(node.id))!;
        return [...path(prev), node.id];
      };
      engine.world.campaign = 'pilgrimage';
      engine.world.route = path(target);
      engine.enter(target.room);
    },
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
