import { test, expect } from '@playwright/test';
import fs from 'node:fs';
test('content form diff, validation, import/export and real sandbox remain isolated', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem('arc-content-sentinel', 'keep'),
  );
  await page.goto('/dev/content-editor');
  await expect(
    page.getByRole('heading', { name: 'Content workbench' }),
  ).toBeVisible();
  await page.getByLabel('enemies hunter hp').fill('100');
  await expect(page.getByLabel('Content diff')).toContainText('52 → 100');
  await page.getByLabel('enemies hunter hp').fill('-1');
  await expect(
    page.getByRole('button', { name: 'Apply & reset sandbox' }),
  ).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText('expected 1..30000');
  await page.getByLabel('enemies hunter hp').fill('100');
  await page.getByRole('button', { name: 'Apply & reset sandbox' }).click();
  await page.getByRole('button', { name: 'Spawn', exact: true }).click();
  await page.getByText('Spawned entity values', { exact: true }).click();
  await expect(page.getByLabel('Spawned values')).toContainText('"maxHp": 130');
  await page.getByRole('button', { name: 'Protocols', exact: true }).click();
  await page.getByLabel('Content record').selectOption({ label: 'fire-ember' });
  await page.getByLabel('cards fire-ember burn').fill('42');
  await page.getByRole('button', { name: 'Apply & reset sandbox' }).click();
  await expect(page.getByLabel('Sandbox burn')).toHaveText('42 / 0');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  fs.mkdirSync('outputs/qa', { recursive: true });
  await (await download).saveAs('outputs/qa/editor-content.json');
  await page.getByLabel('cards fire-ember burn').fill('60');
  await page
    .getByLabel('Import content')
    .setInputFiles('outputs/qa/editor-content.json');
  await expect(page.getByLabel('cards fire-ember burn')).toHaveValue('42');
  await page.getByLabel('Sandbox weapon').selectOption('sword');
  await page.getByRole('button', { name: 'Restart build' }).click();
  await page.getByRole('button', { name: 'Run sandbox' }).click();
  await expect
    .poll(async () => Number(await page.getByLabel('Sandbox tick').innerText()))
    .toBeGreaterThan(10);
  await page.getByRole('button', { name: 'Pause sandbox' }).click();
  await page.screenshot({
    path: 'outputs/qa/content-editor.png',
    fullPage: true,
  });
  expect(
    await page.evaluate(() => localStorage.getItem('arc-content-sentinel')),
  ).toBe('keep');
  expect(errors).toEqual([]);
});
test('malformed content and unknown references never replace the running pack', async ({
  page,
}) => {
  await page.goto('/dev/content-editor');
  await page.getByText('Raw JSON · 256 KiB limit', { exact: true }).click();
  const source = await page.getByLabel('Content JSON').inputValue();
  await page.getByLabel('Content JSON').fill('{');
  await expect(
    page.getByRole('button', { name: 'Apply & reset sandbox' }),
  ).toBeDisabled();
  await expect(page.getByLabel('Sandbox burn')).toHaveText('8 / 0');
  const p = JSON.parse(source);
  p.cards[0].requires = 'nonexistent';
  await page.getByLabel('Content JSON').fill(JSON.stringify(p));
  await expect(page.getByRole('alert')).toContainText('invalid card reference');
  await page.getByRole('button', { name: 'Restore built-in draft' }).click();
  await expect(
    page.getByRole('button', { name: 'Apply & reset sandbox' }),
  ).toBeEnabled();
});
