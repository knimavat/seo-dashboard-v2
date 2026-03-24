import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getRedis } from '@/lib/server/redis';
import { sendError } from '@/lib/server/response';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (token) {
      try {
        const redis = getRedis();
        if (redis) await redis.set(`blacklist:${token}`, '1', 'EX', 86400);
      } catch {}
    }

    const response = NextResponse.json({ success: true, data: { message: 'Logged out' } });
    response.cookies.delete('token');
    response.cookies.delete('refreshToken');
    return response;
  } catch (error) {
    return sendError(error);
  }
}
