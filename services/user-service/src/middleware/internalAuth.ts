import { Request, Response, NextFunction } from 'express';

export const internalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const secret = req.headers['x-internal-secret'];
  const expectedSecret = process.env.INTERNAL_SECRET || 'internal-secret';

  if (secret !== expectedSecret) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Internal endpoint' },
    });
  }

  next();
};
