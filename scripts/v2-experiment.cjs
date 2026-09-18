'use strict';
// Deterministic input-policy experiment, not human playtesting or a weapon ranking.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
require('./ts-register.cjs');
const { BuildTrialSession } = require('../src/trial/session.ts');
const { DEFAULT_TRIAL } = require('../src/trial/config.ts');
const { checksum } = require('../src/replay/replay.ts');
const out = path.resolve(process.argv[2] || 'outputs/v2/experiment');
fs.mkdirSync(out, { recursive: true });
const rows = [];
for (const weapon of ['arc', 'sword', 'cannon'])
  for (const route of ['supply', 'overload'])
    for (const seed of [73129, 41717, 90311]) {
      const config = structuredClone(DEFAULT_TRIAL);
      config.seed = seed;
      const s = new BuildTrialSession(config);
      s.chooseWeapon(weapon);
      let inputs = 0,
        skillQ = 0,
        skillE = 0,
        dashes = 0,
        stepHash = 2166136261;
      for (let stage = 0; stage < 3; stage++) {
        const cards =
          stage === 0
            ? ['fire-split', 'fire-ember', 'ice-touch']
            : stage === 1
              ? ['fire-split', 'fire-ember', 'ice-touch', 'storm-arc']
              : ['fire-ember', 'fire-meteor', 'storm-surge', 'ice-touch'];
        for (const id of [...s.cards].reverse())
          if (!cards.includes(id)) s.toggle(id);
        for (const id of cards)
          if (!s.cards.includes(id) && !s.toggle(id))
            throw Error(`Invalid build ${id}`);
        // No repair: isolate the contract's actual health / extra encounter cost.
        if (!s.start()) throw Error('Start rejected');
        while (s.state === 'combat') {
          const w = s.engine.world,
            p = w.player;
          const enemy = w.enemies
            .filter((e) => e.hp > 0)
            .sort(
              (a, b) =>
                Math.hypot(a.x - p.x, a.y - p.y) -
                Math.hypot(b.x - p.x, b.y - p.y),
            )[0];
          const input = {
            x: 0,
            y: 0,
            aimX: enemy?.x ?? 640,
            aimY: enemy?.y ?? 200,
            fire: true,
            dash: false,
            q: false,
            e: false,
          };
          if (enemy && w.phase === 'playing') {
            const dx = enemy.x - p.x,
              dy = enemy.y - p.y,
              d = Math.hypot(dx, dy) || 1;
            let x = (-dy / d) * 0.6,
              y = (dx / d) * 0.6;
            const close = weapon === 'sword' ? 65 : stage === 2 ? 220 : 170,
              far = weapon === 'sword' ? 112 : stage === 2 ? 330 : 285;
            if (d < close) {
              x -= (dx / d) * 1.4;
              y -= (dy / d) * 1.4;
            } else if (d > far) {
              x += dx / d;
              y += dy / d;
            }
            if (p.x < 240) x += 2;
            if (p.x > 1040) x -= 2;
            if (p.y < 210) y += 2;
            if (p.y > 550) y -= 2;
            let danger = false;
            for (const b of w.projectiles.items) {
              if (!b.active || !b.enemy) continue;
              const bx = b.x + b.vx * 0.18 - p.x,
                by = b.y + b.vy * 0.18 - p.y,
                bd = Math.hypot(bx, by);
              if (bd < 85) {
                x -= bx / (bd || 1);
                y -= by / (bd || 1);
                danger = true;
              }
            }
            input.x = x < -0.2 ? -1 : x > 0.2 ? 1 : 0;
            input.y = y < -0.2 ? -1 : y > 0.2 ? 1 : 0;
            input.dash = danger && p.dashCd <= 0;
            input.q = p.qCd <= 0 && d < 260;
            input.e = p.eCd <= 0;
            if (input.dash) dashes++;
            if (input.q) skillQ++;
            if (input.e) skillE++;
          }
          for (const c of JSON.stringify(input))
            stepHash = Math.imul(stepHash ^ c.charCodeAt(0), 16777619);
          s.step(1 / 60, input);
          inputs++;
          if (inputs > 25000) throw Error('Unbounded simulation');
        }
        if (s.state === 'failed') break;
        s.next();
        if (s.state === 'contract') s.chooseContract(route);
      }
      rows.push({
        weapon,
        route,
        seed,
        inputs,
        playingTicks: s.results.reduce((n, r) => n + r.ticks, 0),
        skillQ,
        skillE,
        dashes,
        inputHash: (stepHash >>> 0).toString(16),
        checksum: checksum(s.engine),
        ...s.export(),
      });
      s.dispose();
    }
const digest = crypto
  .createHash('sha256')
  .update(fs.readFileSync(__filename))
  .digest('hex');
fs.writeFileSync(
  path.join(out, 'raw.json'),
  JSON.stringify(
    {
      schema: 1,
      scriptSha256: digest,
      policy:
        'fixed-step input policy, no world writes after creation; same per-weapon policy for both contracts; no repair; stage transitions through public session methods',
      rows,
    },
    null,
    2,
  ),
);
const summary = rows.map((r) => ({
  weapon: r.weapon,
  route: r.route,
  seed: r.seed,
  state: r.state,
  ticks: r.playingTicks,
  hurt: r.results.reduce((n, s) => n + s.damageTaken, 0),
  hp: r.results.at(-1).hp,
  reward: r.earnedCapacity,
}));
fs.writeFileSync(
  path.join(out, 'summary.json'),
  JSON.stringify(summary, null, 2),
);
console.log(JSON.stringify(summary));
