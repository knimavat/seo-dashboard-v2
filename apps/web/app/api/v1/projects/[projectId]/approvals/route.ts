import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireProjectAccess, validate } from '@/lib/server/guards';
import { sendCreated, sendPaginated, sendError } from '@/lib/server/response';
import { createApprovalSchema } from '@seo-cmd/validation';
import { AppError } from '@/lib/server/errors';
import ApprovalModel from '@/lib/server/models/approval.model';
import TaskModel from '@/lib/server/models/task.model';

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
    const status = sp.get('status');
    const type = sp.get('type');

    const filter: any = { agencyId, projectId };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      ApprovalModel.find(filter).sort({ submittedAt: -1 }).skip(skip).limit(limit)
        .populate('submittedBy', 'name email').populate('assignedApprovers', 'name email').populate('taskId', 'title').lean(),
      ApprovalModel.countDocuments(filter),
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
    const validated = validate(createApprovalSchema, body);

    const task = await TaskModel.findOne({ _id: validated.taskId, agencyId, projectId, deletedAt: null });
    if (!task) throw AppError.notFound('Task not found');

    const approval = await ApprovalModel.create({
      ...validated,
      agencyId,
      projectId,
      submittedBy: user.sub,
      submittedAt: new Date(),
    });

    if (task.status === 'in_progress') {
      task.status = 'in_review';
      task.statusHistory.push({ from: 'in_progress', to: 'in_review', changedBy: user.sub as any, changedAt: new Date() });
      await task.save();
    }

    return sendCreated(approval);
  } catch (error) {
    return sendError(error);
  }
}
