import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireProjectAccess } from '@/lib/server/guards';
import { sendSuccess, sendError } from '@/lib/server/response';
import { AppError } from '@/lib/server/errors';
import CompetitorModel from '@/lib/server/models/competitor.model';

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const { month, entries } = await req.json();
    if (!month || !entries?.length) throw AppError.badRequest('Month and entries required');

    let updated = 0;
    for (const entry of entries) {
      const comp = await CompetitorModel.findOne({ _id: entry.competitorId, agencyId, projectId, deletedAt: null });
      if (!comp) continue;

      const snap = {
        month,
        backlinks: Number(entry.backlinks) || 0,
        organicTraffic: Number(entry.organicTraffic) || 0,
        totalKeywords: Number(entry.totalKeywords) || 0,
        domainRating: Number(entry.domainRating) || 0,
        recordedAt: new Date(),
      };

      const idx = comp.snapshots.findIndex((s: any) => s.month === month);
      if (idx >= 0) comp.snapshots[idx] = snap;
      else comp.snapshots.push(snap);
      await comp.save();
      updated++;
    }

    return sendSuccess({ updated, total: entries.length });
  } catch (error) {
    return sendError(error);
  }
}
