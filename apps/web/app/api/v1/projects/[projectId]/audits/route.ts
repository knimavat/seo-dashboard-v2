import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireProjectAccess, validate } from '@/lib/server/guards';
import { sendCreated, sendPaginated, sendError } from '@/lib/server/response';
import { createAuditSchema } from '@seo-cmd/validation';
import AuditIssueModel from '@/lib/server/models/audit.model';
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
    const limit = Number(sp.get('limit') || 25);
    const severity = sp.get('severity');
    const category = sp.get('category');
    const status = sp.get('status');
    const startDate = sp.get('startDate');
    const endDate = sp.get('endDate');

    const filter: any = { agencyId, projectId, deletedAt: null };
    if (severity) filter.severity = severity;
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.identifiedAt = {};
      if (startDate) filter.identifiedAt.$gte = new Date(startDate);
      if (endDate) filter.identifiedAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      AuditIssueModel.find(filter).sort({ severity: 1, identifiedAt: -1 }).skip(skip).limit(limit).populate('identifiedBy', 'name').lean(),
      AuditIssueModel.countDocuments(filter),
    ]);

    return sendPaginated(data, { page, limit, total, totalPages: Math.ceil(total / limit) });
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
    const validated = validate(createAuditSchema, body);

    const issue = await AuditIssueModel.create({
      ...validated,
      agencyId,
      projectId,
      identifiedBy: user.sub,
      affectedUrlCount: validated.affectedUrlCount || validated.affectedUrls?.length || 0,
      statusHistory: [{ from: '', to: 'open', changedBy: user.sub, changedAt: new Date() }],
    });
    await ProjectModel.updateOne({ _id: projectId, agencyId }, { $inc: { 'metadata.openAuditIssues': 1 } });
    return sendCreated(issue);
  } catch (error) {
    return sendError(error);
  }
}
