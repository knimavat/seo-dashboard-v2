import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireRole } from '@/lib/server/guards';
import { sendSuccess, sendError } from '@/lib/server/response';
import UserModel from '@/lib/server/models/user.model';
import TaskModel from '@/lib/server/models/task.model';

export async function GET(req: NextRequest) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    requireRole(user, 'admin');

    const users = await UserModel.find({ agencyId, status: 'active' }).lean();

    const workload = await Promise.all(users.map(async (u) => {
      const tasks = await TaskModel.find({
        agencyId, assignedTo: u._id, deletedAt: null,
        status: { $nin: ['published', 'cancelled'] },
      }).select('title status priority dueDate projectId').populate('projectId', 'projectName').lean();

      return {
        user: { _id: u._id, name: u.name, email: u.email, avatarUrl: u.avatarUrl },
        activeTasks: tasks.length,
        tasks: tasks.slice(0, 20),
        byStatus: {
          notStarted: tasks.filter(t => t.status === 'not_started').length,
          inProgress: tasks.filter(t => t.status === 'in_progress').length,
          inReview: tasks.filter(t => t.status === 'in_review').length,
          blocked: tasks.filter(t => t.status === 'blocked').length,
        },
      };
    }));

    return sendSuccess(workload);
  } catch (error) {
    return sendError(error);
  }
}
