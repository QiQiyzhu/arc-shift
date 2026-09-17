import fs from 'node:fs';
import assert from 'node:assert/strict';
const file='outputs/client-showcase/paired-final/results.json';
const raw=JSON.parse(fs.readFileSync(file,'utf8'));
assert.equal(raw.records.length,18);
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const rows=[];
for(const [count,terrain] of [[28,false],[100,true],[250,false]]){
  const samples=raw.records.filter(r=>r.count===count&&r.terrain===terrain);
  assert.equal(samples.length,6);
  for(const r of samples){assert.equal(r.worldTicks,720);assert.equal(r.measuredTicks,600);assert.equal(r.poolMisses,0);assert.deepEqual(r.final,samples[0].final);}
  const group=legacy=>{
    const rs=samples.filter(r=>r.legacy===legacy);assert.equal(rs.length,3);
    return {frameP50:median(rs.map(r=>r.summary.interval.p50)),frameP95:median(rs.map(r=>r.summary.interval.p95)),frameP99:median(rs.map(r=>r.summary.interval.p99)),slow33:median(rs.map(r=>r.slow33)),slow50:median(rs.map(r=>r.slow50)),engineP95:median(rs.map(r=>r.stepMs.p95)),renderSubmitP95:median(rs.map(r=>r.summary.renderSubmitMs.p95)),graphicsP95:median(rs.map(r=>r.summary.graphicsRenderMs.p95)),prepareP95:median(rs.map(r=>r.summary.prepareMs.p95)),effectsPrepareP95:median(rs.map(r=>r.summary.effectDrawMs.p95)),effectEmissionP95:median(rs.map(r=>r.summary.effectEmissionMs.p95)),hudAudioP95:median(rs.map(r=>r.summary.hudAndAudioMs.p95)),hudCommits:rs.map(r=>r.hudCommits),textUploads:rs.map(r=>r.summary.textTextureUploads.total),frames:rs.map(r=>r.frames.length),worldTicks:rs.map(r=>r.worldTicks),droppedMs:rs.map(r=>r.droppedMs),frameP95Range:[Math.min(...rs.map(r=>r.summary.interval.p95)),Math.max(...rs.map(r=>r.summary.interval.p95))]};
  };
  const before=group(true),after=group(false);
  rows.push({count,terrain,before,after,frameP95Reduction:1-after.frameP95/before.frameP95,exactBehaviorMatch:samples[0].final});
}
const beforeBehavior=JSON.parse(fs.readFileSync('outputs/client-showcase/behavior-baseline.json','utf8'));
const afterBehavior=JSON.parse(fs.readFileSync('outputs/client-showcase/behavior-after.json','utf8'));
assert.deepEqual(beforeBehavior.records,afterBehavior.records);
const profiles=Object.fromEntries(['baseline-profile','after-profile'].map(label=>{const p=JSON.parse(fs.readFileSync(`outputs/client-showcase/${label}/profile-summary.json`));return [label,{gcCount:p.gc.count,gcTotalMs:p.gc.totalMs,gcMaxMs:p.gc.maxMs,topCpuSelfMs:p.topCpuSelfMs.slice(0,12),topSampledAllocations:p.topSampledAllocations.slice(0,12)}];}));
const result={recordedAt:new Date().toISOString(),environment:raw.environment,browserVersion:raw.browserVersion,method:raw.method,raw:file,rows,profiles,killAndLootOracle:'Baseline 0567590 sources and current sources match exactly for all three weapons, both grid/brute paths, all ten periodic checkpoints per run and event streams.',excluded:[{file:'outputs/client-showcase/after/results.json',repeat:0,count:100,reason:'Async terrain module loading after world reset allowed three uncontrolled fixed steps; elapsed12.05. Not used in final paired comparison. Subsequent harness resolves imports first and asserts actual worldTicks720.'}],limits:['One device; 3 paired repetitions per workload, controlled synthetic input; no human feedback or statistical significance claim.','Headless Edge, Vite DEV with the same QA instrumentation in both retained rendering paths; not production FPS or GPU timing.','Intervals are postrender-to-postrender; renderSubmit is synchronous CPU submission including graphicsRender; GPU execution remains unmeasured.','Engine timing includes synchronous effect emissions; preparation timings exclude WebGL rendering; hudAndAudio is the frame-end signature/audio callback, not React commit duration. CPU profiles separately include React work.','Profiles include setup/warmup and tracing/sampling overhead; GC numbers restricted to marked sample. GC total time worsened in the profiled optimized run: do not claim a GC-time improvement or use sampled allocation estimates as retained memory.','Frame counts may increase when render work becomes cheaper. World steps remain exactly720 including120 warmup in every accepted sample; damage, RNG, event streams, wallet and checksums match.','Pressure fixture has high-HP enemies; kill/loot behavior is checked separately with killable enemies against the original source and brute-force collision path.']};
fs.writeFileSync('outputs/client-showcase/comparison.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(rows.map(r=>({enemies:r.count,terrain:r.terrain,p95:[r.before.frameP95,r.after.frameP95],slow33:[r.before.slow33,r.after.slow33],change:r.frameP95Reduction})),null,2));
