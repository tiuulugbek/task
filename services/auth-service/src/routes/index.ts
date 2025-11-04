import { Router } from 'express';
import { verifyTelegram, refreshToken, logout, getMe } from './authRoutes';

export const authRoutes = Router();

authRoutes.post('/telegram/verify', verifyTelegram);
authRoutes.post('/refresh', refreshToken);
authRoutes.post('/logout', logout);
authRoutes.get('/me', getMe);
