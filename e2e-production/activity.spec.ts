import { test, expect } from '@playwright/test';

test('production activity advances real capture through the public controller without QA', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/challenge?qa');
  await page.getByRole('button', { name: '进入挑战', exact: true }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForTimeout(2000);
  await page.keyboard.down('w');
  await page.waitForTimeout(520);
  await page.keyboard.up('w');
  await expect
    .poll(
      async () =>
        parseFloat((await page.getByLabel('驻留进度').textContent())!),
      { timeout: 7000 },
    )
    .toBeGreaterThan(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: '挑战已暂停' })).toBeVisible();
  const time = await page.getByLabel('剩余时间').textContent();
  await page.waitForTimeout(350);
  expect(await page.getByLabel('剩余时间').textContent()).toBe(time);
  expect(
    await page.evaluate(() => 'activityQA' in window || 'arcQA' in window),
  ).toBe(false);
  await page.getByRole('button', { name: '撤离挑战' }).click();
  await page.getByRole('button', { name: '确认撤离' }).click();
  await page.getByRole('button', { name: '确认本次结果' }).click();
  await page.getByRole('button', { name: '返回活动大厅' }).click();
  await page.goto('/dev/activity-editor');
  await expect(
    page.getByRole('button', { name: '开始行动', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test('unsupported save stays untouched while unscored play remains available', async ({
  page,
}) => {
  await page.goto('/challenge');
  await page.evaluate(() =>
    localStorage.setItem('arcshift.activities.v1', '{"version":999}'),
  );
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('版本不受支持');
  await page.getByRole('button', { name: '不计成绩试玩' }).click();
  await page.getByRole('button', { name: '进入挑战', exact: true }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: '返回主菜单', exact: true }).click();
  await page.getByRole('button', { name: '确认撤离' }).click();
  await page.getByRole('button', { name: '确认本次结果' }).click();
  expect(
    await page.evaluate(() => localStorage.getItem('arcshift.activities.v1')),
  ).toBe('{"version":999}');
});
