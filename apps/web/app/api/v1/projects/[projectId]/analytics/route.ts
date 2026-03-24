import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireProjectAccess } from '@/lib/server/guards';
import { sendSuccess, sendCreated, sendError } from '@/lib/server/response';
import { AppError } from '@/lib/server/errors';
import AnalyticsModel from '@/lib/server/models/analytics.model';

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const sp = req.nextUrl.searchParams;
    const startMonth = sp.get('startMonth');
    const endMonth = sp.get('endMonth');

    const filter: any = { agencyId, projectId };
    if (startMonth || endMonth) {
      filter.month = {};
      if (startMonth) filter.month.$gte = startMonth;
      if (endMonth) filter.month.$lte = endMonth;
    }

    const data = await AnalyticsModel.find(filter).sort({ month: -1 }).populate('enteredBy', 'name').lean();
    return sendSuccess(data);
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

    const { month, clicks, impressions, organicTraffic, engagementRate, pageViews,
            averagePosition, totalUsers, newUsers, returningUsers, activeUsers,
            engagementTime, notes } = await req.json();

    if (!month || !/^\d{4}-\d{2}$/.test(month)) throw AppError.badRequest('Month must be in YYYY-MM format');

    const data = await AnalyticsModel.findOneAndUpdate(
      { agencyId, projectId, month },
      {
        agencyId, projectId, month,
        clicks: Number(clicks) || 0, impressions: Number(impressions) || 0,
        organicTraffic: Number(organicTraffic) || 0, engagementRate: Number(engagementRate) || 0,
        pageViews: Number(pageViews) || 0, averagePosition: Number(averagePosition) || 0,
        totalUsers: Number(totalUsers) || 0, newUsers: Number(newUsers) || 0,
        returningUsers: Number(returningUsers) || 0, activeUsers: Number(activeUsers) || 0,
        engagementTime: Number(engagementTime) || 0, notes: notes || undefined,
        enteredBy: user.sub,
      },
      { upsert: true, new: true, runValidators: true }
    ).lean();

    return sendCreated(data);
  } catch (error) {
    return sendError(error);
  }
}
