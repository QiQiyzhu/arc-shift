import { expect, test } from '@playwright/test';
import type {} from './qa';

test('live Canvas reaction labels follow the saved language and numeric pool reuse', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?qa');
  await page.getByRole('button', { name: '开始行动', exact: true }).click();
  await page.locator('.draft-panel .protocol-card').first().click();
  await page.waitForFunction(() => window.arcQA?.engine.world.phase === 'playing');
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  // Presentation fixture: keep these three events visible while using real settings.
  await page.evaluate(() => {
    const effects = window.arcQA.scene!.effects;
    effects.clear();
    ['热裂变', '电浆回路', '坍缩火种'].forEach((reaction, i) => effects.emit({
      kind: 'reward', x: 390 + i * 250, y: 550, color: 0xffffff, reaction,
    }));
    effects.labels.filter(label => label.visible).forEach(label => label.setData('life', 60));
  });
  const labels = () => page.evaluate(() => window.arcQA.scene!.effects.labels
    .filter(label => label.visible).map(label => label.text));
  expect(await labels()).toEqual(['热裂变', '电浆回路', '坍缩火种']);
  await page.getByRole('button', { name: '系统设置', exact: true }).click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect.poll(labels).toEqual(['Thermal Fission', 'Plasma Circuit', 'Collapse Seed']);
  await page.keyboard.press('Escape');
  // Remove only the pause overlay for the fixture screenshot; simulation stays paused.
  await page.addStyleTag({ content: '.modal-shade { visibility: hidden; }' });
  await page.screenshot({ path: 'outputs/qa/v23-canvas-reactions-en.png' });
  await page.evaluate(() => {
    const effects = window.arcQA.scene!.effects;
    effects.clear();
    effects.emit({ kind: 'hurt', amount: 42, x: 640, y: 400, color: 0xffffff });
    effects.labels.find(label => label.visible)!.setData('life', 60);
    window.arcQA.engine.save.settings.language = 'zh';
  });
  await expect.poll(labels).toEqual(['−42']);
  expect(errors).toEqual([]);
});
