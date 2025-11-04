import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { internalAuthMiddleware } from '../middleware/internalAuth';

const prisma = new PrismaClient();
export const internalRoutes = Router();

internalRoutes.use(internalAuthMiddleware);

internalRoutes.get('/workspaces/:id/members/:userId', async (req, res) => {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: req.params.id,
        userId: req.params.userId,
      },
    },
  });

  if (!member) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Member not found' },
    });
  }

  res.json({ success: true, data: member });
});

internalRoutes.get('/workspaces/by-slug/:slug', async (req, res) => {
  const workspace = await prisma.workspace.findUnique({
    where: { slug: req.params.slug },
  });

  if (!workspace) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Workspace not found' },
    });
  }

  res.json({ success: true, data: workspace });
});
