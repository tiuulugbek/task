import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@acoustic/shared';

const logger = createLogger('attachment-service');

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error({ err, url: req.url, method: req.method }, 'Request error');

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
  });
};
