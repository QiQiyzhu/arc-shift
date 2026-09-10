require('./ts-register.cjs');
const fs = require('node:fs');
const os = require('node:os');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { Engine } = require('../src/game/engine.ts');
const { blankSave } = require('../src/core/save.ts');
const { configureStress, stressInput } = require('../src/dev/benchmark.ts');
const { checksum } = require('../src/replay/replay.ts');
const long = process.argv.includes('--long');
const ticks = long ? 108000 : 3600;
const seeds = long ? [17, 293, 701, 991, 4211, 73009] : [17, 293, 701];
function finiteTree(value, trail = 'state') {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), `Non-finite ${trail}`);
  else if (Array.isArray(value)) value.forEach((v, i) => finiteTree(v, `${trail}[${i}]`));
  else if (value && typeof value === 'object' && !(value instanceof Set))
    for (const [key, child] of Object.entries(value)) finiteTree(child, `${trail}.${key}`);
}
const report = {
  recordedAt: new Date().toISOString(), sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sourceDirty: !!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(),
  environment: { node: process.version, platform: process.platform, cpu: os.cpus()[0].model },
  method: 'Fixed 60 Hz headless simulation, high-HP enemy fixtures, invulnerable practice player; no rendering, no real-time waiting. Heap snapshots are observed process memory, not a leak verdict. Other workloads may be active.',
  mode: long ? 'long' : 'smoke', samples: [], passed: false,
};
let failure;
try {
  for (const seed of seeds) {
    const engine = new Engine({ save: blankSave(), persistence: false });
    const w = configureStress(engine, 28, seed);
    const start = performance.now();
    const sample = { seed, requestedTicks: ticks, completedTicks: 0, simulatedSeconds: 0,
      elapsedMs: 0, peak: { enemies: 0, projectiles: 0, hazards: 0 }, heap: [], poolMisses: 0, finalChecksum: '' };
    report.samples.push(sample);
    for (let tick = 0; tick < ticks; tick++) {
      engine.update(1 / 60, stressInput(tick));
      sample.completedTicks++; sample.simulatedSeconds = sample.completedTicks / 60;
      sample.peak.enemies = Math.max(sample.peak.enemies, w.enemies.length);
      sample.peak.projectiles = Math.max(sample.peak.projectiles, w.projectiles.count);
      sample.peak.hazards = Math.max(sample.peak.hazards, w.hazards.length);
      if (tick % 600 === 0 || tick === ticks - 1) {
        finiteTree([w.player, w.enemies, w.projectiles.items, w.hazards, w.pickups]);
        assert.equal(w.phase, 'playing');
        assert.equal(w.projectiles.items.length, w.projectiles.capacity);
        assert.ok(w.enemies.length <= 300 && w.hazards.length <= 1024 && w.pickups.length <= 1024, 'Unbounded entity growth');
        assert.equal(w.tick, tick + 1);
      }
      if (tick % 3600 === 0 || tick === ticks - 1) sample.heap.push({ tick: tick + 1, ...process.memoryUsage() });
    }
    sample.elapsedMs = performance.now() - start;
    sample.poolMisses = w.projectiles.misses;
    sample.finalChecksum = checksum(engine);
    console.log(`seed=${seed} ticks=${ticks} wallMs=${sample.elapsedMs.toFixed(1)} checksum=${sample.finalChecksum}`);
  }
  report.passed = true;
} catch (error) { failure = error; report.error = String(error.stack || error); }
fs.mkdirSync('docs/qa/engineering', { recursive: true });
fs.writeFileSync(`docs/qa/engineering/soak-${report.mode}.json`, JSON.stringify(report, null, 2));
if (failure) throw failure;
