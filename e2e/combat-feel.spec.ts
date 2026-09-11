import { test, expect } from '@playwright/test';
test('return-blade demo starts through the actual menu, changes the third attack and preserves the save', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?qa');
  await page.getByRole('button', { name: '营地与图鉴', exact: true }).click();
  await page.getByRole('button', { name: '协议试炼', exact: true }).click();
  const saved = await page.evaluate(() =>
    JSON.stringify(window.arcQA.engine.save),
  );
  await page.getByRole('button', { name: /回锋冰刃.*圣剑体验/ }).click();
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.phase))
    .toBe('playing');
  expect(await page.evaluate(() => window.arcQA.engine.world.weapon)).toBe(
    'sword',
  );
  expect(await page.evaluate(() => window.arcQA.engine.world.forms)).toEqual([
    'sword',
  ]);
  await page.evaluate(() => {
    const w = window.arcQA.engine.world;
    w.enemies = [];
    w.spawnTimer = 1e9;
    w.wave = 99;
  });
  const box = await page.locator('canvas').boundingBox();
  await page.mouse.move(box!.x + box!.width * 0.8, box!.y + box!.height * 0.57);
  await page.mouse.down();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const w = window.arcQA.engine.world;
        return (
          w.combo === 2 &&
          w.swing === null &&
          w.projectiles.items.some(
            (b) => b.active && b.returning && b.shape === 'blade',
          )
        );
      }),
    )
    .toBe(true);
  await page.mouse.up();
  await page.screenshot({
    path: 'outputs/qa/coach-v12/return-blade-demo.png',
    animations: 'disabled',
  });
  await page.keyboard.press('Escape');
  expect(
    await page.evaluate(() => JSON.stringify(window.arcQA.engine.save)),
  ).toBe(saved);
  expect(errors).toEqual([]);
});
