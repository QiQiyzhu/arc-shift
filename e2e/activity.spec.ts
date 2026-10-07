import type {} from '../src/activities/ActivityArena';
declare global {
  interface Window {
    restoreActivityStorage?: () => void;
  }
}
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { enterCaptureCircle } from './helpers/activity';
const dir = 'outputs/client-showcase/activity';
fs.mkdirSync(dir, { recursive: true });
async function start(page: Page) {
  await page.goto('/challenge?qa');
  await page.getByRole('button', { name: '进入挑战', exact: true }).click();
  await expect
    .poll(
      () => page.evaluate(() => window.activityQA?.session.engine.world.phase),
      { timeout: 15000 },
    )
    .toBe('playing');
}
async function win(page: Page) {
  // Explicit boundary fixture, NOT an autonomous player or natural victory.
  await page.evaluate(() => {
    const s = window.activityQA!.session,
      w = s.engine.world;
    w.enemies = [];
    w.wave = 99;
    w.player.invulnerable = 30;
    w.player.x = 640;
    w.player.y = 365;
    s.activeTicks = 1200;
    w.challengeTime = s.definition.holdSeconds - 1 / 60;
  });
  await expect(page.getByRole('heading', { name: '中继已接管' })).toBeVisible();
}
test('public entry, real keyboard combat, pause, protected exit and re-entry', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: /中继争夺/ }).click();
  await expect(
    page.getByRole('heading', { name: '中继争夺', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: `${dir}/lobby.png` });
  await start(page);
  const y = await page.evaluate(
    () => window.activityQA!.session.engine.world.player.y,
  );
  await enterCaptureCircle(page);
  expect(
    await page.evaluate(() => window.activityQA!.session.engine.world.player.y),
  ).toBeLessThan(y - 30);
  const box = await page.locator('canvas').boundingBox();
  await page.mouse.move(box!.x + box!.width * 0.65, box!.y + box!.height * 0.5);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.up();
  await page.keyboard.press('Space');
  await page.keyboard.press('q');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: '挑战已暂停' })).toBeVisible();
  const tick = await page.evaluate(
    () => window.activityQA!.session.activeTicks,
  );
  await page.waitForTimeout(400);
  expect(
    await page.evaluate(() => window.activityQA!.session.activeTicks),
  ).toBe(tick);
  await page.getByRole('button', { name: '继续挑战', exact: true }).click();
  await page.getByRole('button', { name: '返回主菜单', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '撤离确认' })).toBeVisible();
  const halted = await page.evaluate(
    () => window.activityQA!.session.activeTicks,
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  expect(
    await page.evaluate(() => window.activityQA!.session.activeTicks),
  ).toBe(halted);
  await page.getByRole('button', { name: '确认撤离', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '已撤离', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '确认本次结果' }).click();
  await page.getByRole('button', { name: '返回活动大厅' }).click();
  await page.getByRole('button', { name: '进入挑战', exact: true }).click();
  await expect(page.locator('canvas')).toBeVisible();
  expect(errors).toEqual([]);
});
test('successful result survives reload, claims once, and preserves the main save', async ({
  page,
}) => {
  await page.goto('/challenge?qa');
  await page.evaluate(() =>
    localStorage.setItem('arcshift.save.v1', 'untouched-main-save'),
  );
  await page.getByRole('button', { name: '进入挑战', exact: true }).click();
  await expect
    .poll(
      () => page.evaluate(() => window.activityQA?.session.engine.world.phase),
      { timeout: 15000 },
    )
    .toBe('playing');
  await win(page);
  await page.screenshot({ path: `${dir}/success.png` });
  await page.reload();
  await expect(page.getByRole('heading', { name: '中继已接管' })).toBeVisible();
  await page.getByRole('button', { name: '领取徽章并记录成绩' }).click();
  await expect(page.getByText('守望者徽章已入藏 · 成绩已记录')).toBeVisible();
  await page.getByRole('button', { name: '返回活动大厅' }).click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('arcshift.activities.v1')!).awards,
    ),
  ).toEqual(['relay-hold@1']);
  expect(
    await page.evaluate(() => localStorage.getItem('arcshift.save.v1')),
  ).toBe('untouched-main-save');
  await page.reload();
  await expect(page.getByText('守望者 · 已获得')).toBeVisible();
});
test('death, timeout and active refresh resolve without rewards', async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    window.activityQA!.session.engine.world.player.hp = 0;
  });
  await expect(
    page.getByRole('heading', { name: '信号中断', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '确认本次结果' }).click();
  await page.getByRole('button', { name: '返回活动大厅' }).click();
  await page.getByRole('button', { name: '进入挑战', exact: true }).click();
  await expect
    .poll(
      () => page.evaluate(() => window.activityQA?.session.engine.world.phase),
      { timeout: 15000 },
    )
    .toBe('playing');
  await page.evaluate(() => {
    window.activityQA!.session.activeTicks = 4499;
  });
  await expect(
    page.getByRole('heading', { name: '时间耗尽', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '确认本次结果' }).click();
  await page.getByRole('button', { name: '返回活动大厅' }).click();
  await page.getByRole('button', { name: '进入挑战', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.activityQA?.session.result === null))
    .toBe(true);
  page.once('dialog', (d) => d.accept());
  await page.reload();
  await expect(
    page.getByRole('heading', { name: '上次挑战已中断', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('未保存战斗进度，不提供本次战斗统计。'),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('arcshift.activities.v1')!).awards,
    ),
  ).toEqual([]);
});
test('cross-tab lock prevents false recovery until the owning page closes', async ({
  page,
  context,
}) => {
  await start(page);
  const other = await context.newPage();
  await other.goto('/challenge');
  await expect(other.getByRole('status')).toContainText('另一个页面');
  expect(
    await other.evaluate(
      () =>
        JSON.parse(localStorage.getItem('arcshift.activities.v1')!).active !==
        null,
    ),
  ).toBe(true);
  await page.close();
  await other.getByRole('button', { name: '重新连接' }).click();
  await expect(
    other.getByRole('heading', { name: '上次挑战已中断' }),
  ).toBeVisible();
});
test('editor changes a rule, validates errors and plays the same flow without save writes', async ({
  page,
}) => {
  await page.goto('/dev/content-editor');
  await page.getByRole('link', { name: '挑战活动编辑器' }).click();
  await page.getByRole('spinbutton', { name: '驻留目标（秒）' }).fill('75');
  await expect(page.getByRole('alert')).toContainText('驻留目标必须小于时限');
  await expect(page.getByRole('button', { name: '应用并试玩' })).toBeDisabled();
  await page.getByRole('spinbutton', { name: '驻留目标（秒）' }).fill('6');
  await expect(page.getByLabel('活动配置差异')).toContainText(
    'holdSeconds: 18 → 6',
  );
  await page.screenshot({ path: `${dir}/editor.png` });
  await page.getByRole('button', { name: '应用并试玩' }).click();
  await page.getByRole('button', { name: '进入挑战', exact: true }).click();
  await expect(page.locator('canvas')).toBeVisible();
  // Natural keyboard traversal in the edited activity, with no QA intervention.
  await enterCaptureCircle(page);
  await expect(page.getByRole('heading', { name: '中继已接管' })).toBeVisible({
    timeout: 30000,
  });
  await page.getByRole('button', { name: '确认本次结果' }).click();
  await page
    .getByRole('button', { name: '返回编辑器', exact: true })
    .last()
    .click();
  await expect(
    page.getByRole('spinbutton', { name: '驻留目标（秒）' }),
  ).toHaveValue('6');
  expect(
    await page.evaluate(() => localStorage.getItem('arcshift.activities.v1')),
  ).toBeNull();
});
test('audio failure does not strand start; storage failure can retry the same result', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', {
      value: class {
        constructor() {
          throw Error('audio unavailable');
        }
      },
      configurable: true,
    });
  });
  await start(page);
  await page.evaluate(() => {
    // oxlint-disable-next-line typescript/unbound-method -- deliberately restore the original prototype method; calls below bind the receiver.
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === 'arcshift.activities.v1') throw Error('simulated quota');
      return original.call(this, k, v);
    };
    window.restoreActivityStorage = () => {
      Storage.prototype.setItem = original;
    };
  });
  await win(page);
  await expect(page.getByRole('alert')).toContainText('结算尚未保存');
  await expect(
    page.getByRole('button', { name: '领取徽章并记录成绩' }),
  ).toHaveCount(0);
  await page.evaluate(() => window.restoreActivityStorage!());
  await page.getByRole('button', { name: '重试保存结算' }).click();
  await page.getByRole('button', { name: '领取徽章并记录成绩' }).click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('arcshift.activities.v1')!).awards,
    ),
  ).toEqual(['relay-hold@1']);
});
