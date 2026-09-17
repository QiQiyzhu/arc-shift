import fs from 'node:fs';
const root = process.argv[2];
if (!root) throw Error('Pass profile directory');
const cpu = JSON.parse(fs.readFileSync(`${root}/cpu.cpuprofile`, 'utf8'));
const lookup = new Map(cpu.nodes.map((n) => [n.id, n]));
const self = new Map();
for (let i = 0; i < cpu.samples.length; i++) {
  const n = lookup.get(cpu.samples[i]),
    f = n.callFrame;
  const key = `${f.functionName || '(anonymous)'} | ${f.url}:${f.lineNumber + 1}`;
  self.set(key, (self.get(key) || 0) + (cpu.timeDeltas[i] || 0));
}
const heap = JSON.parse(
  fs.readFileSync(`${root}/allocations.heapprofile`, 'utf8'),
);
const allocations = [];
function visit(n) {
  if (n.selfSize)
    allocations.push({
      fn: n.callFrame.functionName,
      url: n.callFrame.url,
      line: n.callFrame.lineNumber + 1,
      bytes: n.selfSize,
    });
  for (const c of n.children || []) visit(c);
}
visit(heap.head);
const events = JSON.parse(
  fs.readFileSync(`${root}/browser.trace.json`, 'utf8'),
).traceEvents;
const start = events.find((e) => e.name === 'arc-measure-start'),
  end = events.find((e) => e.name === 'arc-measure-end');
const range = events.filter(
  (e) => e.ts >= (start?.ts ?? -Infinity) && e.ts <= (end?.ts ?? Infinity),
);
const gc = range.filter(
  (e) => e.ph === 'X' && ['MinorGC', 'MajorGC'].includes(e.name),
);
const summary = {
  note: 'CPU/heap samples include setup and warmup; GC complete events restricted to marked measurement interval. Sampled bytes are allocation estimates, not retained heap or exact object counts. GC total uses outer MinorGC/MajorGC events only.',
  markers: { start: start?.ts, end: end?.ts },
  topCpuSelfMs: [...self]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([frame, us]) => ({ frame, ms: us / 1000 })),
  topSampledAllocations: allocations
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 25),
  gc: {
    count: gc.length,
    totalMs: gc.reduce((s, e) => s + e.dur / 1000, 0),
    maxMs: Math.max(0, ...gc.map((e) => e.dur / 1000)),
    events: gc.map((e) => ({
      name: e.name,
      ts: e.ts,
      dur: e.dur,
      pid: e.pid,
      tid: e.tid,
    })),
  },
};
fs.writeFileSync(
  `${root}/profile-summary.json`,
  JSON.stringify(summary, null, 2),
);
console.log(
  JSON.stringify(
    {
      cpu: summary.topCpuSelfMs.slice(0, 10),
      allocation: summary.topSampledAllocations.slice(0, 8),
      gc: { ...summary.gc, events: undefined },
    },
    null,
    2,
  ),
);
