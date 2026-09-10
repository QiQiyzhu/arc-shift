import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
fs.mkdirSync('outputs/qa/v1', { recursive: true });
async function ready(page: Page) {
  await page.goto('/?qa');
  await expect(
    page.getByRole('button', { name: '开始行动', exact: true }),
  ).toBeEnabled();
}
async function run(page: Page, seed = 20260908) {
  await ready(page);
  await page.getByRole('button', { name: '开始行动', exact: true }).click();
  await page.evaluate((seed) => {
    const a = window.arcQA;
    a.engine.start(seed);
    a.engine.chooseCard('fire-ember');
  }, seed);
}
const phase = (page: Page) =>
  page.evaluate(() => window.arcQA.engine.world.phase);
test('clean menu groups loadout, bestiary and memories into a navigable camp', async ({
  page,
}) => {
  await ready(page);
  await expect(
    page.getByRole('button', { name: '装备黎明圣剑' }),
  ).not.toBeVisible();
  await page.screenshot({ path: 'outputs/qa/v1/menu.png' });
  await page.getByRole('button', { name: '营地与图鉴', exact: true }).click();
  await page.getByRole('button', { name: '装备黎明圣剑' }).click();
  await page.getByRole('button', { name: '异常图鉴', exact: true }).click();
  await expect(page.locator('.memory-grid article')).toHaveCount(12);
  await page.getByRole('button', { name: '核心实体', exact: true }).click();
  await expect(page.locator('.memory-grid article')).toHaveCount(4);
  await page.getByRole('button', { name: '记忆残片', exact: true }).click();
  await expect(page.locator('.memory-grid article')).toHaveCount(12);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'outputs/qa/v1/codex-mobile.png' });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: '开始行动', exact: true }).click();
  await page.getByRole('button', { name: /余烬协议：/ }).click();
  expect(await page.evaluate(() => window.arcQA.engine.world.weapon)).toBe(
    'sword',
  );
});
test('full route previews locked nodes and travels legally into a free hybrid forge', async ({
  page,
}) => {
  await run(page);
  await page.evaluate(() => {
    const e = window.arcQA.engine;
    e.world.phase = 'playing';
    e.world.enemies = [];
    e.clear();
  });
  await page.locator('.draft-cards .protocol-card').first().click();
  await expect(page.locator('.route-stop')).toHaveCount(28);
  await page
    .getByRole('button', { name: '第 12 层 零号神谕 · 预览', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: '尚未连接', exact: true }),
  ).toBeDisabled();
  await page.screenshot({ path: 'outputs/qa/v1/route.png' });
  await page
    .getByRole('button', { name: '第 2 层 失温工坊 · 可前往', exact: true })
    .click();
  await page.getByRole('button', { name: '前往此处', exact: true }).click();
  await page.getByRole('button', { name: /熔接黎明圣剑/ }).click();
  expect(await page.evaluate(() => window.arcQA.engine.world.forms)).toEqual([
    'arc',
    'sword',
  ]);
  await page.reload();
  await page.getByRole('button', { name: /继续行动/ }).click();
  expect(await page.evaluate(() => window.arcQA.engine.world.forms)).toEqual([
    'arc',
    'sword',
  ]);
  await expect(page.locator('.pilgrimage-map')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'outputs/qa/v1/map-mobile.png' });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test('resting preserves access to banking and completed treasure keeps its key chest', async ({
  page,
}) => {
  await run(page);
  await page.evaluate(() => {
    const a = window.arcQA;
    a.node('3:1');
  });
  // Resolve canonical kinds from this seed instead of assuming lane ordering.
  await page.evaluate(async () => {
    const a = window.arcQA;
    a.node(a.nodes().find((n) => n.room.kind === 'heal')!.id);
    a.engine.world.wallet.coins = 80;
    a.engine.world.wallet.shards = 11;
  });
  await page.getByRole('button', { name: /在火边歇息/ }).click();
  await page
    .getByRole('button', { name: '8 金币 · 安全归档', exact: true })
    .click();
  expect(await page.evaluate(() => window.arcQA.engine.save.meta.shards)).toBe(
    11,
  );
  await page.evaluate(async () => {
    const a = window.arcQA;
    a.node(a.nodes().find((n) => n.room.kind === 'treasure')!.id);
  });
  await page.getByRole('button', { name: /熔接裂核重炮/ }).click();
  await page
    .getByRole('button', { name: '钥匙 ×1 · 解锁协议', exact: true })
    .click();
  await page.reload();
  await page.getByRole('button', { name: /继续行动/ }).click();
  await expect(
    page.getByRole('button', { name: '钥匙 ×1 · 解锁协议', exact: true }),
  ).toBeDisabled();
});
test('archive choice persists its lore and offered cards', async ({ page }) => {
  await run(page);
  await page.evaluate(async () => {
    const a = window.arcQA;
    a.node(a.nodes().find((n) => n.room.kind === 'archive')!.id);
  });
  await page.screenshot({ path: 'outputs/qa/v1/archive.png' });
  await page.getByRole('button', { name: /收起这封信/ }).click();
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
  expect(
    await page.evaluate(() => window.arcQA.engine.save.meta.lore),
  ).toContain('archive');
});
for (const [seed, boss] of [
  [20260908, 'matron'],
  [531, 'forgemaster'],
] as const)
  test(`${boss} has its own arena, attacks and escalating score`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await run(page, seed);
    await page.evaluate(() => {
      const a = window.arcQA;
      a.node('8:1');
      a.engine.world.player.invulnerable = 999;
    });
    await expect.poll(() => phase(page)).toBe('playing');
    await expect
      .poll(() => page.evaluate(() => window.arcQA.synth.nowPlaying))
      .toBe(boss);
    await page.evaluate(() => {
      const w = window.arcQA.engine.world;
      w.boss!.hp = w.boss!.maxHp * 0.6;
    });
    await expect
      .poll(() => page.evaluate(() => window.arcQA.synth.nowPlaying), {
        timeout: 6000,
      })
      .toBe(`${boss}-escalation`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `outputs/qa/v1/${boss}.png` });
    expect(
      await page.evaluate(() => window.arcQA.engine.world.boss?.phase),
    ).toBe(2);
    expect(errors).toEqual([]);
  });
test('three-form trial fires actual hybrid attacks and does not change the profile', async ({
  page,
}) => {
  await ready(page);
  await page.getByRole('button', { name: '营地与图鉴', exact: true }).click();
  await page.getByRole('button', { name: '协议试炼', exact: true }).click();
  await page.getByRole('switch', { name: /三重共鸣/ }).click();
  const save = await page.evaluate(() =>
    JSON.stringify(window.arcQA.engine.save),
  );
  await page.getByRole('button', { name: /三相炼星/ }).click();
  await expect.poll(() => phase(page)).toBe('playing');
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.waitForTimeout(1200);
  expect(
    await page.evaluate(() => window.arcQA.engine.world.forms.length),
  ).toBe(3);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.arcQA.engine.world.projectiles.items.filter(
            (p) => p.active && p.shape === 'shell',
          ).length,
      ),
    )
    .toBeGreaterThan(0);
  await page.screenshot({ path: 'outputs/qa/v1/hybrid.png' });
  await page.mouse.up();
  expect(
    await page.evaluate(() => JSON.stringify(window.arcQA.engine.save)),
  ).toBe(save);
  expect(
    await page.evaluate(() => window.arcQA.engine.world.projectiles.misses),
  ).toBe(0);
});
