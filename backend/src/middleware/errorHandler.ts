import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = 'HttpError';
  }
}

// Structured JSON error responses. Any 5xx is captured by Sentry with the
// request context already attached by the auth middleware (Sentry.setUser).
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err instanceof HttpError ? err.status : 500;
  const message =
    err instanceof Error ? err.message : 'Internal Server Error';
  const code =
    err instanceof HttpError && err.code ? err.code : undefined;

  if (status >= 500) {
    Sentry.captureException(err, {
      extra: { path: req.path, method: req.method },
    });
    // eslint-disable-next-line no-console
    console.error(`[${req.method} ${req.path}]`, err);
  }

  res.status(status).json({
    error: {
      message,
      code,
      status,
    },
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { message: 'Not Found', status: 404 },
  });
}
