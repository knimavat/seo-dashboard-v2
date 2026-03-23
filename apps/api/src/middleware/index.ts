import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../shared/AppError.js';
import { isRedisAvailable, getRedis } from '../config/redis.js';
import { logger } from '../config/logger.js';
import UserModel from '../modules/auth/user.model.js';

// ─── Role Guard ────────────────────────────────────
export function roleGuard(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden('Insufficient permissions'));
    }
    next();
  };
}

// ─── Project Access (with cache) ───────────────────
const userProjectCache = new Map<string, { projects: string[]; expires: number }>();

export async function projectAccess(req: Request, _res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params as { projectId: string };
    if (!projectId) return next();
    if (req.user?.role === 'admin') return next();

    const userId = req.user?.sub;
    if (!userId) return next(AppError.forbidden('No user'));

    // Check in-memory cache (30 second TTL)
    const cached = userProjectCache.get(userId);
    if (cached && cached.expires > Date.now()) {
      if (cached.projects.includes(projectId)) return next();
      return next(AppError.forbidden('You do not have access to this project'));
    }

    const user = await UserModel.findOne({ _id: userId, agencyId: req.agencyId }).select('assignedProjects').lean();
    const projects = (user?.assignedProjects || []).map(p => p.toString());

    userProjectCache.set(userId, { projects, expires: Date.now() + 30000 });

    if (!projects.includes(projectId)) {
      return next(AppError.forbidden('You do not have access to this project'));
    }
    next();
  } catch (error) { next(error); }
}

// ─── Zod Validation ────────────────────────────────
export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return next(new AppError(`Validation failed: ${JSON.stringify(errors)}`, 400));
    }
    (req as any)[source] = result.data;
    next();
  };
}

// ─── Rate Limiter (skip if Redis down) ─────────────
export function rateLimiter(maxRequests: number, windowSec: number) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!isRedisAvailable()) return next(); // Skip silently

    try {
      const redis = getRedis();
      const key = `rl:${req.ip}:${req.baseUrl}`;
      const current = await redis.incr(key);
      if (current === 1) await redis.expire(key, windowSec);
      if (current > maxRequests) return next(AppError.tooMany(`Rate limit exceeded`));
      next();
    } catch {
      next(); // Redis error — allow request
    }
  };
}

// ─── Global Error Handler ──────────────────────────
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }
  if (err.name === 'ValidationError') return res.status(400).json({ success: false, error: 'Validation error', details: err.message });
  if ((err as any).code === 11000) return res.status(409).json({ success: false, error: 'Duplicate entry' });

  logger.error({ err }, 'Unhandled error');
  return res.status(500).json({ success: false, error: 'Internal server error' });
}