import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
const out = 'outputs/qa/coach-v12';
fs.mkdirSync(out, { recursive: true });
async function open(page: Page) {
  await page.goto('/?qa');
  await page.waitForFunction(() => window.arcQA?.engine);
  await page.getByRole('button', { name: '打开战术教练' }).click();
  await expect(
    page.getByRole('dialog', { name: '把下一次选择，先试一遍。' }),
  ).toBeVisible();
}
async function compare(page: Page) {
  await page.getByRole('button', { name: '比较候选', exact: true }).click();
  await expect(page.locator('.coach-result')).toHaveCount(3, {
    timeout: 20000,
  });
}
test('coach measures in a real worker, exports reproducible evidence, and trial preserves checkpoint', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?qa');
  await page.waitForFunction(() => window.arcQA?.engine);
  await page.evaluate(() => {
    const e = window.arcQA.engine;
    e.start(71531);
    e.chooseCard(e.world.rewards[0].id);
    e.checkpoint();
    e.world.phase = 'menu';
  });
  const saved = await page.evaluate(() =>
    JSON.stringify(window.arcQA.engine.save),
  );
  await page.getByRole('button', { name: '打开战术教练' }).click();
  await expect(page.getByText('读取营地存档', { exact: true })).toBeVisible();
  const start = Date.now();
  await compare(page);
  const elapsedMs = Date.now() - start;
  await page.screenshot({
    path: `${out}/coach-desktop.png`,
    animations: 'disabled',
  });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '导出本次依据与推演记录' }).click(),
  ]);
  await download.saveAs(`${out}/browser-evidence.json`);
  const evidence = JSON.parse(
    fs.readFileSync(`${out}/browser-evidence.json`, 'utf8'),
  );
  expect(evidence.result.rows).toHaveLength(3);
  expect(
    evidence.result.baseline.samples.every(
      (s: { casts: { dash: number } }) => s.casts.dash === 0,
    ),
  ).toBe(true);
  fs.writeFileSync(
    `${out}/timing.json`,
    JSON.stringify(
      {
        elapsedMs,
        measuredAt: new Date().toISOString(),
        note: 'One local Edge run; includes UI click/render. Not an SLA.',
      },
      null,
      2,
    ),
  );
  await page.getByRole('button', { name: '亲手试用这套构筑' }).first().click();
  await expect(page.getByLabel('战术演练')).toBeVisible();
  await page.keyboard.down('d');
  await page.waitForTimeout(250);
  await page.keyboard.up('d');
  // Controlled elapsed fixture checks the real completion transition, not 30 seconds of human play.
  await page.evaluate(() => {
    window.arcQA.engine.world.elapsed = 30;
  });
  await expect(page.getByText('本次演练完成', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: '暂停', exact: true }),
  ).toBeDisabled();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.arcQA.engine.world.phase)).toBe(
    'paused',
  );
  await page.screenshot({
    path: `${out}/trial-complete.png`,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: '带着体验返回教练' }).click();
  expect(
    await page.evaluate(() => JSON.stringify(window.arcQA.engine.save)),
  ).toBe(saved);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.arcQA.engine.resume())).toBe(true);
  expect(await page.evaluate(() => window.arcQA.engine.world.seed)).toBe(71531);
  expect(errors).toEqual([]);
});
test('reward coach can only apply an actual offered card through the engine', async ({
  page,
}) => {
  await page.goto('/?qa');
  await page.getByRole('button', { name: '开始行动', exact: true }).click();
  await page.getByRole('button', { name: '让战术教练比较这三张' }).click();
  await compare(page);
  const offered = await page.evaluate(() =>
    window.arcQA.engine.world.rewards.map((c) => c.id),
  );
  await page.getByRole('button', { name: '选择这张协议' }).first().click();
  await expect(page.locator('.coach-panel')).toHaveCount(0);
  const cards = await page.evaluate(() => window.arcQA.engine.world.cards);
  expect(cards).toHaveLength(1);
  expect(offered).toContain(cards[0]);
});
test('changed snapshot is rejected and reopening cancels a pending worker', async ({
  page,
}) => {
  await open(page);
  await compare(page);
  await page.evaluate(() => {
    window.arcQA.engine.save.meta.weapon = 'sword';
  });
  await page.getByRole('button', { name: '亲手试用这套构筑' }).first().click();
  await expect(page.getByRole('alert')).toContainText('构筑已变化');
  await page.getByRole('button', { name: '比较候选', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.coach-panel')).toHaveCount(0);
  await page.getByRole('button', { name: '打开战术教练' }).click();
  await expect(page.locator('.coach-result')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: '比较候选', exact: true }),
  ).toBeEnabled();
});
test('worker unavailability keeps rules usable and game playable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.Worker = class {
      constructor() {
        throw Error('Unavailable test fixture');
      }
    } as unknown as typeof Worker;
  });
  await open(page);
  await page.getByRole('button', { name: '比较候选', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('无法启动后台推演');
  await expect(page.locator('.coach-strategy')).toHaveCount(3);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '开始行动', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '让战术教练比较这三张' }),
  ).toBeVisible();
});
test('coach fits smaller screens and custom rules do not reuse stale generated prose', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  await compare(page);
  const box = await page.locator('.coach-panel').boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(721);
  await page.screenshot({
    path: `${out}/coach-1280.png`,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: '重新读取构筑' }).click();
  await page.evaluate(() => {
    const custom = structuredClone(window.arcQA.engine.content);
    custom.weapons[0].params.damage = 1.2;
    Object.defineProperty(window.arcQA.engine, 'content', { value: custom });
  });
  await page.getByRole('button', { name: '重新读取构筑' }).click();
  await expect(page.locator('.coach-strategy')).toHaveCount(0);
  await expect(
    page.getByText('战术库对应默认规则', { exact: false }),
  ).toBeVisible();
});
