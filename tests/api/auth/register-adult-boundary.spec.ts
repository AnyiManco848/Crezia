import { expect, test } from '@playwright/test';
import { assertApiTestRun } from '../../../src/config/testDbGuard';
import { UNDERAGE_MESSAGE } from '../../../src/domain/entities/User';
import { ValidationError } from '../../../src/domain/errors';
import { createPrismaClient } from '../../../src/infrastructure/prisma/client';
import { PrismaUserRepository } from '../../../src/infrastructure/repositories/PrismaUserRepository';
import { birthDateForAge, registerPayload } from '../../../data/registration';
import { register } from '../../../services/auth.service';
import { deleteE2eUsers } from '../../../utils/testDb';

// DEF-002 (docs/testing/defectos.md): the API checks the age with the UTC date and the database check
// chk_users_adult uses CURRENT_DATE in the time zone of its session. When the database is behind UTC (a local
// PostgreSQL in Colombia in the evening) the two disagree for one day and the insert used to end in a 500.
//
// These tests give the same answer at ANY hour of the day and in ANY time zone of the database:
//  - the first one forces the database check directly, with a birth date that violates it everywhere;
//  - the second one walks the three days around the limit and only asks "never 500, and always a clear answer".
// They CREATE users (only the e2e ones, deleted at the end) and only run against the TEST database.
test.describe('Auth API - the day the person turns 18 (DEF-002)', () => {
  test.beforeAll(async () => {
    assertApiTestRun();
    await deleteE2eUsers();
  });

  test.afterAll(async () => {
    await deleteE2eUsers();
  });

  test('the database check chk_users_adult comes out as the age validation error, not as a raw database error', async () => {
    const prisma = createPrismaClient();
    try {
      const repository = new PrismaUserRepository(prisma);
      const user = registerPayload({ birthDate: new Date().toISOString().slice(0, 10) }); // born today: under 18 in every time zone

      const error = await repository
        .create({
          name: 'PW Registro Prueba',
          documentId: user.documentId as string,
          email: user.email as string,
          passwordHash: 'not-a-real-hash',
          birthDate: user.birthDate as string,
          phone: null,
          preferredCurrencyCode: 'COP',
        })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).details).toEqual([{ path: 'body.birthDate', message: UNDERAGE_MESSAGE }]);
    } finally {
      await prisma.$disconnect();
    }
  });

  test('never answers 500 around the limit date: 201 or a clear 400', async ({ request }) => {
    // The API limit is "today in UTC minus 18 years". The database limit is the same day or the day before,
    // depending on its time zone and the hour. So: the day before the limit is always an adult, the day after is
    // always a minor, and the limit day itself is either (never a 500).
    const dayBefore = await register(request, registerPayload({ birthDate: birthDateForAge(18, -1) }));
    const limitDay = await register(request, registerPayload({ birthDate: birthDateForAge(18, 0) }));
    const dayAfter = await register(request, registerPayload({ birthDate: birthDateForAge(18, 1) }));

    expect(dayBefore.status()).toBe(201);
    expect(dayAfter.status()).toBe(400);
    expect(JSON.stringify(await dayAfter.json())).toContain(UNDERAGE_MESSAGE);

    expect([201, 400], 'the limit day must be accepted or refused with a 400, never a 500').toContain(limitDay.status());
    if (limitDay.status() === 400) {
      const body = await limitDay.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details).toEqual([{ path: 'body.birthDate', message: UNDERAGE_MESSAGE }]);
    }
  });
});
