import cors from 'cors';
import express from 'express';
import { CURRENCY_DECIMALS } from './currencies.js';
import { errorHandler, notFound } from './lib/http.js';
import { prisma } from './lib/prisma.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import summaryRoutes from './routes/summary.js';
import transactionRoutes from './routes/transactions.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', database: 'ok', time: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'unreachable', time: new Date().toISOString() });
    }
  });

  app.get('/currencies', (_req, res) => {
    res.json({ currencies: Object.entries(CURRENCY_DECIMALS).map(([code, decimals]) => ({ code, decimals })) });
  });

  app.use('/auth', authRoutes);
  app.use('/transactions', transactionRoutes);
  app.use('/categories', categoryRoutes);
  app.use('/summary', summaryRoutes);
  app.use('/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
