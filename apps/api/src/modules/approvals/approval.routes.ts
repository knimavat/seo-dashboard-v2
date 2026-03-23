import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../../middleware/index.js';
import { createApprovalSchema, approvalDecisionSchema } from '@seo-cmd/validation';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/response.js';
import { AppError } from '../../shared/AppError.js';
import ApprovalModel from './approval.model.js';
import TaskModel from '../tasks/task.model.js';

const router = Router({ mergeParams: true });

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 25, status, type } = req.query;
    const filter: any = { agencyId: req.agencyId, projectId };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      ApprovalModel.find(filter).sort({ submittedAt: -1 }).skip(skip).limit(Number(limit))
        .populate('submittedBy', 'name email').populate('assignedApprovers', 'name email').populate('taskId', 'title').lean(),
      ApprovalModel.countDocuments(filter),
    ]);
    sendPaginated(res, data, { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) { next(error); }
});

router.post('/', validate(createApprovalSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const task = await TaskModel.findOne({ _id: req.body.taskId, agencyId: req.agencyId, projectId, deletedAt: null });
    if (!task) throw AppError.notFound('Task not found');

    const approval = await ApprovalModel.create({
      ...req.body,
      agencyId: req.agencyId,
      projectId,
      submittedBy: req.user!.sub,
      submittedAt: new Date(),
    });

    // Update task status to in_review
    if (task.status === 'in_progress') {
      task.status = 'in_review';
      task.statusHistory.push({ from: 'in_progress', to: 'in_review', changedBy: req.user!.sub as any, changedAt: new Date() });
      await task.save();
    }

    sendCreated(res, approval);
  } catch (error) { next(error); }
});

// PATCH /approvals/:approvalId/decide
router.patch('/:approvalId/decide', validate(approvalDecisionSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const approval = await ApprovalModel.findOne({ _id: req.params.approvalId, agencyId: req.agencyId, projectId: req.params.projectId });
    if (!approval) throw AppError.notFound('Approval not found');
    if (approval.status !== 'pending') throw AppError.badRequest('Approval already decided');

    // Check if user is an assigned approver
    const isApprover = approval.assignedApprovers.some(a => a.toString() === req.user!.sub);
    if (!isApprover && req.user!.role !== 'admin') throw AppError.forbidden('Not an assigned approver');

    approval.decisions.push({
      approverId: req.user!.sub as any,
      decision: req.body.decision,
      comments: req.body.comments,
      decidedAt: new Date(),
    });

    approval.status = req.body.decision;
    if (req.body.decision === 'revision_requested') {
      approval.revisionCount += 1;
    }
    await approval.save();

    // Update task status based on decision
    if (req.body.decision === 'approved') {
      await TaskModel.findOneAndUpdate(
        { _id: approval.taskId, agencyId: req.agencyId },
        { status: 'approved', $push: { statusHistory: { from: 'in_review', to: 'approved', changedBy: req.user!.sub, changedAt: new Date() } } }
      );
    }

    sendSuccess(res, approval.toObject());
  } catch (error) { next(error); }
});

export default router;
