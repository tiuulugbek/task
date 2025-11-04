import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { internalAuthMiddleware } from '../middleware/internalAuth';

const prisma = new PrismaClient();
export const internalRoutes = Router();

internalRoutes.use(internalAuthMiddleware);

internalRoutes.get('/projects/:id', async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      columns: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!project) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Project not found' },
    });
  }

  res.json({ success: true, data: project });
});
