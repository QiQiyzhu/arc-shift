import { expect, test } from '@playwright/test';
import type {} from '../src/frontier/FrontierArena';

test('frontier deployment, live language, keyboard controls and modal pause', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/frontier?qa=1');
  await expect(
    page.getByRole('heading', { name: '重连失落信标' }),
  ).toBeVisible();
  await page.getByRole('button', { name: /重炮/ }).click();
  await page.getByRole('checkbox', { name: /辅助演练/ }).check();
  await page.screenshot({
    path: 'outputs/qa/v23-frontier-briefing-zh.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: '开始行动', exact: true }).click();
  await page.waitForFunction(
    () => window.frontierQA?.session.engine.world.phase === 'playing',
  );
  const before = await page.evaluate(
    () => window.frontierQA!.session.engine.world.player.x,
  );
  await page.keyboard.down('d');
  await page.waitForTimeout(350);
  await page.keyboard.up('d');
  expect(
    await page.evaluate(() => window.frontierQA!.session.engine.world.player.x),
  ).toBeGreaterThan(before + 25);
  await page.getByRole('button', { name: '切换为 English' }).click();
  await expect(
    page.getByRole('heading', { name: 'Reconnect the lost relays' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pause operation' }).click();
  await expect(
    page.getByRole('heading', { name: 'Operation paused' }),
  ).toBeVisible();
  const time = await page.evaluate(() => window.frontierQA!.session.ticks);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.frontierQA!.session.ticks)).toBe(
    time,
  );
  await page.screenshot({
    path: 'outputs/qa/v23-frontier-relay-en.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Controls', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Controls', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Understood', exact: true }).click();
  await page
    .getByRole('button', { name: 'Resume operation', exact: true })
    .click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Leave operation', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Stay here', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Operation paused' }),
  ).toBeVisible();
  // Explicit QA navigation below verifies persisted locale independently of the active operation.
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/frontier?qa=1');
  await expect(
    page.getByRole('button', { name: 'Deploy', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

for (const route of ['grove', 'foundry'] as const) {
  test(`frontier ${route} objective and guardian are reachable through the product flow`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/frontier?qa=1');
    await page.getByRole('button', { name: '开始行动', exact: true }).click();
    await page.waitForFunction(() => Boolean(window.frontierQA));
    // Unit-like QA fixture advances objective positions; these screenshots are not recording evidence.
    await page.evaluate(() => {
      const { session: s, scene } = window.frontierQA!;
      scene.externalSimulation = () => {};
      const w = s.engine.world,
        input = {
          x: 0,
          y: 0,
          aimX: 640,
          aimY: 250,
          fire: false,
          dash: false,
          q: false,
          e: false,
        };
      w.phase = 'playing';
      if (s.objective.kind !== 'relay') throw Error('relay');
      for (const node of s.objective.nodes) {
        Object.assign(w.player, { x: node.x, y: node.y, vx: 0, vy: 0 });
        for (let i = 0; i < 193; i++) {
          w.enemies = [];
          s.step(1 / 60, input);
        }
      }
    });
    await expect(
      page.getByRole('heading', { name: '信号已连通。选择下一条航路。' }),
    ).toBeVisible();
    await page.screenshot({
      path: `outputs/qa/v23-frontier-route-${route}.png`,
      fullPage: true,
    });
    await page
      .getByRole('button', {
        name: route === 'grove' ? /选择林地航路/ : /选择铸庭航路/,
      })
      .click();
    await page.getByRole('button', { name: '开始行动', exact: true }).click();
    await page.waitForFunction(
      () =>
        window.frontierQA?.session.stage === 1 &&
        window.frontierQA.session.engine.world.phase === 'playing',
    );
    await page.screenshot({
      path: `outputs/qa/v23-frontier-${route}-zh.png`,
      fullPage: true,
    });
    await page.getByRole('button', { name: '切换为 English' }).click();
    const canvasLabels = () => page.evaluate(() =>
      window.frontierQA!.scene.children.list
        .filter(child => child.type === 'Text' && (child as { visible?: boolean }).visible)
        .map(child => (child as unknown as { text: string }).text),
    );
    await expect.poll(canvasLabels).toContain(
      route === 'grove' ? 'EXTRACTION 0/3' : 'APPROACH TO ESCORT',
    );
    expect((await canvasLabels()).join(' ')).not.toMatch(/[\u3400-\u9fff]/);
    await page.screenshot({
      path: `outputs/qa/v23-frontier-${route}-en.png`, fullPage: true,
    });
    await page.getByRole('button', { name: 'Switch to 中文' }).click();
    await page.evaluate(() => {
      const { session: s, scene } = window.frontierQA!;
      scene.externalSimulation = () => {};
      const w = s.engine.world,
        input = {
          x: 0,
          y: 0,
          aimX: 640,
          aimY: 250,
          fire: false,
          dash: false,
          q: false,
          e: false,
        },
        step = () => {
          w.enemies = [];
          w.player.vx = w.player.vy = 0;
          s.step(1 / 60, input);
        };
      w.phase = 'playing';
      if (s.objective.kind === 'salvage') {
        const o = s.objective;
        for (const relic of o.relics) {
          Object.assign(w.player, relic);
          step();
          Object.assign(w.player, o.base);
          step();
        }
      } else if (s.objective.kind === 'escort') {
        for (let i = 0; i < 1200 && s.state === 'combat'; i++) {
          Object.assign(w.player, s.objective.cart);
          step();
        }
      } else throw Error('route objective');
    });
    await page.getByRole('button', { name: '前往终端', exact: true }).click();
    await page.getByRole('button', { name: '开始行动', exact: true }).click();
    await page.waitForFunction(
      () =>
        window.frontierQA?.session.stage === 2 &&
        window.frontierQA.session.engine.world.phase === 'playing',
    );
    expect(
      await page.evaluate(
        () => window.frontierQA!.session.engine.world.boss?.kind,
      ),
    ).toBe(route === 'grove' ? 'matron' : 'forgemaster');
    await page.screenshot({
      path: `outputs/qa/v23-frontier-boss-${route}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}
