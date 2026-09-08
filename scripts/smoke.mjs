import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const url = process.argv[2] || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({
  headless: true,
  channel:
    process.env.PLAYWRIGHT_CHANNEL ||
    (process.platform === 'win32' ? 'msedge' : undefined),
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const errors = [];
  const failedAssets = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400)
      failedAssets.push({ url: response.url(), status: response.status() });
  });
  const response = await page.goto(new URL('?qa', url).href);
  assert.equal(response.status(), 200);
  await page.getByRole('button', { name: '开始行动', exact: true }).click();
  assert.equal(
    await page.evaluate(() => 'arcQA' in window),
    false,
    'DEV fixture leaked to production',
  );
  await page.getByRole('button', { name: /余烬协议：/ }).click();
  await page.locator('.phase-playing').waitFor();
  const canvas = await page.locator('canvas').boundingBox();
  assert(canvas && canvas.width > 600);
  await page.mouse.move(
    canvas.x + canvas.width * 0.7,
    canvas.y + canvas.height * 0.4,
  );
  await page.mouse.down();
  await page.keyboard.down('d');
  await page.waitForTimeout(200);
  await page.keyboard.up('d');
  await page.keyboard.press('Space');
  await page.keyboard.press('q');
  await page.keyboard.press('e');
  await page.waitForTimeout(600);
  await page.mouse.up();
  await page.getByRole('button', { name: '系统设置', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  await page.getByText('行动已暂停', { exact: true }).waitFor();
  await page.getByRole('button', { name: '继续行动', exact: true }).click();
  await page.locator('.phase-playing').waitFor();
  await page.reload();
  await page.getByRole('button', { name: /继续行动/ }).waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(failedAssets, []);
  fs.mkdirSync('outputs/qa', { recursive: true });
  await page.screenshot({ path: 'outputs/qa/production-menu.png' });
  const result = {
    url,
    status: response.status(),
    qaAbsent: true,
    startAndInput: true,
    pauseAndResume: true,
    checkpointRetained: true,
    pageErrors: errors,
    failedAssets,
  };
  fs.writeFileSync(
    'outputs/qa/production-smoke.json',
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
