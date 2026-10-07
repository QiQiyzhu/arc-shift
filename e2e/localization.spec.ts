import { expect, test, type Page } from '@playwright/test';
import type {} from '../src/trial/TrialArena';
import type {} from '../src/activities/ActivityArena';
import fs from 'node:fs';
const out = 'outputs/qa/v23-localization';
fs.mkdirSync(out, { recursive: true });
async function expectEnglish(page: Page, selector: string) {
  const text = (await page.locator(selector).innerText()).replace(/中文/g, '');
  expect(text.match(/[^\n]*[\u3400-\u9fff][^\n]*/g) || []).toEqual([]);
}
async function english(page: Page) {
  await page.goto('/?qa');
  await page.getByRole('button', { name: '系统设置', exact: true }).click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.keyboard.press('Escape');
}

test('switches the interface language and persists the choice', async ({
  page,
}) => {
  await page.goto('/?qa');
  await page.getByRole('button', { name: '系统设置', exact: true }).click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'System Settings' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Start run', exact: true }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Start run', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'System settings', exact: true })
    .click();
  await page.getByRole('button', { name: '中文', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '系统设置' })).toBeVisible();
});

test('English is retained across newly opened camp panels, help, cards and coach', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await english(page);
  await page.getByRole('button', { name: 'Camp & Codex' }).click();
  await expectEnglish(page, '.utility-dialog');
  for (const tab of [
    'Relics',
    'Protocols',
    'Codex',
    'Lore',
    'Trials',
    'Guide',
  ]) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await expectEnglish(page, '.utility-dialog');
  }
  await page.screenshot({
    path: `${out}/help-en.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Open tactical coach', exact: true })
    .click();
  await expectEnglish(page, '.coach-panel');
  await page
    .getByRole('button', { name: 'Compare candidates', exact: true })
    .click();
  await expect(page.locator('.coach-result')).toHaveCount(3, {
    timeout: 20000,
  });
  await expectEnglish(page, '.coach-panel');
  await page.screenshot({
    path: `${out}/coach-en.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Start run', exact: true }).click();
  await expect(page.locator('.draft-cards')).toBeVisible();
  await expectEnglish(page, '.draft-panel');
  await page.screenshot({
    path: `${out}/draft-en.png`,
    fullPage: true,
    animations: 'disabled',
  });
  expect(errors).toEqual([]);
});

test('build expedition translates selection, combat and result without changing progress', async ({
  page,
}) => {
  await page.goto('/build-trial?qa');
  await page.getByRole('button', { name: '切换为 English' }).click();
  await expectEnglish(page, '.trial-shell');
  await page
    .getByRole('button', { name: 'Equip Triple Sun', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Equip Ember Script', exact: true })
    .click();
  await page.screenshot({
    path: `${out}/trial-en.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page
    .getByRole('button', { name: 'Lock build and enter combat' })
    .click();
  await page.waitForFunction(
    () => window.buildTrialQA?.session.engine.world.phase === 'playing',
  );
  await page.getByRole('button', { name: 'Switch to 中文' }).click();
  await expect(
    page.getByRole('button', { name: '暂停', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '切换为 English' }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Trial paused' }),
  ).toBeVisible();
  await expectEnglish(page, '.trial-shell');
  await page.getByRole('button', { name: 'Resume trial', exact: true }).click();
  // Clear boundary fixture exposes the real contract UI without a long battle.
  await page.evaluate(() => {
    window.buildTrialQA!.session.engine.world.enemies = [];
  });
  await page
    .getByRole('button', { name: 'Choose route contract', exact: true })
    .click();
  await expectEnglish(page, '.trial-contract');
  await page.screenshot({
    path: `${out}/contract-en.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page
    .getByRole('button', { name: 'Sign supply contract', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Lock build and enter combat' })
    .click();
  await page.waitForFunction(
    () => window.buildTrialQA?.session.engine.world.phase === 'playing',
  );
  // Result boundary fixture verifies presentation only; it is not recorded gameplay.
  await page.evaluate(() => {
    window.buildTrialQA!.session.engine.world.player.hp = 0;
  });
  await expect(
    page.getByRole('dialog', { name: 'Build report' }),
  ).toBeVisible();
  await expectEnglish(page, '.trial-shell');
  await page.screenshot({
    path: `${out}/trial-result-en.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Switch to 中文' }),
  ).toBeVisible();
});

test('relay challenge translates lobby, pause, evacuation and settlement', async ({
  page,
}) => {
  await page.goto('/challenge?qa');
  await page.getByRole('button', { name: '切换为 English' }).click();
  await expectEnglish(page, '.activity-shell');
  await page.screenshot({
    path: `${out}/challenge-en.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page
    .getByRole('button', { name: 'Start challenge', exact: true })
    .click();
  await page.waitForFunction(
    () => window.activityQA?.session.engine.world.phase === 'playing',
  );
  await page.getByRole('button', { name: 'Pause / resume' }).click();
  await expectEnglish(page, '.activity-shell');
  await page
    .getByRole('button', { name: 'Leave challenge', exact: true })
    .click();
  await expectEnglish(page, '.activity-dialog');
  await page
    .getByRole('button', { name: 'Confirm evacuation', exact: true })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Challenge result' }),
  ).toBeVisible();
  await expectEnglish(page, '.activity-shell');
  await page
    .getByRole('button', { name: 'Confirm result', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Return to challenge lobby', exact: true })
    .click();
  await expectEnglish(page, '.activity-shell');
});

test('English covers the route map, every encounter kind and tutorial objectives', async ({
  page,
}) => {
  await english(page);
  await page.getByRole('button', { name: 'Start run', exact: true }).click();
  await page.locator('.protocol-card').first().click();
  // Route and encounter boundary fixtures isolate presentation from combat duration.
  await page.evaluate(() => {
    window.arcQA.engine.world.phase = 'map';
  });
  await expect(page.locator('.pilgrimage-map')).toBeVisible();
  await expectEnglish(page, '.pilgrimage-map');
  await page.screenshot({
    path: `${out}/route-en.png`,
    fullPage: true,
    animations: 'disabled',
  });
  for (const kind of [
    'forge',
    'archive',
    'heal',
    'event',
    'shop',
    'treasure',
  ]) {
    await page.evaluate((nextKind) => {
      const qa = window.arcQA;
      const node = qa.nodes().find((n) => n.room.kind === nextKind)!;
      qa.node(node.id);
      qa.engine.world.phase = 'event';
    }, kind);
    await expect(page.locator(`.encounter-${kind}`)).toBeVisible();
    await expectEnglish(page, '.encounter-panel');
  }
  await page.screenshot({
    path: `${out}/encounter-en.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page.evaluate(() => {
    window.arcQA.engine.world.phase = 'menu';
  });
  await page.getByRole('button', { name: /First Shift/ }).click();
  for (let i = 0; i < 4; i++) {
    await expect(page.locator('.field-guide')).toBeVisible();
    await expectEnglish(page, '.field-guide');
    await page.getByRole('button', { name: 'Skip this prompt' }).click();
  }
  await expect(page.locator('.guide-choice')).toBeVisible();
  await expectEnglish(page, '.guide-choice');
  await page.getByRole('button', { name: /Plasma Sword Dance/ }).click();
  await expect(page.locator('.field-guide')).toBeVisible();
  await expectEnglish(page, '.field-guide');
  await page.screenshot({
    path: `${out}/tutorial-en.png`,
    fullPage: true,
    animations: 'disabled',
  });
});
