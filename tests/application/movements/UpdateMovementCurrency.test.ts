import { beforeEach, describe, expect, it } from 'vitest';
import { UpdateMovementUseCase } from '../../../src/application/movements/UpdateMovementUseCase';
import { ValidationError } from '../../../src/domain/errors';
import { InMemoryBankAccountRepository, InMemoryCurrencyRepository } from '../../helpers/InMemoryBankAccountRepository';
import { InMemoryCategoryRepository } from '../../helpers/InMemoryCategoryRepository';
import { InMemoryMovementRepository, type StoredMovement } from '../../helpers/InMemoryMovementRepository';

const ME = 'user-1';

// A movement with no bank account owns its currency, so changing it must check the new one is an active currency.
describe('UpdateMovementUseCase - movement without a bank account', () => {
  let movements: InMemoryMovementRepository;
  let loose: StoredMovement;
  let useCase: UpdateMovementUseCase;

  beforeEach(() => {
    movements = new InMemoryMovementRepository();
    const categories = new InMemoryCategoryRepository();
    const category = categories.seed({ name: 'Alimentación', isDefault: true });
    loose = movements.seed({ userId: ME, categoryId: category.id, bankAccountId: null, currencyCode: 'COP' });
    // EUR is not active in this fake catalogue.
    useCase = new UpdateMovementUseCase(
      movements,
      categories,
      new InMemoryBankAccountRepository(),
      new InMemoryCurrencyRepository(['COP', 'USD']),
    );
  });

  it('stores the new currency when it is active', async () => {
    const result = await useCase.execute(loose.id, { currencyCode: 'USD' }, ME);

    expect(result.currencyCode).toBe('USD');
    expect(loose.currencyCode).toBe('USD');
    expect(loose.updatedBy).toBe(ME);
  });

  it('rejects a currency that does not exist or is not active, and leaves the movement untouched', async () => {
    const error = await useCase.execute(loose.id, { currencyCode: 'EUR' }, ME).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).details).toEqual([
      { path: 'body.currencyCode', message: 'La moneda EUR no existe o no está activa' },
    ]);
    expect(loose.currencyCode).toBe('COP');
  });

  it('does not touch the currency when it is resent unchanged', async () => {
    const result = await useCase.execute(loose.id, { currencyCode: 'COP', description: 'Sin cambios' }, ME);

    expect(result).toMatchObject({ currencyCode: 'COP', description: 'Sin cambios' });
  });

  it('keeps the currency when only the description changes', async () => {
    const result = await useCase.execute(loose.id, { description: 'Solo texto' }, ME);

    expect(result.currencyCode).toBe('COP');
  });
});
