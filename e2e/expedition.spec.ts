import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
fs.mkdirSync('outputs/qa/v03', { recursive: true });
const phase = (page: Page) =>
  page.evaluate(() => window.arcQA.engine.world.phase);
async function start(page: Page, weapon = '黎明圣剑') {
  await page.goto('/?qa');
  await page
    .getByRole('button', { name: `装备${weapon}`, exact: true })
    .click();
  await page.getByRole('button', { name: '开始行动', exact: true }).click();
  await page.getByRole('button', { name: /余烬协议：/ }).click();
  await expect.poll(() => phase(page)).toBe('playing');
}
async function camp(page: Page, index: number) {
  await page.evaluate((index) => {
    const a = window.arcQA;
    a.room(index, 'combat');
    const w = a.engine.world;
    w.phase = 'playing';
    w.enemies = [];
    w.player.hp = 60;
    w.wallet.coins = 80;
    w.wallet.shards = 11;
    a.engine.clear();
  }, index);
  await page.locator('.draft-cards .protocol-card').first().click();
  await expect(page.locator('.camp-actions')).toBeVisible();
}
test('holy sword, actual consumable keys, pause-frozen bomb and weapon continuation', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await start(page);
  await page.evaluate(() => {
    const w = window.arcQA.engine.world;
    w.player.invulnerable = 60;
    w.player.hp = 50;
    w.enemies = [];
    w.wave = 99;
    w.spawnTimer = 999;
    const n = w.spawn('sentry', w.player.x + 90, w.player.y);
    n.hp = n.maxHp = 10000;
    n.state = 'cooldown';
    n.timer = 999;
  });
  await page.keyboard.press('r');
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.player.hp))
    .toBe(90);
  expect(
    await page.evaluate(() => window.arcQA.engine.world.wallet.tonics),
  ).toBe(0);
  const c = (await page.locator('canvas').boundingBox())!;
  await page.mouse.move(
    c.x + (c.width * 730) / 1280,
    c.y + (c.height * 440) / 720,
  );
  await page.mouse.down();
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.totalDamage))
    .toBeGreaterThan(0);
  await page.screenshot({ path: 'outputs/qa/v03/sword.png' });
  await page.mouse.up();
  await page.keyboard.press('b');
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.bombs.length))
    .toBe(1);
  await page.keyboard.press('Escape');
  await expect.poll(() => phase(page)).toBe('paused');
  const fuse = await page.evaluate(
    () => window.arcQA.engine.world.bombs[0].time,
  );
  await page.waitForTimeout(1000);
  expect(
    await page.evaluate(() => window.arcQA.engine.world.bombs[0].time),
  ).toBe(fuse);
  await page.getByRole('button', { name: '继续行动', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.bombs.length))
    .toBe(0);
  expect(
    await page.evaluate(() => window.arcQA.engine.world.wallet.bombs),
  ).toBe(1);
  await page.reload();
  await page.getByRole('button', { name: /继续行动/ }).click();
  expect(await page.evaluate(() => window.arcQA.engine.world.weapon)).toBe(
    'sword',
  );
  // Room-entry saves restore both inventory and combat; no mid-room half-restoration.
  expect(
    await page.evaluate(() => window.arcQA.engine.world.wallet.bombs),
  ).toBe(2);
  expect(errors).toEqual([]);
});
test('camp choices, reroll, stock, bank and workshop persist through real page reloads', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await start(page);
  await camp(page, 1);
  const before = await page.evaluate(
    () => window.arcQA.engine.world.cards.length,
  );
  await page.getByRole('button', { name: '钥匙 ×1 · 解锁协议' }).click();
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.cards.length))
    .toBe(before + 1);
  await expect(
    page.getByRole('button', { name: '炸弹 ×1 · 破锁回收' }),
  ).toBeDisabled();
  await page.reload();
  await page.getByRole('button', { name: /继续行动/ }).click();
  await expect(
    page.getByRole('button', { name: '钥匙 ×1 · 解锁协议' }),
  ).toBeDisabled();
  await camp(page, 3);
  await page.getByRole('button', { name: '生命 −30 · 缔结血誓' }).click();
  expect(await page.evaluate(() => window.arcQA.engine.world.player.hp)).toBe(
    42,
  );
  await page.screenshot({ path: 'outputs/qa/v03/altar.png' });
  await camp(page, 2);
  await page.getByRole('button', { name: /战地修复/ }).click();
  await expect(page.getByRole('button', { name: /战地修复/ })).toBeDisabled();
  await page.getByRole('button', { name: '8 金币 · 安全归档' }).click();
  expect(await page.evaluate(() => window.arcQA.engine.save.meta.shards)).toBe(
    12,
  );
  await page.screenshot({ path: 'outputs/qa/v03/camp.png' });
  await page.reload();
  await page.screenshot({ path: 'outputs/qa/v03/menu.png' });
  await page.getByRole('button', { name: /行者营地/ }).click();
  await page.getByRole('button', { name: '升级生命刻印' }).click();
  await expect(page.locator('.workshop-balance > b')).toHaveText('4');
  await page.screenshot({ path: 'outputs/qa/v03/workshop.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /继续行动/ }).click();
  expect(
    await page.evaluate(() => window.arcQA.engine.world.player.maxHp),
  ).toBe(120);
  await expect(
    page.getByRole('button', { name: '本区已完成归档' }),
  ).toBeDisabled();
  await page.evaluate(() => {
    const a = window.arcQA;
    a.room(3, 'combat');
    a.engine.world.phase = 'playing';
    a.engine.world.enemies = [];
    a.engine.world.wallet.coins = 80;
    a.engine.clear();
  });
  await page.getByRole('button', { name: /12 金币 · 重抽协议/ }).click();
  const hand = await page.evaluate(() =>
    window.arcQA.engine.world.rewards.map((c) => c.id),
  );
  await page.reload();
  await page.getByRole('button', { name: /继续行动/ }).click();
  expect(
    await page.evaluate(() =>
      window.arcQA.engine.world.rewards.map((c) => c.id),
    ),
  ).toEqual(hand);
  await expect(
    page.getByRole('button', { name: /18 金币 · 重抽协议/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test('trial inherits equipped weapon, switches to cannon and leaves the real save untouched', async ({
  page,
}) => {
  await page.goto('/?qa');
  await page.getByRole('button', { name: '装备黎明圣剑' }).click();
  await page.getByRole('button', { name: '协议试炼', exact: true }).click();
  await expect(
    page.getByRole('dialog').getByRole('button', { name: '装备黎明圣剑' }),
  ).toHaveAttribute('aria-pressed', 'true');
  const saved = await page.evaluate(() =>
    JSON.stringify(window.arcQA.engine.save),
  );
  await page.getByRole('button', { name: /三相炼星/ }).click();
  await expect.poll(() => phase(page)).toBe('playing');
  expect(await page.evaluate(() => window.arcQA.engine.world.weapon)).toBe(
    'sword',
  );
  await page.getByRole('button', { name: '切换组合', exact: true }).click();
  await page.getByRole('button', { name: '装备裂核重炮' }).click();
  await page.getByRole('button', { name: /折光星群/ }).click();
  await expect.poll(() => phase(page)).toBe('playing');
  const c = (await page.locator('canvas').boundingBox())!;
  await page.mouse.move(c.x + c.width * 0.75, c.y + c.height * 0.5);
  await page.mouse.down();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.arcQA.engine.world.projectiles.items.filter(
            (b) => b.active && b.shape === 'shell',
          ).length,
      ),
    )
    .toBeGreaterThan(0);
  await page.screenshot({ path: 'outputs/qa/v03/cannon.png' });
  await page.mouse.up();
  expect(
    await page.evaluate(() => JSON.stringify(window.arcQA.engine.save)),
  ).toBe(saved);
});
