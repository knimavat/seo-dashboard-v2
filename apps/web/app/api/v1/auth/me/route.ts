import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { sendSuccess, sendError } from '@/lib/server/response';
import { AppError } from '@/lib/server/errors';
import UserModel from '@/lib/server/models/user.model';
import AgencyModel from '@/lib/server/models/agency.model';

export async function GET(req: NextRequest) {
  try {
    await ensureDB();
    const jwtUser = await authenticate(req);
    const user = await UserModel.findById(jwtUser.sub).lean();
    if (!user) throw AppError.unauthorized('User not found');
    const agency = await AgencyModel.findById(user.agencyId).lean();

    return sendSuccess({
      user: { _id: user._id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, role: user.role, assignedProjects: user.assignedProjects },
      agency: agency ? { _id: agency._id, name: agency.name, slug: agency.slug } : null,
    });
  } catch (error) {
    return sendError(error);
  }
}
