import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computeBalance } from '../../../src/application/bankAccounts/balance';
import {
  CreateMovementUseCase,
  type CreateMovementInput,
} from '../../../src/application/movements/CreateMovementUseCase';
import { DeleteMovementUseCase } from '../../../src/application/movements/DeleteMovementUseCase';
import { GetMovementUseCase } from '../../../src/application/movements/GetMovementUseCase';
import { ListMovementsUseCase } from '../../../src/application/movements/ListMovementsUseCase';
import {
  CURRENCY_REQUIRED_MESSAGE,
  INVALID_AMOUNT_MESSAGE,
  INVALID_BANK_ACCOUNT_MESSAGE,
  INVALID_CATEGORY_MESSAGE,
  currencyMismatchMessage,
} from '../../../src/application/movements/movementAccess';
import { UpdateMovementUseCase } from '../../../src/application/movements/UpdateMovementUseCase';
import { NotFoundError, ValidationError } from '../../../src/domain/errors';
import {
  InMemoryBankAccountRepository,
  InMemoryCurrencyRepository,
  type StoredBankAccount,
} from '../../helpers/InMemoryBankAccountRepository';
import { InMemoryCategoryRepository, type StoredCategory } from '../../helpers/InMemoryCategoryRepository';
import { InMemoryMovementRepository, type StoredMovement } from '../../helpers/InMemoryMovementRepository';

const ME = 'user-1';
const OTHER = 'user-2';

