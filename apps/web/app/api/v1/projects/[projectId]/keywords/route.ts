import { NextRequest, NextResponse } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireProjectAccess, validate } from '@/lib/server/guards';
import { sendCreated, sendError } from '@/lib/server/response';
import { createKeywordSchema } from '@seo-cmd/validation';
import KeywordModel from '@/lib/server/models/keyword.model';
import ProjectModel from '@/lib/server/models/project.model';

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const sp = req.nextUrl.searchParams;
    const page = Number(sp.get('page') || 1);
    const limit = Number(sp.get('limit') || 50);
    const group = sp.get('group');
    const priorityTier = sp.get('priorityTier');
    const intent = sp.get('intent');
    const search = sp.get('search');
    const sortBy = sp.get('sortBy') || 'current.rank';
    const sortOrder = sp.get('sortOrder') || 'asc';

    const filter: any = { agencyId, projectId, deletedAt: null };
    if (group) filter.group = group;
    if (priorityTier) filter.priorityTier = priorityTier;
    if (intent) filter.searchIntent = intent;
    if (search) filter.keyword = { $regex: search, $options: 'i' };

    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      KeywordModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      KeywordModel.countDocuments(filter),
    ]);

    const allKeywords = await KeywordModel.find({ agencyId, projectId, deletedAt: null }).lean();
    const summary = {
      total: allKeywords.length,
      top3: allKeywords.filter(k => k.current?.rank > 0 && k.current.rank <= 3).length,
      top10: allKeywords.filter(k => k.current?.rank > 0 && k.current.rank <= 10).length,
      improved: allKeywords.filter(k => k.previous?.rank && k.current?.rank > 0 && k.current.rank < k.previous.rank).length,
      declined: allKeywords.filter(k => k.previous?.rank && k.current?.rank > 0 && k.current.rank > k.previous.rank).length,
      notRanking: allKeywords.filter(k => !k.current?.rank || k.current.rank === 0).length,
    };

    return NextResponse.json({ success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) }, summary });
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

    const body = await req.json();
    const validated = validate(createKeywordSchema, body);
    const now = new Date();
    const currentData = { ...validated.current, recordedAt: now };

    const keyword = await KeywordModel.create({
      ...validated,
      agencyId,
      projectId,
      current: currentData,
      bestRank: currentData.rank || 0,
      snapshots: [currentData],
    });

    await ProjectModel.updateOne({ _id: projectId, agencyId }, { $inc: { 'metadata.totalKeywords': 1 } });
    return sendCreated(keyword);
  } catch (error) {
    return sendError(error);
  }
}
