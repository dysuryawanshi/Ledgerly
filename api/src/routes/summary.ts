import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { requireAuth, userId } from '../lib/auth.js';
import { HttpError, parse } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { serializeCategory, serializeTransaction } from '../lib/serialize.js';

const router = Router();
router.use(requireAuth);

const querySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use the format YYYY-MM')
    .optional(),
});

type Totals = { income: Prisma.Decimal; expense: Prisma.Decimal };
const zero = () => new Prisma.Decimal(0);

// Home dashboard: month totals and all-time balance per currency. Amounts in
// different currencies are never converted or added together.
router.get('/', async (req, res) => {
  const uid = userId(req);
  const { month } = parse(querySchema, req.query);
  const key = month ?? new Date().toISOString().slice(0, 7);
  const [y, m] = key.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));

  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) throw new HttpError(401, 'UNAUTHENTICATED', 'Please sign in.');

  const [monthGroups, allGroups, categoryGroups, recent, count] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['currency', 'type'],
      where: { userId: uid, date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['currency', 'type'],
      where: { userId: uid },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { userId: uid, type: 'EXPENSE', currency: user.currency, date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { userId: uid },
      include: { category: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    }),
    prisma.transaction.count({ where: { userId: uid } }),
  ]);

  const fold = (groups: typeof monthGroups) => {
    const map = new Map<string, Totals>();
    for (const g of groups) {
      const t = map.get(g.currency) ?? { income: zero(), expense: zero() };
      const sum = g._sum.amount ?? zero();
      if (g.type === 'INCOME') t.income = t.income.plus(sum);
      else t.expense = t.expense.plus(sum);
      map.set(g.currency, t);
    }
    return map;
  };
  const monthly = fold(monthGroups);
  const allTime = fold(allGroups);

  const codes = new Set([user.currency, ...allTime.keys()]);
  const currencies = [...codes]
    .sort((a, b) => (a === user.currency ? -1 : b === user.currency ? 1 : a.localeCompare(b)))
    .map((code) => {
      const mt = monthly.get(code) ?? { income: zero(), expense: zero() };
      const at = allTime.get(code) ?? { income: zero(), expense: zero() };
      return {
        currency: code,
        income: mt.income.toString(),
        expense: mt.expense.toString(),
        net: mt.income.minus(mt.expense).toString(),
        balance: at.income.minus(at.expense).toString(),
      };
    });

  const categoryIds = categoryGroups.map((g) => g.categoryId).filter((id): id is string => !!id);
  const categories = await prisma.category.findMany({ where: { id: { in: categoryIds }, userId: uid } });
  const byId = new Map(categories.map((c) => [c.id, c]));
  const topCategories = categoryGroups
    .map((g) => ({
      category: g.categoryId && byId.has(g.categoryId) ? serializeCategory(byId.get(g.categoryId)!) : null,
      total: (g._sum.amount ?? zero()).toString(),
    }))
    .sort((a, b) => Number(b.total) - Number(a.total))
    .slice(0, 5);

  res.json({
    month: key,
    currency: user.currency,
    currencies,
    topCategories,
    recent: recent.map(serializeTransaction),
    transactionCount: count,
  });
});

export default router;
