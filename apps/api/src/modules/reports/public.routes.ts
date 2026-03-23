import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { AppError } from '../../shared/AppError.js';
import ReportLinkModel from './report-link.model.js';
import ProjectModel from '../projects/project.model.js';
import TaskModel from '../tasks/task.model.js';
import KeywordModel from '../keywords/keyword.model.js';
import AuditIssueModel from '../audits/audit.model.js';
import AnalyticsModel from '../analytics/analytics.model.js';
import CompetitorModel from '../competitors/competitor.model.js';

const router = Router();

// Auth helper
async function verifyToken(token: string, req: Request) {
  const link = await ReportLinkModel.findOne({ token, status: 'active' });
  if (!link) throw AppError.notFound('Report not available');
  if (link.passwordHash) {
    const pw = (req.headers['x-report-password'] as string) || (req.query.password as string);
    if (!pw) throw Object.assign(new Error('password_required'), { statusCode: 401 });
    if (!(await bcrypt.compare(pw, link.passwordHash))) throw Object.assign(new Error('invalid_password'), { statusCode: 401 });
  }
  return link;
}

// GET /api/v1/public/report/:token — report config
router.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const link = await verifyToken(req.params.token as string, req);
    await ReportLinkModel.updateOne({ _id: link._id }, { $inc: { viewCount: 1 }, lastViewedAt: new Date() });
    res.json({ success: true, data: { token: link.token, name: link.name, branding: link.branding, sectionVisibility: link.sectionVisibility, projectId: link.projectId } });
  } catch (err: any) {
    if (err.message === 'password_required') return res.status(401).json({ success: false, error: 'password_required' });
    if (err.message === 'invalid_password') return res.status(401).json({ success: false, error: 'invalid_password' });
    next(err);
  }
});

// GET /api/v1/public/report/:token/months — available months
router.get('/:token/months', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const link = await ReportLinkModel.findOne({ token: req.params.token, status: 'active' });
    if (!link) throw AppError.notFound('Not available');
    const months = await AnalyticsModel.distinct('month', { agencyId: link.agencyId, projectId: link.projectId });
    res.json({ success: true, data: months.sort() });
  } catch (error) { next(error); }
});

