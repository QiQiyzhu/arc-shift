import { test, expect } from '@playwright/test';
for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]) {
  test(`long synergy reward keeps reroll reachable above the footer at ${viewport.height}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/?qa');
    await page.waitForFunction(() => !!window.arcQA);
    await page.evaluate(async () => {
      const modulePath = '/src/cards/catalog.ts';
      const { CARDS } = await import(modulePath);
      const e = window.arcQA.engine;
      e.start(1971);
      const w = e.world, offers = ['storm-arc', 'fire-fuel', 'storm-critical'];
      w.cards = CARDS.filter((c: { id: string }) => !offers.includes(c.id)).map((c: { id: string }) => c.id);
      w.rewards = offers.map(id => CARDS.find((c: { id: string }) => c.id === id));
      w.rewardContext = 'clear'; w.weapon = 'sword'; w.wallet.coins = 100;
    });
    await expect(page.locator('.draft-panel .synergy-preview')).not.toHaveCount(0);
    const reroll = page.getByRole('button', { name: /12 金币 · 重抽协议/ });
    await reroll.click(); // Normal pointer hit-testing; no force click hides overlap.
    await expect(page.getByRole('button', { name: /18 金币 · 重抽协议/ })).toBeVisible();
    expect(await page.evaluate(() => window.arcQA.engine.world.rerolls)).toBe(1);
    await page.screenshot({ path: `outputs/qa/reward-scroll-${viewport.height}.png` });
  });
}
