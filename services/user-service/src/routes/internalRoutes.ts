import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { internalAuthMiddleware } from '../middleware/internalAuth';

const prisma = new PrismaClient();
export const internalRoutes = Router();

internalRoutes.use(internalAuthMiddleware);

internalRoutes.get('/users/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'User not found' },
    });
  }

  res.json({
    success: true,
    data: {
      ...user,
      tgId: user.tgId.toString(),
    },
  });
});
