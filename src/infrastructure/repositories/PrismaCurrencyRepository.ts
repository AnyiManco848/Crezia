import type { CurrencyRepository } from '../../domain/repositories/CurrencyRepository';
import type { PrismaClient } from '../../generated/prisma/client';

export class PrismaCurrencyRepository implements CurrencyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async isActive(code: string): Promise<boolean> {
    const currency = await this.prisma.currency.findUnique({ where: { code }, select: { isActive: true } });
    return currency?.isActive ?? false;
  }
}
