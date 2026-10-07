import { test, expect } from '@playwright/test';

test('v2.3 production retains English across modes and starts a normal frontier run', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: '系统设置', exact: true }).click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.locator('.frontier-entry').click();
  await expect(page.getByRole('checkbox')).not.toBeChecked();
  await page.getByRole('button', { name: 'Deploy', exact: true }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await page.keyboard.down('w');
  await page.waitForTimeout(500);
  await page.keyboard.up('w');
  await page.getByRole('button', { name: 'Pause operation' }).click();
  await page.screenshot({ path: 'outputs/qa/v23-production-frontier-en.png' });
  expect(await page.evaluate(() => 'frontierQA' in window || 'arcQA' in window)).toBe(false);
  await page.getByRole('button', { name: 'Switch to 中文' }).click();
  await expect(page.locator('.frontier-shell')).toContainText('信标重连');
  await page.screenshot({ path: 'outputs/qa/v23-production-frontier-zh.png' });
  await page.getByRole('button', { name: '切换为 English' }).click();
  page.on('dialog', dialog => dialog.accept());
  for (const route of ['/build-trial', '/challenge']) {
    await page.goto(route);
    await expect(page.getByRole('button', { name: 'Switch to 中文' })).toBeVisible();
    expect(await page.evaluate(() => 'buildTrialQA' in window || 'activityQA' in window)).toBe(false);
  }
  expect(errors).toEqual([]);
});
