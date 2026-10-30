import { defineConfig } from '@playwright/test';

// API tests only: they use the `request` fixture, so no browser is needed.
export default defineConfig({
  testDir: 'tests/api',
  testMatch: '**/*.spec.ts',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    extraHTTPHeaders: { Accept: 'application/json' },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
