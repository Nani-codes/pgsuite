import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors.js';
import { verifyToken, TokenPayload } from '../utils/token.js';

/**
 * JWT authentication middleware.
 * Verifies the Authorization: Bearer <token> header.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new UnauthorizedError('Token not found');
  }

  try {
    const payload = verifyToken(token);
    req.user = { sub: payload.sub, role: payload.role };
    next();
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired token');
  }
}
