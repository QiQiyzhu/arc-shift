// Offline, independent engine evaluation; no credentials or network access.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
// oxlint-disable-next-line typescript/no-deprecated
require.extensions['.ts'] = (module, file) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    file,
  );
const { analyze, SCENARIO_VERSION } = require(
  path.resolve('src/coach/simulation.ts'),
);
const { GAME_VERSION } = require(path.resolve('src/replay/replay.ts'));
const { validateStrategy } = require(path.resolve('src/coach/knowledge.ts'));
const { DEFAULT_CONTENT } = require(path.resolve('src/content/schema.ts'));
const library = require(path.resolve('src/coach/strategy-library.json'));
const file = process.argv[2];
if (file) {
  const evidence = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(
    evidence.result.gameVersion,
    GAME_VERSION,
    'Different game rules: do not reinterpret old evidence',
  );
  assert.equal(
    evidence.result.version,
    SCENARIO_VERSION,
    'Different range protocol',
  );
  const recomputed = analyze(
    evidence.build,
    evidence.result.rows.map((r) => r.candidate),
    evidence.goal,
  );
  assert.deepEqual(recomputed, evidence.result);
  console.log(
    'MATCH: all seeds, ticks, damage, casts, movement stats and rankings reproduced.',
  );
} else {
  const results = [];
  for (const weapon of ['arc', 'sword', 'cannon']) {
    const build = {
      cards: [],
      relics: [],
      forms: [weapon],
      weapon,
      level: 4,
      content: DEFAULT_CONTENT,
      offered: [],
      source: 'camp',
    };
    const candidates = library.plans
      .filter((p) => p.weapon === weapon)
      .map((p) => {
        validateStrategy(p);
        return { id: p.id, label: p.title, cards: p.cards };
      });
    const start = performance.now();
    const result = analyze(build, candidates, 'single');
    const elapsedMs = performance.now() - start;
    for (const row of [result.baseline, ...result.rows]) {
      assert(
        row.samples.every(
          (s) =>
            s.ticks === 720 && s.casts.dash === 0 && Number.isFinite(s.damage),
        ),
      );
    }
    results.push({ build, goal: 'single', result, elapsedMs });
  }
  const report = {
    measuredAt: new Date().toISOString(),
    node: process.version,
    platform: process.platform,
    scope:
      '9 recipes + 3 baselines, 72 deterministic 12-second samples. One local CPU run, not human play or a win-rate evaluation.',
    results,
  };
  fs.mkdirSync('outputs/qa/coach-v12', { recursive: true });
  fs.writeFileSync(
    'outputs/qa/coach-v12/evaluation.json',
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify(
      results.map(({ build, result, elapsedMs }) => ({
        weapon: build.weapon,
        elapsedMs: +elapsedMs.toFixed(1),
        baselineDps: +result.baseline.single.toFixed(1),
        rows: result.rows.map((r) => ({
          id: r.candidate.id,
          single: +r.single.toFixed(1),
          swarm: +r.swarm.toFixed(1),
          dash: r.dash,
          speed: r.speed,
        })),
      })),
      null,
      2,
    ),
  );
}
