import { Router } from 'express';
import { createUser, getUserById, getUserByTgId, updateUser } from './userRoutes';

export const userRoutes = Router();

userRoutes.post('/', createUser);
userRoutes.get('/:id', getUserById);
userRoutes.get('/by-tg-id/:tgId', getUserByTgId);
userRoutes.patch('/:id', updateUser);
