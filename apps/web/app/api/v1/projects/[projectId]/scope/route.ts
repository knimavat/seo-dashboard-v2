import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireProjectAccess } from '@/lib/server/guards';
import { sendSuccess, sendError } from '@/lib/server/response';
import ScopeModel from '@/lib/server/models/scope.model';

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    let scope = await ScopeModel.findOne({ agencyId, projectId, deletedAt: null }).lean();
    if (!scope) {
      return sendSuccess({ months: [] });
    }
    // Sort months chronologically
    scope.months.sort((a, b) => a.month.localeCompare(b.month));
    return sendSuccess(scope);
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
    const { month, scopeItems, hoursAllocation, extraTime } = body;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return sendError({ statusCode: 400, message: 'Invalid month format. Use YYYY-MM.' });
    }

    // Recalculate summary server-side
    const seoTeamHours = (hoursAllocation || [])
      .filter((h: any) => h.team === 'seo')
      .reduce((sum: number, h: any) => sum + (Number(h.hours) || 0), 0);
    const contentTeamHours = (hoursAllocation || [])
      .filter((h: any) => h.team === 'content')
      .reduce((sum: number, h: any) => sum + (Number(h.hours) || 0), 0);
    const extra = Number(extraTime) || 0;
    const summary = {
      seoTeamHours,
      contentTeamHours,
      extraTime: extra,
      totalHours: seoTeamHours + contentTeamHours + extra,
    };

    const monthEntry = { month, scopeItems: scopeItems || [], hoursAllocation: hoursAllocation || [], summary };

    // Upsert: find existing doc, update or create
    let scope = await ScopeModel.findOne({ agencyId, projectId, deletedAt: null });

    if (!scope) {
      scope = await ScopeModel.create({ agencyId, projectId, months: [monthEntry] });
    } else {
      const idx = scope.months.findIndex(m => m.month === month);
      if (idx >= 0) {
        scope.months[idx] = monthEntry;
      } else {
        scope.months.push(monthEntry);
      }
      scope.months.sort((a, b) => a.month.localeCompare(b.month));
      scope.markModified('months');
      await scope.save();
    }

    return sendSuccess(scope.toObject());
  } catch (error) {
    return sendError(error);
  }
}
