import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { ensureDB } from '@/lib/server/database';
import { checkRateLimit } from '@/lib/server/guards';
import { sendError } from '@/lib/server/response';
import { AppError } from '@/lib/server/errors';
import ReportLinkModel from '@/lib/server/models/report-link.model';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    await ensureDB();
    await checkRateLimit(req, 30, 60);
    const { token } = await params;

    const link = await ReportLinkModel.findOne({ token, status: 'active' });
    if (!link) throw AppError.notFound('Report not available');

    if (link.passwordHash) {
      const pw = req.headers.get('x-report-password') || req.nextUrl.searchParams.get('password');
      if (!pw) throw Object.assign(new Error('password_required'), { statusCode: 401 });
      if (!(await bcrypt.compare(pw, link.passwordHash))) throw Object.assign(new Error('invalid_password'), { statusCode: 401 });
    }

    await ReportLinkModel.updateOne({ _id: link._id }, { $inc: { viewCount: 1 }, lastViewedAt: new Date() });

    return NextResponse.json({
      success: true,
      data: { token: link.token, name: link.name, branding: link.branding, sectionVisibility: link.sectionVisibility, projectId: link.projectId },
    });
  } catch (error) {
    return sendError(error);
  }
}
