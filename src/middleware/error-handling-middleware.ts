import { NextFunction, Request, Response } from 'express';
import ApiError from '../error/api-error';

export async function errorHandlingMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  // await emailLoggerService.logError(err.message);

  if (err instanceof ApiError) {
    return res.status(err.status).json({ ok: false, message: err.message });
  }

  return res.status(500).json({ ok: false, message: 'Internal Server Error' });
}
