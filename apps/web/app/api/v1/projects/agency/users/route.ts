import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireRole, validate } from '@/lib/server/guards';
import { sendSuccess, sendCreated, sendError } from '@/lib/server/response';
import { addUserSchema } from '@seo-cmd/validation';
import { AppError } from '@/lib/server/errors';
import UserModel from '@/lib/server/models/user.model';

export async function GET(req: NextRequest) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    requireRole(user, 'admin');

    const users = await UserModel.find({ agencyId }).sort({ createdAt: -1 }).lean();
    return sendSuccess(users);
  } catch (error) {
    return sendError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    requireRole(user, 'admin');

    const body = await req.json();
    const validated = validate(addUserSchema, body);

    const existing = await UserModel.findOne({ agencyId, email: validated.email.toLowerCase() });
    if (existing) throw AppError.conflict('User with this email already exists');

    const newUser = await UserModel.create({ ...validated, email: validated.email.toLowerCase(), agencyId });
    return sendCreated(newUser);
  } catch (error) {
    return sendError(error);
  }
}
