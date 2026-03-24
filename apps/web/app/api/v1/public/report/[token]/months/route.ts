import { NextRequest, NextResponse } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { checkRateLimit } from '@/lib/server/guards';
import { sendError } from '@/lib/server/response';
import { AppError } from '@/lib/server/errors';
import ReportLinkModel from '@/lib/server/models/report-link.model';
import AnalyticsModel from '@/lib/server/models/analytics.model';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    await ensureDB();
    await checkRateLimit(req, 30, 60);
    const { token } = await params;

    const link = await ReportLinkModel.findOne({ token, status: 'active' });
    if (!link) throw AppError.notFound('Not available');

    const months = await AnalyticsModel.distinct('month', { agencyId: link.agencyId, projectId: link.projectId });
    return NextResponse.json({ success: true, data: months.sort() });
  } catch (error) {
    return sendError(error);
  }
}
