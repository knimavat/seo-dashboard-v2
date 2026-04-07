import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireRole } from '@/lib/server/guards';
import { sendSuccess, sendError } from '@/lib/server/response';
import { AppError } from '@/lib/server/errors';
import UserModel from '@/lib/server/models/user.model';

export async function POST(req: NextRequest) {
  try {
    await ensureDB();
    const jwtUser = await authenticate(req);
    const agencyId = requireTenant(jwtUser);
    requireRole(jwtUser, 'owner');

    const { targetUserId } = await req.json();
    if (!targetUserId) throw AppError.badRequest('Target user ID is required');

    if (jwtUser.sub === targetUserId) {
      throw AppError.badRequest('You are already the owner');
    }

    const target = await UserModel.findOne({ _id: targetUserId, agencyId, status: 'active' });
    if (!target) throw AppError.notFound('Target user not found');

    // Transfer: set target as owner, demote current owner to admin
    await UserModel.updateOne({ _id: targetUserId, agencyId }, { $set: { role: 'owner' } });
    await UserModel.updateOne({ _id: jwtUser.sub, agencyId }, { $set: { role: 'admin' } });

    return sendSuccess({ message: `Ownership transferred to ${target.name}. You are now an admin. Please log in again.` });
  } catch (error) {
    return sendError(error);
  }
}
