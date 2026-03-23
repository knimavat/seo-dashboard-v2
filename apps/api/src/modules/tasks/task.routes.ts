import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../../middleware/index.js';
import { createTaskSchema, updateTaskSchema, paginationSchema } from '@seo-cmd/validation';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/response.js';
import { AppError } from '../../shared/AppError.js';
import TaskModel from './task.model.js';
import ProjectModel from '../projects/project.model.js';

const router = Router({ mergeParams: true }); // Access :projectId from parent

// ─── GET /projects/:projectId/tasks ────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 25, status, category, assignedTo, priority, startDate, endDate, search } = req.query;

    const filter: any = { agencyId: req.agencyId, projectId, deletedAt: null };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (priority) filter.priority = priority;
    if (search) filter.title = { $regex: search, $options: 'i' };

    if (startDate || endDate) {
      filter.$or = [];
      const dateMatch: any = {};
      if (startDate) dateMatch.$gte = new Date(startDate as string);
      if (endDate) dateMatch.$lte = new Date(endDate as string);
      filter.$or.push({ createdAt: dateMatch }, { updatedAt: dateMatch }, { completedAt: dateMatch });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      TaskModel.find(filter).sort({ priority: 1, dueDate: 1 }).skip(skip).limit(Number(limit)).populate('assignedTo', 'name email avatarUrl').lean(),
      TaskModel.countDocuments(filter),
    ]);

    sendPaginated(res, data, { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) { next(error); }
});

// ─── POST /projects/:projectId/tasks ───────────────
router.post('/', validate(createTaskSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const task = await TaskModel.create({
      ...req.body,
      agencyId: req.agencyId,
      projectId,
      statusHistory: [{ from: '', to: 'not_started', changedBy: req.user!.sub, changedAt: new Date() }],
    });

    // Update project metadata
    await ProjectModel.updateOne({ _id: projectId, agencyId: req.agencyId }, { $inc: { 'metadata.totalTasks': 1 } });

    sendCreated(res, task);
  } catch (error) { next(error); }
});

// ─── GET /projects/:projectId/tasks/:taskId ────────
router.get('/:taskId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await TaskModel.findOne({
      _id: req.params.taskId, agencyId: req.agencyId, projectId: req.params.projectId, deletedAt: null,
    }).populate('assignedTo', 'name email avatarUrl').lean();
    if (!task) throw AppError.notFound('Task not found');
    sendSuccess(res, task);
  } catch (error) { next(error); }
});

// ─── PATCH /projects/:projectId/tasks/:taskId ──────
router.patch('/:taskId', validate(updateTaskSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId, projectId } = req.params;
    const updates = { ...req.body };
    const existing = await TaskModel.findOne({ _id: taskId, agencyId: req.agencyId, projectId, deletedAt: null });
    if (!existing) throw AppError.notFound('Task not found');

    // Handle status change
    if (updates.status && updates.status !== existing.status) {
      // Require reason for blocked/cancelled
      if (['blocked', 'cancelled'].includes(updates.status) && !updates.statusReason) {
        throw AppError.badRequest('Reason required when setting status to blocked or cancelled');
      }

      existing.statusHistory.push({
        from: existing.status,
        to: updates.status,
        changedBy: req.user!.sub as any,
        changedAt: new Date(),
        reason: updates.statusReason,
      });

      // Auto-set completedAt when published
      if (updates.status === 'published' && !existing.completedAt) {
        updates.completedAt = new Date();
      }
    }
    delete updates.statusReason;

    Object.assign(existing, updates);
    existing.statusHistory = existing.statusHistory; // Ensure it saves
    await existing.save();

    sendSuccess(res, existing.toObject());
  } catch (error) { next(error); }
});

// ─── DELETE /projects/:projectId/tasks/:taskId ─────
router.delete('/:taskId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await TaskModel.findOneAndUpdate(
      { _id: req.params.taskId, agencyId: req.agencyId, projectId: req.params.projectId, deletedAt: null },
      { deletedAt: new Date() }, { new: true }
    );
    if (!task) throw AppError.notFound('Task not found');
    await ProjectModel.updateOne({ _id: req.params.projectId, agencyId: req.agencyId }, { $inc: { 'metadata.totalTasks': -1 } });
    sendSuccess(res, { message: 'Task deleted' });
  } catch (error) { next(error); }
});

export default router;
