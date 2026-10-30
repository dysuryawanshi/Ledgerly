import { Router } from 'express';
import { z } from 'zod';
import { CURRENCY_DECIMALS, isCurrency } from '../currencies.js';
import { Prisma } from '../generated/prisma/client.js';
import { requireAuth, userId } from '../lib/auth.js';
import { HttpError, parse } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { serializeTransaction } from '../lib/serialize.js';

const router = Router();
router.use(requireAuth);

export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  }, 'Enter a real calendar date');

const baseSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE'], 'Choose income or expense'),
  amount: z.union([z.string(), z.number()]).transform((v) => String(v).trim()),
  currency: z.string().trim().toUpperCase().refine(isCurrency, 'Choose a supported currency'),
  categoryId: z.string().min(1).nullable().optional(),
  note: z.string().trim().max(280, 'Keep notes under 280 characters').default(''),
  date: dateString,
});

function checkAmount(data: { amount: string; currency: string }, ctx: z.RefinementCtx) {
  const decimals = CURRENCY_DECIMALS[data.currency] ?? 2;
  const pattern = decimals === 0 ? /^\d+$/ : new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`);
  if (!pattern.test(data.amount)) {
    ctx.addIssue({
      code: 'custom',
      path: ['amount'],
      message:
        decimals === 0 ? `${data.currency} amounts have no decimals` : `Enter a number with up to ${decimals} decimals`,
    });
    return;
  }
  const n = Number(data.amount);
  if (n <= 0) ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Amount must be greater than zero' });
  if (n >= 1e12) ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Amount is too large' });
}

const createSchema = baseSchema.superRefine(checkAmount);

const updateSchema = baseSchema
  .partial()
  .extend({ note: z.string().trim().max(280, 'Keep notes under 280 characters').optional() })
  .superRefine((data, ctx) => {
    if (data.amount === undefined && data.currency === undefined) return;
    if (data.amount === undefined || data.currency === undefined) {
      ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Send amount and currency together' });
      return;
    }
    checkAmount({ amount: data.amount, currency: data.currency }, ctx);
  });

const listSchema = z.object({
  q: z.string().trim().max(100).optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  categoryId: z.string().optional(),
  from: dateString.optional(),
  to: dateString.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

const utcDate = (s: string) => new Date(`${s}T00:00:00Z`);

async function assertCategory(uid: string, categoryId: string | null | undefined, type: 'INCOME' | 'EXPENSE') {
  if (!categoryId) return;
  const category = await prisma.category.findFirst({ where: { id: categoryId, userId: uid } });
  if (!category) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Category not found.', { categoryId: 'Choose one of your categories' });
  }
  if (category.type !== type) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Category type does not match.', {
      categoryId: `This is an ${category.type.toLowerCase()} category`,
    });
  }
}

router.get('/', async (req, res) => {
  const query = parse(listSchema, req.query);
  const where: Prisma.TransactionWhereInput = { userId: userId(req) };
  if (query.type) where.type = query.type;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.from || query.to) {
    where.date = {
      ...(query.from ? { gte: utcDate(query.from) } : {}),
      ...(query.to ? { lte: utcDate(query.to) } : {}),
    };
  }
  if (query.q) {
    where.OR = [
      { note: { contains: query.q, mode: 'insensitive' } },
      { category: { name: { contains: query.q, mode: 'insensitive' } } },
      { currency: { equals: query.q.toUpperCase() } },
    ];
  }
  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: true },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: query.limit,
  });
  res.json({ transactions: transactions.map(serializeTransaction) });
});

router.get('/:id', async (req, res) => {
  const t = await prisma.transaction.findFirst({
    where: { id: req.params.id, userId: userId(req) },
    include: { category: true },
  });
  if (!t) throw new HttpError(404, 'NOT_FOUND', 'Transaction not found.');
  res.json({ transaction: serializeTransaction(t) });
});

router.post('/', async (req, res) => {
  const uid = userId(req);
  const body = parse(createSchema, req.body);
  await assertCategory(uid, body.categoryId, body.type);
  const t = await prisma.transaction.create({
    data: {
      userId: uid,
      type: body.type,
      amount: new Prisma.Decimal(body.amount),
      currency: body.currency,
      categoryId: body.categoryId ?? null,
      note: body.note,
      date: utcDate(body.date),
    },
    include: { category: true },
  });
  res.status(201).json({ transaction: serializeTransaction(t) });
});

router.patch('/:id', async (req, res) => {
  const uid = userId(req);
  const body = parse(updateSchema, req.body);
  const existing = await prisma.transaction.findFirst({ where: { id: req.params.id, userId: uid } });
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Transaction not found.');
  const type = body.type ?? existing.type;
  const categoryId = body.categoryId === undefined ? existing.categoryId : body.categoryId;
  await assertCategory(uid, categoryId, type);
  const t = await prisma.transaction.update({
    where: { id: existing.id },
    data: {
      type,
      categoryId,
      ...(body.amount !== undefined ? { amount: new Prisma.Decimal(body.amount) } : {}),
      ...(body.currency !== undefined ? { currency: body.currency } : {}),
      ...(body.note !== undefined ? { note: body.note } : {}),
      ...(body.date !== undefined ? { date: utcDate(body.date) } : {}),
    },
    include: { category: true },
  });
  res.json({ transaction: serializeTransaction(t) });
});

router.delete('/:id', async (req, res) => {
  const { count } = await prisma.transaction.deleteMany({ where: { id: req.params.id, userId: userId(req) } });
  if (count === 0) throw new HttpError(404, 'NOT_FOUND', 'Transaction not found.');
  res.status(204).end();
});

export default router;
