import { Router, Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { roleGuard } from '../../middleware/index.js';
import { sendSuccess, sendCreated } from '../../shared/response.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../shared/AppError.js';
import ReportLinkModel from './report-link.model.js';
import ProjectModel from '../projects/project.model.js';

const router = Router({ mergeParams: true });

// ─── GET /projects/:projectId/reports ──────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reports = await ReportLinkModel.find({
      agencyId: req.agencyId,
      projectId: req.params.projectId,
    }).sort({ createdAt: -1 }).lean();
    sendSuccess(res, reports);
  } catch (error) { next(error); }
});

// ─── POST /projects/:projectId/reports/generate ────
router.post('/generate', roleGuard('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { name, defaultStartDate, defaultEndDate, sectionVisibility, password } = req.body;

    const project = await ProjectModel.findOne({ _id: projectId, agencyId: req.agencyId, deletedAt: null }).lean();
    if (!project) throw AppError.notFound('Project not found');

    const token = nanoid(21);
    let passwordHash: string | undefined;
    if (password) passwordHash = await bcrypt.hash(password, 12);

    const link = await ReportLinkModel.create({
      agencyId: req.agencyId,
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
      sectionVisibility: sectionVisibility || {
        analytics: true, keywords: true, tasks: true, audits: true, competitors: true,
      },
      createdBy: req.user!.sub,
    });

    await ProjectModel.updateOne({ _id: projectId }, { 'metadata.lastReportDate': new Date() });

    sendCreated(res, {
      _id: link._id,
      token: link.token,
      publicUrl: `/report/${link.token}`,
      name: link.name,
      createdAt: link.createdAt,
    });
  } catch (error) { logger.error({ error }, 'Failed to generate report'); next(error); }
});

// ─── DELETE /projects/:projectId/reports/:reportId ──
router.delete('/:reportId', roleGuard('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await ReportLinkModel.findOneAndDelete({
      _id: req.params.reportId,
      agencyId: req.agencyId,
      projectId: req.params.projectId,
    });
    if (!result) throw AppError.notFound('Report link not found');
    sendSuccess(res, { message: 'Deleted' });
  } catch (error) { next(error); }
});

// ─── PATCH /projects/:projectId/reports/:reportId/revoke
router.patch('/:reportId/revoke', roleGuard('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await ReportLinkModel.findOneAndUpdate(
      { _id: req.params.reportId, agencyId: req.agencyId, projectId: req.params.projectId, status: 'active' },
      { status: 'revoked', revokedAt: new Date() },
      { new: true }
    ).lean();
    if (!report) throw AppError.notFound('Report not found or already revoked');
    sendSuccess(res, report);
  } catch (error) { next(error); }
});

export default router;