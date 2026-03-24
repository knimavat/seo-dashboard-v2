import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireProjectAccess } from '@/lib/server/guards';
import { sendSuccess, sendCreated, sendError } from '@/lib/server/response';
import { AppError } from '@/lib/server/errors';
import CompetitorModel from '@/lib/server/models/competitor.model';

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const data = await CompetitorModel.find({ agencyId, projectId, deletedAt: null }).sort({ name: 1 }).lean();
    return sendSuccess(data);
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

    const { name, domain, backlinks, organicTraffic, totalKeywords, domainRating, month, notes } = await req.json();
    if (!name || !domain) throw AppError.badRequest('Name and domain are required');

    const cleanDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '').trim();
    const entryMonth = month || new Date().toISOString().slice(0, 7);

    const snapshot = {
      month: entryMonth,
      backlinks: Number(backlinks) || 0,
      organicTraffic: Number(organicTraffic) || 0,
      totalKeywords: Number(totalKeywords) || 0,
      domainRating: Number(domainRating) || 0,
      recordedAt: new Date(),
    };

    const existing = await CompetitorModel.findOne({ agencyId, projectId, domain: cleanDomain, deletedAt: null });

    if (existing) {
      const monthExists = existing.snapshots.some((s: any) => s.month === entryMonth);
      if (monthExists) throw AppError.conflict(`"${existing.name}" already has data for ${entryMonth}. Use "Update Data" to modify it.`);
      existing.snapshots.push(snapshot);
      if (notes !== undefined) existing.notes = notes;
      await existing.save();
      return sendSuccess(existing.toObject());
    }

    const competitor = await CompetitorModel.create({ agencyId, projectId, name, domain: cleanDomain, snapshots: [snapshot], notes });
    return sendCreated(competitor);
  } catch (error) {
    return sendError(error);
  }
}
