import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireProjectAccess, validate } from '@/lib/server/guards';
import { sendSuccess, sendError } from '@/lib/server/response';
import { updateAuditSchema } from '@seo-cmd/validation';
import { AppError } from '@/lib/server/errors';
import AuditIssueModel from '@/lib/server/models/audit.model';
import ProjectModel from '@/lib/server/models/project.model';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ projectId: string; auditId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId, auditId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const body = await req.json();
    const validated = validate(updateAuditSchema, body);

    const existing = await AuditIssueModel.findOne({ _id: auditId, agencyId, projectId, deletedAt: null });
    if (!existing) throw AppError.notFound('Audit issue not found');

    if (validated.status && validated.status !== existing.status) {
      existing.statusHistory.push({ from: existing.status, to: validated.status, changedBy: user.sub as any, changedAt: new Date() });
      if (['fixed', 'verified', 'wont_fix'].includes(validated.status) && !existing.resolvedAt) {
        existing.resolvedAt = new Date();
        await ProjectModel.updateOne({ _id: projectId, agencyId }, { $inc: { 'metadata.openAuditIssues': -1 } });
      }
    }

    Object.assign(existing, validated);
    await existing.save();
    return sendSuccess(existing.toObject());
  } catch (error) {
    return sendError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ projectId: string; auditId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId, auditId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const issue = await AuditIssueModel.findOneAndUpdate(
      { _id: auditId, agencyId, projectId, deletedAt: null },
      { deletedAt: new Date() }, { new: true }
    );
    if (!issue) throw AppError.notFound('Audit issue not found');
    if (!issue.resolvedAt) {
      await ProjectModel.updateOne({ _id: projectId, agencyId }, { $inc: { 'metadata.openAuditIssues': -1 } });
    }
    return sendSuccess({ message: 'Audit issue deleted' });
  } catch (error) {
    return sendError(error);
  }
}
