import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireProjectAccess } from '@/lib/server/guards';
import { sendSuccess, sendError } from '@/lib/server/response';
import { AppError } from '@/lib/server/errors';
import AnalyticsModel from '@/lib/server/models/analytics.model';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ projectId: string; month: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId, month } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const result = await AnalyticsModel.findOneAndDelete({ agencyId, projectId, month });
    if (!result) throw AppError.notFound('Analytics entry not found');
    return sendSuccess({ message: 'Deleted' });
  } catch (error) {
    return sendError(error);
  }
}
