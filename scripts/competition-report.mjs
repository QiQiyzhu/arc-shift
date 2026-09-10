import fs from 'node:fs';
const root = 'docs/qa/competition-v3';
const candidate = process.argv[2] || 'after';
const median = (values) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const read = (label) =>
  JSON.parse(fs.readFileSync(`${root}/${label}.json`, 'utf8'));
const rows = [];
for (const terrain of [false, true]) {
  const before = read(terrain ? 'before-terrain' : 'before'),
    after = read(terrain ? 'after-terrain' : candidate);
  for (const count of terrain ? [100] : [28, 100, 250]) {
    const summarize = (record) => {
      const samples = record.records.filter((r) => r.count === count);
      return {
        p95MedianMs: median(samples.map((r) => r.frameMs.p95)),
        p95RangeMs: [
          Math.min(...samples.map((r) => r.frameMs.p95)),
          Math.max(...samples.map((r) => r.frameMs.p95)),
        ],
        p99MedianMs: median(samples.map((r) => r.frameMs.p99)),
        slowFrames33Median: median(samples.map((r) => r.slowFrames33)),
        simulatedTicks: samples.map((r) => r.simulatedTicks),
        updateP95MedianMs: median(samples.map((r) => r.updateMs.p95)),
        renderer: samples[0].renderer,
      };
    };
    const b = summarize(before),
      a = summarize(after);
    rows.push({
      count,
      terrain,
      before: b,
      after: a,
      p95ReductionPercent:
        ((b.p95MedianMs - a.p95MedianMs) / b.p95MedianMs) * 100,
    });
  }
}
const report = {
  candidate,
  generatedAt: new Date().toISOString(),
  method:
    'Medians of three within-run P95 samples; sequential before/after on one device, not randomized. Fixed 5s wall duration with simulated ticks reported. Full effects in both modes. Actual renderer and source hashes are in each raw file.',
  rows,
};
fs.writeFileSync(
  `${root}/${candidate === 'after' ? 'comparison' : `comparison-${candidate}`}.json`,
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
