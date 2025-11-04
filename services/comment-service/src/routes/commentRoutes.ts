import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '@acoustic/shared';
import { z } from 'zod';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const prisma = new PrismaClient();
const logger = createLogger('comment-service');
const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

const createCommentSchema = z.object({
  taskId: z.string().uuid(),
  content: z.string().min(1).max(10000),
});

async function checkTaskPermission(userId: string, taskId: string) {
  const taskResponse = await fetch(
    `${process.env.TASK_SERVICE_URL || 'http://task-service:3005'}/internal/tasks/${taskId}`,
    {
      headers: {
        'x-internal-secret': process.env.INTERNAL_SECRET || 'internal-secret',
      },
    }
  );

  if (!taskResponse.ok) {
    throw new Error('Task not found');
  }

  const task = await taskResponse.json();
  
  const projectResponse = await fetch(
    `${process.env.PROJECT_SERVICE_URL || 'http://project-service:3004'}/internal/projects/${task.data.projectId}`,
    {
      headers: {
        'x-internal-secret': process.env.INTERNAL_SECRET || 'internal-secret',
      },
    }
  );

  if (!projectResponse.ok) {
    throw new Error('Project not found');
  }

  const project = await projectResponse.json();

  const workspaceResponse = await fetch(
    `${process.env.WORKSPACE_SERVICE_URL || 'http://workspace-service:3003'}/internal/workspaces/${project.data.workspaceId}/members/${userId}`,
    {
      headers: {
        'x-internal-secret': process.env.INTERNAL_SECRET || 'internal-secret',
      },
    }
  );

  if (!workspaceResponse.ok) {
    throw new Error('Workspace access denied');
  }

  return true;
}

export const createComment = async (req: Request, res: Response) => {
  try {
    const data = createCommentSchema.parse(req.body);
    const userId = (req as any).user.userId;

    await checkTaskPermission(userId, data.taskId);

    const sanitizedContent = purify.sanitize(data.content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href'],
    });

    const comment = await prisma.comment.create({
      data: {
        taskId: data.taskId,
        userId,
        content: sanitizedContent,
      },
    });

    await fetch(`${process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672'}/api/exchanges//amq.topic/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routing_key: 'task.comment_created',
        payload: { taskId: data.taskId, commentId: comment.id, userId },
      }),
    }).catch(() => {});

    return res.json({ success: true, data: comment });
  } catch (error: any) {
    logger.error({ error }, 'Failed to create comment');
    return res.status(400).json({
      success: false,
      error: { code: 'CREATE_FAILED', message: error.message },
    });
  }
};

export const getComments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { taskId } = req.query;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: { code: 'TASK_REQUIRED', message: 'taskId query parameter required' },
      });
    }

    await checkTaskPermission(userId, taskId as string);

    const comments = await prisma.comment.findMany({
      where: { taskId: taskId as string },
      orderBy: { createdAt: 'asc' },
    });

    return res.json({ success: true, data: comments });
  } catch (error: any) {
    logger.error({ error }, 'Failed to fetch comments');
    return res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: error.message },
    });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const comment = await prisma.comment.findUnique({
      where: { id: req.params.id },
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Comment not found' },
      });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot delete other users comments' },
      });
    }

    await prisma.comment.delete({
      where: { id: req.params.id },
    });

    return res.json({ success: true });
  } catch (error: any) {
    logger.error({ error }, 'Failed to delete comment');
    return res.status(400).json({
      success: false,
      error: { code: 'DELETE_FAILED', message: error.message },
    });
  }
};
