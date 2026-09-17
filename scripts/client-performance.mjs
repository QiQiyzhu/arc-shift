import { chromium } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const label = process.argv[2] || 'candidate';
if (!/^[a-z0-9-]+$/i.test(label)) throw Error('Use a simple label');
const trace = process.argv.includes('--trace');
const forceLegacy = process.argv.includes('--legacy');
const paired = process.argv.includes('--paired');
if (trace && paired)
  throw Error('Profile one rendering mode per label to preserve raw captures');
const root = `outputs/client-showcase/${label}`;
fs.mkdirSync(root, { recursive: true });
const hashes = {};
function hashTree(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) hashTree(p);
    else
      hashes[p] = crypto
        .createHash('sha256')
        .update(fs.readFileSync(p))
        .digest('hex');
  }
}
hashTree('src');
hashTree('app');
hashes['scripts/client-performance.mjs'] = crypto
  .createHash('sha256')
  .update(fs.readFileSync('scripts/client-performance.mjs'))
  .digest('hex');
const environment = {
  node: process.version,
  platform: process.platform,
  cpu: os.cpus()[0].model,
  logicalCpus: os.cpus().length,
  memoryBytes: os.totalmem(),
};
const browser = await chromium.launch({
  headless: true,
  channel: process.platform === 'win32' ? 'msedge' : undefined,
});
const records = [];
try {
  for (let repeat = 0; repeat < (trace ? 1 : 3); repeat++) {
    // Rotate workload order between repetitions; before and after use the same order.
    const fixtures = trace
      ? [[250, false]]
      : [
          [
            [28, false],
            [250, false],
            [100, true],
          ],
          [
            [100, true],
            [28, false],
            [250, false],
          ],
          [
            [250, false],
            [100, true],
            [28, false],
          ],
        ][repeat];
    const runs = fixtures.flatMap(([count, terrain]) =>
      (paired
        ? repeat % 2
          ? [false, true]
          : [true, false]
        : [forceLegacy]
      ).map((legacy) => [count, terrain, legacy]),
    );
    for (const [count, terrain, legacy] of runs) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.addInitScript(() => {
        let s = 812831;
        Math.random = () => {
          s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
          return s / 4294967296;
        };
      });
      await page.goto('http://127.0.0.1:5173/?qa');
      await page.waitForFunction(
        () => window.arcQA?.scene?.renderMetrics.frames > 0,
      );
      const cdp = await page.context().newCDPSession(page);
      if (trace) {
        await cdp.send('Profiler.enable');
        await cdp.send('Profiler.start');
        await cdp.send('HeapProfiler.startSampling', {
          samplingInterval: 32768,
          includeObjectsCollectedByMajorGC: true,
          includeObjectsCollectedByMinorGC: true,
        });
        await cdp.send('Tracing.start', {
          categories:
            'devtools.timeline,v8,blink.user_timing,disabled-by-default-v8.gc',
          transferMode: 'ReturnAsStream',
        });
      }
      const result = await page.evaluate(
        async ({ count, terrain, legacy }) => {
          const { configureStress, stressInput, percentiles } =
            await import('/src/dev/benchmark.ts');
          const { checksum } = await import('/src/replay/replay.ts');
          const qa = window.arcQA,
            scene = qa.scene,
            engine = qa.engine;
          const { renderDiagnostics } = await import('/src/render/discs.ts');
          // Resolve every async dependency before resetting the world. Otherwise
          // a slow module request can advance the live Scene before interception.
          const { terrainFor } = await import('/src/rooms/terrain.ts');
          renderDiagnostics.legacyDiscs = renderDiagnostics.legacyLabels =
            legacy;
          engine.persistenceEnabled = false;
          engine.save.settings = {
            ...engine.save.settings,
            muted: true,
            reducedMotion: false,
            focusedEffects: false,
          };
          const w = configureStress(engine, count, 73129);
          if (terrain) {
            w.room = qa
              .nodes()
              .find((n) => n.depth === 9 && n.room.kind === 'combat').room;
            w.terrain = terrainFor(w.room);
          }
          const warmup = 120,
            measured = 600,
            end = warmup + measured;
          let tick = 0,
            measuring = false,
            start = 0,
            previous = 0,
            maxProjectiles = 0,
            maxParticles = 0;
          const frames = [],
            stepMs = [],
            counters = {},
            restores = [];
          const zero = () => {
            for (const k of Object.keys(counters)) counters[k] = 0;
          };
          const wrap = (obj, key, name, countOnly = false) => {
            const fn = obj[key];
            if (typeof fn !== 'function') return;
            counters[name] = 0;
            obj[key] = function (...args) {
              const b = countOnly ? 0 : performance.now();
              try {
                return fn.apply(this, args);
              } finally {
                if (measuring)
                  counters[name] += countOnly ? 1 : performance.now() - b;
              }
            };
            restores.push(() => {
              obj[key] = fn;
            });
          };
          const renderer = scene.game.renderer;
          wrap(scene.effects, 'emit', 'effectEmissionMs');
          wrap(scene.effects, 'draw', 'effectDrawMs');
          wrap(scene.actors, 'update', 'actorImagesMs');
          wrap(scene.bullets, 'update', 'bulletImagesMs');
          wrap(scene, 'onTick', 'hudAndAudioMs');
          wrap(renderer, 'render', 'renderSubmitMs');
          wrap(renderer, 'canvasToTexture', 'textTextureUploads', true);
          const graphicsPrototype = Object.getPrototypeOf(scene.graphics);
          wrap(graphicsPrototype, 'renderWebGL', 'graphicsRenderMs');
          // oxlint-disable-next-line typescript/unbound-method -- wrapper explicitly calls the original with its engine receiver.
          const original = engine.update;
          engine.update = (dt) => {
            if (tick >= (measuring ? end : warmup)) return;
            const b = performance.now();
            original.call(engine, dt, stressInput(tick++));
            if (measuring) stepMs.push(performance.now() - b);
          };
          restores.push(() => {
            engine.update = original;
          });
          let eventCount = 0,
            eventHash = 2166136261;
          const off = w.bus.on((e) => {
            if (!measuring) return;
            eventCount++;
            const str = JSON.stringify(e);
            for (let i = 0; i < str.length; i++)
              eventHash = Math.imul(eventHash ^ str.charCodeAt(i), 16777619);
          });
          const before = qa.renderMetrics();
          let atStart;
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              cleanup();
              reject(Error(`Stalled at tick ${tick}`));
            }, 90000);
            const cleanup = () => {
              clearTimeout(timeout);
              scene.game.events.off('postrender', frame);
            };
            const frame = () => {
              const now = performance.now();
              if (!measuring) {
                if (tick < warmup) return;
                measuring = true;
                start = previous = now;
                atStart = qa.renderMetrics();
                zero();
                performance.mark('arc-measure-start');
                return;
              }
              const m = qa.renderMetrics();
              frames.push({
                interval: now - previous,
                tick,
                simulateMs: m.simulateMs,
                prepareMs: m.presentationMs,
                ...counters,
              });
              previous = now;
              maxProjectiles = Math.max(maxProjectiles, w.projectiles.count);
              maxParticles = Math.max(
                maxParticles,
                scene.effects.particles.count,
              );
              zero();
              if (tick >= end) {
                performance.mark('arc-measure-end');
                cleanup();
                resolve();
              }
            };
            scene.game.events.on('postrender', frame);
          });
          const atEnd = qa.renderMetrics();
          const gl = renderer.gl,
            ext = gl.getExtension('WEBGL_debug_renderer_info');
          const final = {
            checksum: checksum(engine),
            rng: w.rng.seed,
            damage: w.totalDamage,
            kills: w.kills,
            events: eventCount,
            eventHash: (eventHash >>> 0).toString(16),
            wallet: { ...w.wallet },
            enemyCount: w.enemies.length,
            queries: { ...w.queries },
          };
          off();
          restores.reverse().forEach((fn) => fn());
          if (window.arcQA !== qa || atEnd.frames <= before.frames)
            throw Error('QA scene changed');
          const fields = Object.keys(frames[0]).filter((k) => k !== 'tick');
          const summary = Object.fromEntries(
            fields.map((k) => [
              k,
              {
                ...percentiles(frames.map((f) => f[k])),
                total: frames.reduce((s, f) => s + f[k], 0),
              },
            ]),
          );
          return {
            count,
            terrain,
            terrainBlocks: w.terrain.blocks.length,
            seed: 73129,
            warmupTicks: warmup,
            measuredTicks: tick - warmup,
            worldTicks: w.tick,
            elapsed: w.elapsed,
            wallMs: previous - start,
            simulationRate: measured / 60 / ((previous - start) / 1000),
            droppedMs: atEnd.droppedMs - atStart.droppedMs,
            summary,
            stepMs: percentiles(stepMs),
            frames,
            slow33:
              frames.filter((f) => f.interval > 1000 / 30).length /
              frames.length,
            slow50:
              frames.filter((f) => f.interval > 50).length / frames.length,
            hudCommits: atEnd.hudCommits - atStart.hudCommits,
            maxProjectiles,
            maxParticles,
            poolMisses: w.projectiles.misses,
            particlePoolMisses: scene.effects.particles.misses,
            final,
            renderer: ext
              ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
              : gl.getParameter(gl.RENDERER),
            userAgent: navigator.userAgent,
            quality: {
              reducedMotion: false,
              focusedEffects: false,
              antialias: true,
              viewport: [1440, 900],
              dpr: devicePixelRatio,
              audio: 'muted',
            },
            heapBytes: performance.memory?.usedJSHeapSize ?? null,
          };
        },
        { count, terrain, legacy },
      );
      if (trace) {
        const cpu = await cdp.send('Profiler.stop'),
          heap = await cdp.send('HeapProfiler.stopSampling');
        fs.writeFileSync(`${root}/cpu.cpuprofile`, JSON.stringify(cpu.profile));
        fs.writeFileSync(
          `${root}/allocations.heapprofile`,
          JSON.stringify(heap.profile),
        );
        const done = new Promise((resolve) =>
          cdp.once('Tracing.tracingComplete', resolve),
        );
        await cdp.send('Tracing.end');
        const { stream } = await done;
        const fd = fs.openSync(`${root}/browser.trace.json`, 'w');
        try {
          for (;;) {
            const part = await cdp.send('IO.read', { handle: stream });
            fs.writeSync(
              fd,
              Buffer.from(part.data, part.base64Encoded ? 'base64' : 'utf8'),
            );
            if (part.eof) break;
          }
        } finally {
          fs.closeSync(fd);
          await cdp.send('IO.close', { handle: stream });
        }
      }
      if (repeat === 0)
        await page.screenshot({
          path: `${root}/combat-${count}-${terrain ? 'terrain' : 'plain'}-${legacy ? 'legacy' : 'optimized'}.png`,
        });
      assert.equal(result.measuredTicks, 600);
      assert.equal(result.worldTicks, 720);
      assert(
        Math.abs(result.elapsed - 12) < 1e-8,
        'Unexpected uncontrolled simulation steps',
      );
      assert.equal(result.poolMisses, 0);
      assert.deepEqual(errors, []);
      records.push({ repeat, legacy, ...result, errors });
      fs.writeFileSync(
        `${root}/results.json`,
        JSON.stringify(
          {
            label,
            recordedAt: new Date().toISOString(),
            baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
              encoding: 'utf8',
            }).trim(),
            environment,
            browserVersion: browser.version(),
            hashes,
            profiled: trace,
            method:
              'Fresh page per sample; 120 warm-up then exactly 600 measured fixed steps. Same seed/input/quality, no concurrent browser tests. Frame intervals measured postrender-to-postrender (not GPU timings). Engine includes synchronous effect event handlers. renderSubmit includes graphicsRender. Instrumented/profiled runs are separate from unprofiled comparison. Local one-device synthetic load, not player feedback.',
            records,
          },
          null,
          2,
        ),
      );
      console.log(
        JSON.stringify({
          label,
          legacy,
          repeat,
          count,
          terrain,
          p95: result.summary.interval.p95,
          slow33: result.slow33,
          renderP95: result.summary.renderSubmitMs.p95,
          graphicsP95: result.summary.graphicsRenderMs.p95,
          engineP95: result.stepMs.p95,
          ticks: result.measuredTicks,
          checksum: result.final.checksum,
        }),
      );
      await page.close();
    }
  }
} finally {
  await browser.close();
}
