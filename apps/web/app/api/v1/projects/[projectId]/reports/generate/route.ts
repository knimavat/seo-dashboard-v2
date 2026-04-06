import { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireRole, requireProjectAccess } from '@/lib/server/guards';
import { sendCreated, sendError } from '@/lib/server/response';
import { AppError } from '@/lib/server/errors';
import ReportLinkModel from '@/lib/server/models/report-link.model';
import ProjectModel from '@/lib/server/models/project.model';

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    requireRole(user, 'admin');
    const { projectId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const { name, defaultStartDate, defaultEndDate, sectionVisibility, password } = await req.json();

    const project = await ProjectModel.findOne({ _id: projectId, agencyId, deletedAt: null }).lean();
    if (!project) throw AppError.notFound('Project not found');

    const token = nanoid(21);
    let passwordHash: string | undefined;
    if (password) passwordHash = await bcrypt.hash(password, 12);

    const link = await ReportLinkModel.create({
      agencyId,
      projectId,
      token,
      name: name || `${project.clientName} Report`,
      passwordHash,
      branding: {
        clientName: project.clientName,
        clientLogo: project.clientLogo || project.branding?.logoUrl,
        primaryColor: project.branding?.primaryColor || '#1B2A4A',
        accentColor: project.branding?.accentColor || '#2E75B6',
      },
      defaultStartDate: defaultStartDate ? new Date(defaultStartDate) : undefined,
      defaultEndDate: defaultEndDate ? new Date(defaultEndDate) : undefined,
      sectionVisibility: sectionVisibility || { analytics: true, keywords: true, tasks: true, audits: true, competitors: true, approvals: true, reviews: true, scope: true },
      createdBy: user.sub,
    });

    await ProjectModel.updateOne({ _id: projectId }, { 'metadata.lastReportDate': new Date() });

    return sendCreated({
      _id: link._id,
      token: link.token,
      publicUrl: `/report/${link.token}`,
      name: link.name,
      createdAt: link.createdAt,
    });
  } catch (error) {
    return sendError(error);
  }
}
