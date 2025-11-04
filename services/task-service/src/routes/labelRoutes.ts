import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { WorkspaceRole, requirePermission } from '@acoustic/shared';
import { z } from 'zod';

const prisma = new PrismaClient();

const createLabelSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

async function checkWorkspacePermission(userId: string, workspaceId: string, permission: string) {
  const response = await fetch(
    `${process.env.WORKSPACE_SERVICE_URL || 'http://workspace-service:3003'}/internal/workspaces/${workspaceId}/members/${userId}`,
    {
      headers: {
        'x-internal-secret': process.env.INTERNAL_SECRET || 'internal-secret',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Workspace access denied');
  }

  const member = await response.json();
  requirePermission(member.data.role, permission);
  return member.data.role as WorkspaceRole;
}

export const createLabel = async (req: Request, res: Response) => {
  try {
    const data = createLabelSchema.parse(req.body);
    const userId = (req as any).user.userId;

    await checkWorkspacePermission(userId, data.workspaceId, 'task:update');

    const label = await prisma.taskLabel.create({
      data: {
        workspaceId: data.workspaceId,
        name: data.name,
        color: data.color || '#F07E22',
      },
    });

    res.json({ success: true, data: label });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'CREATE_FAILED', message: error.message },
    });
  }
};

export const getLabels = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { workspaceId } = req.query;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: { code: 'WORKSPACE_REQUIRED', message: 'workspaceId query parameter required' },
      });
    }

    await checkWorkspacePermission(userId, workspaceId as string, 'task:read');

    const labels = await prisma.taskLabel.findMany({
      where: { workspaceId: workspaceId as string },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: labels });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: error.message },
    });
  }
};

export const updateLabel = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const label = await prisma.taskLabel.findUnique({
      where: { id: req.params.id },
    });

    if (!label) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Label not found' },
      });
    }

    await checkWorkspacePermission(userId, label.workspaceId, 'task:update');

    const updated = await prisma.taskLabel.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name || label.name,
        color: req.body.color || label.color,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: error.message },
    });
  }
};

export const deleteLabel = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const label = await prisma.taskLabel.findUnique({
      where: { id: req.params.id },
    });

    if (!label) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Label not found' },
      });
    }

    await checkWorkspacePermission(userId, label.workspaceId, 'task:update');

    await prisma.taskLabel.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'DELETE_FAILED', message: error.message },
    });
  }
};
