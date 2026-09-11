import { test, expect } from '@playwright/test';
test('production coach runs its worker offline and trial exits without changing storage', async ({
  page,
}) => {
  const errors: string[] = [],
    remoteModelRequests: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (r.url().includes('api.deepseek.com')) remoteModelRequests.push(r.url());
  });
  await page.goto('/');
  await page.getByRole('button', { name: '打开战术教练' }).click();
  const storage = await page.evaluate(() =>
    JSON.stringify(
      Object.keys(localStorage)
        .sort()
        .map((k) => [k, localStorage.getItem(k)]),
    ),
  );
  await page.getByRole('button', { name: '比较候选', exact: true }).click();
  await expect(page.locator('.coach-result')).toHaveCount(3, {
    timeout: 20000,
  });
  expect(await page.evaluate(() => 'arcQA' in window)).toBe(false);
  await page.getByRole('button', { name: '亲手试用这套构筑' }).first().click();
  await expect(page.getByLabel('战术演练')).toBeVisible();
  await page.keyboard.down('d');
  await page.waitForTimeout(250);
  await page.keyboard.up('d');
  await page.getByRole('button', { name: '结束演练并返回教练' }).click();
  await page.keyboard.press('Escape');
  expect(
    await page.evaluate(() =>
      JSON.stringify(
        Object.keys(localStorage)
          .sort()
          .map((k) => [k, localStorage.getItem(k)]),
      ),
    ),
  ).toBe(storage);
  expect(remoteModelRequests).toEqual([]);
  expect(errors).toEqual([]);
});
