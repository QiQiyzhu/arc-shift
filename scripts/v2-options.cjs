require('./ts-register.cjs');
const fs = require('node:fs');
const { DEFAULT_TRIAL: c } = require('../src/trial/config.ts');
const records = [];
for (const budget of [5,7,8,9,10,11,12,14]) {
 const builds=[];
 for(let mask=1;mask<(1<<c.offers.length);mask++) {
  const offers=c.offers.filter((_,i)=>(mask>>i)&1);
  const cost=offers.reduce((s,o)=>s+o.cost,0);
  if(offers.length>c.slots || cost>budget)continue;
  if(offers.some(o=>{const required=c.content.cards.find(r=>r.id===o.id).requires;return required&&!offers.some(p=>p.id===required);}))continue;
  builds.push({cards:offers.map(o=>o.id),cost});
 }
 records.push({budget,count:builds.length,builds});
}
fs.mkdirSync('outputs/v2',{recursive:true});
fs.writeFileSync('outputs/v2/options.json',JSON.stringify({config:c,stage:2,nonempty:true,records},null,2));
console.log(JSON.stringify(records.map(({budget,count})=>({budget,count}))));
