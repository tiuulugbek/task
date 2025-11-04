import { Router } from 'express';
import { createWorkspace, getWorkspaces, getWorkspaceById, updateWorkspace, addMember, updateMemberRole, getMembers, removeMember } from './workspaceRoutes';

export const workspaceRoutes = Router();

workspaceRoutes.post('/', createWorkspace);
workspaceRoutes.get('/', getWorkspaces);
workspaceRoutes.get('/:id', getWorkspaceById);
workspaceRoutes.patch('/:id', updateWorkspace);
workspaceRoutes.post('/:id/members', addMember);
workspaceRoutes.patch('/:id/members/:userId', updateMemberRole);
workspaceRoutes.get('/:id/members', getMembers);
workspaceRoutes.delete('/:id/members/:userId', removeMember);
