import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireProjectAccess, validate } from '@/lib/server/guards';
import { sendCreated, sendPaginated, sendError } from '@/lib/server/response';
import { createTaskSchema } from '@seo-cmd/validation';
import TaskModel from '@/lib/server/models/task.model';
import ProjectModel from '@/lib/server/models/project.model';

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const sp = req.nextUrl.searchParams;
    const page = Number(sp.get('page') || 1);
    const limit = Number(sp.get('limit') || 25);
    const status = sp.get('status');
    const category = sp.get('category');
    const assignedTo = sp.get('assignedTo');
    const priority = sp.get('priority');
    const search = sp.get('search');
    const startDate = sp.get('startDate');
    const endDate = sp.get('endDate');

    const filter: any = { agencyId, projectId, deletedAt: null };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (priority) filter.priority = priority;
    if (search) filter.title = { $regex: search, $options: 'i' };
    if (startDate || endDate) {
      filter.$or = [];
      const dateMatch: any = {};
      if (startDate) dateMatch.$gte = new Date(startDate);
      if (endDate) dateMatch.$lte = new Date(endDate);
      filter.$or.push({ createdAt: dateMatch }, { updatedAt: dateMatch }, { completedAt: dateMatch });
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      TaskModel.find(filter).sort({ priority: 1, dueDate: 1 }).skip(skip).limit(limit).populate('assignedTo', 'name email avatarUrl').lean(),
      TaskModel.countDocuments(filter),
    ]);

    return sendPaginated(data, { page, limit, total, totalPages: Math.ceil(total / limit) });
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

    const body = await req.json();
    const validated = validate(createTaskSchema, body);

    const task = await TaskModel.create({
      ...validated,
      agencyId,
      projectId,
      statusHistory: [{ from: '', to: 'not_started', changedBy: user.sub, changedAt: new Date() }],
    });

    await ProjectModel.updateOne({ _id: projectId, agencyId }, { $inc: { 'metadata.totalTasks': 1 } });
    return sendCreated(task);
  } catch (error) {
    return sendError(error);
  }
}
