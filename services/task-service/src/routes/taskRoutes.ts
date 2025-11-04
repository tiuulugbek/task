import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { WorkspaceRole, TaskPriority, TaskStatus, requirePermission, searchQuerySchema, paginationSchema } from '@acoustic/shared';
import { z } from 'zod';

const prisma = new PrismaClient();

const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  columnId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueAt: z.string().datetime().optional(),
});

async function checkProjectPermission(userId: string, projectId: string, permission: string) {
  const projectResponse = await fetch(
    `${process.env.PROJECT_SERVICE_URL || 'http://project-service:3004'}/internal/projects/${projectId}`,
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

  const member = await workspaceResponse.json();
  requirePermission(member.data.role, permission);
  return member.data;
}

async function publishEvent(eventType: string, payload: any) {
  try {
    await fetch(`${process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672'}/api/exchanges//amq.topic/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routing_key: `task.${eventType}`,
        payload,
      }),
    }).catch(() => {});
  } catch {}
}

export const createTask = async (req: Request, res: Response) => {
  try {
    const data = createTaskSchema.parse(req.body);
    const userId = (req as any).user.userId;

    await checkProjectPermission(userId, data.projectId, 'task:create');

    const task = await prisma.task.create({
      data: {
        projectId: data.projectId,
        columnId: data.columnId,
        title: data.title,
        description: data.description,
        priority: data.priority || TaskPriority.MEDIUM,
        status: TaskStatus.OPEN,
        createdById: userId,
        dueAt: data.dueAt ? new Date(data.dueAt) : null,
        history: {
          create: {
            status: TaskStatus.OPEN,
            userId,
          },
        },
      },
      include: {
        assignees: true,
        watchers: true,
        taskLabels: { include: { label: true } },
      },
    });

    await publishEvent('created', { taskId: task.id, projectId: data.projectId });

    res.json({ success: true, data: task });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'CREATE_FAILED', message: error.message },
    });
  }
};

export const getTasks = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { projectId } = req.query;
    const pagination = paginationSchema.parse(req.query);

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: { code: 'PROJECT_REQUIRED', message: 'projectId query parameter required' },
      });
    }

    await checkProjectPermission(userId, projectId as string, 'task:read');

    const tasks = await prisma.task.findMany({
      where: { projectId: projectId as string },
      include: {
        assignees: true,
        watchers: true,
        taskLabels: { include: { label: true } },
      },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.task.count({
      where: { projectId: projectId as string },
    });

    res.json({
      success: true,
      data: tasks,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: error.message },
    });
  }
};

export const getTaskById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        assignees: true,
        watchers: true,
        taskLabels: { include: { label: true } },
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    await checkProjectPermission(userId, task.projectId, 'task:read');

    res.json({ success: true, data: task });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: error.message },
    });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    await checkProjectPermission(userId, task.projectId, 'task:update');

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        title: req.body.title || task.title,
        description: req.body.description !== undefined ? req.body.description : task.description,
      },
      include: {
        assignees: true,
        watchers: true,
        taskLabels: { include: { label: true } },
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

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    await checkProjectPermission(userId, task.projectId, 'task:delete');

    await prisma.task.delete({
      where: { id: req.params.id },
    });

    await publishEvent('deleted', { taskId: task.id, projectId: task.projectId });

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'DELETE_FAILED', message: error.message },
    });
  }
};

export const moveTask = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { columnId, status } = req.body;

    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    await checkProjectPermission(userId, task.projectId, 'task:update');

    const oldStatus = task.status;
    const newStatus = status || task.status;

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        columnId: columnId || task.columnId,
        status: newStatus,
        history: oldStatus !== newStatus ? {
          create: {
            status: newStatus,
            userId,
          },
        } : undefined,
      },
      include: {
        assignees: true,
        watchers: true,
        taskLabels: { include: { label: true } },
      },
    });

    if (oldStatus !== newStatus) {
      await publishEvent('status_changed', {
        taskId: task.id,
        oldStatus,
        newStatus,
        userId,
      });
    }

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'MOVE_FAILED', message: error.message },
    });
  }
};

export const searchTasks = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { projectId, ...searchParams } = req.query;
    const search = searchQuerySchema.parse(searchParams);
    const pagination = paginationSchema.parse(req.query);

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: { code: 'PROJECT_REQUIRED', message: 'projectId query parameter required' },
      });
    }

    await checkProjectPermission(userId, projectId as string, 'task:read');

    const where: any = { projectId: projectId as string };

    if (search.q) {
      where.OR = [
        { title: { contains: search.q, mode: 'insensitive' } },
        { description: { contains: search.q, mode: 'insensitive' } },
      ];
    }

    if (search.status) where.status = search.status;
    if (search.priority) where.priority = search.priority;
    if (search.assigneeId) {
      where.assignees = { some: { userId: search.assigneeId } };
    }
    if (search.labelId) {
      where.taskLabels = { some: { labelId: search.labelId } };
    }

    if (search.due) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const week = new Date(today);
      week.setDate(week.getDate() + 7);

      if (search.due === 'overdue') {
        where.dueAt = { lt: today };
      } else if (search.due === 'today') {
        where.dueAt = { gte: today, lt: new Date(today.getTime() + 86400000) };
      } else if (search.due === 'week') {
        where.dueAt = { gte: today, lt: week };
      }
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignees: true,
        watchers: true,
        taskLabels: { include: { label: true } },
      },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.task.count({ where });

    res.json({
      success: true,
      data: tasks,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SEARCH_FAILED', message: error.message },
    });
  }
};

export const setAssignees = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { userIds } = req.body;

    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    await checkProjectPermission(userId, task.projectId, 'task:assign');

    await prisma.$transaction([
      prisma.taskAssignee.deleteMany({ where: { taskId: req.params.id } }),
      ...(userIds || []).map((uid: string) =>
        prisma.taskAssignee.create({
          data: { taskId: req.params.id, userId: uid },
        })
      ),
    ]);

    const updated = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { assignees: true },
    });

    await publishEvent('assignees_changed', {
      taskId: task.id,
      userIds: userIds || [],
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: error.message },
    });
  }
};

export const setWatchers = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { userIds } = req.body;

    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    await checkProjectPermission(userId, task.projectId, 'task:update');

    await prisma.$transaction([
      prisma.taskWatcher.deleteMany({ where: { taskId: req.params.id } }),
      ...(userIds || []).map((uid: string) =>
        prisma.taskWatcher.create({
          data: { taskId: req.params.id, userId: uid },
        })
      ),
    ]);

    const updated = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { watchers: true },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: error.message },
    });
  }
};

export const setLabels = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { labelIds } = req.body;

    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    await checkProjectPermission(userId, task.projectId, 'task:update');

    await prisma.$transaction([
      prisma.taskTaskLabel.deleteMany({ where: { taskId: req.params.id } }),
      ...(labelIds || []).map((lid: string) =>
        prisma.taskTaskLabel.create({
          data: { taskId: req.params.id, labelId: lid },
        })
      ),
    ]);

    const updated = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { taskLabels: { include: { label: true } } },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: error.message },
    });
  }
};

export const setPriority = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { priority } = req.body;

    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    await checkProjectPermission(userId, task.projectId, 'task:update');

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: { priority },
      include: {
        assignees: true,
        watchers: true,
        taskLabels: { include: { label: true } },
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

export const setStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { status } = req.body;

    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    await checkProjectPermission(userId, task.projectId, 'task:update');

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        status,
        history: {
          create: {
            status,
            userId,
          },
        },
      },
      include: {
        assignees: true,
        watchers: true,
        taskLabels: { include: { label: true } },
      },
    });

    await publishEvent('status_changed', {
      taskId: task.id,
      oldStatus: task.status,
      newStatus: status,
      userId,
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: error.message },
    });
  }
};

export const setDueDate = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { dueAt } = req.body;

    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    await checkProjectPermission(userId, task.projectId, 'task:update');

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: { dueAt: dueAt ? new Date(dueAt) : null },
      include: {
        assignees: true,
        watchers: true,
        taskLabels: { include: { label: true } },
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

export const getTasksByProject = async (req: Request, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { projectId: req.params.projectId },
      include: {
        assignees: true,
        watchers: true,
        taskLabels: { include: { label: true } },
      },
    });

    res.json({ success: true, data: tasks });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: error.message },
    });
  }
};
