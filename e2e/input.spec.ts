import { test, expect, type Page } from '@playwright/test';
const ready = async (page: Page) => {
  await page.goto('/?qa');
  await expect.poll(() => page.evaluate(() => !!window.arcQA)).toBe(true);
  await page.getByRole('button', { name: '开始行动', exact: true }).click();
  await page.getByRole('button', { name: /余烬协议：/ }).click();
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.phase), {
      timeout: 15_000,
    })
    .toBe('playing');
};
test('rebinds controls in settings, rejects conflicts, preserves them on reload and restores defaults', async ({
  page,
}) => {
  await ready(page);
  await page.getByRole('button', { name: '系统设置', exact: true }).click();
  await page.locator('.input-settings summary').click();
  await page.getByLabel('相位跃迁按键').selectOption('KeyQ');
  await expect(page.locator('.input-settings output')).toContainText('冲突');
  await expect(page.getByLabel('相位跃迁按键')).toHaveValue('Space');
  await page.getByLabel('相位跃迁按键').selectOption('KeyJ');
  await expect(page.locator('.input-settings output')).toContainText('已保存');
  await page.screenshot({
    path: 'outputs/qa/input-settings.png',
    fullPage: true,
  });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '继续行动', exact: true }).click();
  await page.evaluate(() => {
    window.arcQA.engine.world.player.dashCd = 0;
  });
  await page.keyboard.press('Space');
  await page.waitForTimeout(80);
  expect(await page.evaluate(() => window.arcQA.engine.world.phase)).toBe(
    'playing',
  );
  expect(
    await page.evaluate(() => window.arcQA.engine.world.player.dashCd),
  ).toBe(0);
  await page.keyboard.press('j');
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.player.dashCd))
    .toBeGreaterThan(0.7);
  await page.reload();
  await page.getByRole('button', { name: '系统设置', exact: true }).click();
  await page.locator('.input-settings summary').click();
  await expect(page.getByLabel('相位跃迁按键')).toHaveValue('KeyJ');
  await page.getByRole('button', { name: '恢复默认操作', exact: true }).click();
  await expect(page.getByLabel('相位跃迁按键')).toHaveValue('Space');
});
test('standard Gamepad API input drives real combat, resources, pause and disconnect fallback', async ({
  page,
}) => {
  // A controlled browser API fixture, explicitly not a physical-controller test.
  await page.addInitScript(() => {
    const pad = {
      connected: true,
      index: 0,
      mapping: 'standard',
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    };
    Object.assign(window, { testPad: pad });
    Object.defineProperty(navigator, 'getGamepads', {
      value: () => [pad],
      configurable: true,
    });
  });
  const setPad = (axes: number[], buttons: number[]) =>
    page.evaluate(
      ({ axes, buttons }) => {
        const pad = (
          window as unknown as {
            testPad: {
              axes: number[];
              buttons: { pressed: boolean; value: number }[];
            };
          }
        ).testPad;
        pad.axes = axes;
        pad.buttons.forEach((b, index) => {
          b.pressed = buttons.includes(index);
          b.value = Number(b.pressed);
        });
      },
      { axes, buttons },
    );
  await ready(page);
  await page.evaluate(() => {
    const w = window.arcQA.engine.world;
    w.enemies = [];
    w.wave = 99;
    w.spawnTimer = 999;
    w.player.invulnerable = 999;
    w.wallet.bombs = 2;
    w.wallet.tonics = 2;
    const enemy = w.spawn('sentry', 950, w.player.y);
    enemy.hp = enemy.maxHp = 10000;
    enemy.timer = 999;
    enemy.state = 'cooldown';
    enemy.speed = 0;
  });
  const x = await page.evaluate(() => window.arcQA.engine.world.player.x);
  await setPad([0.7, 0, 1, 0], [7]);
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.player.x))
    .toBeGreaterThan(x + 20);
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.totalDamage))
    .toBeGreaterThan(0);
  await setPad([0, 0, 1, 0], [0, 4, 5]);
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.player.dashCd))
    .toBeGreaterThan(0.7);
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.player.qCd))
    .toBeGreaterThan(1);
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.player.eCd))
    .toBeGreaterThan(1);
  await page.evaluate(() => {
    window.arcQA.engine.world.player.hp = 70;
  });
  await setPad([0, 0, 1, 0], [2, 3]);
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.wallet.bombs))
    .toBe(1);
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.wallet.tonics))
    .toBe(1);
  await setPad([0, 0, 0, 0], [9]);
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.phase))
    .toBe('paused');
  const time = await page.evaluate(() => window.arcQA.engine.world.elapsed);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.arcQA.engine.world.elapsed)).toBe(
    time,
  );
  await setPad([0, 0, 0, 0], []);
  await page.waitForTimeout(50);
  await setPad([0, 0, 0, 0], [9]);
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.phase))
    .toBe('playing');
  // A fresh Start press in an unfocused window must not resume combat.
  await setPad([0, 0, 0, 0], []);
  await page.waitForTimeout(80);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.phase))
    .toBe('paused');
  const blurredTime = await page.evaluate(
    () => window.arcQA.engine.world.elapsed,
  );
  await setPad([0, 0, 0, 0], [9]);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.arcQA.engine.world.phase)).toBe(
    'paused',
  );
  expect(await page.evaluate(() => window.arcQA.engine.world.elapsed)).toBe(
    blurredTime,
  );
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.arcQA.engine.world.phase)).toBe(
    'paused',
  );
  await setPad([0, 0, 0, 0], []);
  await page.waitForTimeout(80);
  await setPad([0, 0, 0, 0], [9]);
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.phase))
    .toBe('playing');
  await setPad([0, 0, 0, 0], []);
  await page.waitForTimeout(80);
  // No intermediate animation frame: model the hidden-tab polling gap.
  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
    const pad = (
      window as unknown as {
        testPad: { buttons: { pressed: boolean; value: number }[] };
      }
    ).testPad;
    pad.buttons[9] = { pressed: true, value: 1 };
    window.dispatchEvent(new Event('focus'));
  });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.arcQA.engine.world.phase)).toBe(
    'paused',
  );
  await setPad([0, 0, 0, 0], []);
  await page.waitForTimeout(80);
  await setPad([0, 0, 0, 0], [9]);
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.phase))
    .toBe('playing');
  await page.evaluate(() => {
    (
      window as unknown as { testPad: { connected: boolean } }
    ).testPad.connected = false;
  });
  await expect
    .poll(() => page.evaluate(() => window.arcQA.engine.world.player.dashTime))
    .toBe(0);
  // Retrace the already traversed horizontal path; the vertical route can hit terrain.
  const before = await page.evaluate(() => window.arcQA.engine.world.player.x);
  await page.keyboard.down('a');
  try {
    await expect
      .poll(() => page.evaluate(() => window.arcQA.engine.world.player.x))
      .toBeLessThan(before - 20);
  } finally {
    await page.keyboard.up('a');
  }
});
