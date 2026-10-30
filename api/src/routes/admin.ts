import { Router } from 'express';
import { requireAuth, requireRole } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';

// Admin-only overview. Exposes counts, never another user's transactions.
const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

router.get('/stats', async (_req, res) => {
  const [users, transactions, categories] = await Promise.all([
    prisma.user.count(),
    prisma.transaction.count(),
    prisma.category.count(),
  ]);
  res.json({ users, transactions, categories });
});

export default router;
