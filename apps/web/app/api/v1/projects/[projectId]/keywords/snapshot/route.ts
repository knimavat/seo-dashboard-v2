import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireProjectAccess } from '@/lib/server/guards';
import { sendSuccess, sendError } from '@/lib/server/response';
import KeywordModel from '@/lib/server/models/keyword.model';

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const { snapshots } = await req.json();
    const now = new Date();
    let updated = 0;

    for (const snap of snapshots) {
      const keyword = await KeywordModel.findOne({ _id: snap.keywordId, agencyId, projectId, deletedAt: null });
      if (!keyword) continue;

      const snapshotData = { rank: snap.rank, searchVolume: snap.searchVolume, difficulty: snap.difficulty, cpc: snap.cpc, serpFeatures: snap.serpFeatures || [], ownsSerpFeature: snap.ownsSerpFeature || false, trafficEstimate: snap.trafficEstimate || 0, recordedAt: now };

      keyword.previous = { rank: keyword.current?.rank || 0, recordedAt: keyword.current?.recordedAt };
      keyword.current = snapshotData;
      if (snap.rank > 0 && (keyword.bestRank === 0 || snap.rank < keyword.bestRank)) keyword.bestRank = snap.rank;
      keyword.snapshots.push(snapshotData);
      if (keyword.snapshots.length > 24) keyword.snapshots = keyword.snapshots.slice(-24);
      await keyword.save();
      updated++;
    }

    return sendSuccess({ updated, total: snapshots.length });
  } catch (error) {
    return sendError(error);
  }
}
