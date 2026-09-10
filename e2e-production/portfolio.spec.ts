import { test, expect } from '@playwright/test';

test('public portfolio connects five real project dossiers and accessible media', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/portfolio/');
  await expect(page.locator('article.project')).toHaveCount(5);
  const dossiers = await page
    .locator('.project-links a')
    .filter({ hasText: 'A–T 面试手册' })
    .evaluateAll((links) =>
      links.map((link) => (link as HTMLAnchorElement).href),
    );
  expect(dossiers).toHaveLength(5);
  await page.locator('#repopilot a[data-view="video"]').click();
  const dialog = page.locator('#media-dialog');
  await expect(dialog).toBeVisible();
  await expect
    .poll(() =>
      dialog
        .locator('video')
        .evaluate((video: HTMLVideoElement) => video.duration),
    )
    .toBeGreaterThan(29);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('#repopilot a[data-view="video"]')).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'outputs/qa/portfolio-mobile.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: 'outputs/qa/portfolio-desktop.png',
    fullPage: true,
  });
  for (const url of dossiers) {
    const response = await page.goto(url);
    expect(response?.status()).toBe(200);
    await expect(
      page.locator('h2').filter({ hasText: /^[A-T]\. / }),
    ).toHaveCount(20);
    await expect(page.locator('figure.diagram svg').first()).toBeAttached();
    await expect(page.locator('.diagram-error')).toHaveCount(0);
    expect(
      await page
        .locator('a[href^="http://127.0.0.1"],a[href^="http://localhost"]')
        .count(),
    ).toBe(0);
    expect(
      await page.evaluate(() =>
        [...document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')].every(
          (link) => document.getElementById(link.hash.slice(1)),
        ),
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
