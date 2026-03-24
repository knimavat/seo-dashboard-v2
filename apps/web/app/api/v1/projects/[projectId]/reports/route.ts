import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireProjectAccess } from '@/lib/server/guards';
import { sendSuccess, sendError } from '@/lib/server/response';
import ReportLinkModel from '@/lib/server/models/report-link.model';

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const reports = await ReportLinkModel.find({ agencyId, projectId }).sort({ createdAt: -1 }).lean();
    return sendSuccess(reports);
  } catch (error) {
    return sendError(error);
  }
}
