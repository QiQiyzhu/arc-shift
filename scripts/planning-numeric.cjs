'use strict';

// Read-only engine experiment; generated output stays outside source by default.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const childProcess = require('node:child_process');
const repo = path.resolve(__dirname, '..');
const outDir = path.resolve(process.argv[2] || 'outputs/planning-numeric');
fs.mkdirSync(outDir, { recursive: true });
const sha256 = (value) =>
  crypto.createHash('sha256').update(value).digest('hex');
const gitRead = (...args) => {
  const result = childProcess.spawnSync('git', args, {
    cwd: repo,
    encoding: 'utf8',
  });
  if (result.status !== 0)
    throw Error(result.stderr || 'Git metadata read failed');
  return result.stdout.trim();
};
require(path.join(repo, 'scripts/ts-register.cjs'));
const { measure, SCENARIO_VERSION, SEEDS, TICKS } = require(
  path.join(repo, 'src/coach/simulation.ts'),
);
const { DEFAULT_TRIAL, validateTrial } = require(
  path.join(repo, 'src/trial/config.ts'),
);
const { validateCards } = require(path.join(repo, 'src/coach/knowledge.ts'));
const { GAME_VERSION, CONTENT_VERSION } = require(
  path.join(repo, 'src/replay/replay.ts'),
);
const { CARDS } = require(path.join(repo, 'src/cards/catalog.ts'));

const trial = structuredClone(DEFAULT_TRIAL);
if (!validateTrial(trial).ok) throw Error('DEFAULT_TRIAL validation failed');
const snapshot = {
  cards: [],
  relics: [],
  forms: ['arc'],
  weapon: 'arc',
  level: 3,
  content: structuredClone(trial.content),
  offered: [],
  source: 'camp',
};
const candidates = [
  { id: 'baseline', label: 'Empty baseline', cards: [] },
  {
    id: 'build-a',
    label: 'A: split + ember + frost',
    cards: ['fire-split', 'fire-ember', 'ice-touch'],
  },
  {
    id: 'build-b',
    label: 'B: chain + rate + homing',
    cards: ['storm-arc', 'storm-surge', 'void-seek'],
  },
  {
    id: 'build-c',
    label: 'C: ember + rate + chain',
    cards: ['fire-ember', 'storm-surge', 'storm-arc'],
  },
];
const initialOffers = trial.offers.filter((o) => o.unlock === 0);
const offerById = new Map(initialOffers.map((o) => [o.id, o]));
const costOf = (cards, splitCost = 3) =>
  cards.reduce((sum, id) => {
    const offer = offerById.get(id);
    if (!offer)
      throw Error('Candidate contains an unavailable initial offer: ' + id);
    return sum + (id === 'fire-split' ? splitCost : offer.cost);
  }, 0);
if (
  offerById.get('fire-split')?.cost !== 3 ||
  trial.slots !== 4 ||
  trial.stages[0].budget !== 6
) {
  throw Error('Expected initial budget 6, slots 4, and fire-split cost 3');
}
for (const candidate of candidates) {
  if (
    !validateCards(candidate.cards, snapshot.content) ||
    candidate.cards.length > 4
  )
    throw Error('Invalid candidate');
  if (candidate.id !== 'baseline' && costOf(candidate.cards) !== 6)
    throw Error('Expected a six-energy candidate');
}

const loadedRepositoryFiles = Object.keys(require.cache)
  .filter(
    (file) =>
      file.startsWith(path.resolve(repo) + path.sep) &&
      !file.includes(path.sep + 'node_modules' + path.sep),
  )
  .sort();
const hashesBefore = Object.fromEntries(
  loadedRepositoryFiles.map((file) => [
    path.relative(repo, file).replaceAll('\\', '/'),
    sha256(fs.readFileSync(file)),
  ]),
);
const startedAt = new Date().toISOString();
const head = gitRead('rev-parse', 'HEAD');
const branch = gitRead('branch', '--show-current');
const statusAtStart = gitRead('status', '--short');
const measurements = candidates.map((candidate) =>
  measure(snapshot, candidate),
);
const finishedAt = new Date().toISOString();
const hashesAfter = Object.fromEntries(
  loadedRepositoryFiles.map((file) => [
    path.relative(repo, file).replaceAll('\\', '/'),
    sha256(fs.readFileSync(file)),
  ]),
);
const changedDuringRun = Object.keys(hashesBefore).filter(
  (file) => hashesBefore[file] !== hashesAfter[file],
);
if (changedDuringRun.length)
  throw Error(
    'Source files changed while running: ' + changedDuringRun.join(', '),
  );
