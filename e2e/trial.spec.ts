import type {} from '../src/trial/TrialArena';
import { test, expect } from '@playwright/test';
test('public build loop, real combat input, pause, protected exit and clean restart', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: /星铸协议/ }).click();
  await expect(
    page.getByRole('heading', { name: '每一格能量，都有代价。' }),
  ).toBeVisible();
  await page.goto('/build-trial?qa');
  await page.evaluate(() =>
    localStorage.setItem('arcshift.save.v1', 'trial-sentinel'),
  );
  await page.getByRole('button', { name: '装备三重星火', exact: true }).click();
  await page.getByRole('button', { name: '装备余烬协议', exact: true }).click();
  await page.getByRole('button', { name: '装备冰霜编码', exact: true }).click();
  await expect(page.getByLabel('剩余额度')).toHaveText('0');
  await page.getByRole('button', { name: '装备超频脉冲', exact: true }).click();
  await expect(page.locator('output')).toContainText('检查剩余额度');
  await page.getByRole('button', { name: '锁定构筑，进入战场' }).click();
  await expect
    .poll(() =>
      page.evaluate(() => window.buildTrialQA?.session.engine.world.phase),
    )
    .toBe('playing');
  const y = await page.evaluate(
    () => window.buildTrialQA!.session.engine.world.player.y,
  );
  await page.keyboard.down('w');
  await page.waitForTimeout(250);
  await page.keyboard.up('w');
  expect(
    await page.evaluate(
      () => window.buildTrialQA!.session.engine.world.player.y,
    ),
  ).toBeLessThan(y);
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.3);
  await page.mouse.down();
  await page.waitForTimeout(400);
  await page.mouse.up();
  expect(
    await page.evaluate(() => window.buildTrialQA!.session.shots),
  ).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: '试炼已暂停' })).toBeVisible();
  const tick = await page.evaluate(() => window.buildTrialQA!.session.ticks);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.buildTrialQA!.session.ticks)).toBe(
    tick,
  );
  await page.getByRole('button', { name: '继续试炼', exact: true }).click();
  await page.getByRole('button', { name: '返回主菜单', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '退出试炼' })).toBeVisible();
  const halted = await page.evaluate(() => window.buildTrialQA!.session.ticks);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.buildTrialQA!.session.ticks)).toBe(
    halted,
  );
  await page.getByRole('button', { name: '留在这里' }).click();
  await expect(page.getByRole('heading', { name: '试炼已暂停' })).toBeVisible();
  await page.getByRole('button', { name: '继续试炼', exact: true }).click();
  // Boundary fixture for defeat UI; deliberately separate from the recorded natural combat.
  await page.evaluate(() => {
    window.buildTrialQA!.session.engine.world.player.hp = 0;
  });
  await expect(
    page.getByRole('heading', { name: '试炼未能完成' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '重新构筑' }).click();
  await expect(page.getByLabel('剩余额度')).toHaveText('6');
  expect(
    await page.evaluate(() => localStorage.getItem('arcshift.save.v1')),
  ).toBe('trial-sentinel');
  expect(errors).toEqual([]);
});
test('editor repairs invalid input, accepts optional offer removal, and applies an isolated rule', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/dev/trial-editor');
  await page.getByLabel('初始预算', { exact: true }).fill('0');
  await expect(
    page.getByRole('button', { name: '应用并试玩构筑' }),
  ).toBeDisabled();
  await page.getByLabel('初始预算', { exact: true }).fill('5');
  await expect(
    page.getByRole('button', { name: '应用并试玩构筑' }),
  ).toBeEnabled();
  await page.getByRole('button', { name: '应用并试玩构筑' }).click();
  await expect(page.getByLabel('剩余额度')).toHaveText('5');
  await page.getByRole('button', { name: '返回配置' }).click();
  await page.getByText('完整配置 JSON · 可编辑').click();
  const json = page.getByLabel('构筑配置 JSON'),
    v = JSON.parse(await json.inputValue());
  v.offers = v.offers.filter((o: { id: string }) => o.id !== 'fire-split');
  await json.fill(JSON.stringify(v));
  await expect(page.getByLabel('三重星火价格', { exact: true })).toBeDisabled();
  await expect(
    page.getByRole('button', { name: '应用并试玩构筑' }),
  ).toBeEnabled();
  v.content.cards.find(
    (o: { id: string }) => o.id === 'fire-ember',
  ).params.burn = 12;
  await json.fill(JSON.stringify(v));
  await page.getByRole('button', { name: '应用并试玩构筑' }).click();
  await expect(
    page.getByRole('button', { name: '装备余烬协议', exact: true }),
  ).toContainText('自定义参数');
  await page.getByRole('button', { name: '返回配置' }).click();
  await page.getByText('完整配置 JSON · 可编辑').click();
  await json.fill('{');
  await expect(
    page.getByRole('button', { name: '应用并试玩构筑' }),
  ).toBeDisabled();
  await page.getByRole('button', { name: '恢复内置规则' }).click();
  await expect(page.getByLabel('初始预算', { exact: true })).toHaveValue('6');
  expect(errors).toEqual([]);
});
