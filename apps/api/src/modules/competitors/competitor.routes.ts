import { Router, Request, Response, NextFunction } from 'express';
import { sendSuccess, sendCreated } from '../../shared/response.js';
import { AppError } from '../../shared/AppError.js';
import CompetitorModel from './competitor.model.js';

const router = Router({ mergeParams: true });

// GET all competitors for project
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await CompetitorModel.find({
      agencyId: req.agencyId, projectId: req.params.projectId, deletedAt: null,
    }).sort({ name: 1 }).lean();
    sendSuccess(res, data);
  } catch (error) { next(error); }
});

// POST — add competitor or add monthly data to existing competitor
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { name, domain, backlinks, organicTraffic, totalKeywords, domainRating, month, notes } = req.body;

    if (!name || !domain) throw AppError.badRequest('Name and domain are required');

    const cleanDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '').trim();
    const entryMonth = month || new Date().toISOString().slice(0, 7);

    const snapshot = {
      month: entryMonth,
      backlinks: Number(backlinks) || 0,
      organicTraffic: Number(organicTraffic) || 0,
      totalKeywords: Number(totalKeywords) || 0,
      domainRating: Number(domainRating) || 0,
      recordedAt: new Date(),
    };

    // Check if this competitor (by domain) already exists for this project
    const existing = await CompetitorModel.findOne({
      agencyId: req.agencyId, projectId, domain: cleanDomain, deletedAt: null,
    });

    if (existing) {
      // Check if this exact month already has data
      const monthExists = existing.snapshots.some((s: any) => s.month === entryMonth);
      if (monthExists) {
        throw AppError.conflict(
          `"${existing.name}" already has data for ${entryMonth}. Use "Update Data" to modify it.`
        );
      }

      // Add new month's data to existing competitor
      existing.snapshots.push(snapshot);
      if (notes !== undefined) existing.notes = notes;
      await existing.save();

      return sendSuccess(res, existing.toObject());
    }

    // New competitor — create with first snapshot
    const competitor = await CompetitorModel.create({
      agencyId: req.agencyId,
      projectId,
      name,
      domain: cleanDomain,
      snapshots: [snapshot],
      notes,
    });

    sendCreated(res, competitor);
  } catch (error) { next(error); }
});

// PATCH — update competitor name/domain/notes
router.patch('/:competitorId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comp = await CompetitorModel.findOne({
      _id: req.params.competitorId, agencyId: req.agencyId,
      projectId: req.params.projectId, deletedAt: null,
    });
    if (!comp) throw AppError.notFound('Competitor not found');

    if (req.body.name) comp.name = req.body.name;
    if (req.body.domain) comp.domain = req.body.domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (req.body.notes !== undefined) comp.notes = req.body.notes;
    await comp.save();

    sendSuccess(res, comp.toObject());
  } catch (error) { next(error); }
});

// POST /:competitorId/snapshot — add or update a single month
router.post('/:competitorId/snapshot', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comp = await CompetitorModel.findOne({
      _id: req.params.competitorId, agencyId: req.agencyId,
      projectId: req.params.projectId, deletedAt: null,
    });
    if (!comp) throw AppError.notFound('Competitor not found');

    const { month, backlinks, organicTraffic, totalKeywords, domainRating } = req.body;
    const entryMonth = month || new Date().toISOString().slice(0, 7);

    const snap = {
      month: entryMonth,
      backlinks: Number(backlinks) || 0,
      organicTraffic: Number(organicTraffic) || 0,
      totalKeywords: Number(totalKeywords) || 0,
      domainRating: Number(domainRating) || 0,
      recordedAt: new Date(),
    };

    // Upsert: update existing month or add new
    const idx = comp.snapshots.findIndex((s: any) => s.month === entryMonth);
    if (idx >= 0) {
      comp.snapshots[idx] = snap;
    } else {
      comp.snapshots.push(snap);
    }

    await comp.save();
    sendSuccess(res, comp.toObject());
  } catch (error) { next(error); }
});

// POST /bulk-snapshot — update all competitors for a month
router.post('/bulk-snapshot', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { month, entries } = req.body;
    if (!month || !entries?.length) throw AppError.badRequest('Month and entries required');

    let updated = 0;
    for (const entry of entries) {
      const comp = await CompetitorModel.findOne({
        _id: entry.competitorId, agencyId: req.agencyId,
        projectId: req.params.projectId, deletedAt: null,
      });
      if (!comp) continue;

      const snap = {
        month,
        backlinks: Number(entry.backlinks) || 0,
        organicTraffic: Number(entry.organicTraffic) || 0,
        totalKeywords: Number(entry.totalKeywords) || 0,
        domainRating: Number(entry.domainRating) || 0,
        recordedAt: new Date(),
      };

      const idx = comp.snapshots.findIndex((s: any) => s.month === month);
      if (idx >= 0) comp.snapshots[idx] = snap;
      else comp.snapshots.push(snap);
      await comp.save();
      updated++;
    }

    sendSuccess(res, { updated, total: entries.length });
  } catch (error) { next(error); }
});

// DELETE
router.delete('/:competitorId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await CompetitorModel.findOneAndUpdate(
      { _id: req.params.competitorId, agencyId: req.agencyId, projectId: req.params.projectId, deletedAt: null },
      { deletedAt: new Date() }, { new: true }
    );
    if (!result) throw AppError.notFound('Competitor not found');
    sendSuccess(res, { message: 'Deleted' });
  } catch (error) { next(error); }
});

export default router;