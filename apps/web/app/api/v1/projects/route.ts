import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireRole, validate } from '@/lib/server/guards';
import { sendSuccess, sendCreated, sendPaginated, sendError } from '@/lib/server/response';
import { createProjectSchema } from '@seo-cmd/validation';
import ProjectModel from '@/lib/server/models/project.model';
import UserModel from '@/lib/server/models/user.model';

export async function GET(req: NextRequest) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);

    const { searchParams } = req.nextUrl;
    const page = Number(searchParams.get('page') || 1);
    const limit = Number(searchParams.get('limit') || 25);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const filter: any = { agencyId, deletedAt: null };

    if (user.role === 'specialist') {
      const dbUser = await UserModel.findById(user.sub);
      filter._id = { $in: dbUser?.assignedProjects || [] };
    }

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { projectName: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      ProjectModel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      ProjectModel.countDocuments(filter),
    ]);

    return sendPaginated(data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return sendError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    requireRole(user, 'admin');

    const body = await req.json();
    const validated = validate(createProjectSchema, body);

    const project = await ProjectModel.create({
      ...validated,
      agencyId,
      metadata: { totalKeywords: 0, totalTasks: 0, openAuditIssues: 0 },
    });

    return sendCreated(project);
  } catch (error) {
    return sendError(error);
  }
}
