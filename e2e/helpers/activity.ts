import { expect, type Page } from '@playwright/test';

/** Reach the circle using only real keyboard input and the public activity HUD. */
export async function enterCaptureCircle(page: Page) {
  const remainingTime = page.getByLabel('剩余时间');
  const captureProgress = page.getByLabel('驻留进度');
  const initialRemaining = parseFloat((await remainingTime.textContent())!);
  // Canvas visibility precedes input readiness. Software WebGL can stretch the
  // entry transition, so wait for the public timer to prove play has begun.
  await expect
    .poll(async () => parseFloat((await remainingTime.textContent())!), {
      timeout: 30000,
      message: 'the challenge timer starts after the entry transition',
    })
    .toBeLessThan(initialRemaining);
  await page.keyboard.down('w');
  try {
    // Travel depends on simulation frames, not wall time. Stop as soon as the
    // visible HUD confirms entry into the circle, before crossing its far edge.
    await expect
      .poll(async () => parseFloat((await captureProgress.textContent())!), {
        intervals: [50],
        timeout: 30000,
        message: 'real keyboard movement reaches the capture circle',
      })
      .toBeGreaterThan(0);
  } finally {
    await page.keyboard.up('w');
  }
}
