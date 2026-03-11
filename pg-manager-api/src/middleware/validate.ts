import type { Request, Response, NextFunction } from 'express';
import type { z } from 'zod/v4';
import { ValidationError } from '../utils/errors.js';

export function validate(schema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError(
        result.error.issues.map((i) => i.message).join(', '),
      );
    }
    req.body = result.data;
    next();
  };
}
