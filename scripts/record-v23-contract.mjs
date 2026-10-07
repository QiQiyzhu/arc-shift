// Supplemental real-input take: hold and hover both contract options before signing.
import fs from 'node:fs';
import path from 'node:path';
import { createCapture, createPilot, observe } from './capture-v23-lib.mjs';

const out = 'D:/CodexData/ArcShiftV23/contract-take2';
const cap = await createCapture({ out, url: 'http://127.0.0.1:5173', mode: 'contract' });
const { page, mark, wait, shot } = cap;
const button = (name) => page.getByRole('button', { name, exact: true });
let failed = null;
try {
  await cap.navigate('/build-trial?qa');
  await button('选择法器').click();
  for (const name of ['三重星火', '余烬协议', '冰霜编码']) await button(`装备${name}`).click();
  await button('锁定构筑，进入战场').click();
  await page.waitForFunction(() => window.buildTrialQA?.scene);
  const pilot = createPilot(page);
  const began = Date.now();
  while (Date.now() - began < 60000) {
    const state = await observe(page, 'buildTrialQA');
    if (!state || state.session !== 'combat') break;
    if (state.phase === 'playing') await pilot.drive(state);
    else await wait(100);
  }
  await pilot.release();
  await page.getByRole('dialog', { name: '构筑战报' }).waitFor();
  const run = await page.evaluate(() => window.buildTrialQA.session.export());
  if (run.state === 'failed') throw Error('First encounter failed');
  fs.writeFileSync(path.join(out, 'first-encounter.json'), JSON.stringify(run, null, 2));
  await button('选择航路合约').click();
  await button('签订补给合约').waitFor();
  await button('签订补给合约').hover();
  await wait(700);
  mark('contract');
  await wait(3000);
  await button('签订夺能合约').hover();
  await wait(3000);
  await button('签订补给合约').hover();
  await wait(1500);
  await shot('contract');
  await button('签订补给合约').click();
  mark('signed');
  await button('装备电弧引擎').hover();
  await wait(1800);
  await button('装备电弧引擎').click();
  await wait(1000);
  await shot('rebuild');
  fs.writeFileSync(path.join(out, 'rebuild-visible.txt'), await page.locator('body').innerText());
  mark('end');
} catch (error) {
  failed = error.message;
  mark('capture-failed', { message: failed });
} finally {
  const meta = await cap.finish({ failed, route: 'supply', supplemental: true });
  console.log(JSON.stringify({ out, failed, errors: meta.errors, duration: meta.duration }));
}
if (failed) process.exitCode = 1;
