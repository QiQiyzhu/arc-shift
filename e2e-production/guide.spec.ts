import { test, expect } from '@playwright/test';

test('published build guides real input through fusion without QA or save changes', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?qa');
  await page.getByRole('button', { name: /第一次跃迁/ }).click();
  const storage = await page.evaluate(() =>
    JSON.stringify(
      Object.keys(localStorage)
        .sort()
        .map((key) => [key, localStorage.getItem(key)]),
    ),
  );
  expect(await page.evaluate(() => 'arcQA' in window)).toBe(false);
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
  const forge = page.getByRole('dialog', { name: '让协议，改写同一次攻击' });
  await expect(forge).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(forge).toBeVisible();
  await page.getByRole('button', { name: /折光弹幕/ }).click();
  await expect(
    page.getByText('现在，让组合真正运转', { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: 'outputs/qa/competition-v3/production-prism.png',
    animations: 'disabled',
  });
  await page.getByRole('button', { name: '退出行动演练', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '开始行动', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.stringify(
        Object.keys(localStorage)
          .sort()
          .map((key) => [key, localStorage.getItem(key)]),
      ),
    ),
  ).toBe(storage);
  expect(errors).toEqual([]);
});
