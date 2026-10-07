import { expect, test } from '@playwright/test';

test('visual preferences retain real slider and switch control and disable decorative motion', async ({
  page,
}) => {
  await page.goto('/?qa');
  await page.getByRole('button', { name: '系统设置', exact: true }).click();
  const master = page.getByRole('slider').first();
  await master.focus();
  await page.keyboard.press('End');
  await expect(master).toHaveAttribute('aria-valuenow', '100');
  const track = await page
    .locator('[data-slot="slider-track"]')
    .first()
    .boundingBox();
  expect(track!.width).toBeGreaterThan(200);
  expect(track!.height).toBeGreaterThanOrEqual(3);
  await page.getByRole('switch', { name: '减少动态效果', exact: true }).check();
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveAttribute(
    'data-reduced-motion',
    'true',
  );
  await expect(page.locator('.sanctum-orbit > svg')).toHaveCSS(
    'animation-name',
    'none',
  );
  await page.reload();
  await expect(
    page.getByRole('button', { name: '开始行动', exact: true }),
  ).toBeEnabled();
  await expect(page.locator('html')).toHaveAttribute(
    'data-reduced-motion',
    'true',
  );
  await page.getByRole('button', { name: '系统设置', exact: true }).click();
  await expect(
    page.getByRole('switch', { name: '减少动态效果', exact: true }),
  ).toBeChecked();
  await expect(page.getByRole('slider').first()).toHaveAttribute(
    'aria-valuenow',
    '100',
  );
});

test('engraved ability deck follows actual keyboard cooldown and keeps state readable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/?qa');
  await page.getByRole('button', { name: '开始行动', exact: true }).click();
  await page.getByRole('button', { name: /余烬协议：/ }).click();
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.phase))
    .toBe('playing');
  await expect(page.locator('.skill-shift')).toContainText('就绪');
  await page.keyboard.press('Space');
  await expect(page.locator('.skill-shift')).toHaveClass(/cooling/);
  await expect(page.locator('.skill-shift')).toContainText('回充');
  await expect(page.locator('.skill-shift .skill-icon > b')).toBeVisible();
  await expect(page.locator('.skill-shift')).toHaveClass(/ready/, {
    timeout: 15000,
  });
  const deck = await page.locator('.skills').boundingBox();
  const footer = await page.locator('.bottombar').boundingBox();
  expect(deck!.y + deck!.height).toBeLessThanOrEqual(footer!.y);
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('heading', { name: '行动已暂停', exact: true }),
  ).toBeVisible();
});

for (const viewport of [
  { width: 1366, height: 600 },
  { width: 390, height: 667 },
]) {
  test(`pause and outcome actions stay reachable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/?qa');
    await page
      .getByRole('button', { name: '切换为 English', exact: true })
      .click();
    await page.waitForFunction(() => !!window.arcQA?.scene);
    for (const phase of ['paused', 'gameover', 'victory'] as const) {
      // Layout fixture only: long English campaign copy and both end states.
      // The buttons below still use their real product event handlers.
      await page.evaluate((phase) => {
        const engine = window.arcQA.engine;
        engine.practice = false;
        engine.world.phase = phase;
      }, phase);
      const panel = page.locator('.pause-panel');
      await expect(panel).toBeVisible();
      const bounds = await page.locator('.viewport').boundingBox();
      const box = await panel.boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(bounds!.y);
      expect(box!.y + box!.height).toBeLessThanOrEqual(
        bounds!.y + bounds!.height,
      );
      const primary = panel.locator('.start-button');
      const back = panel.getByRole('button', {
        name: 'Back to menu',
        exact: true,
      });
      for (const action of [primary, back]) {
        // Keyboard focus must scroll the actual action into the clipped arena.
        await action.focus();
        await expect(action).toBeFocused();
        const actionBox = await action.boundingBox();
        expect(actionBox!.y).toBeGreaterThanOrEqual(bounds!.y);
        expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(
          bounds!.y + bounds!.height,
        );
      }
      await back.click();
      await expect
        .poll(() => page.evaluate(() => window.arcQA.engine.world.phase))
        .toBe('menu');
    }
  });
}
