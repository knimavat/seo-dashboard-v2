import { Router, Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { getEnv } from '../../config/env.js';
import { generateTokens, authenticate, JwtPayload } from '../../middleware/authenticate.js';
import { getRedis } from '../../config/redis.js';
import { AppError } from '../../shared/AppError.js';
import { sendSuccess } from '../../shared/response.js';
import AgencyModel from './agency.model.js';
import UserModel from './user.model.js';
import { logger } from '../../config/logger.js';

const router = Router();

// ─── POST /api/v1/auth/google ──────────────────────
router.post('/google', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { credential, code } = req.body;
    const env = getEnv();
    const client = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);

    let email: string, name: string, picture: string | undefined;

    if (credential) {
      // ID Token flow (from Google Sign-In button)
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.email) throw AppError.unauthorized('Invalid Google token');
      email = payload.email;
      name = payload.name || email;
      picture = payload.picture;
    } else if (code) {
      // Authorization Code flow
      const { tokens } = await client.getToken({
        code,
        redirect_uri: `${env.CORS_ORIGIN}/auth/callback`,
      });
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.email) throw AppError.unauthorized('Invalid Google token');
      email = payload.email;
      name = payload.name || email;
      picture = payload.picture;
    } else {
      throw AppError.badRequest('Missing credential or code');
    }

    // Find user across all agencies (email is unique per agency)
    const user = await UserModel.findOne({ email: email.toLowerCase(), status: 'active' });
    if (!user) {
      return res.status(403).json({
        success: false,
        error: 'access_denied',
        message: 'Your email is not on the allowlist. Contact your agency admin.',
      });
    }

    // Update user info from Google profile
    user.lastLoginAt = new Date();
    if (picture && !user.avatarUrl) user.avatarUrl = picture;
    if (name && user.name !== name) user.name = name;
    await user.save();

    // Generate JWT tokens
    const jwtPayload: JwtPayload = {
      sub: user._id.toString(),
      aid: user.agencyId.toString(),
      role: user.role,
      email: user.email,
    };
    const { accessToken, refreshToken } = generateTokens(jwtPayload);

    // Set cookies — use sameSite 'none' + secure for cross-port dev,
    // or just rely on Bearer token from the frontend
    const cookieOpts = {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    };

    res.cookie('token', accessToken, { ...cookieOpts, maxAge: 24 * 60 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { ...cookieOpts, maxAge: 30 * 24 * 60 * 60 * 1000, path: '/api/v1/auth/refresh' });

    // Fetch agency for response
    const agency = await AgencyModel.findById(user.agencyId).lean();

    sendSuccess(res, {
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      agency: agency ? { _id: agency._id, name: agency.name, slug: agency.slug } : null,
      token: accessToken,
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/v1/auth/refresh ─────────────────────
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) throw AppError.unauthorized('No refresh token');

    const env = getEnv();
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;

    const user = await UserModel.findOne({ _id: decoded.sub, status: 'active' });
    if (!user) throw AppError.unauthorized('User not found or deactivated');

    const jwtPayload: JwtPayload = {
      sub: user._id.toString(),
      aid: user.agencyId.toString(),
      role: user.role,
      email: user.email,
    };
    const { accessToken, refreshToken: newRefresh } = generateTokens(jwtPayload);

    const cookieOpts = {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    };

    res.cookie('token', accessToken, { ...cookieOpts, maxAge: 24 * 60 * 60 * 1000 });
    res.cookie('refreshToken', newRefresh, { ...cookieOpts, maxAge: 30 * 24 * 60 * 60 * 1000, path: '/api/v1/auth/refresh' });

    sendSuccess(res, { token: accessToken });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/v1/auth/logout ──────────────────────
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.token;
    if (token) {
      try {
        const redis = getRedis();
        await redis.set(`blacklist:${token}`, '1', 'EX', 86400); // 24h
      } catch {
        // Redis down — skip blacklisting
      }
    }
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    sendSuccess(res, { message: 'Logged out' });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/v1/auth/me ───────────────────────────
// This needs the authenticate middleware to decode the JWT
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw AppError.unauthorized();
    const user = await UserModel.findById(req.user.sub).lean();
    if (!user) throw AppError.unauthorized('User not found');
    const agency = await AgencyModel.findById(user.agencyId).lean();

    sendSuccess(res, {
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        assignedProjects: user.assignedProjects,
      },
      agency: agency ? { _id: agency._id, name: agency.name, slug: agency.slug } : null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;