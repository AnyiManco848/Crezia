import { defineConfig } from '@playwright/test';

// End-to-end tests of the front against a LOCAL backend that uses the TEST database (.env.test).
// This config starts only the front. The backend is started by hand (see README, "Pruebas E2E") so these
// tests can never start it pointing at the real database by accident.
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
