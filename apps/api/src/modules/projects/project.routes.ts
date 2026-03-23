import { Router, Request, Response, NextFunction } from 'express';
import { validate, roleGuard } from '../../middleware/index.js';
import { createProjectSchema, updateProjectSchema, addUserSchema, updateUserSchema } from '@seo-cmd/validation';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/response.js';
import { AppError } from '../../shared/AppError.js';
import ProjectModel from './project.model.js';
import UserModel from '../auth/user.model.js';

const router = Router();

// ─── GET /projects ─────────────────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 25, status, search } = req.query;
    const filter: any = { agencyId: req.agencyId, deletedAt: null };

    // Specialists only see assigned projects
    if (req.user?.role === 'specialist') {
      const user = await UserModel.findById(req.user.sub);
      filter._id = { $in: user?.assignedProjects || [] };
    }

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { projectName: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      ProjectModel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      ProjectModel.countDocuments(filter),
    ]);

    sendPaginated(res, data, { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) { next(error); }
});

// ─── POST /projects ────────────────────────────────
router.post('/', roleGuard('admin'), validate(createProjectSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await ProjectModel.create({
      ...req.body,
      agencyId: req.agencyId,
      metadata: { totalKeywords: 0, totalTasks: 0, openAuditIssues: 0 },
    });
    sendCreated(res, project);
  } catch (error) { next(error); }
});

// ─── GET /projects/:projectId ──────────────────────
router.get('/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await ProjectModel.findOne({ _id: req.params.projectId, agencyId: req.agencyId, deletedAt: null }).lean();
    if (!project) throw AppError.notFound('Project not found');
    sendSuccess(res, project);
  } catch (error) { next(error); }
});

// ─── PATCH /projects/:projectId ────────────────────
router.patch('/:projectId', validate(updateProjectSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await ProjectModel.findOneAndUpdate(
      { _id: req.params.projectId, agencyId: req.agencyId, deletedAt: null },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();
    if (!project) throw AppError.notFound('Project not found');
    sendSuccess(res, project);
  } catch (error) { next(error); }
});

// ─── DELETE /projects/:projectId ───────────────────
router.delete('/:projectId', roleGuard('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await ProjectModel.findOneAndUpdate(
      { _id: req.params.projectId, agencyId: req.agencyId, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!project) throw AppError.notFound('Project not found');
    sendSuccess(res, { message: 'Project deleted' });
  } catch (error) { next(error); }
});

// ─── User Management ───────────────────────────────

// GET /agency/users
router.get('/agency/users', roleGuard('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await UserModel.find({ agencyId: req.agencyId }).sort({ createdAt: -1 }).lean();
    sendSuccess(res, users);
  } catch (error) { next(error); }
});

// POST /agency/users
router.post('/agency/users', roleGuard('admin'), validate(addUserSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await UserModel.findOne({ agencyId: req.agencyId, email: req.body.email.toLowerCase() });
    if (existing) throw AppError.conflict('User with this email already exists');

    const user = await UserModel.create({ ...req.body, email: req.body.email.toLowerCase(), agencyId: req.agencyId });
    sendCreated(res, user);
  } catch (error) { next(error); }
});

// PATCH /agency/users/:userId
router.patch('/agency/users/:userId', roleGuard('admin'), validate(updateUserSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await UserModel.findOneAndUpdate(
      { _id: req.params.userId, agencyId: req.agencyId },
      req.body,
      { new: true, runValidators: true }
    ).lean();
    if (!user) throw AppError.notFound('User not found');
    sendSuccess(res, user);
  } catch (error) { next(error); }
});

export default router;
