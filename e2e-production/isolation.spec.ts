import { test, expect } from '@playwright/test';

test('built public game loads and does not expose QA or development intervention routes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  for (const route of ['/', '/dev/debugger?qa', '/dev/content-editor?qa', '/dev/replay?qa']) {
    await page.goto(route);
    await expect(page.getByRole('button', { name: '开始行动', exact: true })).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
    expect(await page.evaluate(() => 'arcQA' in window)).toBe(false);
    await expect(page.getByRole('heading', { name: /Simulation debugger|Gameplay content/i })).toHaveCount(0);
  }
  await page.getByRole('button', { name: '开始行动', exact: true }).click();
  await page.getByRole('button', { name: /余烬协议：/ }).click();
  await expect(page.getByRole('button', { name: '系统设置', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
