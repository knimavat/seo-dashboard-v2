import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireProjectAccess, validate } from '@/lib/server/guards';
import { sendSuccess, sendError } from '@/lib/server/response';
import { updateTaskSchema } from '@seo-cmd/validation';
import { AppError } from '@/lib/server/errors';
import TaskModel from '@/lib/server/models/task.model';
import ProjectModel from '@/lib/server/models/project.model';

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string; taskId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId, taskId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const task = await TaskModel.findOne({ _id: taskId, agencyId, projectId, deletedAt: null }).populate('assignedTo', 'name email avatarUrl').lean();
    if (!task) throw AppError.notFound('Task not found');
    return sendSuccess(task);
  } catch (error) {
    return sendError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ projectId: string; taskId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId, taskId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const body = await req.json();
    const validated = validate(updateTaskSchema, body);
    const updates: any = { ...validated };

    const existing = await TaskModel.findOne({ _id: taskId, agencyId, projectId, deletedAt: null });
    if (!existing) throw AppError.notFound('Task not found');

    if (updates.status && updates.status !== existing.status) {
      if (['blocked', 'cancelled'].includes(updates.status) && !updates.statusReason) {
        throw AppError.badRequest('Reason required when setting status to blocked or cancelled');
      }
      existing.statusHistory.push({ from: existing.status, to: updates.status, changedBy: user.sub as any, changedAt: new Date(), reason: updates.statusReason });
      if (updates.status === 'published' && !existing.completedAt) updates.completedAt = new Date();
    }
    delete updates.statusReason;

    Object.assign(existing, updates);
    existing.statusHistory = existing.statusHistory;
    await existing.save();
    return sendSuccess(existing.toObject());
  } catch (error) {
    return sendError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ projectId: string; taskId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId, taskId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const task = await TaskModel.findOneAndUpdate(
      { _id: taskId, agencyId, projectId, deletedAt: null },
      { deletedAt: new Date() }, { new: true }
    );
    if (!task) throw AppError.notFound('Task not found');
    await ProjectModel.updateOne({ _id: projectId, agencyId }, { $inc: { 'metadata.totalTasks': -1 } });
    return sendSuccess({ message: 'Task deleted' });
  } catch (error) {
    return sendError(error);
  }
}
