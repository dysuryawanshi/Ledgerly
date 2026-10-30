import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, userId } from '../lib/auth.js';
import { HttpError, parse } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { serializeCategory } from '../lib/serialize.js';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(40, 'Keep it under 40 characters'),
  type: z.enum(['INCOME', 'EXPENSE'], 'Choose income or expense'),
  icon: z.string().trim().min(1).max(40).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Use a hex colour like #1F4D3A')
    .optional(),
});

router.get('/', async (req, res) => {
  const categories = await prisma.category.findMany({
    where: { userId: userId(req) },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { transactions: true } } },
  });
  res.json({
    categories: categories.map((c) => ({ ...serializeCategory(c), transactionCount: c._count.transactions })),
  });
});

router.post('/', async (req, res) => {
  const uid = userId(req);
  const body = parse(createSchema, req.body);
  const clash = await prisma.category.findFirst({
    where: { userId: uid, type: body.type, name: { equals: body.name, mode: 'insensitive' } },
  });
  if (clash) {
    throw new HttpError(409, 'CATEGORY_EXISTS', 'You already have a category with this name.', {
      name: 'Already exists',
    });
  }
  const category = await prisma.category.create({ data: { ...body, userId: uid } });
  res.status(201).json({ category: { ...serializeCategory(category), transactionCount: 0 } });
});

router.delete('/:id', async (req, res) => {
  const { count } = await prisma.category.deleteMany({ where: { id: req.params.id, userId: userId(req) } });
  if (count === 0) throw new HttpError(404, 'NOT_FOUND', 'Category not found.');
  res.status(204).end();
});

export default router;
