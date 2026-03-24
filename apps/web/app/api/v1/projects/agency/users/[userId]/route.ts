import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireRole, validate } from '@/lib/server/guards';
import { sendSuccess, sendError } from '@/lib/server/response';
import { updateUserSchema } from '@seo-cmd/validation';
import { AppError } from '@/lib/server/errors';
import UserModel from '@/lib/server/models/user.model';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    await ensureDB();
    const jwtUser = await authenticate(req);
    const agencyId = requireTenant(jwtUser);
    requireRole(jwtUser, 'admin');
    const { userId } = await params;

    const body = await req.json();
    const validated = validate(updateUserSchema, body);

    const user = await UserModel.findOneAndUpdate(
      { _id: userId, agencyId },
      validated,
      { new: true, runValidators: true }
    ).lean();
    if (!user) throw AppError.notFound('User not found');
    return sendSuccess(user);
  } catch (error) {
    return sendError(error);
  }
}
