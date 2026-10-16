import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateCategoryUseCase, type CreateCategoryInput } from '../../../src/application/categories/CreateCategoryUseCase';
import { DeleteCategoryUseCase } from '../../../src/application/categories/DeleteCategoryUseCase';
import { GetCategoryUseCase } from '../../../src/application/categories/GetCategoryUseCase';
import { ListCategoriesUseCase } from '../../../src/application/categories/ListCategoriesUseCase';
import { UpdateCategoryUseCase } from '../../../src/application/categories/UpdateCategoryUseCase';
import { ForbiddenError, NotFoundError } from '../../../src/domain/errors';
import { InMemoryCategoryRepository, type StoredCategory } from '../../helpers/InMemoryCategoryRepository';

const ME = 'user-1';
const OTHER = 'user-2';

describe('category use cases', () => {
  let repo: InMemoryCategoryRepository;
  let system: StoredCategory;
  let mine: StoredCategory;
  let others: StoredCategory;

  beforeEach(() => {
    repo = new InMemoryCategoryRepository();
    system = repo.seed({ name: 'Alimentación', isDefault: true });
    mine = repo.seed({ name: 'Mascotas', userId: ME });
    others = repo.seed({ name: 'Gimnasio', userId: OTHER });
    repo.seed({ name: 'Borrada', userId: ME, deletedAt: new Date(), deletedBy: ME });
  });

  describe('ListCategoriesUseCase', () => {
    it('returns system and own categories, without deleted or foreign ones', async () => {
      const result = await new ListCategoriesUseCase(repo).execute(ME);

      expect(result.map((c) => c.id)).toEqual([system.id, mine.id]);
    });
  });

  describe('GetCategoryUseCase', () => {
    it('returns a system category', async () => {
      const result = await new GetCategoryUseCase(repo).execute(system.id, ME);

      expect(result.id).toBe(system.id);
    });

    it('throws NotFoundError for another user category', async () => {
      const attempt = new GetCategoryUseCase(repo).execute(others.id, ME);

      await expect(attempt).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws NotFoundError for an unknown id', async () => {
      const attempt = new GetCategoryUseCase(repo).execute('00000000-0000-4000-8000-000000000000', ME);

      await expect(attempt).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('CreateCategoryUseCase', () => {
    it('creates a category owned by the user with audit fields', async () => {
      const result = await new CreateCategoryUseCase(repo).execute({ name: 'Viajes', description: 'Vacaciones' }, ME);

      expect(result).toMatchObject({ name: 'Viajes', description: 'Vacaciones', userId: ME, isDefault: false });
      const stored = repo.rows.find((r) => r.id === result.id)!;
      expect(stored).toMatchObject({ createdBy: ME, updatedBy: ME });
    });

    it('always sets isDefault to false even if the input asks for true', async () => {
      const input = { name: 'Trampa', isDefault: true, userId: null } as unknown as CreateCategoryInput;

      const result = await new CreateCategoryUseCase(repo).execute(input, ME);

      expect(result.isDefault).toBe(false);
      expect(result.userId).toBe(ME);
    });
  });

  describe('UpdateCategoryUseCase', () => {
    it('updates an own category and sets updatedBy', async () => {
      const result = await new UpdateCategoryUseCase(repo).execute(mine.id, { name: 'Mascotas y veterinaria' }, ME);

      expect(result.name).toBe('Mascotas y veterinaria');
      expect(mine.updatedBy).toBe(ME);
    });

    it('throws ForbiddenError for a system category', async () => {
      const attempt = new UpdateCategoryUseCase(repo).execute(system.id, { name: 'Comida' }, ME);

      await expect(attempt).rejects.toBeInstanceOf(ForbiddenError);
      expect(system.name).toBe('Alimentación');
    });

    it('throws NotFoundError for another user category', async () => {
      const attempt = new UpdateCategoryUseCase(repo).execute(others.id, { name: 'Mío' }, ME);

      await expect(attempt).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('DeleteCategoryUseCase', () => {
    const now = new Date('2026-10-15T12:00:00Z');

    it('soft deletes an own category filling deletedAt and deletedBy', async () => {
      await new DeleteCategoryUseCase(repo, () => now).execute(mine.id, ME);

      expect(mine.deletedAt).toEqual(now);
      expect(mine.deletedBy).toBe(ME);
      expect(repo.rows).toContain(mine);
      expect(await repo.findById(mine.id)).toBeNull();
    });

    it('throws ForbiddenError for a system category', async () => {
      const softDelete = vi.spyOn(repo, 'softDelete');

      const attempt = new DeleteCategoryUseCase(repo).execute(system.id, ME);

      await expect(attempt).rejects.toBeInstanceOf(ForbiddenError);
      expect(softDelete).not.toHaveBeenCalled();
    });

    it('throws NotFoundError for another user category', async () => {
      const attempt = new DeleteCategoryUseCase(repo).execute(others.id, ME);

      await expect(attempt).rejects.toBeInstanceOf(NotFoundError);
      expect(others.deletedAt).toBeNull();
    });
  });
});
