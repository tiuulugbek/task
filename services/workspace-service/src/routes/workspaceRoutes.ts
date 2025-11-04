import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { WorkspaceRole, requirePermission } from '@acoustic/shared';
import { z } from 'zod';

const prisma = new PrismaClient();

const createWorkspaceSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
});

export const createWorkspace = async (req: Request, res: Response) => {
  try {
    const data = createWorkspaceSchema.parse(req.body);
    const userId = (req as any).user.userId;

    const workspace = await prisma.workspace.create({
      data: {
        name: data.name,
        slug: data.slug,
        members: {
          create: {
            userId,
            role: WorkspaceRole.SUPER_ADMIN,
          },
        },
      },
      include: {
        members: true,
      },
    });

    res.json({ success: true, data: workspace });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'CREATE_FAILED', message: error.message },
    });
  }
};

export const getWorkspaces = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    res.json({ success: true, data: workspaces });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: error.message },
    });
  }
};

export const getWorkspaceById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: req.params.id,
        members: {
          some: { userId },
        },
      },
      include: { members: true },
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      });
    }

    res.json({ success: true, data: workspace });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: error.message },
    });
  }
};

export const updateWorkspace = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: req.params.id,
        members: {
          some: {
            userId,
            role: { in: [WorkspaceRole.SUPER_ADMIN, WorkspaceRole.ADMIN] },
          },
        },
      },
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      });
    }

    const updated = await prisma.workspace.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name || workspace.name,
        slug: req.body.slug || workspace.slug,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: error.message },
    });
  }
};

export const addMember = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { targetUserId, role } = req.body;

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: req.params.id,
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      });
    }

    const userRole = workspace.members[0]?.role as WorkspaceRole;
    requirePermission(userRole, 'workspace:manage_members');

    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId: req.params.id,
        userId: targetUserId,
        role: role || WorkspaceRole.MEMBER,
      },
    });

    res.json({ success: true, data: member });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'ADD_MEMBER_FAILED', message: error.message },
    });
  }
};

export const updateMemberRole = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: req.params.id,
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      });
    }

    const userRole = workspace.members[0]?.role as WorkspaceRole;
    requirePermission(userRole, 'workspace:manage_members');

    const member = await prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId: req.params.id,
          userId: req.params.userId,
        },
      },
      data: { role: req.body.role },
    });

    res.json({ success: true, data: member });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'UPDATE_ROLE_FAILED', message: error.message },
    });
  }
};

export const getMembers = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: req.params.id,
        members: {
          some: { userId },
        },
      },
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      });
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: req.params.id },
    });

    res.json({ success: true, data: members });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: error.message },
    });
  }
};

export const removeMember = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: req.params.id,
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      });
    }

    const userRole = workspace.members[0]?.role as WorkspaceRole;
    requirePermission(userRole, 'workspace:manage_members');

    await prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId: req.params.id,
          userId: req.params.userId,
        },
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'REMOVE_MEMBER_FAILED', message: error.message },
    });
  }
};