// GET /api/v1/public/report/:token/data?month=2026-02&compareTo=2026-01
router.get('/:token/data', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const link = await verifyToken(req.params.token as string, req);
    const { projectId, agencyId } = link;
    const month = req.query.month as string | undefined;
    const compareTo = req.query.compareTo as string | undefined;

    // ── Fetch project ──
    const project = await ProjectModel.findOne({ _id: projectId, agencyId, deletedAt: null }).lean();
    if (!project) throw AppError.notFound('Project not found');

    // ══════════════════════════════════════════════════
    // ANALYTICS — fetch SINGLE documents by exact month
    // NO aggregation, NO reduce, NO summing
    // ══════════════════════════════════════════════════
    let currentMonth: any = null;
    let compareMonth: any = null;
    let trendData: any[] = [];

    if (link.sectionVisibility.analytics) {
      // Fetch ONE document for the selected month
      if (month) {
        currentMonth = await AnalyticsModel.findOne({ agencyId, projectId, month }).lean();
      } else {
        // No month specified — get the latest single entry
        currentMonth = await AnalyticsModel.findOne({ agencyId, projectId }).sort({ month: -1 }).lean();
      }

      // Fetch ONE document for the comparison month
      if (compareTo) {
        compareMonth = await AnalyticsModel.findOne({ agencyId, projectId, month: compareTo }).lean();
      }

      // Fetch all entries for trend charts only
      trendData = await AnalyticsModel.find({ agencyId, projectId }).sort({ month: 1 }).lean();
    }

    // Build current/compare objects from SINGLE documents
    const pickFields = (doc: any) => doc ? ({
      clicks: doc.clicks,
      impressions: doc.impressions,
      organicTraffic: doc.organicTraffic,
      engagementRate: doc.engagementRate,
      pageViews: doc.pageViews,
      averagePosition: doc.averagePosition,
      totalUsers: doc.totalUsers,
      newUsers: doc.newUsers,
      returningUsers: doc.returningUsers,
      activeUsers: doc.activeUsers,
      engagementTime: doc.engagementTime,
    }) : null;

    const currentData = pickFields(currentMonth);
    const compareData = pickFields(compareMonth);

    // Calculate changes between the TWO specific month documents
    const changes: Record<string, { diff: number; pct: number }> = {};
    if (currentData && compareData) {
      const calcChange = (curr: number, prev: number) => ({
        diff: curr - prev,
        pct: prev > 0 ? ((curr - prev) / prev) * 100 : (curr > 0 ? 100 : 0),
      });

      changes.clicks = calcChange(currentData.clicks, compareData.clicks);
      changes.impressions = calcChange(currentData.impressions, compareData.impressions);
      changes.organicTraffic = calcChange(currentData.organicTraffic, compareData.organicTraffic);
      changes.pageViews = calcChange(currentData.pageViews, compareData.pageViews);
      changes.totalUsers = calcChange(currentData.totalUsers, compareData.totalUsers);
      changes.newUsers = calcChange(currentData.newUsers, compareData.newUsers);
      changes.returningUsers = calcChange(currentData.returningUsers, compareData.returningUsers);
      changes.activeUsers = calcChange(currentData.activeUsers, compareData.activeUsers);

      // Average position — lower is better, so positive diff = improvement
      changes.averagePosition = {
        diff: compareData.averagePosition - currentData.averagePosition,
        pct: compareData.averagePosition > 0 ? ((compareData.averagePosition - currentData.averagePosition) / compareData.averagePosition) * 100 : 0,
      };

      // Engagement rate — absolute point difference
      changes.engagementRate = {
        diff: currentData.engagementRate - compareData.engagementRate,
        pct: (currentData.engagementRate - compareData.engagementRate) * 100,
      };

      // Engagement time
      changes.engagementTime = {
        diff: currentData.engagementTime - compareData.engagementTime,
        pct: compareData.engagementTime > 0 ? ((currentData.engagementTime - compareData.engagementTime) / compareData.engagementTime) * 100 : 0,
      };
    }

    // ── Auto highlights ──
    const highlights: string[] = [];
    if (currentData && compareData) {
      const c = changes;
      if (c.organicTraffic?.diff > 0) highlights.push(`Organic traffic up by ${fmt(c.organicTraffic.diff)} (+${c.organicTraffic.pct.toFixed(1)}%)`);
      if (c.organicTraffic?.diff < 0) highlights.push(`Organic traffic down by ${fmt(Math.abs(c.organicTraffic.diff))} (${c.organicTraffic.pct.toFixed(1)}%)`);
      if (c.clicks?.diff > 0) highlights.push(`Clicks increased by ${fmt(c.clicks.diff)} (+${c.clicks.pct.toFixed(1)}%)`);
      if (c.totalUsers?.diff > 0) highlights.push(`${fmt(c.totalUsers.diff)} more users (+${c.totalUsers.pct.toFixed(1)}%)`);
      if (c.averagePosition?.diff > 0) highlights.push(`Average position improved by ${c.averagePosition.diff.toFixed(1)} spots`);
    }

    // ── Keywords ──
    let keywordsData = null;
    if (link.sectionVisibility.keywords) {
      const kws = await KeywordModel.find({ agencyId, projectId, deletedAt: null }).lean();
      keywordsData = {
        summary: {
          total: kws.length,
          top3: kws.filter(k => k.current?.rank > 0 && k.current.rank <= 3).length,
          top10: kws.filter(k => k.current?.rank > 0 && k.current.rank <= 10).length,
          top20: kws.filter(k => k.current?.rank > 0 && k.current.rank <= 20).length,
          improved: kws.filter(k => k.previous?.rank && k.current?.rank > 0 && k.current.rank < k.previous.rank).length,
          declined: kws.filter(k => k.previous?.rank && k.current?.rank > 0 && k.current.rank > k.previous.rank).length,
          stable: kws.filter(k => k.previous?.rank && k.current?.rank === k.previous.rank).length,
        },
        keywords: kws.sort((a, b) => (a.current?.rank || 999) - (b.current?.rank || 999)).map(k => ({
          keyword: k.keyword, rank: k.current?.rank || 0, previousRank: k.previous?.rank || 0,
          change: (k.previous?.rank || 0) - (k.current?.rank || 0),
          volume: k.current?.searchVolume || 0, difficulty: k.current?.difficulty || 0, group: k.group,
        })),
      };
      if (keywordsData.summary.improved > 0) highlights.push(`${keywordsData.summary.improved} keyword${keywordsData.summary.improved > 1 ? 's' : ''} improved`);
    }

    // ── Tasks ──
    let tasksData = null;
    if (link.sectionVisibility.tasks) {
      const ts = await TaskModel.find({ agencyId, projectId, deletedAt: null }).lean();
      tasksData = {
        summary: { completed: ts.filter(t => t.status === 'published').length, inProgress: ts.filter(t => t.status === 'in_progress').length, blocked: ts.filter(t => t.status === 'blocked').length, total: ts.length },
        tasks: ts.filter(t => t.clientVisibleSummary).map(t => ({ title: t.title, clientSummary: t.clientVisibleSummary, status: ['published', 'approved'].includes(t.status) ? 'Completed' : t.status === 'blocked' ? 'Blocked' : 'In Progress', category: t.category })),
      };
    }

    // ── Audits ──
    let auditsData = null;
    if (link.sectionVisibility.audits) {
      const as2 = await AuditIssueModel.find({ agencyId, projectId, deletedAt: null }).lean();
      const open = as2.filter(a => !['fixed', 'verified', 'wont_fix'].includes(a.status));
      auditsData = { summary: { critical: open.filter(a => a.severity === 'critical').length, high: open.filter(a => a.severity === 'high').length, medium: open.filter(a => a.severity === 'medium').length, low: open.filter(a => a.severity === 'low').length, resolved: as2.filter(a => ['fixed', 'verified'].includes(a.status)).length } };
    }

    // ── Competitors ──
    let competitorsData = null;
    if (link.sectionVisibility.competitors) {
      const comps = await CompetitorModel.find({ agencyId, projectId, deletedAt: null }).lean();
      const kwCount = link.sectionVisibility.keywords
        ? await KeywordModel.countDocuments({ agencyId, projectId, deletedAt: null })
        : 0;

      // Selected month — find each competitor's snapshot for THIS month
      const selectedMonth = currentMonth?.month || month;
      const compareM = compareMonth?.month || compareTo;

      competitorsData = {
        // Project's own data for the pivot
        project: {
          name: project.projectName,
          domain: project.domain,
          forMonth: selectedMonth ? {
            organicTraffic: currentData?.organicTraffic || 0,
            totalKeywords: kwCount,
            backlinks: 0, // Not tracked for own site in v1
            domainRating: 0, // Not tracked for own site in v1
          } : null,
          forCompareMonth: compareM && compareData ? {
            organicTraffic: compareData.organicTraffic || 0,
            totalKeywords: kwCount,
            backlinks: 0,
            domainRating: 0,
          } : null,
        },
        // Each competitor's data for the selected month
        competitors: comps.map(c => {
          const snapForMonth = selectedMonth
            ? (c.snapshots || []).find((s: any) => s.month === selectedMonth)
            : (c.snapshots || []).sort((a: any, b: any) => b.month.localeCompare(a.month))[0];
          const snapForCompare = compareM
            ? (c.snapshots || []).find((s: any) => s.month === compareM)
            : null;

          return {
            name: c.name,
            domain: c.domain,
            forMonth: snapForMonth ? {
              backlinks: snapForMonth.backlinks,
              organicTraffic: snapForMonth.organicTraffic,
              totalKeywords: snapForMonth.totalKeywords,
              domainRating: snapForMonth.domainRating,
            } : null,
            forCompareMonth: snapForCompare ? {
              backlinks: snapForCompare.backlinks,
              organicTraffic: snapForCompare.organicTraffic,
              totalKeywords: snapForCompare.totalKeywords,
              domainRating: snapForCompare.domainRating,
            } : null,
          };
        }),
      };
    }

    // ── Response ──
    res.json({
      success: true,
      data: {
        project: { name: project.projectName, client: project.clientName, domain: project.domain, healthStatus: project.healthStatus, healthNote: project.healthNote },
        highlights,
        selectedMonth: currentMonth?.month || null,
        compareMonth: compareMonth?.month || null,
        analytics: {
          current: currentData,
          compare: compareData,
          changes,
          trend: trendData.map(a => ({
            month: a.month, clicks: a.clicks, impressions: a.impressions, organicTraffic: a.organicTraffic,
            totalUsers: a.totalUsers, newUsers: a.newUsers, returningUsers: a.returningUsers,
            activeUsers: a.activeUsers, pageViews: a.pageViews,
          })),
        },
        keywords: keywordsData,
        tasks: tasksData,
        audits: auditsData,
        competitors: competitorsData,
      },
    });
  } catch (err: any) {
    if (err.message === 'password_required') return res.status(401).json({ success: false, error: 'password_required' });
    if (err.message === 'invalid_password') return res.status(401).json({ success: false, error: 'invalid_password' });
    next(err);
  }
});

function fmt(n: number): string { if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'; if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'; return n.toLocaleString(); }

export default router;