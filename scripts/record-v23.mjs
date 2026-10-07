// Run only against the final QA-approved source. Each take gets its own new folder.
// node scripts/record-v23.mjs --mode=weapons --out=D:/CodexData/ArcShiftV23/weapons
import path from 'node:path';
import fs from 'node:fs';
import { createCapture, createPilot, observe } from './capture-v23-lib.mjs';
const option = (name, fallback) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3) || fallback;
const mode = option('mode', 'menu'), weapon = option('weapon', 'arc'), route = option('route', 'grove');
const url = option('url', 'http://127.0.0.1:5173');
const out = path.resolve(option('out', `D:/CodexData/ArcShiftV23/${mode}-${new Date().toISOString().replaceAll(':', '-')}`));
const recording = !process.argv.includes('--no-video');
const cap = await createCapture({ out, url, mode, recording });
const { page, mark, shot, wait } = cap;
const button = (name) => page.getByRole('button', { name, exact: true });
const save = (name, data) => fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 2));
let failed = null;

async function recordMenu() {
  await cap.navigate('/?qa');
  await button('营地与图鉴').waitFor();
  await button('静音').click();
  await button('开启声音').click();
  mark('menu-zh'); await wait(2600); await shot('menu-zh');
  await button('系统设置').click();
  mark('settings-zh'); await wait(2000);
  await button('English').click();
  mark('settings-en'); await wait(3000); await shot('settings-en');
  await page.keyboard.press('Escape');
  mark('menu-en'); await wait(2500); await shot('menu-en');
  await cap.flushAudio();
  mark('reload-language-preference');
  await page.reload();
  await button('Camp & Codex').waitFor();
  await button('Mute').click();
  await button('Enable sound').click();
  mark('persisted-en'); await wait(2600); await shot('persisted-en');
  await button('System settings').click();
  await button('中文').click();
  await page.keyboard.press('Escape');
  mark('restored-zh'); await wait(2600);
}

async function recordWeapons() {
  await cap.navigate('/?qa');
  await button('营地与图鉴').click();
  await button('协议试炼').click();
  const pilot = createPilot(page);
  for (const [id, name, build] of [
    ['arc', '奥术法器', '钉穿重弹'],
    ['sword', '黎明圣剑', '回锋冰刃'],
    ['cannon', '裂核重炮', '三相炼星'],
  ]) {
    if (id !== 'arc') await button('切换组合').click();
    await page.getByRole('button', { name: new RegExp(`^装备\\s*${name}$`) }).click();
    mark(`weapon-select-${id}`, { practice: true }); await wait(1800);
    await page.getByRole('button', { name: new RegExp(build) }).click();
    await page.waitForFunction(() => window.arcQA?.engine.world.phase === 'playing');
    mark(`weapon-${id}`, { practice: true });
    const began = Date.now(); let photographed = false;
    while (Date.now() - began < 14000) {
      await pilot.drive(await observe(page));
      if (!photographed && Date.now() - began > 4500) { await shot(`weapon-${id}`); photographed = true; }
    }
    await pilot.release();
    mark(`weapon-end-${id}`, { state: await page.evaluate(() => window.arcQA.snapshot()) });
  }
}

async function recordTrial() {
  await cap.navigate('/build-trial?qa');
  await page.getByRole('heading', { name: '每一格能量，都有代价。' }).waitFor();
  await button(`选择${{ arc: '法器', sword: '圣剑', cannon: '重炮' }[weapon]}`).click();
  mark('budget'); await wait(2000);
  for (const name of ['三重星火', '余烬协议', '冰霜编码']) { await button(`装备${name}`).click(); await wait(850); }
  await shot('build-1'); await wait(1800);
  const pilot = createPilot(page);
  for (let stage = 0; stage < 3; stage++) {
    mark(`combat-${stage + 1}`);
    await button('锁定构筑，进入战场').click();
    await page.waitForFunction(() => window.buildTrialQA?.scene);
    const began = Date.now(); let photographed = false, paused = false;
    while (Date.now() - began < 150000) {
      const state = await observe(page, 'buildTrialQA');
      if (!state || state.session !== 'combat') break;
      if (state.phase === 'playing') {
        await pilot.drive(state);
        if (!photographed && Date.now() - began > 3500) { await shot(`combat-${stage + 1}`); photographed = true; }
        if (stage === 1 && !paused && state.ticks > 240) {
          await pilot.release(); await page.keyboard.press('Escape');
          mark('pause'); await wait(2000); await shot('pause');
          await button('继续试炼').click(); paused = true;
        }
      } else await wait(100);
    }
    await pilot.release();
    await page.getByRole('dialog', { name: '构筑战报' }).waitFor();
    mark(`result-${stage + 1}`); await shot(`result-${stage + 1}`); await wait(2600);
    const result = await page.evaluate(() => window.buildTrialQA.session.export());
    save('actual-run.json', result);
    if (result.state === 'failed') throw Error(`Trial failed at stage ${stage + 1}`);
    if (stage === 2) {
      await button('查看远征总结').click(); mark('summary'); await shot('summary'); await wait(4000);
      save('actual-run.json', await page.evaluate(() => window.buildTrialQA.session.export()));
      break;
    }
    await button(stage === 0 ? '选择航路合约' : '分配下一阶段预算').click();
    if (stage === 0) {
      mark('contract'); await shot('contract'); await wait(3000);
      await button(route === 'supply' ? '签订补给合约' : '签订夺能合约').click();
    }
    mark(`rebuild-${stage + 2}`); await wait(1600);
    if (stage === 0) await button('装备电弧引擎').click();
    else {
      for (const name of ['三重星火', '冰霜编码', '电弧引擎']) await button(`撤下${name}`).click();
      for (const name of route === 'supply' ? ['赤核陨星', '超频脉冲', '冰霜编码'] : ['赤核陨星', '超频脉冲', '恒星燃料']) { await button(`装备${name}`).click(); await wait(900); }
      const repair = page.locator('button.trial-repair');
      if (await repair.isEnabled()) { await repair.click(); mark('repair'); await wait(1800); }
    }
    await shot(`build-${stage + 2}`); await wait(2000);
  }
}

try {
  if (mode === 'menu') await recordMenu();
  else if (mode === 'weapons') await recordWeapons();
  else if (mode === 'trial') await recordTrial();
  else if (mode === 'frontier') {
    const { recordFrontier } = await import('./record-v23-frontier.mjs');
    await recordFrontier(cap, { weapon, route, practice: process.argv.includes('--practice'), out });
  } else throw Error(`Unknown mode: ${mode}`);
  mark('end');
} catch (error) {
  failed = error.message;
  mark('capture-failed', { message: failed });
  await shot('failure').catch(() => {});
} finally {
  const result = await cap.finish({ weapon, route, failed });
  console.log(JSON.stringify({ out, failed, errors: result.errors, duration: result.duration }));
}
if (failed) process.exitCode = 1;
