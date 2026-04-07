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

    // Prevent non-owners from modifying owners
    const target = await UserModel.findOne({ _id: userId, agencyId }).lean();
    if (!target) throw AppError.notFound('User not found');
    if (target.role === 'owner' && jwtUser.role !== 'owner') {
      throw AppError.forbidden('Only an owner can modify another owner');
    }

    // Prevent non-owners from assigning the owner role
    if (validated.role === 'owner' && jwtUser.role !== 'owner') {
      throw AppError.forbidden('Only an owner can assign the owner role');
    }

    const user = await UserModel.findOneAndUpdate(
      { _id: userId, agencyId },
      validated,
      { new: true, runValidators: true }
    ).lean();
    return sendSuccess(user);
  } catch (error) {
    return sendError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    await ensureDB();
    const jwtUser = await authenticate(req);
    const agencyId = requireTenant(jwtUser);
    requireRole(jwtUser, 'owner');
    const { userId } = await params;

    // Prevent self-deletion
    if (jwtUser.sub === userId) {
      throw AppError.badRequest('You cannot remove yourself');
    }

    const user = await UserModel.findOneAndDelete({ _id: userId, agencyId });
    if (!user) throw AppError.notFound('User not found');

    return sendSuccess({ message: 'User removed' });
  } catch (error) {
    return sendError(error);
  }
}
