import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireRole, requireProjectAccess } from '@/lib/server/guards';
import { sendSuccess, sendError } from '@/lib/server/response';
import { AppError } from '@/lib/server/errors';
import ReportLinkModel from '@/lib/server/models/report-link.model';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ projectId: string; reportId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    requireRole(user, 'admin');
    const { projectId, reportId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const result = await ReportLinkModel.findOneAndDelete({ _id: reportId, agencyId, projectId });
    if (!result) throw AppError.notFound('Report link not found');
    return sendSuccess({ message: 'Deleted' });
  } catch (error) {
    return sendError(error);
  }
}
