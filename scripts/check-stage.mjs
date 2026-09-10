import fs from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
const stage=process.argv[2];
if(!/^[a-z0-9-]+$/.test(stage||'')) throw Error('Provide a stage label');
const dir=`docs/qa/engineering/${stage}`;
fs.mkdirSync(dir,{recursive:true});
const checks=[];
for(const command of ['npm run typecheck','npm run lint',`npm test -- --reporter=json --outputFile=${dir}/unit.json`,'npm run test:e2e','npm run build']) {
  const begin=Date.now();
  const r=spawnSync(command,{shell:true,encoding:'utf8',maxBuffer:20*1024*1024});
  const name=command.startsWith('npm test ')?'unit':command.split(' ')[2].replaceAll(':','-');
  fs.writeFileSync(`${dir}/${name}.log`,r.stdout+'\n'+r.stderr);
  checks.push({command,exitCode:r.status,elapsedMs:Date.now()-begin});
  console.log(command,r.status);
  if(name==='test-e2e'&&fs.existsSync('outputs/qa/browser-results.json')) {
    const raw=JSON.parse(fs.readFileSync('outputs/qa/browser-results.json','utf8'));
    fs.writeFileSync(`${dir}/browser.json`,JSON.stringify({stats:raw.stats,suites:raw.suites},null,2));
  }
  if(r.status!==0)break;
}
const bundles=fs.existsSync('dist/assets')?fs.readdirSync('dist/assets').filter(x=>/\.(js|css)$/.test(x)).map(name=>{
  const data=fs.readFileSync(`dist/assets/${name}`);return{name,bytes:data.length,gzipBytes:gzipSync(data).length};
}):[];
fs.writeFileSync(`${dir}/checks.json`,JSON.stringify({stage,recordedAt:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),checks,bundles},null,2));
if(checks.length!==5||checks.some(x=>x.exitCode!==0))process.exitCode=1;
