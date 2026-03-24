import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireProjectAccess } from '@/lib/server/guards';
import { sendSuccess, sendError } from '@/lib/server/response';
import AnalyticsModel from '@/lib/server/models/analytics.model';

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const sp = req.nextUrl.searchParams;
    const currentStart = sp.get('currentStart');
    const currentEnd = sp.get('currentEnd');
    const previousStart = sp.get('previousStart');
    const previousEnd = sp.get('previousEnd');

    const [currentData, previousData] = await Promise.all([
      AnalyticsModel.find({ agencyId, projectId, month: { $gte: currentStart, $lte: currentEnd } }).sort({ month: 1 }).lean(),
      AnalyticsModel.find({ agencyId, projectId, month: { $gte: previousStart, $lte: previousEnd } }).sort({ month: 1 }).lean(),
    ]);

    const aggregate = (entries: any[]) => {
      if (entries.length === 0) return null;
      return {
        clicks: entries.reduce((s, e) => s + e.clicks, 0),
        impressions: entries.reduce((s, e) => s + e.impressions, 0),
        organicTraffic: entries.reduce((s, e) => s + e.organicTraffic, 0),
        engagementRate: entries.reduce((s, e) => s + e.engagementRate, 0) / entries.length,
        pageViews: entries.reduce((s, e) => s + e.pageViews, 0),
        averagePosition: entries.reduce((s, e) => s + e.averagePosition, 0) / entries.length,
        totalUsers: entries.reduce((s, e) => s + e.totalUsers, 0),
        newUsers: entries.reduce((s, e) => s + e.newUsers, 0),
        returningUsers: entries.reduce((s, e) => s + e.returningUsers, 0),
        activeUsers: entries.reduce((s, e) => s + e.activeUsers, 0),
        engagementTime: entries.reduce((s, e) => s + e.engagementTime, 0) / entries.length,
        months: entries.length,
      };
    };

    const current = aggregate(currentData);
    const previous = aggregate(previousData);

    const changes: Record<string, number> = {};
    if (current && previous) {
      const fields = ['clicks', 'impressions', 'organicTraffic', 'pageViews', 'totalUsers', 'newUsers', 'returningUsers', 'activeUsers'];
      fields.forEach(f => {
        const prev = (previous as any)[f] || 0;
        const curr = (current as any)[f] || 0;
        changes[f] = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
      });
      changes.averagePosition = previous.averagePosition > 0 ? ((previous.averagePosition - current.averagePosition) / previous.averagePosition) * 100 : 0;
      changes.engagementRate = (current.engagementRate - previous.engagementRate) * 100;
    }

    return sendSuccess({ current: { ...current, entries: currentData }, previous: { ...previous, entries: previousData }, changes });
  } catch (error) {
    return sendError(error);
  }
}
