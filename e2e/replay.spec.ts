import { test, expect } from '@playwright/test';
import fs from 'node:fs';
test('QA replay records real controls, exports, steps, ignores blur and replays at x4', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('arc-replay-storage-sentinel', 'unchanged'),
  );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/dev/replay');
  await expect(
    page.getByRole('heading', { name: 'Deterministic replay' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Record new run', exact: true })
    .click();
  await page.locator('fieldset button').nth(1).click();
  await page.waitForTimeout(1700);
  await page.mouse.move(650, 390);
  await page.mouse.down();
  await page.keyboard.press('Space');
  await page.keyboard.press('q');
  await page.keyboard.press('e');
  await page.waitForTimeout(1200);
  await page.mouse.up();
  await page
    .getByRole('button', { name: 'Stop recording', exact: true })
    .click();
  const tick = Number(await page.getByTestId('replay-tick').innerText());
  expect(tick).toBeGreaterThan(80);
  const final = await page.getByTestId('replay-checksum').innerText();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const artifact = await download;
  fs.mkdirSync('outputs/qa', { recursive: true });
  await artifact.saveAs('outputs/qa/browser-replay.json');
  await page
    .getByRole('button', { name: 'Load recording', exact: true })
    .click();
  await expect(page.getByTestId('replay-tick')).toHaveText('0');
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.getByTestId('replay-tick')).toHaveText('1');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  await expect(page.getByTestId('replay-tick')).toHaveText('1');
  await page.getByLabel('Replay speed').selectOption('4');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByText(/Playback complete/)).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByTestId('replay-tick')).toHaveText(String(tick));
  await expect(page.getByTestId('replay-checksum')).toHaveText(final);
  expect(
    await page.evaluate(() =>
      localStorage.getItem('arc-replay-storage-sentinel'),
    ),
  ).toBe('unchanged');
  await page.screenshot({
    path: 'outputs/qa/replay-viewer.png',
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test('replay import rejects incompatible versions without discarding the current session', async ({
  page,
}) => {
  await page.goto('/dev/replay');
  await page
    .getByLabel('Import replay')
    .setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"version":99}'),
    });
  await expect(page.getByRole('alert')).toContainText('Incompatible');
  await expect(page.getByTestId('replay-tick')).toHaveText('0');
  await expect(
    page.getByRole('button', { name: 'Record new run' }),
  ).toBeEnabled();
});
