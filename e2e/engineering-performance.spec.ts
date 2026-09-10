import { test, expect } from '@playwright/test';
import fs from 'node:fs';
for(const count of [28,100,250]) test(`engineering stress ${count} enemies`,async({page})=>{
  await page.goto('/?qa');
  await page.getByRole('button',{name:'开始行动',exact:true}).waitFor();
  const result=await page.evaluate(async count=>{
    // @ts-expect-error Vite serves this development-only module by URL.
    const {configureStress,stressInput,percentiles}=await import('/src/dev/benchmark.ts');
    const engine=window.arcQA.engine,w=configureStress(engine,count);
    const original=engine.update.bind(engine),updates:number[]=[];let tick=0,maxProjectiles=0;
    engine.update=(dt)=>{const begin=performance.now();original(dt,stressInput(tick++));updates.push(performance.now()-begin);};
    const frames:number[]=[];let previous=performance.now();const start=previous;
    await new Promise<void>(resolve=>{function frame(now:number){frames.push(now-previous);previous=now;maxProjectiles=Math.max(maxProjectiles,w.projectiles.count);if(now-start<10000)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
    engine.update=original;
    const memory=(performance as Performance & {memory?:{usedJSHeapSize:number,totalJSHeapSize:number,jsHeapSizeLimit:number}}).memory;
    return{enemies:count,finalEnemies:w.enemies.length,maxProjectiles,poolMisses:w.projectiles.misses,frameTimeMs:percentiles(frames),engineUpdateMs:percentiles(updates),fps:frames.length*1000/(previous-start),sampleMs:previous-start,queries:{...w.queries},heap:memory?{usedJSHeapSize:memory.usedJSHeapSize,totalJSHeapSize:memory.totalJSHeapSize,jsHeapSizeLimit:memory.jsHeapSizeLimit}:'unavailable',objectCount:'unavailable',userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight]};
  },count);
  const label=process.env.ARC_BENCH_LABEL||'current';fs.mkdirSync('docs/qa/engineering',{recursive:true});
  fs.writeFileSync(`docs/qa/engineering/browser-${label}-${count}.json`,JSON.stringify({recordedAt:new Date().toISOString(),methodology:'Headless browser rAF, actual renderer; fixed simulated input, high HP stress fixture, other project agents active',...result},null,2));
  expect(result.finalEnemies).toBe(count);expect(result.poolMisses).toBe(0);expect(result.fps).toBeGreaterThan(0);
});
