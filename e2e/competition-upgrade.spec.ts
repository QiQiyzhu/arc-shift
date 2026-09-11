import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const out = 'outputs/qa/competition-v3';
fs.mkdirSync(out, { recursive: true });
test('guided practice: real controls, forge selection, boss completion, preserved save', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?qa');
  await page.getByRole('button', { name: '开始行动', exact: true }).waitFor();
  await page.waitForFunction(() => window.arcQA?.guide);
  await page.screenshot({ animations: 'disabled', path: `${out}/menu.png` });
  await page.getByRole('button', { name: /第一次跃迁/ }).click();
  await expect(
    page.getByText('先找到自己的节奏', { exact: false }),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.stringify(window.arcQA.engine.save),
  );
  await page.keyboard.down('d');
  await expect(
    page.getByText('让第一发准确命中', { exact: false }),
  ).toBeVisible();
  await page.keyboard.up('d');
  const box = await page.locator('canvas').boundingBox();
  await page.mouse.move(
    box!.x + (box!.width * 760) / 1280,
    box!.y + (box!.height * 330) / 720,
  );
  await page.mouse.down();
  await expect(
    page.getByText('穿过危险的间隙', { exact: false }),
  ).toBeVisible();
  await page.mouse.up();
  await page.keyboard.press('Space');
  await expect(
    page.getByText('给自己留一条退路', { exact: false }),
  ).toBeVisible();
  await page.keyboard.press('q');
  await expect(
    page.getByRole('dialog', { name: '让协议，改写同一次攻击' }),
  ).toBeVisible();
  await page.screenshot({ animations: 'disabled', path: `${out}/forge.png` });
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.arcQA.engine.world.phase)).toBe(
    'paused',
  );
  await page.getByRole('button', { name: /电浆剑舞/ }).click();
  await expect(
    page.getByText('现在，让组合真正运转', { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    animations: 'disabled',
    path: `${out}/resonance.png`,
  });
  // Controlled kill fixture verifies mode transitions, not a human completion.
  await page.evaluate(() => {
    window.arcQA.engine.world.kills += 4;
  });
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.boss?.kind))
    .toBe('warden');
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.phase))
    .toBe('playing');
  await page.screenshot({ animations: 'disabled', path: `${out}/boss.png` });
  await page.evaluate(() => {
    window.arcQA.engine.world.enemies = [];
  });
  await expect(
    page.getByRole('dialog', { name: '你已经掌握跃迁的语言' }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => JSON.stringify(window.arcQA.engine.save)),
  ).toBe(saved);
  await page.getByRole('button', { name: '返回主界面', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '开始行动', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test('static terrain cache, idle HUD, same-seed restarts and missing-atlas fallback', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?qa');
  await page.waitForFunction(() => window.arcQA?.renderMetrics);
  await page.getByRole('button', { name: '开始行动', exact: true }).waitFor();
  const before = await page.evaluate(() => window.arcQA.renderMetrics!());
  await page.waitForTimeout(500);
  const idle = await page.evaluate(() => window.arcQA.renderMetrics!());
  expect(idle.hudCommits - before.hudCommits).toBeLessThanOrEqual(1);
  for (let i = 0; i < 6; i++) {
    const builds = await page.evaluate(
      () => window.arcQA.renderMetrics!().terrainBuilds,
    );
    await page.getByRole('button', { name: /第一次跃迁/ }).click();
    await expect(
      page.getByText('先找到自己的节奏', { exact: false }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => window.arcQA.renderMetrics!().terrainBuilds),
      )
      .toBeGreaterThan(builds);
    await page
      .getByRole('button', { name: '退出行动演练', exact: true })
      .click();
  }
  const repeated = await page.evaluate(() => window.arcQA.renderMetrics!());
  expect(repeated.actorImages).toBe(before.actorImages);
  expect(repeated.children).toBe(before.children);
  expect(repeated.terrainBuilds).toBeGreaterThanOrEqual(6);
  await page.getByRole('button', { name: '系统设置', exact: true }).click();
  await page.getByRole('switch', { name: '战斗清晰模式' }).check();
  await page.getByRole('switch', { name: '减少动态效果' }).check();
  await page.keyboard.press('Escape');
  await page.route('**/art/actors-source-v2.png', (route) => route.abort());
  await page.reload();
  await page.getByRole('button', { name: /第一次跃迁/ }).click();
  await page.screenshot({
    animations: 'disabled',
    path: `${out}/fallback.png`,
  });
  expect(
    await page.evaluate(() => window.arcQA.renderMetrics!().actorImages),
  ).toBe(0);
  expect(errors).toEqual([]);
});
test('draft numerical preview remains readable at laptop resolution', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?qa');
  await page.getByRole('button', { name: '开始行动', exact: true }).click();
  await expect(page.getByLabel('整合后变化')).toHaveCount(3);
  await page.screenshot({
    animations: 'disabled',
    path: `${out}/draft-1280.png`,
  });
  const first = page.getByRole('button', { name: /余烬协议：/ });
  await first.scrollIntoViewIfNeeded();
  await first.click();
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.phase))
    .toBe('playing');
});
