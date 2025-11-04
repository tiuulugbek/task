import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { internalAuthMiddleware } from '../middleware/internalAuth';

const prisma = new PrismaClient();
export const internalRoutes = Router();

internalRoutes.use(internalAuthMiddleware);

internalRoutes.get('/tasks/:id', async (req, res) => {
  const task = await prisma.task.findUnique({
    where: { id: req.params.id },
    include: {
      assignees: true,
      watchers: true,
      taskLabels: { include: { label: true } },
    },
  });

  if (!task) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Task not found' },
    });
  }

  res.json({ success: true, data: task });
});

internalRoutes.get('/tasks/by-project/:projectId', async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { projectId: req.params.projectId },
    include: {
      assignees: true,
      watchers: true,
      taskLabels: { include: { label: true } },
    },
  });

  res.json({ success: true, data: tasks });
});

internalRoutes.get('/tasks/:id/watchers', async (req, res) => {
  const watchers = await prisma.taskWatcher.findMany({
    where: { taskId: req.params.id },
  });

  res.json({ success: true, data: watchers });
});
