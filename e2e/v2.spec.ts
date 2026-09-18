import type {} from '../src/trial/TrialArena';
import { test, expect } from '@playwright/test';
test('v2 contract boundary UI, weapon lock, save isolation and small-screen layout', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/build-trial?qa');
  await page.getByRole('button', { name: '选择圣剑', exact: true }).click();
  await page.getByRole('button', { name: '装备冰霜编码', exact: true }).click();
  await page.getByRole('button', { name: '锁定构筑，进入战场' }).click();
  await page.waitForFunction(
    () => window.buildTrialQA?.session.engine.world.phase === 'playing',
  );
  // Explicit boundary fixture, not presented as natural gameplay or a video result.
  await page.evaluate(() => {
    const s = window.buildTrialQA!.session;
    s.engine.world.player.hp = 20;
    for (const e of s.engine.world.enemies) e.hp = 0;
  });
  await page.getByRole('button', { name: '选择航路合约' }).click();
  await expect(
    page.getByRole('button', { name: '签订夺能合约' }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: '签订补给合约' }),
  ).toContainText('立即恢复 25');
  await page.screenshot({ path: 'outputs/v2/contract-boundary.png' });
  await page.getByRole('button', { name: '签订补给合约' }).click();
  await expect(
    page.getByRole('button', { name: '选择法器', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText('基础 9 + 合约 0 − 维修 0 = 9 可用额度'),
  ).toBeVisible();
  await page.getByRole('button', { name: '锁定构筑，进入战场' }).click();
  await page.waitForFunction(() => window.buildTrialQA?.session.stage === 1);
  expect(
    await page.evaluate(
      () => window.buildTrialQA!.session.engine.world.player.hp,
    ),
  ).toBe(45);
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.screenshot({ path: 'outputs/v2/laptop-pause.png' });
  const box = (await page.locator('.trial-stage').boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(768);
  await page.goto('/build-trial');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '选择法器', exact: true }).waitFor();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: 'outputs/v2/mobile-planning.png',
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
