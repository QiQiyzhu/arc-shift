const fs = require('node:fs');
const assert = require('node:assert/strict');
const root = 'docs/qa/engineering/';
const read = name => JSON.parse(fs.readFileSync(root + name, 'utf8'));
const baseline = read('engine-baseline.json');
const after = read('engine-spatial-final.json');
const comparison = baseline.samples.map((before, i) => {
  const current = after.samples[i];
  assert.deepEqual(current.finalState, before.finalState);
  return { enemies: before.enemies, finalStateEqual: true,
    separationReduction: 1-current.queries.separation/before.queries.separation,
    projectileReduction: 1-current.queries.projectile/before.queries.projectile,
    before: before.engineUpdateMs, after: current.engineUpdateMs };
});
const profiles = {};
for (const mode of ['brute','grid']) {
  const profile = JSON.parse(fs.readFileSync(`outputs/qa/${mode}.cpuprofile`, 'utf8'));
  const nodes = new Map(profile.nodes.map(n=>[n.id,n]));
  const totals = new Map(); let totalUs=0;
  for(let i=0;i<profile.samples.length;i++) {
    const us=profile.timeDeltas[i], n=nodes.get(profile.samples[i]); totalUs+=us;
    const name=`${n.callFrame.functionName||'(anonymous)'} @ ${n.callFrame.url.replaceAll('\\','/').split('/').slice(-2).join('/')}:${n.callFrame.lineNumber+1}`;
    totals.set(name,(totals.get(name)||0)+us);
  }
  profiles[mode] = {totalSampleMs:totalUs/1000,method:'Node V8 sampled self time. Includes TS module compilation/startup and all three workloads; profiling overhead and concurrent tests affect timing.',
    top:[...totals].sort((a,b)=>b[1]-a[1]).slice(0,25).map(([name,us])=>({name,selfMs:us/1000,percent:us/totalUs*100}))};
}
fs.writeFileSync(root+'spatial-comparison.json',JSON.stringify({recordedAt:new Date().toISOString(),comparison,profiles},null,2));
console.log(JSON.stringify({comparison,profiles},null,2));
