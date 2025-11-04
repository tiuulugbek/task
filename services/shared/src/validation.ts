import { z } from 'zod';
import { WorkspaceRole, TaskPriority, TaskStatus, Locale } from './types';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const uuidSchema = z.string().uuid();

export const workspaceRoleSchema = z.nativeEnum(WorkspaceRole);

export const taskPrioritySchema = z.nativeEnum(TaskPriority);

export const taskStatusSchema = z.nativeEnum(TaskStatus);

export const localeSchema = z.nativeEnum(Locale);

export const searchQuerySchema = z.object({
  q: z.string().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assigneeId: uuidSchema.optional(),
  labelId: uuidSchema.optional(),
  due: z.enum(['overdue', 'today', 'week']).optional(),
});
