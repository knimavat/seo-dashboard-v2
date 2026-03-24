import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { ensureDB } from '@/lib/server/database';
import { getEnv } from '@/lib/server/env';
import { generateTokens } from '@/lib/server/auth';
import { sendError } from '@/lib/server/response';
import { AppError } from '@/lib/server/errors';
import UserModel from '@/lib/server/models/user.model';
import type { JwtPayload } from '@/lib/server/auth';

export async function POST(req: NextRequest) {
  try {
    await ensureDB();
    const cookieStore = await cookies();
    const token = cookieStore.get('refreshToken')?.value;
    if (!token) throw AppError.unauthorized('No refresh token');

    const env = getEnv();
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;

    const user = await UserModel.findOne({ _id: decoded.sub, status: 'active' });
    if (!user) throw AppError.unauthorized('User not found or deactivated');

    const jwtPayload: JwtPayload = { sub: user._id.toString(), aid: user.agencyId.toString(), role: user.role, email: user.email };
    const { accessToken, refreshToken: newRefresh } = generateTokens(jwtPayload);

    const cookieOpts = {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    };

    const response = NextResponse.json({ success: true, data: { token: accessToken } });
    response.cookies.set('token', accessToken, { ...cookieOpts, maxAge: 24 * 60 * 60, path: '/' });
    response.cookies.set('refreshToken', newRefresh, { ...cookieOpts, maxAge: 30 * 24 * 60 * 60, path: '/api/v1/auth/refresh' });

    return response;
  } catch (error) {
    return sendError(error);
  }
}
