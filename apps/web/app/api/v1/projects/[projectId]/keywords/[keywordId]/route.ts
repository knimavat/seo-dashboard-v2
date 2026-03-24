import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireProjectAccess, validate } from '@/lib/server/guards';
import { sendSuccess, sendError } from '@/lib/server/response';
import { updateKeywordSchema } from '@seo-cmd/validation';
import { AppError } from '@/lib/server/errors';
import KeywordModel from '@/lib/server/models/keyword.model';
import ProjectModel from '@/lib/server/models/project.model';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ projectId: string; keywordId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId, keywordId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const body = await req.json();
    const validated = validate(updateKeywordSchema, body);

    const keyword = await KeywordModel.findOneAndUpdate(
      { _id: keywordId, agencyId, projectId, deletedAt: null },
      { ...validated, updatedAt: new Date() }, { new: true, runValidators: true }
    ).lean();
    if (!keyword) throw AppError.notFound('Keyword not found');
    return sendSuccess(keyword);
  } catch (error) {
    return sendError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ projectId: string; keywordId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId, keywordId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const keyword = await KeywordModel.findOneAndUpdate(
      { _id: keywordId, agencyId, projectId, deletedAt: null },
      { deletedAt: new Date() }, { new: true }
    );
    if (!keyword) throw AppError.notFound('Keyword not found');
    await ProjectModel.updateOne({ _id: projectId, agencyId }, { $inc: { 'metadata.totalKeywords': -1 } });
    return sendSuccess({ message: 'Keyword deleted' });
  } catch (error) {
    return sendError(error);
  }
}
