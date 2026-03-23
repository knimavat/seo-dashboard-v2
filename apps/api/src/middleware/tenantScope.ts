import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/AppError.js';

/**
 * Ensures agencyId is present on the request.
 * This middleware MUST run after authenticate.
 * It's the safety net: if somehow auth passed without setting agencyId, reject the request.
 */
export function tenantScope(req: Request, _res: Response, next: NextFunction) {
  if (!req.agencyId) {
    return next(AppError.unauthorized('Tenant context not established'));
  }
  next();
}
