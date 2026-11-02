import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

export default defineConfig({
  testDir: 'tests/browser',
  maxFailures: 1,
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
    // HA serves its root before bootstrap creates the preview login. This
    // integration asset is registered only after that login has been written.
    url: 'http://127.0.0.1:8814/energy_scout_static/energy-scout-panel.js',
    timeout: 180000,
    reuseExistingServer: !process.env.CI,
  },
});
