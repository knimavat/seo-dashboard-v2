import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../../middleware/index.js';
import { createReviewSchema } from '@seo-cmd/validation';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/response.js';
import { AppError } from '../../shared/AppError.js';
import ReviewModel from './review.model.js';

const router = Router({ mergeParams: true });

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 25, type, rating, taskId } = req.query;
    const filter: any = { agencyId: req.agencyId, projectId };
    if (type) filter.type = type;
    if (rating) filter.rating = rating;
    if (taskId) filter.taskId = taskId;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      ReviewModel.find(filter).sort({ reviewedAt: -1 }).skip(skip).limit(Number(limit))
        .populate('reviewerId', 'name email').populate('taskId', 'title').lean(),
      ReviewModel.countDocuments(filter),
    ]);
    sendPaginated(res, data, { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) { next(error); }
});

router.post('/', validate(createReviewSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const review = await ReviewModel.create({
      ...req.body,
      agencyId: req.agencyId,
      projectId,
      reviewerId: req.user!.sub,
      reviewedAt: new Date(),
    });
    sendCreated(res, review);
  } catch (error) { next(error); }
});

router.patch('/:reviewId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { resolutionStatus } = req.body;
    if (!resolutionStatus) throw AppError.badRequest('resolutionStatus required');

    const review = await ReviewModel.findOneAndUpdate(
      { _id: req.params.reviewId, agencyId: req.agencyId, projectId: req.params.projectId },
      { resolutionStatus, updatedAt: new Date() },
      { new: true }
    ).lean();
    if (!review) throw AppError.notFound('Review not found');
    sendSuccess(res, review);
  } catch (error) { next(error); }
});

export default router;
