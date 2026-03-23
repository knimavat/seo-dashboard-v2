import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../../middleware/index.js';
import { createAuditSchema, updateAuditSchema } from '@seo-cmd/validation';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/response.js';
import { AppError } from '../../shared/AppError.js';
import AuditIssueModel from './audit.model.js';
import ProjectModel from '../projects/project.model.js';

const router = Router({ mergeParams: true });

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 25, severity, category, status, startDate, endDate } = req.query;

    const filter: any = { agencyId: req.agencyId, projectId, deletedAt: null };
    if (severity) filter.severity = severity;
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.identifiedAt = {};
      if (startDate) filter.identifiedAt.$gte = new Date(startDate as string);
      if (endDate) filter.identifiedAt.$lte = new Date(endDate as string);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      AuditIssueModel.find(filter).sort({ severity: 1, identifiedAt: -1 }).skip(skip).limit(Number(limit)).populate('identifiedBy', 'name').lean(),
      AuditIssueModel.countDocuments(filter),
    ]);

    sendPaginated(res, data, { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) { next(error); }
});

router.post('/', validate(createAuditSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const issue = await AuditIssueModel.create({
      ...req.body,
      agencyId: req.agencyId,
      projectId,
      identifiedBy: req.user!.sub,
      affectedUrlCount: req.body.affectedUrlCount || req.body.affectedUrls?.length || 0,
      statusHistory: [{ from: '', to: 'open', changedBy: req.user!.sub, changedAt: new Date() }],
    });
    await ProjectModel.updateOne({ _id: projectId, agencyId: req.agencyId }, { $inc: { 'metadata.openAuditIssues': 1 } });
    sendCreated(res, issue);
  } catch (error) { next(error); }
});

router.patch('/:auditId', validate(updateAuditSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await AuditIssueModel.findOne({ _id: req.params.auditId, agencyId: req.agencyId, projectId: req.params.projectId, deletedAt: null });
    if (!existing) throw AppError.notFound('Audit issue not found');

    if (req.body.status && req.body.status !== existing.status) {
      existing.statusHistory.push({ from: existing.status, to: req.body.status, changedBy: req.user!.sub as any, changedAt: new Date() });
      if (['fixed', 'verified', 'wont_fix'].includes(req.body.status) && !existing.resolvedAt) {
        existing.resolvedAt = new Date();
        await ProjectModel.updateOne({ _id: req.params.projectId, agencyId: req.agencyId }, { $inc: { 'metadata.openAuditIssues': -1 } });
      }
    }

    Object.assign(existing, req.body);
    await existing.save();
    sendSuccess(res, existing.toObject());
  } catch (error) { next(error); }
});

router.delete('/:auditId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const issue = await AuditIssueModel.findOneAndUpdate(
      { _id: req.params.auditId, agencyId: req.agencyId, projectId: req.params.projectId, deletedAt: null },
      { deletedAt: new Date() }, { new: true }
    );
    if (!issue) throw AppError.notFound('Audit issue not found');
    if (!issue.resolvedAt) {
      await ProjectModel.updateOne({ _id: req.params.projectId, agencyId: req.agencyId }, { $inc: { 'metadata.openAuditIssues': -1 } });
    }
    sendSuccess(res, { message: 'Audit issue deleted' });
  } catch (error) { next(error); }
});

export default router;
