import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { WorkspaceRole, requirePermission } from '@acoustic/shared';
import { z } from 'zod';

const prisma = new PrismaClient();

const createColumnSchema = z.object({
  name: z.string().min(1),
  order: z.number().int().optional(),
});

async function checkWorkspacePermission(userId: string, workspaceId: string, permission: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  });

  if (!member) {
    throw new Error('Workspace not found or access denied');
  }

  requirePermission(member.role as WorkspaceRole, permission);
  return member.role as WorkspaceRole;
}

export const createColumn = async (req: Request, res: Response) => {
  try {
    const data = createColumnSchema.parse(req.body);
    const userId = (req as any).user.userId;

    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    await checkWorkspacePermission(userId, project.workspaceId, 'project:update');

    const maxOrder = await prisma.boardColumn.findFirst({
      where: { projectId: req.params.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const column = await prisma.boardColumn.create({
      data: {
        projectId: req.params.id,
        name: data.name,
        order: data.order ?? ((maxOrder?.order ?? -1) + 1),
      },
    });

    res.json({ success: true, data: column });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'CREATE_FAILED', message: error.message },
    });
  }
};

export const updateColumn = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const column = await prisma.boardColumn.findUnique({
      where: { id: req.params.columnId },
      include: { project: true },
    });

    if (!column || column.projectId !== req.params.id) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Column not found' },
      });
    }

    await checkWorkspacePermission(userId, column.project.workspaceId, 'project:update');

    const updated = await prisma.boardColumn.update({
      where: { id: req.params.columnId },
      data: {
        name: req.body.name || column.name,
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

export const deleteColumn = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const column = await prisma.boardColumn.findUnique({
      where: { id: req.params.columnId },
      include: { project: true },
    });

    if (!column || column.projectId !== req.params.id) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Column not found' },
      });
    }

    await checkWorkspacePermission(userId, column.project.workspaceId, 'project:update');

    await prisma.boardColumn.delete({
      where: { id: req.params.columnId },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'DELETE_FAILED', message: error.message },
    });
  }
};

export const reorderColumns = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { columnIds } = req.body;

    if (!Array.isArray(columnIds)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'columnIds must be an array' },
      });
    }

    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    await checkWorkspacePermission(userId, project.workspaceId, 'project:update');

    await prisma.$transaction(
      columnIds.map((columnId: string, index: number) =>
        prisma.boardColumn.update({
          where: { id: columnId },
          data: { order: index },
        })
      )
    );

    const columns = await prisma.boardColumn.findMany({
      where: { projectId: req.params.id },
      orderBy: { order: 'asc' },
    });

    res.json({ success: true, data: columns });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'REORDER_FAILED', message: error.message },
    });
  }
};
