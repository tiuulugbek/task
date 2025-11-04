import { WorkspaceRole } from './types';

const PERMISSIONS: Record<WorkspaceRole, string[]> = {
  [WorkspaceRole.SUPER_ADMIN]: ['*'],
  [WorkspaceRole.ADMIN]: [
    'workspace:read',
    'workspace:update',
    'workspace:delete',
    'workspace:manage_members',
    'project:create',
    'project:read',
    'project:update',
    'project:delete',
    'task:create',
    'task:read',
    'task:update',
    'task:delete',
    'task:assign',
    'comment:create',
    'comment:read',
    'comment:update',
    'comment:delete',
    'attachment:create',
    'attachment:read',
    'attachment:delete',
  ],
  [WorkspaceRole.MANAGER]: [
    'workspace:read',
    'project:create',
    'project:read',
    'project:update',
    'task:create',
    'task:read',
    'task:update',
    'task:assign',
    'comment:create',
    'comment:read',
    'comment:update',
    'attachment:create',
    'attachment:read',
  ],
  [WorkspaceRole.MEMBER]: [
    'workspace:read',
    'project:read',
    'task:create',
    'task:read',
    'task:update',
    'comment:create',
    'comment:read',
    'attachment:create',
    'attachment:read',
  ],
  [WorkspaceRole.VIEWER]: [
    'workspace:read',
    'project:read',
    'task:read',
    'comment:read',
    'attachment:read',
  ],
};

export const hasPermission = (role: WorkspaceRole, permission: string): boolean => {
  const permissions = PERMISSIONS[role] || [];
  return permissions.includes('*') || permissions.includes(permission);
};

export const requirePermission = (role: WorkspaceRole, permission: string): void => {
  if (!hasPermission(role, permission)) {
    throw new Error(`Permission denied: ${permission} required`);
  }
};
