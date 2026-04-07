import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { ensureDB } from '@/lib/server/database';
import { getEnv } from '@/lib/server/env';
import { generateTokens } from '@/lib/server/auth';
import { sendError } from '@/lib/server/response';
import { AppError } from '@/lib/server/errors';
import UserModel from '@/lib/server/models/user.model';
import AgencyModel from '@/lib/server/models/agency.model';
import type { JwtPayload } from '@/lib/server/auth';

export async function POST(req: NextRequest) {
  try {
    await ensureDB();
    const { credential, code } = await req.json();
    const env = getEnv();
    const client = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);

    let email: string, name: string, picture: string | undefined;

    if (credential) {
      const ticket = await client.verifyIdToken({ idToken: credential, audience: env.GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload();
      if (!payload?.email) throw AppError.unauthorized('Invalid Google token');
      email = payload.email;
      name = payload.name || email;
      picture = payload.picture;
    } else if (code) {
      const { tokens } = await client.getToken({ code, redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback` });
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token!, audience: env.GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload();
      if (!payload?.email) throw AppError.unauthorized('Invalid Google token');
      email = payload.email;
      name = payload.name || email;
      picture = payload.picture;
    } else {
      throw AppError.badRequest('Missing credential or code');
    }

    const user = await UserModel.findOne({ email: email.toLowerCase(), status: 'active' });
    if (!user) {
      return NextResponse.json({ success: false, error: 'access_denied', message: 'Your email is not on the allowlist. Contact your agency admin.' }, { status: 403 });
    }

    // Auto-promote to owner if no owner exists in the agency
    let effectiveRole = user.role;
    if (user.role !== 'owner' && user.role === 'admin') {
      const ownerExists = await UserModel.exists({ agencyId: user.agencyId, role: 'owner', status: 'active' });
      if (!ownerExists) {
        effectiveRole = 'owner';
      }
    }

    // Use updateOne to bypass any stale cached Mongoose enum validation
    const updates: Record<string, any> = { lastLoginAt: new Date() };
    if (effectiveRole !== user.role) updates.role = effectiveRole;
    if (picture && !user.avatarUrl) updates.avatarUrl = picture;
    if (name && user.name !== name) updates.name = name;
    await UserModel.updateOne({ _id: user._id }, { $set: updates });

    const jwtPayload: JwtPayload = { sub: user._id.toString(), aid: user.agencyId.toString(), role: effectiveRole as JwtPayload['role'], email: user.email };
    const { accessToken, refreshToken } = generateTokens(jwtPayload);

    const cookieOpts = {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    };

    const agency = await AgencyModel.findById(user.agencyId).lean();

    const response = NextResponse.json({
      success: true,
      data: {
        user: { _id: user._id, email: user.email, name: updates.name || user.name, avatarUrl: updates.avatarUrl || user.avatarUrl, role: effectiveRole },
        agency: agency ? { _id: agency._id, name: agency.name, slug: agency.slug } : null,
        token: accessToken,
      },
    });

    response.cookies.set('token', accessToken, { ...cookieOpts, maxAge: 24 * 60 * 60, path: '/' });
    response.cookies.set('refreshToken', refreshToken, { ...cookieOpts, maxAge: 30 * 24 * 60 * 60, path: '/api/v1/auth/refresh' });

    return response;
  } catch (error) {
    return sendError(error);
  }
}
