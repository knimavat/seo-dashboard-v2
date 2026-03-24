import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireProjectAccess, validate } from '@/lib/server/guards';
import { sendCreated, sendPaginated, sendError } from '@/lib/server/response';
import { createReviewSchema } from '@seo-cmd/validation';
import ReviewModel from '@/lib/server/models/review.model';

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const sp = req.nextUrl.searchParams;
    const page = Number(sp.get('page') || 1);
    const limit = Number(sp.get('limit') || 25);
    const type = sp.get('type');
    const rating = sp.get('rating');
    const taskId = sp.get('taskId');

    const filter: any = { agencyId, projectId };
    if (type) filter.type = type;
    if (rating) filter.rating = rating;
    if (taskId) filter.taskId = taskId;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      ReviewModel.find(filter).sort({ reviewedAt: -1 }).skip(skip).limit(limit)
        .populate('reviewerId', 'name email').populate('taskId', 'title').lean(),
      ReviewModel.countDocuments(filter),
    ]);
    return sendPaginated(data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return sendError(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const body = await req.json();
    const validated = validate(createReviewSchema, body);

    const review = await ReviewModel.create({
      ...validated,
      agencyId,
      projectId,
      reviewerId: user.sub,
      reviewedAt: new Date(),
    });
    return sendCreated(review);
  } catch (error) {
    return sendError(error);
  }
}
