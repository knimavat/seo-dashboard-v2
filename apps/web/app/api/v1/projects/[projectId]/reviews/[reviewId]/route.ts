import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireProjectAccess } from '@/lib/server/guards';
import { sendSuccess, sendError } from '@/lib/server/response';
import { AppError } from '@/lib/server/errors';
import ReviewModel from '@/lib/server/models/review.model';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ projectId: string; reviewId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId, reviewId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const { resolutionStatus } = await req.json();
    if (!resolutionStatus) throw AppError.badRequest('resolutionStatus required');

    const review = await ReviewModel.findOneAndUpdate(
      { _id: reviewId, agencyId, projectId },
      { resolutionStatus, updatedAt: new Date() },
      { new: true }
    ).lean();
    if (!review) throw AppError.notFound('Review not found');
    return sendSuccess(review);
  } catch (error) {
    return sendError(error);
  }
}
