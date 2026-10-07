import { expect, test } from '@playwright/test';

test('production chunk failure has bilingual recovery and retains the saved profile', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: '切换为 English', exact: true })
    .click();
  const saved = await page.evaluate(() =>
    localStorage.getItem('arcshift.save.v1'),
  );
  await page.route('**/assets/FrontierApp-*.js', (route) =>
    route.abort('failed'),
  );
  await page.goto('/frontier');
  await expect(
    page.getByRole('heading', {
      name: 'Unable to launch the game',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole('alert')).toContainText(
    'Retrying will not clear your save',
  );
  expect(
    await page.evaluate(() => localStorage.getItem('arcshift.save.v1')),
  ).toBe(saved);
  await page.screenshot({ path: 'outputs/qa/v24-production-recovery-en.png' });
  await page.unroute('**/assets/FrontierApp-*.js');
  await page.getByRole('button', { name: 'Reload game', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Deploy', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => 'arcQA' in window || 'frontierQA' in window),
  ).toBe(false);
});

test('production menu supports direct language/help, tutorial and backup at 900px height', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: '开始行动', exact: true }),
  ).toBeEnabled();
  await page.screenshot({ path: 'outputs/qa/v24-player/menu-zh-900.png' });
  await page
    .getByRole('button', { name: '切换为 English', exact: true })
    .click();
  await page.screenshot({ path: 'outputs/qa/v24-player/menu-en-900.png' });
  await page.getByRole('button', { name: 'How to play', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Hold to fire');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'System settings', exact: true })
    .click();
  const downloaded = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download save backup', exact: true })
    .click();
  expect((await downloaded).suggestedFilename()).toMatch(
    /^ARC-SHIFT-save-.*\.json$/,
  );
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'New here? Learn the basics →', exact: true })
    .click();
  await expect(page.locator('.field-guide')).toBeVisible();
  await page
    .getByRole('button', { name: 'Exit tutorial', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Start run', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
