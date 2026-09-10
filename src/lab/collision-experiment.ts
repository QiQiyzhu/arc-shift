import { UniformGrid, sweptAABB, type SpatialBody } from '../core/spatial-grid';
import { Random } from '../core/math';
import { segmentHits } from '../combat/rules';

export type Layout = 'spread' | 'dense' | 'knockback';
export interface ExperimentOptions {
  layout: Layout;
  count: number;
  cellSize: number;
  seed: number;
  endpointOnly: boolean;
  updateIndex: boolean;
  endY: number;
}
export const initialOptions: ExperimentOptions = {
  layout: 'spread',
  count: 128,
  cellSize: 96,
  seed: 73129,
  endpointOnly: false,
  updateIndex: true,
  endY: 210,
};

/** Bounded geometry experiment. Calls the game's grid, RNG and narrow phase.
 * No World, save store, gameplay commands, DOM or wall-clock timing is involved.
 */
export function runCollisionExperiment(input: ExperimentOptions) {
  const count = Math.min(
    256,
    Math.max(16, Math.round(Number.isFinite(input.count) ? input.count : 128)),
  );
  const cellSize = [48, 96, 192].includes(input.cellSize) ? input.cellSize : 96;
  const endY = Math.min(
    370,
    Math.max(50, Number.isFinite(input.endY) ? input.endY : 210),
  );
  const random = new Random(Number.isFinite(input.seed) ? input.seed : 73129);
  const bodies: SpatialBody[] = Array.from({ length: count }, (_, id) => ({
    id,
    x: input.layout === 'dense' ? random.int(410, 580) : random.int(30, 690),
    y: input.layout === 'dense' ? random.int(192, 228) : random.int(28, 392),
    radius: random.int(7, 13),
  }));
  const start = { x: 48, y: 210 },
    end = { x: 660, y: endY },
    radius = 5;
  // This witness is crossed midway even when both endpoint circles miss it.
  const witness = bodies[0];
  Object.assign(witness, {
    x: 354,
    y: input.layout === 'knockback' ? 58 : (210 + endY) / 2,
    radius: 14,
  });
  const previous =
    input.layout === 'knockback' ? { x: witness.x, y: witness.y } : null;
  const grid = new UniformGrid<SpatialBody>(cellSize);
  grid.rebuild(bodies);
  if (previous) {
    witness.y = (210 + endY) / 2;
    if (input.updateIndex) grid.update(witness);
  }
  const query = input.endpointOnly
    ? sweptAABB(end.x, end.y, end.x, end.y, radius)
    : sweptAABB(start.x, start.y, end.x, end.y, radius);
  const candidates = grid.query(query);
  const hit = (body: SpatialBody) =>
    segmentHits(
      start.x,
      start.y,
      end.x,
      end.y,
      body.x,
      body.y,
      body.radius + radius,
    );
  const expected = bodies.filter(hit).map((body) => body.id);
  const actual = candidates.filter(hit).map((body) => body.id);
  const missed = expected.filter((id) => !actual.includes(id));
  return {
    bodies,
    start,
    end,
    radius,
    query,
    previous,
    candidates: candidates.map((body) => body.id),
    expected,
    actual,
    missed,
    equivalent: expected.join(',') === actual.join(','),
    reduction: (1 - candidates.length / count) * 100,
    cellSize,
    occupiedCells: [...grid.cells.keys()],
  };
}
