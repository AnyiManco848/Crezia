// Volume seed for the local perf database (npm run db:perf:seed, also run by db:perf:reset).
// Needs the base seed first (currencies and system categories).
// Idempotent: a perf_user_N@perf.test that already exists is skipped with all its data.
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { PerfGuardError, requirePerfMode } from '../src/config/perfGuard';

try {
  requirePerfMode();
} catch (err) {
  if (!(err instanceof PerfGuardError)) throw err;
  console.error(err.message);
  process.exit(1);
}

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} debe ser un entero mayor o igual a 0 (valor recibido: "${raw}")`);
  }
  return value;
}

const USERS = intFromEnv('PERF_USERS', 50);
const ACCOUNTS_PER_USER = intFromEnv('PERF_ACCOUNTS_PER_USER', 3);
const MOVEMENTS_PER_USER = intFromEnv('PERF_MOVEMENTS_PER_USER', 2000);
const GOALS_PER_USER = intFromEnv('PERF_GOALS_PER_USER', 5);
const PASSWORD = process.env.PERF_USER_PASSWORD || 'Perf123*';
const CURRENCY = 'COP';
const BATCH_SIZE = 1000;

const ACCOUNT_TYPES = ['Savings', 'Checking', 'Credit'] as const;
const PAYMENT_METHODS = ['Cash', 'Transfer', 'CreditCard', 'DebitCard'] as const;
const GOAL_REASONS = ['Travel', 'Vehicle', 'Education', 'EmergencyFund', 'HomePurchase', 'Technology', 'DebtPayment'] as const;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function perfEmail(n: number): string {
  return `perf_user_${n}@perf.test`;
}

// Deterministic pseudo-random numbers (mulberry32), so every reset produces the same data.
function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(items: readonly T[], rand: () => number): T {
  return items[Math.floor(rand() * items.length)]!;
}

function utcDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function seedUser(n: number, passwordHash: string, categoryIds: string[], today: Date): Promise<void> {
  const rand = random(n);

  await prisma.$transaction(
    async (tx) => {
      const user = await tx.user.create({
        data: {
          documentId: `P${String(n).padStart(9, '0')}`,
          name: `Perf User ${n}`,
          email: perfEmail(n),
          passwordHash,
          birthDate: new Date('1995-01-01T00:00:00.000Z'),
          preferredCurrencyCode: CURRENCY,
        },
      });
      const audit = { createdBy: user.id, updatedBy: user.id };

      const accounts = await tx.bankAccount.createManyAndReturn({
        data: Array.from({ length: ACCOUNTS_PER_USER }, (_, i) => ({
          userId: user.id,
          bankName: `Perf Bank ${i + 1}`,
          accountAlias: `Cuenta perf ${i + 1}`,
          accountType: ACCOUNT_TYPES[i % ACCOUNT_TYPES.length]!,
          currencyCode: CURRENCY,
          ...audit,
        })),
        select: { id: true },
      });

      // Movements spread over the last 365 days; about 1 in 5 is an Income.
      for (let start = 0; start < MOVEMENTS_PER_USER; start += BATCH_SIZE) {
        const size = Math.min(BATCH_SIZE, MOVEMENTS_PER_USER - start);
        await tx.movement.createMany({
          data: Array.from({ length: size }, (_, i) => {
            const income = rand() < 0.2;
            return {
              userId: user.id,
              bankAccountId: accounts.length > 0 ? pick(accounts, rand).id : null,
              categoryId: pick(categoryIds, rand),
              type: income ? ('Income' as const) : ('Expense' as const),
              amount: String(income ? 500000 + Math.floor(rand() * 4500000) : 1000 + Math.floor(rand() * 499000)),
              currencyCode: CURRENCY,
              date: addDays(today, -Math.floor(rand() * 365)),
              paymentMethod: pick(PAYMENT_METHODS, rand),
              source: 'Manual' as const,
              description: `Movimiento perf ${start + i + 1}`,
              ...audit,
            };
          }),
        });
      }

      // One goal per system category: uq_goals_active_category allows a single active goal per category.
      await tx.goal.createMany({
        data: Array.from({ length: GOALS_PER_USER }, (_, i) => ({
          userId: user.id,
          categoryId: categoryIds[i]!,
          name: `Meta perf ${i + 1}`,
          reason: GOAL_REASONS[i % GOAL_REASONS.length]!,
          targetAmount: String(1000000 * (i + 1)),
          currencyCode: CURRENCY,
          startDate: addDays(today, -90),
          endDate: addDays(today, 180),
          ...audit,
        })),
      });
    },
    { timeout: 120_000 },
  );
}

async function main() {
  const currency = await prisma.currency.findUnique({ where: { code: CURRENCY } });
  const categories = await prisma.category.findMany({
    where: { userId: null, isDefault: true, deletedAt: null },
    select: { id: true },
    orderBy: { name: 'asc' },
  });
  if (!currency || categories.length === 0) {
    throw new Error('Faltan monedas o categorías del sistema. Corre primero el seed base (npm run db:perf:reset lo hace).');
  }
  if (GOALS_PER_USER > categories.length) {
    throw new Error(
      `PERF_GOALS_PER_USER=${GOALS_PER_USER} supera las ${categories.length} categorías del sistema (una meta activa por categoría).`,
    );
  }
  const categoryIds = categories.map((c) => c.id);

  // Every perf user shares the same password, so it is hashed only once.
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const today = utcDate(new Date());

  let created = 0;
  for (let n = 1; n <= USERS; n++) {
    const exists = await prisma.user.findFirst({ where: { email: perfEmail(n), deletedAt: null }, select: { id: true } });
    if (exists) continue;
    await seedUser(n, passwordHash, categoryIds, today);
    created++;
    if (created % 10 === 0) console.log(`Seed perf: ${created} usuarios creados...`);
  }

  console.log(
    `Seed perf: ${created} usuarios nuevos (${USERS - created} ya existían). ` +
      `Por usuario: ${ACCOUNTS_PER_USER} cuentas, ${MOVEMENTS_PER_USER} movimientos, ${GOALS_PER_USER} metas.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
