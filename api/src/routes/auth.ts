import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { CURRENCY_CODES } from '../currencies.js';
import { requireAuth, signToken, userId } from '../lib/auth.js';
import { DEFAULT_CATEGORIES } from '../lib/defaults.js';
import { HttpError, parse } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

const currency = z.enum(CURRENCY_CODES as [string, ...string[]], 'Choose a supported currency');

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(80),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email')),
  password: z.string().min(8, 'Use at least 8 characters').max(128),
  currency: currency.default('USD'),
});

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email')),
  password: z.string().min(1, 'Enter your password'),
});

const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  currency: currency.optional(),
});

function publicUser(u: { id: string; email: string; name: string; role: string; currency: string; createdAt: Date }) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    currency: u.currency,
    createdAt: u.createdAt.toISOString(),
  };
}

router.post('/register', async (req, res) => {
  const body = parse(registerSchema, req.body);
  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) {
    throw new HttpError(409, 'EMAIL_TAKEN', 'An account with this email already exists.', {
      email: 'This email is already registered',
    });
  }
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      currency: body.currency,
      passwordHash: await bcrypt.hash(body.password, 10),
      categories: { create: DEFAULT_CATEGORIES },
    },
  });
  res.status(201).json({ token: signToken({ sub: user.id, role: user.role }), user: publicUser(user) });
});

router.post('/sign-in', async (req, res) => {
  const body = parse(signInSchema, req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }
  res.json({ token: signToken({ sub: user.id, role: user.role }), user: publicUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: userId(req) } });
  if (!user) throw new HttpError(401, 'UNAUTHENTICATED', 'Please sign in.');
  res.json({ user: publicUser(user) });
});

router.patch('/me', requireAuth, async (req, res) => {
  const body = parse(updateMeSchema, req.body);
  const user = await prisma.user.update({ where: { id: userId(req) }, data: body });
  res.json({ user: publicUser(user) });
});

export default router;
