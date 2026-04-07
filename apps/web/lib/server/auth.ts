import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { getEnv } from './env';
import { isRedisAvailable, getRedis } from './redis';
import { AppError } from './errors';

export interface JwtPayload {
  sub: string;
  aid: string;
  role: 'owner' | 'admin' | 'specialist';
  email: string;
}

export async function authenticate(req: NextRequest): Promise<JwtPayload> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value
    || req.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) throw AppError.unauthorized('No authentication token provided');

  const env = getEnv();
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') throw AppError.unauthorized('Token expired');
    throw AppError.unauthorized('Invalid token');
  }

  if (isRedisAvailable()) {
    try {
      const blocked = await getRedis().get(`blacklist:${token}`);
      if (blocked) throw AppError.unauthorized('Token has been revoked');
    } catch (e) {
      if (e instanceof AppError) throw e;
    }
  }

  return decoded;
}

export function generateTokens(payload: JwtPayload) {
  const env = getEnv();
  const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRY as any });
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRY as any });
  return { accessToken, refreshToken };
}
