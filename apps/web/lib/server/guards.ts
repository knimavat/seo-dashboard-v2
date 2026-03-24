import { NextRequest } from 'next/server';
import { ZodSchema } from 'zod';
import { AppError } from './errors';
import { isRedisAvailable, getRedis } from './redis';
import type { JwtPayload } from './auth';

export function requireTenant(user: JwtPayload): string {
  if (!user.aid) throw AppError.unauthorized('Tenant context not established');
  return user.aid;
}

export function requireRole(user: JwtPayload, ...roles: string[]): void {
  if (!roles.includes(user.role)) throw AppError.forbidden('Insufficient permissions');
}

const userProjectCache = new Map<string, { projects: string[]; expires: number }>();

export async function requireProjectAccess(user: JwtPayload, agencyId: string, projectId: string): Promise<void> {
  if (user.role === 'admin') return;

  const userId = user.sub;
  const cached = userProjectCache.get(userId);
  if (cached && cached.expires > Date.now()) {
    if (cached.projects.includes(projectId)) return;
    throw AppError.forbidden('You do not have access to this project');
  }

  // Dynamic import to avoid circular dependency
  const { default: UserModel } = await import('./models/user.model');
  const dbUser = await UserModel.findOne({ _id: userId, agencyId }).select('assignedProjects').lean();
  const projects = (dbUser?.assignedProjects || []).map((p: any) => p.toString());

  userProjectCache.set(userId, { projects, expires: Date.now() + 30000 });

  if (!projects.includes(projectId)) {
    throw AppError.forbidden('You do not have access to this project');
  }
}

export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    throw new AppError(`Validation failed: ${JSON.stringify(errors)}`, 400);
  }
  return result.data;
}

export async function checkRateLimit(req: NextRequest, max: number, windowSec: number): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    const redis = getRedis();
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const key = `rl:${ip}:${req.nextUrl.pathname}`;
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, windowSec);
    if (current > max) throw AppError.tooMany('Rate limit exceeded');
  } catch (e) {
    if (e instanceof AppError) throw e;
  }
}
