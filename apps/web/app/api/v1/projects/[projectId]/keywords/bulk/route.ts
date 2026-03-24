import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireProjectAccess, validate } from '@/lib/server/guards';
import { sendCreated, sendError } from '@/lib/server/response';
import { bulkKeywordSchema } from '@seo-cmd/validation';
import KeywordModel from '@/lib/server/models/keyword.model';
import ProjectModel from '@/lib/server/models/project.model';

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const body = await req.json();
    const validated = validate(bulkKeywordSchema, body);
    const now = new Date();
    const docs = validated.keywords.map((kw: any) => ({
      ...kw,
      agencyId,
      projectId,
      current: { ...kw.current, recordedAt: now },
      bestRank: kw.current.rank || 0,
      snapshots: [{ ...kw.current, recordedAt: now }],
    }));

    const result = await KeywordModel.insertMany(docs, { ordered: false }).catch(err => {
      if (err.code === 11000) return err.insertedDocs || [];
      throw err;
    });

    const insertedCount = Array.isArray(result) ? result.length : 0;
    await ProjectModel.updateOne({ _id: projectId, agencyId }, { $inc: { 'metadata.totalKeywords': insertedCount } });
    return sendCreated({ inserted: insertedCount, total: validated.keywords.length });
  } catch (error) {
    return sendError(error);
  }
}
