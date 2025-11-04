import { Router } from 'express';
import { createProject, getProjects, getProjectById, updateProject, deleteProject, getBoard } from './projectRoutes';
import { createColumn, updateColumn, deleteColumn, reorderColumns } from './columnRoutes';

export const projectRoutes = Router();

projectRoutes.post('/', createProject);
projectRoutes.get('/', getProjects);
projectRoutes.get('/:id', getProjectById);
projectRoutes.patch('/:id', updateProject);
projectRoutes.delete('/:id', deleteProject);
projectRoutes.get('/:id/board', getBoard);

projectRoutes.post('/:id/columns', createColumn);
projectRoutes.patch('/:id/columns/:columnId', updateColumn);
projectRoutes.delete('/:id/columns/:columnId', deleteColumn);
projectRoutes.post('/:id/columns/reorder', reorderColumns);
