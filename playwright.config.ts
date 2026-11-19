import { defineConfig } from '@playwright/test';

const testMode = process.env.TEST_MODE === 'true';

// API tests only: they use the `request` fixture, so no browser is needed.
export default defineConfig({
  testDir: 'tests/api',
  testMatch: '**/*.spec.ts',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    extraHTTPHeaders: { Accept: 'application/json' },
  },
  // In test mode (npm run test:api:test, TEST_MODE=true from .env.test) the backend is started on the TEST database
  // and an already running server is NEVER reused: it could be connected to the real database.
  webServer: {
    command: testMode ? 'npm run dev:test' : 'npm run dev',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: !testMode,
    timeout: 60_000,
  },
});
