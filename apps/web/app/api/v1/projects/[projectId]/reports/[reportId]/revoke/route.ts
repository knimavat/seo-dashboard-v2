import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireRole, requireProjectAccess } from '@/lib/server/guards';
import { sendSuccess, sendError } from '@/lib/server/response';
import { AppError } from '@/lib/server/errors';
import ReportLinkModel from '@/lib/server/models/report-link.model';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ projectId: string; reportId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    requireRole(user, 'admin');
    const { projectId, reportId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const report = await ReportLinkModel.findOneAndUpdate(
      { _id: reportId, agencyId, projectId, status: 'active' },
      { status: 'revoked', revokedAt: new Date() },
      { new: true }
    ).lean();
    if (!report) throw AppError.notFound('Report not found or already revoked');
    return sendSuccess(report);
  } catch (error) {
    return sendError(error);
  }
}
