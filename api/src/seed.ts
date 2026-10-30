// Idempotent seed: safe to run any number of times. Users and categories are
// upserted by their unique keys and seeded transactions use fixed ids.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Prisma } from './generated/prisma/client.js';
import { DEFAULT_CATEGORIES } from './lib/defaults.js';
import { prisma } from './lib/prisma.js';

const PASSWORD = 'Ledgerly123!';

type SeedTx = {
  day: number;
  type: 'INCOME' | 'EXPENSE';
  amount: string;
  category: string;
  note: string;
  currency?: string;
};

// Repeated for this month and the two months before it.
const MONTHLY: SeedTx[] = [
  { day: 1, type: 'INCOME', amount: '5200.00', category: 'Salary', note: 'Monthly salary — Northwind Co.' },
  { day: 2, type: 'EXPENSE', amount: '1650.00', category: 'Rent', note: 'Apartment rent' },
  { day: 3, type: 'EXPENSE', amount: '84.37', category: 'Groceries', note: 'Weekly shop at Green Market' },
  { day: 5, type: 'EXPENSE', amount: '42.10', category: 'Transport', note: 'Metro card top-up' },
  { day: 7, type: 'EXPENSE', amount: '61.25', category: 'Dining', note: 'Dinner with Priya' },
  { day: 9, type: 'EXPENSE', amount: '118.40', category: 'Utilities', note: 'Electricity and water' },
  { day: 10, type: 'EXPENSE', amount: '97.80', category: 'Groceries', note: 'Groceries and household' },
  { day: 12, type: 'INCOME', amount: '850.00', category: 'Freelance', note: 'Logo design for Bloom Bakery' },
  { day: 14, type: 'EXPENSE', amount: '15.99', category: 'Entertainment', note: 'Streaming subscription' },
  { day: 17, type: 'EXPENSE', amount: '73.60', category: 'Groceries', note: 'Farmers market' },
  { day: 19, type: 'EXPENSE', amount: '45.00', category: 'Health', note: 'Pharmacy' },
  { day: 21, type: 'EXPENSE', amount: '38.50', category: 'Dining', note: 'Lunch with the team' },
  { day: 24, type: 'EXPENSE', amount: '120.00', category: 'Entertainment', note: 'Concert tickets' },
  { day: 26, type: 'EXPENSE', amount: '24.90', category: 'Transport', note: 'Taxi home' },
];

// One-off entries in other currencies so multi-currency display is visible.
const EXTRA: (SeedTx & { monthsBack: number })[] = [
  { monthsBack: 0, day: 4, type: 'EXPENSE', amount: '64.00', currency: 'EUR', category: 'Dining', note: 'Café in Lisbon' },
  { monthsBack: 0, day: 6, type: 'EXPENSE', amount: '4800', currency: 'JPY', category: 'Transport', note: 'Shinkansen seat upgrade' },
  { monthsBack: 0, day: 8, type: 'INCOME', amount: '300.00', currency: 'GBP', category: 'Gifts', note: 'Birthday gift from Gran' },
  { monthsBack: 1, day: 15, type: 'EXPENSE', amount: '2450.00', currency: 'INR', category: 'Groceries', note: 'Spices and tea, Mumbai' },
];

async function upsertUser(email: string, name: string, currency: string, role: 'USER' | 'ADMIN') {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role },
    create: { email, name, currency, role, passwordHash },
  });
  for (const c of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { userId_name_type: { userId: user.id, name: c.name, type: c.type } },
      update: {},
      create: { ...c, userId: user.id },
    });
  }
  return user;
}

function seedDate(monthsBack: number, day: number): Date {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() - monthsBack;
  const maxDay = monthsBack === 0 ? now.getUTCDate() : 28;
  return new Date(Date.UTC(y, m, Math.min(day, maxDay)));
}

async function main() {
  const alex = await upsertUser('alex@ledgerly.app', 'Alex Morgan', 'USD', 'ADMIN');
  const sam = await upsertUser('sam@ledgerly.app', 'Sam Rivera', 'EUR', 'USER');

  const categories = await prisma.category.findMany({ where: { userId: alex.id } });
  const categoryId = (name: string, type: string) =>
    categories.find((c) => c.name === name && c.type === type)?.id ?? null;

  const rows: { id: string; tx: SeedTx; date: Date }[] = [];
  for (let back = 0; back < 3; back++) {
    MONTHLY.forEach((tx, i) => {
      // Skip entries dated after today in the current month.
      if (back === 0 && tx.day > new Date().getUTCDate()) return;
      rows.push({ id: `seed-alex-m${back}-${i}`, tx, date: seedDate(back, tx.day) });
    });
  }
  EXTRA.forEach((tx, i) => rows.push({ id: `seed-alex-x${i}`, tx, date: seedDate(tx.monthsBack, tx.day) }));

  for (const { id, tx, date } of rows) {
    const data = {
      userId: alex.id,
      type: tx.type,
      amount: new Prisma.Decimal(tx.amount),
      currency: tx.currency ?? 'USD',
      categoryId: categoryId(tx.category, tx.type),
      note: tx.note,
      date,
    };
    await prisma.transaction.upsert({ where: { id }, update: data, create: { id, ...data } });
  }

  const samCount = await prisma.transaction.count({ where: { userId: sam.id } });
  console.log(`Seeded ${alex.email} (${rows.length} transactions) and ${sam.email} (${samCount} transactions).`);
  console.log(`Password for both accounts: ${PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
