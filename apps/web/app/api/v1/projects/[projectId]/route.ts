import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireRole, requireProjectAccess, validate } from '@/lib/server/guards';
import { sendSuccess, sendError } from '@/lib/server/response';
import { updateProjectSchema } from '@seo-cmd/validation';
import { AppError } from '@/lib/server/errors';
import ProjectModel from '@/lib/server/models/project.model';

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const project = await ProjectModel.findOne({ _id: projectId, agencyId, deletedAt: null }).lean();
    if (!project) throw AppError.notFound('Project not found');
    return sendSuccess(project);
  } catch (error) {
    return sendError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const body = await req.json();
    const validated = validate(updateProjectSchema, body);

    const project = await ProjectModel.findOneAndUpdate(
      { _id: projectId, agencyId, deletedAt: null },
      { ...validated, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();
    if (!project) throw AppError.notFound('Project not found');
    return sendSuccess(project);
  } catch (error) {
    return sendError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    requireRole(user, 'admin');
    const { projectId } = await params;

    const project = await ProjectModel.findOneAndUpdate(
      { _id: projectId, agencyId, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!project) throw AppError.notFound('Project not found');
    return sendSuccess({ message: 'Project deleted' });
  } catch (error) {
    return sendError(error);
  }
}
