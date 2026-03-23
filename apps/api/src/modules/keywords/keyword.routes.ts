import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../../middleware/index.js';
import { createKeywordSchema, updateKeywordSchema, bulkKeywordSchema, keywordSnapshotSchema } from '@seo-cmd/validation';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/response.js';
import { AppError } from '../../shared/AppError.js';
import KeywordModel from './keyword.model.js';
import ProjectModel from '../projects/project.model.js';

const router = Router({ mergeParams: true });

// ─── GET /projects/:projectId/keywords ─────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 50, group, priorityTier, intent, search, sortBy = 'current.rank', sortOrder = 'asc' } = req.query;

    const filter: any = { agencyId: req.agencyId, projectId, deletedAt: null };
    if (group) filter.group = group;
    if (priorityTier) filter.priorityTier = priorityTier;
    if (intent) filter.searchIntent = intent;
    if (search) filter.keyword = { $regex: search, $options: 'i' };

    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      KeywordModel.find(filter).sort(sort).skip(skip).limit(Number(limit)).lean(),
      KeywordModel.countDocuments(filter),
    ]);

    // Calculate summary stats
    const allKeywords = await KeywordModel.find({ agencyId: req.agencyId, projectId, deletedAt: null }).lean();
    const summary = {
      total: allKeywords.length,
      top3: allKeywords.filter(k => k.current?.rank > 0 && k.current.rank <= 3).length,
      top10: allKeywords.filter(k => k.current?.rank > 0 && k.current.rank <= 10).length,
      improved: allKeywords.filter(k => k.previous?.rank && k.current?.rank > 0 && k.current.rank < k.previous.rank).length,
      declined: allKeywords.filter(k => k.previous?.rank && k.current?.rank > 0 && k.current.rank > k.previous.rank).length,
      notRanking: allKeywords.filter(k => !k.current?.rank || k.current.rank === 0).length,
    };

    res.json({ success: true, data, meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }, summary });
  } catch (error) { next(error); }
});

// ─── POST /projects/:projectId/keywords ────────────
router.post('/', validate(createKeywordSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const now = new Date();
    const currentData = { ...req.body.current, recordedAt: now };

    const keyword = await KeywordModel.create({
      ...req.body,
      agencyId: req.agencyId,
      projectId,
      current: currentData,
      bestRank: currentData.rank || 0,
      snapshots: [currentData],
    });

    await ProjectModel.updateOne({ _id: projectId, agencyId: req.agencyId }, { $inc: { 'metadata.totalKeywords': 1 } });
    sendCreated(res, keyword);
  } catch (error) { next(error); }
});

// ─── POST /projects/:projectId/keywords/bulk ───────
router.post('/bulk', validate(bulkKeywordSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const now = new Date();
    const docs = req.body.keywords.map((kw: any) => ({
      ...kw,
      agencyId: req.agencyId,
      projectId,
      current: { ...kw.current, recordedAt: now },
      bestRank: kw.current.rank || 0,
      snapshots: [{ ...kw.current, recordedAt: now }],
    }));

    const result = await KeywordModel.insertMany(docs, { ordered: false }).catch(err => {
      if (err.code === 11000) {
        // Return successfully inserted docs, skip duplicates
        return err.insertedDocs || [];
      }
      throw err;
    });

    const insertedCount = Array.isArray(result) ? result.length : 0;
    await ProjectModel.updateOne({ _id: projectId, agencyId: req.agencyId }, { $inc: { 'metadata.totalKeywords': insertedCount } });

    sendCreated(res, { inserted: insertedCount, total: req.body.keywords.length });
  } catch (error) { next(error); }
});

// ─── POST /projects/:projectId/keywords/snapshot ───
// Record new ranking data for all keywords at once
router.post('/snapshot', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { snapshots } = req.body; // Array of { keywordId, ...snapshotData }
    const now = new Date();
    let updated = 0;

    for (const snap of snapshots) {
      const keyword = await KeywordModel.findOne({ _id: snap.keywordId, agencyId: req.agencyId, projectId, deletedAt: null });
      if (!keyword) continue;

      const snapshotData = { rank: snap.rank, searchVolume: snap.searchVolume, difficulty: snap.difficulty, cpc: snap.cpc, serpFeatures: snap.serpFeatures || [], ownsSerpFeature: snap.ownsSerpFeature || false, trafficEstimate: snap.trafficEstimate || 0, recordedAt: now };

      keyword.previous = { rank: keyword.current?.rank || 0, recordedAt: keyword.current?.recordedAt };
      keyword.current = snapshotData;
      if (snap.rank > 0 && (keyword.bestRank === 0 || snap.rank < keyword.bestRank)) {
        keyword.bestRank = snap.rank;
      }
      keyword.snapshots.push(snapshotData);

      // Keep only last 24 snapshots embedded
      if (keyword.snapshots.length > 24) {
        keyword.snapshots = keyword.snapshots.slice(-24);
      }

      await keyword.save();
      updated++;
    }

    sendSuccess(res, { updated, total: snapshots.length });
  } catch (error) { next(error); }
});

// ─── PATCH /projects/:projectId/keywords/:keywordId
router.patch('/:keywordId', validate(updateKeywordSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const keyword = await KeywordModel.findOneAndUpdate(
      { _id: req.params.keywordId, agencyId: req.agencyId, projectId: req.params.projectId, deletedAt: null },
      { ...req.body, updatedAt: new Date() }, { new: true, runValidators: true }
    ).lean();
    if (!keyword) throw AppError.notFound('Keyword not found');
    sendSuccess(res, keyword);
  } catch (error) { next(error); }
});

// ─── DELETE /projects/:projectId/keywords/:keywordId
router.delete('/:keywordId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const keyword = await KeywordModel.findOneAndUpdate(
      { _id: req.params.keywordId, agencyId: req.agencyId, projectId: req.params.projectId, deletedAt: null },
      { deletedAt: new Date() }, { new: true }
    );
    if (!keyword) throw AppError.notFound('Keyword not found');
    await ProjectModel.updateOne({ _id: req.params.projectId, agencyId: req.agencyId }, { $inc: { 'metadata.totalKeywords': -1 } });
    sendSuccess(res, { message: 'Keyword deleted' });
  } catch (error) { next(error); }
});

export default router;
