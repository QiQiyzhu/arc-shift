import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
const dir = 'outputs/qa';
fs.mkdirSync(dir, { recursive: true });
const snapshot = (p: Page) => p.evaluate(() => window.arcQA.snapshot());
const fix = <T>(p: Page, fn: () => T) => p.evaluate(fn);
test('settings and window blur freeze introductions; Escape only dismisses the dialog', async ({
  page,
}) => {
  await page.goto('/?qa');
  await page.getByRole('button', { name: '开始行动', exact: true }).click();
  await page.getByRole('button', { name: /余烬协议：/ }).click();
  await page.getByRole('button', { name: '系统设置', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).phase).toBe('paused');
  const entryTime = await fix(
    page,
    () => window.arcQA.engine.world.transitionTimer,
  );
  await page.waitForTimeout(1600);
  expect(await fix(page, () => window.arcQA.engine.world.transitionTimer)).toBe(
    entryTime,
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.waitForTimeout(120);
  expect((await snapshot(page)).phase).toBe('paused');
  await page.getByRole('button', { name: '继续行动', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).phase).toBe('playing');
  await fix(page, () => window.arcQA.room(8, 'boss'));
  await page.getByRole('button', { name: '系统设置', exact: true }).click();
  const bossTime = await fix(
    page,
    () => window.arcQA.engine.world.transitionTimer,
  );
  await page.waitForTimeout(3100);
  expect((await snapshot(page)).phase).toBe('paused');
  expect(await fix(page, () => window.arcQA.engine.world.transitionTimer)).toBe(
    bossTime,
  );
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '继续行动', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).phase).toBe('bossIntro');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForTimeout(3100);
  expect((await snapshot(page)).phase).toBe('paused');
  await page.getByRole('button', { name: '继续行动', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).phase).toBe('playing');
});
async function start(page: Page) {
  await page.goto('/?qa');
  await page.getByRole('button', { name: '开始行动', exact: true }).click();
  await page.getByRole('button', { name: /余烬协议：/ }).click();
  await expect.poll(async () => (await snapshot(page)).phase).toBe('playing');
}
test('round 1: real keyboard, aim, shooting, dash, skills, pause and synthesized audio', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => {
    errors.push(e.message);
    console.log('BROWSER ERROR', e.stack);
  });
  await start(page);
  expect(
    await fix(page, () => window.arcQA.engine.world.bus.listenerCount),
  ).toBe(2);
  await fix(page, () => {
    const w = window.arcQA.engine.world;
    w.player.invulnerable = 60;
    w.enemies = [];
    w.wave = 4;
    w.spawnTimer = 999;
    const e = w.spawn('sentry', 900, 410);
    e.hp = e.maxHp = 800;
    e.speed = 0;
    e.timer = 999;
    e.state = 'cooldown';
  });
  const before = await snapshot(page);
  await page.keyboard.down('d');
  await page.waitForTimeout(260);
  await page.keyboard.up('d');
  expect((await snapshot(page)).player.x).toBeGreaterThan(before.player.x + 35);
  const canvas = await page.locator('canvas').boundingBox();
  const pos = (x: number, y: number) => ({
    x: canvas!.x + (x / 1280) * canvas!.width,
    y: canvas!.y + (y / 720) * canvas!.height,
  });
  const aim = pos(900, 410);
  await page.mouse.move(aim.x, aim.y);
  await page.mouse.down();
  await expect
    .poll(async () => fix(page, () => window.arcQA.engine.world.totalDamage), {
      timeout: 5000,
    })
    .toBeGreaterThan(30);
  await page.mouse.up();
  await page.keyboard.press('Space');
  await page.waitForTimeout(50);
  expect((await snapshot(page)).player.dashCd).toBeGreaterThan(0.7);
  await page.keyboard.press('q');
  await page.keyboard.press('e');
  await page.waitForTimeout(120);
  const active = await snapshot(page);
  expect(active.player.qCd).toBeGreaterThan(4);
  expect(active.player.eCd).toBeGreaterThan(8);
  expect(active.audioState).toBe('running');
  await page.screenshot({ path: `${dir}/round1-combat-1440.png` });
  await page.keyboard.press('Escape');
  await expect(page.getByText('行动已暂停', { exact: true })).toBeVisible();
  const pause = await snapshot(page);
  await page.waitForTimeout(300);
  expect((await snapshot(page)).time).toBe(pause.time);
  await page.getByRole('button', { name: '继续行动', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).phase).toBe('playing');
  expect(errors).toEqual([]);
});
test('round 2: menu, draft, 40-card library, settings, route, elite, heal, save and resume', async ({
  page,
}) => {
  await page.goto('/?qa');
  await page.screenshot({ path: `${dir}/round2-menu-1440.png` });
  await page.getByRole('button', { name: '协议档案', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  for (const name of ['火焰', '雷电', '冰霜', '虚空', '跃迁']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.locator('.library-grid .protocol-card')).toHaveCount(8);
  }
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '系统设置', exact: true }).click();
  await page.getByRole('switch', { name: '减少动态效果' }).check();
  await expect(
    page.getByRole('switch', { name: '减少动态效果' }),
  ).toBeChecked();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '开始行动', exact: true }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${dir}/round2-draft-1440.png` });
  await page.getByRole('button', { name: /电弧引擎：/ }).click();
  await expect.poll(async () => (await snapshot(page)).phase).toBe('playing');
  await fix(page, () => {
    const a = window.arcQA;
    a.engine.world.enemies = [];
    a.engine.clear();
  });
  await expect(page.locator('.draft-cards .protocol-card')).toHaveCount(3);
  const frozen = await snapshot(page);
  await page.waitForTimeout(200);
  expect((await snapshot(page)).time).toBe(frozen.time);
  await page.locator('.draft-cards .protocol-card').first().click();
  await expect(page.locator('.map-panel')).toBeVisible();
  await page.screenshot({ path: `${dir}/round2-map-1440.png` });
  await page.locator('.route-card').first().click();
  await expect.poll(async () => (await snapshot(page)).room).toBe(2);
  await page.reload();
  await page.getByRole('button', { name: /继续行动/ }).click();
  await expect.poll(async () => (await snapshot(page)).room).toBe(2);
  expect((await snapshot(page)).cards.length).toBe(2);
  await fix(page, () => window.arcQA.room(3, 'elite'));
  await expect
    .poll(async () => (await snapshot(page)).enemyCount)
    .toBeGreaterThan(0);
  expect(
    await fix(page, () =>
      window.arcQA.engine.world.enemies.some((e) => e.elite),
    ),
  ).toBe(true);
  await fix(page, () => {
    const a = window.arcQA;
    a.engine.world.player.hp = 40;
    a.room(3, 'heal');
  });
  await expect.poll(async () => (await snapshot(page)).phase).toBe('reward');
  expect((await snapshot(page)).player.hp).toBe(102);
});
test('round 3: two bosses, phase transition, defeat, restart and victory at 1920x1080', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const errors: string[] = [];
  page.on('pageerror', (e) => {
    errors.push(e.message);
    console.log('BROWSER ERROR', e.stack);
  });
  await start(page);
  expect(
    await fix(page, () => window.arcQA.engine.world.bus.listenerCount),
  ).toBe(2);
  await fix(page, () => window.arcQA.room(4, 'boss'));
  await expect(page.getByText('WARNING // 核心实体已激活')).toBeVisible();
  await expect.poll(async () => (await snapshot(page)).phase).toBe('playing');
  await fix(page, () => {
    const w = window.arcQA.engine.world;
    w.player.invulnerable = 60;
    w.boss!.hp = w.boss!.maxHp * 0.59;
  });
  await expect
    .poll(async () => fix(page, () => window.arcQA.engine.world.boss!.phase))
    .toBe(2);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${dir}/round3-warden-1920.png` });
  await fix(page, () => window.arcQA.room(8, 'boss'));
  await expect.poll(async () => (await snapshot(page)).phase).toBe('playing');
  await fix(page, () => {
    const w = window.arcQA.engine.world;
    w.player.invulnerable = 60;
    w.boss!.attackIndex = 2;
    w.boss!.state = 'telegraph';
    w.boss!.timer = 1.05;
    w.boss!.aimX = 1000;
    w.boss!.aimY = 500;
  });
  await page.screenshot({ path: `${dir}/round3-oracle-telegraph-1920.png` });
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${dir}/round3-oracle-laser-1920.png` });
  await fix(page, () => {
    const a = window.arcQA;
    a.engine.world.enemies = [];
    a.engine.clear();
  });
  await expect(page.getByText('边界，已突破。', { exact: true })).toBeVisible();
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${dir}/round3-victory-1920.png` });
  expect(await fix(page, () => window.arcQA.engine.save.meta.wins)).toBe(1);
  await page.getByRole('button', { name: '再次跃迁', exact: true }).click();
  await page.getByRole('button', { name: /冰霜编码：/ }).click();
  await expect.poll(async () => (await snapshot(page)).phase).toBe('playing');
  await fix(page, () => {
    const w = window.arcQA.engine.world;
    w.player.hp = 1;
    w.player.invulnerable = 0;
    const e = w.spawn('hunter', w.player.x, w.player.y);
    e.state = 'attack';
  });
  await expect(page.getByText('信号暂时中断。', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${dir}/round3-defeat-1920.png` });
  await page.getByRole('button', { name: '再次跃迁', exact: true }).click();
  await expect(
    page.getByText('选择你的初始协议', { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test('mobile loads with controls guidance and no horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?qa');
  await expect(
    page.getByRole('button', { name: '开始行动', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: `${dir}/mobile-390.png` });
});
