import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireProjectAccess } from '@/lib/server/guards';
import { sendSuccess, sendError } from '@/lib/server/response';
import { AppError } from '@/lib/server/errors';
import ProjectModel from '@/lib/server/models/project.model';
import TaskModel from '@/lib/server/models/task.model';
import KeywordModel from '@/lib/server/models/keyword.model';
import AuditIssueModel from '@/lib/server/models/audit.model';
import ApprovalModel from '@/lib/server/models/approval.model';

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const sp = req.nextUrl.searchParams;
    const startDate = sp.get('startDate');
    const endDate = sp.get('endDate');

    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    const dateFilter = { $or: [{ createdAt: { $gte: start, $lte: end } }, { updatedAt: { $gte: start, $lte: end } }] };

    const [project, tasks, keywords, audits, pendingApprovals] = await Promise.all([
      ProjectModel.findOne({ _id: projectId, agencyId, deletedAt: null }).lean(),
      TaskModel.find({ agencyId, projectId, deletedAt: null, ...dateFilter }).lean(),
      KeywordModel.find({ agencyId, projectId, deletedAt: null }).lean(),
      AuditIssueModel.find({ agencyId, projectId, deletedAt: null }).lean(),
      ApprovalModel.countDocuments({ agencyId, projectId, status: 'pending' }),
    ]);

    if (!project) throw AppError.notFound('Project not found');

    const overdueTasks = tasks.filter(t => t.dueDate < new Date() && !['published', 'cancelled'].includes(t.status));
    const openAudits = audits.filter(a => !['fixed', 'verified', 'wont_fix'].includes(a.status));

    const kpis = {
      health: project.healthStatus,
      healthNote: project.healthNote,
      tasks: { total: tasks.length, completed: tasks.filter(t => t.status === 'published').length, inProgress: tasks.filter(t => t.status === 'in_progress').length, overdue: overdueTasks.length, blocked: tasks.filter(t => t.status === 'blocked').length },
      keywords: {
        total: keywords.length, top3: keywords.filter(k => k.current?.rank > 0 && k.current.rank <= 3).length,
        top10: keywords.filter(k => k.current?.rank > 0 && k.current.rank <= 10).length,
        improved: keywords.filter(k => k.previous?.rank && k.current?.rank > 0 && k.current.rank < k.previous.rank).length,
        declined: keywords.filter(k => k.previous?.rank && k.current?.rank > 0 && k.current.rank > k.previous.rank).length,
        avgPositionChange: keywords.length ? Number((keywords.reduce((sum, k) => sum + ((k.previous?.rank || 0) - (k.current?.rank || 0)), 0) / keywords.length).toFixed(1)) : 0,
      },
      audits: { critical: openAudits.filter(a => a.severity === 'critical').length, high: openAudits.filter(a => a.severity === 'high').length, medium: openAudits.filter(a => a.severity === 'medium').length, low: openAudits.filter(a => a.severity === 'low').length, resolvedThisPeriod: audits.filter(a => a.resolvedAt && a.resolvedAt >= start && a.resolvedAt <= end).length },
      approvals: { pending: pendingApprovals, approvedThisPeriod: 0 },
      content: { publishedThisPeriod: tasks.filter(t => t.status === 'published' && t.category === 'content').length },
    };

    return sendSuccess(kpis);
  } catch (error) {
    return sendError(error);
  }
}
