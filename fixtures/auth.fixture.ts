import { APIRequestContext, test as base, expect } from '@playwright/test';
import { testUser } from '../data/users';
import { login } from '../services/auth.service';

interface WorkerFixtures {
  // Request context shared by the worker; usable in beforeAll/afterAll, where `request` is not available.
  apiRequest: APIRequestContext;
  // Token of the test user. The login runs once per worker.
  authToken: string;
}

export const test = base.extend<object, WorkerFixtures>({
  apiRequest: [
    async ({ playwright }, use, workerInfo) => {
      const context = await playwright.request.newContext({ baseURL: workerInfo.project.use.baseURL });
      await use(context);
      await context.dispose();
    },
    { scope: 'worker' },
  ],

  authToken: [
    async ({ apiRequest }, use) => {
      const response = await login(apiRequest, testUser);
      // Only the status is reported: the token and the password are never printed.
      expect(response.status(), `Login of ${testUser.email} failed`).toBe(200);
      const { token } = await response.json();
      await use(token);
    },
    { scope: 'worker' },
  ],
});

export { expect };
