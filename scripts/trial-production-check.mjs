import { chromium } from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out = 'outputs/planning-production';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' }),
  page = await browser.newPage({ viewport: { width: 1366, height: 768 } }),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto('http://127.0.0.1:4173/');
  await page.getByRole('button', { name: '开始行动', exact: true }).waitFor();
  await page.screenshot({ path: `${out}/menu.png` });
  await page.getByRole('button', { name: /星铸协议/ }).click();
  await page.getByRole('button', { name: '装备三重星火', exact: true }).click();
  await page.getByRole('button', { name: '锁定构筑，进入战场' }).click();
  await page.locator('canvas').waitFor();
  await page.waitForTimeout(2500);
  assert.equal(
    await page.evaluate(() => typeof window.buildTrialQA),
    'undefined',
  );
  await page.keyboard.press('Escape');
  await page.getByRole('heading', { name: '试炼已暂停' }).waitFor();
  await page.screenshot({ path: `${out}/trial.png` });
  await page.getByRole('button', { name: '结束本次试炼' }).click();
  await page.getByRole('button', { name: '确认退出' }).click();
  await page.goto('http://127.0.0.1:4173/dev/trial-editor');
  await page.getByRole('button', { name: '开始行动', exact: true }).waitFor();
  assert.equal(
    await page.getByRole('heading', { name: '把假设变成可试玩规则' }).count(),
    0,
  );
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    `${out}/result.json`,
    JSON.stringify(
      {
        production: true,
        viewport: [1366, 768],
        errors,
        checks: [
          'main menu entry',
          'trial canvas loads',
          'real Escape pause',
          'QA global absent',
          'protected exit',
          'DEV editor absent',
        ],
      },
      null,
      2,
    ),
  );
  console.log('PASS: production build trial, input, exit and DEV isolation');
} finally {
  await browser.close();
}
