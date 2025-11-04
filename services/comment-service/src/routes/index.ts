import { Router, type Router as RouterType } from 'express';
import { createComment, getComments, deleteComment } from './commentRoutes';

export const commentRoutes: RouterType = Router();

commentRoutes.post('/', createComment);
commentRoutes.get('/', getComments);
commentRoutes.delete('/:id', deleteComment);
