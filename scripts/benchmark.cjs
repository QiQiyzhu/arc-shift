require('./ts-register.cjs');
const fs = require('node:fs');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { Engine } = require('../src/game/engine.ts');
const { configureStress, stressInput, percentiles } = require('../src/dev/benchmark.ts');
const label = process.argv[2] || 'baseline';
const samples=[];
for(const count of [28,100,250]) {
  const engine=new Engine(), w=configureStress(engine,count);
  const times=[]; let maxProjectiles=0;
  for(let tick=0;tick<1800;tick++) {
    const input=stressInput(tick), begin=performance.now();
    engine.update(1/60,input);
    if(tick>=300) times.push(performance.now()-begin);
    else w.queries.separation=w.queries.projectile=0;
    maxProjectiles=Math.max(maxProjectiles,w.projectiles.count);
  }
  samples.push({enemies:count,measuredTicks:times.length,warmupTicks:300,engineUpdateMs:percentiles(times),
    queries:{...w.queries},maxProjectiles,poolMisses:w.projectiles.misses,
    heap:process.memoryUsage(),objectCount:'unavailable',browserFps:'unavailable: Node simulation',
    finalState:{damage:w.totalDamage,rng:w.rng.seed,enemyPositions:w.enemies.map(e=>[e.id,e.x,e.y,e.hp])}});
}
fs.mkdirSync('docs/qa/engineering',{recursive:true});
const result={label,recordedAt:new Date().toISOString(),sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  sourceDirty:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).length>0,
  environment:{platform:process.platform,node:process.version,cpu:os.cpus()[0].model},
  methodology:'Fixed seed, 5s warm-up +25s measured simulation; real AI/mixed weapons, high HP fixture; Node does not render. Other project agents active; repeat timings for causal claims.',samples};
fs.writeFileSync(`docs/qa/engineering/engine-${label}.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify(samples.map(({finalState: _finalState,...sample})=>sample)));
