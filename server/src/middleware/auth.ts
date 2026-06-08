import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { userRoles, users } from '../db/schema.js';

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const queryToken = typeof req.query.token === 'string' ? req.query.token : null;
  if (!header?.startsWith('Bearer ') && !queryToken) {
    return res.status(401).json({ error: 'Токен қажет' });
  }

  try {
    const token = header?.startsWith('Bearer ') ? header.slice(7) : queryToken!;
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден. Войдите заново.' });
    }
    const [roleRow] = await db.select().from(userRoles).where(eq(userRoles.userId, payload.userId)).limit(1);

    req.user = {
      ...payload,
      email: user.email,
      role: roleRow?.role ?? 'employee',
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Жарамсыз токен' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }
    next();
  };
}
