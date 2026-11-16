import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CreateBankAccountUseCase,
  type CreateBankAccountInput,
} from '../../../src/application/bankAccounts/CreateBankAccountUseCase';
import { DeleteBankAccountUseCase } from '../../../src/application/bankAccounts/DeleteBankAccountUseCase';
import { GetBankAccountUseCase } from '../../../src/application/bankAccounts/GetBankAccountUseCase';
import { ListBankAccountsUseCase } from '../../../src/application/bankAccounts/ListBankAccountsUseCase';
import {
  CURRENCY_LOCKED_MESSAGE,
  UpdateBankAccountUseCase,
} from '../../../src/application/bankAccounts/UpdateBankAccountUseCase';
import { ConflictError, NotFoundError, ValidationError } from '../../../src/domain/errors';
import {
  InMemoryBankAccountRepository,
  InMemoryCurrencyRepository,
  type StoredBankAccount,
} from '../../helpers/InMemoryBankAccountRepository';

const ME = 'user-1';
const OTHER = 'user-2';

describe('bank account use cases', () => {
  let repo: InMemoryBankAccountRepository;
  let currencies: InMemoryCurrencyRepository;
  let mine: StoredBankAccount;
  let empty: StoredBankAccount;
  let others: StoredBankAccount;

  beforeEach(() => {
    repo = new InMemoryBankAccountRepository();
    currencies = new InMemoryCurrencyRepository();
    mine = repo.seed({ userId: ME, bankName: 'Bancolombia' });
    empty = repo.seed({ userId: ME, bankName: 'Nequi' });
    others = repo.seed({ userId: OTHER, bankName: 'Davivienda' });
    repo.seed({ userId: ME, bankName: 'Borrada', deletedAt: new Date(), deletedBy: ME });

    repo.addMovement(mine.id, 'Income', '3500000');
    repo.addMovement(mine.id, 'Expense', '1200000');
    repo.addMovement(mine.id, 'Expense', '50000', new Date());
    repo.addMovement(others.id, 'Income', '999');
  });

  describe('ListBankAccountsUseCase', () => {
    it('returns only own non-deleted accounts with their balances in one totals query', async () => {
      const result = await new ListBankAccountsUseCase(repo).execute(ME);

      expect(result.data.map((a) => [a.id, a.balance])).toEqual([
        [mine.id, '2300000.00'],
        [empty.id, '0.00'],
      ]);
      expect(result).toMatchObject({ page: 1, limit: 50, total: 2 });
      expect(repo.sumCalls).toBe(1);
    });

    it('returns the requested page, the total of all pages and totals only for that page', async () => {
      const result = await new ListBankAccountsUseCase(repo).execute(ME, { page: 2, limit: 1 });

      expect(result.data.map((a) => [a.id, a.balance])).toEqual([[empty.id, '0.00']]);
      expect(result).toMatchObject({ page: 2, limit: 1, total: 2 });
      expect(repo.sumCalls).toBe(1);
    });

    it('clamps limit to 100 and page to at least 1', async () => {
      const result = await new ListBankAccountsUseCase(repo).execute(ME, { page: 0, limit: 5000 });

      expect(result).toMatchObject({ page: 1, limit: 100 });
    });

    it('does not query totals when the user has no accounts', async () => {
      const result = await new ListBankAccountsUseCase(repo).execute('nobody');

      expect(result).toEqual({ data: [], page: 1, limit: 50, total: 0 });
      expect(repo.sumCalls).toBe(0);
    });
  });

  describe('GetBankAccountUseCase', () => {
    it('returns an own account with its balance', async () => {
      const result = await new GetBankAccountUseCase(repo).execute(mine.id, ME);

      expect(result).toMatchObject({ id: mine.id, balance: '2300000.00' });
    });

    it('throws NotFoundError for another user account', async () => {
      const attempt = new GetBankAccountUseCase(repo).execute(others.id, ME);

      await expect(attempt).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws NotFoundError for an unknown id', async () => {
      const attempt = new GetBankAccountUseCase(repo).execute('00000000-0000-4000-8000-000000000000', ME);

      await expect(attempt).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('CreateBankAccountUseCase', () => {
    const input: CreateBankAccountInput = { bankName: 'BBVA', accountType: 'Checking', currencyCode: 'USD' };

    it('creates an account owned by the authenticated user with audit fields and balance 0', async () => {
      const result = await new CreateBankAccountUseCase(repo, currencies).execute(input, ME);

      expect(result).toMatchObject({ ...input, accountAlias: null, userId: ME, balance: '0.00' });
      const stored = repo.rows.find((r) => r.id === result.id)!;
      expect(stored).toMatchObject({ createdBy: ME, updatedBy: ME });
    });

    it('ignores a userId sent in the input', async () => {
      const tricky = { ...input, userId: OTHER } as unknown as CreateBankAccountInput;

      const result = await new CreateBankAccountUseCase(repo, currencies).execute(tricky, ME);

      expect(result.userId).toBe(ME);
    });

    it('throws ValidationError when the currency does not exist', async () => {
      const create = vi.spyOn(repo, 'create');

      const attempt = new CreateBankAccountUseCase(repo, currencies).execute({ ...input, currencyCode: 'XYZ' }, ME);

      await expect(attempt).rejects.toBeInstanceOf(ValidationError);
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('UpdateBankAccountUseCase', () => {
    it('partially updates an own account, sets updatedBy and returns the balance', async () => {
      const result = await new UpdateBankAccountUseCase(repo, currencies).execute(
        mine.id,
        { accountAlias: 'Nómina' },
        ME,
      );

      expect(result).toMatchObject({ bankName: 'Bancolombia', accountAlias: 'Nómina', balance: '2300000.00' });
      expect(mine.updatedBy).toBe(ME);
    });

    it('throws NotFoundError for another user account', async () => {
      const attempt = new UpdateBankAccountUseCase(repo, currencies).execute(others.id, { bankName: 'Mío' }, ME);

      await expect(attempt).rejects.toBeInstanceOf(NotFoundError);
      expect(others.bankName).toBe('Davivienda');
    });

    it('throws ValidationError when the new currency does not exist', async () => {
      const attempt = new UpdateBankAccountUseCase(repo, currencies).execute(mine.id, { currencyCode: 'XYZ' }, ME);

      await expect(attempt).rejects.toBeInstanceOf(ValidationError);
      expect(mine.currencyCode).toBe('COP');
    });

    it('throws ConflictError when changing the currency of an account with movements', async () => {
      const update = vi.spyOn(repo, 'update');

      const attempt = new UpdateBankAccountUseCase(repo, currencies).execute(mine.id, { currencyCode: 'USD' }, ME);

      await expect(attempt).rejects.toBeInstanceOf(ConflictError);
      await expect(attempt).rejects.toThrow(CURRENCY_LOCKED_MESSAGE);
      expect(update).not.toHaveBeenCalled();
      expect(mine.currencyCode).toBe('COP');
    });

    it('allows sending the same currency on an account with movements', async () => {
      const result = await new UpdateBankAccountUseCase(repo, currencies).execute(
        mine.id,
        { currencyCode: 'COP', bankName: 'Bancolombia S.A.' },
        ME,
      );

      expect(result).toMatchObject({ currencyCode: 'COP', bankName: 'Bancolombia S.A.' });
    });

    it('allows changing the currency of an account without movements', async () => {
      const result = await new UpdateBankAccountUseCase(repo, currencies).execute(empty.id, { currencyCode: 'USD' }, ME);

      expect(result.currencyCode).toBe('USD');
    });

    it('allows changing the currency when all the account movements are deleted', async () => {
      repo.addMovement(empty.id, 'Income', '100', new Date());

      const result = await new UpdateBankAccountUseCase(repo, currencies).execute(empty.id, { currencyCode: 'USD' }, ME);

      expect(result.currencyCode).toBe('USD');
    });
  });

  describe('DeleteBankAccountUseCase', () => {
    it('soft deletes an own account filling deletedAt, deletedBy and updatedBy', async () => {
      await new DeleteBankAccountUseCase(repo).execute(mine.id, ME);

      expect(mine.deletedAt).toBeInstanceOf(Date);
      expect(mine).toMatchObject({ deletedBy: ME, updatedBy: ME });
      expect(repo.rows).toContain(mine);
      expect(await repo.findById(mine.id)).toBeNull();
    });

    it('leaves the account movements untouched', async () => {
      const before = structuredClone(repo.movements);

      await new DeleteBankAccountUseCase(repo).execute(mine.id, ME);

      expect(repo.movements).toEqual(before);
    });

    it('throws NotFoundError for another user account', async () => {
      const softDelete = vi.spyOn(repo, 'softDelete');

      const attempt = new DeleteBankAccountUseCase(repo).execute(others.id, ME);

      await expect(attempt).rejects.toBeInstanceOf(NotFoundError);
      expect(softDelete).not.toHaveBeenCalled();
      expect(others.deletedAt).toBeNull();
    });
  });
});
