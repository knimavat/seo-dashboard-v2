import { NextRequest } from 'next/server';
import { ensureDB } from '@/lib/server/database';
import { authenticate } from '@/lib/server/auth';
import { requireTenant, requireProjectAccess } from '@/lib/server/guards';
import { sendSuccess, sendError } from '@/lib/server/response';
import { AppError } from '@/lib/server/errors';
import ScopeModel from '@/lib/server/models/scope.model';

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string; month: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId, month } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const scope = await ScopeModel.findOne({ agencyId, projectId, deletedAt: null }).lean();
    if (!scope) throw AppError.notFound('No scope defined for this project');

    const entry = scope.months.find(m => m.month === month);
    if (!entry) throw AppError.notFound(`No scope data for month ${month}`);

    return sendSuccess(entry);
  } catch (error) {
    return sendError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ projectId: string; month: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId, month } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const { newMonth } = await req.json();
    if (!newMonth || !/^\d{4}-\d{2}$/.test(newMonth)) {
      throw AppError.badRequest('Invalid month format. Use YYYY-MM.');
    }

    const scope = await ScopeModel.findOne({ agencyId, projectId, deletedAt: null });
    if (!scope) throw AppError.notFound('Scope not found');

    const idx = scope.months.findIndex(m => m.month === month);
    if (idx < 0) throw AppError.notFound(`No scope data for month ${month}`);

    if (scope.months.some(m => m.month === newMonth)) {
      throw AppError.conflict(`Scope for ${newMonth} already exists.`);
    }

    scope.months[idx].month = newMonth;
    scope.months.sort((a, b) => a.month.localeCompare(b.month));
    scope.markModified('months');
    await scope.save();

    return sendSuccess({ message: `Month renamed to ${newMonth}` });
  } catch (error) {
    return sendError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ projectId: string; month: string }> }) {
  try {
    await ensureDB();
    const user = await authenticate(req);
    const agencyId = requireTenant(user);
    const { projectId, month } = await params;
    await requireProjectAccess(user, agencyId, projectId);

    const result = await ScopeModel.findOneAndUpdate(
      { agencyId, projectId, deletedAt: null },
      { $pull: { months: { month } } },
      { new: true }
    );

    if (!result) throw AppError.notFound('Scope not found');

    return sendSuccess({ message: `Month ${month} removed` });
  } catch (error) {
    return sendError(error);
  }
}
