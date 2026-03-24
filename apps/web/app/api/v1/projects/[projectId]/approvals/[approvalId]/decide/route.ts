import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireProjectAccess, validate } from '@/lib/server/guards';
import { sendSuccess, sendError } from '@/lib/server/response';
import { approvalDecisionSchema } from '@seo-cmd/validation';
import { AppError } from '@/lib/server/errors';
import ApprovalModel from '@/lib/server/models/approval.model';
import TaskModel from '@/lib/server/models/task.model';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ projectId: string; approvalId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId, approvalId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const body = await req.json();
    const validated = validate(approvalDecisionSchema, body);

    const approval = await ApprovalModel.findOne({ _id: approvalId, agencyId, projectId });
    if (!approval) throw AppError.notFound('Approval not found');
    if (approval.status !== 'pending') throw AppError.badRequest('Approval already decided');

    const isApprover = approval.assignedApprovers.some(a => a.toString() === user.sub);
    if (!isApprover && user.role !== 'admin') throw AppError.forbidden('Not an assigned approver');

    approval.decisions.push({ approverId: user.sub as any, decision: validated.decision, comments: validated.comments, decidedAt: new Date() });
    approval.status = validated.decision;
    if (validated.decision === 'revision_requested') approval.revisionCount += 1;
    await approval.save();

    if (validated.decision === 'approved') {
      await TaskModel.findOneAndUpdate(
        { _id: approval.taskId, agencyId },
        { status: 'approved', $push: { statusHistory: { from: 'in_review', to: 'approved', changedBy: user.sub, changedAt: new Date() } } }
      );
    }

    return sendSuccess(approval.toObject());
  } catch (error) {
    return sendError(error);
  }
}
