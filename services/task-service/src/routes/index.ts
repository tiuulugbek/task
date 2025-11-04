import { Router } from 'express';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  moveTask,
  searchTasks,
  setAssignees,
  setWatchers,
  setLabels,
  setPriority,
  setStatus,
  setDueDate,
  getTasksByProject,
} from './taskRoutes';

export const taskRoutes = Router();

// Public routes (require auth)
taskRoutes.post('/', createTask);
taskRoutes.get('/', getTasks);
taskRoutes.get('/search', searchTasks);
taskRoutes.get('/:id', getTaskById);
taskRoutes.patch('/:id', updateTask);
taskRoutes.delete('/:id', deleteTask);
taskRoutes.post('/:id/move', moveTask);
taskRoutes.post('/:id/assignees', setAssignees);
taskRoutes.post('/:id/watchers', setWatchers);
taskRoutes.post('/:id/labels', setLabels);
taskRoutes.patch('/:id/priority', setPriority);
taskRoutes.patch('/:id/status', setStatus);
taskRoutes.patch('/:id/due-date', setDueDate);

// Internal routes (for other services)
taskRoutes.get('/by-project/:projectId', getTasksByProject);
import {
  createLabel,
  getLabels,
  updateLabel,
  deleteLabel,
} from './labelRoutes';

taskRoutes.post('/labels', createLabel);
taskRoutes.get('/labels', getLabels);
taskRoutes.patch('/labels/:id', updateLabel);
taskRoutes.delete('/labels/:id', deleteLabel);
