import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Engine } from '../src/game/engine';
import { blankSave, parseSave } from '../src/core/save';
import { Random } from '../src/core/math';
import { stressInput } from '../src/dev/benchmark';
import { ReplayPlayer, checksum } from '../src/replay/replay';

it.each(['combat', 'boss', 'shop-route'])('replays committed %s input/checksum history without regeneration', (name) => {
  const raw = readFileSync(`tests/fixtures/replays/${name}.json`, 'utf8');
  const player = new ReplayPlayer(raw);
  while (!player.finished && !player.desync) player.step();
  expect(player.desync).toBeNull();
  expect(player.finished).toBe(true);
  const fixture = JSON.parse(raw);
  expect(checksum(player.engine)).toBe(fixture.events.at(-1).checksum);
});
it('simulates 12 randomized new-run seeds with bounded finite state and resumable checkpoints', () => {
  const rng = new Random(917031);
  for (let trial = 0; trial < 12; trial++) {
    const engine = new Engine({ save: blankSave(), persistence: false });
    engine.start(rng.int(1, 9999999));
    engine.chooseCard(engine.world.rewards[trial % 3].id);
    for (let tick = 0; tick < 1800; tick++) {
      engine.update(1 / 60, stressInput(tick + trial * 103));
      const w = engine.world;
      expect(Number.isFinite(w.player.hp + w.player.x + w.player.y)).toBe(true);
      expect(w.projectiles.count).toBeLessThanOrEqual(w.projectiles.capacity);
      if (tick % 300 === 0) {
        expect(() => checksum(engine)).not.toThrow();
        const parsed = parseSave(JSON.stringify(engine.save));
        expect(parseSave(JSON.stringify(parsed))).toEqual(parsed);
        if (parsed.checkpoint) {
          const restored = new Engine({ save: parsed, persistence: false });
          expect(restored.resume()).toBe(true);
          expect(restored.world.room.nodeId).toBe(w.room.nodeId);
        }
      }
    }
  }
});
