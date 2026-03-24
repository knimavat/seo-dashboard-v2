import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireRole } from '@/lib/server/guards';
import { sendSuccess, sendError } from '@/lib/server/response';
import ProjectModel from '@/lib/server/models/project.model';
import TaskModel from '@/lib/server/models/task.model';
import KeywordModel from '@/lib/server/models/keyword.model';

export async function GET(req: NextRequest) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    requireRole(user, 'admin');

    const projects = await ProjectModel.find({ agencyId, status: 'active', deletedAt: null }).lean();

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
        _id: p._id, projectName: p.projectName, clientName: p.clientName, domain: p.domain,
        healthStatus: p.healthStatus,
        tasksCompleted: tasks.published || 0,
        tasksTotal: Object.values(tasks).reduce((a: any, b: any) => a + b, 0) as number,
        keywordsInTop10: kw.top10, keywordsTotal: kw.total,
        lastReportDate: p.metadata?.lastReportDate,
      };
    }));

    return sendSuccess(portfolio);
  } catch (error) {
    return sendError(error);
  }
}