for (const row of measurements) {
  if (
    row.samples.length !== 6 ||
    row.samples.some((s) => s.ticks !== TICKS || !Number.isFinite(s.dps))
  ) {
    throw Error('Unexpected measurement sample/tick count');
  }
}

function combinations(splitCost) {
  const rows = [];
  for (let mask = 0; mask < 2 ** initialOffers.length; mask++) {
    const cards = initialOffers
      .filter((_, i) => mask & (1 << i))
      .map((o) => o.id);
    const cost = costOf(cards, splitCost);
    if (
      cards.length <= 4 &&
      cost <= 6 &&
      validateCards(cards, snapshot.content)
    ) {
      rows.push({ cards, cost, remaining: 6 - cost, slotsUsed: cards.length });
    }
  }
  return rows;
}
const currentCombinations = combinations(3);
const hypotheticalCombinations = combinations(2);
const combinationKey = (row) => [...row.cards].sort((a,b)=>a.localeCompare(b)).join('|');
const currentKeys = new Set(currentCombinations.map(combinationKey));
const newlyFeasible = hypotheticalCombinations.filter(
  (row) => !currentKeys.has(combinationKey(row)),
);
const countSummary = (rows) => ({
  includingEmpty: rows.length,
  nonempty: rows.filter((row) => row.cards.length).length,
  spendingExactlySix: rows.filter((row) => row.cost === 6).length,
  containingFireSplit: rows.filter((row) => row.cards.includes('fire-split'))
    .length,
  bySlotsUsed: Object.fromEntries(
    [0, 1, 2, 3, 4].map((slots) => [
      slots,
      rows.filter((row) => row.slotsUsed === slots).length,
    ]),
  ),
});
const priceSensitivity = {
  description:
    'Enumeration only: change fire-split price from 3 to 2; budget 6, at most 4 unique cards, initial unlock-zero catalog, dependencies enforced. No combat coefficients change.',
  initialOffers,
  budget: 6,
  slots: 4,
  current: {
    fireSplitCost: 3,
    counts: countSummary(currentCombinations),
    combinations: currentCombinations,
  },
  hypothetical: {
    fireSplitCost: 2,
    counts: countSummary(hypotheticalCombinations),
    combinations: hypotheticalCombinations,
  },
  newlyFeasible,
  inferenceBoundary:
    'A cheaper price increases feasible combinations. For an unchanged equipped card set, measure() does not use offer prices, so this alone is not evidence of combat balance improvement.',
};
const spread = (row, scene) => {
  const values = row.samples.filter((s) => s.scene === scene).map((s) => s.dps);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    mean,
    min: Math.min(...values),
    max: Math.max(...values),
    perSeed: values,
  };
};
const summaryRows = measurements.map((row) => ({
  id: row.candidate.id,
  label: row.candidate.label,
  cards: row.candidate.cards.map((id) => ({
    id,
    name: CARDS.find((c) => c.id === id).name,
    cost: offerById.get(id).cost,
  })),
  energyCost: costOf(row.candidate.cards),
  single: spread(row, 'single'),
  swarm: spread(row, 'swarm'),
  reactionsTotal: row.samples.reduce((sum, s) => sum + s.reactions, 0),
  ticksPerSample: row.samples.map((s) => s.ticks),
  ticksTotal: row.samples.reduce((sum, s) => sum + s.ticks, 0),
  poolMissesTotal: row.samples.reduce((sum, s) => sum + s.poolMisses, 0),
  castsPerSample: row.samples.map((s) => ({
    scene: s.scene,
    seed: s.seed,
    ...s.casts,
  })),
  activeSynergies: row.synergies,
}));
const limitations = [
  'This is coach-range-2 automated deterministic simulation, not human play, a live level, or a win-rate measurement.',
  'Each scene runs 720 fixed ticks at 60 Hz (12 simulated seconds), three fixed seeds; only six samples per build.',
  'Arc weapon, level 3, no relics, forms [arc], offered [], source camp, exact DEFAULT_TRIAL.content captured here.',
  'One stationary sentry or eight tightly clustered stationary sentries with 100,000,000 HP, zero speed, zero damage, suppressed attack timers. No kills, moving-target test, or survival pressure.',
  'Player is stationary at (640,430), aims at (640,350), fires continuously, requests Q and E every tick so they cast when available, and never dashes. DPS includes skills, statuses, and reactions.',
  'Blocks and zones are removed. Target positions are reset each tick, suppressing spatial consequences of knockback, attraction, and crowd control.',
  'Swarm DPS is total damage across all eight targets divided by 12 seconds, not per-target DPS.',
  'The seeds vary random rolls in the same geometry and input policy; they are not independent players or a representative gameplay distribution.',
  'Zero projectile pool misses only checks pool capacity under these fixed workloads; it is not browser FPS, renderer performance, or a general stress-test result.',
  'The three six-energy builds are selected examples, not exhaustive build optimization. A stationary target does not adequately value slowing, homing, mobility, terrain, or robustness to aim errors.',
  'Price sensitivity is a combinatorial enumeration with unchanged combat content. More legal loadouts is not evidence that those loadouts are balanced or that the game is more fun.',
];
const raw = {
  schemaVersion: 1,
  experiment: 'arc-shift-six-energy-coach-range-20260918',
  startedAt,
  finishedAt,
  provenance: {
    repository: repo,
    branch,
    head,
    statusAtStart,
    nodeVersion: process.version,
    gameVersion: GAME_VERSION,
    contentVersionLabel: CONTENT_VERSION,
    scenarioVersion: SCENARIO_VERSION,
    sourceHashesBefore: hashesBefore,
    sourceHashesAfter: hashesAfter,
    changedDuringRun,
    scriptSha256: sha256(fs.readFileSync(__filename)),
    snapshotSha256: sha256(JSON.stringify(snapshot)),
    trialSha256: sha256(JSON.stringify(trial)),
  },
  scenario: {
    seeds: [...SEEDS],
    ticksPerSample: TICKS,
    dt: 1 / 60,
    durationSeconds: TICKS / 60,
    player: {
      x: 640,
      y: 430,
      aimX: 640,
      aimY: 350,
      fire: true,
      q: true,
      e: true,
      dash: false,
    },
    singleTargets: [[640, 350]],
    swarmTargets: [
      [640, 350],
      [604, 342],
      [676, 342],
      [568, 330],
      [712, 330],
      [592, 304],
      [688, 304],
      [640, 280],
    ],
    targets: {
      kind: 'sentry',
      hp: 1e8,
      maxHp: 1e8,
      speed: 0,
      damage: 0,
      stateResetEachTick: 'recover',
      timerResetEachTick: 1e6,
    },
  },
  snapshot,
  trial,
  measurements,
  priceSensitivity,
  limitations,
};
const rawFile = path.join(outDir, 'numeric-experiment.raw.json');
fs.writeFileSync(rawFile, JSON.stringify(raw, null, 2) + '\n');
const summary = {
  experiment: raw.experiment,
  startedAt,
  finishedAt,
  scenarioVersion: SCENARIO_VERSION,
  rawFile,
  rawSha256: sha256(fs.readFileSync(rawFile)),
  rows: summaryRows,
  aggregate: {
    builds: measurements.length,
    samples: measurements.reduce((sum, row) => sum + row.samples.length, 0),
    ticks: summaryRows.reduce((sum, row) => sum + row.ticksTotal, 0),
    poolMisses: summaryRows.reduce((sum, row) => sum + row.poolMissesTotal, 0),
  },
  priceSensitivity: {
    current: priceSensitivity.current.counts,
    hypothetical: priceSensitivity.hypothetical.counts,
    newlyFeasible,
  },
  limitations,
};
const summaryFile = path.join(outDir, 'numeric-experiment.summary.json');
fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      rawFile,
      summaryFile,
      aggregate: summary.aggregate,
      rows: summary.rows.map((r) => ({
        id: r.id,
        single: r.single.mean,
        swarm: r.swarm.mean,
      })),
    },
    null,
    2,
  ),
);
