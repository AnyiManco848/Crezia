// Seed user (prisma/seed.ts). TEST_EMAIL and TEST_PASSWORD override it without touching the code.
export const testUser = {
  email: process.env.TEST_EMAIL ?? 'test@crezia.com',
  password: process.env.TEST_PASSWORD ?? 'Test123*',
};
