import { expect, test } from '@playwright/test';
import fs from 'node:fs';
const out = 'outputs/qa/v24-player';
fs.mkdirSync(out, { recursive: true });

for (const language of ['zh', 'en'] as const) {
  test(`${language}: readable menu, first play, guide and backup settings at short desktop height`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');
    if (language === 'en')
      await page
        .getByRole('button', { name: '切换为 English', exact: true })
        .click();
    const isEnglish = language === 'en';
    await expect(
      page.getByRole('button', {
        name: isEnglish ? 'Start run' : '开始行动',
        exact: true,
      }),
    ).toBeEnabled();
    await expect(page.locator('.launch-basics')).toContainText('W');
    expect(
      await page
        .locator('.menu-copy')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    await page.screenshot({ path: `${out}/menu-${language}-768.png` });
    await page
      .getByRole('button', {
        name: isEnglish ? 'How to play' : '操作指南',
        exact: true,
      })
      .click();
    await expect(page.getByRole('dialog')).toContainText(
      isEnglish ? 'Hold to fire' : '按住射击',
    );
    await page.screenshot({ path: `${out}/help-${language}-768.png` });
    await page.keyboard.press('Escape');
    await page
      .getByRole('button', {
        name: isEnglish ? 'System settings' : '系统设置',
        exact: true,
      })
      .click();
    await page
      .getByRole('button', {
        name: isEnglish ? 'Download save backup' : '下载存档备份',
        exact: true,
      })
      .scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/settings-${language}-768.png` });
    await page.keyboard.press('Escape');
    await page
      .getByRole('button', {
        name: isEnglish
          ? 'New here? Learn the basics →'
          : '新手引导 · 先学基础操作 →',
        exact: true,
      })
      .click();
    await expect(page.locator('.field-guide')).toBeVisible();
    await page
      .getByRole('button', {
        name: isEnglish ? 'Exit tutorial' : '退出行动演练',
        exact: true,
      })
      .click();
    await expect(
      page.getByRole('button', {
        name: isEnglish ? 'Start run' : '开始行动',
        exact: true,
      }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('saved run is summarized, protected from accidental replacement, and survives a tutorial', async ({
  page,
}) => {
  await page.goto('/?qa');
  await page.getByRole('button', { name: '开始行动', exact: true }).click();
  await page.getByRole('button', { name: /余烬协议：/ }).click();
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem('arcshift.save.v1')!).checkpoint,
  );
  await page.reload();
  await expect(page.getByLabel('存档摘要')).toContainText('120 HP');
  await page.getByRole('button', { name: '开始行动', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: '开始新行动并替换存档？' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('arcshift.save.v1')!).checkpoint,
    ),
  ).toEqual(before);
  await page
    .getByRole('button', { name: '新手引导 · 先学基础操作 →', exact: true })
    .click();
  // Completion fixture exercises the actual tutorial → campaign action and guard.
  await page.evaluate(() => {
    window.arcQA.guide!.step = 'complete';
  });
  await page.getByRole('button', { name: '进入正式行动', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: '开始新行动并替换存档？' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '保留当前行动', exact: true }).click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('arcshift.save.v1')!).checkpoint,
    ),
  ).toEqual(before);
  await page.getByRole('button', { name: '开始行动', exact: true }).click();
  await page
    .getByRole('button', { name: '确认开始新行动', exact: true })
    .click();
  await expect(page.locator('.draft-cards')).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('arcshift.save.v1')!).checkpoint,
    ),
  ).toBeNull();
});

test('backup download, invalid file, preview cancellation and confirmed restore', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '系统设置', exact: true }).click();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载存档备份', exact: true }).click();
  const download = await downloadEvent;
  const path = `${out}/downloaded-save.json`;
  await download.saveAs(path);
  const backup = JSON.parse(fs.readFileSync(path, 'utf8'));
  expect(backup.format).toBe('arc-shift-backup');
  const old = await page.evaluate(() =>
    localStorage.getItem('arcshift.save.v1'),
  );
  await page.getByLabel('选择存档备份', { exact: true }).setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{}'),
  });
  await expect(page.locator('.save-manager output')).toContainText(
    '当前进度未更改',
  );
  expect(
    await page.evaluate(() => localStorage.getItem('arcshift.save.v1')),
  ).toBe(old);
  await page.getByLabel('选择存档备份', { exact: true }).setInputFiles({
    name: 'oversize.json',
    mimeType: 'application/json',
    buffer: Buffer.alloc(512 * 1024 + 1, 32),
  });
  await expect(page.locator('.save-manager output')).toContainText(
    '当前进度未更改',
  );
  expect(
    await page.evaluate(() => localStorage.getItem('arcshift.save.v1')),
  ).toBe(old);
  backup.save.meta.shards = 73;
  backup.save.settings.language = 'en';
  const imported = {
    name: 'restore.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  };
  await page
    .getByLabel('选择存档备份', { exact: true })
    .setInputFiles(imported);
  await expect(page.locator('.restore-preview')).toContainText('73');
  await page.getByRole('button', { name: '取消恢复', exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem('arcshift.save.v1')),
  ).toBe(old);
  await page
    .getByLabel('选择存档备份', { exact: true })
    .setInputFiles(imported);
  await page.evaluate(() => {
    const original = Object.getOwnPropertyDescriptor(
      Storage.prototype,
      'setItem',
    )!;
    Object.assign(window, {
      restoreStorageForTest: () => {
        Object.defineProperty(Storage.prototype, 'setItem', original);
      },
    });
    Storage.prototype.setItem = () => {
      throw new DOMException('Storage disabled', 'QuotaExceededError');
    };
  });
  await page
    .getByRole('button', { name: '替换并恢复存档', exact: true })
    .click();
  await expect(page.locator('.save-manager output')).toContainText(
    '备份尚未应用',
  );
  expect(
    await page.evaluate(() => localStorage.getItem('arcshift.save.v1')),
  ).toBe(old);
  await page.evaluate(() =>
    (
      window as unknown as { restoreStorageForTest: () => void }
    ).restoreStorageForTest(),
  );
  await page
    .getByRole('button', { name: '替换并恢复存档', exact: true })
    .click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Start run', exact: true }),
  ).toBeVisible();
  await page.reload();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('arcshift.save.v1')!).meta.shards,
    ),
  ).toBe(73);
  await expect(
    page.getByRole('button', { name: 'Start run', exact: true }),
  ).toBeVisible();
});

test('a failed route download presents a safe retry and recovers', async ({
  page,
}) => {
  await page.route('**/src/frontier/FrontierApp.tsx*', (route) =>
    route.abort('failed'),
  );
  await page.goto('/frontier');
  await expect(
    page.getByRole('heading', { name: '暂时无法进入游戏' }),
  ).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('重试不会清除存档');
  await page.screenshot({ path: `${out}/launch-recovery-zh.png` });
  await page.unroute('**/src/frontier/FrontierApp.tsx*');
  await page.getByRole('button', { name: '重新加载', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '重连失落信标', exact: true }),
  ).toBeVisible();
});

test('touch-only visitors see and can dismiss the controls requirement', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173/');
  await expect(page.locator('.device-notice')).toContainText(
    '尚未提供触屏战斗按键',
  );
  await expect(
    page.getByRole('button', { name: '开始行动', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: `${out}/touch-notice.png` });
  await page.getByRole('button', { name: '知道了', exact: true }).click();
  await expect(page.locator('.device-notice')).not.toBeVisible();
  await context.close();
});
