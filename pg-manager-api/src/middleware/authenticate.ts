import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors.js';

export interface AuthPayload {
  sub: string;
  role: 'owner' | 'tenant';
  propertyIds?: string[];
}

/**
 * Placeholder JWT authentication middleware.
 * In production, replace with actual JWT verification (e.g. BetterAuth / jose).
 * For now, it reads x-user-id and x-user-role headers for development.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string | undefined;
  const role = req.headers['x-user-role'] as string | undefined;

  if (!userId || !role) {
    throw new UnauthorizedError('Missing authentication headers');
  }

  if (role !== 'owner' && role !== 'tenant') {
    throw new UnauthorizedError('Invalid role');
  }

  req.user = { sub: userId, role };
  next();
}
