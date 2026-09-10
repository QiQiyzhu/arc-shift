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
  reactionCount: number;
  simulatedTicks: number;
  simulatedSeconds: number;
  webGLRenderer: string;
}
for (const fixture of [
  'baseline',
  'resonance',
  'sword',
  'cannon',
  'hybrid',
] as const) {
  test(`ten-second ${fixture} render sample with a crowded arena and active VFX`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/?qa');
    await page.getByRole('button', { name: '开始行动', exact: true }).click();
    await page.getByRole('button', { name: /余烬协议：/ }).click();
    await expect
      .poll(() => page.evaluate(() => window.arcQA.engine.world.phase))
      .toBe('playing');
    await page.evaluate((fixture) => {
      if (fixture !== 'baseline')
        window.arcQA.engine.startPractice(
          [
            'fire-ember',
            'fire-split',
            'fire-blast',
            'fire-meteor',
            'fire-bloom',
            'storm-arc',
            'storm-lance',
            'storm-familiar',
            'ice-touch',
            'ice-prism',
            'frost-wave',
            'frost-fan',
            'void-seek',
            'void-orbit',
            'void-return',
            'void-horizon',
            'shift-reload',
            'shift-echo',
            'shift-rear',
          ],
          fixture === 'sword' || fixture === 'cannon' ? fixture : 'arc',
          fixture === 'hybrid',
        );
      if (fixture === 'hybrid') {
        const a = window.arcQA,
          node = a
            .nodes()
            .find((n) => n.depth === 9 && n.room.kind === 'combat')!;
        a.node(node.id);
        a.engine.world.phase = 'playing';
      }
      const w = window.arcQA.engine.world;
      w.enemies = [];
      w.wave = 99;
      w.spawnTimer = 999;
      w.player.invulnerable = 60;
      if (fixture === 'baseline') {
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
      }
      for (let i = 0; i < 28; i++) {
        const a = (i * Math.PI * 2) / 28;
        const e = w.spawn(
          (
            [
              'hunter',
              'sentry',
              'lancer',
              'weaver',
              'conduit',
              'bomber',
              'cantor',
              'shade',
            ] as const
          )[i % 8],
          640 + Math.cos(a) * 350,
          360 + Math.sin(a) * 200,
        );
        e.hp = e.maxHp = 1200;
      }
    }, fixture);
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
          const startTick = window.arcQA.engine.world.tick;
          const startElapsed = window.arcQA.engine.world.elapsed;
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
            const canvas = document.querySelector('canvas');
            const gl =
              canvas?.getContext('webgl2') || canvas?.getContext('webgl');
            const rendererInfo = gl?.getExtension('WEBGL_debug_renderer_info');
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
              reactionCount: w.reactionCount,
              simulatedTicks: w.tick - startTick,
              simulatedSeconds: w.elapsed - startElapsed,
              webGLRenderer: gl
                ? String(
                    gl.getParameter(
                      rendererInfo?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER,
                    ),
                  )
                : 'WebGL unavailable',
            });
          }
          requestAnimationFrame(frame);
        }),
    );
    await page.mouse.up();
    fs.mkdirSync('outputs/qa', { recursive: true });
    fs.writeFileSync(
      `outputs/qa/render-v1-${fixture}.json`,
      JSON.stringify(result, null, 2),
    );
    await page.screenshot({ path: `outputs/qa/v1-stress-${fixture}.png` });
    // A shared Linux runner may render in software. Preserve its measured FPS;
    // this acceptance gate validates a live, finite sample, not a hardware SLA.
    expect(result.sampleMs).toBeGreaterThanOrEqual(10000);
    expect(result.frames).toBeGreaterThan(1);
    expect(result.simulatedTicks).toBeGreaterThan(0);
    expect(result.simulatedSeconds).toBeGreaterThan(0);
    for (const value of [
      result.medianFrameMs,
      result.p95FrameMs,
      result.p99FrameMs,
      result.averageFps,
      result.simulatedSeconds,
    ]) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
    expect(result.poolMisses).toBe(0);
    expect(result.phase).toBe('playing');
  });
}
