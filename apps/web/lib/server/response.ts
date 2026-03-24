import { NextResponse } from 'next/server';
import { AppError } from './errors';
import { logger } from './logger';

export function sendSuccess<T>(data: T, status = 200, meta?: any) {
  return NextResponse.json({ success: true, data, ...(meta && { meta }) }, { status });
}

export function sendCreated<T>(data: T) {
  return sendSuccess(data, 201);
}

export function sendPaginated<T>(data: T[], meta: { page: number; limit: number; total: number; totalPages: number }) {
  return NextResponse.json({ success: true, data, meta }, { status: 200 });
}

export function sendError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
  }
  if (error instanceof Error && error.name === 'ValidationError') {
    return NextResponse.json({ success: false, error: 'Validation error', details: error.message }, { status: 400 });
  }
  if ((error as any)?.code === 11000) {
    return NextResponse.json({ success: false, error: 'Duplicate entry' }, { status: 409 });
  }
  // Password-protected report errors
  if (error instanceof Error && (error.message === 'password_required' || error.message === 'invalid_password')) {
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
  logger.error({ err: error }, 'Unhandled error');
  return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
}
