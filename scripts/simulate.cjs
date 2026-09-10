// Full-run rules benchmark: exact world knowledge, legal input and reward choices.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = process.cwd();
const ts = require('typescript');
// Isolated benchmark process only: transpile the existing extensionless TS modules in memory.
// oxlint-disable-next-line typescript/no-deprecated
require.extensions['.ts'] = (module, file) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    file,
  );
const { Engine } = require(path.join(root, 'src/game/engine.ts'));
const { roomChoices } = require(path.join(root, 'src/rooms/generator.ts'));
const { laserGeometry } = require(path.join(root, 'src/combat/geometry.ts'));
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, v),
};
const nil = {
  x: 0,
  y: 0,
  aimX: 640,
  aimY: 300,
  fire: false,
  dash: false,
  q: false,
  e: false,
};
function clean(seed) {
  store.clear();
  const e = new Engine();
  e.selectWeapon(weapon);
  e.start(seed);
  return e;
}
function segmentDist(px, py, a, b, c, d) {
  const dx = c - a,
    dy = d - b,
    t = Math.max(
      0,
      Math.min(1, ((px - a) * dx + (py - b) * dy) / (dx * dx + dy * dy || 1)),
    );
  return Math.hypot(px - a - t * dx, py - b - t * dy);
}
const priorities = [
  'void-leech',
  'shift-shield',
  'ice-shell',
  'storm-critical',
  'storm-surge',
  'ice-pierce',
  'void-echo',
  'storm-static',
  'storm-conduct',
  'storm-needle',
  'fire-split',
  'shift-reload',
  'void-execute',
  'void-seek',
  'shift-quick',
  'shift-stride',
  'void-singularity',
  'fire-ember',
];
const initial = process.argv[2] || 'storm-arc';
const weapon = process.argv[3] || 'arc';
assert(['arc', 'sword', 'cannon'].includes(weapon), 'Unknown weapon');
if (initial === 'fire-ember')
  priorities.unshift(
    'fire-split',
    'fire-fuel',
    'fire-blast',
    'fire-funeral',
    'fire-dash',
  );
if (initial === 'ice-touch')
  priorities.unshift(
    'ice-pierce',
    'ice-brittle',
    'ice-shatter',
    'ice-shell',
    'ice-prism',
  );
