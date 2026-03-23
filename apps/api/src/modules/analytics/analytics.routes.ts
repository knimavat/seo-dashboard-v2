import { Router, Request, Response, NextFunction } from 'express';
import { sendSuccess, sendCreated } from '../../shared/response.js';
import { AppError } from '../../shared/AppError.js';
import AnalyticsModel from './analytics.model.js';

const router = Router({ mergeParams: true });

// ─── GET /projects/:projectId/analytics ────────────
// Returns all monthly entries sorted by month desc
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { startMonth, endMonth } = req.query;

    const filter: any = { agencyId: req.agencyId, projectId };
    if (startMonth || endMonth) {
      filter.month = {};
      if (startMonth) filter.month.$gte = startMonth;
      if (endMonth) filter.month.$lte = endMonth;
    }

    const data = await AnalyticsModel.find(filter)
      .sort({ month: -1 })
      .populate('enteredBy', 'name')
      .lean();

    sendSuccess(res, data);
  } catch (error) { next(error); }
});

// ─── POST /projects/:projectId/analytics ───────────
// Create or update a month's analytics (upsert)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { month, clicks, impressions, organicTraffic, engagementRate, pageViews,
            averagePosition, totalUsers, newUsers, returningUsers, activeUsers,
            engagementTime, notes } = req.body;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      throw AppError.badRequest('Month must be in YYYY-MM format');
    }

    const data = await AnalyticsModel.findOneAndUpdate(
      { agencyId: req.agencyId, projectId, month },
      {
        agencyId: req.agencyId,
        projectId,
        month,
        clicks: Number(clicks) || 0,
        impressions: Number(impressions) || 0,
        organicTraffic: Number(organicTraffic) || 0,
        engagementRate: Number(engagementRate) || 0,
        pageViews: Number(pageViews) || 0,
        averagePosition: Number(averagePosition) || 0,
        totalUsers: Number(totalUsers) || 0,
        newUsers: Number(newUsers) || 0,
        returningUsers: Number(returningUsers) || 0,
        activeUsers: Number(activeUsers) || 0,
        engagementTime: Number(engagementTime) || 0,
        notes: notes || undefined,
        enteredBy: req.user!.sub,
      },
      { upsert: true, new: true, runValidators: true }
    ).lean();

    sendCreated(res, data);
  } catch (error) { next(error); }
});

// ─── DELETE /projects/:projectId/analytics/:month ──
router.delete('/:month', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AnalyticsModel.findOneAndDelete({
      agencyId: req.agencyId,
      projectId: req.params.projectId,
      month: req.params.month,
    });
    if (!result) throw AppError.notFound('Analytics entry not found');
    sendSuccess(res, { message: 'Deleted' });
  } catch (error) { next(error); }
});

// ─── GET /projects/:projectId/analytics/compare ────
// Compare two date ranges
router.get('/compare', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { currentStart, currentEnd, previousStart, previousEnd } = req.query;

    const [currentData, previousData] = await Promise.all([
      AnalyticsModel.find({
        agencyId: req.agencyId, projectId,
        month: { $gte: currentStart, $lte: currentEnd },
      }).sort({ month: 1 }).lean(),
      AnalyticsModel.find({
        agencyId: req.agencyId, projectId,
        month: { $gte: previousStart, $lte: previousEnd },
      }).sort({ month: 1 }).lean(),
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

    // Calculate percentage changes
    const changes: Record<string, number> = {};
    if (current && previous) {
      const fields = ['clicks', 'impressions', 'organicTraffic', 'pageViews', 'totalUsers', 'newUsers', 'returningUsers', 'activeUsers'];
      fields.forEach(f => {
        const prev = (previous as any)[f] || 0;
        const curr = (current as any)[f] || 0;
        changes[f] = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
      });
      // For averagePosition, lower is better
      changes.averagePosition = previous.averagePosition > 0
        ? ((previous.averagePosition - current.averagePosition) / previous.averagePosition) * 100
        : 0;
      // Engagement rate change as absolute points
      changes.engagementRate = (current.engagementRate - previous.engagementRate) * 100;
    }

    sendSuccess(res, {
      current: { ...current, entries: currentData },
      previous: { ...previous, entries: previousData },
      changes,
    });
  } catch (error) { next(error); }
});

export default router;
