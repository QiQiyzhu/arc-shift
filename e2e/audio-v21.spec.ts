import { test, expect } from '@playwright/test';
import type {} from '../src/trial/TrialArena';
import fs from 'node:fs';
import type { Synth } from '../src/audio/synth';
declare global {
  interface Window {
    soundUnderTest: Synth;
  }
}

test('decoded region stems stay synchronized, switch intensity, and release after context recreation', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?qa');
  await page.getByRole('button', { name: '营地与图鉴', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.arcQA.synth.musicState?.sources))
    .toBe(3);
  const quiet = await page.evaluate(() => window.arcQA.synth.musicState!);
  expect(quiet.levels[1]).toBe(0);
  expect(quiet.levels[2]).toBe(0);
  await page.getByRole('button', { name: '协议试炼', exact: true }).click();
  await page.getByRole('button', { name: /电浆圣歌/ }).click();
  await expect
    .poll(() => page.evaluate(() => window.arcQA.synth.musicState?.sources), {
      timeout: 15000,
    })
    .toBe(3);
  const samples = [];
  for (const biome of ['sanctum', 'grove', 'foundry'] as const) {
    await page.evaluate((biome) => {
      window.arcQA.engine.world.room.biome = biome;
    }, biome);
    await expect
      .poll(() => page.evaluate(() => window.arcQA.synth.musicState?.family))
      .toBe(biome);
    await expect
      .poll(() => page.evaluate(() => window.arcQA.synth.musicState?.sources))
      .toBe(3);
    const sample = await page.evaluate(() => window.arcQA.synth.musicState!);
    expect(new Set(sample.starts).size).toBe(1);
    expect(sample.failed).toEqual([]);
    expect(sample.decodedBytes).toBeLessThanOrEqual(50_000_000);
    samples.push(sample);
  }
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.arcQA.synth.musicState?.sources))
    .toBe(0);
  await page.getByRole('button', { name: '继续行动', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.arcQA.synth.musicState?.sources))
    .toBe(3);
  const energy = await page.evaluate(async () => {
    const s = window.arcQA.synth,
      c = s.context!,
      analyser = c.createAnalyser();
    analyser.fftSize = 2048;
    s.musicGain!.connect(analyser);
    const a = new Float32Array(analyser.fftSize);
    let peak = 0,
      squares = 0,
      count = 0;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 40));
      analyser.getFloatTimeDomainData(a);
      for (const v of a) {
        peak = Math.max(peak, Math.abs(v));
        squares += v * v;
        count++;
      }
    }
    s.musicGain!.disconnect(analyser);
    analyser.disconnect();
    return { peak, rms: Math.sqrt(squares / count) };
  });
  expect(energy.rms).toBeGreaterThan(0.001);
  expect(energy.peak).toBeLessThan(1);
  await page.evaluate(() => {
    window.arcQA.synth.dispose();
  });
  expect(await page.evaluate(() => window.arcQA.synth.musicState)).toBeNull();
  await page.evaluate(() => window.arcQA.synth.unlock());
  await expect
    .poll(() => page.evaluate(() => window.arcQA.synth.musicState?.sources), {
      timeout: 15000,
    })
    .toBe(3);
  fs.mkdirSync('outputs/v21', { recursive: true });
  fs.writeFileSync(
    'outputs/v21/audio-browser.json',
    JSON.stringify({ samples, energy, errors }, null, 2),
  );
  expect(errors).toEqual([]);
});

test('trial intermission owns music after canvas unmount; persistent blur, mute, resume and exit work', async ({
  page,
}) => {
  await page.goto('/build-trial?qa');
  await page.getByRole('button', { name: '选择重炮', exact: true }).click();
  await page.getByRole('button', { name: '装备三重星火', exact: true }).click();
  await page.getByRole('button', { name: '锁定构筑，进入战场' }).click();
  await page.waitForFunction(
    () => window.buildTrialQA?.session.engine.world.phase === 'playing',
  );
  await expect
    .poll(() =>
      page.evaluate(() => window.buildTrialQA!.sound.musicState?.sources),
    )
    .toBe(3);
  // Explicit transition fixture; never used as recorded combat or player feedback.
  await page.evaluate(() => {
    window.soundUnderTest = window.buildTrialQA!.sound;
    for (const enemy of window.buildTrialQA!.session.engine.world.enemies)
      enemy.hp = 0;
  });
  await page.getByRole('button', { name: '选择航路合约' }).click();
  await expect
    .poll(() => page.evaluate(() => window.soundUnderTest.musicState?.gains))
    .toEqual([0.74, 0, 0]);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForTimeout(450);
  expect(
    await page.evaluate(() => window.soundUnderTest.musicState?.sources),
  ).toBe(0);
  expect(
    await page.evaluate(() => window.soundUnderTest.musicGain?.gain.value),
  ).toBe(0);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect
    .poll(() => page.evaluate(() => window.soundUnderTest.musicState?.sources))
    .toBe(3);
  await page.getByRole('button', { name: '静音', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.soundUnderTest.musicState?.sources))
    .toBe(0);
  await page.getByRole('button', { name: '开启声音', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.soundUnderTest.musicState?.sources))
    .toBe(3);
  await page.getByRole('button', { name: '签订夺能合约' }).click();
  await page.getByRole('button', { name: '锁定构筑，进入战场' }).click();
  await page.waitForFunction(() => window.buildTrialQA?.session.stage === 1);
  await expect
    .poll(() =>
      page.evaluate(() => window.buildTrialQA!.sound.musicState?.sources),
    )
    .toBe(3);
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => window.buildTrialQA!.sound.musicState?.sources),
    )
    .toBe(0);
});

test('missing music files keep gameplay playable through the oscillator fallback', async ({
  page,
}) => {
  await page.route('**/audio/v21/*.ogg', (r) => r.abort());
  await page.goto('/build-trial?qa');
  await page.getByRole('button', { name: '装备三重星火', exact: true }).click();
  await page.getByRole('button', { name: '锁定构筑，进入战场' }).click();
  await page.waitForFunction(
    () => window.buildTrialQA?.session.engine.world.phase === 'playing',
  );
  await expect
    .poll(() =>
      page.evaluate(() => window.buildTrialQA!.sound.musicState?.failed),
    )
    .toEqual(['sanctum']);
  await expect
    .poll(() => page.evaluate(() => window.buildTrialQA!.sound.musicVoices))
    .toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: '试炼已暂停' })).toBeVisible();
});
