import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  // CI uses software WebGL: preserve assertions while allowing simulation-driven
  // transitions and multi-reload journeys to finish on a slower renderer.
  timeout: process.env.CI ? 180000 : 45000,
  expect: { timeout: process.env.CI ? 30000 : 5000 },
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'outputs/qa/browser-results.json' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    headless: true,
    channel:
      process.env.PLAYWRIGHT_CHANNEL ||
      (process.platform === 'win32' ? 'msedge' : undefined),
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
  },
  outputDir: 'outputs/qa/results',
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
  },
});
