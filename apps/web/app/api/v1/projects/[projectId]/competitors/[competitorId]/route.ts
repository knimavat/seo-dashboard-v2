import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireProjectAccess } from '@/lib/server/guards';
import { sendSuccess, sendError } from '@/lib/server/response';
import { AppError } from '@/lib/server/errors';
import CompetitorModel from '@/lib/server/models/competitor.model';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ projectId: string; competitorId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId, competitorId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const body = await req.json();
    const comp = await CompetitorModel.findOne({ _id: competitorId, agencyId, projectId, deletedAt: null });
    if (!comp) throw AppError.notFound('Competitor not found');

    if (body.name) comp.name = body.name;
    if (body.domain) comp.domain = body.domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (body.notes !== undefined) comp.notes = body.notes;
    await comp.save();

    return sendSuccess(comp.toObject());
  } catch (error) {
    return sendError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ projectId: string; competitorId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId, competitorId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const result = await CompetitorModel.findOneAndUpdate(
      { _id: competitorId, agencyId, projectId, deletedAt: null },
      { deletedAt: new Date() }, { new: true }
    );
    if (!result) throw AppError.notFound('Competitor not found');
    return sendSuccess({ message: 'Deleted' });
  } catch (error) {
    return sendError(error);
  }
}
