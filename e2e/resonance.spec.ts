import { test, expect } from '@playwright/test';
import fs from 'node:fs';

test('six resonance trials render their real projectile forms and preserve an existing run', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?qa');
  await page.getByRole('button', { name: '开始行动', exact: true }).click();
  await page.getByRole('button', { name: /余烬协议：/ }).click();
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.phase))
    .toBe('playing');
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await page.getByRole('button', { name: '返回主界面', exact: true }).click();
  const saved = await page.evaluate(() =>
    JSON.stringify(window.arcQA.engine.save),
  );
  await page.getByRole('button', { name: '协议试炼', exact: true }).click();
  await expect(page.locator('.trial-card')).toHaveCount(6);
  fs.mkdirSync('outputs/qa/v02', { recursive: true });
  await page.screenshot({ path: 'outputs/qa/v02/trials.png' });
  const names = [
    '三相炼星',
    '折光星群',
    '电浆圣歌',
    '冰环天体',
    '裂隙光矛',
    '相位织雨',
  ];
  for (let i = 0; i < names.length; i++) {
    if (i > 0)
      await page.getByRole('button', { name: '切换组合', exact: true }).click();
    await page.getByRole('button', { name: new RegExp(names[i]) }).click();
    await expect
      .poll(() => page.evaluate(() => window.arcQA.engine.world.phase))
      .toBe('playing');
    await expect
      .poll(() => page.evaluate(() => window.arcQA.engine.world.enemies.length))
      .toBeGreaterThan(0);
    const target = await page.evaluate(() => {
      const w = window.arcQA.engine.world;
      return { x: w.enemies[0].x, y: w.enemies[0].y };
    });
    const c = await page.locator('canvas').boundingBox();
    await page.mouse.move(
      c!.x + (target.x / 1280) * c!.width,
      c!.y + (target.y / 720) * c!.height,
    );
    await page.mouse.down();
    await expect
      .poll(() =>
        page.evaluate(() => window.arcQA.engine.world.projectiles.count),
      )
      .toBeGreaterThan(0);
    await page.keyboard.press('Space');
    await page.keyboard.press('e');
    await page.waitForTimeout(800);
    await page.screenshot({ path: `outputs/qa/v02/build-${i + 1}.png` });
    await page.mouse.up();
    expect(await page.evaluate(() => window.arcQA.engine.practice)).toBe(true);
    expect(
      await page.evaluate(() => JSON.stringify(window.arcQA.engine.save)),
    ).toBe(saved);
    expect(
      await page.evaluate(() => window.arcQA.engine.world.projectiles.misses),
    ).toBe(0);
  }
  await page.getByRole('button', { name: '退出试炼', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /继续行动/ }).click();
  expect(await page.evaluate(() => window.arcQA.engine.practice)).toBe(false);
  expect(await page.evaluate(() => window.arcQA.engine.world.cards)).toEqual([
    'fire-ember',
  ]);
  expect(errors).toEqual([]);
});

test('audio buses mute active voices, pause immediately, and survive context recreation', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?qa');
  expect(await page.evaluate(() => window.arcQA.synth.context)).toBeNull();
  await page.getByRole('button', { name: '协议试炼', exact: true }).click();
  await page.getByRole('button', { name: /电浆圣歌/ }).click();
  await expect
    .poll(() => page.evaluate(() => window.arcQA.synth.context?.state))
    .toBe('running');
  await page.evaluate(() => window.arcQA.synth.tone(220, 220, 2, 0.1));
  await page.getByRole('button', { name: '静音', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.arcQA.synth.masterGain?.gain.value))
    .toBe(0);
  await page.getByRole('button', { name: '开启声音', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.arcQA.synth.masterGain?.gain.value))
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.phase))
    .toBe('playing');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect
    .poll(() => page.evaluate(() => window.arcQA.synth.musicGain?.gain.value))
    .toBe(0);
  await page.getByRole('button', { name: '继续行动', exact: true }).click();
  const peaks = await page.evaluate(
    () =>
      new Promise<{ total: number; music: number }>((resolve) => {
        let total = 0,
          music = 0,
          n = 0;
        const timer = setInterval(() => {
          const s = window.arcQA.synth;
          s.update(0, true, { phase: 'playing', kind: 'boss', bossPhase: 3 });
          s.event({
            kind: 'shot',
            x: 640,
            y: 400,
            color: 0xffffff,
            element: 'storm',
          });
          total = Math.max(total, s.voices);
          music = Math.max(music, s.musicVoices);
          if (++n >= 100) {
            clearInterval(timer);
            resolve({ total, music });
          }
        }, 25);
      }),
  );
  expect(peaks.total).toBeLessThanOrEqual(30);
  expect(peaks.music).toBeLessThanOrEqual(12);
  await page.evaluate(() => {
    const s = window.arcQA.synth;
    s.dispose();
    s.unlock();
  });
  await expect
    .poll(() => page.evaluate(() => window.arcQA.synth.context?.state))
    .toBe('running');
  const voices = await page.evaluate(() => {
    const s = window.arcQA.synth;
    const before = s.voices;
    s.event({ kind: 'shot', x: 640, y: 400, color: 0xffffff, element: 'fire' });
    return s.voices - before;
  });
  expect(voices).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
