export enum WorkspaceRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TaskStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE',
}

export enum Locale {
  UZ = 'uz',
  RU = 'ru',
  EN = 'en',
}

export interface JWTPayload {
  userId: string;
  tgId: number;
  workspaceId?: string;
  role?: WorkspaceRole;
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorTgId: number;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  workspaceId?: string;
  diff?: Record<string, unknown>;
  createdAt: Date;
}
