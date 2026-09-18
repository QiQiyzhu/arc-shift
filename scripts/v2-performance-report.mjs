import fs from 'node:fs';
import assert from 'node:assert/strict';
const before=JSON.parse(fs.readFileSync('outputs/client-showcase/v2-before/results.json','utf8'));
const after=JSON.parse(fs.readFileSync('outputs/client-showcase/v2-final/results.json','utf8'));
const median=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)];
assert.equal(before.records.length,9);assert.equal(after.records.length,9);
const rows=[];
for(const [count,terrain] of [[28,false],[100,true],[250,false]]){
 const a=before.records.filter(r=>r.count===count&&r.terrain===terrain),b=after.records.filter(r=>r.count===count&&r.terrain===terrain);
 for(const sample of [...a,...b]){assert.equal(sample.worldTicks,720);assert.equal(sample.measuredTicks,600);assert.equal(sample.poolMisses,0);assert.deepEqual(sample.final,a[0].final);}
 const summarize=rs=>({p50:median(rs.map(r=>r.summary.interval.p50)),p95:median(rs.map(r=>r.summary.interval.p95)),p99:median(rs.map(r=>r.summary.interval.p99)),slow33:median(rs.map(r=>r.slow33)),simulationP95:median(rs.map(r=>r.stepMs.p95)),renderP95:median(rs.map(r=>r.summary.renderSubmitMs.p95)),hudAudioP95:median(rs.map(r=>r.summary.hudAndAudioMs.p95)),presentationP95:median(rs.map(r=>r.summary.prepareMs.p95))});
 rows.push({count,terrain,before:summarize(a),after:summarize(b),identicalFinal:a[0].final});
}
const summary={environment:after.environment,browserVersion:after.browserVersion,rows,limits:['Sequential before/after batches, not randomized interleaved comparisons. Single device, three repetitions per workload.','DEV headless Edge, CPU submission and postrender intervals, not GPU duration or player FPS. Background OS activity not fully controlled.','Exactly 120 warmup + 600 measured world ticks, matching damage/RNG/events/wallet/checksum; additional raster art and animation are presentation-only.','A brief independent screenshot browser overlapped the opening baseline sample; raw per-run values retained, no statistical significance or universal improvement claim.','Synthetic high-HP pressure fixture; kill/drop behavior validated separately.','Separate tracing before/after the v2 drawing correction captures CPU/allocations/GC with tracing overhead; main throughput table is unprofiled.']};
fs.writeFileSync('outputs/v2/performance-summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(rows));
