import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, meta?: any) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta && { meta }),
  });
}

export function sendCreated<T>(res: Response, data: T) {
  return sendSuccess(res, data, 201);
}

export function sendPaginated<T>(res: Response, data: T[], meta: { page: number; limit: number; total: number; totalPages: number }) {
  return res.status(200).json({ success: true, data, meta });
}

export function sendNoContent(res: Response) {
  return res.status(204).end();
}
