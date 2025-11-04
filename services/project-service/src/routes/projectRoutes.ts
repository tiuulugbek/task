import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { WorkspaceRole, requirePermission } from '@acoustic/shared';
import { z } from 'zod';

const prisma = new PrismaClient();

const createProjectSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
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

export const createProject = async (req: Request, res: Response) => {
  try {
    const data = createProjectSchema.parse(req.body);
    const userId = (req as any).user.userId;

    await checkWorkspacePermission(userId, data.workspaceId, 'project:create');

    const project = await prisma.project.create({
      data: {
        workspaceId: data.workspaceId,
        name: data.name,
        description: data.description,
      },
      include: {
        columns: {
          orderBy: { order: 'asc' },
        },
      },
    });

    res.json({ success: true, data: project });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'CREATE_FAILED', message: error.message },
    });
  }
};

export const getProjects = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const workspaceId = req.query.workspaceId as string;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: { code: 'WORKSPACE_REQUIRED', message: 'workspaceId query parameter required' },
      });
    }

    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!member) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Workspace access denied' },
      });
    }

    const projects = await prisma.project.findMany({
      where: { workspaceId },
      include: {
        columns: {
          orderBy: { order: 'asc' },
        },
      },
    });

    res.json({ success: true, data: projects });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: error.message },
    });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
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

    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: project.workspaceId,
          userId,
        },
      },
    });

    if (!member) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Project access denied' },
      });
    }

    res.json({ success: true, data: project });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: error.message },
    });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
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

    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name || project.name,
        description: req.body.description !== undefined ? req.body.description : project.description,
      },
      include: {
        columns: {
          orderBy: { order: 'asc' },
        },
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

export const deleteProject = async (req: Request, res: Response) => {
  try {
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

    await checkWorkspacePermission(userId, project.workspaceId, 'project:delete');

    await prisma.project.delete({
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

export const getBoard = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
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

    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: project.workspaceId,
          userId,
        },
      },
    });

    if (!member) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Project access denied' },
      });
    }

    // Fetch tasks from task service
    const tasksResponse = await fetch(
      `${process.env.TASK_SERVICE_URL || 'http://task-service:3005'}/internal/tasks/by-project/${req.params.id}`,
      {
        headers: {
          'x-internal-secret': process.env.INTERNAL_SECRET || 'internal-secret',
        },
      }
    );

    const tasks = tasksResponse.ok ? await tasksResponse.json() : { data: [] };

    res.json({
      success: true,
      data: {
        project,
        columns: project.columns,
        tasks: tasks.data || [],
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: error.message },
    });
  }
};