describe('movement use cases', () => {
  let movements: InMemoryMovementRepository;
  let categories: InMemoryCategoryRepository;
  let accounts: InMemoryBankAccountRepository;
  let currencies: InMemoryCurrencyRepository;
  let system: StoredCategory;
  let myCategory: StoredCategory;
  let othersCategory: StoredCategory;
  let deletedCategory: StoredCategory;
  let myAccount: StoredBankAccount;
  let myUsdAccount: StoredBankAccount;
  let othersAccount: StoredBankAccount;
  let deletedAccount: StoredBankAccount;
  let mine: StoredMovement;
  let others: StoredMovement;

  const create = () => new CreateMovementUseCase(movements, categories, accounts, currencies);
  const update = () => new UpdateMovementUseCase(movements, categories, accounts, currencies);

  beforeEach(() => {
    movements = new InMemoryMovementRepository();
    categories = new InMemoryCategoryRepository();
    accounts = new InMemoryBankAccountRepository();
    currencies = new InMemoryCurrencyRepository();

    system = categories.seed({ name: 'Alimentación', isDefault: true });
    myCategory = categories.seed({ name: 'Mascotas', userId: ME });
    othersCategory = categories.seed({ name: 'Ajena', userId: OTHER });
    deletedCategory = categories.seed({ name: 'Borrada', userId: ME, deletedAt: new Date(), deletedBy: ME });

    myAccount = accounts.seed({ userId: ME, currencyCode: 'COP' });
    myUsdAccount = accounts.seed({ userId: ME, bankName: 'Wise', currencyCode: 'USD' });
    othersAccount = accounts.seed({ userId: OTHER });
    deletedAccount = accounts.seed({ userId: ME, bankName: 'Cerrada', deletedAt: new Date(), deletedBy: ME });

    mine = movements.seed({ userId: ME, categoryId: system.id, bankAccountId: myAccount.id, amount: '50000.00' });
    others = movements.seed({ userId: OTHER, categoryId: othersCategory.id, bankAccountId: othersAccount.id });
  });

  describe('CreateMovementUseCase', () => {
    let input: CreateMovementInput;

    beforeEach(() => {
      input = {
        bankAccountId: myAccount.id,
        categoryId: system.id,
        type: 'Expense',
        amount: '85000.50',
        date: '2026-10-15',
        paymentMethod: 'DebitCard',
        description: 'Mercado',
      };
    });

    it('creates a Manual movement owned by the authenticated user with audit fields', async () => {
      const result = await create().execute(input, ME);

      expect(result).toMatchObject({ ...input, userId: ME, currencyCode: 'COP', source: 'Manual' });
      const stored = movements.rows.find((r) => r.id === result.id)!;
      expect(stored).toMatchObject({ createdBy: ME, updatedBy: ME, deletedAt: null });
    });

    it('ignores userId and source sent in the input', async () => {
      const tricky = { ...input, userId: OTHER, source: 'EmailParsed' } as unknown as CreateMovementInput;

      const result = await create().execute(tricky, ME);

      expect(result).toMatchObject({ userId: ME, source: 'Manual' });
    });

    it.each(['0', '0.00', '-100', 'abc'])('rejects amount %s with ValidationError', async (amount) => {
      const spy = vi.spyOn(movements, 'create');

      const attempt = create().execute({ ...input, amount }, ME);

      await expect(attempt).rejects.toBeInstanceOf(ValidationError);
      await expect(attempt).rejects.toThrow(INVALID_AMOUNT_MESSAGE);
      expect(spy).not.toHaveBeenCalled();
    });

    it('accepts a system category and an own category', async () => {
      await expect(create().execute({ ...input, categoryId: system.id }, ME)).resolves.toBeDefined();
      await expect(create().execute({ ...input, categoryId: myCategory.id }, ME)).resolves.toBeDefined();
    });

    it.each([
      ['another user', () => othersCategory.id],
      ['a deleted', () => deletedCategory.id],
      ['an unknown', () => '00000000-0000-4000-8000-000000000000'],
    ])('rejects %s category with ValidationError (400, not 404)', async (_label, categoryId) => {
      const attempt = create().execute({ ...input, categoryId: categoryId() }, ME);

      await expect(attempt).rejects.toBeInstanceOf(ValidationError);
      await expect(attempt).rejects.toThrow(INVALID_CATEGORY_MESSAGE);
      expect(movements.rows).toHaveLength(2);
    });

    it.each([
      ['another user', () => othersAccount.id],
      ['a deleted', () => deletedAccount.id],
    ])('rejects %s bank account with ValidationError', async (_label, bankAccountId) => {
      const attempt = create().execute({ ...input, bankAccountId: bankAccountId() }, ME);

      await expect(attempt).rejects.toBeInstanceOf(ValidationError);
      await expect(attempt).rejects.toThrow(INVALID_BANK_ACCOUNT_MESSAGE);
      expect(movements.rows).toHaveLength(2);
    });

    it('uses the account currency when none is sent', async () => {
      const result = await create().execute({ ...input, bankAccountId: myUsdAccount.id }, ME);

      expect(result.currencyCode).toBe('USD');
    });

    it('accepts the same currency as the account', async () => {
      const result = await create().execute({ ...input, currencyCode: 'COP' }, ME);

      expect(result.currencyCode).toBe('COP');
    });

    it('rejects a currency different from the account one', async () => {
      const attempt = create().execute({ ...input, currencyCode: 'USD' }, ME);

      await expect(attempt).rejects.toBeInstanceOf(ValidationError);
      await expect(attempt).rejects.toThrow(currencyMismatchMessage('COP'));
    });

    it('requires an active currency when there is no bank account', async () => {
      const noAccount = { ...input, bankAccountId: null };

      await expect(create().execute(noAccount, ME)).rejects.toThrow(CURRENCY_REQUIRED_MESSAGE);
      await expect(create().execute({ ...noAccount, currencyCode: 'XYZ' }, ME)).rejects.toBeInstanceOf(
        ValidationError,
      );
      const result = await create().execute({ ...noAccount, currencyCode: 'USD' }, ME);
      expect(result).toMatchObject({ bankAccountId: null, currencyCode: 'USD' });
    });

    it('lowers the account balance by the amount of a new expense', async () => {
      const balance = () =>
        computeBalance(movements.rows.filter((m) => m.bankAccountId === myAccount.id));
      expect(balance()).toBe('-50000.00');

      await create().execute({ ...input, amount: '85000.50' }, ME);

      expect(balance()).toBe('-135000.50');
    });
  });

  describe('GetMovementUseCase', () => {
    it('returns an own movement', async () => {
      const result = await new GetMovementUseCase(movements).execute(mine.id, ME);

      expect(result).toMatchObject({ id: mine.id, amount: '50000.00' });
    });

    it('throws NotFoundError for another user movement', async () => {
      await expect(new GetMovementUseCase(movements).execute(others.id, ME)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws NotFoundError for a deleted movement', async () => {
      const deleted = movements.seed({ userId: ME, categoryId: system.id, deletedAt: new Date(), deletedBy: ME });

      await expect(new GetMovementUseCase(movements).execute(deleted.id, ME)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('ListMovementsUseCase', () => {
    let salary: StoredMovement;
    let taxi: StoredMovement;
    let cash: StoredMovement;

    beforeEach(() => {
      salary = movements.seed({
        userId: ME,
        categoryId: myCategory.id,
        bankAccountId: myAccount.id,
        type: 'Income',
        date: '2026-10-05',
      });
      taxi = movements.seed({ userId: ME, categoryId: system.id, bankAccountId: deletedAccount.id, date: '2026-09-20' });
      cash = movements.seed({ userId: ME, categoryId: system.id, date: '2026-10-10' });
      movements.seed({ userId: ME, categoryId: system.id, date: '2026-10-12', deletedAt: new Date(), deletedBy: ME });
    });

    it('returns only own non-deleted movements by date descending with default pagination', async () => {
      const result = await new ListMovementsUseCase(movements).execute({}, ME);

      // mine is dated 2026-10-01; the movement of the deleted account is still listed.
      expect(result.data.map((m) => m.id)).toEqual([cash.id, salary.id, mine.id, taxi.id]);
      expect(result).toMatchObject({ page: 1, limit: 20, total: 4 });
    });

    it('filters by type, category and bank account', async () => {
      const list = new ListMovementsUseCase(movements);

      expect((await list.execute({ type: 'Income' }, ME)).data.map((m) => m.id)).toEqual([salary.id]);
      expect((await list.execute({ categoryId: myCategory.id }, ME)).data.map((m) => m.id)).toEqual([salary.id]);
      expect((await list.execute({ bankAccountId: myAccount.id }, ME)).data.map((m) => m.id)).toEqual([
        salary.id,
        mine.id,
      ]);
    });

    it('filters by an inclusive date range', async () => {
      const result = await new ListMovementsUseCase(movements).execute({ from: '2026-10-01', to: '2026-10-05' }, ME);

      expect(result.data.map((m) => m.id)).toEqual([salary.id, mine.id]);
      expect(result.total).toBe(2);
    });

    it('paginates and reports the total before pagination', async () => {
      const list = new ListMovementsUseCase(movements);

      const first = await list.execute({ page: 1, limit: 3 }, ME);
      const second = await list.execute({ page: 2, limit: 3 }, ME);
      const beyond = await list.execute({ page: 5, limit: 3 }, ME);

      expect(first).toMatchObject({ page: 1, limit: 3, total: 4 });
      expect(first.data.map((m) => m.id)).toEqual([cash.id, salary.id, mine.id]);
      expect(second.data.map((m) => m.id)).toEqual([taxi.id]);
      expect(beyond).toMatchObject({ data: [], total: 4 });
    });

    it('caps the limit at 100 and the page at 1 when called without the schema', async () => {
      const result = await new ListMovementsUseCase(movements).execute({ page: 0, limit: 500 }, ME);

      expect(result).toMatchObject({ page: 1, limit: 100 });
    });
  });

  describe('UpdateMovementUseCase', () => {
    it('partially updates an own movement and sets updatedBy', async () => {
      const result = await update().execute(mine.id, { description: 'Almuerzo', amount: '60000' }, ME);

      expect(result).toMatchObject({ description: 'Almuerzo', amount: '60000', categoryId: system.id });
      expect(mine.updatedBy).toBe(ME);
    });

    it('throws NotFoundError for another user movement', async () => {
      const spy = vi.spyOn(movements, 'update');

      const attempt = update().execute(others.id, { description: 'Mío' }, ME);

      await expect(attempt).rejects.toBeInstanceOf(NotFoundError);
      expect(spy).not.toHaveBeenCalled();
    });

    it('rejects amount <= 0', async () => {
      await expect(update().execute(mine.id, { amount: '0' }, ME)).rejects.toThrow(INVALID_AMOUNT_MESSAGE);
      expect(mine.amount).toBe('50000.00');
    });

    it('validates a new category', async () => {
      await expect(update().execute(mine.id, { categoryId: othersCategory.id }, ME)).rejects.toThrow(
        INVALID_CATEGORY_MESSAGE,
      );
      await expect(update().execute(mine.id, { categoryId: deletedCategory.id }, ME)).rejects.toBeInstanceOf(
        ValidationError,
      );
      expect(mine.categoryId).toBe(system.id);
    });

    it('moves to another account taking its currency', async () => {
      const result = await update().execute(mine.id, { bankAccountId: myUsdAccount.id }, ME);

      expect(result).toMatchObject({ bankAccountId: myUsdAccount.id, currencyCode: 'USD' });
    });

    it('rejects another user or deleted account', async () => {
      await expect(update().execute(mine.id, { bankAccountId: othersAccount.id }, ME)).rejects.toThrow(
        INVALID_BANK_ACCOUNT_MESSAGE,
      );
      await expect(update().execute(mine.id, { bankAccountId: deletedAccount.id }, ME)).rejects.toThrow(
        INVALID_BANK_ACCOUNT_MESSAGE,
      );
      expect(mine.bankAccountId).toBe(myAccount.id);
    });

    it('rejects a currency different from the account one', async () => {
      await expect(update().execute(mine.id, { currencyCode: 'USD' }, ME)).rejects.toThrow(
        currencyMismatchMessage('COP'),
      );
      expect(mine.currencyCode).toBe('COP');
    });

    it('rejects changing the amount or type of a movement whose account was deleted', async () => {
      const old = movements.seed({ userId: ME, categoryId: system.id, bankAccountId: deletedAccount.id });

      await expect(update().execute(old.id, { amount: '1' }, ME)).rejects.toThrow(INVALID_BANK_ACCOUNT_MESSAGE);
      await expect(update().execute(old.id, { type: 'Income' }, ME)).rejects.toThrow(INVALID_BANK_ACCOUNT_MESSAGE);
    });

    it('allows editing the description of a movement whose account was deleted', async () => {
      const old = movements.seed({ userId: ME, categoryId: system.id, bankAccountId: deletedAccount.id });

      const result = await update().execute(old.id, { description: 'Histórico', amount: '1000.00' }, ME);

      expect(result.description).toBe('Histórico');
    });
  });

  describe('DeleteMovementUseCase', () => {
    it('soft deletes an own movement filling deletedAt, deletedBy and updatedBy', async () => {
      await new DeleteMovementUseCase(movements).execute(mine.id, ME);

      expect(mine.deletedAt).toBeInstanceOf(Date);
      expect(mine).toMatchObject({ deletedBy: ME, updatedBy: ME });
      expect(movements.rows).toContain(mine);
      expect(await movements.findById(mine.id)).toBeNull();
    });

    it('throws NotFoundError for another user movement', async () => {
      const spy = vi.spyOn(movements, 'softDelete');

      const attempt = new DeleteMovementUseCase(movements).execute(others.id, ME);

      await expect(attempt).rejects.toBeInstanceOf(NotFoundError);
      expect(spy).not.toHaveBeenCalled();
      expect(others.deletedAt).toBeNull();
    });
  });
});
