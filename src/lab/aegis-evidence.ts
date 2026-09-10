import raw from './data/aegis-case.json';
export type MetricId =
  | 'companionAliveAtEnd'
  | 'alliedDamage'
  | 'playerDamageTaken'
  | 'episodeSeconds';
export type Endpoints = Record<MetricId, number>;
export interface AegisEvidence {
  metrics: {
    id: MetricId;
    label: string;
    direction: number;
    scale: number;
    definition: string;
  }[];
  provenance: { sourceBaseUrl: string };
  pairCount: number;
  episodeCount: number;
  summary: Record<
    'priority' | 'utility',
    { mean: Endpoints; wins: number; companionDeathsAtEnd: number }
  >;
  pairs: {
    seed: number;
    priority: Endpoints & { source: string };
    utility: Endpoints & { source: string };
    deltaUtilityMinusPriority: Endpoints;
  }[];
  presets: {
    id: string;
    label: string;
    weights: number[];
    scores: { priority: number; utility: number };
  }[];
  counterexamples: { seed: number; title: string; detail: string }[];
}
export const aegisEvidence = raw as AegisEvidence;
/** Reweights already observed endpoints. Does not train or run any AI policy. */
export function preferenceScore(
  endpoints: Endpoints,
  weights: readonly number[],
) {
  if (
    weights.length !== aegisEvidence.metrics.length ||
    weights.some((value) => !Number.isFinite(value) || value < 0)
  )
    return null;
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (!total || !Number.isFinite(total)) return null;
  return aegisEvidence.metrics.reduce(
    (sum, metric, index) =>
      sum +
      ((weights[index] / total) * metric.direction * endpoints[metric.id]) /
        metric.scale,
    0,
  );
}
