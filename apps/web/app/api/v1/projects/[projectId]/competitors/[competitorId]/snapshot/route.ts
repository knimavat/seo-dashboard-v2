import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireProjectAccess } from '@/lib/server/guards';
import { sendSuccess, sendError } from '@/lib/server/response';
import { AppError } from '@/lib/server/errors';
import CompetitorModel from '@/lib/server/models/competitor.model';

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string; competitorId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId, competitorId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const comp = await CompetitorModel.findOne({ _id: competitorId, agencyId, projectId, deletedAt: null });
    if (!comp) throw AppError.notFound('Competitor not found');

    const { month, backlinks, organicTraffic, totalKeywords, domainRating } = await req.json();
    const entryMonth = month || new Date().toISOString().slice(0, 7);

    const snap = {
      month: entryMonth,
      backlinks: Number(backlinks) || 0,
      organicTraffic: Number(organicTraffic) || 0,
      totalKeywords: Number(totalKeywords) || 0,
      domainRating: Number(domainRating) || 0,
      recordedAt: new Date(),
    };

    const idx = comp.snapshots.findIndex((s: any) => s.month === entryMonth);
    if (idx >= 0) comp.snapshots[idx] = snap;
    else comp.snapshots.push(snap);
    await comp.save();

    return sendSuccess(comp.toObject());
  } catch (error) {
    return sendError(error);
  }
}
