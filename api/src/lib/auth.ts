import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '../generated/prisma/client.js';
import { HttpError } from './http.js';

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 16) {
  throw new Error('JWT_SECRET must be set and at least 16 characters');
}
const JWT_SECRET: string = secret;

export interface AuthClaims {
  sub: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthClaims;
    }
  }
}

export function signToken(claims: AuthClaims): string {
  return jwt.sign(claims, JWT_SECRET, { expiresIn: '30d' });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'UNAUTHENTICATED', 'Please sign in.'));
  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & AuthClaims;
    req.auth = { sub: payload.sub, role: payload.role };
    next();
  } catch {
    next(new HttpError(401, 'UNAUTHENTICATED', 'Your session has expired. Please sign in again.'));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return next(new HttpError(403, 'FORBIDDEN', 'You do not have access to this resource.'));
    }
    next();
  };
}

export function userId(req: Request): string {
  if (!req.auth) throw new HttpError(401, 'UNAUTHENTICATED', 'Please sign in.');
  return req.auth.sub;
}
