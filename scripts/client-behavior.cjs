require('./ts-register.cjs');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const sourceRoot = path.resolve(process.argv[2] || '.');
const label = process.argv[3] || 'current';
if (!/^[a-z0-9-]+$/i.test(label)) throw Error('Invalid label');
const { Engine } = require(path.join(sourceRoot, 'src/game/engine.ts'));
const { blankSave } = require(path.join(sourceRoot, 'src/core/save.ts'));
const { configureStress, stressInput } = require(path.join(sourceRoot, 'src/dev/benchmark.ts'));
const { checksum } = require(path.join(sourceRoot, 'src/replay/replay.ts'));
const records = [];
for (const weapon of ['arc', 'sword', 'cannon']) {
  for (const mode of ['grid', 'brute']) {
    const engine = new Engine({save:blankSave(),persistence:false});
    const w = configureStress(engine,40,73129);
    w.collisionMode=mode; w.weapon=weapon; w.forms=[weapon];
    for(const e of w.enemies) e.hp=e.maxHp=24;
    const events=[]; w.bus.on(e=> {if(['kill','pickup','crit','hurt'].includes(e.kind))events.push(e);});
    const checkpoints=[];
    for(let tick=0;tick<1200;tick++){
      engine.update(1/60,stressInput(tick));
      if((tick+1)%120===0)checkpoints.push({tick:tick+1,checksum:checksum(engine),damage:w.totalDamage,kills:w.kills,wallet:{...w.wallet},pickups:structuredClone(w.pickups)});
    }
    assert(w.kills>0,'Fixture must exercise death and drops');
    records.push({weapon,mode,checkpoints,events,final:{kills:w.kills,damage:w.totalDamage,wallet:{...w.wallet},rng:w.rng.seed}});
  }
}
for(const weapon of ['arc','sword','cannon']){
  const [grid,brute]=records.filter(r=>r.weapon===weapon);
  assert.deepEqual(grid.checkpoints,brute.checkpoints);
  assert.deepEqual(grid.events,brute.events);
}
fs.mkdirSync('outputs/client-showcase',{recursive:true});
fs.writeFileSync(`outputs/client-showcase/behavior-${label}.json`,JSON.stringify({sourceRoot,method:'3 weapons, 40 killable enemies, seed73129,1200 fixed steps, grid/brute oracle, 120-tick checksums and raw kill/pickup/critical/hurt events. No renderer.',records},null,2));
console.log(JSON.stringify(records.map(r=>({weapon:r.weapon,mode:r.mode,...r.final}))));
