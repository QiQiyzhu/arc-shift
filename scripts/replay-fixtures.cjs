require('./ts-register.cjs');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { Engine } = require('../src/game/engine.ts');
const { blankSave, parseSave } = require('../src/core/save.ts');
const { ReplayRecorder, exportReplay, FIXED_DT } = require('../src/replay/replay.ts');
const { stressInput } = require('../src/dev/benchmark.ts');
const { makeRoom } = require('../src/rooms/generator.ts');
const { expedition, availableNodes } = require('../src/rooms/expedition.ts');
// Never regenerate expected checksums as part of a test or CI invocation.
if (!process.argv.includes('--write-reviewed-fixtures')) throw Error('Explicit --write-reviewed-fixtures required; inspect the resulting diff.');
const dir = 'tests/fixtures/replays';
fs.mkdirSync(dir, { recursive: true });
const create = () => new Engine({ save: blankSave(), persistence: false });
const evidence = [];
for (const name of ['combat', 'boss', 'shop-route']) {
  const engine = create();
  let initial = blankSave(), mode = 'new-run';
  if (name !== 'combat') {
    engine.start(513); engine.chooseCard(engine.world.rewards[0].id);
    if (name === 'boss') {
      engine.world.campaign = 'legacy'; engine.enter(makeRoom(4, 'boss', 513));
    } else {
      const graph = expedition(513), node = graph.find(n => n.room.kind === 'shop');
      const path = id => { const n = graph.find(n => n.id === id); return n.depth === 1 ? [id] : [...path(graph.find(p => p.next.includes(id)).id), id]; };
      engine.world.route = path(node.id); engine.enter(node.room);
      engine.world.wallet = { coins: 100, keys: 3, bombs: 3, tonics: 1, shards: 8 };
    }
    engine.checkpoint(); initial = parseSave(JSON.stringify(engine.save)); mode = 'checkpoint';
  }
  const recorder = new ReplayRecorder(engine, 513, initial, mode, 120);
  if (name === 'combat') engine.chooseCard(engine.world.rewards[0].id);
  if (name === 'boss') { engine.pause(); engine.update(FIXED_DT, stressInput(0)); engine.pause(); }
  if (name === 'shop-route') {
    engine.buy('bomb'); engine.bankShards(); engine.resolveEvent('leave');
    engine.travel(availableNodes(engine.world.seed, engine.world.room.nodeId)[0].id);
  }
  for (let tick = 0; tick < 600; tick++) engine.update(FIXED_DT, stressInput(tick));
  const replay = recorder.stop();
  fs.writeFileSync(`${dir}/${name}.json`, exportReplay(replay));
  evidence.push({ name, durationTicks: replay.durationTicks, events: replay.events.length, finalChecksum: replay.events.at(-1).checksum });
}
fs.writeFileSync(`${dir}/provenance.json`, JSON.stringify({
  generatedAt: new Date().toISOString(), sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sourceDirty: !!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(),
  method: 'AI-authored deterministic scenarios generated once from the current source. Tests consume committed histories; no regeneration in CI. Not player recordings.', evidence,
}, null, 2));
console.log(JSON.stringify(evidence));
