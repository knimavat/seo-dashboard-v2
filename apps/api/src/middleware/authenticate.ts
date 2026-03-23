import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env.js';
import { isRedisAvailable, getRedis } from '../config/redis.js';
import { AppError } from '../shared/AppError.js';

export interface JwtPayload {
  sub: string;
  aid: string;
  role: 'admin' | 'specialist';
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      agencyId?: string;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw AppError.unauthorized('No authentication token provided');

    const env = getEnv();
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Check blacklist only if Redis is available
    if (isRedisAvailable()) {
      const redis = getRedis();
      redis.get(`blacklist:${token}`).then((blocked) => {
        if (blocked) return next(AppError.unauthorized('Token has been revoked'));
        req.user = decoded;
        req.agencyId = decoded.aid;
        next();
      }).catch(() => {
        req.user = decoded;
        req.agencyId = decoded.aid;
        next();
      });
    } else {
      // Redis down — skip blacklist check
      req.user = decoded;
      req.agencyId = decoded.aid;
      next();
    }
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') return next(AppError.unauthorized('Token expired'));
    if (error.name === 'JsonWebTokenError') return next(AppError.unauthorized('Invalid token'));
    next(error);
  }
}

export function generateTokens(payload: JwtPayload) {
  const env = getEnv();
  const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRY as any });
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRY as any });
  return { accessToken, refreshToken };
}