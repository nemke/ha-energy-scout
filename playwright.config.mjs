import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

export default defineConfig({
  testDir: 'tests/browser',
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:8814',
    colorScheme: 'dark',
    headless: true,
    launchOptions: existsSync('/opt/google/chrome/chrome')
      ? { executablePath: '/opt/google/chrome/chrome' }
      : {},
  },
  webServer: {
    command: `${process.env.SCOUT_PYTHON || 'python3'} -m tests.preview_server`,
    url: 'http://127.0.0.1:8814',
    timeout: 180000,
    reuseExistingServer: !process.env.CI,
  },
});
