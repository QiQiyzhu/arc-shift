import { analyze, type BuildSnapshot, type Candidate } from './simulation';
import type { Goal } from './knowledge';
self.onmessage = (
  event: MessageEvent<{
    id: number;
    build: BuildSnapshot;
    candidates: Candidate[];
    goal: Goal;
  }>,
) => {
  const { id, build, candidates, goal } = event.data;
  try {
    const result = analyze(build, candidates, goal, (completed, total) =>
      self.postMessage({ id, progress: { completed, total } }),
    );
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : 'Simulation failed',
    });
  }
};
