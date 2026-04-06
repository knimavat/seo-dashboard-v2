import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireRole, requireProjectAccess } from '@/lib/server/guards';
import { sendSuccess, sendError } from '@/lib/server/response';
import { AppError } from '@/lib/server/errors';
import ApprovalModel from '@/lib/server/models/approval.model';

export async function DELETE(req: NextRequest, { params }: { params: { projectId: string; approvalId: string } }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    requireRole(user, 'admin');
    await requireProjectAccess(user, agencyId, params.projectId);

    const approval = await ApprovalModel.findOneAndDelete({ _id: params.approvalId, agencyId, projectId: params.projectId });
    if (!approval) throw AppError.notFound('Approval not found');

    return sendSuccess({ message: 'Approval removed' });
  } catch (error) {
    return sendError(error);
  }
}