function inputFor(w) {
  const p = w.player,
    enemies = w.enemies.filter((e) => e.hp > 0);
  const target = enemies.sort((a, b) => {
    const cost = (e) =>
      Math.hypot(e.x - p.x, e.y - p.y) * (e.kind === 'conduit' ? 0.75 : 1) +
      (e.radius > 30 ? 90 : 0);
    return cost(a) - cost(b);
  })[0];
  const bullets = w.projectiles.items.filter(
    (b) => b.active && b.enemy && Math.hypot(b.x - p.x, b.y - p.y) < 400,
  );
  const hazards = w.hazards.filter((h) => !h.friendly);
  const angle = Math.atan2((p.y - 360) / 205, (p.x - 640) / 430),
    tx = 640 + 430 * Math.cos(angle + 0.5),
    ty = 360 + 205 * Math.sin(angle + 0.5);
  const danger = (x, y, horizon) => {
    let score = 0;
    for (const e of enemies) {
      const d = Math.hypot(
        x - (e.x + e.vx * (e.state === 'attack' ? horizon : 0)),
        y - (e.y + e.vy * (e.state === 'attack' ? horizon : 0)),
      );
      score +=
        // Melee still needs room for inertia and the boss's body contact radius.
        Math.max(0, (w.weapon === 'sword' ? 70 : 100) + e.radius - d) ** 2 *
        0.025;
      if (e.kind === 'oracle' && e.state === 'attack') {
        const beam = laserGeometry({ ...e, timer: e.timer - horizon });
        const d = segmentDist(x, y, beam.x1, beam.y1, beam.x2, beam.y2);
        score += Math.max(0, 50 - d) ** 2 * 0.15;
      }
    }
    for (const b of bullets) {
      const d = segmentDist(
        x,
        y,
        b.x + b.vx * Math.max(0, horizon - 0.12),
        b.y + b.vy * Math.max(0, horizon - 0.12),
        b.x + b.vx * (horizon + 0.12),
        b.y + b.vy * (horizon + 0.12),
      );
      score += Math.max(0, 43 - d) ** 2 * 0.3;
    }
    for (const h of hazards)
      if (h.time < horizon + 0.3) {
        const d = Math.hypot(x - h.x, y - h.y);
        score += Math.max(0, h.r + 50 - d) ** 2 * 0.07;
      }
    return score;
  };
  let best = { x: 0, y: 0, score: Infinity };
  const near = danger(p.x, p.y, 0.15);
  for (let i = 0; i < 17; i++) {
    const a = (i * Math.PI * 2) / 16,
      dx = i === 16 ? 0 : Math.cos(a),
      dy = i === 16 ? 0 : Math.sin(a);
    let score = 0;
    for (const horizon of [0.15, 0.35, 0.6]) {
      const x = p.x + dx * w.stats.speed * horizon,
        y = p.y + dy * w.stats.speed * horizon;
      score += danger(x, y, horizon);
      score +=
        Math.max(0, 110 - x) ** 2 * 0.08 +
        Math.max(0, x - 1170) ** 2 * 0.08 +
        Math.max(0, 135 - y) ** 2 * 0.08 +
        Math.max(0, y - 600) ** 2 * 0.08;
    }
    const x = p.x + dx * w.stats.speed * 0.5,
      y = p.y + dy * w.stats.speed * 0.5;
    score += Math.hypot(x - tx, y - ty) * (w.weapon === 'sword' ? 0.02 : 0.22);
    if (target) {
      const d = Math.hypot(target.x - x, target.y - y);
      score +=
        Math.max(0, d - (w.weapon === 'sword' ? 100 : 300)) *
        (w.weapon === 'sword' ? 0.9 : 0.16);
    }
    if (score < best.score) best = { x: dx, y: dy, score };
  }
  let dash = near > 85;
  if (w.has('shift-shield') && p.shield < 25) dash = true;
  if (dash) {
    const dx = p.x + best.x * 250,
      dy = p.y + best.y * 250;
    dash =
      dx >= 100 &&
      dx <= 1180 &&
      dy >= 125 &&
      dy <= 605 &&
      danger(dx, dy, 0.25) < near + 15;
  }
  const dist = target ? Math.hypot(target.x - p.x, target.y - p.y) : Infinity;
  return {
    x: best.x,
    y: best.y,
    aimX: target?.x || 640,
    aimY: target?.y || 270,
    fire: !!target,
    dash,
    q:
      dist < 185 || bullets.some((b) => Math.hypot(b.x - p.x, b.y - p.y) < 100),
    e: dist < 340,
    heal: p.hp <= p.maxHp - 40,
    bomb: dist < 210 && (p.hp < 65 || !!w.boss),
  };
}
function simulate(seed, route) {
  const e = clean(seed),
    started = performance.now(),
    updateTimes = [],
    rooms = [];
  let ticks = 0,
    input = nil,
    highestEntities = 0,
    highestBullets = 0,
    dashes = 0,
    qs = 0,
    es = 0;
  const w = e.world;
  while (ticks < 60 * 1500 && !['gameover', 'victory'].includes(w.phase)) {
    if (w.phase === 'reward') {
      const choice =
        w.rewardContext === 'start'
          ? initial
          : [...w.rewards].sort(
              (a, b) =>
                (priorities.includes(a.id) ? priorities.indexOf(a.id) : 100) -
                (priorities.includes(b.id) ? priorities.indexOf(b.id) : 100),
            )[0].id;
      assert(e.chooseCard(choice));
    }
    if (w.phase === 'map') {
      e.openChest('key');
      if (w.player.hp <= w.player.maxHp - 30) e.buy('heal');
      if (w.wallet.tonics === 0) e.buy('tonic');
      if (w.wallet.shards >= 5) e.bankShards();
      rooms.push({
        room: w.room.index,
        kind: w.room.kind,
        time: Math.round(w.elapsed * 10) / 10,
        hp: Math.round(w.player.hp),
        kills: w.kills,
        card: w.cards.at(-1),
      });
      const choices = roomChoices(w.room.index + 1, w.seed);
      e.enter(
        route === 'combat'
          ? choices[0]
          : choices.find((r) => ['heal', 'treasure'].includes(r.kind)) ||
              choices[0],
      );
    }
    if (ticks % 3 === 0) input = inputFor(w);
    if (w.phase === 'playing') {
      if (input.dash && w.player.dashCd === 0) dashes++;
      if (input.q && w.player.qCd === 0) qs++;
      if (input.e && w.player.eCd === 0) es++;
    }
    const before = performance.now();
    e.update(1 / 60, input);
    updateTimes.push(performance.now() - before);
    highestEntities = Math.max(highestEntities, w.enemies.length);
    highestBullets = Math.max(highestBullets, w.projectiles.count);
    ticks++;
  }
  updateTimes.sort((a, b) => a - b);
  rooms.push({
    room: w.room.index,
    kind: w.room.kind,
    time: Math.round(w.elapsed * 10) / 10,
    hp: Math.round(w.player.hp),
    kills: w.kills,
  });
  const result = {
    initial,
    weapon,
    seed,
    route,
    result: w.phase,
    simSeconds: +w.elapsed.toFixed(2),
    wallMs: Math.round(performance.now() - started),
    health: w.player.hp,
    kills: w.kills,
    damageTaken: w.damageTaken,
    banked: w.banked,
    settlement: w.settlement,
    wallet: w.wallet,
    build: w.cards,
    inputs: { dashes, qs, es },
    peakEnemies: highestEntities,
    peakProjectiles: highestBullets,
    poolMisses: w.projectiles.misses,
    updateMeanMs: +(
      updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length
    ).toFixed(4),
    updateP99Ms: +updateTimes[Math.floor(updateTimes.length * 0.99)].toFixed(4),
    rooms,
  };
  console.log(JSON.stringify(result));
  return result;
}
const results = [];
for (const route of ['safe', 'combat'])
  for (const seed of [531, 12345, 20260908])
    results.push(simulate(seed, route));
fs.mkdirSync('outputs/qa', { recursive: true });
fs.writeFileSync(
  path.join('outputs/qa', 'bot-v03-' + weapon + '-' + initial + '.json'),
  JSON.stringify(results, null, 2),
);
assert(
  results.every((r) => r.result === 'victory'),
  'A full-run simulation failed',
);
