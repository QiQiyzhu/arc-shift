import { expect, it } from 'vitest';
import {
  initialOptions,
  runCollisionExperiment,
  type Layout,
} from '../src/lab/collision-experiment';
import { aegisEvidence, preferenceScore } from '../src/lab/aegis-evidence';

it('public geometry experiment preserves ordered brute-force hits across layouts, cell sizes and trajectories', () => {
  for (const layout of ['spread', 'dense', 'knockback'] as Layout[])
    for (const cellSize of [48, 96, 192])
      for (let seed = 0; seed < 24; seed++) {
        const result = runCollisionExperiment({
          ...initialOptions,
          layout,
          cellSize,
          seed,
          count: 256,
          endY: 50 + (seed % 9) * 40,
        });
        expect(result.actual).toEqual(result.expected);
        expect(result.missed).toEqual([]);
        expect(result.candidates.length).toBeLessThanOrEqual(256);
      }
});
it('deliberate endpoint-only and stale-membership faults are killed by the independent full traversal', () => {
  for (const cellSize of [48, 96, 192]) {
    const endpoint = runCollisionExperiment({
      ...initialOptions,
      cellSize,
      endpointOnly: true,
    });
    const stale = runCollisionExperiment({
      ...initialOptions,
      cellSize,
      layout: 'knockback',
      updateIndex: false,
    });
    expect(endpoint.missed).toContain(0);
    expect(stale.missed).toContain(0);
    expect(endpoint.equivalent).toBe(false);
    expect(stale.equivalent).toBe(false);
  }
});
it('dense-case candidate reduction can be zero and invalid numeric controls remain bounded', () => {
  const dense = runCollisionExperiment({ ...initialOptions, layout: 'dense' });
  expect(dense.reduction).toBe(0);
  expect(dense.equivalent).toBe(true);
  const bounded = runCollisionExperiment({
    ...initialOptions,
    count: Infinity,
    cellSize: NaN,
    seed: NaN,
    endY: Infinity,
  });
  expect(bounded).toEqual(runCollisionExperiment(initialOptions));
  expect(runCollisionExperiment(initialOptions)).toEqual(
    runCollisionExperiment(initialOptions),
  );
});
it('browser policy reweighting reproduces all independently exported native-data preference scores', () => {
  expect(aegisEvidence.pairs).toHaveLength(30);
  expect(new Set(aegisEvidence.pairs.map((pair) => pair.seed)).size).toBe(30);
  for (const preset of aegisEvidence.presets)
    for (const policy of ['priority', 'utility'] as const)
      expect(
        preferenceScore(aegisEvidence.summary[policy].mean, preset.weights),
      ).toBeCloseTo(preset.scores[policy], 12);
  expect(aegisEvidence.summary.priority.wins).toBe(0);
  expect(aegisEvidence.summary.utility.wins).toBe(0);
});
it('a preference score is undefined for invalid weights and does not manufacture a winner', () => {
  const values = aegisEvidence.summary.utility.mean;
  for (const weights of [
    [0, 0, 0, 0],
    [-1, 2, 3, 4],
    [NaN, 1, 2, 3],
    [Infinity, 1, 2, 3],
    [1, 2, 3],
  ])
    expect(preferenceScore(values, weights)).toBeNull();
});
