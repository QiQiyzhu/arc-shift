import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const url = process.argv[2] || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({
  headless: true,
  proxy: process.env.ARC_SMOKE_PROXY
    ? { server: process.env.ARC_SMOKE_PROXY }
    : undefined,
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
  await page.getByRole('button', { name: '营地与图鉴', exact: true }).click();
  await page.getByRole('button', { name: '装备黎明圣剑', exact: true }).click();
  await page.keyboard.press('Escape');
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
  await page.keyboard.press('b');
  await page.keyboard.press('r');
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
  const checkpoint = await page.evaluate(() =>
    localStorage.getItem('arcshift.save.v1'),
  );
  assert.equal(JSON.parse(checkpoint).checkpoint.weapon, 'sword');
  assert.equal(JSON.parse(checkpoint).checkpoint.campaign, 'pilgrimage');
  assert.deepEqual(JSON.parse(checkpoint).checkpoint.route, ['1:1']);
  assert.deepEqual(JSON.parse(checkpoint).checkpoint.forms, ['sword']);
  await page.getByRole('button', { name: '营地与图鉴', exact: true }).click();
  await page.getByRole('button', { name: '升级生命刻印' }).waitFor();
  await page.getByRole('button', { name: '协议试炼', exact: true }).click();
  await page.getByRole('switch', { name: /三重共鸣/ }).click();
  await page.getByRole('button', { name: '装备裂核重炮', exact: true }).click();
  await page.getByRole('button', { name: /相位织雨/ }).click();
  await page.locator('.phase-playing').waitFor();
  await page.getByText(/无尽试炼 · 波次/).waitFor();
  await page.mouse.down();
  await page.keyboard.press('Space');
  await page.waitForTimeout(800);
  await page.mouse.up();
  await page.getByRole('button', { name: '退出试炼', exact: true }).click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem('arcshift.save.v1')),
    checkpoint,
  );
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
    resonanceTrial: true,
    version: '1.0.0',
    swordCheckpoint: true,
    cannonTrial: true,
    workshop: true,
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
