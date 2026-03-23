import { Router, Request, Response, NextFunction } from 'express';
import { roleGuard } from '../../middleware/index.js';
import { sendSuccess } from '../../shared/response.js';
import ProjectModel from '../projects/project.model.js';
import TaskModel from '../tasks/task.model.js';
import KeywordModel from '../keywords/keyword.model.js';
import AuditIssueModel from '../audits/audit.model.js';
import ApprovalModel from '../approvals/approval.model.js';
import UserModel from '../auth/user.model.js';

const router = Router();

// ─── GET /dashboard/portfolio ──────────────────────
// Cross-project summary for admins
router.get('/portfolio', roleGuard('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await ProjectModel.find({ agencyId: req.agencyId, status: 'active', deletedAt: null }).lean();

    const portfolio = await Promise.all(projects.map(async (p) => {
      const [taskStats, kwStats] = await Promise.all([
        TaskModel.aggregate([
          { $match: { agencyId: p.agencyId, projectId: p._id, deletedAt: null } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        KeywordModel.aggregate([
          { $match: { agencyId: p.agencyId, projectId: p._id, deletedAt: null, 'current.rank': { $gt: 0 } } },
          { $group: { _id: null, total: { $sum: 1 }, top10: { $sum: { $cond: [{ $lte: ['$current.rank', 10] }, 1, 0] } } } },
        ]),
      ]);

      const tasks = taskStats.reduce((acc: any, s: any) => { acc[s._id] = s.count; return acc; }, {});
      const kw = kwStats[0] || { total: 0, top10: 0 };

      return {
        _id: p._id,
        projectName: p.projectName,
        clientName: p.clientName,
        domain: p.domain,
        healthStatus: p.healthStatus,
        tasksCompleted: tasks.published || 0,
        tasksTotal: Object.values(tasks).reduce((a: any, b: any) => a + b, 0) as number,
        keywordsInTop10: kw.top10,
        keywordsTotal: kw.total,
        lastReportDate: p.metadata?.lastReportDate,
      };
    }));

    sendSuccess(res, portfolio);
  } catch (error) { next(error); }
});

// ─── GET /projects/:projectId/dashboard ────────────
// Project-level KPIs
router.get('/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    const dateFilter = {
      $or: [
        { createdAt: { $gte: start, $lte: end } },
        { updatedAt: { $gte: start, $lte: end } },
      ],
    };

    const [project, tasks, keywords, audits, pendingApprovals] = await Promise.all([
      ProjectModel.findOne({ _id: projectId, agencyId: req.agencyId, deletedAt: null }).lean(),
      TaskModel.find({ agencyId: req.agencyId, projectId, deletedAt: null, ...dateFilter }).lean(),
      KeywordModel.find({ agencyId: req.agencyId, projectId, deletedAt: null }).lean(),
      AuditIssueModel.find({ agencyId: req.agencyId, projectId, deletedAt: null }).lean(),
      ApprovalModel.countDocuments({ agencyId: req.agencyId, projectId, status: 'pending' }),
    ]);

    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const overdueTasks = tasks.filter(t => t.dueDate < new Date() && !['published', 'cancelled'].includes(t.status));
    const openAudits = audits.filter(a => !['fixed', 'verified', 'wont_fix'].includes(a.status));

    const kpis = {
      health: project.healthStatus,
      healthNote: project.healthNote,
      tasks: {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'published').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        overdue: overdueTasks.length,
        blocked: tasks.filter(t => t.status === 'blocked').length,
      },
      keywords: {
        total: keywords.length,
        top3: keywords.filter(k => k.current?.rank > 0 && k.current.rank <= 3).length,
        top10: keywords.filter(k => k.current?.rank > 0 && k.current.rank <= 10).length,
        improved: keywords.filter(k => k.previous?.rank && k.current?.rank > 0 && k.current.rank < k.previous.rank).length,
        declined: keywords.filter(k => k.previous?.rank && k.current?.rank > 0 && k.current.rank > k.previous.rank).length,
        avgPositionChange: keywords.length ? Number((keywords.reduce((sum, k) => sum + ((k.previous?.rank || 0) - (k.current?.rank || 0)), 0) / keywords.length).toFixed(1)) : 0,
      },
      audits: {
        critical: openAudits.filter(a => a.severity === 'critical').length,
        high: openAudits.filter(a => a.severity === 'high').length,
        medium: openAudits.filter(a => a.severity === 'medium').length,
        low: openAudits.filter(a => a.severity === 'low').length,
        resolvedThisPeriod: audits.filter(a => a.resolvedAt && a.resolvedAt >= start && a.resolvedAt <= end).length,
      },
      approvals: {
        pending: pendingApprovals,
        approvedThisPeriod: 0,
      },
      content: {
        publishedThisPeriod: tasks.filter(t => t.status === 'published' && t.category === 'content').length,
      },
    };

    sendSuccess(res, kpis);
  } catch (error) { next(error); }
});

// ─── GET /dashboard/workload ───────────────────────
router.get('/workload', roleGuard('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await UserModel.find({ agencyId: req.agencyId, status: 'active' }).lean();

    const workload = await Promise.all(users.map(async (u) => {
      const tasks = await TaskModel.find({
        agencyId: req.agencyId,
        assignedTo: u._id,
        deletedAt: null,
        status: { $nin: ['published', 'cancelled'] },
      }).select('title status priority dueDate projectId').populate('projectId', 'projectName').lean();

      return {
        user: { _id: u._id, name: u.name, email: u.email, avatarUrl: u.avatarUrl },
        activeTasks: tasks.length,
        tasks: tasks.slice(0, 20), // Cap at 20 for performance
        byStatus: {
          notStarted: tasks.filter(t => t.status === 'not_started').length,
          inProgress: tasks.filter(t => t.status === 'in_progress').length,
          inReview: tasks.filter(t => t.status === 'in_review').length,
          blocked: tasks.filter(t => t.status === 'blocked').length,
        },
      };
    }));

    sendSuccess(res, workload);
  } catch (error) { next(error); }
});

export default router;
