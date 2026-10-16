import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const TEST_EMAIL = 'test@crezia.com';
const TEST_PASSWORD = 'Test123*';

const SYSTEM_CATEGORIES = [
  { name: 'Salario', description: 'Ingresos por salario o nómina' },
  { name: 'Alimentación', description: 'Mercado, restaurantes y domicilios' },
  { name: 'Transporte', description: 'Transporte público, gasolina y taxis' },
  { name: 'Vivienda', description: 'Arriendo, servicios públicos y administración' },
  { name: 'Salud', description: 'Medicina, citas y seguros' },
  { name: 'Entretenimiento', description: 'Salidas, suscripciones y ocio' },
  { name: 'Ahorro', description: 'Dinero destinado a ahorro y metas' },
];

function date(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

async function main() {
  // Currencies (system catalog, required by users, accounts, movements and goals)
  for (const c of [
    { code: 'COP', name: 'Peso colombiano', symbol: '$', decimalPlaces: 2 },
    { code: 'USD', name: 'Dólar estadounidense', symbol: 'US$', decimalPlaces: 2 },
  ]) {
    await prisma.currency.upsert({ where: { code: c.code }, update: {}, create: c });
  }

  // System categories: user_id NULL, is_default true
  const categories: Record<string, string> = {};
  for (const c of SYSTEM_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { name: c.name, userId: null, deletedAt: null },
    });
    const category =
      existing ?? (await prisma.category.create({ data: { ...c, isDefault: true } }));
    categories[c.name] = category.id;
  }

  const existingUser = await prisma.user.findFirst({
    where: { email: TEST_EMAIL, deletedAt: null },
  });
  if (existingUser) {
    console.log(`Seed: ${TEST_EMAIL} already exists, skipping user data.`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      documentId: '1000000001',
      name: 'Usuario de Prueba',
      email: TEST_EMAIL,
      passwordHash: await bcrypt.hash(TEST_PASSWORD, 10),
      birthDate: date('1998-03-15'),
      preferredCurrencyCode: 'COP',
    },
  });
  const audit = { createdBy: user.id, updatedBy: user.id };

  const account = await prisma.bankAccount.create({
    data: {
      userId: user.id,
      bankName: 'Bancolombia',
      accountAlias: 'Cuenta de ahorros principal',
      accountType: 'Savings',
      currencyCode: 'COP',
      ...audit,
    },
  });

  const today = new Date();
  const thisMonth = today.toISOString().slice(0, 7);
  const movements = [
    { type: 'Income', amount: '3500000', category: 'Salario', day: '01', method: 'Transfer', description: 'Pago de nómina' },
    { type: 'Expense', amount: '1200000', category: 'Vivienda', day: '02', method: 'Transfer', description: 'Arriendo' },
    { type: 'Expense', amount: '85000', category: 'Alimentación', day: '03', method: 'DebitCard', description: 'Mercado' },
    { type: 'Expense', amount: '12000', category: 'Transporte', day: '04', method: 'Cash', description: 'Taxi' },
    // Goal contributions are Expense movements in the goal's category (see Goal in schema.prisma)
    { type: 'Expense', amount: '400000', category: 'Ahorro', day: '05', method: 'Transfer', description: 'Aporte a la meta de viaje' },
  ] as const;

  for (const m of movements) {
    await prisma.movement.create({
      data: {
        userId: user.id,
        bankAccountId: account.id,
        categoryId: categories[m.category]!,
        type: m.type,
        amount: m.amount,
        currencyCode: 'COP',
        date: date(`${thisMonth}-${m.day}`),
        paymentMethod: m.method,
        source: 'Manual',
        description: m.description,
        ...audit,
      },
    });
  }

  await prisma.goal.create({
    data: {
      userId: user.id,
      categoryId: categories['Ahorro']!,
      name: 'Viaje a Cartagena',
      reason: 'Travel',
      targetAmount: '2000000',
      currencyCode: 'COP',
      startDate: date(`${thisMonth}-01`),
      endDate: addMonths(date(`${thisMonth}-01`), 6),
      ...audit,
    },
  });

  console.log(`Seed: created ${TEST_EMAIL} with 1 account, ${movements.length} movements and 1 goal.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
