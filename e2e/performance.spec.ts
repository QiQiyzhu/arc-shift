import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import type { Phase } from '../src/game/types';
interface RenderSample {
  sampleMs: number;
  frames: number;
  medianFrameMs: number;
  p95FrameMs: number;
  p99FrameMs: number;
  averageFps: number;
  maxEnemies: number;
  maxProjectiles: number;
  poolMisses: number;
  phase: Phase;
  userAgent: string;
  viewport: number[];
}
test('ten-second render sample with a crowded arena and active VFX', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/?qa');
  await page.getByRole('button', { name: '开始行动', exact: true }).click();
  await page.getByRole('button', { name: /余烬协议：/ }).click();
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.phase))
    .toBe('playing');
  await page.evaluate(() => {
    const w = window.arcQA.engine.world;
    w.enemies = [];
    w.wave = 99;
    w.spawnTimer = 999;
    w.player.invulnerable = 60;
    w.cards = [
      'fire-ember',
      'fire-split',
      'fire-blast',
      'storm-arc',
      'ice-touch',
      'void-seek',
      'shift-quick',
    ];
    Object.assign(w.stats, {
      projectiles: 3,
      chain: 3,
      burn: 12,
      homing: 1,
      pierce: 2,
      explosion: 1,
    });
    for (let i = 0; i < 28; i++) {
      const a = (i * Math.PI * 2) / 28;
      const e = w.spawn(
        (['hunter', 'sentry', 'lancer', 'weaver', 'conduit'] as const)[i % 5],
        640 + Math.cos(a) * 350,
        360 + Math.sin(a) * 200,
      );
      e.hp = e.maxHp = 1200;
    }
  });
  const canvas = await page.locator('canvas').boundingBox();
  await page.mouse.move(
    canvas!.x + canvas!.width * 0.75,
    canvas!.y + canvas!.height * 0.5,
  );
  await page.mouse.down();
  await page.keyboard.press('q');
  await page.keyboard.press('e');
  const result = await page.evaluate(
    () =>
      new Promise<RenderSample>((resolve) => {
        const samples: number[] = [];
        const start = performance.now();
        let previous = start,
          maxEnemies = 0,
          maxProjectiles = 0;
        function frame(now: number) {
          samples.push(now - previous);
          previous = now;
          const w = window.arcQA.engine.world;
          maxEnemies = Math.max(maxEnemies, w.enemies.length);
          maxProjectiles = Math.max(maxProjectiles, w.projectiles.count);
          if (now - start < 10000) {
            requestAnimationFrame(frame);
            return;
          }
          samples.sort((a, b) => a - b);
          resolve({
            sampleMs: now - start,
            frames: samples.length,
            medianFrameMs: samples[Math.floor(samples.length * 0.5)],
            p95FrameMs: samples[Math.floor(samples.length * 0.95)],
            p99FrameMs: samples[Math.floor(samples.length * 0.99)],
            averageFps: (samples.length / (now - start)) * 1000,
            maxEnemies,
            maxProjectiles,
            poolMisses: w.projectiles.misses,
            phase: w.phase,
            userAgent: navigator.userAgent,
            viewport: [innerWidth, innerHeight],
          });
        }
        requestAnimationFrame(frame);
      }),
  );
  await page.mouse.up();
  fs.mkdirSync('outputs/qa', { recursive: true });
  fs.writeFileSync(
    'outputs/qa/render-performance.json',
    JSON.stringify(result, null, 2),
  );
  await page.screenshot({ path: 'outputs/qa/stress-1920.png' });
  expect(result.frames).toBeGreaterThan(100);
  expect(result.poolMisses).toBe(0);
  expect(result.phase).toBe('playing');
});
