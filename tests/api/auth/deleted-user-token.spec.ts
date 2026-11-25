import { expect, test } from '@playwright/test';
import { assertApiTestRun } from '../../../src/config/testDbGuard';
import { bankAccountPayload } from '../../../data/payloads';
import { registerPayload } from '../../../data/registration';
import { register } from '../../../services/auth.service';
import { createBankAccount, deleteBankAccount, listBankAccounts } from '../../../services/bank-accounts.service';
import { E2E_LOGIN_DOCUMENT_PREFIX, deleteE2eLoginUsers, softDeleteE2eLoginUser } from '../../../utils/testDb';

const INVALID_TOKEN_MESSAGE = 'Token inválido o expirado';

// DEF-010: a token issued BEFORE the user was soft-deleted (deleted_at) must stop working, for reads and for writes. Creates (and
// soft-deletes) one user on the TEST database; it uses the E2L prefix so the registration tests' cleanup does not touch it.
// No row is ever created for that user (the write is refused), so the final hard delete of the user cannot hit a foreign key:
// if the refused POST had created a bank account, afterAll would fail.
test.describe('Auth API - token of a soft-deleted user (DEF-010)', () => {
  test.beforeAll(async () => {
    assertApiTestRun();
    await deleteE2eLoginUsers();
  });

  test.afterAll(async () => {
    await deleteE2eLoginUsers();
  });

  test('the token keeps working while the user is active and stops working for reads AND writes once deleted_at is set', async ({ request }) => {
    const base = registerPayload();
    const payload = { ...base, documentId: `${E2E_LOGIN_DOCUMENT_PREFIX}${(base.documentId as string).slice(3)}` };
    const created = await register(request, payload);
    expect(created.status()).toBe(201);
    const { token } = await created.json();

    // Control: while the user is active the same token is accepted.
    expect((await listBankAccounts(request, token)).status()).toBe(200);

    expect(await softDeleteE2eLoginUser(payload.email as string)).toBe(1);

    // Reads
    const list = await listBankAccounts(request, token);
    expect(list.status()).toBe(401);
    expect((await list.json()).error).toEqual({ code: 'UNAUTHORIZED', message: INVALID_TOKEN_MESSAGE });

    // Writes: create and delete are refused too
    const write = await createBankAccount(request, token, bankAccountPayload());
    expect(write.status()).toBe(401);
    expect((await write.json()).error.message).toBe(INVALID_TOKEN_MESSAGE);
    const remove = await deleteBankAccount(request, token, '7c9e6679-7425-40de-944b-e07fc1f90ae7');
    expect(remove.status()).toBe(401);

    // Same answer as a forged token: it does not say the user was deleted.
    const forged = await listBankAccounts(request, 'not-a-jwt');
    expect(forged.status()).toBe(401);
    expect((await forged.json()).error).toEqual({ code: 'UNAUTHORIZED', message: INVALID_TOKEN_MESSAGE });
  });
});
