import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base,
  testDir: './e2e-production',
  reporter: [['list'], ['json', { outputFile: 'outputs/qa/production-results.json' }]],
  outputDir: 'outputs/qa/production',
  use: { ...base.use, baseURL: 'http://127.0.0.1:5178' },
  webServer: {
    command: 'npm run start -- --port 5178 --strictPort',
    url: 'http://127.0.0.1:5178',
    reuseExistingServer: false,
  },
});
