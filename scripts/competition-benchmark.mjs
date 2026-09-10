import { chromium } from '@playwright/test';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const label = process.argv[2] || 'candidate';
const terrain = process.argv.includes('--terrain');
const directory = `D:/CodexData/CompetitionUpgrade/arc-shift-v3/${label}`;
fs.mkdirSync(directory, { recursive: true });
const source = Object.fromEntries(
  [
    'src/game/scene.ts',
    'src/render/actors.ts',
    'src/render/actor-sprites.ts',
    'src/render/terrain.ts',
    'src/ui/GameApp.tsx',
    'src/render/projectile-sprites.ts',
    'src/effects/particles.ts',
    'src/ui/hud-signature.ts',
    'src/game/qa.ts',
    'scripts/competition-benchmark.mjs',
  ].map((path) => [
    path,
    crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'),
  ]),
);
const browser = await chromium.launch({
  channel: process.platform === 'win32' ? 'msedge' : undefined,
  headless: true,
});
const records = [];
try {
  for (let repeat = 0; repeat < 3; repeat++)
    for (const count of terrain ? [100] : [28, 100, 250]) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
      });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto('http://127.0.0.1:5173/?qa');
      await page
        .getByRole('button', { name: '开始行动', exact: true })
        .waitFor();
      await page.waitForFunction(
        () => window.arcQA?.renderMetrics?.().frames > 0,
      );
      const result = await page.evaluate(
        async ({ count, terrain }) => {
          const { configureStress, stressInput, percentiles } =
            await import('/src/dev/benchmark.ts');
          const qa = window.arcQA;
          const engine = qa.engine;
          const w = configureStress(engine, count);
          if (terrain) {
            const { terrainFor } = await import('/src/rooms/terrain.ts');
            w.room = window.arcQA
              .nodes()
              .find((n) => n.depth === 9 && n.room.kind === 'combat').room;
            w.terrain = terrainFor(w.room);
          }
          const original = engine.update.bind(engine);
          let tick = 0;
          let measuring = false;
          const updates = [];
          engine.update = (dt) => {
            const start = performance.now();
            original(dt, stressInput(tick++));
            if (measuring) updates.push(performance.now() - start);
          };
          await new Promise((resolve) => setTimeout(resolve, 1200));
          const sceneStart = qa.renderMetrics();
          if (sceneStart.frames <= 0)
            throw Error('Inactive QA scene before sample');
          const startTick = w.tick;
          const startElapsed = w.elapsed;
          measuring = true;
          const frames = [];
          let previous = performance.now();
          const start = previous;
          await new Promise((resolve) => {
            function frame(now) {
              frames.push(now - previous);
              previous = now;
              if (now - start < 5000) requestAnimationFrame(frame);
              else resolve();
            }
            requestAnimationFrame(frame);
          });
          engine.update = original;
          const sceneEnd = qa.renderMetrics();
          if (window.arcQA !== qa || sceneEnd.frames <= sceneStart.frames)
            throw Error('QA scene replaced or stopped during sample');
          const gl = document.querySelector('canvas')?.getContext('webgl');
          const debug = gl?.getExtension('WEBGL_debug_renderer_info');
          return {
            sceneStart,
            sceneEnd,
            sceneDelta: Object.fromEntries(
              Object.keys(sceneEnd).map((key) => [
                key,
                sceneEnd[key] - sceneStart[key],
              ]),
            ),
            count,
            terrainBlocks: w.terrain.blocks.length,
            wallMs: previous - start,
            simulatedTicks: w.tick - startTick,
            simulatedSeconds: w.elapsed - startElapsed,
            frames: frames.length,
            frameMs: percentiles(frames),
            slowFrames33: frames.filter((n) => n > 33.3).length / frames.length,
            updateMs: percentiles(updates),
            finalEnemies: w.enemies.length,
            projectiles: w.projectiles.count,
            poolMisses: w.projectiles.misses,
            heapBytes: performance.memory?.usedJSHeapSize ?? null,
            scene: window.arcQA.renderMetrics?.() ?? null,
            renderer: debug
              ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
              : 'unavailable',
            userAgent: navigator.userAgent,
          };
        },
        { count, terrain },
      );
      if (repeat === 0 && count === 28)
        await page.screenshot({ path: `${directory}/combat.png` });
      records.push({ repeat, ...result, errors });
      fs.writeFileSync(
        `${directory}/results.json`,
        JSON.stringify(
          {
            label,
            recordedAt: new Date().toISOString(),
            source,
            node: process.version,
            baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
              encoding: 'utf8',
            }).trim(),
            method: `3 fresh-page repetitions × ${terrain ? '100 enemies with depth-9 terrain' : '28/100/250 enemies'}; 1.2 s warm-up then 5 s wall-clock. Same deterministic input, 1440×900 headless Edge. Wall frames AND simulated ticks reported; not a fixed-work benchmark. No concurrent browser tests. QA identity and advancing scene frames asserted.`,
            records,
          },
          null,
          2,
        ),
      );
      console.log(
        JSON.stringify({
          label,
          repeat,
          count,
          p95: result.frameMs.p95,
          ticks: result.simulatedTicks,
          errors,
        }),
      );
      await page.close();
    }
} finally {
  await browser.close();
}
